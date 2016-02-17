'use strict';

module.exports = function (app, auth, database, passport) {

	var controller = require('./authController')(app, auth, database, passport);
	var strategies = app.nconf.get('strategies');

	app.get({
		'name': 'logout',
		'path': '/logout',
		'version': '1.0.0'
	}, controller.logout);

	app.get({
		'name': 'loggedIn',
		'path': '/loggedIn',
		'version': '1.0.0'
	}, controller.loggedIn);

	app.get({
		'name': 'me',
		'path': '/me',
		'version': '1.0.0'
	}, controller.me);

	if (strategies.local.enabled) {
		app.post({
			'name': 'register',
			'path': '/register',
			'version': '1.0.0'
		}, controller.register);

		app.post({
			'name': 'forgotPassword',
			'path': '/forgotPassword',
			'version': '1.0.0'
		}, controller.forgotPassword);

		app.post({
			'name': 'resetPassword',
			'path': '/resetPassword/:token',
			'version': '1.0.0'
		}, controller.resetPassword);

		app.post({
			'name': 'login',
			'path': '/login',
			'version': '1.0.0'
		}, passport.authenticate('local', {failureFlash: false}), controller.login);

	}
};
