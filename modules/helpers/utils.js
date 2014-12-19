module.exports = function(context) {

    function formatTime(arr) {
        var str = '';
        arr.forEach(function (a, i) {
            str += (i === 0 ? '' : ':') + ('0' + a).slice(-2);
        });
        return str;
    }

    function newFormatTime(sec, withSec) {
        var hours = Math.floor(sec / 3600);
        var minutes = Math.floor((sec - (hours * 3600)) / 60);
        var seconds = sec - (minutes * 60 + hours * 3600);
        return ((hours > 0 ? hours + 'h ' : '') + (minutes > 0 ? ('0' + Math.round(minutes)).slice(-2) + "' " : '') + (seconds > 0 && withSec ? ('0' + Math.round(seconds)).slice(-2) + '"' : '')).trim();
    }

    var logNum = 0;

  return {

    // log sending to receiver
    logSending: function(host, type, obj, fn, channel) {
        context.io.sockets.emit('log', 'Sending to receiver');
        console.log('\n\n*------ SENDING TO RECEIVER ' + logNum + ' === START ------*' +
        '\nTo: ', host +
        '\nType: ' + type +
        '\nObj: ', obj +
        '\nFn: ' + fn +
        '\nChannel: ' + channel + '\n');
        logNum++;
    },

      // date object to mm/dd/yyyy - hh:mm
      formatDate: function (date) {
          return (date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' - ' + formatTime([date.getHours(), date.getMinutes()]));
      },

// [a, b, ... z] to "aa:bb: ... zz"
      formatTime: formatTime,

// format seconds to 5h 04' 33"
      newFormatTime: newFormatTime,

// returns index of object by value of a key
      indexOfObject: function (array, key, value) {
          if (array) {
              for (var i = 0; i < array.length; i++) {
                  if (array[i] && array[i][key] && array[i][key].toString().toLowerCase() === value.toString().toLowerCase()) {
                      return i;
                  }
              }
          }
          return -1;
      },

      // calculate time of sockets input
      getTime: function(inputDuration) {
        var omos = /^(\d+)$/;
        var remmss = /^(\d{1,2}):(\d{1,2})$/;
        var reTime = /^(?:PT)?(?:(\d{1,2})[:.hH])?(?:(\d{1,4})[:.mM])?(?:(\d{1,6})[sS]?)?$/;

        var match;
        var resultTime;
        var timeString;

        if(omos.test(inputDuration)) {
            match = (inputDuration + '').match(omos);
            resultTime = (match[1] && +match[1]*60000 || 0);
        } else if(remmss.test(inputDuration)) {
            match = inputDuration.match(remmss);
            resultTime = (match[1] && +match[1]*60000 || 0) + (match[2] && +match[2]*1000 || 0);
        } else if(reTime.test(inputDuration)) {
            match = inputDuration.match(reTime);
            resultTime = (match[1] && +match[1]*3600000 || 0) + (match[2] && +match[2]*60000 || 0) + (match[3] && +match[3]*1000 || 0);
        }

        resultTime = resultTime || 1800000;

        timeString = newFormatTime(resultTime/1000, true);

        return {
            resultTime: resultTime,
            timeString: timeString
        };
    },

      setEndTime: function(carsts,channel) {
          carsts[channel][0].endTime = +(new Date()) + +carsts[channel][0].time;
      },

// format milliseconds to  hrs, min and sec in an array
      getPartsOfMilliseconds: function (time) {
          var hrs = Math.floor(time / 3600000);
          var min = Math.floor((time - hrs * 3600000) / 60000);
          var sec = (time - (min * 60000)) / 1000;
          return [hrs, min, sec];
      }
  };
};