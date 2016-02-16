'use strict';

var _ = require('lodash');

var getFutureValue = function (presentValue, rateOfReturn, numberOfPeriods) {
	return presentValue * Math.pow((1.0 + rateOfReturn), numberOfPeriods);
};

var getPresentValue = function (futureValue, rateOfReturn, numberOfPeriods) {
	return futureValue / Math.pow((1.0 + rateOfReturn), numberOfPeriods);
};

module.exports.mapWorksheet = function (source) {
	return {
		currentAge: parseInt(source.currentAge, 10),
		retirementAge: parseInt(source.retirementAge, 10),
		numberOfPeriods: parseInt(source.numberOfPeriods, 10),
		initialDeposit: parseFloat(source.initialDeposit),
		rateOfReturn: parseFloat(source.rateOfReturn),
		managementFee: parseFloat(source.managementFee),
		insuranceProductIncome: parseFloat(source.insuranceProductIncome),
		initialWithdrawal: parseFloat(source.initialWithdrawal),
		inflationRate: parseFloat(source.inflationRate),
		clientName: source.clientName,
		insuranceCompany: source.insuranceCompany
	};
};

module.exports.baseline = function (currentAge, retirementAge, numberOfPeriods, initialDeposit, rateOfReturn, managementFee, initialWithdrawal, inflationRate) {
	var yearsUntilRetirement = retirementAge - currentAge;
	var yearsCompounded = yearsUntilRetirement;
	var netRateOfReturn = rateOfReturn - managementFee;
	var annualRateOfReturn = 1.0 + rateOfReturn;
	var annualInflationRate = 1.0 + inflationRate;

	var accountValue = getFutureValue(initialDeposit, netRateOfReturn, yearsUntilRetirement);
	var annualWithdrawal = accountValue * initialWithdrawal;
	var accountValueAfterAnnualWithdrawal = accountValue - annualWithdrawal;
	var accountValueAtEndOfYear = accountValueAfterAnnualWithdrawal * annualRateOfReturn;
	var cumulativeInvestmentIncome = annualWithdrawal;
	var presentValueOfInvestmentIncome = getPresentValue(annualWithdrawal, rateOfReturn, yearsCompounded);
	var cumulativePresentValueOfInvestmentIncome = presentValueOfInvestmentIncome;

	var age = retirementAge;
	var index = -1;
	var payouts = new Array(numberOfPeriods);
	payouts[++index] = {
		age: age,
		cumulativeInvestmentIncome: Math.floor(cumulativeInvestmentIncome)
	};
	while (++index <= numberOfPeriods) {
		age = age + 1;
		yearsCompounded = yearsCompounded + 1;

		accountValue = accountValueAtEndOfYear;
		annualWithdrawal *= annualInflationRate;
		accountValueAfterAnnualWithdrawal = accountValue - annualWithdrawal;
		accountValueAtEndOfYear = accountValueAfterAnnualWithdrawal * annualRateOfReturn;
		cumulativeInvestmentIncome += annualWithdrawal;
		presentValueOfInvestmentIncome = getPresentValue(annualWithdrawal, rateOfReturn, yearsCompounded);
		cumulativePresentValueOfInvestmentIncome += presentValueOfInvestmentIncome;

		payouts[index] = {
			age: age,
			cumulativeInvestmentIncome: Math.floor(cumulativeInvestmentIncome)
		}
	}

	var grossRateOfReturn = Math.floor(rateOfReturn * 100);

	var firstPayout = _.first(payouts);

	var baselineSeriesData = {};
	baselineSeriesData.categories = _.map(payouts, 'age');
	baselineSeriesData.seriesA = _.map(payouts, 'cumulativeInvestmentIncome');

	return {
		grossRateOfReturn: grossRateOfReturn,
		firstPayout: firstPayout,
		baselineSeriesData: baselineSeriesData
	};
};

