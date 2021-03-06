import { 
    conformsTo, $isNothing, $isPromise,
    Filtering, Stage, provides, singleton,
    allowMultiple
} from "@miruken/core";

import { ValidateProvider } from "./validate";
import { ValidationError } from "./validation-error";

@allowMultiple(false)
@conformsTo(Filtering)
@provides() @singleton()
export class ValidateFilter {
    get order() { return Stage.Validation; }

    next(callback, { provider, composer, next, abort }) {
        if (!(provider instanceof ValidateProvider)) {
            return abort();
        }
        if (provider.validateAsync) {
            const result = validateAsync(callback, composer).then(() => next());
            return provider.validateResult
                 ? result.then(resp => validateAsync(resp, composer))
                 : result;
        }
        validateSync(callback, composer);
        const result = next();
        if (provider.validateResult) {
            if ($isPromise(result)) {
                return result.then(resp => validateSync(resp, composer))
            }
            validateSync(result, composer);
        }
        return result;
    }
}

function validateSync(target, handler) {
    const results = handler.validate(target);
    if (!results.valid) {
        throw new ValidationError(results);
    }
    return target;
}

function validateAsync(target, handler) {
    if ($isNothing(target)) {
        return Promise.resolve();
    }
    return handler.validateAsync(target).then(results => {
        if (!results.valid) {
            throw new ValidationError(results);
        }
        return target;
    });
}