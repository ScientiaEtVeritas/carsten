app.filter('to_html', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}]);

function whyYesIDoLikeJavaScript() {
    console.log("I'm too!");
}

app.controller('RootCtrl', ['$scope', '$http', '$rootScope', '$location', '$window',
  function ($scope, $http, $rootScope, $location, $window, $interval) {

      function newFormatTime(sec, withSec) {
          var hours = Math.floor(sec/3600);
          var minutes = Math.floor((sec - (hours * 3600))/60);
          var seconds = sec - (minutes * 60 + hours * 3600);
          return (hours > 0 ? hours+'h ' : '') + (minutes > 0 ? ('0' + Math.round(minutes)).slice(-2) + "' " : '') + (seconds > 0 && withSec ? ('0' + Math.round(seconds)).slice(-2)+'"' : '');
      }

      var slider;

      $(document).ready(function() {

          function setSlider() {
              $('#ex8').attr('data-slider-max', slider.getValue() + 30);
              $('#ex8').attr('data-slider-value', slider.getValue());
              $('#ex8').attr('data-slider-min', (slider.getValue() - 30 < 1 ? 1 : slider.getValue() - 30) );
              slider.destroy();
              slider = new Slider("#ex8", {
                  formatter: function(value) {
                    return(newFormatTime(value*60, true));
                  },
                  tooltip: 'always'
              });
              $('#ex8').slider().on('slideStop', setSlider);
          }

// Without JQuery
          slider = new Slider("#ex8", {
              formatter: function(value) {
                  return(newFormatTime(value*60, true));
              },
              tooltip: 'always'
          });
          $('#ex8').slider().on('slideStop', setSlider);


          $scope.installed = false;

          $scope.$watch(document.getElementById('extension-is-installed'), function() {
              if(document.getElementById('extension-is-installed')) {
                  $scope.installed = true;
              }
          });

      });
      $scope.show = 1;


      var timer;

      $scope.capture = {};

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

      $scope.menu = function(i, $event) {
          $scope.show = i;
          $('.container-active').removeClass('container-active');
          $($event.target).addClass('container-active');
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
          axis:"y",
          scroll:true,
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
    var evSlider;

      function setEvSlider() {
          $('#evslider').attr('data-slider-max', evSlider.getValue() + 30);
          $('#evslider').attr('data-slider-value', evSlider.getValue());
          $('#evslider').attr('data-slider-min', (evSlider.getValue() - 30 < 1 ? 1 : evSlider.getValue() - 30) );
          evSlider && evSlider.destroy();
          evSlider = new Slider("#evslider");
          $('#evslider').slider().on('slideStop', setEvSlider);
      }

    $scope.addEvent = function() {
      $scope.addEventStatus = true;
        evSlider && evSlider.destroy();
        $("#evslider").slider();
        evSlider = new Slider("#evslider");
        setEvSlider();
    };

    $scope.cancelEvent = function() {
      $scope.addEventStatus = false;
        $('#newEventError').hide();
        $('#newEventSuccess').hide();
    };

    $scope.saveEvent = function() {

      $scope.newEvent.url= $('#newevent_url').val();
      $scope.newEvent.clock = $scope.timeZone($('#newevent_clock').val());
      $scope.newEvent.duration = evSlider.getValue();

      socket.emit('newEvent', {
          channel: $scope.channel,
          eventCarst: $scope.newEvent
        });

        socket.on('newEventError', function() {
            console.log('New Event Error');
            //$('#newEventError').show();
            //$('#newEventSuccess').hide();
        });

        socket.on('newEventSuccess', function() {
            console.log('New Event Success');
            //$('#newEventError').hide();
            //$('#newEventSuccess').show();
            $scope.addEventStatus = false;
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

      $scope.maximize = function() {
          var channel = $scope.channel;
          socket.emit('sendInput', {
              input: 'maximize',
              inputDuration: '',
              channel: channel
          });
      };

    $scope.carst = function (now) {

      var input = $scope.input;
      var inputDuration = slider.getValue();
      var channel = $scope.channel;

      $scope.input = '';
      $scope.inputDuration = '';

        var carst = {
            inputDuration: inputDuration,
            channel: channel
        };

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
          $('#carsten-con').addClass('tossing');
          setTimeout(function() {
              $('#carsten-con').removeClass('tossing');
          }, 1000);
      }
    };

    $scope.removePlaylist = function(index) {
        swal({
            title: "Are you sure?",
            text: "You will not be able to recover this playlist!",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, delete it!",
            closeOnConfirm: false
        }, function(){
            if(Number.isInteger(index)) {
                socket.emit('removePlaylist', $scope.playlists[index]._id);
                swal("Deleted!", "Your playlist has been deleted.", "success");
            }
        });
    };

    $scope.removeEvent = function(index) {

        swal({
            title: "Are you sure?",
            text: "You will not be able to recover this event!",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, delete it!",
            closeOnConfirm: false
        }, function(){

            if(Number.isInteger(index)) {
                socket.emit('removeEvent', {
                    channel: $scope.channel,
                    index: $scope.events[$scope.channel][index]._id
                });
                swal("Deleted!", "Your event has been deleted.", "success");
            }
        });
    };

    $scope.deleteCarst = function(carst, channel) {

        swal({
            title: "Are you sure?",
            text: "You will not be able to recover this carst!",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, delete it!",
            closeOnConfirm: false
        }, function(){

            var data = {
                carst : carst,
                channel : channel
            };
            socket.emit('removeCarst', data);
                swal("Deleted!", "Your carst has been deleted.", "success");
        });

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

      socket.on('capture', function(data) {
          $scope.$apply(function() {
              $scope.capture = data;
          });
      });

      socket.on('tossing', function() {
          $('#carsten-con').addClass('tossing');
          setTimeout(function() {
              $('#carsten-con').removeClass('tossing');
          }, 1000);
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

      function getPartsOfMilliseconds(time) {
          var hrs = Math.floor(time/3600000);
          var min = Math.floor((time - hrs*3600000)/60000);
          var sec = (time - (min*60000))/1000;
          return [hrs, min, sec];
      }

      function formatTime(arr) {
          var str = '';
          arr.forEach(function (a, i) {
              str += (i === 0 ? '' : ':') + ('0' + Math.round(a)).slice(-2);
          });
          return str;
      }

    socket.on('sendCarsts', function(data) {
      $scope.$apply(function() {
        $scope.carsts = data;
        $scope.carsts[$scope.channel] = $scope.carsts[$scope.channel] || [];
          if(!timer && $scope.carsts[$scope.channel][0]) {
              clearInterval(timer);
              timer = undefined;
              console.log("NEW INTERVAL");
              timer = setInterval(function() {
                  if($scope.carsts[$scope.channel][0]) {
                      var leftTime = $scope.carsts[$scope.channel][0].endTime - new Date();
                      if(leftTime < 1000) {
                          clearInterval(timer);
                          timer = undefined;
                      }
                      console.log(getPartsOfMilliseconds(Math.round(leftTime)));
                      var newTimeString = newFormatTime(leftTime/1000, true); //formatTime(getPartsOfMilliseconds(leftTime));
                      var width = Math.round(1143 * (leftTime/$scope.carsts[$scope.channel][0].time));
                      $('#carsttime').css({
                          'width' : width + 'px'
                      });
                     // $('.active-carst').css({'', ''});
                      $scope.$apply(function() {
                          $scope.carsts[$scope.channel][0].timeString = newTimeString;
                      });
                  } else {
                      clearInterval(timer);
                      timer = undefined;
                  }
              }, 1000);
          }
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
          showMessage(data.title, data.options);
      });

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