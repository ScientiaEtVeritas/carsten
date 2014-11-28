this.expression = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;
this.fn = function(result, callback) {
    if(result.http_options) {
        result.http_options.path += 'https://api.vimeo.com/videos/' + result.match[5] + '';
    } else {
        result.http_options = {
            host: 'api.vimeo.com',
            path: '/videos/' + result.match[5]
        };
    }
    result.http_options.headers = {
        'Authorization': 'bearer 1d9c7560ea4e93ddd3205e1d0fd9dd54'
    };
    console.log(result.http_options);
   var req = result.https.get(result.http_options, function(res) {
        if(+res.statusCode === 200) {
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });

            res.on('end', function () {
                var vimeo = JSON.parse(unescape(data));
                console.log(vimeo.duration);
                if(vimeo) {
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
            });
        } else {
            callback({
                status: false
            });
        }
    });
};