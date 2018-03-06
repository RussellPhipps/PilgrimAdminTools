var neo4j = require('neo4j'),
	cypher = require("cypher-query"),
	crypto = require('crypto'),
	Twitter = require('twitter-node-client').Twitter,
	decode = require('ent/decode'),
	request = require('request'),
	Elasticsearch = require('elasticsearch');

// Global variable to change between dev and live
var environment = 'live';

// Handle local or hosted
try {
	var server = require('../../../server.js');
	var database = 'http://neo4j:passw0rd@localhost:7474';
	var index = 'test';
} catch(err) {
	// Ecosystem environment selector
	if(environment === 'dev') {
		var database = 'http://neo4j:passw0rd@46.16.215.73:7474';
		var index = 'test';
	} else if(environment === 'live') {
		var database = 'https://live_neo4j:J99TYsAgNMnbwocbZyFa@db-7qxfoztg337sl2rcqcrt.graphenedb.com:24780';
		var index = 'v1';
	}
}

// Exports the database and environment type to the other files
var db = new neo4j.GraphDatabase(database);

var elasticsearch = new Elasticsearch.Client({
    host: '54.229.137.202:9200',
    apiVersion: '2.2'
});

exports.handler = function(event, context)
{
	var params = event;
	console.log(params);
	
	method(params, function(response) {
		context.done(null, response);
	});
}

exports.localHandler = function(req, res, next)
{
	var params = req.params;

	method(params, function(response) {
		res.writeHead(200, {"Content-Type": "text/plain"});
		res.write(JSON.stringify(response));
		res.end();
	});
}

function method(parameters, callback)
{
	var placeID = parameters.placeID;
	var searchCurated = parameters.searchCurated;

	console.log("REQUEST :- places/"+placeID);
	console.log("PARAMS  :- placeID: "+placeID);
	console.log("----------------------------------");

	elasticsearch.search({
        index: index,
        type: 'place',
        body: {
        	query: {
	        	terms: {
	        		_id: [placeID]
	        	}
		    }
        }
    }, function(err, data) {
    	var results = data.hits.hits;
    	console.log(results);

		var place = {};
		place.placeID = results[0]._id;
		place.name = decode(results[0]._source.name);
		place.website = results[0]._source.website;
		place.twitterHandle = results[0]._source.twitterHandle;
		place.phoneNumber = results[0]._source.phoneNumber;
		place.description = results[0]._source.description;
		place.emailAddress = results[0]._source.emailAddress;

		console.log('pre locale');
		if(results[0]._source.locale) {
			console.log('locale exists');
			if(results[0]._source.locale.substring(0, 1) === '{') {
				console.log('object locale');
				place.locale = JSON.parse(results[0]._source.locale);
				place.locale = decode(place.locale.name);
			} else {
				console.log('string locale');
				place.locale = decode(results[0]._source.locale);
			}
		}

		console.log("past locale");
		
		if(results[0]._source.lastVisited) {
			place.lastVisited = JSON.parse(results[0]._source.lastVisited);
		}
		if(results[0]._source.mostVisited) {
			place.mostVisited = JSON.parse(results[0]._source.mostVisited);
		}

		place.category = results[0]._source.category;
		place.subcategory = results[0]._source.subcategory;
		place.lat = results[0]._source.point[1];
		place.lng = results[0]._source.point[0];
		place.placeImageLink = results[0]._source.placeImageLink;
		place.rating = results[0]._source.adminRating;
		if(results[0]._source.tags === '[]') {
			place.tags = '';
		} else {
			place.tags = [];
			console.log("TAGS");
			for(var i=0;i<results[0]._source.tags.length;i++) {
				console.log(results[0]._source.tags[i]);
				place.tags.push(decode(results[0]._source.tags[i]));
			}
		}

		place.chain = results[0]._source.chain;
		if(place.chain) {
			place.inChain = true;
		}
		if(results[0]._source.openingTimes) {
			place.openingTimes = JSON.parse(results[0]._source.openingTimes);
			if(!place.openingTimes[0].openAt) {
				place.openingTimes = 	 [
					{"day":"Monday","openAt":[]},
					{"day":"Tuesday","openAt":[]},
					{"day":"Wednesday","openAt":[]},
					{"day":"Thursday","openAt":[]},
					{"day":"Friday","openAt":[]},
					{"day":"Saturday","openAt":[]},
					{"day":"Sunday","openAt":[]}
				]
			}
		} else {
			place.openingTimes = 	 [
				{"day":"Monday","openAt":[]},
				{"day":"Tuesday","openAt":[]},
				{"day":"Wednesday","openAt":[]},
				{"day":"Thursday","openAt":[]},
				{"day":"Friday","openAt":[]},
				{"day":"Saturday","openAt":[]},
				{"day":"Sunday","openAt":[]}
			]
		}
		console.log('pre address')
		if(results[0]._source.address) {
			console.log('yes this is address');
			console.log(results[0]._source.address);
			place.address = results[0]._source.address;
			if(place.address.line1) {place.address.line1 = decode(place.address.line1);}
			if(place.address.line2) {place.address.line2 = decode(place.address.line2);}
			if(place.address.suburb) {place.address.suburb = decode(place.address.suburb);}
			if(place.address.city) {place.address.city = decode(place.address.city);}
		} else {
			console.log('no thx');
			place.address = {
				line1: '',
				line2: '',
				suburb: '',
				city: '',
				postcode: ''
			};
		}

		console.log("**********************************");
		callback(place);
    });
}