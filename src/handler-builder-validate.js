import { HandlerBuilder } from "miruken-callback";
import { ValidateFilter } from "./validate-filter";
import { ValidateJsHandler } from "./validatorJs";
import { ValidationMapping } from "./validation-mapping";
import "./handler-validate";

HandlerBuilder.implement({
    withValidation() {
        return this.addTypes(from => from.types(
            ValidateFilter, ValidateJsHandler, ValidationMapping))
    }
});
