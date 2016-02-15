'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var crypto = require('crypto');
var _ = require('lodash');

var validatePresenceOf = function (value) {
	return (this.provider && this.provider !== 'local') || (value && value.length);
};

var validateUniqueEmail = function (value, callback) {
	var User = mongoose.model('User');
	User.find({
		$and: [{
			email: value
		}, {
			_id: {
				$ne: this._id
			}
		}]
	}, function (err, user) {
		callback(err || user.length === 0);
	});
};

var escapeProperty = function (value) {
	return _.escape(value);
};

var UserSchema = new Schema({
	name: {
		type: String,
		required: true,
		get: escapeProperty
	},
	email: {
		type: String,
		required: true,
		unique: true,
		match: [/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'Please enter a valid email'],
		validate: [validateUniqueEmail, 'e-mail must be unique.']
	},
	username: {
		type: String,
		unique: true,
		required: true,
		get: escapeProperty
	},
	roles: {
		type: Array,
		default: ['authenticated', 'anonymous']
	},
	hashed_password: {
		type: String,
		validate: [validatePresenceOf, 'password is required.']
	},
	provider: {
		type: String,
		default: 'local'
	},
	salt: String,
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	profile: {},
	facebook: {},
	twitter: {},
	github: {},
	google: {},
	linkedin: {}
});

UserSchema.virtual('password').set(function (password) {
	this._password = password;
	this.salt = this.makeSalt();
	this.hashed_password = this.hashPassword(password);
}).get(function () {
	return this._password;
});

UserSchema.pre('save', function (next) {
	if (this.isNew && this.provider === 'local' && this.password && !this.password.length) {
		return next(new Error('password is required.'));
	}
	next();
});

UserSchema.methods = {

	hasRole: function (role) {
		var roles = this.roles;
		return roles.indexOf('admin') !== -1 || roles.indexOf(role) !== -1;
	},

	authenticate: function (plainText) {
		return this.hashPassword(plainText) === this.hashed_password;
	},

	makeSalt: function () {
		return crypto.randomBytes(16).toString('base64');
	},

	hashPassword: function (password) {
		if (!password || !this.salt) {
			return '';
		}
		var salt = new Buffer(this.salt, 'base64');
		return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
	},

	toJSON: function () {
		var obj = this.toObject();
		delete obj.hashed_password;
		delete obj.salt;
		return obj;
	}

};

module.exports = mongoose.model('User', UserSchema);
