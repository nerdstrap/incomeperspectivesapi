'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var crypto = require('crypto');
var async = require('async');
var _ = require('lodash');
var jwt = require('jsonwebtoken');
var nodemailer = require('nodemailer');
var emailTemplates = require('../../lib/emailTemplates');

function sendMail(mailOptions) {
	var transport = nodemailer.createTransport(config.mailer);
	transport.sendMail(mailOptions, function (err, response) {
		if (err) {
			return err;
		}
		return response;
	});
}

module.exports = function (app, auth, database, passport) {
	var jwtSecret = app.nconf.get('jwt:secret');
	var strategies = app.nconf.get('strategies');
	var fromAddress = app.nconf.get('emailServer:fromAddress');

	return {
		oAuthCallback: function (req, res) {
			var payload = req.user;
			var escaped = JSON.stringify(payload);
			escaped = encodeURI(escaped);
			var token = jwt.sign(escaped, jwtSecret, {expiresIn: 86400});
			res.cookie('token', token);
			var destination = strategies.landingPage;
			if (!req.cookies.redirect) {
				res.cookie('redirect', destination);
			}
			res.redirect(destination);
		},

		signIn: function (req, res) {
			if (req.isAuthenticated()) {
				return res.send(401);
			}
			res.send('200');
		},

		session: function (req, res) {
			res.redirect('/');
		},

		loggedIn: function (req, res) {
			if (!req.isAuthenticated()) {
				return res.send('0');
			}
			auth.findUser(req.user._id, function (user) {
				res.send(user ? user : '0');
			});
		},

		login: function (req, res, next) {
			var payload = req.user;
			payload.redirect = req.body.redirect;
			var escaped = JSON.stringify(payload);
			escaped = encodeURI(escaped);
			var token = jwt.sign(escaped, jwtSecret, {expiresIn: 86400});
			res.json({
				token: token,
				redirect: strategies.landingPage
			});
		},

		logout: function (req, res) {
			req.logout();
			res.send('200');
		},

		register: function (req, res, next) {
			var user = new User(req.body);

			user.provider = 'local';

			req.assert('name', 'Name is required.').notEmpty();
			req.assert('email', 'A valid e-mail is required.').isEmail();
			req.assert('password', 'Password is required and must be 8-20 characters in length.').len(8, 20);
			req.assert('username', 'Username is required and must be 1-20 characters in length.').len(1, 20);
			req.assert('confirmPassword', 'Password and Confirm Password must match.').equals(req.body.password);
			var errors = req.validationErrors();
			if (errors) {
				return res.status(400).send(errors);
			}

			user.roles = ['authenticated'];
			user.save(function (err) {
				if (err) {
					switch (err.code) {
						case 11000:
						case 11001:
						{
							res.status(400).json([{
								msg: 'Username already taken.',
								param: 'username'
							}]);
							break;
						}
						default:
						{
							var modelErrors = [];
							if (err.errors) {
								for (var x in err.errors) {
									if (err.errors.hasOwnProperty(x)) {
										modelErrors.push({
											param: x,
											msg: err.errors[x].message,
											value: err.errors[x].value
										});
									}
								}
								res.status(400).json(modelErrors);
							}
						}
					}
					return res.status(400);
				}

				var payload = user;
				payload.redirect = req.body.redirect;
				var escaped = JSON.stringify(payload);
				escaped = encodeURI(escaped);
				req.logIn(user, function (err) {
					if (err) {
						return next(err);
					}

					var token = jwt.sign(escaped, jwtSecret, {expiresIn: 86400});
					res.json({
						token: token,
						redirect: strategies.landingPage
					});
				});
				res.status(200);
			});
		},

		me: function (req, res) {
			if (!req.user || !req.user.hasOwnProperty('_id')) {
				return res.send(304);
			}

			User.findOne({
				_id: req.user._id
			}).exec(function (err, user) {

				if (err || !user) {
					return res.send(null);
				}

				var dbUser = user.toJSON();
				var id = req.user._id;

				delete dbUser._id;
				delete req.user._id;

				var eq = _.isEqual(dbUser, req.user);
				if (eq) {
					req.user._id = id;
					return res.json(req.user);
				}

				var payload = user;
				var escaped = JSON.stringify(payload);
				escaped = encodeURI(escaped);
				var token = jwt.sign(escaped, jwtSecret, {expiresIn: 86400});
				res.json({token: token});

			});
		},

		user: function (req, res, next, id) {
			User.findOne({
				_id: id
			}).exec(function (err, user) {
				if (err) {
					return next(err);
				}
				if (!user) {
					return next(new Error('Failed to load User {id: ' + id + '}'));
				}
				req.profile = user;
				next();
			});
		},

		resetPassword: function (req, res, next) {
			User.findOne({
				resetPasswordToken: req.params.token,
				resetPasswordExpires: {
					$gt: Date.now()
				}
			}, function (err, user) {
				if (err) {
					return res.status(400).json({
						msg: err
					});
				}
				if (!user) {
					return res.status(400).json({
						msg: 'Token invalid or expired.'
					});
				}
				req.assert('password', 'Password is required and must be 8-20 characters in length.').len(8, 20);
				req.assert('confirmPassword', 'Password and Confirm Password must match.').equals(req.body.password);
				var errors = req.validationErrors();
				if (errors) {
					return res.status(400).send(errors);
				}
				user.password = req.body.password;
				user.resetPasswordToken = undefined;
				user.resetPasswordExpires = undefined;
				user.save(function (err) {
					req.logIn(user, function (err) {
						if (err) {
							return next(err);
						}
						return res.send({
							user: user
						});
					});
				});
			});
		},

		forgotPassword: function (req, res, next) {
			async.waterfall([
					function (done) {
						crypto.randomBytes(20, function (err, buf) {
							var token = buf.toString('hex');
							done(err, token);
						});
					},
					function (token, done) {
						User.findOne({
							$or: [{
								email: req.body.text
							}, {
								username: req.body.text
							}]
						}, function (err, user) {
							if (err || !user) {
								return done(true);
							}
							done(err, user, token);
						});
					},
					function (user, token, done) {
						user.resetPasswordToken = token;
						user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
						user.save(function (err) {
							done(err, token, user);
						});
					},
					function (token, user, done) {
						var mailOptions = {
							to: user.email,
							from: fromAddress
						};
						mailOptions = emailTemplates.forgotPasswordEmail(user, req, token, mailOptions);
						sendMail(mailOptions);
						done(null, user);
					}
				],
				function (err, user) {
					var response = {
						message: 'Mail successfully sent.',
						status: 'success'
					};
					if (err) {
						response.message = 'User does not exist.';
						response.status = 'danger';

					}
					res.json(response);
				});
		}
	}
};
