module.exports = function (context) {
	var gID = 0;
	var carsts = [];
	var defers = [];
	var lastDefers = [];

	//send update event to all connected sockets
	function pushUpdateEvent(){
		for( var i = 0; i < context.sockets.length; i++ )
		{
			var socket = context.sockets[i];
			socket.emit('update');	
		}	
	}

	function sendCast() {
		if(typeof carsts[0] !== "undefined") {
			defers.forEach(function(defer) {
				console.log(carsts[0].id + ' - - - ' +  lastDefers[defer.receiver]);
			//	if (lastDefers[defer.receiver] !== carsts[0].id) {
					console.log('sendCast()' + carsts[0].url);
					defer.respond.send({url: carsts[0].url});
					lastDefers[defer.receiver] = carsts[0].id;
			//	}
			});
			defers = [];
		}
	}

	//post a carst
	context.app.post('/rest/carst', function (req, res) {
		gID++;
		var newCarst = {
			id: gID,
			url: req.body.url
		};
		carsts.push(newCarst);
		if(carsts[0] === newCarst) {
			defers.forEach(function(defer) {
				console.log('postCarst' + carsts[0]);
				defer.respond.send({ url: req.body.url });
				lastDefers[defer.receiver] = carsts[0].id;
			});
			defers = [];
		}

		res.send({});
		pushUpdateEvent();
	});

	//post a carst from slack
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
	});

	//get carst
	context.app.get('/rest/carst', function (req, res) {
		var carst = {};
		console.log(carsts);
		if(carsts.length > 0 && carsts[0].id !== lastDefers[req.hostname]) {
			console.log(carsts[0].id + ' --- ' + lastDefers[req.hostname]);
			console.log('getCarst' + carsts[0]);
			carst = carsts[0];
			res.send(carst);
		} else {
			defers.push({receiver: req.hostname, respond : res});
		}
	});

	//get all carsts
	context.app.get('/rest/carsts', function (req, res) {
		res.send(carsts);
	});

	context.app.post('/remove/carst', function(req, res) {
		console.log(req.body);
		var position = indexOfObject(carsts, 'id', req.body.id);
		if ( position !== null) {
			carsts.splice(position, 1);
			sendCast();
			pushUpdateEvent();
			res.send({});
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

	//remove first carst
	//setInterval(function(){
	//	carsts.shift();
	//	sendCast();
	//	pushUpdateEvent();
	//}, context.config.queueTime);
};
