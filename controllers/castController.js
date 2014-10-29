module.exports = function (context) {

	/* Imports */
	var castService = context.services.castService;

	// POST /rest/cast
	context.app.post('/rest/cast', function (req, res) {
		for( var i = 0; i < context.sockets.length; i++ )
		{
		  context.sockets[i].emit('carst', { url: req.body.url });
		}
		res.status(200).end();
	});

	// GET /rest/receivers
	context.app.get('/rest/receivers', function (req, res) {

		//var clients = context.app.socket;
		//console.log(context.app.io.sockets.clients);

		console.log('GET /rest/receivers');

		castService.getReceivers(function (err, receivers) {
			if (err) {
				console.err(err);
				return res.status(500).end();
			}
			console.log(receivers);
			res.send(receivers);
		})
	});

	// POST /rest/receivers
	context.app.post('/rest/receivers', function (req, res) {
		console.log('POST /rest/receivers');
		console.log(req.body);

		if (!req.body || !req.body.url) {
			console.log('Invalid request');
			return res.status(400).end();
		}

		castService.addReceiver(req.body, function (err, newReceiver) {
			if (err) {
				console.err(err);
				return res.status(500).end();
			}

			res.status(201, newReceiver).end();
		});
	});
};