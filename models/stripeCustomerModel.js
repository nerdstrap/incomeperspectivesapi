'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');

var stripeCustomerSchema = new mongoose.Schema({

	_user: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: true,
		unique: true
	},
	customerId: String,
	subscriptionId: String,
	last4: String,
	plan: String

});

stripeCustomerSchema.statics.findByUserId = function (userId, callback) {

	var query = this.findOne();

	User.findOne({_id: userId}, function (error, user) {

		var scope = this;
		var args = arguments;

		if (error || !user) {
			return process.nextTick(function () {
				callback.apply(scope, args);
			});
		}

		query.where('_user', user._id).exec(callback);
	});

	return query;
};

var StripeCustomer = mongoose.model('StripeCustomer', stripeCustomerSchema);
