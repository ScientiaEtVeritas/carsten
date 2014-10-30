var express    = require('express');
var bodyParser = require('body-parser');
var http       = require('http');
var fs         = require('fs');
var path       = require('path');

//set context
var context        = {};
context.config     = require('./config');
context.app        = express();
context.sockets    = [];
context.rest       = new require('node-rest-client').Client();
console.log('config: ' + JSON.stringify(context.config));

//initialize
context.app.use(bodyParser.json());
context.app.use(bodyParser.urlencoded({ extended: true }));

//load modules
console.log('loading modules..');
var modules = fs.readdirSync('modules');
modules.forEach(function (fileName) {
	if(path.extname(fileName) === '.js')
	{
		var module = path.basename(fileName, '.js');
		context[module] = require('./modules/' + module);
		context[module](context);
		console.log('  loaded module ' + module);
	}
});

//create server
var server = http.createServer(context.app);
server.listen(context.config.port);
console.log('server started');

//creat socket connection
var io = require('socket.io')(server);

io.on('connection', function (socket) {
  context.sockets.push(socket);
  //socket.emit('news', { hello: 'world' });
  //socket.on('my other event', function (data) {
  //  console.log(data);
  //});
});