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

    $scope.carst = function (input, channel) {

      if($scope.input.length > 0) {

        var  time = $scope.inputDuration;
        $scope.input = '';
        $scope.inputDuration = '';

        var data;

        if (re.test(input)) {

          if(reTime1.test(time)) {
            var match = time.match(reTime1);
            var resultTime = +match[1]*6000 + +match[2]*1000;
          } else if(reTime2.test(time)) {
            match = time.match(reTime2);
            resultTime = +match[1]*6000 + +match[2]*1000;
          } else {
            resultTime = 25000;
            time = '00:25';
          }

         /* var min = Math.floor(resultTime/6000);
          var sec = (resultTime - (min*6000))/1000;

          time = ('0' + min).slice(-2) + ':' + ('0' + sec).slice(-2);*/

          data = {
            url: input,
            channel: channel,
            time: resultTime,
            timeString: time
          };
          $http.post('/rest/carst', data).success(function (data, status, headers, config) {
            console.log('carsted');
          }).error(function (data, status, headers, config) {
            console.log('Error carsting.');
          });
          $scope.loadCarsts();
        } else {
          data = {
            command: input,
            channel: $scope.channel
          };
          $http.post('/rest/command', data).success(function (data, status, headers, config) {
            console.log('commanded');
          }).error(function (data, status, headers, config) {
            console.log('Error command.');
          });
          $scope.loadCommands();
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