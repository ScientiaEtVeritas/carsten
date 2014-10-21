
module.exports = function (context) {

	/* Imports */
	var castService = context.services.castService;

	/* Route definitions */

	// GET /
	context.app.get('/', function (req, res) {
		console.log('GET /');

		// Deliver index.html
		res.send(200, 'OK');
	});

	// GET /rest/receivers
	context.app.get('/rest/receivers', function (req, res) {
		console.log('GET /rest/receivers');

		castService.getReceivers(function (err, receivers) {
			if (err) {
				console.err(err);
				return res.send(500);
			}
			res.send(receivers);
		})
	});

	// POST /rest/receivers
	context.app.post('/rest/receivers', function (req, res) {
		console.log('POST /rest/receivers');
		console.log(req.body);

		if (!req.body || !req.body.url) {
			console.log('Invalid request');
			return res.send(400);
		}

		castService.addReceiver(req.body, function (err, newReceiver) {
			if (err) {
				console.err(err);
				return res.send(500);
			}

			res.send(201);
		});
	});
};