// Node stuff
var fs = require('fs');

// Express & Express middleware
var express = require('express');
var bodyParser = require('body-parser');

// Rest client  
var RestClient = require('node-rest-client').Client;

// Init Context
var context = {};

// Init config
context.config = require('./config');

// Init Rest Client
context.rest = new RestClient();

// Init app
context.app = express();
context.app.use(bodyParser.json());
context.app.use(bodyParser.urlencoded({
	extended: true
}));

// Init Chrome
context.page = null;

var connectToChrome = function () {
	Chrome(function (chrome) {
			with (chrome) {
				on('Network.requestWillBeSent', function (message) {
					console.log('Sending request...');
				});
				on('Page.loadEventFired', function () {
					console.log('Page.loadEventFired');
				});
				Network.enable();
		            
				page = Page;
				page.enable();
				page.navigate({'url': "http://localhost:" + process.env.PORT});

			}
		}).on('error', function () {
	        console.error('Cannot connect to Chrome. Retrying in 3 seconds...');
	        setTimeout(function() {
	        	connectToChrome();
			}, 3000);
		});
};

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

context.app.listen(context.config.port);
console.log('Listening on port ' + context.config.port);