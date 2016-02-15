'use strict';

module.exports = function (app, auth, database, passport) {

	return {
		hello: function (req, res, next) {
			res.send('hello ' + req.params.name);
			return next();
		}
	};

};
