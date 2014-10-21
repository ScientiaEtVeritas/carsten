module.exports = function (context) {

	/* Imports */
	var castService = context.services.castService;

	// POST /rest/cast
	context.app.post('/rest/cast', function (req, res) {

		if (!req.body || !req.body.id) {
			console.error('Invalid body sent');
			return res.status(400).end();
		}

		castService.getReceiverById(req.body.id, function (err, receiver) {
			if (err) {
				console.log('Error getting receiver by id');
				console.log(err);
				return res.status(err.code).end();
			}

			castService.cast(receiver, req.body.url, function (err) {
				if (err) {
					console.log('Error with casting to receiver');
					return res.status(500).end();
				}

				res.status(202).end();
			});
		});
	});

	// GET /rest/receivers
	context.app.get('/rest/receivers', function (req, res) {
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