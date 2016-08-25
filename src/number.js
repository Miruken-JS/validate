import constraint from './constraint';

constraint.number = function(target, key, descriptor)
{
    return constraint({numericality: {noStrings: true}})(target, key, descriptor);
}

constraint.strictNumber = function(target, key, descriptor)
{
    return constraint({numericality: {strict: true}})(target, key, descriptor);
}

constraint.onlyInteger = function (target, key, descriptor)
{
    return constraint({numericality: {onlyInteger: true}})(target, key, descriptor);
}

constraint.equalTo = function (val)
{
    return constraint({numericality: {equalTo: val}});
}

constraint.greaterThan = function (val)
{
    return constraint({numericality: {greaterThan: val}});
}

constraint.greaterThanOrEqualTo = function (val)
{
    return constraint({numericality: {greaterThanOrEqualTo: val}});
}

constraint.lessThan = function (val)
{
    return constraint({numericality: {lessThan: val}});
}

constraint.lessThanOrEqualTo = function (val)
{
    return constraint({numericality: {lessThanOrEqualTo: val}});
}

constraint.divisibleBy = function (val)
{
    return constraint({numericality: {divisibleBy: val}});
}

constraint.odd = function (target, key, descriptor)
{
    return constraint({numericality: {odd: true}})(target, key, descriptor);
}

constraint.even = function (target, key, descriptor)
{
    return constraint({numericality: {even: true}})(target, key, descriptor);
}




