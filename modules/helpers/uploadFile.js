module.exports = function(context) {

    return {
        addSocket: function(socket) {
            socket.on('newImage', this.upload);
        },
        upload: function(data) {
            var name = data.name;
            var type = data.type;
            var binary = data.data;
            var fs = require('fs');
            fs.open(context.path.resolve(__dirname, "../../uploads/", name), 'w+', 0755, function(err, fd) {
                if (!err) {
                    fs.write(fd, binary, null, 'Binary', function(err, written, buff) {
                        if(!err) {
                            fs.close(fd, function() {
                                context.global.processCarst('file://' + data.name , data.duration,  data.channel, 'File Carst', context.global.addCarstToQueue);
                            });
                        } else {
                            console.error(err);
                        }
                    });
                } else {
                    console.error(err);
                }
            });
        },
        addRoute: function() {
            context.app.get('/image/:filename', function(req, res) {
                var filename = req.params.filename;
                res.sendFile(context.path.resolve(__dirname, '../../uploads/' + filename));
            });
        }
    };

};