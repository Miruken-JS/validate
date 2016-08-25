import { Base, Invoking, Modifier, inject } from 'miruken-core';
import { CallbackHandler, provide } from 'miruken-callback';
import { Context } from 'miruken-context';
import { Validator, ValidationCallbackHandler } from '../src/validator';
import { ValidateJsCallbackHandler } from '../src/validatorJs';
import { customValidator } from '../src/customValidator';
import { constraint, is, has, applyConstraints } from '../src/constraint';
import '../src/required';
import '../src/length';
import '../src/number';
    
import validatejs from 'validate.js';

import { expect } from 'chai';

const Database = Base.extend({
    constructor(userNames) {
        this.extend({
            hasUserName(userName) {
                return userNames.indexOf(userName) >= 0;
            }
        });
    }
});

const CustomValidators = Base.extend(customValidator, {
    mustBeUpperCase() {},
    @inject(Database)
    uniqueUserName(db, userName) {
        if (db.hasUserName(userName)) {
            return `UserName ${userName} is already taken`;
        }
    }
});

const Address = Base.extend({
    @is.required
    line: '',
    @is.required    
    city: '',
    @is.required
    @has.exactLength(2)
    state: '',
    @is.required
    @has.exactLength(5)    
    zipcode: '' 
});

const LineItem = Base.extend({
    @is.required
    @has.exactLength(5)
    plu: '',
    @is.onlyInteger
    @is.greaterThan(0)
    quantity: 0
});

const Order = Base.extend({
    @is.required
    @applyConstraints
    address: '',
    @is.required
    @applyConstraints    
    lineItems: [], 
});

const User = Base.extend({
    @has.uniqueUserName
    userName: '',
    orders: [],
    constructor(userName) {
        this.userName = userName;
    }
});      

describe("customValidator", () => {
    it("should register validators", () => {
        expect(validatejs.validators).to.have.property('mustBeUpperCase');
    });

    it("should register validators on demand", () => {
        CustomValidators.implement({
            @customValidator
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
            const address = new Address(),
                  results = Validator(context).validate(address);
            expect(results.line.errors.presence).to.eql([{
                message: "Line can't be blank",
                value:   ''
            }]);
            expect(results.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   ''
            }]);
            expect(results.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   ''
            }]);
            expect(results.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   ''
            }]);
        });

        it("should validate complex objects", () => {
            const order   = new Order();
            order.address = new Address({
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
            const order     = new Order();
            order.address   = new Address;
            order.lineItems = [new LineItem];
            const results = Validator(context).validate(order);
            expect(results.address.line.errors.presence).to.eql([{
                message: "Line can't be blank",
                value:   ''
            }]);
            expect(results.address.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   ''
            }]);
            expect(results.address.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   ''
            }]);
            expect(results.address.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   ''
            }]);
            expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                message: "Plu can't be blank",
                value:   ''
            }]);
            expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                message: "Quantity must be greater than 0",
                value:   0
            }]);
            expect(results.errors.presence).to.deep.include.members([{
                key:     "address.line",
                message: "Line can't be blank",
                value:   ''
            }, {
                key:     "address.city",
                message: "City can't be blank",
                value:   ''
            }, {
                key:     "address.state",
                message: "State can't be blank",
                value:   ''
            }, {
                key:     "address.zipcode",
                message: "Zipcode can't be blank",
                value:   ''
            }, {
                key:     "lineItems.0.plu",
                message: "Plu can't be blank",
                value:   ''
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
            const ThrowValidators = Base.extend(customValidator, {
                  throws() {
                      throw new Error("Oh No!");
                  }}),
                  ThrowOnValidation = Base.extend({
                      @constraint.throws
                      bad: undefined
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
                @constraint({uniqueCode: true})
                code: undefined
              });
            context.addHandlers((new CallbackHandler).extend({
                @provide("uniqueCode")
                uniqueCode() { return this; },
                validate(value, options, key, attributes) {}
            }));
            expect(Validator(context).validate(new MissingValidator).valid).to.be.true;
        });

        it("should fail if missing validator", () => {
            const MissingValidator = Base.extend({
                @constraint({uniqueCode: true})
                code: undefined
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
                    value:   ''
                }]);
                expect(results.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   ''
                }]);
                expect(results.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   ''
                }]);
                expect(results.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   ''
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
                    value:   ''
                }]);
                expect(results.address.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   ''
                }]);
                expect(results.address.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   ''
                }]);
                expect(results.address.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   ''
                }]);
                expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                    message: "Plu can't be blank",
                    value:   ''
                }]);
                expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                    message: "Quantity must be greater than 0",
                    value:   0
                }]);
                expect(results.errors.presence).to.deep.include.members([{
                    key:     "address.line",
                    message: "Line can't be blank",
                    value:   ''
                }, {
                    key:     "address.city",
                    message: "City can't be blank",
                    value:   ''
                }, {
                    key:     "address.state",
                    message: "State can't be blank",
                    value:   ''
                }, {
                    key:     "address.zipcode",
                    message: "Zipcode can't be blank",
                    value:   ''
                }, {
                    key:     "lineItems.0.plu",
                    message: "Plu can't be blank",
                    value:   ''
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
            const ThrowValidators = Base.extend(customValidator, {
                  throwsAsync() {
                      return Promise.reject(new Error("Oh No!"));
                  }}),
                  ThrowOnValidation = Base.extend({
                      @constraint.throwsAsync
                      bad: undefined
                  });
            Validator(context).validateAsync(new ThrowOnValidation).catch(error => {
                expect(error.message).to.equal("Oh No!");
                done();
            });
        });
    });
});
