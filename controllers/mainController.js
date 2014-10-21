
module.exports = function (context) {
	// GET anything
	context.app.get('/*', function (req, res) {
		console.log('GET /' + req.params[0]);

		var path = req.params[0] ? req.params[0] : 'index.html';

		res.sendFile(path, {root: './public'});
	});
}