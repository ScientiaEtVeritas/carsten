this.expression = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;
this.fn = function(params, callback) {

    var options = {
        url: 'https://api.vimeo.com/videos/' + params.match[5], 
        headers: {
            'Authorization': 'bearer ' + params.context.config.vimeo_token
        }
    };

    params.context.request(options, function (error, response, data) {
        if (!error && response.statusCode == 200) {
            var vimeo = JSON.parse(unescape(data));

            if (vimeo) {
                console.log(vimeo.duration);
                var icon = '<span class="glyphicon glyphicon-facetime-video"></span> ';
                var title = vimeo.name;
                var duration = vimeo.duration + 's';
                
                callback({
                    status: true,
                    info: {
                        icon: icon,
                        title: title,
                        duration: duration
                    }
                });
            } else {
                callback({
                    status: false
                });
            }
        }
        else {
            console.error('Plugin error!');
            console.error(error);
            console.error('Response code: ' + response.statusCode);
            callback({
                status: false
            });
        }
    });
};