import { createFilterDecorator } from "@miruken/core";
import { ValidateProvider } from "./validate-filter";

export const validate = createFilterDecorator(
    (target, key, descriptor, [options]) => new ValidateProvider(options));
