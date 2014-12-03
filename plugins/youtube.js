    this.expression = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    this.fn = function(params, callback) {
        if(params.context.config.youtube_token) {
            var url = 'https://www.googleapis.com/youtube/v3/videos?id=' + params.match[7]
                + '&key=' + params.context.config.youtube_token + '&part=contentDetails,snippet';

            console.log(params.context.config);
            console.log(url);

            params.context.request(url, function (error, response, data) {
                if (!error && response && response.statusCode == 200) {

                    var youtube = JSON.parse(unescape(data));
                    if (youtube && youtube.pageInfo && youtube.pageInfo.totalResults > 0) {
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
            console.log('****** No YouTube API Key ******');
            callback({
                status: false
            });
        }
    };