import constraint from './constraint';
import { $flatten } from 'miruken-core';

export function includes(...members) {
    members = $flatten(members, true);
    return constraint({inclusion: members});
}

export function excludes(...members) {
    members = $flatten(members, true);    
    return constraint({exclusion: members});
}
