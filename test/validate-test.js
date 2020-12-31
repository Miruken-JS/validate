import { 
    True, Base, type, $contents, Handler,
    InferenceHandler, Context, handles, provides
} from "@miruken/core";

import { validates } from "@/validates";
import { Validation } from "@/validation";
import { validateThat } from "@/validate-that";
import { ValidationResult } from "@/validation-result";
import { ValidateFilter } from "@/validate-filter";
import { ValidationError } from "@/validation-error";
import { ValidateProvider, validate } from "@/validate";
import "@/handler-validate";

import { expect } from 'chai';

class HttpClient {}

class Model extends Base {
    id;
}

class Player extends Model {
    firstName = ''
    lastName  = ''
    dob       = null
}

class Coach extends Model {
    firstName = ''
    lastName  = ''
    license   = ''

    @validateThat
    coachPassedBackgroundCheck(validation, @type(HttpClient) http) {
        return Promise.delay(10).then(() => {
            if (validation.object.lastName === 'Smith') {
                validation.results.addError('coachPassedBackgroundCheck', { 
                    message: 'Coach failed background check'
                });
            }
        });
    }
}

class Team extends Model {
    name     = ''
    division = ''
    players  = []

    @validateThat
    teamHasDivision(validation) {
        if (this.name === 'Liverpool' && this.division !== 'U8') {
            validation.results.addKey('division')
                .addError('teamHasDivision', { 
                    message: this.name + ' does not have division ' + this.division
                });
        }
    }

    @validates(Player)
    validatePlayer(validation, { composer }) {
        const player = validation.object;
        if (!player.firstName || player.firstName.length == 0) {
            validation.results.addKey('firstName')
                .addError('required', { message: 'First name required' });
        }
        if (!player.lastName  || player.lastName.length == 0) {
            validation.results.addKey('lastName')
                .addError('required', { message: 'Last name required' });
        }
        if ((player.dob instanceof Date) === false) {
            validation.results.addKey('dob')
                .addError('required', { message: 'DOB required' });
        }
    }

    @validates(Coach)
    validateCoach(validation, composer) {
        const coach = validation.object;
        if (!coach.firstName || coach.firstName.length == 0) {
            validation.results.addKey('firstName')
                .addError('required', { message: 'First name required' });
        }
        if (!coach.lastName  || coach.lastName.length == 0) {
            validation.results.addKey('lastName')
                .addError('required', { message: 'Last name required' });
        }
        if (["D", "E", "F"].indexOf(coach.license) < 0) {
            validation.results.addKey('license')
                .addError('license', { message: 'License must be D, E or F' });
        }
        return Promise.delay(50).then(True);
    }
}

describe("Validation", () => {
    describe("#object", () => {
        it("should get the validated object", () => {
            const team       = new Team().extend({name: "Aspros"}),
                  validation = new Validation(team);
            expect(validation.object).to.equal(team);
        });
    });

    describe("#scope", () => {
        it("should get the validation scope", () => {
            const team       = new Team().extend({name: "Aspros"}),
                  validation = new Validation(team, false, "players");
            expect(validation.scope).to.equal("players");
        });
    });
});

describe("ValidationResult", () => {
    describe("#addKey", () => {
        it("should add key", () => {
            const validation = new ValidationResult();
            validation.addKey("name");
            expect(validation).to.have.ownProperty("name");
            expect(validation["name"].valid).to.be.true;
        });
    });

    describe("#addError", () => {
        it("should add validation errors", () => {
            const validation = new ValidationResult();
            validation.addKey("name").addError("required", { message: "Team name required" });
            expect(validation["name"].errors["required"]).to.eql([{
                message: "Team name required"
            }]);
        });
    });

    describe("#reset", () => {
        it("should reset errors", () => {
            const validation = new ValidationResult();
            validation.addKey("name").addError("required", { message: "Team name required" });
            expect(validation.valid).to.be.false;
            validation.reset();
            expect(validation).to.not.have.ownProperty("name");
            expect(validation.valid).to.be.true;
        });
    });
});

