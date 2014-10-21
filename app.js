// Node stuff
var fs = require('fs');

// Express & Express middleware
var express = require('express');
var bodyParser = require('body-parser');

// Rest client  
var RestClient = require('node-rest-client').Client;

// Init Context
var context = {};

// Init Rest Client
context.rest = new RestClient();

// Init app
context.app = express();
context.app.use(bodyParser.json());
context.app.use(bodyParser.urlencoded({
	extended: true
}));

// Load components
console.log('Loading components...');
['services', 'controllers'].forEach(function (comp) {
	var modules = fs.readdirSync(comp);

	modules.forEach(function (fileName) {
		var module = fileName.replace('.js', '');

		context[comp] = {};
		context[comp][module] = require('./' + comp + '/' + module);
		context[comp][module](context);

		console.log('    LOADED ' + comp + '/' + module);
	});
});

context.app.listen(3000);
console.log('Listening on port 3000');