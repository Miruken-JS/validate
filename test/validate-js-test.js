import { Base, Invoking, Modifier } from 'miruken-core';
import { CallbackHandler } from 'miruken-callback';
import { Context } from 'miruken-context';

import {
    Validator, ValidationCallbackHandler
} from '../src/validate';

import {
    ValidationRegistry, ValidateJsCallbackHandler,
    $required
} from '../src/validate-js'; 

import validatejs from 'validate.js';

import chai from 'chai';

const expect = chai.expect;

const Address = Base.extend({
    $properties: {
        line:    { validate: $required },
        city:    { validate: $required },
        state:   { 
            validate: {
                presence: true,
                length: { is: 2 }
            }
        },
        zipcode: { 
            validate: {
                presence: true,
                length: { is: 5 }
            }
        }
    }
});

const LineItem = Base.extend({
    $properties: {
        plu: { 
            validate: {
                presence: true,
                length: { is: 5 }
            }
        },
        quantity: {
            value: 0,
            validate: {
                numericality: {
                    onlyInteger: true,
                    greaterThan: 0
                }
            }
        }
    }
});

const Order = Base.extend({
    $properties: {
        address: {
            map: Address,  
            validate: {
                presence: true,
                nested: true
            }
        },
        lineItems: { 
            map: LineItem, 
            validate: {
                presence: true,
                nested: true
            }
        }
    }
});

const User = Base.extend({
    $properties: {
        userName: {
            validate: {
                uniqueUserName: true
            }
        },
        orders: { map: Order }
    },
    constructor(userName) {
        this.userName = userName;
    }
});      

const Database = Base.extend({
    constructor(userNames) {
        this.extend({
            hasUserName(userName) {
                return userNames.indexOf(userName) >= 0;
            }
        });
    }
});

const CustomValidators = ValidationRegistry.extend({
    mustBeUpperCase: () => {},
    uniqueUserName:  [Database, function (db, userName) {
        if (db.hasUserName(userName)) {
            return `UserName ${userName} is already taken`;
        }
    }]
});

describe("ValidatorRegistry", () => {
    it("should not create instance", () => {
        expect(() => {
            new CustomValidators();
        }).to.throw(TypeError, "Abstract class cannot be instantiated.");
    });

    it("should register validators", () => {
        expect(validatejs.validators).to.have.property('mustBeUpperCase');
    });

    it("should register validators on demand", () => {
        CustomValidators.implement({
            uniqueLastName() {}
        });
        expect(validatejs.validators).to.have.property('uniqueLastName');
    });

    it("should register validators with dependencies", () => {
        expect(validatejs.validators).to.have.property('uniqueUserName');
    });
});

