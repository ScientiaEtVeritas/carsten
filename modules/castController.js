module.exports = function (context) {
	var carsts = [];

	//send update event to all connected sockets
	function pushUpdateEvent(){
		for( var i = 0; i < context.sockets.length; i++ )
		{
			var socket = context.sockets[i];
			socket.broadcast.emit('update');	
		}	
	}

	//post a carst
	context.app.post('/rest/carst', function (req, res) {
		carsts.push({ url: req.body.url });
		res.send({});
		pushUpdateEvent();
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
