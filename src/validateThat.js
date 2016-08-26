import {
    Invoking, inject, metadata,
    $meta, $isFunction, $use
} from 'miruken-core';

const validateThatKey      = Symbol(),
      validateThatCriteria = { [validateThatKey]: true };

/**
 * Marks method as providing contextual validation.
 * @method validateThat
 */
export function validateThat(target, key, descriptor) {
    if (!key || key === 'constructor') return;
    const fn = descriptor.value;
    if (!$isFunction(fn)) return;
    const meta = $meta(target);
    if (meta) {
        meta.defineMetadata(key,  validateThatCriteria);
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
}

validateThat.get = metadata.get.bind(undefined, validateThatKey, validateThatCriteria);

export default validateThat;
