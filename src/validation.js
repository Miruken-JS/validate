import { 
    Base, $isNothing, $classOf,
    $isPromise, createKeyChain
} from "miruken-core";

import { CallbackControl } from "miruken-callback";
import { ValidationResult } from "./result";
import { $validate } from "./validates";

const _ = createKeyChain();

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
        const _this = _(this);
        _this.object   = object;
        _this.async    = !!async;    
        _this.scope    = scope;
        _this.results  = results || new ValidationResult();
        _this.promises = [];  
    },

    get isAsync()        { return _(this).async; },                       
    get object()         { return _(this).object; },
    get scope()          { return _(this).scope; },
    get results()        { return _(this).results; },
    get callbackPolicy() { return $validate; },  
    get callbackResult() {
        if (_(this).result === undefined) {
            const { results, promises } = _(this);
            _(this).result = promises.length > 0
                ? Promise.all(promises).then(res => results)
                : (this.isAsync ? Promise.resolve(results) : results);
        }
        return _(this).result;
    },
    set callbackResult(value) { _(this).result = value; },
    
    addAsyncResult(result) {
        if ($isPromise(result)) {
            if (!this.isAsync) return false;
            _(this).promises.push(result);
        }
        _(this).result = undefined;
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
