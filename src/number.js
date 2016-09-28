import { constraint } from "./constraint";

export const number = constraint({numericality: {noStrings: true}});

Object.assign(number, {
    strict:                   constraint({numericality: {strict: true}}),
    onlyInteger:              constraint({numericality: {onlyInteger: true}}),
    equalTo(val)              { return constraint({numericality: {equalTo: val}}); },
    greaterThan(val)          { return constraint({numericality: {greaterThan: val}}); },
    greaterThanOrEqualTo(val) { return constraint({numericality: {greaterThanOrEqualTo: val}}); },
    lessThan(val)             { return constraint({numericality: {lessThan: val}}) },
    lessThanOrEqualTo(val)    { return constraint({numericality: {lessThanOrEqualTo: val}}); },
    divisibleBy(val)          { return constraint({numericality: {divisibleBy: val}}); },
    odd:                      constraint({numericality: {odd: true}}),
    even:                     constraint({numericality: {even: true}})
});





