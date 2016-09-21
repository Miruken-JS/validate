import constraint from "./constraint";

export function matches(pattern, flags) {
    const criteria = { format: pattern };
    if (flags) {
        criteria.flags = flags;
    }
    return constraint(criteria);
}

export default matches;
