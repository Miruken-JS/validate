import { 
    Base, $isNothing, $classOf, $isPromise
} from "miruken-core";

import { DispatchingCallback } from "miruken-callback";
import { ValidationResult } from "./result";
import { $validate } from "./validates";

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
export const Validation = Base.extend(DispatchingCallback, {
    constructor(object, async, scope, results) {
        let _promises = [], _result;
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
             * Gets/sets the effective callback result.
             * @property {Any} callback result
             */
            get callbackResult() {
                if (_result === undefined) {
                    _result = _promises.length > 0
                         ? Promise.all(_promises).then(res => results)
                         : (async ? Promise.resolve(results) : results);
                }
                return _result;
            },
            set callbackResult(value) { _result = value; },                      
            dispatch(handler, greedy, composer) {
                const target = this.object,
                      source = $classOf(target);
                if ($isNothing(source)) return false;
                $validate.dispatch(handler, this, source, composer, true, addAsyncResult);
                return true;              
            }
        });
        function addAsyncResult(result) {
            if ($isPromise(result)) {
                if (!async) return false;
                _promises.push(result);
            }
            _result = undefined;
        }     
    },     
    get policy() { return $validate; },
    toString() {
        const scope = this.scope != null 
                    ? ` scope '${String(this.scope)}'` : "";
        return `Validation | ${this.object}${scope}`;
    }           
});
