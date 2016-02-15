'use strict';

var restify = require('restify');

var CORSHelper = function (options) {
	var allowedOrigins = options.origins || [];
	var allowedHeaders = restify.CORS.ALLOW_HEADERS.concat(options.headers || []);

	var unknownMethodHandler = function (req, res) {
		var origin = req.headers.origin;
		var originAllowed = false;

		if (req.method.toLowerCase() !== 'options') {
			return res.send(new restify.MethodNotAllowedError());
		}

		allowedOrigins.forEach(function (_origin) {
			if (origin.toLowerCase() === _origin.toLowerCase()) {
				originAllowed = true;
			}
		});

		if (!originAllowed) {
			res.header('Access-Control-Allow-Origin', '');
			return res.send(new restify.MethodNotAllowedError());
		}

		res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));

		return res.send(200);
	};

	return unknownMethodHandler;
};

module.exports = CORSHelper;
