'use strict';

var restify = require('restify');

var CORSHelper = function (options) {
	var allowedOrigins = options.origins || [];
	var allowedHeaders = restify.CORS.ALLOW_HEADERS.concat(options.headers || []);

	var unknownMethodHandler = function (req, res, error, next) {
		var origin = req.headers.origin;
		var originAllowed = false;

		if (req.method.toLowerCase() !== 'options') {
			res.send(new restify.MethodNotAllowedError());
			return next();
		}

		allowedOrigins.forEach(function (_origin) {
			if (origin.toLowerCase() === _origin.toLowerCase()) {
				originAllowed = true;
			}
		});

		if (!originAllowed) {
			res.header('Access-Control-Allow-Origin', '');
			res.send(new restify.MethodNotAllowedError());
			return next();
		}

		res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
		res.send(200);
		return next();
	};

	return unknownMethodHandler;
};

module.exports = CORSHelper;
