module.exports = function(context) {

    var github;

    return {
        addSocket: function(socket) {
            socket.on('getLatestGithub', function(channel) {
                socket.emit('sendLatestGithub', github[channel]);
            });
        },
        addWebhook: function() {
            context.app.post('/github/:channel', function(req, res) {

                var event = req.header('X-Github-Event');
                var body = req.body;
                var channel = req.params.channel;

                github[channel] = {
                    event: event,
                    body: body
                };

                context.global.processCarst(':github', '5', '#' + channel, 'App Carst', function(carst) {
                    context.global.unshiftCarst(carst);
                });

                res.end('');

            });
        }
    };

};