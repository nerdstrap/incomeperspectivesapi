'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var StripeCustomer = mongoose.model('StripeCustomer');

module.exports = function (app, auth, database, passport) {

	var  stripeClient = require('stripe')(app.nconf.get('stripe:secretKey'));

	app.get('/api/stripe/customer', auth.requiresLogin, function (req, res, next) {

		StripeCustomer.findByUserId(req.user._id, function (error, stripeCustomer) {
			if (error) {
				return res.send(500, error);
			}

			if (!stripeCustomer) {
				return res.send(204);
			}

			return res.json(stripeCustomer);
		});
	});

	app.post('/api/stripe/customer', auth.requiresLogin, function (req, res, next) {

		User.findOne({
			_id: req.user._id
		}, function (error, user) {
			if (error || !user) {
				return res.send(500, error);
			}

			var cardHandler = function (error, customer) {
				console.log('stripeClient.customers.create: ' + JSON.stringify(customer));
				if (error) {
					return res.send(500, error);
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
						return res.send(500, error);
					}
					return res.json(200, stripeCustomer);
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

	app.del('/api/stripe/customer', auth.requiresLogin, function (req, res, next) {
		var _id = req.user._id;

		StripeCustomer.findByUserId(_id, function (error, stripeCustomer) {
			if (error) {
				return res.send(500, error);
			}
			if (!stripeCustomer) {
				return res.send(404);
			}

			var customerHandler = function (error, customer) {
				if (error) {
					return res.send(500, error);
				}

				stripeCustomer.remove(function (error) {
					if (error) {
						return res.send(500, error);
					}

					return res.json(200);
				});
			};

			stripeClient.customers.del(
				stripeCustomer.customerId,
				customerHandler
			);
		});

	});

	app.post('/api/stripe/subscription', auth.requiresLogin, function (req, res, next) {
		var planId = req.body.planId;
		var _id = req.user._id;

		StripeCustomer.findByUserId(_id, function (error, stripeCustomer) {
			if (error) {
				return res.send(500, error);
			}
			if (!stripeCustomer) {
				return res.send(404);
			}

			var subscriptionHandler = function (error, subscription) {
				console.log('stripeClient.customers.createSubscription: ' + JSON.stringify(subscription));
				if (error) {
					return res.send(500, error);
				}

				stripeCustomer.plan = planId;
				stripeCustomer.subscriptionId = subscription.id;
				stripeCustomer.save(function (error) {
					if (error) {
						return res.send(500, error);
					}

					return res.json(200, stripeCustomer);
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
