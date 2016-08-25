import constraint from './constraint';

constraint.exactLength = function (len)
{
    return constraint({length: {is: len}});
}

constraint.minimumLength = function (len)
{
    return constraint({length: {minimum: len}});
}

constraint.maximumLength = function (len)
{
    return constraint({length: {maximum: len}});
}
