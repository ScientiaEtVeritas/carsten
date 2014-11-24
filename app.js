var express    = require('express');
var bodyParser = require('body-parser');
var fs         = require('fs');
var path       = require('path');
var url           = require('url');


//set context
var context        = {};
context.config     = require('./config');
context.app        = express();
context.sockets    = [];
context.rest       = new require('node-rest-client').Client();
context.mongoose   = require('mongoose');
context.http       = require('http');

console.log('\n\n   ██████╗ █████╗ ██████╗ ███████╗████████╗███████╗███╗   ██╗\n'+
'  ██╔════╝██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔════╝████╗  ██║\n'+
'  ██║     ███████║██████╔╝███████╗   ██║   █████╗  ██╔██╗ ██║\n'+
'  ██║     ██╔══██║██╔══██╗╚════██║   ██║   ██╔══╝  ██║╚██╗██║\n'+
'  ╚██████╗██║  ██║██║  ██║███████║   ██║   ███████╗██║ ╚████║\n'+
'   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝\n');

if(context.http_proxy) {
	context.http_options = {
		hostname: url.parse(context.http_proxy).hostname,
		port: url.parse(context.http_proxy).port,
		path: context.http_proxy,
		headers: {
			Host: url.parse(context.http_proxy).hostname
		}
	};
} else {
	context.http_options = undefined;
}

console.log('\n*------ CONFIGURATION ------*' +
'\nPort: ', context.config.port +
'\nDefault channel: ' + context.config.defaultChannel +
'\nQueue time: ', context.config.queueTime +
'\nSlack token: ' + context.config.slackToken +
'\nMongoDB: ', context.config.mongodb +
'\nDatabase: ' + context.config.database + '\n');

//create server
var server = context.http.createServer(context.app);
server.listen(context.config.port);
server.timeout = 50000000;

server.on('error', function(err) {
	console.log('\n*------ SERVER ERROR ------*'  +
	'\nMessage: ', err.message);
	process.exit(1);
});

console.log('\n*------ SERVER STARTED ------*');

context.db = context.mongoose.connect(context.config.mongodb + context.config.database, {server:{auto_reconnect:true}}).connection;
context.db.on('error', function(err) {
	console.log('\n*------ DATABASE CONNECTION ERROR ------*');
	console.log('\nMessage: ' + err);
	process.exit(1);
});

context.db.once('open', function callback () {
	console.log('\n*------ CONNECTED TO DATABASE ------*');

	console.log('\n*------ LOAD PLUGINS ------*');

	context.plugins = [{name:'youtube'}];
	context.pluginPath = './plugins';
	context.consolePlugins = '';

	context.plugins.forEach(function(plugin) {
		plugin.app = require(context.pluginPath + '/' + plugin.name);
		context.consolePlugins += '\nPlugin loaded: ' +  plugin.name;
	});

	console.log(context.consolePlugins);

	//creat socket connection
	context.io = require('socket.io')(server);

//initialize
	context.app.use(bodyParser.json());
	context.app.use(bodyParser.urlencoded({ extended: true }));

//load modules
	console.log('\n*------ LOAD MODULES ------*');
	var modules = fs.readdirSync('modules');
	modules.forEach(function (fileName) {
		if(path.extname(fileName) === '.js')
		{
			var module = path.basename(fileName, '.js');
			context[module] = require('./modules/' + module);
			context[module](context);
			console.log('Module: ' + module);
		}
	});

});
