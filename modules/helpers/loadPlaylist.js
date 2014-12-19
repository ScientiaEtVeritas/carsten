module.exports = function(context) {

    // mongoose Schema for playlists
    var playlistsSchema = context.mongoose.Schema({
        title: String,
        carsts: [{
            id: Number,
            title: String,
            url: String,
            time: Number,
            timeString: String
        }]
    });

    // mongoose Model for playlists
    var PlaylistsModel = context.mongoose.model('Playlists', playlistsSchema);


    return {
        load: function() {
            PlaylistsModel.find(function(err, playlistsResults) {
                context.global.playlists = playlistsResults;
                console.log('\n*------ ' +  context.global.playlists.length + ' PLAYLIST(S) LOADED ------*');
            });
        },
        update: function(id, playlist, socket) {
            PlaylistsModel.findOneAndUpdate({_id:id}, playlist, function(err, data) {
                    if(!err) {
                        console.log('\n*------ PLAYLIST UPDATED IN DATABASE ------*');
                        var pos = require('../helpers/utils').indexOfObject( context.global.playlists, '_id', data._id);
                        if(pos !== - 1) {
                            context.global.playlists.splice(pos, 1);
                        }
                        context.global.playlists.push(playlist);
                        socket.emit('openPlaylistSuccess', playlist);
                        context.global.updateSockets();
                    } else {
                        console.log(err);
                        socket.emit('openPlaylistError');
                    }
            });
        },
        save: function(data, socket) {
            var playlist = new PlaylistsModel(data);
            playlist.save(function(err, data) {
                        if(!err) {
                            console.log('\n*------ PLAYLIST ADDED TO DATABASE ------*');
                            context.global.playlists.push(data);
                            //socket.emit('openPlaylistSuccess', data);
                            context.global.updateSockets();
                        } else {
                            console.log(err);
                            //socket.emit('openPlaylistError');
                        }
            });
        },
        remove: function(id) {
            PlaylistsModel.remove( {"_id": id}, function(err) {
                if(!err) {
                    console.log('\n*------ PLAYLIST REMOVED FROM DATABASE ------*');
                    context.global.updateSockets();
                } else {
                    console.error(err);
                }
            });
        }
    };

};