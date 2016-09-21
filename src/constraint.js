import { Metadata, $isObject } from "miruken-core";

const constraintsMetadataKey = Symbol();

/**
 * Specifies validation constraints on properties and methods.
 * @method constraints
 */
export function constraint(constraints) {
    return function (target, key, descriptor) {
        if (!constraints || key === "constructor") return;
        const { get, value, initializer } = descriptor;
        if (!get && !value && !initializer) return;
        const current = Metadata.getOrCreateOwn(
            constraintsMetadataKey, target, key, () => ({}));
        _mergeConstraints(current, constraints);
    };
}

export const applyConstraints = constraint({nested: true});

constraint.getOwn = Metadata.getter(constraintsMetadataKey, true);
constraint.get    = Metadata.getter(constraintsMetadataKey); 

function _mergeConstraints(target, source) {
    Reflect.ownKeys(source).forEach(key => {
        const newValue = source[key],
              curValue = target[key];
        if ($isObject(curValue) && !Array.isArray(curValue)) {
            _mergeConstraints(curValue, newValue);
        } else {
            target[key] = Array.isArray(newValue)
                        ? newValue.slice()
                        : newValue;
        }
    });
}

export default constraint;
