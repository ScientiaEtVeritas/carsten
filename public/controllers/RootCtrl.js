app.filter('to_html', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}]);

app.controller('RootCtrl', ['$scope', '$http', '$rootScope', '$location', '$window',
  function ($scope, $http, $rootScope, $location, $window) {
    
    $scope.input = '';
    $scope.inputDuration = '';
    $scope.carsts = [];
    $scope.commands = [];
    $scope.countReceivers = [];

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

    $scope.setChannel = function(channel) {
      $scope.channel = channel;
      $scope.loadCarsts();
      $scope.loadCommands();
    };

    var re = new RegExp("^((http|https|app)://)|(www.)", "i");
    var reTime1 = new RegExp("^([0-9]{1,2}):([0-9]{1,2})$", "i");
    var reTime2 = new RegExp("^([0-9]{0,2})m ?([0-9]{0,2})s$", "i");
    var reTime3 = new RegExp("^PT([0-9]{1,2})M([0-9]{1,2})S$", "i");
    var reYoutube = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;

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

    $scope.loadCounters = function() {
      $http.get('/rest/counter/').success(function (data, status, headers, config) {
        console.log(data);
        $scope.countReceivers = data;
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
        }
      });
    };

    $scope.inputKeyup = function($event) {
      if($event.keyCode === 13) {
        $scope.carst($scope.input, $scope.channel);
      }
    };

    $scope.carst = function () {

      var input = $scope.input;
      var inputDuration = $scope.inputDuration;
      var channel = $scope.channel;
      var match;
      var resultTime;

      function getYouTubeTime(input, channel, callback) {
          match = $scope.input.match(reYoutube);
          $http.get('https://www.googleapis.com/youtube/v3/videos?id=' + match[7] + '&key=AIzaSyDjWgTEWP4-Wz3lgQjlXO-PJJ2DuHfbq9w&part=contentDetails,snippet').success(function(data) {
            var title = '<span class="glyphicon glyphicon-facetime-video"></span> ' + data.items[0].snippet.title;
            callback(input, channel, data.items[0].contentDetails.duration, title);
          });
      }

      function sendToServer(type, data) {
        console.log(data);
        $http.post(type, data).success(function () {
          console.log('Sent to server successfully');
        }).error(function (data, status, headers, config) {
          console.log('Sent to server failed');
        });
      }

      function handleCommand(input, channel) {
        var data = {
          command: input,
          channel: channel
        };
        sendToServer('/rest/command', data);
        $scope.loadCommands();
      }

      function handleCarst(input, channel, inputDuration, title) {
        title = title || input;
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

        var data = {
          title: title,
          url: input,
          channel: channel,
          time: resultTime,
          timeString: timeString
        };
        sendToServer('/rest/carst', data);
        $scope.loadCarsts();
      }


      if(input.length > 0) {
        if (re.test(input)) {
          if(reYoutube.test(input)) {
            getYouTubeTime(input, channel, handleCarst);
          } else {
            handleCarst(input, channel, inputDuration);
          }
        } else {
          handleCommand(input, channel);
        }
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

    $scope.loadChannels();
    $scope.loadCounters();


    //reload carsts on update event
    var socket = io.connect($location.origin);
    socket.on('update', function () {      
      $scope.loadCarsts();
      $scope.loadCommands();
      $scope.loadChannels();
    });

    socket.on('message', function (data) {

      $scope.$apply(function() {
        $scope.countReceivers[data.channel] = data.counter;
      });

      showMessage(data.title, data.options);
    });

  }]);