import { 
    Base, type, design, $contents,
    createKeyChain, Handler, Context, provides
} from "@miruken/core";

import { ValidateJsHandler } from "@/validatorJs";
import { customValidator } from "@/custom-validator";
import { constraint, valid } from "@/constraint";
import { includes, excludes } from "@/member";
import { required } from "@/required";
import { length } from "@/length";
import { number } from "@/number";
import { matches } from "@/matches";
import { email } from "@/email";
import { url } from "@/url";

import validatejs from "validate.js";

import { expect } from "chai";

const _ = createKeyChain();

class Database {
    constructor(userNames, emails) {
        _(this).userNames = userNames;
        _(this).emails    = emails;
    }

    hasUserName(userName) {
        return _(this).userNames.indexOf(userName) >= 0;
    }

    hasEmail(email) {
        return _(this).emails.indexOf(email) >= 0;
    }
}

@customValidator
class customStatic {
    static mustBeUpperCase(text) {}

    @design(Database)
    static uniqueUserName(database, userName) {
        if (userName != null && database.hasUserName(userName)) {
            return `${userName} is already taken`;
        }
    }
}

@customValidator 
class customInstance {
    constructor(@type(Database) database) {
        this.database = database;
    }

    uniqueEmail(email) {
        return customInstance.uniqueEmail(this.database, email);
    }

    @design(Database)
    static uniqueEmail(database, email) {
        if (email != null && database.hasEmail(email)) {
            return `${email} is already taken`;
        }        
    }
}

class Address extends Base {
    @required
    line;

    @required    
    city;

    @required
    @length.is(2)
    state;

    @required
    @length.is(5)    
    zipcode;
}

class LineItem extends Base {
    @required
    @length.is(5)
    plu;

    @number.onlyInteger
    @number.greaterThan(0)
    quantity = 0;
}

class Order extends Base {
    @required
    @valid
    address;

    @required
    @valid    
    lineItems = [];

    @email
    @customInstance.uniqueEmail
    email;
}

class User extends Base {
    @customStatic.uniqueUserName
    userName;

    orders = [];

    constructor(userName) {
        super();
        this.userName = userName;
    }
}

