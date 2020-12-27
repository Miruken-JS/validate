import { 
    design, $isNothing
} from "miruken-core";

import {
    Handler, provides, singleton,
    mapsTo, mapsFrom, format, property,
    typeId
} from "miruken-callback";

import { ValidationError } from "./validation-error";
import { ValidationResult } from "./validation-result";

export class ValidationErrorData {
    propertyName;
    errors;
    @design([ValidationErrorData])
    nested;
}

@typeId("Miruken.Validate.ValidationErrors[], Miruken.Validate")
export class ValidationErrors {
    @property("$values")
    @design([ValidationErrorData])
    errors;
}

@format(Error)
@provides() @singleton()
export class ValidationMapping extends Handler {
    @mapsFrom(ValidationErrors)
    mapToValidationErrorData({ object }) {
        const results = createResults(object);
        return new ValidationError(results);
    }

    @mapsFrom(ValidationError)
    mapToValidationError({ object }) {
        const wrapper = new ValidationErrors();
        wrapper.errors = createErrors(object.results);
        return wrapper;
    }
}

function createErrors(results) {
    return Object.getOwnPropertyNames(results).map(key => {
        const errorData  = new ValidationErrorData(),
              keyResults = results[key];
        errorData.propertyName = key;
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

function createResults({ errors }, owner) {
    const results = owner || new ValidationResult();
    errors?.forEach(error => {
        const { propertyName, errors, nested } = error,
                keyResults = results.addKey(propertyName);
        errors?.forEach(err => keyResults
            .addError("server", { message: err.message }));
        if (nested?.length > 0) {
            createResults(nested, results);
        }
    });
    return results;
}