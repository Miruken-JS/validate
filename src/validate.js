import { createKey } from "miruken-core";

import { 
    FilterSpec, FilterSpecProvider, createFilterDecorator
} from "miruken-callback";

import { ValidateFilter } from "./validate-filter";

const _ = createKey();

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

export const validate = createFilterDecorator(
    (target, key, descriptor, [options]) => {
        return new ValidateProvider(options);
    });
