import { metadata, $meta } from 'miruken-core';

const constraintKey = Symbol(),
      criteria      = { [constraintKey]: undefined };

/**
 * Specifies validation constraints on properties and methods.
 * @method constraints
 */
export function constraint(constraints) {
    return function (target, key, descriptor) {
        if (key === 'constructor') return;
        const { get, value, initializer } = descriptor;
        if (!get && !value && !initializer) return;
        const meta = $meta(target);
        if (meta) {
            meta.defineMetadata(key, { [constraintKey]: constraints });
        }
    };
}

constraint.get = metadata.get.bind(undefined, constraintKey, criteria);

constraint.required = function (target, key, descriptor)
{
    return constraint({presence: true})(target, key, descriptor);
}

export function applyConstraints (target, key, descriptor)
{
    return constraint({nested: true})(target, key, descriptor);
}

export { constraint as default, constraint as is, constraint as has };
