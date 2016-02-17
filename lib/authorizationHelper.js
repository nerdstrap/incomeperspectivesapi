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
		res.send(401);
		return next();
	}
	findUser(req.user._id, function (user) {
		if (!user) {
			res.send(401);
			return next();
		}
		req.user = user;
		next();
	});
};

exports.requiresAdmin = function (req, res, next) {
	if (!req.isAuthenticated()) {
		res.status(401);
		return next();
	}
	findUser(req.user._id, function (user) {
		if (!user) {
			res.send(401);
			return next();
		}

		if (req.user.roles.indexOf('admin') === -1) {
			res.send(401);
			return next();
		}
		req.user = user;
		next();
	});
};
