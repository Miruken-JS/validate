import { 
    Base, pcopy, createKeyChain
} from "@miruken/core";

const _ = createKeyChain();

/**
 * Captures structured validation errors.
 * @class ValidationResult
 * @constructor
 * @extends Base
 */    
export class ValidationResult extends Base {
    /**
     * true if object is valid, false otherwisw.
     * @property {boolean} valid
     * @readOnly
     */                
    get valid() {
        const { errors, summary } = _(this);
        if (errors || summary) {
            return false;
        }
        const ownKeys = Object.getOwnPropertyNames(this);
        for (let i = 0; i < ownKeys.length; ++i) {
            const key = ownKeys[i];
            if (_isReservedKey(key)) {
                continue;
            }
            const result = this[key];
            if ((result instanceof ValidationResult) && !result.valid) {
                return false;
            }
        }
        return true;
    }

    /**
     * Gets aggregated validation errors.
     * @property {Object} errors
     * @readOnly
     */                             
    get errors() {
        if (_(this).summary) {
            return _(this).summary;
        }
        const errors = _(this).errors;
        if (errors) {
            _(this).summary = {};
            for (let name in errors) {
                _(this).summary[name] = errors[name].slice();
            }
        }
        const ownKeys = Object.getOwnPropertyNames(this);
        for (let i = 0; i < ownKeys.length; ++i) {
            const key = ownKeys[i];
            if (_isReservedKey(key)) {
                continue;
            }
            const result = this[key],
                  keyErrors = (result instanceof ValidationResult) && result.errors;
            if (keyErrors) {
                _(this).summary = _(this).summary || {};
                for (name in keyErrors) {
                    const named    = keyErrors[name];
                    let   existing = _(this).summary[name];
                    for (let ii = 0; ii < named.length; ++ii) {
                        const error = pcopy(named[ii]);
                        error.key = error.key ? (key + "." + error.key) : key;
                        if (existing) {
                            existing.push(error);
                        } else {
                            _(this).summary[name] = existing = [error];
                        }
                    }
                }
            }
        }
        return _(this).summary;
    }

    /**
     * Gets or adds validation results for the key.
     * @method addKey
     * @param  {string} key  -  property name
     * @results {ValidationResult} named validation results.
     */                
    addKey(key) {
        return this[key] || (this[key] = new ValidationResult);
    }

    /**
     * Adds a named validation error.
     * @method addError
     * @param  {string}  name   -  validator name
     * @param  {Object}  error  -  literal error details
     * @example
     *     Standard Keys:
     *        key      => contains the invalid key
     *        message  => contains the error message
     *        value    => contains the invalid valid
     */
    addError(name, error) {
        const errors = (_(this).errors || (_(this).errors = {})),
              named  = errors[name];
        if (named) {
            named.push(error);
        } else {
            errors[name] = [error];
        }
        _(this).summary = null;
        return this;
    }

    /**
     * Clears all validation results.
     * @method reset
     * @returns {ValidationResult} receiving results
     * @chainable
     */
    reset() { 
        delete _(this).errors;
        delete _(this).summary;
        const ownKeys = Object.getOwnPropertyNames(this);
        for (let i = 0; i < ownKeys.length; ++i) {
            const key = ownKeys[i];
            if (_isReservedKey(key)) {
                continue;
            }
            const result = this[key];
            if ((result instanceof ValidationResult)) {
                delete this[key];
            }
        }
        return this;
    }    
}

const IGNORE = ["valid", "errors", "addKey", "addError", "reset"];

function _isReservedKey(key) {
    return IGNORE.indexOf(key) >= 0;
}

