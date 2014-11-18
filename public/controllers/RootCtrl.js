app.filter('to_html', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}]);

app.controller('RootCtrl', ['$scope', '$http', '$rootScope', '$location', '$window',
  function ($scope, $http, $rootScope, $location, $window) {

    $scope.newPlaylist = [{
      id: 0,
      title: '',
      url: 'sample carst',
      time: '',
      timeString: 'mm:ss'
    }];
    
    $scope.input = '';
    $scope.inputDuration = '';
    $scope.defaultCarst = [];
    $scope.carsts = [];
    $scope.commands = [];
    $scope.countReceivers = [];
    $scope.playlists = [];

    var playlistError = false;

    function showMessage(title, options) {
      if ("Notification" in $window) {
        if ($window.Notification.permission === "granted") {
          var notification = new $window.Notification(title, options);
        } else if ($window.Notification.permission !== 'denied') {
          $window.Notification.requestPermission(function (permission) {
            if (permission === "granted") {
              var notification = new $window.Notification(title, options);
            }
          });
        }
      }
    }

    function formatTime(inputDuration) {
      var match;
      var resultTime;
      var timeString;
      if(reTime1.test(inputDuration)) {
        match = inputDuration.match(reTime1);
        resultTime = +match[1]*60000 + +match[2]*1000;
      } else if(reTime2.test(inputDuration)) {
        match = inputDuration.match(reTime2);
        resultTime = +match[1]*60000 + +match[2]*1000;
      } else if(reTime3.test(inputDuration)) {
        match = inputDuration.match(reTime3);
        resultTime = +match[1]*60000 + +match[2]*1000;
      } else {
        resultTime = 25000;
      }

      var min = Math.floor(resultTime/60000);
      var sec = (resultTime - (min*60000))/1000;
      timeString = ('0' + min).slice(-2) + ':' + ('0' + sec).slice(-2);

      return {
        resultTime: resultTime,
        timeString: timeString
      };
    }

    function getYouTubeTime(input, callback) {
      var match = input.match(reYoutube);
      $http.get('https://www.googleapis.com/youtube/v3/videos?id=' + match[7] + '&key=AIzaSyDjWgTEWP4-Wz3lgQjlXO-PJJ2DuHfbq9w&part=contentDetails,snippet').success(function(data) {
        var title = '<span class="glyphicon glyphicon-facetime-video"></span> ' + data.items[0].snippet.title;
        callback(input, data.items[0].contentDetails.duration, title);
      });
    }

    $scope.resetPlaylist = function() {
      $('#newPlaylistSuccess').hide();
      $('#newPlaylistError').hide();
    };

    $scope.applyNewPlaylist = function() {
      playlistError = false;
      $('#newPlaylistSuccess').hide();
      $('#newPlaylistError').hide();
      $scope.newPlaylist.forEach(function(playlist, index) {

        $scope.newPlaylist[index].url = playlist.url = $('#newPlaylistCarstUrl_' + index).val();
        $scope.newPlaylist[index].timeString = playlist.timeString = $('#newPlaylistCarstTime_' + index).html();

        if(!re.test(playlist.url)) {
          $('#newPlaylistError').show();
          playlistError = true;
        }

        if(reYoutube.test(playlist.url)) {
          (function(index) {
            getYouTubeTime(playlist.url, function(url, duration, title) {
              var time = formatTime(duration);
              playlist = {
                id: index,
                title: title,
                url: playlist.url,
                time: time.resultTime,
                timeString: time.timeString
              };
              $scope.newPlaylist[index] = playlist;
            });
          }(index));

        } else {
          var time = formatTime($scope.newPlaylist[index].timeString);
          playlist = {
            id: index,
            title: playlist.url,
            url: playlist.url,
            time: time.resultTime,
            timeString: time.timeString
          };
          $scope.newPlaylist[index] = playlist;
        }
      });
    };


    $scope.saveNewPlaylist = function() {
      $scope.applyNewPlaylist();
      if(!playlistError) {
        setTimeout(function() {
        sendToServer('/rest/newPlaylist', {
          title: $('#playlistTitle').val(),
          carsts: $scope.newPlaylist
        }, function() {
          $('#newPlaylistSuccess').show();
          $scope.newPlaylist = [{
            id: 0,
            title: '',
            url: 'sample carst',
            time: '',
            timeString: 'mm:ss'
          }];
          $('#playlistTitle').val('Title of your new playlist');
        }, function() {
          $('#newPlaylistError').show();
        });
        }, 200);
      }
    };

    $scope.appendCarstToPlaylist = function() {
      $scope.newPlaylist.push({
        title: '',
        url: 'sample carst',
        time: '',
        timeString: 'mm:ss'
      });
    };

    $scope.setChannel = function(channel) {
      $scope.channel = channel;
      $scope.loadCarsts();
      $scope.loadCommands();
    };

    $scope.setDefault = function(defaultCarst, channel) {

      if(rePlaylist.test(defaultCarst)) {
        var match = defaultCarst.match(rePlaylist);
        var index = indexOfObject($scope.playlists, 'title', match[1]);
        if(index === -1) {
          alert("Diese Playlist gibt es nicht.");
        } else {
          defaultCarst = $scope.playlists[index];
        }
      }

      var data = {
        defaultCarst: defaultCarst,
        channel: channel
      };
      sendToServer('/rest/defaultCarst', data);
    };

    var re = new RegExp("^((http|https|app)://)|(www.)", "i");
    var reTime1 = new RegExp("^([0-9]{1,2}):([0-9]{1,2})$", "i");
    var reTime2 = new RegExp("^([0-9]{0,2})m ?([0-9]{0,2})s$", "i");
    var reTime3 = new RegExp("^PT([0-9]{1,2})M([0-9]{1,2})S$", "i");
    var reYoutube = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var rePlaylist = new RegExp("^playlist:\/\/(.*)$", "i");

    $scope.loadCarsts = function () {
      $http.get('/rest/carsts/' + $scope.channel.substring(1)).success(function (data, status, headers, config) {
        console.log(data);
        $scope.carsts[$scope.channel] = data;
      });
    };

    $scope.loadCommands = function () {
      $http.get('/rest/commands/' + $scope.channel.substring(1)).success(function (data, status, headers, config) {
        $scope.commands[$scope.channel] = data;
      });
    };

    $scope.loadDefaultChannel = function () {
      $http.get('/rest/defaultCarst/' + $scope.channel.substring(1)).success(function (data, status, headers, config) {
        $scope.defaultCarst[$scope.channel] = data;
        console.log($scope.defaultCarst[$scope.channel]);
      });
    };

    $scope.loadCounters = function() {
      $http.get('/rest/counter/').success(function (data, status, headers, config) {
        console.log(data);
        $scope.countReceivers = data;
      });
    };

    $scope.loadPlaylists = function() {
      $http.get('/rest/playlists').success(function (data, status, headers, config) {
        $scope.playlists = data;
      });
    };

    $scope.loadChannels = function() {
      $http.get('/rest/channels').success(function (data, status, headers, config) {
        $scope.channels = data;
        if(!$scope.channel || $scope.channels.indexOf($scope.channel) === -1) {
          $scope.channel = $scope.channels[0];
          $scope.countReceivers[$scope.channel] = 0;
          $scope.loadCarsts();
          $scope.loadCommands();
          $scope.loadDefaultChannel();
        }
      });
    };

    $scope.inputKeyup = function($event) {
      if($event.keyCode === 13) {
        $scope.carst($scope.input, $scope.channel);
      }
    };

    function sendToServer(type, data, sucsb, errcb) {
      console.log(data);
      $http.post(type, data).success(function () {
        console.log('Sent to server successfully');
        if(sucsb) sucsb();
      }).error(function (data, status, headers, config) {
        console.log('Sent to server failed');
        if(errcb) errcb();
      });
    }

    $scope.carst = function () {

      var input = $scope.input;
      var inputDuration = $scope.inputDuration;
      var channel = $scope.channel;

      $scope.input = '';
      $scope.inputDuration = '';

      function handleCommand(input) {
        var data = {
          command: input,
          channel: $scope.channel
        };
        sendToServer('/rest/command', data);
        $scope.loadCommands();
      }

      function handleCarst(input, inputDuration, title) {
        title = title || input;

        var time = formatTime(inputDuration);

        var data = {
          title: title,
          url: input,
          channel: $scope.channel,
          time: time.resultTime,
          timeString: time.timeString
        };

        console.table(data);

        sendToServer('/rest/carst', data);
        $scope.loadCarsts();
      }


      if(input.length > 0) {
        if (re.test(input)) {
          if(reYoutube.test(input)) {
            getYouTubeTime(input, handleCarst);
          } else {
            handleCarst(input, inputDuration);
          }
        } else if(rePlaylist.test(input)) {
          match = input.match(rePlaylist);
          var index = indexOfObject($scope.playlists, 'title', match[1]);
          if(index === -1) {
            alert("Diese Playlist gibt es nicht.");
          } else {
            $scope.play($scope.playlists[index]);
          }
        } else {
          handleCommand(input, channel);
        }
      }
    };

    $scope.removePlaylist = function(index) {
      if(Number.isInteger(index)) {
        $http.post('/remove/playlist/' + $scope.playlists[index]._id).success(function (data, status, headers, config) {
          console.log('removed');
        }).error(function (data, status, headers, config) {
          console.log('Error removing.');
        });
      }
    };

    $scope.deleteCarst = function(carst, channel) {
      var data = {
        carst : carst,
        channel : channel
      };
      $http.post('/remove/carst', data).success(function (data, status, headers, config) {
        console.log('removed');
      }).error(function (data, status, headers, config) {
        console.log('Error removing.');
      });
    };

    $scope.play = function(playlist) {
      playlist.carsts.forEach(function(carst) {
        carst.channel = $scope.channel;
        console.log(carst);
        sendToServer('/rest/carst', carst);
      });
    };

    $scope.loadChannels();
    $scope.loadCounters();
    $scope.loadPlaylists();


    //reload carsts on update event
    var socket = io.connect($location.origin);
    socket.on('update', function () {      
      $scope.loadCarsts();
      $scope.loadCommands();
      $scope.loadChannels();
      $scope.loadPlaylists();
    });

    socket.on('message', function (data) {

      $scope.$apply(function() {
        $scope.countReceivers[data.channel] = data.counter;
      });

      showMessage(data.title, data.options);
    });

   function indexOfObject(array, key, value) {
      for (var i = 0; i < array.length; i++) {
        if (array[i][key].toLowerCase() === value.toLowerCase()) {
          return i;
        }
      }
      return -1;
    }

  }]);