module.exports.breakEvenAnalysis = function (currentAge, retirementAge, numberOfPeriods, initialDeposit, rateOfReturn, managementFee, insuranceProductIncome, initialWithdrawal, inflationRate) {
	var yearsUntilRetirement = retirementAge - currentAge;
	var yearsCompounded = yearsUntilRetirement;
	var chunkSize = Math.floor(numberOfPeriods / 3);
	var netRateOfReturn = rateOfReturn - managementFee;
	var annualRateOfReturn = 1.0 + rateOfReturn;
	var annualInflationRate = 1.0 + inflationRate;

	var breakEvenAge = retirementAge;
	var breakEvenAgeSet = false;

	var accountValue = getFutureValue(initialDeposit, netRateOfReturn, yearsUntilRetirement);
	var annualWithdrawal = accountValue * initialWithdrawal;
	var accountValueAfterAnnualWithdrawal = accountValue - annualWithdrawal;
	var accountValueAtEndOfYear = accountValueAfterAnnualWithdrawal * annualRateOfReturn;
	var cumulativeInvestmentIncome = annualWithdrawal;
	var presentValueOfInsuranceProductIncome = getPresentValue(insuranceProductIncome, rateOfReturn, yearsCompounded);
	var cumulativePresentValueOfInsuranceProductIncome = presentValueOfInsuranceProductIncome;
	var cumulativeInsuranceProductIncome = insuranceProductIncome;
	var presentValueOfInvestmentIncome = getPresentValue(annualWithdrawal, rateOfReturn, yearsCompounded);
	var cumulativePresentValueOfInvestmentIncome = presentValueOfInvestmentIncome;
	var cumulativeIncomeDifferential = (cumulativeInsuranceProductIncome / cumulativeInvestmentIncome - 1) * 100;

	if (cumulativeInvestmentIncome > cumulativeInsuranceProductIncome) {
		breakEvenAgeSet = true;
	}

	var age = retirementAge;
	var index = 0;
	var payouts = new Array(numberOfPeriods);

	payouts[index] = {
		age: age,
		cumulativeInvestmentIncome: Math.floor(cumulativeInvestmentIncome),
		cumulativeInsuranceProductIncome: Math.floor(cumulativeInsuranceProductIncome),
		cumulativeIncomeDifferential: Math.floor(cumulativeIncomeDifferential)
	};

	while (++index < numberOfPeriods) {
		age += 1;
		yearsCompounded += 1;

		accountValue = accountValueAtEndOfYear;
		annualWithdrawal *= annualInflationRate;
		if (accountValue < annualWithdrawal) {
			annualWithdrawal = accountValue;
		}
		accountValueAfterAnnualWithdrawal = accountValue - annualWithdrawal;
		accountValueAtEndOfYear = accountValueAfterAnnualWithdrawal * annualRateOfReturn;
		cumulativeInvestmentIncome += annualWithdrawal;
		presentValueOfInsuranceProductIncome = getPresentValue(insuranceProductIncome, rateOfReturn, yearsCompounded);
		cumulativePresentValueOfInsuranceProductIncome += presentValueOfInsuranceProductIncome;
		cumulativeInsuranceProductIncome += insuranceProductIncome;
		presentValueOfInvestmentIncome = getPresentValue(annualWithdrawal, rateOfReturn, yearsCompounded);
		cumulativePresentValueOfInvestmentIncome += presentValueOfInvestmentIncome;
		cumulativeIncomeDifferential = (cumulativeInsuranceProductIncome / cumulativeInvestmentIncome - 1) * 100;

		payouts[index] = {
			age: age,
			cumulativeInvestmentIncome: Math.floor(cumulativeInvestmentIncome),
			cumulativeInsuranceProductIncome: Math.floor(cumulativeInsuranceProductIncome),
			cumulativeIncomeDifferential: Math.floor(cumulativeIncomeDifferential)
		};

		if (!breakEvenAgeSet && cumulativeInvestmentIncome > cumulativeInsuranceProductIncome) {
			breakEvenAge = age;
			breakEvenAgeSet = true;
		}
	}

	var grossRateOfReturn = Math.floor(rateOfReturn * 100);

	var firstPayout = _.first(payouts);

	var breakEvenSeriesData = {};
	breakEvenSeriesData.categories = _.map(payouts, 'age');
	breakEvenSeriesData.seriesA = _.map(payouts, 'cumulativeInvestmentIncome');
	breakEvenSeriesData.seriesB = _.map(payouts, 'cumulativeInsuranceProductIncome');
	breakEvenSeriesData.seriesC = _.map(payouts, 'cumulativeIncomeDifferential');

	var gogoPayouts = _.slice(payouts, 0, chunkSize);
	var slowgoPayouts = _.slice(payouts, chunkSize, chunkSize * 2);
	var nogoPayouts = _.slice(payouts, chunkSize * 2, payouts.length);

	var lastGogoPayout = _.last(gogoPayouts);
	var lastSlowgoPayout = _.last(slowgoPayouts);
	var lastNogoPayout = _.last(nogoPayouts);

	var periodicPayouts = [lastGogoPayout, lastSlowgoPayout, lastNogoPayout];

	var gogoCategoryLabel = 'Go-Go (through ' + gogoPayouts.length + ' years)|' + lastGogoPayout.cumulativeIncomeDifferential + '% Advantage';
	var slowgoCategoryLabel = 'Slow-Go (through ' + (gogoPayouts.length + slowgoPayouts.length) + ' years)|' + lastSlowgoPayout.cumulativeIncomeDifferential + '% Advantage';
	var nogoCategoryLabel = 'No-Go (through ' + payouts.length + ' years)|' + lastNogoPayout.cumulativeIncomeDifferential + '% Advantage';

	var periodicAnalysis = {};
	periodicAnalysis.categories = [gogoCategoryLabel, slowgoCategoryLabel, nogoCategoryLabel];
	periodicAnalysis.seriesA = _.map(periodicPayouts, 'cumulativeInvestmentIncome');
	periodicAnalysis.seriesB = _.map(periodicPayouts, 'cumulativeInsuranceProductIncome');
	periodicAnalysis.seriesC = _.map(periodicPayouts, 'cumulativeIncomeDifferential');

	var response = {
		grossRateOfReturn: grossRateOfReturn,
		firstPayout: firstPayout,
		breakEvenSeriesData: breakEvenSeriesData,
		firstPeriodicPayout: lastGogoPayout,
		periodicSeriesData: periodicAnalysis,
		gogoPayouts: gogoPayouts,
		slowgoPayouts: slowgoPayouts,
		nogoPayouts: nogoPayouts
	};
	if (breakEvenAgeSet) {
		response.breakEvenAge = breakEvenAge;
	}

	return response;
};
