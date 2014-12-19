module.exports = function(context) {

    function send_meme(url, callback) {
        url = url || "http://9gag.com/random";
        context.request(url, function(err, res, body) {
            if(!err && res.statusCode == 302) {
                send_meme(res.headers['location']);
            } else if(!err && body && res.statusCode == 200) {
                var $ = context.cheerio.load(body);
                var title = $(".badge-item-title")[0].children[0].data;
                var img = $(".badge-item-img");
                var aimg = $(".badge-item-animated-img");
                var src = img[0] && img[0].attribs ? img[0].attribs.src : (aimg[0] && aimg[0].attribs ? aimg[0].attribs.src : '' );
                callback({
                    title: title,
                    src: src
                });
            }
        });
    }

    return {
        addSocket: function(socket) {
            socket.on('getRandomGag', function() {
                send_meme('', function(data) {
                    socket.emit('sendRandomGag', data);
                });
            });
        }
    };

};