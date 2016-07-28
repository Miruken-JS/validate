import {
    $define, $handle, CallbackHandler
} from 'miruken-callback';

import { ValidationResult } from './result';

import {
    True, Base, MetaStep, MetaMacro, Invoking,
    $isFunction, $isPromise, $classOf, $use
} from 'miruken-core';

/**
 * Validation definition group.
 * @property {Function} $validate
 * @for miruken.validate.$
 */
export const $validate = $define('$validate');

/**
 * Callback representing the validation of an object.
 * @class Validation
 * @constructor
 * @param   {Object}    object  -  object to validate
 * @param   {boolean}   async   -  true if validate asynchronously
 * @param   {Any}       scope   -  scope of validation
 * @param   {miruken.validate.ValidationResult} results  -  results to validate to
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
             * @property {miruken.validate.ValidationResult} results
             * @readOnly
             */                                                                
            get results() { return results; },
            /**
             * Gets the async validation results.
             * @property {miruken.validate.ValidationResult} results
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

$handle(CallbackHandler, Validation, function (validation, composer) {
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

/**
 * Metamacro for class-based validation.
 * @class $validateThat
 * @extends miruken.MetaMacro
 */    
export const $validateThat = MetaMacro.extend({
    get active() { return true; },
    get inherit() { return true; },    
    execute(step, metadata, target, definition) {
        const validateThat = this.extractProperty('$validateThat', target, definition);
        if (!validateThat) {
            return;
        }
        const validators = {};
        for (let name in validateThat) {
            let validator = validateThat[name];
            if (Array.isArray(validator)) {
                const dependencies = validator.slice(0);
                validator = dependencies.pop();
                if (!$isFunction(validator)) {
                    continue;
                }
                if (dependencies.length > 0) {
                    let fn = validator;
                    validator = function (validation, composer) {
                        const d = dependencies.concat($use(validation), $use(composer));
                        return Invoking(composer).invoke(fn, d, this);
                    };
                }
            }
            if ($isFunction(validator)) {
                name = 'validateThat' + name.charAt(0).toUpperCase() + name.slice(1);
                validators[name] = validator;
            }
            if (step == MetaStep.Extend) {
                target.extend(validators);
            } else {
                metadata.type.implement(validators);
            }
        }
    }
});
