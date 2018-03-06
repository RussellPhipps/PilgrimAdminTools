app.service('dataService', function($http){
	var server = "http://86.0.152.67:4444/";
	//var server = "https://temp.api.pilgrim.social/";

	this.get = function(url, params){
		return $http.get(server + url, {params: params});
	}

	this.post = function(url, params){
		return $http.post(server + url, params, {});
	}
});