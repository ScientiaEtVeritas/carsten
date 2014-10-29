app.controller('RootCtrl', ['$scope', '$http', '$rootScope', '$location', '$modal', '$timeout', '$routeParams',
  function ($scope, $http, $rootScope, $location, $modal, $routeParams) {
    
    $scope.urlInput = '';
    $scope.receivers = [];


    $scope.reloadReceivers = function () {
      $http.get('/rest/receivers').success(function (data, status, headers, config) {
        $scope.receivers = data;
      });
    };

    $scope.reset = function (receiver) {
    	var data = {
    		id: receiver.id
    	};

		$http.post('/rest/cast', data).success(function (data, status, headers, config) {
			console.log('Resetted.');
		}).error(function (data, status, headers, config) {
      		console.log('Error resetting.');
		});
    };

    $scope.carst = function (url) {
    	var data = {
    		url: url
    	};

		$http.post('/rest/cast', data).success(function (data, status, headers, config) {
			console.log('Carsted.');
		}).error(function (data, status, headers, config) {
      		console.log('Error carsting.');
		});
    };


    $scope.reloadReceivers();

  	console.log('RootCtrl initialized.');
  }]);

console.log('RootCtrl loaded.');