module.exports = function(context) {

    // moongoose Schema for defaultCarst
    var defaultCarstSchema = context.mongoose.Schema({
        channel: String,
        url: String,
        id: Number,
        playlist: {
            title: String,
            carsts: [{
                id: Number,
                title: String,
                url: String,
                time: Number,
                timeString: String
            }]
        }
    });

    var DefaultCarstModel = context.mongoose.model('DefaultCarst', defaultCarstSchema);

    return {
        load: function(callback) {
            var defaultCarst = {};
            var defaultCarstStatus = {};
            DefaultCarstModel.find(function(err, dcResults) {
                if(!err) {
                    dcResults.forEach(function(defaultCarstRes) {
                        if(defaultCarstRes.url && defaultCarstRes.url != null) {
                            console.log("DEFAULT CARST FOR " + defaultCarstRes.channel + " IS " + defaultCarstRes.url);
                            var channel = defaultCarstRes.channel;
                            defaultCarst[channel] = defaultCarstRes;
                            defaultCarstStatus[channel] = {
                                status: false,
                                timeout: undefined
                            };
                        }
                    });
                    callback({
                        defaultCarst: defaultCarst,
                        defaultCarstStatus: defaultCarstStatus
                    });
                    console.log("\n*-------- " + dcResults.length + " DEFAULT CARST(S) LOADED --------*\n");
                } else {
                    console.error('Default Carst DB Query Error: ' + err);
                }
            });
        },
        update: function(channel, carst, callback) {
            DefaultCarstModel.findOneAndUpdate({channel:channel}, carst , {upsert: true}, function(err, data) {
                if(!err) {
                    console.log('\n*------ DEFAULT CARST ADDED TO DATABASE ------*');
                } else {
                    console.error('Add New Default Carst DB Query Error: ' + err);
                }
                callback();
            });
        }
    };

};