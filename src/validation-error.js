/**
 * Identifies a validation failure.
 * @class ValidationError
 * @constructor
 * @param {ValidationResult}  results  -  validation results
 * @param {string}            message  -  message
 * @extends Error
 */
export function ValidationError(results, message) {
    /**
     * Gets the validation results.
     * @property {ValidationResult} results
     */         
    this.results = results;

    this.message = message || "Validation error";

    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    } else {
        Error.call(this);
    }
}
ValidationError.prototype             = new Error();
ValidationError.prototype.constructor = ValidationError;
