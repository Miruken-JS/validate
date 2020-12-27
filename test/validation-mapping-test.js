import { HandlerBuilder } from "miruken-callback";
import { ValidationResult } from "../src/validation-result";
import { ValidationError } from "../src/validation-error";

import { 
    ValidationErrorData, ValidationErrors
} from "../src/validation-mapping";

import "../src/handler-builder-validate";

import { expect } from 'chai';

describe("ValidationMapping", () => {
    let handler;
    beforeEach(async () => {
        handler = new HandlerBuilder()
            .withValidation()
            .build();
    });

    it.only("should map ValidationError", async () => {
        const results = new ValidationResult(),
              address = results.addKey("address");
        address.addKey("line")
               .addError("required", { message: "Line can't be blank" });
        address.addKey("city")
               .addError("required", { message: "City can't be blank" });       
        const errors = handler.$mapFrom(new ValidationError(results), Error);
        expect(errors).to.be.instanceOf(ValidationErrors);
        expect(errors.errors.length).to.equal(1);
        const [result] = errors.errors;
        expect(result.propertyName).to.equal("address");
        expect(result.errors).to.be.undefined;
        expect(result.nested.length).to.equal(2);
    });
});

