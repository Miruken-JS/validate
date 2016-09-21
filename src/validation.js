import {
    CallbackHandler, $define, $handle
} from "miruken-callback";

import {
    Base, Variance, $isPromise, $classOf
} from "miruken-core";

import ValidationResult from "./result";

/**
 * Validation definition group.
 * @property {Function} $validate
 */
export const $validate = $define(Variance.Contravariant);

/**
 * Callback representing the validation of an object.
 * @class Validation
 * @constructor
 * @param   {Object}    object  -  object to validate
 * @param   {boolean}   async   -  true if validate asynchronously
 * @param   {Any}       scope   -  scope of validation
 * @param   {ValidationResult} results  -  results to validate to
 * @extends Base
 */
export const Validation = Base.extend({
    constructor(object, async, scope, results) {
        let _asyncResults;
        async   = !!async;
        results = results || new ValidationResult();
        this.extend({
            /**
             * true if asynchronous, false if synchronous.
             * @property {boolean} async
             * @readOnly
             */                
            get isAsync() { return async; },
            /**
             * Gets the target object to validate.
             * @property {Object} object
             * @readOnly
             */                                
            get object() { return object; },
            /**
             * Gets the scope of validation.
             * @property {Any} scope
             * @readOnly
             */                                                
            get scope() { return scope; },
            /**
             * Gets the validation results.
             * @property {ValidationResult} results
             * @readOnly
             */                                                                
            get results() { return results; },
            /**
             * Gets the async validation results.
             * @property {ValidationResult} results
             * @readOnly
             */                                                                                
            get asyncResults() { return _asyncResults; },
            /**
             * Adds an async validation result. (internal)
             * @method addAsyncResult
             */                        
            addAsyncResult(result) {
                if ($isPromise(result)) {
                    (_asyncResults || (_asyncResults = [])).push(result);
                }
            }
        });
    }
});

$handle(CallbackHandler.prototype, Validation, function (validation, composer) {
    const target = validation.object,
          source = $classOf(target);
    if (source) {
        $validate.dispatch(this, validation, source, composer, true, validation.addAsyncResult);
        var asyncResults = validation.asyncResults;
        if (asyncResults) {
            return Promise.all(asyncResults);
        }
    }
});

export default Validation;
