'use strict';

module.exports = function (app, auth, database, passport) {

	var controller = require('./abidController')(app, auth, database, passport);

	app.get({
		'name': 'abid_baseline',
		'path': '/api/abid/baseline',
		'version': '1.0.0'
	}, controller.baseline);


	app.get({
		'name': 'abid_breakEvenAnalysis',
		'path': '/api/abid/breakEvenAnalysis',
		'version': '1.0.0'
	}, controller.breakEvenAnalysis);

	app.get({
		'name': 'abid_pdf',
		'path': '/api/abid/pdf',
		'version': '1.0.0'
	}, auth.requiresLogin, controller.pdf);
};
