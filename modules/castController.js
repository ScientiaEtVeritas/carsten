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
			id: Number,
			endTime: Number
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

	var currentTimeout; // reference to the timeout of the current carst

	// regular expression to identify input
	var regExp = {};
	regExp.carst = new RegExp("^((http|https)://)|(www.)", "i");
	regExp.app = new RegExp("^:", "i");
	regExp.playlist = new RegExp("^#(.*)$", "i");
	regExp.command = new RegExp("^/(.*)$", "i");

	var receiversockets; // Socket connection to all receivers

	var capture = {}; // latest screenshots for all channels

	var github = {};

	var carstHistory = [];

	// serversided commands
	var scommands = {
		'clear' : function(data) {
			var channel = data.channel;
			if(carsts[channel].length > 0) {
				carsts[channel] = [];
				sendDefault(channel);
				updateSockets();
			}
		},
		'reset' : function(data) {
			var channel = data.channel;
			if(carsts[channel].length > 0) {
				clearTimeout(currentTimeout);
				setEndTime(channel);
				sendToReceivers(channel, 'carst', carsts[channel][0]);
				updateSockets();
			}
		}
	};

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
		if(!err) {
			dcResults.forEach(function(defaultCarstRes) {
				if(defaultCarstRes.url && defaultCarstRes.url != null) {
					console.log("DEFAULT CARST FOR " + defaultCarstRes.channel + " IS " + defaultCarstRes.url);
					var channel = defaultCarstRes.channel;
					defaultCarst[channel] = defaultCarstRes;
					defaultCarstStatus[channel] = {
						status: false,
						timeout: undefined
					};
				}
			});
			console.log("\n*-------- " + dcResults.length + " DEFAULT CARST(S) LOADED --------*\n");
		} else {
			console.error('Default Carst DB Query Error: ' + err);
		}
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
				setEndTime(event.channel);
				sendToReceivers(event.channel, 'carst', carsts[event.channel][0]);
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

	// format seconds to 5h 04' 33"
	function newFormatTime(sec, withSec) {
		var hours = Math.floor(sec/3600);
		var minutes = Math.floor((sec - (hours * 3600))/60);
		var seconds = sec - (minutes * 60 + hours * 3600);
		return (hours > 0 ? hours+'h ' : '') + (minutes > 0 ? ('0' + Math.round(minutes)).slice(-2) + "' " : '') + (seconds > 0 && withSec ? ('0' + Math.round(seconds)).slice(-2)+'"' : '');
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

	// format milliseconds to  hrs, min and sec in an array
	function getPartsOfMilliseconds(time) {
		var hrs = Math.floor(time/3600000);
		var min = Math.floor((time - hrs*3600000)/60000);
		var sec = (time - (min*60000))/1000;
		return [hrs, min, sec];
	}

	// returns true or false depending if parameter is integer or not
	Number.isInteger = Number.isInteger || function(int) {
		return (Math.floor(int) === +int);
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

	function setEndTime(channel) {
		carsts[channel][0].endTime = +(new Date()) + +carsts[channel][0].time;
	}


	// delete a carsts, remove it from the queue
	function deleteCarst(channel, id) {
		var position = indexOfObject(carsts[channel], 'id', id);
		if ( position !== -1) {
			carsts[channel].splice(position, 1);
			if(position === 0 && typeof carsts[channel][0] !== "undefined") {
				sendToReceivers(channel, 'carst', carsts[channel][0]);
				setEndTime(channel);
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
		sendToSocket(socket, 'sendCarsts', carsts);
		sendToSocket(socket, 'sendCommands', commands);
		sendToSocket(socket, 'sendPlaylists', playlists);
		sendToSocket(socket, 'sendEvents', events);
		sendToSocket(socket, 'sendCarstHistory', carstHistory);
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
		addToCarstHistory(carst.url);
		gID++;
		carst.id = gID;
		clearTimeout(currentTimeout);
		carsts[carst.channel].unshift(carst);
		setEndTime(carst.channel);
		sendToReceivers(carst.channel, 'carst', carsts[carst.channel][0]);
		context.io.sockets.emit('tossing');
		updateSockets();
	}

	// add a specific carst to carsts queue
	function addCarstToQueue(carst) {
		gID++;
		carst.id = gID;
		var channel = carst.channel;
		if(carsts[channel]) {
			carsts[channel].push(carst);
			if(carsts[channel][0] === carst) {
				setEndTime(channel);
				defaultCarstStatus[channel].status = false;
				clearTimeout(defaultCarstStatus[channel].timeout);
				sendToReceivers(channel, 'carst', carsts[channel][0]);
			}
			context.io.sockets.emit('tossing');
			updateSockets();
		}
	}

	// calculate time of sockets input
	function getTime(inputDuration) {
		var omos = /^(\d+)$/;
		var remmss = /^(\d{1,2}):(\d{1,2})$/;
		var reTime = /^(?:PT)?(?:(\d{1,2})[:.hH])?(?:(\d{1,4})[:.mM])?(?:(\d{1,6})[sS]?)?$/;

		var match;
		var resultTime;
		var timeString;

		if(omos.test(inputDuration)) {
			match = (inputDuration + '').match(omos);
			resultTime = (match[1] && +match[1]*60000 || 0);
		} else if(remmss.test(inputDuration)) {
			match = inputDuration.match(remmss);
			resultTime = (match[1] && +match[1]*60000 || 0) + (match[2] && +match[2]*1000 || 0);
		} else if(reTime.test(inputDuration)) {
			match = inputDuration.match(reTime);
			resultTime = (match[1] && +match[1]*3600000 || 0) + (match[2] && +match[2]*60000 || 0) + (match[3] && +match[3]*1000 || 0);
		}

		resultTime = resultTime || 1800000;

		timeString = newFormatTime(resultTime/1000, true);

		return {
			resultTime: resultTime,
			timeString: timeString
		};
	}

	// create carst object
	function processCarst(input, inputDuration, channel, callback) {
		processPlugins({
			input: input,
			inputDuration: inputDuration,
			channel: channel
		}, function(data) {
			var time;
			var carst;
			if(data.status) {
				time = getTime(data.info.duration);
				carst = {
					title: data.info.icon + ' ' + data.info.title,
					url: data.info.url,
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

	function addToCarstHistory(input) {
		var index = indexOfObject(carstHistory, 'url', input);
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
		processCarst(data.input, data.inputDuration, data.channel, addCarstToQueue);
	}

	// playlist: validation, convert user input to common format
	function handlePlaylist(data, callback) {
		var match = data.input.match(regExp.playlist);
		var index;
		if(match) {
			index = indexOfObject(playlists, 'title', match[1]);
		} else {
			callback(undefined);
		}
		if(index === -1) {
			callback(undefined);
		} else {
			callback(playlists[index]);
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
			sendToReceivers(channel, 'command', commands[channel][commands[channel].length - 1]);
		}
		updateSockets();
	}

	/**************************************************************/
	/************************ FOR RECEIVERS ***********************/
	/**************************************************************/

	// send a carst/command to one specific receiver
	function sendToReceiver(socket, type, obj) {
		socket.emit(type, obj);
		logSending(socket.hostname, type, obj, 'sendToReceiver', '-');
	}

	// send a carst/command to all receivers
	function sendToReceivers(channel, type, obj) {

		if(carsts[channel].length !== 0) {
			defaultCarstStatus[channel].status = false;
		}
		if(type === 'carst') {
			currentTimeout = setTimeout(function() {
				deleteCarst(channel, obj.id);
			}, obj.time);
		}

		logSending('all', type, obj, 'sendToReceivers', channel);
		receiversockets.emit(type, obj);
	}

	/**********************************************************************************/
	/************************ COMMUNICATION WITH CLIENT SOCKET ************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	context.io.on('connection', function (socket) {

		socket.emit('differentTime', new Date().getHours());
		socket.emit('capture', capture);

		/**************************************************************/
		/*********************** SOCKET CONNECT ***********************/
		/**************************************************************/

		console.log('\n*********************\n' + socket.id + ": OPENED SOCKET CONNECTION\n*********************\n");

		context.sockets[socket.id] = socket;
		updateSocket(socket);

		socket.on('getRandomGag', function() {
			function send_meme(url) {
				url = url || "http://9gag.com/random";
				context.request(url, function(err, res, body) {
					if(!err && res.statusCode == 302) {
						send_meme(res.headers['location']);
					} else if(!err && body && res.statusCode == 200) {
						var $ = context.cheerio.load(body);
						var title = $(".badge-item-title")[0].children[0].data;
						var img = $(".badge-item-img");
						var aimg = $(".badge-item-animated-img");
						var src = img[0] && img[0].attribs ? img[0].attribs.src : (aimg[0] && aimg[0].attribs ? aimg[0].attribs.src : '' );
						socket.emit('sendRandomGag', {
							title: title,
							src: src
						});
					}
				});
			}
			send_meme();
		});

		socket.on('getLatestGithub', function(channel) {
			socket.emit('sendLatestGithub', github[channel]);
		});

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
						processCarst('file://' + name , data.duration,  data.channel, addCarstToQueue);
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
					setEndTime(channel);
					clearTimeout(currentTimeout);
					sendToReceivers(channel, 'carst', carsts[channel][0]);
				}
				updateSockets();
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
										socket.emit('openPlaylistSuccess', data);
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
										socket.emit('openPlaylistSuccess', playlist);
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

			console.log(data);

			defaultCarst[channel] = {
				id : -2,
				channel: channel,
				url : data.defaultCarst,
				playlist: undefined
			};

			console.log(defaultCarst[channel]);
			if(carsts[channel].length === 0) {
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
						sendToReceivers(channel, 'carst', defaultCarst[channel]);
					}

					defaultCarst[channel].channel = channel;

					DefaultCarstModel.findOneAndUpdate({channel:channel}, defaultCarst[channel], {upsert: true}, function(err, data) {
						if(!err) {
							console.log('\n*------ DEFAULT CARST ADDED TO DATABASE ------*');
						} else {
							console.error('Add New Default Carst DB Query Error: ' + err);
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

			console.log(data);

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
							console.error('New Event DB Query Error: ' + err);
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
	/********************* COMMUNICATION WITH RECEIVER SOCKETS ************************/
	/**********************************************************************************/
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
			var hostname = data.hostname;
			socket.channel = channel;
			socket.hostname = hostname;

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


				if(!receivers[hostname]) {
					receivers[hostname] = receivers[hostname] || channel;
				}

				if(!countReceivers[channel]) {
					countReceivers[channel] = 0;
				}

				if(!events[channel]) {
					events[channel] = [];
				}

				countReceivers[channel]++;

				updateSockets();

				context.io.sockets.emit('message', {
					title: hostname,
					options: {
						body: "receiver called " + hostname + " joined channel " + channel,
						icon: '../img/info-icon.png'
					},
					channel: channel,
					counter: '' + countReceivers[channel]
				});

				socket.emit('registrationSuccessfully');
				if(carsts[channel].length > 0) {
					sendToReceiver(socket, 'carst', carsts[channel][0]);
				} else if(carsts[channel].length === 0) {
					if(defaultCarst[channel].playlist && defaultCarst[channel].playlist != 'null' && defaultCarstStatus[channel].status) {
						defaultCarst[channel].playlist.carsts[countPosDC[channel]-1].id = -2;
						sendToReceiver(socket, 'carst', defaultCarst[channel].playlist.carsts[countPosDC[channel]-1]);
					} else {
						sendToReceiver(socket, 'carst', defaultCarst[channel]);
					}
				}
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

				socket.emit('registrationFailed', message);
			}
		});

		/**************************************************************/
		/*********************** SOCKET DISCONNECT ********************/
		/**************************************************************/

		socket.on('disconnect', function() {
			var hostname = socket.hostname;
			var channel = socket.channel;
				countReceivers[channel]--;
				delete receivers[hostname];
				if(countReceivers[channel] === 0 && channel !== channels[0]) {
					closeChannel(channel);
					updateSockets();
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
		});

	});

	/**********************************************************************************/
	/**************************** COMMUNICATION REST ROUTES ***************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/
	/**********************************************************************************/

	/**************************************************************/
	/************************ GITHUB WEBHOOKS *********************/
	/**************************************************************/

	context.app.post('/github/:channel', function(req, res) {

		var event = req.header('X-Github-Event');
		var body = req.body;
		var channel = req.params.channel;

		github[channel] = {
			event: event,
			body: body
		};

		console.log(event);
		console.log('*************************************************');
		console.log('*************************************************');
		console.log('*************************************************');
		console.log('*************************************************');
		console.log('*************************************************');
		console.log(body);
		console.log(channel);
		console.log('*************************************************');
		console.log('*************************************************');
		console.log('*************************************************');

		processCarst(':github', '5', '#' + channel, function(carst) {
			unshiftCarst(carst);
		});


		switch(body.action) {
			case 'opened':
				console.log('*** REPOSITORY ***');
				console.log('Name: ' + body.repository.full_name);
				console.log('Description: ' + body.repository.description);
				console.log('*** ISSUE OPENED ***');
				console.log('Title: ' + body.issue.title);
				console.log('User: ' + body.issue.user.login);
				console.log('Avatar: ' + body.issue.user.avatar_url);
				console.log('Message: ' + body.issue.body);
				//console.log('Labels: ', body.issue.labels[0].name, body.issue.labels[0].color);
				break;
			case 'labeled':
				console.log('*** ISSUE LABELED ***');
				break;
			case 'reopened':
				console.log('*** ISSUE REOPENED ***');
				break;
			case 'closed':
				console.log('*** ISSUE CLOSED ***');
				break;
		}

		res.end('');

	});

	/**************************************************************/
	/************************* UPLOAD IMAGES **********************/
	/**************************************************************/

	context.app.get('/image/:filename', function(req, res) {
		var filename = req.params.filename;
		res.sendFile(require('path').resolve(__dirname, '../uploads/' + filename));
	});

	/**************************************************************/
	/********************** DOWNLOAD EXTENSION ********************/
	/**************************************************************/

	context.app.get('/extension', function (req, res) {
		var file = require('path').resolve(__dirname, '../extension/carsten-extension.crx');
		res.download(file);
	});

	/**************************************************************/
	/*********************** SLACK INTEGRATION ********************/
	/**************************************************************/

	/*context.app.post('/rest/slack_carst', function (req, res) {
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
