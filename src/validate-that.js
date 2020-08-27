import {
    True, Metadata, design,
    $isNothing, $isFunction
} from "miruken-core";

const validateThatMetadataKey = Symbol("validate-that-metadata");

/**
 * Marks method as providing contextual validation.
 * @method validateThat
 */
export const validateThat = Metadata.decorator(validateThatMetadataKey,
    (target, key, descriptor) => {
        if ($isNothing(descriptor)) {
            throw new SyntaxError("@validateThat cannot be applied to classes.");
        }
        if (key === "constructor") {
            throw new SyntaxError("@validateThat cannot be applied to constructors.");
        }
        const { value } = descriptor;
        if (!$isFunction(value)) {
            throw new SyntaxError("@validateThat can only be applied to methods.");
        }
        Metadata.getOrCreateOwn(validateThatMetadataKey, target, key, True);
        const args = design.get(target, key)?.args;
        if (args && args.length > 0) {
            descriptor.value = function (validation, composer) {
                const deps = composer.resolveArgs(args);
                if ($isNothing(deps)) {
                    throw new Error("One or more dependencies could not be resolved.");
                }
                if (args.length > 0) {
                    let index = 0;
                    for (let i = 0; i < args.length && index < 2; ++i) {
                        if ($isNothing(args[i])) {
                            deps[i] = arguments[index++];
                        }
                    }
                }
                return value.apply(this, deps);
            }
        }
    });

