app.controller('RootCtrl', ['$scope', '$http', '$rootScope', '$location', '$modal', '$timeout', '$routeParams','$location',
  function ($scope, $http, $rootScope, $location, $modal, $routeParams, $location) {
    
    $scope.urlInput = '';
    $scope.carsts = [];


    $scope.loadCarsts = function () {
      $http.get('/rest/carsts').success(function (data, status, headers, config) {
        $scope.carsts = data;
      });
    };

    $scope.carst = function (url) {
    	var data = { url: url };

  		$http.post('/rest/carst', data).success(function (data, status, headers, config) {
  		  console.log('carsted');
  		}).error(function (data, status, headers, config) {
        console.log('Error carsting.');
  		});

      $scope.loadCarsts();
    };

    $scope.deleteCarst = function(carst) {
      $http.post('/remove/carst', carst).success(function (data, status, headers, config) {
        console.log('removed');
      }).error(function (data, status, headers, config) {
        console.log('Error removing.');
      });
    };

    $scope.loadCarsts();

    //reload carsts on update event
    var socket = io.connect($location.origin);
    socket.on('update', function () {      
      $scope.loadCarsts();
    });

  }]);