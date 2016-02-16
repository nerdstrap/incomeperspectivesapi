'use strict';

if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}

var path = require('path');
var nconf = require('nconf');
var bunyan = require('bunyan');
var restify = require('restify');
var jwtRestify = require('restify-jwt');
var cookieParser = require('restify-cookies');
var restifyValidator = require('restify-validator');
var mongoose = require('mongoose');
var passport = require('passport');

nconf.argv().env();
nconf.file({file: path.join(__dirname, 'config', 'global.' + process.env.NODE_ENV + '.json')});

var loggerStreams = [];
loggerStreams.push({
	stream: process.stderr,
	level: "error",
	name: "error"
});
loggerStreams.push({
	stream: process.stdout,
	level: "warn",
	name: "console"
});
if (nconf.get('logging:dir')) {
	loggerStreams.push({
		level: "debug",
		"name": "debug",
		path: path.join(nconf.get('logging:dir'), process.env.NODE_ENV + '-' + nconf.get('server:name') + '.log')
	});
}
loggerStreams.push({
	stream: process.stderr,
	level: "error",
	name: "error"
});
var logger = bunyan.createLogger({
	name: nconf.get('logging:name'),
	streams: loggerStreams
});

var connectionString = nconf.get("data:defaultConnection:server");
var database = mongoose.connect(connectionString);
var User = require('./models/userModel');
var StripeCustomer = require('./models/stripeCustomerModel');

var server = restify.createServer({
	name: nconf.get('server:name'),
	version: nconf.get('server:defaultVersion'),
	acceptable: nconf.get('server:acceptable'),
	log: logger
});
server.nconf = nconf;

server.pre(restify.pre.pause());
server.pre(restify.pre.sanitizePath());
server.pre(restify.pre.userAgentConnection());

server.use(function (req, res, next) {
	res.setHeader('X-Powered-By', 'Income Perspectives');
	next();
});

server.use(restifyValidator);
server.use(cookieParser.parse);
server.use(restify.requestLogger());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.gzipResponse());
server.use(restify.bodyParser());
server.use(jwtRestify({
		secret: nconf.get('jwt:secret'),
		credentialsRequired: nconf.get('jwt:credentialsRequired')
	}), function (req, res, next) {
		if (req.user) {
			req.user = JSON.parse(decodeURI(req.user));
		}
		next();
	}
);

server.use(passport.initialize());
server.use(passport.session());
require(path.join(__dirname, 'lib', 'passportHelper.js'))(passport, nconf.get('strategies'));

var throttleOptions = {
	burst: nconf.get('server:throttleBurst'),
	rate: nconf.get('server:throttleRate'),
	ip: true
};
server.use(restify.throttle(throttleOptions));

var auth = require(path.join(__dirname, 'lib', 'authorizationHelper.js'));

var configureCors = nconf.get('cors');
if (configureCors) {
	var corsOptions = {
		origins: nconf.get('cors:origins'),
		credentials: nconf.get('cors:credentials'),
		headers: nconf.get('cors:headers')
	};

	server.pre(restify.CORS(corsOptions));

	if (corsOptions.headers.length) {
		server.on('MethodNotAllowed', require(path.join(__dirname, 'lib', 'corsHelper.js'))(corsOptions));
	}
}

server.on('after', restify.auditLogger({
	log: logger
}));

server.on('uncaughtException', function (req, res, route, err) {
	console.log(err);
	res.send(500);
});

var authRoutes = require('./middleware/auth/authRoutes')(server, auth, database, passport);
var helloRoutes = require('./middleware/hello/helloRoutes')(server, auth, database, passport);
var abidRoutes = require('./middleware/abid/abidRoutes')(server, auth, database, passport);
var ibidRoutes = require('./middleware/ibid/ibidRoutes')(server, auth, database, passport);
var stripeRoutes = require('./middleware/stripe/stripeRoutes')(server, auth, database, passport);

var port = process.env.PORT || nconf.get('server:port');
server.listen(port, function (done) {
	console.log('%s listening at %s', nconf.get('server:name'), server.url);
});
