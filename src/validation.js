import {
    $isNothing,
    $classOf,
    $isPromise,
    CallbackBase,
    createKeyChain,
} from "@miruken/core";

import { ValidationResult } from "./validation-result";
import { validates } from "./validates";

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
export class Validation extends CallbackBase {
    constructor(source, async, scope, results) {
        super(source);
        const _this = _(this);
        _this.async    = !!async;
        _this.scope    = scope;
        _this.results  = results || new ValidationResult();
        this.addResult(_this.results);
    }

    get policy() { return validates.policy; }
    get isAsync() { return _(this).async; }
    get scope() { return _(this).scope; }
    get results() { return _(this).results; }

    dispatch(handler, greedy, composer) {
        const target = this.source,
              source = $classOf(target);
        if ($isNothing(source)) return false;
        validates.dispatch(handler, this, source, composer, true);
        return true;
    }

    toString() {
        const scope = this.scope != null ?
            ` scope '${String(this.scope)}'` : "";
        return `Validation | ${this.source}${scope}`;
    }
}