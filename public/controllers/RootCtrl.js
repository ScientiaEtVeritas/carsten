app.filter('to_html', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}]);

app.controller('RootCtrl', ['$scope', '$http', '$rootScope', '$location', '$window',
  function ($scope, $http, $rootScope, $location, $window) {

      $scope.showMore = function() {
          $('#extended').toggle('slide', {direction:'up'}, 500);
      };

      $('#carst_input').focus();

      $('#l-carsts').sortable({
          placeholder: "carst-placeholder",
          start: function(event, ui) {
              ui.item.startPos = ui.item.index();
          },
          stop: function(event, ui) {
             // console.log("Start position: " + ui.item.startPos);
             // console.log("New position: " + ui.item.index());
              socket.emit('changePosition', {
                  channel: $scope.channel,
                  oldPos: ui.item.startPos,
                  newPos: ui.item.index()
              });
          }
      });

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
    $scope.events = [];

    $scope.playlistError = false;
    $scope.addEventStatus = false;

    $scope.newEvent = {
      url: 'sample carst',
      clock: '12:00',
      duration: '05:00'
    };

    $scope.addEvent = function() {
      $scope.addEventStatus = true;
    };

    $scope.cancelEvent = function() {
      $scope.addEventStatus = false;
        $('#newEventError').hide();
        $('#newEventSuccess').hide();
    };

    $scope.saveEvent = function() {

      $scope.newEvent.url= $('#newevent_url').val();
      $scope.newEvent.clock = $('#newevent_clock').val();
      $scope.newEvent.duration = $('#newevent_duration').val();

      socket.emit('newEvent', {
          channel: $scope.channel,
          eventCarst: $scope.newEvent
        });

        socket.on('newEventError', function() {
            $('#newEventError').show();
            $('#newEventSuccess').hide();
        });

        socket.on('newEventSuccess', function() {
            $('#newEventError').hide();
            $('#newEventSuccess').show();

            $scope.newEvent = {
                url: 'sample carst',
                clock: '12:00',
                duration: '05:00'
            };

        });

    };

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

    $scope.resetPlaylist = function() {
      $('#newPlaylistSuccess').hide();
      $('#newPlaylistError').hide();
    };

   $scope.saveNewPlaylist = function() {

      $scope.newPlaylist.forEach(function(playlist, index) {

        $scope.newPlaylist[index].url = playlist.url = $('#newPlaylistCarstUrl_' + index).val();
        $scope.newPlaylist[index].timeString = playlist.timeString = $('#newPlaylistCarstTime_' + index).html();

      });

      socket.emit('newPlaylist', {
        title: $('#playlistTitle').val(),
        carsts: $scope.newPlaylist
      });

       socket.on('newPlaylistError', function() {
           $('#newPlaylistError').show();
           $('#newPlaylistSuccess').hide();
       });

       socket.on('newPlaylistSuccess', function() {
           $('#newPlaylistError').hide();
           $('#newPlaylistSuccess').show();

           $('#playlistTitle').val('Title of your new playlist');

           $scope.newPlaylist = [{
               id: 0,
               title: '',
               url: 'sample carst',
               time: '',
               timeString: 'mm:ss'
           }];

       });

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
    };

    $scope.setDefault = function(defaultCarst, channel) {

      /*if(rePlaylist.test(defaultCarst)) {
        var match = defaultCarst.match(rePlaylist);
        var index = indexOfObject($scope.playlists, 'title', match[1]);
        if(index === -1) {
          alert("Diese Playlist gibt es nicht.");
        } else {
          defaultCarst = $scope.playlists[index];
        }
      }*/

      var data = {
        defaultCarst: defaultCarst,
        channel: channel
      };

      socket.emit('newDefaultCarst', data);
    };

    $scope.inputKeyup = function($event) {
      if($event.keyCode === 13) {
        $scope.carst();
      }
    };

    $scope.carst = function () {

      var input = $scope.input;
      var inputDuration = $scope.inputDuration;
      var channel = $scope.channel;

      $scope.input = '';
      $scope.inputDuration = '';

      if(input.length > 0) {
          socket.emit('sendInput', {
            input: input,
            inputDuration: inputDuration,
            channel: channel
            });
      }
    };

    $scope.play = function(index) {
      if(Number.isInteger(index)) {
        socket.emit('playPlaylist', {
          index: index,
          channel: $scope.channel
        });
      }
    };

    $scope.removePlaylist = function(index) {
      if(Number.isInteger(index)) {
        socket.emit('removePlaylist', $scope.playlists[index]._id);
      }
    };

    $scope.removeEvent = function(index) {
      if(Number.isInteger(index)) {
        socket.emit('removeEvent', {
          channel: $scope.channel,
          index: $scope.events[$scope.channel][index]._id
        });
      }
    };

    $scope.deleteCarst = function(carst, channel) {
      var data = {
        carst : carst,
        channel : channel
      };
      socket.emit('removeCarst', data);
    };


    /*
    **************************** SOCKET
     */

    var socket = io.connect($location.origin);

    socket.on('differentTime', function(data) {
      var hours = new Date().getHours();
      $scope.$apply(function() {
        $scope.different = hours - data;
      });
    });

    socket.on('sendChannels', function(data) {
      $scope.$apply(function() {
        $scope.channels = data;
        if(!$scope.channel || $scope.channels.indexOf($scope.channel) === -1) {
          $scope.channel = $scope.channels[0];
          $scope.countReceivers[$scope.channel] = 0;
        }
      });
    });

    socket.on('sendCountReceivers', function(data) {
      $scope.$apply(function() {
        $scope.countReceivers = data;
      });
    });


    socket.on('sendCommands', function(data) {
      $scope.$apply(function() {
        $scope.commands = data;
        $scope.commands[$scope.channel] = $scope.commands[$scope.channel] || [];
      });
    });

    socket.on('sendDefaultCarst', function(data) {
      $scope.$apply(function() {
        $scope.defaultCarst = data;
      });
    });

    socket.on('sendCarsts', function(data) {
      $scope.$apply(function() {
        $scope.carsts = data;
        $scope.carsts[$scope.channel] = $scope.carsts[$scope.channel] || [];
      });
    });


    socket.on('sendPlaylists', function(data) {
      $scope.$apply(function() {
        $scope.playlists = data;
      });
    });

    socket.on('sendEvents', function(data) {
      $scope.$apply(function() {
        $scope.events = data;
      });
    });

    socket.on('log', function(data) {
      console.log(data);
      console.table(data);
    });

    /*
    ***************************** SOCKET
     */

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