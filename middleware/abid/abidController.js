'use strict';

module.exports = function (app, auth, database, passport) {

	var calculator = require('./abidCalculator.js');

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
		}

	};

};
