this.expression = new RegExp("^((http|https)://)|(www.)", "i");
this.fn = function(params, callback) {
    params.context.request(params.input, function(err, res, body) {
        if(!err && body && res.statusCode == 200) {
            var $ = params.context.cheerio.load(body);
            var title = $('title').html();
            console.log(title);
            callback({
                status: true,
                info: {
                    icon: '<img style="position:relative; top:-3px;" src="http://www.google.com/s2/favicons?domain=' + params.input + '" />',
                    title: title && title.replace(/&#xFFFD;/gi, function() {
                        return '';
                    }) || params.input,
                    duration: params.inputDuration,
                    url: params.input
                }
            });
        } else {
            callback({
                status: false
            });
        }
    });
};