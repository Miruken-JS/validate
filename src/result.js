import { Base, pcopy } from "miruken-core";

/**
 * Captures structured validation errors.
 * @class ValidationResult
 * @constructor
 * @extends Base
 */    
export const ValidationResult = Base.extend({
    /**
     * true if object is valid, false otherwisw.
     * @property {boolean} valid
     * @readOnly
     */                
    get valid() {
        if (this._errors || this._summary) {
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
    },
    /**
     * Gets aggregated validation errors.
     * @property {Object} errors
     * @readOnly
     */                             
    get errors() {
        if (this._summary) {
            return this._summary;
        }
        const errors = this._errors;
        if (errors) {
            this._summary = {};
            for (let name in errors) {
                this._summary[name] = errors[name].slice();
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
                this._summary = this._summary || {};
                for (name in keyErrors) {
                    const named    = keyErrors[name];
                    let   existing = this._summary[name];
                    for (let ii = 0; ii < named.length; ++ii) {
                        const error = pcopy(named[ii]);
                        error.key = error.key ? (key + "." + error.key) : key;
                        if (existing) {
                            existing.push(error);
                        } else {
                            this._summary[name] = existing = [error];
                        }
                    }
                }
            }
        }
        return this._summary;
    },
    /**
     * Gets or adds validation results for the key.
     * @method addKey
     * @param  {string} key  -  property name
     * @results {ValidationResult} named validation results.
     */                
    addKey(key) {
        return this[key] || (this[key] = new ValidationResult);
    },
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
        const errors = (this._errors || (this._errors = {})),
              named  = errors[name];
        if (named) {
            named.push(error);
        } else {
            errors[name] = [error];
        }
        this._summary = null;
        return this;
    },
    /**
     * Clears all validation results.
     * @method reset
     * @returns {ValidationResult} receiving results
     * @chainable
     */
    reset() { 
        this._errors = this._summary = undefined;
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
});

const IGNORE = ["valid", "errors", "addKey", "addError", "reset"];

function _isReservedKey(key) {
    return IGNORE.indexOf(key) >= 0;
}