describe("ValidateJsCallbackHandler", () => {
    let context;
    beforeEach(() => {
        context = new Context();
        context.addHandlers(new ValidationCallbackHandler, new ValidateJsCallbackHandler);
    });

    describe("#validate", () => {
        it("should validate simple objects", () => {
            const address = new Address,
                  results = Validator(context).validate(address);
            expect(results.line.errors.presence).to.eql([{
                message: "Line can't be blank",
                value:   undefined
            }]);
            expect(results.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   undefined
            }]);
            expect(results.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   undefined
            }]);
            expect(results.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   undefined
            }]);
        });

        it("should validate complex objects", () => {
            const order = new Order();
            order.address   = new Address({
                line:    "100 Tulip Ln",
                city:    "Wantaugh",
                state:   "NY",
                zipcode: "11580"
            });
            order.lineItems = [new LineItem({plu: '12345', quantity: 2})];
            const results = Validator(context).validate(order);
            expect(results.valid).to.be.true;
        });

        it("should invalidate complex objects", () => {
            const order = new Order();
            order.address   = new Address;
            order.lineItems = [new LineItem];
            const results = Validator(context).validate(order);
            expect(results.address.line.errors.presence).to.eql([{
                message: "Line can't be blank",
                value:   undefined
            }]);
            expect(results.address.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   undefined
            }]);
            expect(results.address.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   undefined
            }]);
            expect(results.address.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   undefined
            }]);
            expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                message: "Plu can't be blank",
                value:   undefined
            }]);
            expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                message: "Quantity must be greater than 0",
                value:   0
            }]);
            expect(results.errors.presence).to.deep.include.members([{
                key:     "address.line",
                message: "Line can't be blank",
                value:   undefined
            }, {
                key:     "address.city",
                message: "City can't be blank",
                value:   undefined
            }, {
                key:     "address.state",
                message: "State can't be blank",
                value:   undefined
            }, {
                key:     "address.zipcode",
                message: "Zipcode can't be blank",
                value:   undefined
            }, {
                key:     "lineItems.0.plu",
                message: "Plu can't be blank",
                value:   undefined
            }
            ]);
            expect(results.errors.numericality).to.deep.include.members([{
                key:     "lineItems.0.quantity",
                message: "Quantity must be greater than 0",
                value:   0
            }
            ]);
        });

        it("should pass exceptions through", () => {
            const ThrowValidators = ValidationRegistry.extend({
                  throws() {
                      throw new Error("Oh No!");
                  }}),
                  ThrowOnValidation = Base.extend({
                      $properties: {
                          bad:  { validate: { throws: true } }
                      }
                  });                
            expect(() => {
                Validator(context).validate(new ThrowOnValidation);
            }).to.throw(Error, "Oh No!");
        });

        it("should validate with dependencies", () => {
            const user     = new User('neo'),
                  database = new Database(['hellboy', 'razor']);
            context.addHandlers(new (CallbackHandler.extend(Invoking, {
                invoke(fn, dependencies) {
                    expect(dependencies[0]).to.equal(Database);
                    dependencies[0] = database;
                    for (let i = 1; i < dependencies.length; ++i) {
                        dependencies[i] = Modifier.unwrap(dependencies[i]);
                    }
                    return fn.apply(null, dependencies);
                }
            })));
            let results = Validator(context).validate(user);
            expect(results.valid).to.be.true;
            user.userName = 'razor';
            results = Validator(context).validate(user);
            expect(results.valid).to.be.false;
        });

        it("should dynamically find validators", () => {
            const MissingValidator = Base.extend({
                  $properties: {
                      code:  { validate: { uniqueCode: true } }
                  }
              });
            context.addHandlers((new CallbackHandler).extend({
                $provide:[
                    "uniqueCode", function () { return this; }
                ],
                validate(value, options, key, attributes) {}
            }));
            expect(Validator(context).validate(new MissingValidator).valid).to.be.true;
        });

        it("should fail if missing validator", () => {
            const MissingValidator = Base.extend({
                  $properties: {
                      code:  { validate: { uniqueCode: true } }
                  }
              });
            expect(() => {
                Validator(context).validate(new MissingValidator);
            }).to.throw(Error, "Unable to resolve validator 'uniqueCode'.");
        });    
    });

    describe("#validateAsync", () => {
        it("should validate simple objects", () => {
            const address = new Address();
            Validator(context).validateAsync(address).then(results => {
                expect(results.line.errors.presence).to.eql([{
                    message: "Line can't be blank",
                    value:   undefined
                }]);
                expect(results.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   undefined
                }]);
                expect(results.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   undefined
                }]);
                expect(results.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   undefined
                }]);
            });
        });

        it("should invalidate complex objects", done => {
            const order = new Order();
            order.address   = new Address;
            order.lineItems = [new LineItem];
            Validator(context).validateAsync(order).then(results => {
                expect(results.address.line.errors.presence).to.eql([{
                    message: "Line can't be blank",
                    value:   undefined
                }]);
                expect(results.address.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   undefined
                }]);
                expect(results.address.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   undefined
                }]);
                expect(results.address.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   undefined
                }]);
                expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                    message: "Plu can't be blank",
                    value:   undefined
                }]);
                expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                    message: "Quantity must be greater than 0",
                    value:   0
                }]);
                expect(results.errors.presence).to.deep.include.members([{
                    key:     "address.line",
                    message: "Line can't be blank",
                    value:   undefined
                }, {
                    key:     "address.city",
                    message: "City can't be blank",
                    value:   undefined
                }, {
                    key:     "address.state",
                    message: "State can't be blank",
                    value:   undefined
                }, {
                    key:     "address.zipcode",
                    message: "Zipcode can't be blank",
                    value:   undefined
                }, {
                    key:     "lineItems.0.plu",
                    message: "Plu can't be blank",
                    value:   undefined
                }
                ]);
                expect(results.errors.numericality).to.deep.include.members([{
                    key:     "lineItems.0.quantity",
                    message: "Quantity must be greater than 0",
                    value:   0
                }
                ]);
                done();
            });
        });
        
        it("should pass exceptions through", done => {
            const ThrowValidators = ValidationRegistry.extend({
                  throwsAsync() {
                      return Promise.reject(new Error("Oh No!"));
                  }}),
                  ThrowOnValidation = Base.extend({
                      $properties: {
                          bad:  { validate: { throwsAsync: true } }
                      }
                  });
            Validator(context).validateAsync(new ThrowOnValidation).catch(error => {
                expect(error.message).to.equal("Oh No!");
                done();
            });
        });
    });
});
