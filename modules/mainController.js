module.exports = function (context) {
	
	var express = require('express');
	var path    = require('path');

	context.app.use('/', express.static(path.join(__dirname, '../public')));
}