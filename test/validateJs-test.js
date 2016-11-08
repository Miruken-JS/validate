import { Base, Invoking, Modifier, inject } from "miruken-core";
import { Handler, provide } from "miruken-callback";
import { Context } from "miruken-context";
import { Validator, ValidationHandler } from "../src/validator";
import { ValidateJsHandler } from "../src/validatorJs";
import { customValidator } from "../src/customValidator";
import { constraint, applyConstraints } from "../src/constraint";
import { includes, excludes } from "../src/member";
import { required } from "../src/required";
import { length } from "../src/length";
import { number } from "../src/number";
import { matches } from "../src/matches";
import { email } from "../src/email";
import { url } from "../src/url";

import validatejs from "validate.js";

import { expect } from "chai";

const Database = Base.extend({
    constructor(userNames,emails) {
        this.extend({
            hasUserName(userName) {
                return userNames.indexOf(userName) >= 0;
            },
            hasEmail(email) {
                return emails.indexOf(email) >= 0;
            }
        });
    }
});

const customStatic = Base.extend(customValidator, null, {
    mustBeUpperCase(text) {},
    @inject(Database)
    uniqueUserName(database, userName) {
        if (userName != null && database.hasUserName(userName)) {
            return `${userName} is already taken`;
        }
    }
});

const customInstance = Base.extend(customValidator, {
    @inject(Database)    
    constructor(database) {
        this.database = database;
    },
    uniqueEmail(email) {
        return customInstance.uniqueEmail(this.database, email);
    }
}, {
    @inject(Database)    
    uniqueEmail(database, email) {
        if (email != null && database.hasEmail(email)) {
            return `${email} is already taken`;
        }        
    }
});

const Address = Base.extend({
    @required
    line: "",
    @required    
    city: "",
    @required
    @length.is(2)
    state: "",
    @required
    @length.is(5)    
    zipcode: "" 
});

const LineItem = Base.extend({
    @required
    @length.is(5)
    plu: "",
    @number.onlyInteger
    @number.greaterThan(0)
    quantity: 0
});

const Order = Base.extend({
    @required
    @applyConstraints
    address: "",
    @required
    @applyConstraints    
    lineItems: [],
    @email
    @customInstance.uniqueEmail
    email: undefined
});

const User = Base.extend({
    @customStatic.uniqueUserName
    userName: undefined,
    orders: [],
    constructor(userName) {
        this.userName = userName;
    }
});

