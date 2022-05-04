import { 
    Filtering, FilterSpec, FilterSpecProvider,
    conformsTo, $isNothing, $isPromise,
    Stage, provides, singleton, allowMultiple,
    createKey
} from "@miruken/core";

import { ValidationError } from "./validation-error";

const _ = createKey();

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

export class ValidateProvider extends FilterSpecProvider {
    constructor({ validateResult, validateAsync } = {}) {
        super(new FilterSpec(ValidateFilter));
        const _this = _(this);
        _this.validateResult = validateResult === true;
        _this.validateAsync  = validateAsync === true;
    }

    get validateResult() { return _(this).validateResult; }
    get validateAsync()  { return _(this).validateAsync; }
}