describe("built-ins", () => {
    let context;
    beforeEach(() => {
        context = new Context();
        context.addHandlers(new ValidateJsHandler());
    });

    describe("required", () => {
        it("should require value", () => {
            const address = new Address().extend({
                      line: "abc", city: "Rockwall",
                      state: "TX", zipcode: "75032"
                  }),
                  results = context.validate(address);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not provided", () => {
            const address = new Address(),
                  results = context.validate(address);
            expect(results["city"].errors.presence).to.eql([{
                message: "City can't be blank", 
                value:   undefined
            }]);
        });    
    });

    describe("length", () => {
        it("should satisfy length", () => {
            const address = new Address().extend({
                      line:  "abc", city: "Rockwall",
                      state: "TX",  zipcode: "75032"
                  }),
                  results = context.validate(address);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if length unsatisfied", () => {
            const address = new Address().extend({
                      line: "abc", city: "Rockwall",
                      state: "T", zipcode: "7503"
                  }),
                  results = context.validate(address);
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
        class Person extends Base {
            @number age;
        }
        
        it("should require typeof number", () => {
            const person = new Person().extend({age: 7}),
                  results = context.validate(person);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not typeof number", () => {
            const person = new Person().extend({age: "7"}),
                  results = context.validate(person);
            expect(results["age"].errors.numericality).to.eql([{
                message: "Age is not a number", 
                value:   "7"
            }]);
        });    
    });
    
    describe("email", () => {
        class Contact extends Base {
            @email
            @customInstance.uniqueEmail
            email;
        }

        beforeEach(() => {
            context.addHandlers(new customInstance(new Database([], ["miruken@gmail.com"])));
        });

        it("should require valid email", () => {
            const contact = new Contact().extend({email: "ric@miruken.com"}),
                  results = context.validate(contact);
            expect(results.valid).to.be.true;            
        });
        
        it("should fail if not a valid email", () => {
            const contact = new Contact().extend({email: "hello"}),
                  results = context.validate(contact);
            expect(results["email"].errors.email).to.eql([{
                message: "Email is not a valid email", 
                value:   "hello"
            }]);
        });

        it("should fail if email already exists", () => {
            const contact = new Contact().extend({email: "miruken@gmail.com"}),
                  results = context.validate(contact);
            expect(results["email"].errors.uniqueEmail).to.eql([{
                message: "Email miruken@gmail.com is already taken", 
                value:   "miruken@gmail.com"
            }]);
        });
    });

    describe("url", () => {
        class Site extends Base {
            @url url;
        }
        
        it("should require valid url", () => {
            const site = new Site().extend({url: "http://www.google.com"}),
                  results = context.validate(site);
            expect(results.valid).to.be.true;            
        });
        
        it("should fail if not a valid url", () => {
            const site = new Site().extend({url: "www.google.com"}),
                  results = context.validate(site);
            expect(results["url"].errors.url).to.eql([{
                message: "Url is not a valid url", 
                value:   "www.google.com"
            }]);
        });    
    });

    describe("matches", () => {
        class Login extends Base {
            @matches(/^[a-z0-9_-]{3,16}$/)
            userName;

            @matches(/^[a-z0-9_-]{6,18}$/)
            password;            
        }
        
        it("should require valid match", () => {
            const login = new Login().extend({
                      userName: "my-us3r_n4m3",
                      password: "myp4ssw0rd"
                  }),
                  results = context.validate(login);
            expect(results.valid).to.be.true;            
        });
        
        it("should fail if not a valid match", () => {
            const login = new Login().extend({
                      userName: "th1s1s-wayt00_l0ngt0beausername",
                      password: "mypa$$w0rd"
                  }),
                  results = context.validate(login);
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
        class ShoppingCart extends Base {
            @includes("ball", "barbie", "lego")
            purchase;

            @excludes(11580, 75032)
            delivery;          
        }
        
        it("should require inclusion", () => {
            const cart = new ShoppingCart().extend({purchase: "barbie"}),
                  results = context.validate(cart);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not included", () => {
            const cart = new ShoppingCart().extend({purchase: "gun"}),
                  results = context.validate(cart);
            expect(results["purchase"].errors.inclusion).to.eql([{
                message: "gun is not included in the list", 
                value:   "gun"
            }]);
        });

        it("should require exclusion", () => {
            const cart = new ShoppingCart().extend({delivery: 75087}),
                  results = context.validate(cart);
            expect(results.valid).to.be.true;
        });    
        
        it("should fail if not excluded", () => {
            const cart = new ShoppingCart().extend({delivery: 75032}),
                  results = context.validate(cart);
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
        context.addHandlers(new ValidateJsHandler());
    });

    describe("#validate", () => {
        it("should validate simple objects", () => {
            const address = new Address(),
                  results = context.validate(address);
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
            const order   = new Order();
            order.address = new Address().extend({
                line:    "100 Tulip Ln",
                city:    "Wantaugh",
                state:   "NY",
                zipcode: "11580"
            });
            order.lineItems = [new LineItem().extend({
                      plu:      "12345",
                      quantity: 2
                 })];
            const results = context.validate(order);
            expect(results.valid).to.be.true;
        });

        it("should invalidate complex objects", () => {
            const order     = new Order();
            order.address   = new Address;
            order.lineItems = [new LineItem];
            const results = context.validate(order);
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
            const ex = @customValidator class {
                  throws(value) {
                      throw new Error("Oh No!");
                  }},
                  ThrowOnValidation = class {
                      @ex.throws
                      bad;
                  };                
            expect(() => {
                context.validate(new ThrowOnValidation);
            }).to.throw(Error, "Oh No!");
        });

        it("should validate with dependencies", () => {
            const user     = new User("neo"),
                  database = new Database(["hellboy", "razor"]),
                  handler  = context.$with(new Database(["hellboy", "razor"]));
            let results = handler.validate(user);
            expect(results.valid).to.be.true;
            user.userName = "razor";
            results = handler.validate(user);
            expect(results.valid).to.be.false;
        });

        it("should dynamically find validators", () => {
            class MissingValidator {
                @constraint({uniqueCode: true})
                code;
            }
            context.addHandlers((new Handler).extend({
                @provides("uniqueCode")
                uniqueCode() { return this; },
                validate(value, options, key, attributes) {}
            }));
            expect(context.validate(new MissingValidator).valid).to.be.true;
        });

        it("should fail if missing validator", () => {
            delete validatejs.validators.uniqueCode;
            class MissingValidator {
                @constraint({uniqueCode: true})
                code;
            }
            expect(() => {
                context.validate(new MissingValidator);
            }).to.throw(Error, "Unable to resolve validator 'uniqueCode'.");
        });    
    });

    describe("#validateAsync", () => {
        it("should validate simple objects", () => {
            const address = new Address();
            context.validateAsync(address).then(results => {
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
            context.validateAsync(order).then(results => {
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
            const ex = @customValidator class {
                  throwsAsync(value) {
                      return Promise.reject(new Error("Oh No!"));
                  }},
                  ThrowOnValidation = class {
                      @ex.throwsAsync
                      bad;
                  };
            context.validateAsync(new ThrowOnValidation).catch(error => {
                expect(error.message).to.equal("Oh No!");
                done();
            });
        });
    });
});