describe("built-ins", () => {
    let context;
    beforeEach(() => {
        context = new Context();
        context.addHandlers(new ValidationHandler(), new ValidateJsHandler());
    });

    describe("required", () => {
        it("should require value", () => {
            const address = new Address({
                      line: "abc", city: "Rockwall",
                      state: "TX", zipcode: "75032"
                  }),
                  results = Validator(context).validate(address);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not provided", () => {
            const address = new Address(),
                  results = Validator(context).validate(address);
            expect(results["city"].errors.presence).to.eql([{
                message: "City can't be blank", 
                value:   ""
            }]);
        });    
    });

    describe("length", () => {
        it("should satisfy length", () => {
            const address = new Address({
                      line: "abc", city: "Rockwall",
                      state: "TX", zipcode: "75032"
                  }),
                  results = Validator(context).validate(address);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if length unsatisfied", () => {
            const address = new Address({
                      line: "abc", city: "Rockwall",
                      state: "T", zipcode: "7503"
                  }),
                  results = Validator(context).validate(address);
            expect(results["state"].errors.length).to.eql([{
                message: "State is the wrong length (should be 2 characters)", 
                value:   "T"
            }]);
            expect(results["zipcode"].errors.length).to.eql([{
                message: "Zipcode is the wrong length (should be 5 characters)", 
                value:   "7503"
            }]);            
        });    
    });
    
    describe("number", () => {
        const Person = Base.extend({
            @number
            age: undefined
        });
        
        it("should require typeof number", () => {
            const person = new Person({age: 7}),
                  results = Validator(context).validate(person);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not typeof number", () => {
            const person = new Person({age: "7"}),
                  results = Validator(context).validate(person);
            expect(results["age"].errors.numericality).to.eql([{
                message: "Age is not a number", 
                value:   "7"
            }]);
        });    
    });
    
    describe("email", () => {
        const Contact = Base.extend({
            @email
            @customInstance.uniqueEmail
            email: undefined
        });

        beforeEach(() => {
            context.addHandlers(new customInstance(new Database([], ["miruken@gmail.com"])));
        });

        it("should require valid email", () => {
            const contact = new Contact({email: "ric@miruken.com"}),
                  results = Validator(context).validate(contact);
            expect(results.valid).to.be.true;            
        });
        
        it("should fail if not a valid email", () => {
            const contact = new Contact({email: "hello"}),
                  results = Validator(context).validate(contact);
            expect(results["email"].errors.email).to.eql([{
                message: "Email is not a valid email", 
                value:   "hello"
            }]);
        });

        it("should fail if email already exists", () => {
            const contact = new Contact({email: "miruken@gmail.com"}),
                  results = Validator(context).validate(contact);
            expect(results["email"].errors.uniqueEmail).to.eql([{
                message: "Email miruken@gmail.com is already taken", 
                value:   "miruken@gmail.com"
            }]);
        });
    });

    describe("url", () => {
        const Site = Base.extend({
            @url
            url: undefined
        });
        
        it("should require valid url", () => {
            const site = new Site({url: "http://www.google.com"}),
                  results = Validator(context).validate(site);
            expect(results.valid).to.be.true;            
        });
        
        it("should fail if not a valid url", () => {
            const site = new Site({url: "www.google.com"}),
                  results = Validator(context).validate(site);
            expect(results["url"].errors.url).to.eql([{
                message: "Url is not a valid url", 
                value:   "www.google.com"
            }]);
        });    
    });

    describe("matches", () => {
        const Login = Base.extend({
            @matches(/^[a-z0-9_-]{3,16}$/)
            userName: undefined,
            @matches(/^[a-z0-9_-]{6,18}$/)
            password: undefined            
        });
        
        it("should require valid match", () => {
            const login = new Login({userName: "my-us3r_n4m3", password: "myp4ssw0rd"}),
                  results = Validator(context).validate(login);
            expect(results.valid).to.be.true;            
        });
        
        it("should fail if not a valid match", () => {
            const login = new Login({
                userName: "th1s1s-wayt00_l0ngt0beausername", password: "mypa$$w0rd"}),
                  results = Validator(context).validate(login);
            expect(results["userName"].errors.format).to.eql([{
                message: "User name is invalid", 
                value:   "th1s1s-wayt00_l0ngt0beausername"
            }]);                
            expect(results["password"].errors.format).to.eql([{
                message: "Password is invalid", 
                value:   "mypa$$w0rd"
            }]);
        });    
    });

    describe("member", () => {
        const ShoppingCart = Base.extend({
            @includes("ball", "barbie", "lego")
            purchase: undefined,
            @excludes(11580, 75032)
            delivery: undefined          
        });
        
        it("should require inclusion", () => {
            const cart = new ShoppingCart({purchase: "barbie"}),
                  results = Validator(context).validate(cart);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not included", () => {
            const cart = new ShoppingCart({purchase: "gun"}),
                  results = Validator(context).validate(cart);
            expect(results["purchase"].errors.inclusion).to.eql([{
                message: "gun is not included in the list", 
                value:   "gun"
            }]);
        });

        it("should require exclusion", () => {
            const cart = new ShoppingCart({delivery: 75087}),
                  results = Validator(context).validate(cart);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not excluded", () => {
            const cart = new ShoppingCart({delivery: 75032}),
                  results = Validator(context).validate(cart);
            expect(results["delivery"].errors.exclusion).to.eql([{
                message: "75032 is restricted", 
                value:   75032
            }]);
        });            
    });
});
    
describe("customValidator", () => {
    it("should register validators", () => {
        expect(validatejs.validators).to.have.property("mustBeUpperCase");
    });

    it("should register validators on demand", () => {
        Base.extend(customValidator, {
            uniqueLastName(lastName) {}
        });
        expect(validatejs.validators).to.have.property("uniqueLastName");
    });

    it("should register static validators with dependencies", () => {
        expect(validatejs.validators).to.have.property("uniqueUserName");
    });

    it("should accept direct calls to static validator methods", () => {
        const database = new Database(["hellboy", "razor"]),
              errors   = customStatic.uniqueUserName(database, "razor");
        expect(errors).to.equal("razor is already taken");
    });
    
    it("should register instance validators with dependencies", () => {
        expect(validatejs.validators).to.have.property("uniqueEmail");
    });

    it("should accept direct calls to static validator methods", () => {
        const database  = new Database([], ["miruken@gmail.com"]),
              validator = new customInstance(database),
              errors    = validator.uniqueEmail("miruken@gmail.com");
        expect(errors).to.equal("miruken@gmail.com is already taken");
    });
    
    it("should handle naming conflicts", () => {
        Base.extend(customValidator, {
            mustBeUpperCase(text) {},
        });
        expect(validatejs.validators).to.have.property("mustBeUpperCase");
        expect(validatejs.validators).to.have.property("mustBeUpperCase-0");        
    });

});

