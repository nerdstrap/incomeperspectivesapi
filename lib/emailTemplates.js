'use strict';

module.exports = {
	forgotPasswordEmail: function (user, req, token, mailOptions) {
		mailOptions.html = [
			'Hello ' + user.name + ',',
			'A request to reset the password for your account has been received.',
			'If you made this request, please click on the link below, or copy and paste the link into your browser, to complete the reset password process.',
			'http://' + req.headers.host + '/reset/' + token,
			'This link will work for 1 hour, or until your password is reset.',
			'If you did not submit this request, ignore this e-mail and your account will remain unchanged.'
		].join('\n\n');
		mailOptions.subject = 'reset password request';
		return mailOptions;
	}
};
