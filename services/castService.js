module.exports = function (context) {

	/* Imports */
	var uuid = require('node-uuid');
	var castService = context.services.castService;
	var rest = context.rest;

	/* Data store */
	var receivers = [];
	var locked = false;

	/**
	 * Cast URL
	 */
	castService.cast = function (receiver, url, done) {

		receiver.currentlyCasting = url;

		var args = {
			data: {
				url: url
			},
			headers: {
				'Content-Type': 'application/json'
			}
		};

		rest.post(receiver.url + '/rest/queue', args, function (data, response) {
			if (response.statusCode !== 202) {
				console.log('Error casting to receiver queue:');
				console.log(receiver)
				return done({ code: 500, message: 'Error casting to receiver' });
			}

			done(null, receiver);
		});
	};

	/**
	 * Get receiver by ID
	 */
	castService.getReceiverById = function (id, done) {

		for (var i = 0; i < receivers.length; i++) {
			if (receivers[i].id == id) {
				return done(null, receivers[i]);
			}
		}
		
		done({ code: 404, message: 'Receiver not found'}, null);
	};

	/**
	 * Get all connected receivers
	 */
	castService.getReceivers = function (done) {
		console.log('getReceivers')

		if (receivers.length === 0)
			return done(null, []);

		while (locked) console.log('LOCKED'); // Wait while locked
		console.log('UNLOCKED');

		locked = true;

		// Make sure we don't return offline receivers
		var checkOffline = false; // TODO env variable
		if (checkOffline) {
			var offlineIndexes = [];

			var i = 0;
			var walk = function () {
				rest.get(receivers[i], function (data, response) {
					if (i === receivers.length) {
						locked = false;

						// Remove offline receivers
						offlineIndexes.forEach(function (offlineIndex) {
							console.log('Removing offline receiver ' + offlineIndex);
							receivers.splice(offlineIndex, 1);
						});

						done(null, receivers);
					}

					if (response.status !== 200) {
						offlineIndexes.push(i);
					}

					i++;
					walk();
				});
			};
		}
		else {
			locked = false;
			done(null, receivers);
		}
	};

	/**
	 * Add a receiver
	 */
	castService.addReceiver = function (newReceiver, done) {
		while (locked);
		locked = true;

		for (var i = 0; i < receivers.length; i++) {
			if (receivers[i].url == newReceiver.url) {
				console.log('Receiver already registered.');
				newReceiver.id = receivers[i].id;
				receivers[i] = newReceiver;
				locked = false;
				return done(null, receivers[i]);
			}
		}

		// Generate UUID
		newReceiver.id = uuid.v4();

		receivers.push(newReceiver);

		locked = false;
		done(null, newReceiver);
	};
};