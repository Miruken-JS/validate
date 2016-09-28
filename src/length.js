import { constraint } from "./constraint";

export const length = {
    is(len)      { return constraint({length: {is: len}}) },
    atLeast(len) { return constraint({length: {minimum: len}}) },
    atMost(len)  { return constraint({length: {maximum: len}}) } 
};
