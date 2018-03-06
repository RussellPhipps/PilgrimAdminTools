var neo4j = require('neo4j'),
	cypher = require("cypher-query"),
	crypto = require('crypto'),
	Twitter = require('twitter-node-client').Twitter,
	request = require('request');

// Global variable to change between dev and live
var environment = 'live';

// Handle local or hosted
try {
	var server = require('../../../server.js');
	//var database = 'http://neo4j:passw0rd@localhost:7474';
	var database = 'https://live_neo4j:J99TYsAgNMnbwocbZyFa@db-7qxfoztg337sl2rcqcrt.graphenedb.com:24780';
} catch(err) {
	// Ecosystem environment selector
	if(environment === 'dev') {
		var database = 'http://neo4j:passw0rd@46.16.215.73:7474';
	} else if(environment === 'live') {
		var database = 'https://live_neo4j:J99TYsAgNMnbwocbZyFa@db-7qxfoztg337sl2rcqcrt.graphenedb.com:24780';
	}
}

// Exports the database and environment type to the other files
var db = new neo4j.GraphDatabase(database);

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
	var tag = parameters.tag.replace(/%20/g, ' ');

	console.log("REQUEST :- category/category");
	console.log("PARAMS  :- tag: "+tag);
	console.log("----------------------------------");

	var query = "match (c:Category{tag:'"+tag+"'}) optional match c-[:subcategory_of]->(s:Category) "
			+"return c, s";

	console.log(query);

	db.cypher({query: query}, function(err, results) {
		if(err) {
			console.log(err);
			console.log(err.stack);
		} else {
			if(results.length > 0) {
				var category = {};
				category.tag = results[0].c.properties.tag;
				category.image = 'https://s3-eu-west-1.amazonaws.com/pilgrim-placeimages/defaults/'+category.tag.replace(/ /g,"_")+'.png'
				if(results[0].c.properties.images) {
					category.images = JSON.parse(results[0].c.properties.images);
				} else {
					category.images = [];
				}
	    		if(results[0].s) {
	    			category.superCategory = results[0].s.properties.tag;
	    		}

				console.log(category);
				console.log("**********************************");
				callback(category);
			}  else {
				console.log("Category not found!");
				console.log("**********************************");
				callback("Category not found "+tag);
			}
		}
	});
}