'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var StripeCustomer = mongoose.model('StripeCustomer');

module.exports = function (app, auth, database, passport) {

	var publishableKey = app.nconf.get('stripe:publishableKey');
	var stripeClient = require('stripe')(app.nconf.get('stripe:secretKey'));

	app.get({
		'name': 'stripe_getSettings',
		'path': '/api/stripe/settings',
		'version': '1.0.0'
	}, auth.requiresLogin, function (req, res, next) {
		var settings = {
			"publishableKey": publishableKey
		};
		res.json(settings);
		return next();
	});

	app.get({
		'name': 'stripe_getCustomer',
		'path': '/api/stripe/customer',
		'version': '1.0.0'
	}, auth.requiresLogin, function (req, res, next) {

		StripeCustomer.findByUserId(req.user._id, function (error, stripeCustomer) {
			if (error) {
				res.send(500, error);
				return next();
			}

			if (!stripeCustomer) {
				res.send(204);
				return next();
			}

			res.json(stripeCustomer);
			return next();
		});
	});

	app.post({
		'name': 'stripe_addCustomer',
		'path': '/api/stripe/customer',
		'version': '1.0.0'
	}, auth.requiresLogin, function (req, res, next) {

		User.findOne({
			_id: req.user._id
		}, function (error, user) {
			if (error || !user) {
				res.send(500, error);
				return next();
			}

			var cardHandler = function (error, customer) {
				console.log('stripeClient.customers.create: ' + JSON.stringify(customer));
				if (error) {
					res.send(500, error);
					return next();
				}

				var card = customer.sources.data[0];
				var stripeCustomerData = {
					_user: user._id,
					customerId: customer.id,
					last4: card.last4
				};
				var stripeCustomer = new StripeCustomer(stripeCustomerData);

				stripeCustomer.save(function (error) {
					if (error) {
						res.send(500, error);
						return next();
					}
					res.send(200, stripeCustomer);
					return next();
				});
			};

			var tokenId = req.body.token.id;
			var email = user.email;

			stripeClient.customers.create({
				email: email,
				source: tokenId
			}, cardHandler);
		});

	});

	app.del({
		'name': 'stripe_deleteCustomer',
		'path': '/api/stripe/customer',
		'version': '1.0.0'
	}, auth.requiresLogin, function (req, res, next) {
		var _id = req.user._id;

		StripeCustomer.findByUserId(_id, function (error, stripeCustomer) {
			if (error) {
				res.send(500, error);
				return next();
			}
			if (!stripeCustomer) {
				res.send(404);
				return next();
			}

			var customerHandler = function (error, customer) {
				if (error) {
					res.send(500, error);
					return next();
				}

				stripeCustomer.remove(function (error) {
					if (error) {
						res.send(500, error);
						return next();
					}

					res.send(200);
					return next();
				});
			};

			stripeClient.customers.del(
				stripeCustomer.customerId,
				customerHandler
			);
		});

	});

	app.post({
		'name': 'stripe_addSubscription',
		'path': '/api/stripe/subscription',
		'version': '1.0.0'
	}, auth.requiresLogin, function (req, res, next) {
		var planId = req.body.planId;
		var _id = req.user._id;

		StripeCustomer.findByUserId(_id, function (error, stripeCustomer) {
			if (error) {
				res.send(500, error);
				return next();
			}
			if (!stripeCustomer) {
				res.send(404);
				return next();
			}

			var subscriptionHandler = function (error, subscription) {
				console.log('stripeClient.customers.createSubscription: ' + JSON.stringify(subscription));
				if (error) {
					res.send(500, error);
					return next();
				}

				stripeCustomer.plan = planId;
				stripeCustomer.subscriptionId = subscription.id;
				stripeCustomer.save(function (error) {
					if (error) {
						res.send(500, error);
						return next();
					}

					res.send(200, stripeCustomer);
					return next();
				});
			};

			stripeClient.customers.createSubscription(
				stripeCustomer.customerId,
				{
					plan: planId
				},
				subscriptionHandler
			);
		});

	});

};
