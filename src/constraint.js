import { Metadata, $isPlainObject } from "miruken-core";

const constraintMetadataKey = Symbol();

/**
 * Specifies validation constraints on properties and methods.
 * @method constraints
 */
export const constraint = Metadata.decorator(constraintMetadataKey,
    (target, key, descriptor, constraints) => {
        if (constraints.length === 0 || key === "constructor") return;
        const { get, value, initializer } = descriptor;
        if (!get && !value && !initializer) return;
        const current = Metadata.getOrCreateOwn(
            constraintMetadataKey, target, key, () => ({}));
        constraints.forEach(constraint => _mergeConstraints(current, constraint));
    });

export const applyConstraints = constraint({nested: true});

function _mergeConstraints(target, source) {
    Reflect.ownKeys(source).forEach(key => {
        const newValue = source[key],
              curValue = target[key];
        if ($isPlainObject(curValue) && !Array.isArray(curValue)) {
            _mergeConstraints(curValue, newValue);
        } else {
            target[key] = Array.isArray(newValue)
                        ? newValue.slice()
                        : newValue;
        }
    });
}

export default constraint;
