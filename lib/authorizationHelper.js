'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var _ = require('lodash');

var findUser = exports.findUser = function (id, callback) {
	User.findOne({
		_id: id
	}, function (err, user) {
		if (err || !user) {
			return callback(null);
		}
		callback(user);
	});
};

exports.requiresLogin = function (req, res, next) {
	if (!req.isAuthenticated()) {
		return res.status(401);
	}
	findUser(req.user._id, function (user) {
		if (!user) {
			return res.status(401);
		}
		req.user = user;
		next();
	});
};

exports.requiresAdmin = function (req, res, next) {
	if (!req.isAuthenticated()) {
		return res.status(401);
	}
	findUser(req.user._id, function (user) {
		if (!user) {
			return res.status(401);
		}

		if (req.user.roles.indexOf('admin') === -1) {
			return res.status(401);
		}
		req.user = user;
		next();
	});
};
