var neo4j = require('neo4j'),
	cypher = require("cypher-query"),
	crypto = require('crypto'),
	Twitter = require('twitter-node-client').Twitter,
	encode = require('ent/encode'),
	request = require('request'),
	AWS = require('aws-sdk'),
	Elasticsearch = require('elasticsearch');

// Global variable to change between dev and live
var environment = 'live';

// Handle local or hosted
try {
	var server = require('../../../server.js');
	var database = 'http://neo4j:passw0rd@localhost:7474';
	var index = 'test';
	var localesIndex = 'localestest';
} catch(err) {
	// Ecosystem environment selector
	if(environment === 'dev') {
		var database = 'http://neo4j:passw0rd@46.16.215.73:7474';
		var index = 'test';
		var localesIndex = 'localestest';
	} else if(environment === 'live') {
		var database = 'https://live_neo4j:J99TYsAgNMnbwocbZyFa@db-7qxfoztg337sl2rcqcrt.graphenedb.com:24780';
		var index = 'v1';
		var localesIndex = 'curatedlocales';
	}
}

// Exports the database and environment type to the other files
var db = new neo4j.GraphDatabase(database);

var elasticsearch = new Elasticsearch.Client({
    host: '54.229.137.202:9200',
    apiVersion: '2.2'
});

// Set up AWS connection
AWS.config.update({
	accessKeyId: 'AKIAJPW4QXTBUYQCQ2QA',
	secretAccessKey: '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',
	region: 'eu-west-1'
});
var s3 = new AWS.S3();

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
	var name = parameters.name;
	var lat = parameters.lat;
	var lng = parameters.lng;

	if(lat / lat !== 1) {
		lat = 0;
	}
	if(lng / lng !== 1) {
		lng = 0;
	}

	console.log("REQUEST :- POST locales/locale/new");
	console.log("PARAMS  :- name: "+name);
	console.log("PARAMS  :- lat: "+lat);
	console.log("PARAMS  :- lng: "+lng);

	console.log("----------------------------------");

	console.log(parameters);

	var d = new Date();
	var timeString = Number(d.getTime().toString());

	var Hashids = require('hashids'), hashids = new Hashids(name);

	var localeID = hashids.encode(timeString);
	console.log(localeID);

	var url = name.replace(/ /g, '');
	console.log(url);
	url = url.toLowerCase();

	console.log(url);

	var body = {
        name: name,
    	point: [lng, lat],
        url: url,
        curated: false
    }

    var query = "create (l:Locale{localeID:'"+localeID+"',"
			+"name:'"+name+"',"
			+"lat:'"+lat+"',"
			+"lng:'"+name+"',"
			+"url:'"+url+"'}) return l"

    db.cypher({query: query}, function(err, results) {
		if(err) {
			console.log(err);
			console.log(err.stack);
		} else {
			elasticsearch.index({
		        index: localesIndex,
		        type: 'place',
		        id: localeID,
		        body: body
		    }, function(err, data) {
		        console.log('json reply received');
		        console.log(data);
		        body.localeID = localeID;
		        callback(body);
		    });
		}
	});
}