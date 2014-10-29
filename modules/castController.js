module.exports = function (context) {
	var carsts = [];

	//post a carst
	context.app.post('/rest/carst', function (req, res) {
		carsts.push({ url: req.body.url });
		res.send({});
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

	//get queue time
	context.app.get('/rest/queuetime', function (req, res) {
		res.send({"queuetime":context.config.queueTime});
	});

	//remove first carst
	setInterval(function(){
		carsts.shift();
	}, context.config.queueTime);
};
