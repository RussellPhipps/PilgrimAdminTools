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
	var database = 'http://neo4j:passw0rd@localhost:7474';
	//var database = 'http://neo4j:passw0rd@46.16.215.73:7474';
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
	console.log(parameters);
	var minified = parameters.minified;
	var onlySupers = parameters.onlySupers;

	// Print request data to terminal
	console.log("REQUEST :- categories");
	console.log("PARAMS  :- minified: "+minified);
	console.log("PARAMS  :- onlySupers: "+onlySupers);
	console.log("----------------------------------");

	if(minified === 'true'){minified = true;} else {minified = null}
	if(onlySupers === 'true'){onlySupers = true;} else {onlySupers = null}

	if(onlySupers) {
		console.log('only supers!');
		var query = "match (c:Category) where not c-[:subcategory_of]->() "
				+"optional match c-[:tagged]-(p:Place) return c, count(p) as count";
	} else {
		var query = "match (c:Category) where not c-[:subcategory_of]->() "
				+"optional match c<-[:subcategory_of]-s "
				+"with c, s order by s.tag asc "
				+"optional match c-[:tagged]-(p:Place) "
				+"return c, collect(distinct s) as subcategories, count(distinct p) as count order by c.tag asc";
	}

	console.log(query);

	db.cypher({query: query}, function(err, results) {
		if(err) {
			console.log(err);
			console.log(err.stack);
		} else {
			var resultsArray = [];
			if(onlySupers && minified) {
				resultsArray.push('');
			}

			for(var i=0;i<results.length;i++) {
				if(minified) {
					resultsArray.push(results[i].c.properties.tag);
					if(!onlySupers) {
						if(results[i].subcategories.length > 0) {
			    			console.log(results[i].subcategories.length+" SUBCATEGORIES");
			    			for(var j=0;j<results[i].subcategories.length;j++) {
			    				resultsArray.push(results[i].subcategories[j].properties.tag);
			    			}
			    		}
			    	}
				} else {
					var category = {};

					category.tag = results[i].c.properties.tag;
					category.image = 'https://s3-eu-west-1.amazonaws.com/pilgrim-placeimages/defaults/'+category.tag.replace(/ /g,"_")+'.png'
		    		category.numberOfPlaces = results[i].count;
		    		//resultsArray.push(category);

		    		console.log("Any subcategories?");
		    		if(results[i].subcategories.length > 0) {
		    			console.log(results[i].subcategories.length+" SUBCATEGORIES");
		    			category.subcategories = [];
		    			for(var j=0;j<results[i].subcategories.length;j++) {
		    				var subcategory = {};

		    				console.log(results[i].subcategories[j].properties.tag);
							subcategory.tag = results[i].subcategories[j].properties.tag;
							subcategory.subcategoryOf = category.tag;
							subcategory.image = 'https://s3-eu-west-1.amazonaws.com/pilgrim-placeimages/defaults/'+subcategory.tag.replace(/ /g,"_")+'.png'
				    		category.subcategories.push(subcategory);
		    			}
		    		}
		    		resultsArray.push(category);
				}
			}
			console.log(resultsArray[0]);
			console.log("Returned "+resultsArray.length+" tags");
			console.log("**********************************");
			callback(resultsArray);
		}
	});
}