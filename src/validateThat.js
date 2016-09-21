import {
    True, Invoking, Metadata, inject,
    $isFunction, $use
} from "miruken-core";

const validateThatMetadataKey = Symbol();

/**
 * Marks method as providing contextual validation.
 * @method validateThat
 */
export function validateThat(target, key, descriptor) {
    if (!key || key === "constructor") return;
    const fn = descriptor.value;
    if (!$isFunction(fn)) return;
    Metadata.getOrCreateOwn(validateThatMetadataKey, target, key, True);
    inject.get(target, key, dependencies => {
        if (dependencies.length > 0) {
            descriptor.value = function (validation, composer) {
                const args = Array.prototype.slice.call(arguments),
                      deps = dependencies.concat(args.map($use));
                return Invoking(composer).invoke(fn, deps, this);
            }
        }
    });
}

validateThat.getOwn = Metadata.getter(validateThatMetadataKey, true);
validateThat.get    = Metadata.getter(validateThatMetadataKey); 

export default validateThat;