describe("ValidateJsHandler", () => {
    let context;
    beforeEach(() => {
        context = new Context();
        context.addHandlers(new ValidationHandler(), new ValidateJsHandler());
    });

    describe("#validate", () => {
        it("should validate simple objects", () => {
            const address = new Address(),
                  results = Validator(context).validate(address);
            expect(results.line.errors.presence).to.eql([{
                message: "Line can't be blank",
                value:   ""
            }]);
            expect(results.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   ""
            }]);
            expect(results.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   ""
            }]);
            expect(results.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   ""
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
            order.lineItems = [new LineItem({plu: "12345", quantity: 2})];
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
                value:   ""
            }]);
            expect(results.address.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   ""
            }]);
            expect(results.address.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   ""
            }]);
            expect(results.address.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   ""
            }]);
            expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                message: "Plu can't be blank",
                value:   ""
            }]);
            expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                message: "Quantity must be greater than 0",
                value:   0
            }]);
            expect(results.errors.presence).to.deep.include.members([{
                key:     "address.line",
                message: "Line can't be blank",
                value:   ""
            }, {
                key:     "address.city",
                message: "City can't be blank",
                value:   ""
            }, {
                key:     "address.state",
                message: "State can't be blank",
                value:   ""
            }, {
                key:     "address.zipcode",
                message: "Zipcode can't be blank",
                value:   ""
            }, {
                key:     "lineItems.0.plu",
                message: "Plu can't be blank",
                value:   ""
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
            const ex = Base.extend(customValidator, {
                  throws(value) {
                      throw new Error("Oh No!");
                  }}),
                  ThrowOnValidation = Base.extend({
                      @ex.throws
                      bad: undefined
                  });                
            expect(() => {
                Validator(context).validate(new ThrowOnValidation);
            }).to.throw(Error, "Oh No!");
        });

        it("should validate with dependencies", () => {
            const user     = new User("neo"),
                  database = new Database(["hellboy", "razor"]);
            context.addHandlers(new (Handler.extend(Invoking, {
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
            user.userName = "razor";
            results = Validator(context).validate(user);
            expect(results.valid).to.be.false;
        });

        it("should dynamically find validators", () => {
            const MissingValidator = Base.extend({
                @constraint({uniqueCode: true})
                code: undefined
              });
            context.addHandlers((new Handler).extend({
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
                    value:   ""
                }]);
                expect(results.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   ""
                }]);
                expect(results.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   ""
                }]);
                expect(results.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   ""
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
                    value:   ""
                }]);
                expect(results.address.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   ""
                }]);
                expect(results.address.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   ""
                }]);
                expect(results.address.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   ""
                }]);
                expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                    message: "Plu can't be blank",
                    value:   ""
                }]);
                expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                    message: "Quantity must be greater than 0",
                    value:   0
                }]);
                expect(results.errors.presence).to.deep.include.members([{
                    key:     "address.line",
                    message: "Line can't be blank",
                    value:   ""
                }, {
                    key:     "address.city",
                    message: "City can't be blank",
                    value:   ""
                }, {
                    key:     "address.state",
                    message: "State can't be blank",
                    value:   ""
                }, {
                    key:     "address.zipcode",
                    message: "Zipcode can't be blank",
                    value:   ""
                }, {
                    key:     "lineItems.0.plu",
                    message: "Plu can't be blank",
                    value:   ""
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
            const ex = Base.extend(customValidator, {
                  throwsAsync(value) {
                      return Promise.reject(new Error("Oh No!"));
                  }}),
                  ThrowOnValidation = Base.extend({
                      @ex.throwsAsync
                      bad: undefined
                  });
            Validator(context).validateAsync(new ThrowOnValidation).catch(error => {
                expect(error.message).to.equal("Oh No!");
                done();
            });
        });
    });
});
