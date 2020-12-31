import { HandlerBuilder } from "@miruken/core";
import { ValidationResult } from "../src/validation-result";
import { ValidationError } from "../src/validation-error";

import { 
    ValidationErrorData, ValidationErrorDataArray
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

    it("should map ValidationError to ValidationErrorDataArray", async () => {
        const results = new ValidationResult(),
              address = results.addKey("address");
        address.addKey("line")
               .addError("required", { message: "Line can't be blank" });
        address.addKey("city")
               .addError("required", { message: "City can't be blank" });
        const foo = results.errors;     
        const errors = handler.$mapFrom(
            new ValidationError(results), ValidationErrorDataArray);
        expect(errors).to.be.instanceOf(ValidationErrorDataArray);
        expect(errors.errors.length).to.equal(1);
        const [result] = errors.errors;
        expect(result.propertyName).to.equal("address");
        expect(result.errors).to.be.undefined;
        expect(result.nested.length).to.equal(2);
        const [line, city] = result.nested;
        expect(line.propertyName).to.equal("line");
        expect(line.errors).to.eql(["Line can't be blank"]);
        expect(line.nested).to.be.undefined;
        expect(city.propertyName).to.equal("city");
        expect(city.errors).to.eql(["City can't be blank"]);
        expect(city.nested).to.be.undefined;
    });

    it("should map ValidationErrorDataArray to ValidationError", async () => {
        const data  = new ValidationErrorDataArray([
            new ValidationErrorData("address", null, [
                new ValidationErrorData("line", [
                    "Line can't be blank"
                ]),
                new ValidationErrorData("city", [
                    "City can't be blank"
                ])
            ])
        ]);
        const error = handler.$mapFrom(data, ValidationError);
        expect(error).to.be.instanceOf(ValidationError);
        const { results } = error;
        expect(results).to.be.instanceOf(ValidationResult);
        expect(results.errors.server).to.deep.include.members([{
                key:     "address.line",
                message: "Line can't be blank"
            }, {
                key:     "address.city",
                message: "City can't be blank"
            }
        ]);
    });
});

