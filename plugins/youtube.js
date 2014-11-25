    this.expression = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    this.fn = function(result, callback) {
        if(result.http_options) {
            result.http_options.path += 'https://www.googleapis.com/youtube/v3/videos?id=' + result.match[7] + '&key=AIzaSyAo5CYVQw-SkbyVeuDcaaGzX8jTLUUcO2M&part=contentDetails,snippet';
        } else {
            result.http_options = 'https://www.googleapis.com/youtube/v3/videos?id=' + result.match[7] + '&key=AIzaSyAo5CYVQw-SkbyVeuDcaaGzX8jTLUUcO2M&part=contentDetails,snippet';
        }
        console.log(result.http_options);
        result.https.get(result.http_options, function(res) {
            if(+res.statusCode === 200) {
                var data = '';
                res.on('data', function (chunk) {
                    data += chunk;
                });

                res.on('end', function () {
                    var youtube = JSON.parse(unescape(data));
                    if(youtube && youtube.pageInfo && youtube.pageInfo.totalResults > 0) {
                        var icon = '<span class="glyphicon glyphicon-facetime-video"></span> ';
                        var title = youtube.items[0].snippet.title;
                        var duration = youtube.items[0].contentDetails.duration;
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