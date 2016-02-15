'use strict';

module.exports = function (app, auth, database, passport) {

	var controller = require('./helloController')(app, auth, database, passport);

	app.get({
		'name': 'hello',
		'path': '/hello/:name',
		'version': '1.0.0'
	}, controller.hello);
};
