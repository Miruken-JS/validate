import { createKey } from "@miruken/core";

const _ = createKey();

/**
 * Identifies a validation failure.
 * @class ValidationError
 * @constructor
 * @param {ValidationResult}  results  -  validation results
 * @param {string}            message  -  message
 * @extends Error
 */
export class ValidationError extends Error {
    constructor(results, message) {
        super(message || "Validation error");

        _(this).results = results;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    get results() { return _(this).results; }
}

