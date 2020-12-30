import {
    design, $isNothing, Handler, provides, singleton,
    mapsFrom, formats, property, surrogate, typeId
} from "miruken-core";

import { ValidationError } from "./validation-error";
import { ValidationResult } from "./validation-result";

export class ValidationErrorData {
    constructor(propertyName, errors, nested) {
        this.propertyName = propertyName;
        this.errors       = errors;
        this.nested       = nested;
    }

    propertyName;
    errors;
    @design([ValidationErrorData])
    nested;
}

@surrogate(ValidationError)
@typeId("Miruken.Validate.ValidationErrors[], Miruken.Validate")
export class ValidationErrorDataArray {
    constructor(errors) {
        this.errors = errors;
    }

    @property("$values")
    @design([ValidationErrorData])
    errors;
}

@provides() @singleton()
export class ValidationMapping extends Handler {
    @formats(ValidationError)
    @mapsFrom(ValidationErrorDataArray)
    mapToValidationErrorData({ object: { errors } }) {
        return new ValidationError(createResults(errors));
    }

    @formats(ValidationErrorDataArray)
    @mapsFrom(ValidationError)
    mapToValidationError({ object: { results } }) {
        return new ValidationErrorDataArray(createErrors(results));
    }
}

function createErrors(results) {
    return Object.getOwnPropertyNames(results).map(key => {
        const errorData  = new ValidationErrorData(key),
              keyResults = results[key];
        const { errors } = keyResults;
        if (!$isNothing(errors)) {
            const messages = Object.values(errors)
                .flatMap(details => details)
                .filter(detail => $isNothing(detail.key))
                .map(detail => detail.message);
            if (messages.length > 0) {
                errorData.errors = messages;
            }
        }
        const nested = createErrors(keyResults);
        if (nested.length > 0) {
            errorData.nested = nested;
        }
        return errorData;
    });
}

function createResults(errors, owner) {
    const results = owner || new ValidationResult();
    errors?.forEach(error => {
        const { propertyName, errors, nested } = error,
                keyResults = results.addKey(propertyName);
        errors?.forEach(message => keyResults.addError("server", { message }));
        if (nested?.length > 0) {
            createResults(nested, keyResults);
        }
    });
    return results;
}