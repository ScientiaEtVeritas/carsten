app.filter('to_html', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}]);

function whyYesIDoLikeJavaScript() {
    console.log("I'm too!");
}

app.controller('RootCtrl', ['$scope', '$http', '$rootScope', '$location', '$window',
  function ($scope, $http, $rootScope, $location, $window) {

      $('.help').tooltip({
          tooltipClass: "toolTipDetails"
      });

      var a, b, c = ["Knock, knock.\nWho’s there?\nvery long pause…\nJava.\n:-o", "{} + [] === 0", "Do you like JavaScript? --> whyYesIDoLikeJavaScript()", "q. How do you comfort a JavaScript bug? a. You console it.", "You’ll never see this printed to the console :)"];
      c.pop(), b = Math.floor(Math.random() * c.length), a = c[b], "undefined" != typeof window.console && "function" == typeof window.console.log && window.console.log(a);

      $scope.editPlaylist = function(index) {
          $scope.openPlaylist = JSON.parse(JSON.stringify($scope.playlists[index]));
      };

      $scope.removeCarstFromPlaylist = function(index) {
          $scope.openPlaylist.carsts.splice(index, 1);
      };

      $('#openPlaylist').sortable({
          placeholder: "playlist-placeholder",
          start: function(event, ui) {
              ui.item.startPos = ui.item.index();
          },
          stop: function(event, ui) {
              var oldPos = ui.item.startPos;
              var newPos = ui.item.index();

              console.log(oldPos, newPos, $scope.openPlaylist.carsts);

              if(oldPos !== newPos) {
                  var tmp = JSON.parse(JSON.stringify($scope.openPlaylist.carsts[oldPos]));
                  $scope.openPlaylist.carsts.splice(oldPos, 1);
                  $scope.openPlaylist.carsts.splice(newPos, 0, tmp);

                  console.log($scope.openPlaylist.carsts);
              }
          }
      });

      $scope.openFileDialoag = function() {
          $('#imagefile').click();
      };

      $scope.showMore = function() {
          $('#extended').toggle('slide', {direction:'up'}, 500);
      };

      $(document).on('click', '#more_button', function() {
          $(this).attr('id', 'less_button');
          $(this).html('<span class="glyphicon glyphicon-chevron-up"></span> Show less...');
      });

      $(document).on('click', '#less_button', function() {
          $(this).attr('id', 'more_button');
          $(this).html('<span class="glyphicon glyphicon-chevron-down"></span> Show more...');
      });

      $('#carst_input').focus();

      $('#l-carsts').sortable({
          placeholder: "carst-placeholder",
          start: function(event, ui) {
              ui.item.startPos = ui.item.index();
          },
          stop: function(event, ui) {
              socket.emit('changePosition', {
                  channel: $scope.channel,
                  oldPos: ui.item.startPos,
                  newPos: ui.item.index()
              });
          }
      });

    $scope.openPlaylist = [{
      id: 0,
      title: '',
      url: 'sample carst',
      time: '',
      timeString: 'hh:mm:ss'
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
      $('#openPlaylistSuccess').hide();
      $('#openPlaylistError').hide();

        $scope.openPlaylist = {
            title: 'Title of your new playlist',
            carsts : [{
                id: 0,
                title: '',
                url: 'sample carst',
                time: '',
                timeString: 'hh:mm:ss'
            }]
        };

    };

   $scope.savePlaylist = function() {

      socket.emit('openPlaylist', $scope.openPlaylist);

       socket.on('openPlaylistError', function() {
           $('#openPlaylistError').show();
           $('#openPlaylistSuccess').hide();
       });

       socket.on('openPlaylistSuccess', function(data) {
           $scope.openPlaylist = data;
           $('#openPlaylistError').hide();
           $('#openPlaylistSuccess').show();
       });

    };

    $scope.appendCarstToPlaylist = function() {
      $scope.openPlaylist.carsts.push({
        title: '',
        url: 'sample carst',
        time: '',
        timeString: 'hh:mm:ss'
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

      $scope.setBack = function() {
          socket.emit('setBack', {
              channel: $scope.channel
          });
      };

      $scope.clearQueue = function() {
            socket.emit('clearQueue', {
                channel: $scope.channel
            });
      };


      $scope.maximize = function() {
          var channel = $scope.channel;
          socket.emit('sendInput', {
              input: 'toggleMaximize',
              inputDuration: '',
              channel: channel
          });
      };

    $scope.carst = function (now) {

      var input = $scope.input;
      var inputDuration = $scope.inputDuration;
      var channel = $scope.channel;

      $scope.input = '';
      $scope.inputDuration = '';

        var carst = {
            inputDuration: inputDuration,
            channel: channel
        };

        console.log(input.slice(-3));
        if(now || input.slice(-3) === " -f") {
            carst.input = (input.slice(-3) === " -f") ? (input.substr(0, input.length -3)) : input;
            socket.emit('carstNow', carst);
        } else if(input.length > 0) {
            carst.input = input;
          socket.emit('sendInput', carst);
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

      $('#imagefile').on('change', function(e){
          var file = e.originalEvent.target.files[0],
              reader = new FileReader();
          var type = file.type;
          var name = file.name;
          var size = file.size;

          reader.onload = function(evt){
              console.log(type);
              switch(true) {
                  case /audio.*/.test(type):
                      alert("No audios allowed");
                      break;
                  case /image.*/.test(type):
                      if(size < 1024 * 1024 * 1) {
                          socket.emit('newImage', {
                              name: name,
                              type: type,
                              duration: $scope.inputDuration,
                              channel: $scope.channel,
                              data: evt.target.result
                          });
                      } else {
                          alert("file size to big");
                      }
                      break;
                  case /video.*/.test(type):
                      alert("No videos allowed");
                      break;
                    default:
                        alert("file type not allowed");
                      break;
              }
          };
          reader.readAsBinaryString(file);
      });

    socket.on('differentTime', function(data) {
      var hours = new Date().getHours();
      $scope.$apply(function() {
        $scope.different = hours - data;
      });
    });

      $scope.timeZone = function(date) {
          date = date.split(':');
          return (+date[0] + $scope.different) + ':' + date[1];
      };

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