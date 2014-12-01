module.exports = function (context) {

	/**********************************************************************************/
	/******************************* GLOBAL VARIABLES *********************************/
	/******************************* DECLERATION AREA *********************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	// moongoose Schema for defaultCarst
	var defaultCarstSchema = context.mongoose.Schema({
		channel: String,
		url: String,
		id: Number,
		playlist: {
			title: String,
			carsts: [{
				id: Number,
				title: String,
				url: String,
				time: Number,
				timeString: String
			}]
		}
	});

	var DefaultCarstModel = context.mongoose.model('DefaultCarst', defaultCarstSchema);

	var events = {}; // all events, for all channels
	events[context.config.defaultChannel] = []; // initialize event array for default channel
	var eventTimeouts = {}; // all timeouts of all events, indentified through _id property

	// moongoose Schema for events
	var eventsSchema = context.mongoose.Schema({
		channel: String,
		eventHour: Number,
		eventMin: Number,
		eventCarst: {
			title: String,
			url: String,
			time: Number,
			timeString: String,
			id: Number
		}
	});

	// mongoose Model for events
	var EventsModel = context.mongoose.model('Events', eventsSchema);

	var playlists; // all playlists

	// mongoose Schema for playlists
	var playlistsSchema = context.mongoose.Schema({
		title: String,
		carsts: [{
			id: Number,
			title: String,
			url: String,
			time: Number,
			timeString: String
		}]
	});

	// mongoose Model for playlists
	var PlaylistsModel = context.mongoose.model('Playlists', playlistsSchema);

	var gID = 0; // counter for carst IDs
	var cID = 0; // counter for command IDs
	var receivers = {}; // all receivers

	var channels = []; // all channels
	channels[0] = context.config.defaultChannel; // initialize channels with default channel

	var carsts = {}; // carst queue
	var commands = {}; // all commands

	// initialze carsts and command for default channel
	carsts[context.config.defaultChannel] = [];
	commands[context.config.defaultChannel] = [];

	var defers = []; // save respond objects for long polling
	// initialize defers for default channel
	defers[context.config.defaultChannel] = {
		command : [],
		carst : []
	};
	var lastDefers = []; // receivers with their last received carst
	var closed = []; // all receivers, to control if they are disconnected
	// count receivers per channel
	var countReceivers = {
		'#global' : 0
	};

	// all default carsts, for every channel
	var defaultCarst = {};
	var countPosDC = {};
	countPosDC[context.config.defaultChannel] = 0;
	var defaultCarstStatus = {};

	// initialize default carst for default channel
	defaultCarst[context.config.defaultChannel] = {
		id : -2,
		channel: context.config.defaultChannel,
		url : 'app://index',
		playlist: undefined
	};

	var currentTimeout; // reference to the timeout of the current carst

	// regular expression to identify input
	var regExp = {};
	regExp.carst = new RegExp("^((http|https|app)://)|(www.)", "i");
	regExp.playlist = new RegExp("^playlist:\/\/(.*)$", "i");

	/**********************************************************************************/
	/*************************** INITIAL DATABASE QUERIES *****************************/
	/************************************************ *********************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	/**************************************************************/
	/********************* FOR DEFAULT CARSTS *********************/
	/**************************************************************/

	DefaultCarstModel.find(function(err, dcResults) {
		dcResults.forEach(function(defaultCarstRes) {
			console.log("DEFAULT CARST FOR " + defaultCarstRes.channel + " IS " + defaultCarstRes.url);
			var channel = defaultCarstRes.channel;
			defaultCarst[channel] = defaultCarstRes;
			defaultCarstStatus[channel] = {
				status: false,
				timeout: undefined
			};
		});
		console.log("\n*-------- " + dcResults.length + " DEFAULT CARST(S) LOADED --------*\n");
	});

	/**************************************************************/
	/************************* FOR EVENTS *************************/
	/**************************************************************/

	EventsModel.find(function(err, eventsResult) {
		eventsResult.forEach(function(event, index) {
			events[event.channel] = events[event.channel] || [];
			gID++;
			event.eventCarst.id = gID;
			events[event.channel].push(event);
		});
		setTimeoutForEvents();
	});

	// loop through all events and set timeouts
	function setTimeoutForEvents() {
		for(var channel in events) {
			if(carsts[channel]) {
				events[channel].forEach(function (event) {
					setTimeoutForEvent(event);
				});
			}
		}
		setTimeout(setTimeoutForEvents, 86400000);
	}

	// calculate time for timeout
	function setTimeoutForEvent(event) {
			var currentTime = new Date();
		context.io.sockets.emit('log', currentTime.getHours());
			var rest = ((event.eventHour - currentTime.getHours())*3600000) + ((event.eventMin - currentTime.getMinutes()) * 60000);
			if(rest > 0) {
				raiseEvent(event, rest);
			} else {
				raiseEvent(event, 86400000 + rest);
			}
	}

	// set timeout for an event and replace first carst
	function raiseEvent(event, rest) {

		var date = new Date(new Date().getTime() + rest);
		console.log('\n******* Event ' + event._id + ' will be raised on ' + event.channel + ' at ' + formatDate(date));

		context.io.sockets.emit('log', {
			event: event,
			date: formatDate(date)
		});

		eventTimeouts[event._id] = setTimeout(function() {
			context.io.sockets.emit('log', 'event is fired');
			clearTimeout(currentTimeout);
			if(carsts[event.channel]) {
				carsts[event.channel].unshift(event.eventCarst);
				sendToReceivers(event.channel, 'carst', event.eventCarst);
				updateSockets();
			}
			delete eventTimeouts[event._id];
		}, rest);
	}

	/**************************************************************/
	/************************ FOR PLAYLISTS ***********************/
	/**************************************************************/


	PlaylistsModel.find(function(err, playlistsResults) {
		playlists = playlistsResults;
		console.log('\n*------ ' + playlists.length + ' PLAYLIST(S) LOADED ------*');
	});

	/**********************************************************************************/
	/******************************* HELPER FUNCTIONS *********************************/
	/************************************************ *********************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	// date object to mm/dd/yyyy - hh:mm
	function formatDate(date) {
		return (date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' - ' + formatTime([date.getHours(), date.getMinutes()]));
	}

	// [a, b, ... z] to "aa:bb: ... zz"
	function formatTime(arr) {
		var str = '';
		arr.forEach(function(a, i) {
			str += (i === 0 ? '' : ':') + ('0' + a).slice(-2);
		});
		return str;
	}

	// returns index of object by value of a key
	function indexOfObject(array, key, value) {
		if(array) {
			for (var i = 0; i < array.length; i++) {
				if (array[i] && array[i][key] && array[i][key].toString().toLowerCase() === value.toString().toLowerCase()) {
					return i;
				}
			}
		}
		return -1;
	}

	// returns true or false depending if parameter is integer or not
	Number.isInteger = Number.isInteger || function(int) {
		return (Math.floor(int) === int);
	};

	/**************************************************************/
	/************************ FOR LOGGING *********************'***/
	/**************************************************************/

	var logNum = 0;

	// log sending to receiver
	function logSending(host, type, obj, fn, channel) {
		context.io.sockets.emit('log', 'Sending to receiver');
		console.log('\n\n*------ SENDING TO RECEIVER ' + logNum + ' === START ------*' +
		'\nTo: ', host +
		'\nType: ' + type +
		'\nObj: ', obj +
		'\nFn: ' + fn +
		'\nChannel: ' + channel + '\n');
		logNum++;
	}

	// log registration
	function logRegistration(host, channel) {
		context.io.sockets.emit('log', 'Registration');
		console.log('\n\n*------ REGISTRATION ' + logNum + ' === START ------*' +
		'\nHostname: ', host +
		'\nChannel: ' + channel + '\n');
		logNum++;
	}

	// log deregistration
	function logDeregistration(host, channel) {
		context.io.sockets.emit('log', 'Deregistration');
		console.log('\n\n*------ DEREGISTRATION ' + logNum + ' === START ------*' +
		'\nHostname: ', host +
		'\nChannel: ' + channel + '\n');
		logNum++;
	}

	/**********************************************************************************/
	/*********************************** FUNCTIONS ************************************/
	/************************************************ *********************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	/**************************************************************/
	/************************** GENERAL ***********************'***/
	/**************************************************************/

	// clean a channel
	function closeChannel(channel) {
		delete carsts[channel];
		delete commands[channel];
		delete defers[channel];
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
			sendToReceivers(channel, 'carst', defaultCarst[channel].playlist.carsts[countPosDC[channel]]);

			defaultCarstStatus[channel].timeout = setTimeout(function() {
				if(carsts[channel].length === 0) {
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
			sendToReceivers(channel, 'carst', defaultCarst[channel]);
		}
	}


	// delete a carsts, remove it from the queue
	function deleteCarst(channel, id) {
		var position = indexOfObject(carsts[channel], 'id', id);
		if ( position !== -1) {
			carsts[channel].splice(position, 1);
			if(position === 0 && typeof carsts[channel][0] !== "undefined") {
				sendToReceivers(channel, 'carst', carsts[channel][0]);
			} else if(carsts[channel].length === 0) {
				sendDefault(channel);
			}
			updateSockets();
		}
	}

	/**************************************************************/
	/************************ FOR SOCKETS *********************'***/
	/**************************************************************/

	// loop through plugins
	function processPlugins(input, callback) {
		var processed = false;
		context.plugins.some(function(plugin) {
			if(plugin.app.expression.test(input)) {

				plugin.app.fn({
					context: context,
					match: input.match(plugin.app.expression),
					input: input
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
		sendToSocket(socket, 'sendCarsts', carsts);
		sendToSocket(socket, 'sendCommands', commands);
		sendToSocket(socket, 'sendPlaylists', playlists);
		sendToSocket(socket, 'sendEvents', events);
	}

	// loop thorugh all sockets and update them
	function updateSockets() {
		for(var id in context.sockets) {
			updateSocket(context.sockets[id]);
		}
	}

	// add all carsts of a playlist to carsts queue
	function addPlaylistToQueue(playlist, channel) {
		playlist = JSON.parse(JSON.stringify(playlist));
		playlist.carsts.forEach(function(carst) {
			carst.channel = channel;
			addCarstToQueue(carst);
		});
	}

	function unshiftPlaylist(playlist, channel) {
		playlist = JSON.parse(JSON.stringify(playlist));
		playlist.carsts.reverse().forEach(function(carst) {
			carst.channel = channel;
			unshiftCarst(carst);
		});
	}

	function unshiftCarst(carst) {
		gID++;
		carst.id = gID;
		clearTimeout(currentTimeout);
		carsts[carst.channel].unshift(carst);
		sendToReceivers(carst.channel, 'carst', carsts[carst.channel][0]);
		updateSockets();
	}

	// add a specific carst to carsts queue
	function addCarstToQueue(carst) {
		//Channelangabe überdenken
		gID++;
		carst.id = gID;
		var channel = carst.channel;
		carsts[channel].push(carst);
		if(carsts[channel][0] === carst) {
			defaultCarstStatus[channel].status = false;
			clearTimeout(defaultCarstStatus[channel].timeout);
			sendToReceivers(channel, 'carst', carsts[channel][0]);
		}
		updateSockets();
	}

	// calculate time of sockets input
	function getTime(inputDuration) {
		var reTime = /^(?:PT)?(?:(\d{1,2})[:.hH])?(?:(\d{1,4})[:.mM])?(?:(\d{1,6})[sS]?)?$/;

		var match;
		var resultTime;
		var timeString;

		if(reTime.test(inputDuration)) {
			match = inputDuration.match(reTime);
			resultTime = (match[1] && +match[1]*3600000 || 0) + (match[2] && +match[2]*60000 || 0) + (match[3] && +match[3]*1000 || 0);
		}

		resultTime = resultTime || 1800000;

		var hrs = Math.floor(resultTime/3600000);
		var min = Math.floor((resultTime - hrs*3600000)/60000);
		var sec = (resultTime - (min*60000))/1000;
		timeString = formatTime([hrs, min, sec]);

		return {
			resultTime: resultTime,
			timeString: timeString
		};
	}

	// create carst object
	function processCarst(input, inputDuration, channel, callback) {
		processPlugins(input, function(data) {
			var time;
			var carst;
			if(data.status) {
				time = getTime(data.info.duration);
				carst = {
					title: data.info.icon + ' ' + data.info.title,
					url: input,
					channel: channel,
					time: time.resultTime,
					timeString: time.timeString
				};
			} else {
				time = getTime(inputDuration);
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
	}

	// carst: convert user input to common format
	function handleCast(data) {
		processCarst(data.input, data.inputDuration, data.channel, addCarstToQueue);
	}

	// playlist: validation, convert user input to common format
	function handlePlaylist(data, callback) {
		var match = data.input.match(regExp.playlist);
		var index;
		if(match) {
			index = indexOfObject(playlists, 'title', match[1]);
		} else {
			console.log('Not a valid playlist');
			callback(undefined);
		}
		if(index === -1) {
			console.log('Not a valid playlist');
			callback(undefined);
		} else {
			console.log('A valid playlist');
			callback(playlists[index]);
		}
	}

	// command: convert user input to common format and send it to receivers
	function handleCommand(data) {
		cID++;
		var channel = data.channel;
		var command = {
			id: cID,
			command: data.input
		};
		commands[channel].push(command);
		if(commands[channel][commands[channel].length - 1] === command) {
			sendToReceivers(channel, 'command', commands[channel][commands[channel].length - 1]);
		}
		updateSockets();
	}

	/**************************************************************/
	/************************ FOR RECEIVERS ***********************/
	/**************************************************************/

	// send a carst/command to one specific receiver
	function sendToReceiver(res, hostname, type, obj) {
		logSending(hostname, type, obj, 'sendToReceiver', '-');
		lastDefers[hostname][type] = obj.id;
		res.send(obj);
	}

	// send a carst/command to all receivers
	function sendToReceivers(channel, type, obj) {
		if(carsts[channel].length !== 0) {
			defaultCarstStatus[channel].status = false;
		}
		if(defers[channel] && defers[channel][type]) {
			defers[channel][type].forEach(function(defer) {
				logSending(defer.receiver, type, obj, 'sendToReceivers', channel);
				defer.respond.send(obj);
				lastDefers[defer.receiver][type] = obj.id;
			});
			if(type === 'carst') {
				currentTimeout = setTimeout(function() {
					deleteCarst(channel, obj.id);
				}, obj.time);
			}
			defers[channel][type] = [];
		}
	}

	/**********************************************************************************/
	/*********************** COMMUNICATION WITH CLIENT SOCKETS ************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/


	context.io.on('connection', function (socket) {

		socket.emit('differentTime', new Date().getHours());

		/**************************************************************/
		/*********************** SOCKET CONNECT ***********************/
		/**************************************************************/

		console.log('\n*********************\n' + socket.id + ": OPENED SOCKET CONNECTION\n*********************\n");

		context.sockets[socket.id] = socket;
		updateSocket(socket);

		/**************************************************************/
		/************************ HANDLE INPUT ************************/
		/**************************************************************/

		socket.on('sendInput', function(data) {
			if(regExp.carst.test(data.input)) {
				handleCast(data);
			} else if(regExp.playlist.test(data.input)) {
				handlePlaylist(data, function(playlist) {
					playlist && addPlaylistToQueue(playlist, data.channel);
				});
			} else {
				handleCommand(data);
			}
		});

		/**************************************************************/
		/********************** CARST INPUT NOW ***********************/
		/**************************************************************/

		socket.on('carstNow', function(data) {
			if(regExp.carst.test(data.input)) {
					processCarst(data.input, data.inputDuration,data.channel, function(carst) {
						unshiftCarst(carst);
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

		socket.on('newImage', function(data) {
			var name = data.name;
			var type = data.type;
			var binary = data.data;
			var fs = require('fs');
			fs.open("./uploads/" + name, 'w+', 0755, function(err, fd) {
				if (err) throw err;

				fs.write(fd, binary, null, 'Binary', function(err, written, buff) {
					fs.close(fd, function() {
						processCarst('http://localhost:3000/image/' + name , data.duration,  data.channel, addCarstToQueue);
					});
				});
			});
		});

		/**************************************************************/
		/*********** CHANGE POSITION OF SPECIFIC CARST ****************/
		/**************************************************************/

		socket.on('changePosition', function(data) {
			var oldPos = data.oldPos;
			var newPos = data.newPos;
			var channel = data.channel;

			if(oldPos !== newPos) {
				var tmp = JSON.parse(JSON.stringify(carsts[channel][oldPos]));
				carsts[channel].splice(oldPos, 1);
				carsts[channel].splice(newPos, 0, tmp);
				tmp = null;
				if(newPos === 0 || oldPos === 0) {
					clearTimeout(currentTimeout);
					sendToReceivers(channel, 'carst', carsts[channel][0]);
				}
				updateSockets();
			}
		});

		/**************************************************************/
		/********************* DELETE WHOLE QUEUE *********************/
		/**************************************************************/

		socket.on('clearQueue', function(data) {
			var channel = data.channel;
			if(carsts[channel].length > 0) {
				carsts[channel] = [];
				sendDefault(channel);
				updateSockets();
			}
		});

		/**************************************************************/
		/*********************** RESET FIRST CARST ********************/
		/**************************************************************/

		socket.on('setBack', function(data) {
			var channel = data.channel;
			if(carsts[channel].length > 0) {
				clearTimeout(currentTimeout);
				sendToReceivers(channel, 'carst', carsts[channel][0]);
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
			addPlaylistToQueue(playlists[data.index], data.channel);
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
					processCarst(carst.url, carst.timeString, '', function(carst) {
						carst.id = index;
						playlist.carsts[index] = carst;
						if(playlist.carsts.length === data.carsts.length) {
							if(!data._id || data._id == null) {
								playlist = new PlaylistsModel(playlist);
								playlist.save(function(err, data) {
									if(!err) {
										playlists.push(data);
										console.log('\n*------ PLAYLIST ADDED TO DATABASE ------*');
										socket.emit('openPlaylistSuccess');
										updateSockets();
									} else {
										console.log(err);
										socket.emit('openPlaylistError');
									}
								});
							} else {
								PlaylistsModel.findOneAndUpdate({_id:data._id}, playlist, function(err, data) {
									if(!err) {
										var pos = indexOfObject(playlists, '_id', data._id);
										if(pos !== - 1) {
											playlists.splice(pos, 1);
										}
										playlists.push(playlist);
										console.log('\n*------ PLAYLIST UPDATED IN DATABASE ------*');
										socket.emit('openPlaylistSuccess');
										updateSockets();
									} else {
										console.log(err);
										socket.emit('openPlaylistError');
									}
								});
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
			var pos = indexOfObject(playlists, '_id', data);
			if(pos !== - 1) {
				playlists.splice(pos, 1);
				PlaylistsModel.remove( {"_id": data}, function(err) {
					if(!err) {
						console.log('\n*------ PLAYLIST REMOVED FROM DATABASE ------*');
						updateSockets();
					} else {
						// error
					}
				});
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
			if(carsts[channel].length === 0) {
				handlePlaylist({
					input: data.defaultCarst
				}, function (playlist) {
					clearTimeout(defaultCarstStatus[channel].timeout);
					countPosDC[channel] = 0;
					if (playlist) {
						defaultCarst[channel].playlist = JSON.parse(JSON.stringify(playlist));
						nextInDefault(channel);
					} else {
						defaultCarstStatus[channel].status = false;
						sendToReceivers(channel, 'carst', defaultCarst[channel]);
					}

					defaultCarst[channel].channel = channel;
					//var defaultCarstTmp = new DefaultCarstModel(defaultCarst[channel]);
					DefaultCarstModel.findOneAndUpdate({channel:channel}, defaultCarst[channel], {upsert: true}, function(err, data) {
						if(!err) {
							console.log('\n*------ DEFAULT CARST ADDED TO DATABASE ------*');
						} else {
							console.log(err);
							// error
						}
						updateSockets();
					});
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
				processCarst(url, data.eventCarst.duration, channel, function(carst) {
					var event = {
						channel: channel,
						eventCarst: carst,
						eventHour: clockTime[0],
						eventMin: clockTime[1]
					};

					event = new EventsModel(event);
					event.save(function(err, data) {
						if(err) {
							socket.emit('newEventError');
						} else {
							gID++;
							data.eventCarst.id = gID;
							events[data.channel].push(data);
							console.log('\n*------ EVENT ADDED TO DATABASE ------*');
							socket.emit('newEventSuccess');
							setTimeoutForEvent(data);
						}
						updateSockets();
					});
				});
			} else {
				socket.emit('newEventError');
			}
		});

		/**************************************************************/
		/************************* REMOVE EVENT ***********************/
		/**************************************************************/

		socket.on('removeEvent', function(data) {
			var pos = indexOfObject(events[data.channel], '_id', data.index);
			if(pos !== -1) {
				events[data.channel].splice(pos, 1);
				EventsModel.remove( {"_id": data.index}, function(err) {
					if(err) {
						// error
					} else {
						clearTimeout(eventTimeouts[data.index]);
						delete eventTimeouts[data.index];
						console.log('\n*------ EVENT REMOVED FROM DATABASE ------*');
						updateSockets();
					}
				});
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
	/************************* COMMUNICATION WITH RECEIVERS ***************************/
	/******************************** FUNCTIONAL AREA *********************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	context.app.get('/image/:filename', function(req, res) {
		var filename = req.params.filename;
		res.sendFile(require('path').resolve(__dirname, '../uploads/' + filename));
	});

	// a receiver requestes a carst
	context.app.get('/rest/carst/:hostname', function (req, res) {
		var carst = {};
		if(req.params.hostname && receivers[req.params.hostname]) {
			var hostname = req.params.hostname;
			var channel = receivers[hostname];
			closed[hostname] = false;
			if(carsts[channel].length > 0 && carsts[channel][0].id !== lastDefers[hostname].carst) {
				sendToReceiver(res, hostname, 'carst', carsts[channel][0]);
			} else if(carsts[channel].length === 0 && lastDefers[hostname].carst !== -2) {
				if(defaultCarst[channel].playlist && defaultCarst[channel].playlist != 'null' && defaultCarstStatus[channel].status) {
					defaultCarst[channel].playlist.carsts[countPosDC[channel]-1].id = -2;
					sendToReceiver(res, hostname, 'carst', defaultCarst[channel].playlist.carsts[countPosDC[channel]-1]);
				} else {
					sendToReceiver(res, hostname, 'carst', defaultCarst[channel]);
				}
			} else {
				defers[channel].carst.push({receiver: hostname, respond : res});
				// BUG: on CF this isn't fired
				req.connection.on('close',function(){
					closed[hostname] = true;
					setTimeout(function() {
						if(receivers[hostname] && closed[hostname]) {
							countReceivers[channel]--;
							delete receivers[hostname];
							delete lastDefers[hostname];
							if(countReceivers[channel] === 0 && channel !== channels[0]) {
								closeChannel(channel);
								updateSockets();
							} else {
								var delDefer = {
									carst: indexOfObject(defers[channel].carst, 'receiver', hostname),
									command: indexOfObject(defers[channel].command, 'receiver', hostname)
								};
								if ( delDefer.carst !== -1) {
									defers[channel].carst.splice(delDefer.carst, 1);
								}
								if ( delDefer.command !== -1) {
									defers[channel].command.splice(delDefer.carst, 1);
								}
							}

							logDeregistration(hostname, channel);

							context.io.sockets.emit('message', {
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
		} else {
			console.log("ERROR: Hostname is undefined.");
		}
	});

	// a receiver requests a command
	context.app.get('/rest/command/:hostname', function (req, res) {
		var command = {};
		if(req.params.hostname && receivers[req.params.hostname]) {
			var hostname = req.params.hostname;
			var channel = receivers[hostname];
			if (commands[channel].length > 0 && commands[channel][commands[channel].length - 1].id !== lastDefers[hostname].command) {
				sendToReceiver(res, req, 'command', commands[channel][commands[channel].length - 1]);
			} else {
				defers[channel].command.push({receiver: hostname, respond: res});
			}
		}
	});

	context.app.get('/rest/extension', function (req, res) {
		var file = require('path').resolve(__dirname, '../extension/carsten-extension.crx');
		res.download(file);
	});

	context.app.post('/rest/carst', function(req, res) {
		var data = req.body;
		if(regExp.carst.test(data.input)) {
			handleCast(data);
			res.end('You successfully send this tab to Carsten.');
		} else {
			res.end('Ooops! Something went wrong!');
		}
	});

	// registration of a receiver
	context.app.post('/rest/init', function(req, res) {
		var channel = req.body.channel || context.config.defaultChannel;
		var hostname = req.body.hostname;

		if(hostname && hostname.length > 3 && !receivers[hostname]) {

			logRegistration(hostname, channel);

			if(channels.indexOf(channel) === -1) {
				channels.push(channel);
			}

			if(!carsts[channel]) {
				carsts[channel] = [];
			}
			if(!commands[channel]) {
				commands[channel] = [];
			}

			if(!lastDefers[hostname]) {
				lastDefers[hostname] = {
					command : commands[channel][commands[channel].length - 1] ? commands[channel][commands[channel].length - 1].id : -1,
					carst : - 1
				};
			}

			if(!defaultCarst[channel]) {
				defaultCarst[channel] = {
					id : -2,
					channel: channel,
					url : 'app://index',
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


			if(!receivers[hostname]) {
				receivers[hostname] = receivers[hostname] || channel;
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

			if(!events[channel]) {
				events[channel] = [];
			}

			closed[hostname] = false;

			countReceivers[channel]++;

			context.io.sockets.emit('message', {
				title: hostname,
				options: {
					body: "receiver called " + hostname + " joined channel " + channel,
					icon: '../img/info-icon.png'
				},
				channel: channel,
				counter: '' + countReceivers[channel]
			});
			updateSockets();
			res.end(JSON.stringify({
				status: true
			}));
		} else {
			var message;
			if(!hostname) {
				message = "Please provide a receiver name.";
			} else if(!hostname.length > 3) {
				message = "Receiver name is too short.";
			} else if(receivers[hostname]) {
				message = "Receiver name is already taken.";
			} else {
				message = "Something went wrong";
			}

			res.end(JSON.stringify({
				status: false,
				message: message
			}));
		}
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

};
