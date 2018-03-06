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
	var localesIndex = 'localestest';
} catch(err) {
	// Ecosystem environment selector
	if(environment === 'dev') {
		var database = 'http://neo4j:passw0rd@46.16.215.73:7474';
		var index = 'v1';
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
	
	var skip = parameters.skip;
	var limit = parameters.limit;
	var targetString = parameters.targetString;
	var searchUncurated = parameters.searchUncurated;
	var fullList = parameters.fullList;

	console.log(parameters);

	// Print request data to terminal
	console.log("REQUEST :- locales");
	console.log("PARAMS  :- skip: "+skip);
	console.log("PARAMS  :- limit: "+limit);
	console.log("PARAMS  :- targetString: "+targetString);
	console.log("PARAMS  :- searchUncurated: "+searchUncurated);
	console.log("PARAMS  :- fullList: "+fullList);
	console.log("----------------------------------");

	if(skip === undefined) {
		skip = 0;
	}
	if(limit == undefined) {
		limit = 10;
	}

	if(targetString) {
		targetString = targetString.toLowerCase();
		targetString = targetString.replace(/'/g, " apos ");
		console.log(targetString);

		var target = targetString.split(',');
		var nameParts = target[0].split(' ');

		var should = [];
		for(var i=0;i<nameParts.length;i++) {
			should.push({
				query: {
					wildcard: {
						name: {
							value: nameParts[i]+"*"
						}
					}
				}
			})
		}
		if(target.length == 2) {
			if(target[1].substring(0, 1) === ' ') {
				target[1] = target[1].substring(1, target[1].length);
			}
			should.push({
				query: {
					wildcard: {
						locale: {
							value: target[1]+"*"
						}
					}
				}
			})
		}

		var body = {
			from: skip,
	    	size: limit,
	    	query: {
	        	filtered: {
	        		query: {
	    				match_all: {}
	        		},
	        		filter: {
	        			bool: {
	        				must: should
	        			}
	        		}
	    		}
		    },
		    sort: [
		    	{
		    		"name.raw": {
		    			order: "asc"
		    		}
		    	}
		    ]
	    };

	    if(searchUncurated === 'true') {
	    	console.log('yes');
	    	body.query.filtered.query = {
	    		terms: {
	        		curated: [false]
	        	}
		    }
		}
	} else { // If no search term defined
		if(searchUncurated === 'true') {
			console.log('yes?');
			var body = {
				from: skip,
		    	size: limit,
		    	query: {
		        	terms: {
		        		curated: [false]
		        	}
			    },
			    sort: [
			    	{
			    		"name.raw": {
			    			order: "asc"
			    		}
			    	}
			    ]
		    };
		} else {
			var body = {
				from: skip,
		    	size: limit,
		    	query: {
		        	match_all: {}
			    },
			    sort: [
			    	{
			    		"name.raw": {
			    			order: "asc"
			    		}
			    	}
			    ]
		    };
		}
	}

	if(fullList) {
		var body = {
			from: 0,
			size: 500,
	    	query: {
	        	match_all: {}
		    },
		    sort: [
		    	{
		    		"name.raw": {
		    			order: "asc"
		    		}
		    	}
		    ]
	    };
	}
	console.log("ALLOW");
	console.log(JSON.stringify(body));

	elasticsearch.search({
        index: localesIndex,
        type: 'place',
        body: body
    }, function(err, data) {
    	console.log(err);
    	//console.log(data);
    	var results = data.hits.hits;
    	//console.log(results);

    	var resultsArray = [];

		for(var i=0;i<results.length;i++) {
			var locale = {};
			locale.localeID = results[i]._id;
			locale.name = decode(results[i]._source.name);
			locale.url = results[i]._source.url;


    		resultsArray.push(locale);
		}
		var end = Number(skip) + Number(limit);
		console.log("Returned "+resultsArray.length+" locale from "+skip+" to "+end);
		console.log("**********************************");
		callback(resultsArray);
    });
}