describe("ValidationHelper", () => {
    describe("#validate", () => {
        it("should invalidate object", () => {
            const team   = new Team().extend({
                      name:     "Liverpool",
                      division: "U8"
                  }),
                  league = new Context().addHandlers(team),
                  player = new Player;
            expect(league.validate(player).valid).to.be.false;
        });

        it("should be valid if no validators", () => {
            const league = new Context(),
                  player = new Player;
            expect(league.validate(player).valid).to.be.true;
        });

        it("should add $validation to target", () => {
            const league  = new Context(),
                  player  = new Player,
                  results = league.validate(player);
            expect(results).to.equal(player.$validation);
        });

        it("should not enumerate $validation on target", () => {
            const league = new Context(),
                  player = new Player;
            league.validate(player);
            for (let key in player) {
                expect(key).to.not.equal('$validation');
            }
        });

        it("should provide key errors", () => {
            const team       = new Team().extend({
                      name:     "Liverpool",
                      division: "U8"
                  }),
                  league     = new Context().addHandlers(team),
                  player     = new Player().extend({firstName: "Matthew"});
            const results = league.validate(player);
            expect(results.valid).to.be.false;
            expect(results.lastName.errors.required).to.eql([{
                message: "Last name required"
            }]);
            expect(results.dob.errors.required).to.eql([{
                message: "DOB required"
            }]);
        });

        it("should dynamically add validation", () => {
            const team   = new Team().extend({
                      name:     "Liverpool",
                      division: "U8"
                  }),
                  league = new Context().addHandlers(team),
                  player = new Player().extend({
                      firstName: "Diego",
                      lastName:  "Morales", 
                      dob:       new Date(2006, 7, 19)
                  });
            validates.addHandler(league, Player, validation => {
                const player = validation.object,
                      start  = new Date(2006, 8, 1),
                      end    = new Date(2007, 7, 31);
                if (player.dob < start) {
                    validation.results.addKey("dob")
                        .addError("playerAge", { 
                            message: "Player too old for division " + team.division,
                            value:   player.dob
                        });
                } else if (player.dob > end) {
                    validation.results.addKey("dob")
                        .addError("playerAge", { 
                            message: "Player too young for division " + team.division,
                            value:   player.dob
                        });
                }
            });
            const results = league.validate(player);
            expect(results.valid).to.be.false;
            expect(results.dob.errors.playerAge).to.eql([{
                message: "Player too old for division U8",
                value:   new Date(2006, 7, 19)
            }]);
        });

        it("should validateThat instance", () => {
            const team    = new Team().extend({
                      name:     "Liverpool",
                      division: "U7"
                  }),
                  league  = new Context(),
                  results = league.validate(team);
            expect(results.valid).to.be.false;
            expect(results.division.errors.teamHasDivision).to.eql([{
                message: "Liverpool does not have division U7"
            }]);
        });

        it("should validateThat instance with dependencies", () => {
            const coach   = new Coach().extend({
                      firstName: "Jordan",
                      license:   "D"
                  }),
                  league  = new Context().$with(new HttpClient()),
                  results = league.validate(coach);
            expect(results.valid).to.be.true;
        });

        it("should validate unknown sources", () => {
            const league = new Context();
            validates.addHandler(league, null, validation => {
                const source = validation.object;
                if ((source instanceof Team) &&
                    (!source.name || source.name.length == 0)) {
                    validation.results.addKey('name')
                        .addError('required', { message: "Team name required" });
                }
            });
            const results = league.validate(new Team);
            expect(results.valid).to.be.false;
            expect(results.name.errors.required).to.eql([{
                message: "Team name required"
            }]);
        });

        it("should roll up errors", () => {
            const team    = new Team().extend({
                      name:     "Liverpool",
                      division: "U8"
                  }),
                  league  = new Context().addHandlers(team),
                  player  = new Player;
            const results = league.validate(player);
            expect(results.valid).to.be.false;
            expect(results.errors.required).to.deep.include.members([{
                    key:     "firstName",
                    message: "First name required"
                  }, {
                    key:     "lastName",
                    message: "Last name required"
                  }, {
                    key:     "dob",
                    message: "DOB required"
                }
            ]);
        });
    });

    describe("#validateAsync", () => {
        let   league;
        beforeEach(() => {
            league = new Context().$with(new HttpClient());
        });

        it("should invalidate object", done => {
            const team  = new Team({
                      name:     "Liverpool",
                      division: "U8"
                  }),
                  coach = new Coach;
            league.addHandlers(team);
            league.validateAsync(coach).then(results => {
                expect(results.valid).to.be.false;
                done();
            });
        });

        it("should be valid if no validators", done => {
            const coach = new Coach;
            league.validateAsync(coach).then(results => {
                expect(results.valid).to.be.true;
                done();
            });
        });

        it("should provide key errors", done => {
            const team  = new Team().extend({
                      name:     "Liverpool",
                      division: "U8"
                  }),
                  coach = new Coach().extend({firstName: "Jonathan"});
            league.addHandlers(team);
            league.validateAsync(coach).then(results => {
                expect(results.valid).to.be.false;
                expect(results.license.errors.license).to.eql([{
                    message: "License must be D, E or F"
                }]);
                done();
            });
        });

        it("should validateThat instance", done => {
            const team   = new Team().extend({
                      name:     "Liverpool",
                      division: "U8"
                  }),
                  coach  = new Coach().extend({
                      firstName: "John",
                      lastName: "Smith"
                  });
            league.addHandlers(team);
            league.validateAsync(coach).then(results => {
                expect(results.valid).to.be.false;
                expect(results.errors.coachPassedBackgroundCheck).to.eql([{
                    message: "Coach failed background check"
                }]);
                done();
            });
        });
    });
});

