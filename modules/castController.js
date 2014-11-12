module.exports = function (context, io) {
	var gID = 0;
	var cID = 0;
	var receivers = {

	};
	var channels = [];
	channels[0] = '#global';
	var carsts = [];
	var commands = [];
	var defers = [];
	defers['#global'] = {
		command : [],
		carst : []
	};
	var lastDefers = [];
	var closed = [];
	var countReceivers = {
		'#global' : 0
	};

	carsts['#global'] = [];
	commands['#global'] = [];

	function closeChannel(channel) {
		delete carsts[channel];
		delete commands[channel];
		delete defers[channel];
		delete countReceivers[channel];
		var pos = channels.indexOf(channel);
		channels.splice(pos, 1);
	}

	var logNum = 0;

	function logSending(host, type, obj, fn, channel) {
		console.log('\n', logNum, '*------ SENDING TO RECEIVER === START ------*');
		console.log(logNum,'To: ', host);
		console.log(logNum,'Type: ' + type);
		console.log(logNum,'Obj: ', obj);
		console.log(logNum,'Fn: ' + fn);
		console.log(logNum,'Channel: ' + channel);
		console.log(logNum,'*------- SENDING TO RECEIVER === END -------*');
		logNum++;
	}

	function logSendingToClient(data, channel, type) {
		console.log('\n', logNum,'*------ SENDING TO CLIENT === START ------*');
		console.log(logNum,'Data: ', data);
		console.log(logNum,'Channel: ', channel);
		console.log(logNum,'Type: ', type);
		console.log(logNum,'*------- SENDING TO CLIENT === END -------*');
		logNum++;
	}

	function sendToReceiver(res, req, type, obj) {
		logSending(req.connection.remoteAddress, type, obj, 'sendToReceiver', '-');
		lastDefers[req.connection.remoteAddress][type] = obj.id;
		res.send(obj);
	}

	function sendToReceivers(channel, type, obj) {
		if(defers[channel]) {
			defers[channel][type].forEach(function(defer) {
				logSending(defer.receiver, type, obj, 'sendToReceivers', channel);
				defer.respond.send(obj);
				lastDefers[defer.receiver][type] = obj.id;
			});
			if(type === 'carst') {
				setTimeout(function() {
					deleteCarst(channel, obj.id);
				}, obj.time);
			}
			defers[channel][type] = [];
		}
	}

	//post a carst
	context.app.post('/rest/carst', function (req, res) {
		gID++;
		var channel = req.body.channel;
		var newCarst = {
			id: gID,
			url: req.body.url,
			time: req.body.time,
			timeString: req.body.timeString
		};
		carsts[channel].push(newCarst);
		if(carsts[channel][0] === newCarst) {
			sendToReceivers(channel, 'carst', carsts[channel][0]);
		}

		res.send({});
		io.sockets.emit('update');
	});

	context.app.post('/rest/command', function (req, res) {
		cID++;
		var channel = req.body.channel;
		var newCommand = {
			id: cID,
			command: req.body.command
		};
		commands[channel].push(newCommand);
		if(commands[channel][commands[channel].length - 1] === newCommand) {
			sendToReceivers(channel, 'command', commands[channel][commands[channel].length - 1]);
		}
		res.send({});
		io.sockets.emit('update');
	});

	/*post a carst from slack
	context.app.post('/rest/slack_carst', function (req, res) {
		if(context.config.slackToken === req.body.token && req.body.trigger_word === 'carst')
		{
			var command = req.body.text.split(" ");
		 	if(command.length === 2)
		  	{
		  		var url = command[1].replace("<","").replace(">","");
		    	carsts.push({
					id: gID,
					url: url
				});
				gID++;
		    	pushUpdateEvent();
		    	var response = {"text":"carsted"};
		    	res.send(response);
		  	}
		}
	});*/

	//get carst
	context.app.get('/rest/carst', function (req, res) {
		var carst = {};
		var hostname = req.connection.remoteAddress;
		var channel = receivers[hostname];
		closed[hostname] = false;
		console.log('************ DEBUGGING: ', hostname, channel);
		if(carsts[channel].length > 0 && carsts[channel][0].id !== lastDefers[hostname].carst) {
			sendToReceiver(res, req, 'carst', carsts[channel][0]);
		} else {
			defers[channel].carst.push({receiver: hostname, respond : res});
			req.connection.on('close',function(){
				closed[hostname] = true;
				setTimeout(function() {
					if(closed[hostname]) {
						countReceivers[channel]--;
						if(countReceivers[channel] === 0 && channel !== channels[0]) {
							closeChannel(channel);
							io.sockets.emit('update');
						}
						io.sockets.emit('message', {
							title: hostname,
							options: {
								body: hostname + ' disconnected from ' + channel,
								icon: '../img/info-icon.png'
							},
							channel: channel,
							counter: countReceivers[channel]
						});
					}
				}, 5000);
			});
		}
	});

	context.app.get('/rest/command', function (req, res) {
		var command = {};
		var hostname = req.connection.remoteAddress;
		var channel = receivers[hostname];
		if(commands[channel].length > 0 && commands[channel][commands[channel].length - 1].id !== lastDefers[hostname].command) {
			sendToReceiver(res, req, 'command', commands[channel][commands[channel].length - 1]);
		} else {
			defers[channel].command.push({receiver: hostname, respond : res});
		}
	});

	//get all carsts
	context.app.get('/rest/carsts/:channel', function (req, res) {
		logSendingToClient(carsts['#' + req.params.channel], '#' + req.params.channel, 'carsts');
		res.send(carsts['#' + req.params.channel]);
	});

	context.app.get('/rest/commands/:channel', function (req, res) {
		logSendingToClient(commands['#' + req.params.channel], '#' + req.params.channel, 'commands');
		res.send(commands['#' + req.params.channel]);
	});

	context.app.get('/rest/channels', function (req, res) {
		logSendingToClient(channels, '-', 'channels');
		res.send(channels);
	});

	context.app.get('/rest/counter', function(req, res) {
		res.send(countReceivers);
	});

	function deleteCarst(channel, id) {
		var position = indexOfObject(carsts[channel], 'id', id);
		if ( position !== null) {
			carsts[channel].splice(position, 1);
			if(typeof carsts[channel][0] !== "undefined") {
				sendToReceivers(channel, 'carst', carsts[channel][0]);
			}
			io.sockets.emit('update');
		}
	}

	context.app.post('/remove/carst', function(req, res) {
		var channel = req.body.channel;
		var id = req.body.carst.id;
		deleteCarst(channel, id);
		res.send({});
	});

	context.app.post('/rest/init', function(req, res) {
		var channel = req.body.channel || '#global';
		var hostname = req.connection.remoteAddress;
		if(hostname) {
			console.log("receiver with address" + hostname + " joined channel " + channel);
			if(!lastDefers[hostname]) {
				lastDefers[hostname] = {
					command : -1,
					carst : - 1
				};
			}

			if(channels.indexOf(channel) === -1) {
				channels.push(channel);
			}

			if(!carsts[channel]) {
				carsts[channel] = [];
			}
			if(!commands[channel]) {
				commands[channel] = [];
			}
			if(!receivers[hostname]) {
				receivers[hostname] = channel;
			}

			if(!countReceivers[channel]) {
				countReceivers[channel] = 0;
			}

			if(!defers[channel]) {
				defers[channel] = {
					command : [],
					carst : []
				};
			}

			closed[hostname] = false;

			countReceivers[channel]++;

			io.sockets.emit('message', {
				title: hostname,
				options: {
					body: "receiver called " + hostname + " joined channel " + channel,
					icon: '../img/info-icon.png'
				},
				channel: channel,
				counter: '' + countReceivers[channel]
			});
			io.sockets.emit('update');
			res.end('true');
		} else {
			res.end('false');
		}
	});

	function indexOfObject(array, key, value) {
		for (var i = 0; i < array.length; i++) {
			if (array[i][key] === value) {
				return i;
			}
		}
		return null;
	}
};
