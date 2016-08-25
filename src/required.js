import constraint from './constraint';

constraint.required = function (target, key, descriptor)
{
    return constraint({presence: true})(target, key, descriptor);
}
