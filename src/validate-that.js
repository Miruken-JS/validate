import {
    True, Invoking, Metadata, inject,
    isDescriptor, $isFunction, $use
} from "miruken-core";

const validateThatMetadataKey = Symbol("validate-that-metadata");

/**
 * Marks method as providing contextual validation.
 * @method validateThat
 */
export const validateThat = Metadata.decorator(validateThatMetadataKey,
    (target, key, descriptor) => {
        if (!isDescriptor(descriptor)) {
            throw new SyntaxError("@validateThat cannot be applied to classes.");
        }
        if (key === "constructor") {
            throw new SyntaxError("@validateThat cannot be applied to constructors.");
        }
        const { value } = descriptor;
        if (!$isFunction(value)) {
            throw new SyntaxError("@validateThat cannot be applied to methods.");
        }
        Metadata.getOrCreateOwn(validateThatMetadataKey, target, key, True);
        const dependencies = inject.get(target, key);
        if (dependencies && dependencies.length > 0) {
            descriptor.value = function (validation, composer) {
                const args = Array.prototype.slice.call(arguments),
                      deps = dependencies.concat(args.map($use));
                return Invoking(composer).invoke(value, deps, this);
            }
        }
    });

