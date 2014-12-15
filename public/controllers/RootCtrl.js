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

      var slider; // the global slider instance
      var evSlider; // event slider instance

      var timer; // carst countdown instance

      $scope.show = 1; //

      $scope.capture = {}; // screenshot in base64 format

      $scope.input = ''; // initial value for user input
      $scope.inputDuration = ''; // initial value for user input
      $scope.defaultCarst = []; // default carsts for all channels
      $scope.carsts = []; // carsts for all channels
      $scope.commands = []; // commands for all channels
      $scope.countReceivers = []; // how many receivers are in the channels?
      $scope.playlists = []; // playlists
      $scope.events = []; // events for all channels

      $scope.playlistError = false; // new playlist input error?
      $scope.addEventStatus = false; // new event error?

      // initial value for new event
      $scope.newEvent = {
          url: 'sample carst',
          clock: '12:00',
          duration: '05:00'
      };

      // first proposals for auto completion
      var proposals = [
          {
              term: 'http://',
              description: 'simple carst'
          },
          {
              term: ':',
              description: 'carst apps'
          },
          {
              term: '/',
              description: 'commands'
          },
          {
              term: '#',
              description: 'carst playlists'
          }
      ];

      // more detail proposals for auto completion
      var extendProposals = [
          [{
              term: 'http://google.de',
              description: 'Google'
          },
              {
                  term: 'http://sap.de',
                  description: 'SAP'
              }],
          [{
              term: ':index',
              description: 'standby screen'
          },
              {
              term: ':9gag',
              description: 'random 9gag picture'
          },
              {
                  term: ':github',
                  description: 'latest github event'
              }],
          [{
              term: '/reload',
              description: 'refresh the site'
          },
              {
                  term: '/clear',
                  description: 'remove all carsts in queue'
              },
              {
                  term: '/reset',
                  description: 'reload the carst with time'
              },
              {
                  term: '/maximize',
                  description: 'fullscreen'
              },
              {
                  term: '/unmaximize',
                  description: 'none fullscreen'
              },
              {
                  term: '/toggleMaximize',
                  description: 'toggle fullscreen'
              },

              {
                  term: '/devtools',
                  description: 'open development tools on receiver'
              },
              {
                  term: '/power on',
                  description: 'switch on the tv'
              },
              {
                  term: '/power off',
                  description: 'switch off the tv'
              }]
      ];

      extendProposals[3] = [];

      $scope.proposals = proposals;

      $scope.activeNone = function() {
          $('.entry_active').removeClass('entry_active');
          $scope.selected = undefined;
      };

      /**********************************************************************************/
      /******************************* HELPER FUNCTIONS *********************************/
      /************************************************ *********************************/
      /**********************************************************************************/
      /**********************************************************************************/
      /**********************************************************************************/

      // Levenshtein algorithm for autocompletion suggestions
      function levenshteinDistance(a, b) {
          if(a.length === 0) return b.length;
          if(b.length === 0) return a.length;

          var matrix = [];

          // increment along the first column of each row
          var i;
          for(i = 0; i <= b.length; i++){
              matrix[i] = [i];
          }

          // increment each column in the first row
          var j;
          for(j = 0; j <= a.length; j++){
              matrix[0][j] = j;
          }

          // Fill in the rest of the matrix
          for(i = 1; i <= b.length; i++){
              for(j = 1; j <= a.length; j++){
                  if(b.charAt(i-1) == a.charAt(j-1)){
                      matrix[i][j] = matrix[i-1][j-1];
                  } else {
                      matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                          Math.min(matrix[i][j-1] + 1, // insertion
                              matrix[i-1][j] + 1)); // deletion
                  }
              }
          }

          return matrix[b.length][a.length];
      }

      // format seconds to 5h 03' 09", last is optional
      function newFormatTime(sec, withSec) {
          var hours = Math.floor(sec/3600);
          var minutes = Math.floor((sec - (hours * 3600))/60);
          var seconds = sec - (minutes * 60 + hours * 3600);
          return (hours > 0 ? hours+'h ' : '') + (minutes > 0 ? ('0' + Math.round(minutes)).slice(-2) + "' " : '') + (seconds > 0 && withSec ? ('0' + Math.round(seconds)).slice(-2)+'"' : '');
      }

      // returns index in object by value of a key
      function indexOfObject(array, key, value) {
          for (var i = 0; i < array.length; i++) {
              if (array[i][key].toLowerCase() === value.toLowerCase()) {
                  return i;
              }
          }
          return -1;
      }

      /**********************************************************************************/
      /*********************************** FUNCTIONS ************************************/
      /************************************************ *********************************/
      /**********************************************************************************/
      /**********************************************************************************/
      /**********************************************************************************/

      // build a new slider with new settings
      function setSlider() {

          if((slider.getValue() == slider.getAttribute('max') || slider.getValue() == slider.getAttribute('min')) && !(slider.getValue() <= 1)) {

              $('#ex8').attr('data-slider-max', slider.getValue() + 30);
              $('#ex8').attr('data-slider-value', slider.getValue());
              $('#ex8').attr('data-slider-min', (slider.getValue() - 30 < 1 ? 1 : slider.getValue() - 30));
              slider.destroy();
              slider = new Slider("#ex8", {
                  formatter: function (value) {
                      return (newFormatTime(value * 60, true));
                  },
                  tooltip: 'always'
              });
              $('#ex8').slider().on('slideStop', setSlider);
          }
      }

      /**************************************************************/
      /******************** FOR AUTOCOMPLETION **********************/
      /**************************************************************/

      // select the last in suggestion list
      function moveUp() {
          $scope.selected = $scope.proposals.length < 7 ? $scope.proposals.length-1 : 6;
          selectEntry();
      }

      // select the first in suggestion list
      function moveDown() {
          $scope.selected = 0;
          selectEntry();
      }

      // unselect all
      function unselectEntry() {
          $('.entry_active').removeClass('entry_active');
          $scope.selected = undefined;
      }

      // select a specifig entry
      function selectEntry() {
          $('.entry_active').removeClass('entry_active');
          $('#entry_' + $scope.selected).addClass('entry_active');
      }

      // build suggestion list
      function execProp() {
          var index;
          var string = $scope.input;
          var push = false;
          switch(true) {
              case /^((http|https):\/\/)|(www.)/.test(string):
                  setProposals(0);
                  index = 0;
                  break;
              case /^:/.test(string):
                  setProposals(1);
                  index = 1;
                  break;
              case /^\//.test(string):
                  setProposals(2);
                  index = 2;
                  break;
              case /^#/.test(string):
                  setProposals(3);
                  index = 3;
                  break;
              default:
                  $scope.proposals = proposals;
                  break;
          }
          $scope.selected = undefined;
          $scope.proposals = $scope.proposals.filter(function(element) {

              console.log(element.term);

              var t = element.term.toLowerCase();
              var s = $scope.input.toLowerCase();

              if(t == s) {
                  push = true;
              }

              if(t !== s && (s.indexOf(t) != -1 || t.indexOf(s) != -1 ||  levenshteinDistance(s, t) < 5
                  || s.substring(1).indexOf(t.substring(1)) != -1 || t.substring(1).indexOf(s.substring(1)) != -1 ||  levenshteinDistance(s.substring(1), t.substring(1)) < 5)) {
                  return true;
              } else {
                  return false;
              }

          });

          if(push) {
              if((index == 0 || index == 3 || index == 1) && $scope.input.slice(-3) != " -d" && $scope.input.slice(-3) != " -f") {
                  $scope.proposals.push({
                      term: $scope.input + ' -d',
                      description: 'set as default',
                      count:0
                  });
              }
              if((index == 0 || index == 3 || index == 1) && $scope.input.slice(-3) != " -f" && $scope.input.slice(-3) != " -d") {
                  $scope.proposals.push({
                      term: $scope.input + ' -f',
                      description: 'instant carst',
                      count:0
                  });
              }
          }

      }

      // set the scope
      function setProposals(index) {
          console.log(extendProposals[index]);
          $scope.proposals = JSON.parse(JSON.stringify(extendProposals[index]));
      }

    // prevent some defaults for keys
      $scope.preventJump = function($event) {
          if($event.keyCode == 38 || $event.keyCode == 40 || $event.keyCode == 9) {
              $event.preventDefault();
          }
      };

      // handle key inputs
      $scope.keyAuto = function($event) {
          switch($event.keyCode) {
              case 13: // enter key
                  if($scope.selected != undefined) {
                      $event.preventDefault();
                      $scope.enter($('#entry_' + $scope.selected + ' .term').html());
                      $('.entry_active').removeClass('entry_active');
                      $scope.selected = undefined;
                      execProp();
                  } else {
                      $scope.carst();
                      execProp();
                  }
                  break;
              /*case 8: //backspace key
                  execProp();
                  break;*/
                  case 37: // left key
                      if($scope.selected != undefined) {
                          $scope.input = '';
                          unselectEntry();
                          execProp();
                      }
                  break;
              case 39: // right key
              case 9: // tab key
                  if($scope.selected != undefined) {
                      $event.preventDefault();
                      $scope.enter($('#entry_' + $scope.selected + ' .term').html());
                      unselectEntry();
                      execProp();
                  }
                  break;
              case 38: // up key
                  if($scope.selected != undefined) {
                      if($scope.selected > 0) {
                          $scope.selected--;
                          selectEntry();
                      } else {
                          moveUp();
                      }
                  } else {
                        moveUp();
                  }
                  break;
              case 40: // down key
                  if($scope.selected != undefined) {
                      if($scope.selected < $scope.proposals.length-1 && $scope.selected < 6) {
                          $scope.selected++;
                          selectEntry();
                      } else {
                          moveDown();
                      }
                  } else {
                      moveDown();
                  }
                  break;
              default:
                  $scope.activeNone();
                  execProp();
          }
      };

      // set input to a specific value
      $scope.enter = function(a) {
          $scope.input = a;
          //$('.entry').blur();
          //$('#carst_input').focus();
      };

      // show auto completion
      $scope.showAuto = function() {
          execProp();
          $('#autocomplete').removeClass('pullAway').removeClass('pullUp');
          $('#autocomplete').css({'visibility' : 'hidden'});

          setTimeout(function() {
              $('#autocomplete').addClass('pullUp');
          }, 0);
      };

      // hide auto completion
      $scope.hideAuto = function() {
          if($('#autocomplete').css('visibility') != 'hidden') {
              $('#autocomplete').removeClass('pullAway').removeClass('pullUp');

              setTimeout(function() {
                  $('#autocomplete').addClass('pullAway');
              }, 0);
          }
      };

      $(document).ready(function() {

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

      $scope.maximize = function() {
          var channel = $scope.channel;
          socket.emit('sendInput', {
              input: 'maximize',
              inputDuration: '',
              channel: channel
          });
      };

    $scope.carst = function(now) {

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
        } else if(input.slice(-3) === " -d") {
            carst.input = input;
            carst.input = input.substr(0, input.length -3);
            $scope.setDefault(carst.input, carst.channel);
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

      socket.on('sendCarstHistory', function(data) {
         $scope.$apply(function() {
             $scope.carstHistory = data;
             extendProposals[0].length = 0;
             $scope.carstHistory.forEach(function(carst) {
                 extendProposals[0].push({
                     term: carst.url,
                     description: 'carsted ' + carst.count + ' time(s)',
                     count: carst.count
                 });
             });
         });
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
                      var newTimeString = newFormatTime(leftTime/1000, true);
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
          extendProposals[3].length = 0;
          $scope.playlists.forEach(function(playlist) {
              extendProposals[3].push({
                  term: '#' + playlist.title,
                  description: ''
              });
          });
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
  }]);