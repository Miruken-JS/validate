import { 
    Base, $isNothing, $classOf, $isPromise
} from "miruken-core";

import { CallbackControl } from "miruken-callback";
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
export const Validation = Base.extend(CallbackControl, {
    constructor(object, async, scope, results) {
        this._object   = object;
        this._async    = !!async;    
        this._scope    = scope;
        this._results  = results || new ValidationResult();
        this._promises = [];  
    },

    get isAsync() { return this._async; },                              
    get object()  { return this._object; },                                             
    get scope()   { return this._scope; },       
    get results() { return this._results; },
    get callbackPolicy() { return $validate; },  
    get callbackResult() {
        if (this._result === undefined) {
            this._result = this._promises.length > 0
                ? Promise.all(this._promises).then(res => this.results)
                : (this.isAsync ? Promise.resolve(this.results) : this.results);
        }
        return this._result;
    },
    set callbackResult(value) { this._result = value; },
    
    addAsyncResult(result) {
        if ($isPromise(result)) {
            if (!this.isAsync) return false;
            this._promises.push(result);
        }
        this._result = undefined;
    },           
    dispatch(handler, greedy, composer) {
        const target = this.object,
              source = $classOf(target);
        if ($isNothing(source)) return false;
        $validate.dispatch(handler, this, source, composer,
            true, this.addAsyncResult.bind(this));
        return true;              
    },   
    toString() {
        const scope = this.scope != null 
                    ? ` scope '${String(this.scope)}'` : "";
        return `Validation | ${this.object}${scope}`;
    }           
});
