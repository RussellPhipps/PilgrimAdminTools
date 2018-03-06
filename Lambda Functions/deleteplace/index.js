var neo4j = require('neo4j'),
	cypher = require("cypher-query"),
	crypto = require('crypto'),
	Twitter = require('twitter-node-client').Twitter,
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
	var placeID = parameters.placeID;

	console.log("REQUEST :- POST places/place");
	console.log("PARAMS  :- placeID: "+placeID);
	console.log("----------------------------------");

	var query = "match (p:Place{placeID:'"+placeID+"'}) "
		+"optional match p-[:in_stack]-(s:Stack) "
		+"return p, s"

	console.log(query);

	db.cypher({query: query}, function(err, results) {
		if(err) {
			console.log(err);
			console.log(err.stack);
		} else {
			if(results.length > 0) {
				if(!results[0].s) {
					var query = "match (p:Place{placeID:'"+placeID+"'}) "
						+"optional match p-[r:for]-(c)-[rk]-() "
						+"optional match p-[rx]-() "
						+"delete p, r, c, rx, rk "

					console.log(query);
					db.cypher({query: query}, function(err, results) {
						if(err) {
							console.log(err);
							console.log(err.stack);
						} else {
						    elasticsearch.delete({
						        index: index,
						        type: 'place',
						        id: placeID
						    }, function(err, data) {
						    	console.log("UPDATED");
						    	console.log("**********************************");
								callback({
									message: 'done'
								});
						    });
							
						}
					});
				} else {
					console.log("UPDATED");
			    	console.log("**********************************");
					callback({
						message: 'Place in a stack, deletion blocked'
					});
				}
			} else {
				elasticsearch.delete({
			        index: index,
			        type: 'place',
			        id: placeID
			    }, function(err, data) {
			    	console.log("UPDATED");
			    	console.log("**********************************");
					callback({
						message: 'deleted from ES'
					});
			    });
			}
		}
	});
}

function uploadToS3(url, placeID, callback)
{
	// Make request to our image url
    request({url: url, encoding: null}, function (err, res, body) {
        if (!err && res.statusCode == 200) {
        	console.log("YIS");
        	console.log(body);
        	console.log(res.headers['content-type']);

            s3.putObject({
				Bucket: 'pilgrim-placeimages',
		    	Key: placeID+'.png',
		    	Body: body,
		    	ContentType: 'image/png',
		    	ACL: 'public-read'
		    }, function(err, data) {
		    	if (err) {
		    		var query = "create (e:Error{error:'"+JSON.stringify(err)+"'}) return e";

		    		db.cypher({query: query}, function(err, ownerResults) {
						if(err) {
							console.log(err);
							console.log(err.stack);
						} else {
							callback(false);
						}
					});
		    	} else {
		    		console.log("image uploaded");
		    		var newUrl = 'https://s3-eu-west-1.amazonaws.com/pilgrim-placeimages/'+placeID+'.png';
					callback(newUrl);
				}
			});
        } else {
            throw new Error('Can not download image');
        }
    });
}