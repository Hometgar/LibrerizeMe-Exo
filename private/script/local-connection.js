let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let bcrypt = require('bcrypt');

module.exports = (passport, userModel)=>{
	passport.use('local',
		new LocalStrategy({
			usernameField: 'pseudo',
			passwordField: 'password'
		},
		function(pseudo, password, done) {
			userModel.findOne({pseudo : pseudo }, function (err, user) {
				if (err) { return done(err); }
				if (!user) {
					return done(null, false, {
						status: 403,
						error: true,
						errorInfos: "INVALID CREDENTIALS"
					});
				}
				bcrypt.compare(password, user.password,(err, correct)=>{
				    if (!correct){
					    return done(null, false, {
						    status: 403,
						    error: true,
						    errorInfos: "INVALID CREDENTIALS"
					    });
				    }

					return done(null, user);
				});
			});
		}
	));
};