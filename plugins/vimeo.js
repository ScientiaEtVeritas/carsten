this.expression = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;
this.fn = function(params, callback) {

    if(params.context.config.vimeo_token) {

        var options = {
            url: 'https://api.vimeo.com/videos/' + params.match[5],
            headers: {
                'Authorization': 'bearer ' + params.context.config.vimeo_token
            }
        };

        params.context.request(options, function (error, response, data) {
            if (!error && response && response.statusCode == 200) {
                var vimeo = JSON.parse(unescape(data));

                if (vimeo) {
                    var title = vimeo.name;
                    var duration = vimeo.duration + 's';

                    callback({
                        status: true,
                        info: {
                            icon: '<img style="position:relative; top:-3px;" src="http://www.google.com/s2/favicons?domain=https://vimeo.com" />',
                            title: title,
                            duration: duration,
                            url: 'https://player.vimeo.com/video/' + params.match[5] + '?autoplay=1&badge=0&byline=0&portrait=0'
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
                console.error('Error: ' + error);
                console.error('Response code: ' + response && response.statusCode);
                callback({
                    status: false
                });
            }
        });
    } else {
        console.log('****** No Vimeo API Key ******');
        callback({
            status: false
        });
    }
};