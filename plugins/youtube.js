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
                        var title = youtube.items[0].snippet.title;
                        var duration = youtube.items[0].contentDetails.duration;

                        callback({
                            status: true,
                            info: {
                                icon: '<img style="position:relative; top:-3px;" src="http://www.google.com/s2/favicons?domain=http://youtube.de" />',
                                title: title,
                                duration: duration,
                                url: 'http://www.youtube.com/embed/' + params.match[7] + '?hd=1?&autoplay=1&rel=0&showinfo=0&disablekb=1&controls=0&modestbranding=1&iv_load_policy=3'
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