module.exports = function(context) {
    // moongoose Schema for events
    var eventsSchema = context.mongoose.Schema({
        channel: String,
        eventHour: Number,
        eventMin: Number,
        eventCarst: {
            title: String,
            url: String,
            time: Number,
            timeString: String,
            id: Number,
            endTime: Number
        }
    });

    // mongoose Model for events
    var EventsModel = context.mongoose.model('Events', eventsSchema);

    // loop through all events and set timeouts
    function setTimeoutForEvents() {
        for(var channel in context.global.events) {
            if(context.global.carsts[channel]) {
                context.global.events[channel].forEach(function (event) {
                    setTimeoutForEvent(event);
                });
            }
        }
        setTimeout(setTimeoutForEvents, 86400000);
    }

    // calculate time for timeout
    function setTimeoutForEvent(event) {
        var currentTime = new Date();
        var rest = ((event.eventHour - currentTime.getHours())*3600000) + ((event.eventMin - currentTime.getMinutes()) * 60000);
        if(rest > 0) {
            raiseEvent(event, rest);
        } else {
            raiseEvent(event, 86400000 + rest);
        }
    }

    // set timeout for an event and replace first carst
    function raiseEvent(event, rest) {

        var date = new Date(new Date().getTime() + rest);
        console.log('\n******* Event ' + event._id + ' will be raised on ' + event.channel + ' at ' + require('../helpers/utils')().formatDate(date));

        context.global.eventTimeouts[event._id] = setTimeout(function() {
            clearTimeout(context.global.currentTimeout);
            if(context.global.carsts[event.channel]) {
                context.global.carsts[event.channel].unshift(event.eventCarst);
                require('./utils')(context).setEndTime(context.global.carsts, event.channel);
                context.global.sendToReceivers(event.channel, 'carst', context.global.carsts[event.channel][0]);
                context.global.updateSockets();
            }
            delete context.global.eventTimeouts[event._id];
        }, rest);
    }

    return {
        load: function() {
            EventsModel.find(function(err, eventsResult) {
                eventsResult.forEach(function(event, index) {
                    context.global.events[event.channel] = context.global.events[event.channel] || [];
                    context.global.gID++;
                    event.eventCarst.id = context.global.gID;
                    context.global.events[event.channel].push(event);
                });
                setTimeoutForEvents();
            });
        },
        setTimeouts: setTimeoutForEvents,
        save: function(event, socket) {
            event = new EventsModel(event);
            event.save(function(err, data) {
                    if(!err) {
                        console.log('\n*------ EVENT ADDED TO DATABASE ------*');
                        context.global.gID++;
                        data.eventCarst.id = context.global.gID;
                        context.global.events[data.channel].push(data);
                        //socket.emit('newEventSuccess');
                        setTimeoutForEvent(data);
                    } else {
                        console.error('New Event DB Query Error: ' + err);
                        //socket.emit('newEventError');
                    }
                    context.global.updateSockets();
            });
        },
        setTimeout: setTimeoutForEvent,
        remove: function(id) {
            EventsModel.remove( {"_id": id}, function(err) {
                if(err) {
                    console.error(err);
                } else {
                    clearTimeout(context.global.eventTimeouts[id]);
                    delete context.global.eventTimeouts[id];
                    context.global.updateSockets();
                    console.log('\n*------ EVENT REMOVED FROM DATABASE ------*');
                }
            });
        }
    };
};