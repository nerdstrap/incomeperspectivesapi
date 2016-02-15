'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GitHubStrategy = require('passport-github').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LinkedinStrategy = require('passport-linkedin').Strategy;

module.exports = function (passport, strategies) {

	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function (id, done) {
		User.findOne({
			_id: id
		}, '-salt -hashed_password', function (err, user) {
			done(err, user);
		});
	});

	passport.use(new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password'
		},
		function (email, password, done) {
			User.findOne({
				email: email
			}, function (err, user) {
				if (err) {
					return done(err);
				}
				if (!user) {
					return done(null, false, {
						message: 'Unknown user.'
					});
				}
				if (!user.authenticate(password)) {
					return done(null, false, {
						message: 'Invalid password.'
					});
				}
				return done(null, user);
			});
		}
	));

	passport.use(new TwitterStrategy({
			consumerKey: strategies.twitter.clientID,
			consumerSecret: strategies.twitter.clientSecret,
			callbackURL: strategies.twitter.callbackURL
		},
		function (token, tokenSecret, profile, done) {
			User.findOne({
				'twitter.id_str': profile.id
			}, function (err, user) {
				if (err) {
					return done(err);
				}
				if (user) {
					return done(err, user);
				}
				user = new User({
					name: profile.displayName,
					username: profile.username,
					provider: 'twitter',
					twitter: profile._json,
					roles: ['authenticated']
				});
				user.save(function (err) {
					if (err) {
						console.log(err);
						return done(null, false, {message: 'twitter login failed: e-mail is already in use.'});
					} else {
						return done(err, user);
					}
				});
			});
		}
	));

	passport.use(new FacebookStrategy({
			clientID: strategies.facebook.clientID,
			clientSecret: strategies.facebook.clientSecret,
			callbackURL: strategies.facebook.callbackURL
		},
		function (accessToken, refreshToken, profile, done) {
			User.findOne({
				'facebook.id': profile.id
			}, function (err, user) {
				if (err) {
					return done(err);
				}
				if (user) {
					return done(err, user);
				}
				user = new User({
					name: profile.displayName,
					email: profile.emails[0].value,
					username: profile.username || profile.emails[0].value.split('@')[0],
					provider: 'facebook',
					facebook: profile._json,
					roles: ['authenticated']
				});
				user.save(function (err) {
					if (err) {
						console.log(err);
						return done(null, false, {message: 'facebook login failed: e-mail is already in use.'});
					} else {
						return done(err, user);
					}
				});
			});
		}
	));

	passport.use(new GitHubStrategy({
			clientID: strategies.github.clientID,
			clientSecret: strategies.github.clientSecret,
			callbackURL: strategies.github.callbackURL
		},
		function (accessToken, refreshToken, profile, done) {
			User.findOne({
				'github.id': profile.id
			}, function (err, user) {
				if (user) {
					return done(err, user);
				}
				user = new User({
					name: profile._json.displayName || profile._json.login,
					username: profile._json.login,
					email: profile.emails[0].value,
					provider: 'github',
					github: profile._json,
					roles: ['authenticated']
				});
				user.save(function (err) {
					if (err) {
						console.log(err);
						return done(null, false, {message: 'github login failed: e-mail is already in use.'});
					} else {
						return done(err, user);
					}
				});
			});
		}
	));

	passport.use(new GoogleStrategy({
			clientID: strategies.google.clientID,
			clientSecret: strategies.google.clientSecret,
			callbackURL: strategies.google.callbackURL
		},
		function (accessToken, refreshToken, profile, done) {
			User.findOne({
				'google.id': profile.id
			}, function (err, user) {
				if (user) {
					return done(err, user);
				}
				user = new User({
					name: profile.displayName,
					email: profile.emails[0].value,
					username: profile.emails[0].value,
					provider: 'google',
					google: profile._json,
					roles: ['authenticated']
				});
				user.save(function (err) {
					if (err) {
						console.log(err);
						return done(null, false, {message: 'google login failed: e-mail is already in use.'});
					} else {
						return done(err, user);
					}
				});
			});
		}
	));

	passport.use(new LinkedinStrategy({
			consumerKey: strategies.linkedin.clientID,
			consumerSecret: strategies.linkedin.clientSecret,
			callbackURL: strategies.linkedin.callbackURL,
			profileFields: ['id', 'first-name', 'last-name', 'email-address']
		},
		function (accessToken, refreshToken, profile, done) {
			User.findOne({
				'linkedin.id': profile.id
			}, function (err, user) {
				if (user) {
					return done(err, user);
				}
				user = new User({
					name: profile.displayName,
					email: profile.emails[0].value,
					username: profile.emails[0].value,
					provider: 'linkedin',
					linkedin: profile._json,
					roles: ['authenticated']
				});
				user.save(function (err) {
					if (err) {
						console.log(err);
						return done(null, false, {message: 'linkedin login failed: e-mail is already in use.'});
					} else {
						return done(err, user);
					}
				});
			});
		}
	));
	return passport;
};
