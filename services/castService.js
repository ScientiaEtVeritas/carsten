module.exports = function (context) {

	/* Imports */
	var castService = context.services.castService;
	var rest = context.rest;

	/* Data store */
	var receivers = [];
	receivers.locked = false;

	// Get all registered receivers
	castService.getReceivers = function (done) {
		console.log('getReceivers')

		if (receivers.length === 0)
			return done(null, []);

		while (receivers.locked) console.log('LOCKED'); // Wait while locked
		console.log('UNLOCKED');

		receivers.locked = true;

		// Make sure we don't return offline receivers
		var checkOffline = false; // TODO env variable
		if (checkOffline) {
			var offlineIndexes = [];

			var i = 0;
			var walk = function () {
				rest.get(receivers[i], function (data, response) {
					if (i === receivers.length) {
						receivers.locked = false;

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
			receivers.locked = false;
			done(null, receivers);
		}
	};

	// Add receiver
	castService.addReceiver = function (newReceiver, done) {
		while (receivers.locked);
		receivers.locked = true;

		for (var i = 0; i < receivers.length; i++) {
			if (receivers[i].url == newReceiver.url) {
				receivers[i] = newReceiver;
				return done(null, receivers[i]);
			}
		}

		receivers.push(newReceiver);
		receivers.locked = false;
		done(null, newReceiver);
	};
};