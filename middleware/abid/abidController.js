'use strict';

var fs = require('fs');
var querystring = require('querystring');

module.exports = function (app, auth, database, passport) {

	var calculator = require('./abidCalculator.js');

	var session;
	var abidUrl = app.nconf.get('reports:abidUrl');
	var outputDirectory = app.nconf.get('reports:outputDirectory');

	function createPhantomSession(switches, callback) {
		if (session) {
			return callback(null, session);
		} else {
			require('phantom').create(switches[0], switches[1], switches[2], function (_session) {
				session = _session;
				return callback(null, session);
			}, {
				dnodeOpts: {
					weak: false
				}
			});
		}
	}

	process.on('exit', function (code, signal) {
		if (session) {
			session.exit(0);
		}
	});

	function renderPdf(session, options, callback) {

		var page = null;

		try {
			session.createPage(function (_page) {
				page = _page;
				_page.set('viewportSize', options.viewportSize, function (result) {
					_page.set('paperSize', options.paperSize, function (result) {
						_page.open(options.url, function (status) {
							if (status === 'success') {
								setTimeout(function () {
									var filename = options.outputDirectory + options.fileName;
									_page.render(filename, function () {
										_page.close();
										_page = null;
										callback(null, filename);
									});

								}, options.timeout);

							} else {
								_page.close();
								_page = null;
								callback('phantom.open: ' + status);
							}
						});
					});
				});
			});
		} catch (e) {
			try {
				if (page !== null) {
					page.close();
				}
			} catch (innerException) {
				e.innerException = innerException;
			}
			return callback('phantom exception: ' + JSON.stringify(e));
		}
	}

	return {

		baseline: function (req, res, next) {
			var worksheet = calculator.mapWorksheet(req.params);
			var baseline = calculator.baseline(worksheet.currentAge, worksheet.retirementAge, worksheet.numberOfPeriods, worksheet.initialDeposit, worksheet.rateOfReturn, worksheet.managementFee, worksheet.initialWithdrawal, worksheet.inflationRate);
			res.json(baseline);
			return next();
		},

		breakEvenAnalysis: function (req, res, next) {
			var worksheet = calculator.mapWorksheet(req.params);
			var breakEvenAnalysis = calculator.breakEvenAnalysis(worksheet.currentAge, worksheet.retirementAge, worksheet.numberOfPeriods, worksheet.initialDeposit, worksheet.rateOfReturn, worksheet.managementFee, worksheet.insuranceProductIncome, worksheet.initialWithdrawal, worksheet.inflationRate);
			res.json(breakEvenAnalysis);
			return next();
		},

		pdf: function (req, res, next) {
			var rawQueryString = querystring.stringify(req.query);
			var reportFileName = 'abid.pdf';
			var reportUrl = abidUrl + rawQueryString;
			var phantomOptions = ['--ignore-ssl-errors=yes', '--ssl-protocol=any', '--web-security=no'];
			var reportOptions = {
				viewportSize: {
					width: 1575,
					height: 1650
				},
				paperSize: {
					format: 'A4',
					orientation: 'portrait',
					border: '1in'
				},
				url: reportUrl,
				fileName: reportFileName,
				outputDirectory: outputDirectory,
				timeout: 2000
			};

			createPhantomSession(phantomOptions, function (error, _session) {
				if (error) {
					res.send(500, error);
				}

				renderPdf(_session, reportOptions, function (error, filename) {
					if (error) {
						res.send(500, error);
					}

					if (!filename) {
						res.send(404);
					}

					res.header('Content-disposition', 'inline; filename=' + filename);
					res.header('Content-type', 'application/pdf');
					fs.createReadStream(filename).pipe(res);
				});
			});
		}

	};

};
