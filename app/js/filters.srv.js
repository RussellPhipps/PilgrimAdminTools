angular.module('myApp')
.filter('to_json', ['$text', function($text){
    return function(text) {
        return JSON.parse(text);
    };
}]);