import { constraint } from "./constraint";

export const required = constraint({presence: true});
export const notEmpty = constraint({presence: {allowEmpty: false}});

