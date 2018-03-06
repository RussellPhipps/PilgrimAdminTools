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
	var lat = parameters.lat;
	var lng = parameters.lng;

	console.log("REQUEST :- places/place/address");
	console.log("PARAMS  :- lat: "+lat);
	console.log("PARAMS  :- lng: "+lng);
	console.log("----------------------------------");

	var options = {
		url: 'http://nominatim.openstreetmap.org/reverse?format=json&'
				+'lat='+lat+'&lon='+lng+'&zoom=18',
		headers: {
			'User-Agent': 'Pilgrim-API'
		}
	}

	console.log("Requestin'");

	//console.log(requestString);
	request(options, function (error, response, body) {
		console.log("HERE");
		console.log(error);
		console.log(body);
		console.log(response.statusCode);
		//console.log("done");
		if (!error && response.statusCode == 200) {
			//console.log("yes");
			console.log(body);
			var body = JSON.parse(body);
			body.address.full = body.display_name;

			var address = {
				line1: '',
				line2: '',
				suburb: '',
				city: '',
				postcode: body.address.postcode
			}
			// Set city field
			if(body.address.county) {
				address.city = body.address.county;
			}
			if(body.address.town) {
				address.city = body.address.town;
			}
			if(body.address.city) {
				address.city = body.address.city;
			}

			// Set line1 field
			if(body.address.pedestrian) {
				address.line1 = body.address.pedestrian;
			}
			if(body.address.footway) {
				address.line1 = body.address.footway;
			}
			if(body.address.road) {
				address.line1 = body.address.road;
			}

			// Set line2 and suburb fields
			var vsn = [];
			if(body.address.village) {
				vsn.push(body.address.village);
			}
			if(body.address.suburb) {
				vsn.push(body.address.suburb);
			}
			if(body.address.neighbourhood) {
				vsn.push(body.address.neighbourhood);
			}

			if(vsn.length === 1) {
				address.suburb = vsn[0];
			}
			if(vsn.length === 2) {
				address.suburb = vsn[0];
				address.line2 = vsn[1];
			}
			if(vsn.length === 3) {
				address.suburb = vsn[0];
				address.line2 = vsn[1]+', '+vsn[2];
			}

			console.log(address);

			console.log("**********************************");
			callback(address);
		}
    });
}