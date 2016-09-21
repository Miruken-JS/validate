import constraint from "./constraint";

export const url = constraint({url: true});

Object.assign(url, {
    schemes(schemes) { return constraint({url: {schemes}}); },
    allowLocal(allowLocal) { return constraint({url: {allowLocal}}); }    
});

export default url;
