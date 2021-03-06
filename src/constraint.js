import { 
    Metadata, $isNothing, $isPlainObject 
} from "@miruken/core";

const constraintMetadataKey = Symbol("constraint-metadata");

/**
 * Specifies validation constraints on properties and methods.
 * @method constraints
 */
export const constraint = Metadata.decorator(constraintMetadataKey,
    (target, key, descriptor, constraints) => {
        if ($isNothing(descriptor) || key === "constructor") {
            throw new SyntaxError("Constraints cannot be applied to classes or constructors.");
        }
        if (constraints.length === 0) return;
        const current = Metadata.getOrCreateOwn(
            constraintMetadataKey, target, key, () => ({}));
        constraints.forEach(constraint => _mergeConstraints(current, constraint));
    });

export const valid = constraint({nested: true});

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
