module.exports = function (context) {

	/**********************************************************************************/
	/******************************* GLOBAL VARIABLES *********************************/
	/******************************* DECLERATION AREA *********************************/
	/**********************************************************************************/
	/**********************************************************************************/

	context.global = {};

	context.global.events = {}; // all events, for all channels
	context.global.events[context.config.defaultChannel] = []; // initialize event array for default channel
	context.global.eventTimeouts = {}; // all timeouts of all events, indentified through _id property

	context.global.playlists = []; // all playlists

	context.global.gID = 0; // counter for carst IDs
	var cID = 0; // counter for command IDs
	var receivers = {}; // all receivers

	var channels = []; // all channels
	channels[0] = context.config.defaultChannel; // initialize channels with default channel

	context.global.carsts = {}; // carst queue
	var commands = {}; // all commands

	// initialze carsts and command for default channel
	context.global.carsts[context.config.defaultChannel] = [];
	commands[context.config.defaultChannel] = [];

	var countReceivers = {
		'#global' : 0
	};

	// all default carsts, for every channel
	var defaultCarst = {};
	var countPosDC = {};
	countPosDC[context.config.defaultChannel] = 0;
	var defaultCarstStatus = {};
	defaultCarstStatus[context.config.defaultChannel] = {
		status: false,
		timeout: undefined
	};

	// initialize default carst for default channel
	defaultCarst[context.config.defaultChannel] = {
		id : -2,
		channel: context.config.defaultChannel,
		url : ':index',
		playlist: undefined
	};

	context.global.currentTimeout = null; // reference to the timeout of the current carst

	// regular expression to identify input
	var regExp = {};
	regExp.carst = new RegExp("^((http|https)://)|(www.)", "i");
	regExp.app = new RegExp("^:", "i");
	regExp.playlist = new RegExp("^#(.*)$", "i");
	regExp.command = new RegExp("^/(.*)$", "i");

	var receiversockets; // Socket connection to all receivers

	var capture = {}; // latest screenshots for all channels

	var carstHistory = [];

	// serversided commands
	var scommands = {
		'clear' : function(data) {
			var channel = data.channel;
			if(context.global.carsts[channel].length > 0) {
				context.global.carsts[channel] = [];
				sendDefault(channel);
				context.global.updateSockets();
			}
		},
		'reset' : function(data) {
			var channel = data.channel;
			if(context.global.carsts[channel].length > 0) {
				clearTimeout(context.global.currentTimeout);
				utils.setEndTime(context.global.carsts, channel);
				context.global.sendToReceivers(channel, 'carst', context.global.carsts[channel][0]);
				context.global.updateSockets();
			}
		}
	};

	/**********************************************************************************/
	/******************************* HELPER FUNCTIONS *********************************/
	/************************************************ *********************************/
	/**********************************************************************************/
	/**********************************************************************************/

	var utils = require('./helpers/utils')(context);

	// returns true or false depending if parameter is integer or not
	Number.isInteger = Number.isInteger || function(int) {
		return (Math.floor(int) === +int);
	};

	/**********************************************************************************/
	/*************************** INITIAL DATABASE QUERIES *****************************/
	/************************************************ *********************************/
	/**********************************************************************************/
	/**********************************************************************************/

	/**************************************************************/
	/********************* FOR DEFAULT CARSTS *********************/
	/**************************************************************/

	var helpersDefaultCarst = require('./helpers/loadDefaultCarst')(context);
	helpersDefaultCarst.load(function(data) {
		defaultCarst = data.defaultCarst;
		defaultCarstStatus = data.defaultCarstStatus;
	});


	/**************************************************************/
	/************************* FOR EVENTS *************************/
	/**************************************************************/

	var helpersEvent = require('./helpers/loadEvent')(context);

	helpersEvent.load();

	/**************************************************************/
	/************************ FOR PLAYLISTS ***********************/
	/**************************************************************/

	var helpersPlaylist = require('./helpers/loadPlaylist')(context);
	helpersPlaylist.load();

	/**********************************************************************************/
	/*********************************** FUNCTIONS ************************************/
	/************************************************ *********************************/
	/**********************************************************************************/
	/**********************************************************************************/

	/**************************************************************/
	/************************** GENERAL ***********************'***/
	/**************************************************************/

	// clean a channel
	function closeChannel(channel) {
		delete context.global.carsts[channel];
		delete commands[channel];
		delete countReceivers[channel];
		delete countPosDC[channel];
		var pos = channels.indexOf(channel);
		channels.splice(pos, 1);
	}

	// for playlists as default, handles timeouts etc.
	function nextInDefault(channel) {
		if(defaultCarstStatus[channel].status && defaultCarst[channel].playlist) {
			if(defaultCarst[channel].playlist.carsts.length <= countPosDC[channel]) {
				countPosDC[channel] = 0;
			}
			defaultCarst[channel].playlist.carsts[countPosDC[channel]].id = -2;
			context.global.sendToReceivers(channel, 'carst', defaultCarst[channel].playlist.carsts[countPosDC[channel]]);

			defaultCarstStatus[channel].timeout = setTimeout(function() {
				if(context.global.carsts[channel].length === 0) {
					nextInDefault(channel);
				}
			}, defaultCarst[channel].playlist.carsts[countPosDC[channel]].time);
			countPosDC[channel]++;
		}
	}

	// send default carst to receivers
	function sendDefault(channel) {
		defaultCarstStatus[channel].status = true;
		if(defaultCarst[channel].playlist && defaultCarst[channel].playlist != 'null') {
			nextInDefault(channel);
		} else {
			context.global.sendToReceivers(channel, 'carst', defaultCarst[channel]);
		}
	}

	// delete a carsts, remove it from the queue
	function deleteCarst(channel, id) {
		var position = utils.indexOfObject(context.global.carsts[channel], 'id', id);
		if ( position !== -1) {
			context.global.carsts[channel].splice(position, 1);
			if(position === 0 && typeof context.global.carsts[channel][0] !== "undefined") {
				context.global.sendToReceivers(channel, 'carst', context.global.carsts[channel][0]);
				utils.setEndTime(context.global.carsts, channel);
			} else if(context.global.carsts[channel].length === 0) {
				sendDefault(channel);
			}
			context.global.updateSockets();
		}
	}

	/**************************************************************/
	/************************ FOR SOCKETS *********************'***/
	/**************************************************************/

	// loop through plugins
	function processPlugins(carst, callback) {
		var processed = false;
		context.plugins.some(function(plugin) {
			if(plugin.app.expression.test(carst.input)) {

				plugin.app.fn({
					context: context,
					match: carst.input.match(plugin.app.expression),
					input: carst.input,
					inputDuration: carst.inputDuration,
					channel: carst.channel
				}, callback);
				processed = true;
				return true;
			}
		});
		if(!processed) {
			callback({
				status:false
			});
		}
	}

	// send data to one specific socket
	function sendToSocket(socket, message, data) {
		socket.emit(message, data);
	}

	// send all relevant data to one specific socket
	function updateSocket(socket) {
		console.log(socket.id + " --- SOCKET UPDATED");
		sendToSocket(socket, 'sendChannels', channels);
		sendToSocket(socket, 'sendCountReceivers', countReceivers);
		sendToSocket(socket, 'sendDefaultCarst', defaultCarst);
		sendToSocket(socket, 'sendCarsts', context.global.carsts);
		sendToSocket(socket, 'sendCommands', commands);
		sendToSocket(socket, 'sendPlaylists',  context.global.playlists);
		sendToSocket(socket, 'sendEvents', context.global.events);
		sendToSocket(socket, 'sendCarstHistory', carstHistory);
	}

	// loop thorugh all sockets and update them
	context.global.updateSockets = function() {
		for(var id in context.sockets) {
			updateSocket(context.sockets[id]);
		}
	};

	// add all carsts of a playlist to carsts queue
	function addPlaylistToQueue(playlist, channel) {
		playlist = JSON.parse(JSON.stringify(playlist));
		playlist.carsts.forEach(function(carst) {
			carst.channel = channel;
			context.global.addCarstToQueue(carst);
		});
	}

	function unshiftPlaylist(playlist, channel) {
		playlist = JSON.parse(JSON.stringify(playlist));
		playlist.carsts.reverse().forEach(function(carst) {
			carst.channel = channel;
			context.global.unshiftCarst(carst);
		});
	}

	context.global.unshiftCarst = function(carst) {
		addToCarstHistory(carst.url);
		context.global.gID++;
		carst.id = context.global.gID;
		clearTimeout(context.global.currentTimeout);
		context.global.carsts[carst.channel].unshift(carst);
		utils.setEndTime(context.global.carsts, carst.channel);
		context.global.sendToReceivers(carst.channel, 'carst', context.global.carsts[carst.channel][0]);
		context.io.sockets.emit('tossing');
		context.global.updateSockets();
	};

	// add a specific carst to carsts queue
	context.global.addCarstToQueue = function(carst) {
		context.global.gID++;
		carst.id = context.global.gID;
		var channel = carst.channel;
		if(context.global.carsts[channel]) {
			context.global.carsts[channel].push(carst);
			if(context.global.carsts[channel][0] === carst) {
				utils.setEndTime(context.global.carsts, channel);
				defaultCarstStatus[channel].status = false;
				clearTimeout(defaultCarstStatus[channel].timeout);
				context.global.sendToReceivers(channel, 'carst', context.global.carsts[channel][0]);
			}
			context.io.sockets.emit('tossing');
			context.global.updateSockets();
		}
	};

	// create carst object
	context.global.processCarst = function(input, inputDuration, channel, message, callback) {
		processPlugins({
			input: input,
			inputDuration: inputDuration,
			channel: channel
		}, function(data) {
			var time;
			var carst;
			if(data.status) {
				time = utils.getTime(data.info.duration);
				carst = {
					title: data.info.icon + ' ' + data.info.title,
					url: data.info.url,
					channel: channel,
					time: time.resultTime,
					timeString: time.timeString
				};

				if(message != 'no') {
					context.io.sockets.emit('message', {
						title: 'New ' + message + ' - ' + data.info.title.substring(0,25),
						options: {
							body: data.info.url,
							icon: '../img/fav128.png'
						},
						channel: channel
					});
				}

			} else {
				time = utils.getTime(inputDuration);
				carst = {
					title: input,
					url: input,
					channel: channel,
					time: time.resultTime,
					timeString: time.timeString
				};
			}
			callback(carst);
		});
	};

	function addToCarstHistory(input) {
		var index = utils.indexOfObject(carstHistory, 'url', input);
		if(index == -1) {
			carstHistory.push({
				url: input,
				count: 1
			});
		} else {
			carstHistory[index].count++;
		}
	}

	// carst: convert user input to common format
	function handleCast(data) {
		addToCarstHistory(data.input);
		context.global.processCarst(data.input, data.inputDuration, data.channel, 'Carst', context.global.addCarstToQueue);
	}

	// playlist: validation, convert user input to common format
	function handlePlaylist(data, callback) {
		var match = data.input.match(regExp.playlist);
		var index;
		if(match) {
			index = utils.indexOfObject(context.global.playlists, 'title', match[1]);
		} else {
			callback(undefined);
		}
		if(index === -1) {
			callback(undefined);
		} else {
			callback(context.global.playlists[index]);
		}
	}

	// command: convert user input to common format and send it to receivers
	function handleCommand(data) {
		cID++;
		var channel = data.channel;
		var command = {
			id: cID,
			command: data.input.substr(1),
			channel: channel
		};

		for(var key in scommands) {
			if(key == command.command) {
				scommands[key](command);
				return;
			}
		}

		commands[channel].push(command);
		if(commands[channel][commands[channel].length - 1] === command) {
			context.global.sendToReceivers(channel, 'command', commands[channel][commands[channel].length - 1]);
		}
		context.global.updateSockets();
	}

	/**************************************************************/
	/************************ FOR RECEIVERS ***********************/
	/**************************************************************/

	// send a carst/command to one specific receiver
	function sendToReceiver(socket, type, obj) {
		socket.emit(type, obj);
	}

	// send a carst/command to all receivers
	context.global.sendToReceivers = function(channel, type, obj) {

		if(context.global.carsts[channel].length !== 0) {
			defaultCarstStatus[channel].status = false;
		}
		if(type === 'carst') {
			context.global.currentTimeout = setTimeout(function() {
				deleteCarst(channel, obj.id);
			}, obj.time);
		}

		utils.logSending('all', type, obj, 'sendToReceivers', channel);
		receiversockets.emit(type, obj);
	}

	/**********************************************************************************/
	/************************ COMMUNICATION WITH CLIENT SOCKET ************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	var gagPlugin = require('./plugins/9gag')(context);
	var githubPlugin = require('./plugins/github')(context);
	var helpersUploadFile = require('./helpers/uploadFile')(context);

	context.io.on('connection', function (socket) {

		socket.emit('differentTime', new Date().getHours());
		socket.emit('capture', capture);

		/**************************************************************/
		/*********************** SOCKET CONNECT ***********************/
		/**************************************************************/

		console.log('\n*********************\n' + socket.id + ": OPENED SOCKET CONNECTION\n*********************\n");

		context.sockets[socket.id] = socket;
		updateSocket(socket);

		gagPlugin.addSocket(socket);
		githubPlugin.addSocket(socket);

		/**************************************************************/
		/************************ HANDLE INPUT ************************/
		/**************************************************************/

		socket.on('sendInput', function(data) {
			if(regExp.carst.test(data.input) || regExp.app.test(data.input)) {
				handleCast(data);
			} else if(regExp.playlist.test(data.input)) {
				handlePlaylist(data, function(playlist) {
					playlist && addPlaylistToQueue(playlist, data.channel);
				});
			} else if(regExp.command.test(data.input)) {
				handleCommand(data);
			}
		});

		/**************************************************************/
		/********************** CARST INPUT NOW ***********************/
		/**************************************************************/

		socket.on('carstNow', function(data) {
			if(regExp.carst.test(data.input) || regExp.app.test(data.input)) {
					context.global.processCarst(data.input, data.inputDuration,data.channel, 'Instant Carst', function(carst) {
						context.global.unshiftCarst(carst);
					});
			} else if(regExp.playlist.test(data.input)) {
				handlePlaylist(data, function(playlist) {
					playlist && unshiftPlaylist(playlist, data.channel);
				});
			} else {
				handleCommand(data);
			}
		});

		/**************************************************************/
		/************************** NEW FILE **************************/
		/**************************************************************/

		helpersUploadFile.addSocket(socket);

		/**************************************************************/
		/*********** CHANGE POSITION OF SPECIFIC CARST ****************/
		/**************************************************************/

		socket.on('changePosition', function(data) {
			var oldPos = data.oldPos;
			var newPos = data.newPos;
			var channel = data.channel;

			if(oldPos !== newPos) {
				var tmp = JSON.parse(JSON.stringify(context.global.carsts[channel][oldPos]));
				context.global.carsts[channel].splice(oldPos, 1);
				context.global.carsts[channel].splice(newPos, 0, tmp);
				tmp = null;
				if(newPos === 0 || oldPos === 0) {
					utils.setEndTime(context.global.carsts, channel);
					clearTimeout(context.global.currentTimeout);
					context.global.sendToReceivers(channel, 'carst', context.global.carsts[channel][0]);
				}
				context.global.updateSockets();
			}
		});

		/**************************************************************/
		/************************* DELETE CARST ***********************/
		/**************************************************************/

		socket.on('removeCarst', function(data) {
			var channel = data.channel;
			var id = data.carst.id;
			deleteCarst(channel, id);
		});

		/**************************************************************/
		/*********************** PLAY PLAYLIST ************************/
		/**************************************************************/

		socket.on('playPlaylist', function(data) {
			addPlaylistToQueue(context.global.playlists[data.index], data.channel);
		});

		/**************************************************************/
		/************************ NEW PLAYLIST ************************/
		/**************************************************************/

		socket.on('openPlaylist', function(data) {

			var error = false;
			var playlist = {};
			playlist.carsts = [];
			playlist.title = data.title;
			if(data._id) {
				playlist._id = data._id;
			}
			data.carsts.some(function(carst, index) {
				if(!regExp.carst.test(carst.url)) {
					socket.emit('openPlaylistError');
					return true;
				} else {
					context.global.processCarst(carst.url, carst.timeString, '', 'no', function(carst) {
						carst.id = index;
						playlist.carsts[index] = carst;
						if(playlist.carsts.length === data.carsts.length) {
							if(!data._id || data._id == null) {
								helpersPlaylist.save(playlist, socket);
							} else {
								helpersPlaylist.update(data._id, playlist, socket);
							}
						}
					});
				}
			});
		});

		/**************************************************************/
		/************************ REMOVE PLAYLIST *********************/
		/**************************************************************/

		socket.on('removePlaylist', function(data) {
			var pos = utils.indexOfObject( context.global.playlists, '_id', data);
			if(pos !== - 1) {
				context.global.playlists.splice(pos, 1);
				helpersPlaylist.remove(data);
			} else {
				// error
			}
		});

		/**************************************************************/
		/********************** NEW DEFAULT CARST *********************/
		/**************************************************************/

		socket.on('newDefaultCarst', function(data) {
			var channel = data.channel;

			defaultCarst[channel] = {
				id : -2,
				channel: channel,
				url : data.defaultCarst,
				playlist: undefined
			};

			if(context.global.carsts[channel].length === 0) {
				handlePlaylist({
					input: data.defaultCarst
				}, function (playlist) {
					clearTimeout(defaultCarstStatus[channel].timeout);
					countPosDC[channel] = 0;
					if (playlist) {
						defaultCarstStatus[channel].status = true;
						defaultCarst[channel].playlist = JSON.parse(JSON.stringify(playlist));
						nextInDefault(channel);
					} else {
						defaultCarstStatus[channel].status = false;
						context.global.sendToReceivers(channel, 'carst', defaultCarst[channel]);
					}

					defaultCarst[channel].channel = channel;

					helpersDefaultCarst.update(channel, defaultCarst[channel]);

				});
			}
		});

		/**************************************************************/
		/************************** NEW EVENT *************************/
		/**************************************************************/

		socket.on('newEvent', function(data) {

			var channel = data.channel;
			var url = data.eventCarst.url;
			var clockTime = data.eventCarst.clock.split(':');
			if(clockTime[0] && clockTime[1] && Number.isInteger(clockTime[0]) && Number.isInteger(clockTime[1]) && clockTime[0] >= 0 && clockTime[0] <= 24 && clockTime[1] >= 0 && clockTime[1] <= 60 && regExp.carst.test(url)) {
				context.global.processCarst(url, data.eventCarst.duration, channel, 'Event', function(carst) {
					var event = {
						channel: channel,
						eventCarst: carst,
						eventHour: clockTime[0],
						eventMin: clockTime[1]
					};
					helpersEvent.save(event);
				});
			} else {
				socket.emit('newEventError');
			}
		});

		/**************************************************************/
		/************************* REMOVE EVENT ***********************/
		/**************************************************************/

		socket.on('removeEvent', function(data) {
			var pos = utils.indexOfObject(context.global.events[data.channel], '_id', data.index);
			if(pos !== -1) {
				context.global.events[data.channel].splice(pos, 1);
				helpersEvent.remove(data.index);
			} else {
				// error
			}
		});

		/**************************************************************/
		/*********************** SOCKET DISCONNECT ********************/
		/**************************************************************/

		socket.on('disconnect', function() {
			console.log('\n*********************\n' + socket.id + ": CLOSED SOCKET CONNECTION\n*********************\n");
			delete context.sockets[socket.id];
		});

	});

	/**********************************************************************************/
	/********************* COMMUNICATION WITH RECEIVER SOCKETS ************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	receiversockets = context.io.of('/receiver').on('connection', function(socket) {

		/**************************************************************/
		/********************* GET PREVIEW PICTURES *******************/
		/**************************************************************/

		socket.on('capture', function(image) {
			var buff= new Buffer(image.toString('binary'),'binary');

			capture[socket.channel] = {
				buff: buff.toString('base64'),
				channel: socket.channel
			};

			context.io.sockets.emit('capture', capture);
		});

		/**************************************************************/
		/************************ SOCKET REGISTER *********************/
		/**************************************************************/

		socket.on('registerReceiver', function(data) {
			var channel = data.channel || context.config.defaultChannel;
			socket.channel = channel;

				if(channels.indexOf(channel) === -1) {
					channels.push(channel);
				}

				if(!context.global.carsts[channel]) {
					context.global.carsts[channel] = [];
				}
				if(!commands[channel]) {
					commands[channel] = [];
				}

				if(!defaultCarst[channel]) {
					defaultCarst[channel] = {
						id : -2,
						channel: channel,
						url : ':index',
						playlist: undefined
					};
				}

				if(!defaultCarstStatus[channel]) {
					defaultCarstStatus[channel] = {};
					defaultCarstStatus[channel].status = false;
					defaultCarstStatus[channel].timeout = undefined;
				}

				if(!countPosDC[channel]) {
					countPosDC[channel] = 0;
				}

				if(defaultCarst[channel].playlist && defaultCarst[channel].playlist != 'null' && !defaultCarstStatus[channel].status) {
					defaultCarstStatus[channel].status = true;
					nextInDefault(channel);
				}


				if(!countReceivers[channel]) {
					countReceivers[channel] = 0;
				}

				if(!context.global.events[channel]) {
					context.global.events[channel] = [];
				}

				countReceivers[channel]++;

				context.global.updateSockets();

				socket.emit('registrationSuccessfully');
				if(context.global.carsts[channel].length > 0) {
					sendToReceiver(socket, 'carst', context.global.carsts[channel][0]);
				} else if(context.global.carsts[channel].length === 0) {
					if(defaultCarst[channel].playlist && defaultCarst[channel].playlist != 'null' && defaultCarstStatus[channel].status) {
						defaultCarst[channel].playlist.carsts[countPosDC[channel]-1].id = -2;
						sendToReceiver(socket, 'carst', defaultCarst[channel].playlist.carsts[countPosDC[channel]-1]);
					} else {
						sendToReceiver(socket, 'carst', defaultCarst[channel]);
					}
				}
		});

		/**************************************************************/
		/*********************** SOCKET DISCONNECT ********************/
		/**************************************************************/

		socket.on('disconnect', function() {
			var channel = socket.channel;
				countReceivers[channel]--;
				if(countReceivers[channel] === 0 && channel !== channels[0]) {
					closeChannel(channel);
					context.global.updateSockets();
				}

		});

	});

	/**********************************************************************************/
	/**************************** COMMUNICATION REST ROUTES ***************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	githubPlugin.addWebhook(); // GitHub WebHook

	helpersUploadFile.addRoute(); // Upload Images
};