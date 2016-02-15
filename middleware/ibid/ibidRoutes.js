'use strict';

module.exports = function (app, auth, database, passport) {

	var controller = require('./ibidController')(app, auth, database, passport);

	app.get({
		'name': 'ibid_baseline',
		'path': '/api/ibid/baseline',
		'version': '1.0.0'
	}, controller.baseline);


	app.get({
		'name': 'ibid_breakEvenAnalysis',
		'path': '/api/ibid/breakEvenAnalysis',
		'version': '1.0.0'
	}, controller.breakEvenAnalysis);
};