describe("@validateThat", () => {
    it("should extend validatorThat methods on instances", () => {
        const team   = new Team().extend({
                  name:     "Liverpool",
                  division: "U9"
              }),
              league = new Context().addHandlers(team);
        team.extend({
            @validateThat
            teamHasAtLeastSevenPlayerWhenU9(validation) {
                if (this.division === "U9" && this.players.length < 7) {
                    validation.results.addKey('players')
                        .addError('teamHasAtLeastSevenPlayerWhenU9', { 
                            message: this.name + ' must have at lease 7 players for division ' + this.division
                        });
                }
            }
        });
        const results = league.validate(team);
        expect(results.valid).to.be.false;
        expect(results.players.errors.teamHasAtLeastSevenPlayerWhenU9).to.eql([{
            message: "Liverpool must have at lease 7 players for division U9"
        }]);
    });
});

class CreateTeam extends Base {
    team;

    @validateThat
    validTeam(validation, composer) {
        const results = validation.results;
        if (this.team == null) {
            results.addKey('team')
                .addError('required', { message: 'Team is required' });
        } else {
            composer.validate(this.team, null, validation.results.addKey('team'));
        }
    }
}

class UpdateTeam extends Base {
    team;

    @validateThat
    validTeam(validation, composer) {
        const results = validation.results;
        if (this.team == null) {
            results.addKey('team')
                .addError('required', { message: 'Team is required' });
        } else if (this.team.id == null) {
            results.addKey('team').addKey('id')
                .addError('required', { message: 'Team Id is required' });
        } else {
            composer.validate(this.team, null, validation.results.addKey('team'));
        }
    }
}

let teamId = 0;

@provides()
class TeamHandler extends Handler {
    @handles(CreateTeam)
    create(create) {
        const { team } = create;
        team.id = ++teamId;
        return team;
    }

    @handles(UpdateTeam)
    @validate({ validateAsync: true })
    update(create) {
        const { team } = create;
        return team;
    } 
}

describe("ValidationFilter", () => {
    describe("#sync", () => {
        let context;
        beforeEach(() => {
            teamId = 0;
            handles.policy.removeAllFilters();
            handles.policy.addFilters(new ValidateProvider());

            context = new Context().addHandlers(
                new InferenceHandler(TeamHandler, ValidateFilter));
        });

        it("should validate valid requests", () => {
            const team = new Team().extend({
                name:     "Liverpool",
                division: "U8"
            });
            const created = context.command(new CreateTeam().extend({ team }));
            expect(created.id).to.equal(1);
            expect(created).to.equal(team);
        });

        it("should validate invalid requests", () => {
            const team = new Team().extend({
                name:     "Liverpool",
                division: "U9"
            });
            try {
                context.command(new CreateTeam().extend({ team }));
                expect.fail("Expected a ValidationError");
            } catch (err) {
                expect(err).to.be.instanceOf(ValidationError);
                const results = err.results;
                expect(results.valid).to.be.false;
                expect(results.team.division.errors.teamHasDivision).to.eql([{
                    message: "Liverpool does not have division U9"
                }]);
            }
        });

        it("should validate invalid requests with async override", async () => {
            const team = new Team().extend({
                name:     "Liverpool",
                division: "U9"
            });
            try {
                await context.command(new UpdateTeam().extend({ team }));
                expect.fail("Expected a ValidationError");
            } catch (err) {
                expect(err).to.be.instanceOf(ValidationError);
                const results = err.results;
                expect(results.valid).to.be.false;
                expect(results.team.id.errors.required).to.eql([{
                    message: "Team Id is required"
                }]);
            }
        });
    });

    describe("#async", () => {
        let context;
        beforeEach(() => {
            teamId = 0;
            handles.policy.removeAllFilters();
            handles.policy.addFilters(new ValidateProvider({validateAsync: true}));

            context = new Context().addHandlers(
                new InferenceHandler(TeamHandler, ValidateFilter));
        });

        it("should validate valid requests", async () => {
            const team = new Team().extend({
                name:     "Liverpool",
                division: "U8"
            });
            const created = await context.command(new CreateTeam().extend({ team }));
            expect(created.id).to.equal(1);
            expect(created).to.equal(team);
        });

        it("should validate invalid requests", async () => {
            const team = new Team().extend({
                name:     "Liverpool",
                division: "U9"
            });
            try {
                await context.command(new CreateTeam().extend({ team }));
                expect.fail("Expected a ValidationError");
            } catch (err) {
                expect(err).to.be.instanceOf(ValidationError);
                const results = err.results;
                expect(results.valid).to.be.false;
                expect(results.team.division.errors.teamHasDivision).to.eql([{
                    message: "Liverpool does not have division U9"
                }]);
            }
        });
    });
});

