module.exports = function (context) {
	var carsts = [];

	//send update event to all connected sockets
	function pushUpdateEvent(){
		for( var i = 0; i < context.sockets.length; i++ )
		{
			var socket = context.sockets[i];
			socket.emit('update');	
		}	
	}

	//post a carst
	context.app.post('/rest/carst', function (req, res) {
		carsts.push({ url: req.body.url });
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
		    carsts.push({ url: url });
		    pushUpdateEvent();
		    var response = {"text":"carsted"};
		    res.send(response);
		  }
		}
	});

	//get carst
	context.app.get('/rest/carst', function (req, res) {
		var carst = {};
		if(carsts.length > 0)
		{
			carst = carsts[0];
		}
		res.send(carst);
	});

	//get all carsts
	context.app.get('/rest/carsts', function (req, res) {
		res.send(carsts);
	});

	//remove first carst
	setInterval(function(){
		carsts.shift();
		pushUpdateEvent();
	}, context.config.queueTime);
};
