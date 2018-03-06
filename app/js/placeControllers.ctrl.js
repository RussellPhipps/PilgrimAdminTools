'use strict';

app.controller('placeController', ['$location', '$scope', 'dataService', '$http', '$timeout', function($location, $scope, dataService, $http, $timeout) { 
	// Prepare default data
	$scope.place = {
		openingTimes: [
		{"day":"Monday","openAt":[]},
		{"day":"Tuesday","openAt":[]},
		{"day":"Wednesday","openAt":[]},
		{"day":"Thursday","openAt":[]},
		{"day":"Friday","openAt":[]},
		{"day":"Saturday","openAt":[]},
		{"day":"Sunday","openAt":[]}],
		address: {},
		placeID: ''
	}

	var catParams = {
		//minified: true
	}
	dataService.get('web/1v0/categories', catParams)
	.then(function(data) {
		$scope.categories = data.data;
	});
	dataService.get('web/1v0/locales', {fullList:true})
	.then(function(data) {
		$scope.locales = data.data;
	});
	$scope.image = null;
	$scope.imageFileName = '';
	  
	$scope.uploadme = {};
	$scope.uploadme.src = '';
	$scope.openingTimesCount = 0;
	$scope.isNewPlace = true;

	// Map location stuff
	$scope.getpos = function(event) {
		$scope.place.lat = event.latLng.lat();
		$scope.place.lng = event.latLng.lng();
		$scope.place.latlng = [event.latLng.lat(), event.latLng.lng()];
		$scope.checkFields();
	};

	$scope.checkFields = function() {
		console.log("change");
		if($scope.place.name && $scope.place.address.line1 && $scope.place.address.city 
			&& $scope.place.address.postcode && $scope.place.lat && $scope.selectedCategory
			&& $scope.place.phoneNumber && $scope.openingTimesCount > 0) {

			var openingTimesValid = true;
			for(var i=0;i<$scope.place.openingTimes.length;i++) {
				for(var j=0;j<$scope.place.openingTimes[i].openAt.length;j++) {
					//console.log("begin checks");
					//console.log($scope.place.openingTimes[i].openAt[j].from);
					if(!$scope.checkTime($scope.place.openingTimes[i].openAt[j].from)) openingTimesValid = false;
					if(!$scope.checkTime($scope.place.openingTimes[i].openAt[j].to)) openingTimesValid = false;
				}
			}
			if(openingTimesValid) {
				console.log("THIS IS SO VALID");
				document.getElementById("done").style.display = "block";
				document.getElementById("not_done").style.display = "none";
			} else {
				console.log('not valid');
				document.getElementById("done").style.display = "none";
				document.getElementById("not_done").style.display = "block";
			}
			
		} else {
			document.getElementById("done").style.display = "none";
			document.getElementById("not_done").style.display = "block";
		}
	}

	$scope.newPlace = function() {
		$scope.isNewPlace = true;
		$scope.place = {
			openingTimes: [
				{"day":"Monday","openAt":[]},
				{"day":"Tuesday","openAt":[]},
				{"day":"Wednesday","openAt":[]},
				{"day":"Thursday","openAt":[]},
				{"day":"Friday","openAt":[]},
				{"day":"Saturday","openAt":[]},
				{"day":"Sunday","openAt":[]}
			],
			address: {
				line1: '',
				line2: '',
				suburb: '',
				city: '',
				postcode: ''
			},
			placeID: ''
		}
		$scope.subcategories = [];
		$scope.uploadme.src = '';
		$scope.selectedCategory = '';

		document.getElementById("rhs").style.display = "block";
		document.getElementById("rhs_done").style.display = "none";
	}

	$scope.deletePlace = function() {
		if (confirm('Are you sure you want to delete '+$scope.place.name+'? Tell Russell before you do this!')) {
			// Do the thing
		    var params = {
				placeID: $scope.place.placeID
			}
			dataService.post('web/1v0/places/place/delete', params)
			.then(function(data) {
				console.log(data);
				$scope.isNewPlace = true;
				$scope.place = {
					openingTimes: [
						{"day":"Monday","openAt":[]},
						{"day":"Tuesday","openAt":[]},
						{"day":"Wednesday","openAt":[]},
						{"day":"Thursday","openAt":[]},
						{"day":"Friday","openAt":[]},
						{"day":"Saturday","openAt":[]},
						{"day":"Sunday","openAt":[]}
					],
					address: {
						line1: '',
						line2: '',
						suburb: '',
						city: '',
						postcode: ''
					},
					placeID: ''
				}
				$scope.subcategories = [];
				$scope.uploadme.src = '';
				$scope.selectedCategory = '';

				document.getElementById("rhs").style.display = "block";
				document.getElementById("rhs_done").style.display = "none";
			});
		} else {
		    // Do nothing!
		}
		
	}

	$scope.locateAddress = function() {
		if($scope.place.address.line1) {
			console.log("Find lat/lng!")
			var address = '';

			if($scope.place.address.line1) {
				address +=$scope.place.address.line1;
			}
			if($scope.place.address.city) {
				address +=', '+$scope.place.address.city;
			}
			if($scope.place.address.postcode) {
				address +=', '+$scope.place.address.postcode;
			}
			console.log(address);

			var geocoder = new google.maps.Geocoder();
		    if (geocoder) {
		        geocoder.geocode({
		            'address': address
		        }, function (results, status) {
		            if (status == google.maps.GeocoderStatus.OK) {
		                $scope.place.lat = results[0].geometry.location.lat();
		                $scope.place.lng = results[0].geometry.location.lng();
		                $scope.place.latlng = [$scope.place.lat, $scope.place.lng];
		                $scope.defaultLat = $scope.place.lat;
						$scope.defaultLng = $scope.place.lng;
		            }
		        });
		    }
		} else {
			console.log("needs more information");
		}
	}

	$scope.getAddress = function() {
		console.log("get from lat/lng");
		var params = {
			lat: $scope.place.lat,
			lng: $scope.place.lng
		};

		// Get address information
		dataService.get('web/1v0/places/place/address', params)
		.then(function(data) {
			console.log(data.data);
			$scope.place.address.line1 = data.data.line1;
			$scope.place.address.line2 = data.data.line2;
			$scope.place.address.suburb = data.data.suburb;
			$scope.place.address.city = data.data.city;
			$scope.place.address.postcode = data.data.postcode;

			$scope.checkFields();
		});
	}

	$scope.getPlace = function() {
		document.getElementById("rhs").style.display = "block";
		document.getElementById("rhs_done").style.display = "none";

		$scope.isNewPlace = false;
		var params = {
			placeID: $scope.place.placeID
		};

		console.log(params);

		// Get place information
		dataService.get('web/1v0/places/place', params)
		.then(function(data) {
			$scope.place = data.data;
			$scope.rating = $scope.place.rating;
			$scope.originalLocale = $scope.place.locale;
			$scope.place.latlng = [$scope.place.lat, $scope.place.lng];

			$scope.defaultLat = $scope.place.lat;
			$scope.defaultLng = $scope.place.lng;

			for(var i=0;i < $scope.place.openingTimes.length;i++) {
				console.log($scope.place.openingTimes[i].openAt);
				$scope.openingTimesCount += $scope.place.openingTimes[i].openAt.length;
			}
			console.log($scope.openingTimesCount);
			console.log($scope.place);
			console.log("tags ^");
			
			$scope.getPlaces();

			if($scope.place.placeImageLink) {
				console.log("YES");
				$http.get($scope.place.placeImageLink,{responseType: "blob"}).success((data) => {
					var file = new File([data], "temp.jpg");

					var reader = new FileReader();
					reader.onload = function(readerEvt) {
			            var binaryString = readerEvt.target.result;
			            $scope.uploadme.src = "data:image/jpeg;base64,"+btoa(binaryString);
			            $scope.$digest();
			            console.log("done");
			        };
					reader.readAsBinaryString(file);

					//$scope.sampleFile=file;
					console.log($scope.sampleFile);
					console.log($scope.string);
				});
			} else {
				$scope.uploadme.src = '';
			}

			// Get category dropdown
			var catParams = {
				//minified: true
			}
			dataService.get('web/1v0/categories', catParams)
			.then(function(data) {
				$scope.categories = data.data;

				var categoryIndex = 0;
				for(var i=0;i<$scope.categories.length;i++) {
					if($scope.categories[i].tag === $scope.place.category) {
						console.log("categoryIndex: "+i);
						categoryIndex = i;
					} 
				}

				$scope.selectedCategory = $scope.categories[categoryIndex];
				console.log($scope.selectedCategory);
				$scope.subcategories = $scope.categories[categoryIndex].subcategories;
				if($scope.subcategories) {
					$scope.subcategories.unshift({tag:''});
					console.log($scope.subcategories);

					//$scope.selectedCategory = $scope.place.category;

					var subcategoryIndex = 0;
					for(var i=0;i<$scope.subcategories.length;i++) {
						if($scope.subcategories[i].tag === $scope.place.subcategory) {
							//console.log("categoryIndex: "+i);
							subcategoryIndex = i;
						} 
					}
					
					$scope.selectedSubcategory = $scope.subcategories[subcategoryIndex];
					$scope.checkFields();

					// Get full list of locales
					dataService.get('web/1v0/locales', {fullList:true})
					.then(function(data) {
						$scope.locales = data.data;

						var localeIndex = 0;
						for(var i=0;i<$scope.locales.length;i++) {
							if($scope.locales[i].name === $scope.place.locale) {
								console.log("localeIndex: "+i);
								localeIndex = i;
							} 
						}

						$scope.selectedLocale = $scope.locales[localeIndex];
						console.log($scope.selectedLocale);
					});
				}
			});
		});
	}


	$scope.updateSubcategories = function() {
		console.log("UPDATE PLS");
		var categoryIndex = 0;
		console.log($scope.selectedCategory);
		for(var i=0;i<$scope.categories.length;i++) {
			//console.log($scope.categories[i]);
			if($scope.categories[i] === $scope.selectedCategory) {
				//console.log("categoryIndex: "+i);
				categoryIndex = i;
			} 
		}

		$scope.checkFields();

		$scope.place.subcategory = '';
		$scope.subcategories = $scope.categories[categoryIndex].subcategories;
		console.log($scope.subcategories);
	}

	$scope.newSubcategory = function() {
		console.log("ding");
		if($scope.selectedCategory) {
			var newSubcategory = prompt("Please enter the new subcategory", "");
	    
		    if (newSubcategory != null) {
		        console.log("yes, this is "+newSubcategory);
		    }

			var params = {
				tag: newSubcategory,
				superCategory: $scope.selectedCategory.tag
			};

			console.log(params);

			dataService.post('web/1v0/categories/category', params)
			.then(function(data) {
				$scope.result = data;

				var catParams = {
					//minified: true
				}
				dataService.get('web/1v0/categories', catParams)
				.then(function(data) {
					$scope.categories = data.data;

					var categoryIndex = 0;
					for(var i=0;i<$scope.categories.length;i++) {
						if($scope.categories[i].tag === $scope.place.category) {
							console.log("categoryIndex: "+i);
							categoryIndex = i;
						} 
					}

					$scope.selectedCategory = $scope.categories[categoryIndex];
					console.log($scope.selectedCategory);
					$scope.subcategories = $scope.categories[categoryIndex].subcategories;
					if($scope.subcategories) {
						$scope.subcategories.unshift({tag:''});
						console.log($scope.subcategories);

						//$scope.selectedCategory = $scope.place.category;

						var subcategoryIndex = 0;
						for(var i=0;i<$scope.subcategories.length;i++) {
							if($scope.subcategories[i].tag === newSubcategory) {
								//console.log("categoryIndex: "+i);
								subcategoryIndex = i;
							} 
						}
						console.log('display');
						console.log($scope.subcategories[subcategoryIndex]);
						$scope.selectedSubcategory = $scope.subcategories[subcategoryIndex];
						$scope.checkFields();
					}
				});
			});
		}
	}

	$scope.newLocale = function() {
		console.log("ding");
		//if($scope.selectedCategory) {
			var newLocale = prompt("Please enter the new locale", "");
	    	console.log(newLocale);
		    if (newLocale != null) {
		        console.log("yes, this is "+newLocale);
		    }

			var params = {
				name: newLocale,
				lat: $scope.place.lat,
				lng: $scope.place.lng
			};

			console.log(params);

			dataService.post('web/1v0/locales/locale/new', params)
			.then(function(data) {
				$scope.result = data.data;
				console.log($scope.result.localeID);

				dataService.get('web/1v0/locales', {fullList:true})
				.then(function(data) {
					$scope.locales = data.data;

					/*var localeIndex = 0;
					for(var i=0;i<$scope.locales.length;i++) {
						//console.log($scope.locales[i].localeID+' === '+$scope.result.localeID);
						if($scope.locales[i].localeID === $scope.result.localeID) {
							console.log("localeIndex: "+i);
							localeIndex = i;
						} 
					}

					$scope.selectedLocale = $scope.locales[localeIndex];*/
				});
			});
		//}
	}

	$scope.addOpening = function(day) {
		console.log('today');

		$scope.openingTimesCount++;
		console.log($scope.openingTimesCount);
		console.log(day);
		switch(day) {
			case "Monday": var i=0; break;
			case "Tuesday": var i=1; break;
			case "Wednesday": var i=2; break;
			case "Thursday": var i=3; break;
			case "Friday": var i=4; break;
			case "Saturday": var i=5; break;
			case "Sunday": var i=6; break;
		}
		var newOpening = {"from":"","to":""};
		if(i !== 0) {
			if($scope.place.openingTimes[i-1].openAt[0]) {
				console.log($scope.place.openingTimes[i-1].openAt);
				if($scope.place.openingTimes[i-1].openAt.length > $scope.place.openingTimes[i].openAt.length) {
					newOpening.from = $scope.place.openingTimes[i-1].openAt[$scope.place.openingTimes[i].openAt.length].from;
					newOpening.to = $scope.place.openingTimes[i-1].openAt[$scope.place.openingTimes[i].openAt.length].to;
				}
			}
		}
		newOpening.fromID = 'opening'+i+$scope.place.openingTimes[i].openAt.length+'F';
		console.log($scope.place.openingTimes);
		$scope.place.openingTimes[i].openAt.push(newOpening);
		$scope.checkFields();
		console.log(newOpening.fromID);
		$scope.currentOpeningID = newOpening.fromID;

		$timeout(function(){ $scope.focus(newOpening.fromID); }, 10);
	}

	$scope.focus = function(openingID) {
		document.getElementById(openingID).focus();
	}

	$scope.removeOpening = function(day) {
		if($scope.openingTimesCount > 0) {
			$scope.openingTimesCount--;
		}
		console.log($scope.openingTimesCount);
		console.log(day);
		switch(day) {
			case "Monday": var i=0; break;
			case "Tuesday": var i=1; break;
			case "Wednesday": var i=2; break;
			case "Thursday": var i=3; break;
			case "Friday": var i=4; break;
			case "Saturday": var i=5; break;
			case "Sunday": var i=6; break;
		}
		$scope.place.openingTimes[i].openAt.pop();
		$scope.checkFields();
	}

	$scope.editPlace = function(finalised){
		if($scope.place.name && $scope.place.address.line1 && $scope.place.address.city 
			&& $scope.place.address.postcode && $scope.place.lat && $scope.selectedCategory
			&& $scope.place.phoneNumber && $scope.openingTimesCount > 0) {

			if($scope.place.placeID.length === 0) {
				var date = new Date();
			    $scope.place.placeID = $scope.place.name.replace(/[^\w]/g, '');
			    $scope.place.placeID += date.getTime().toString();
			}

			console.log($scope.place.placeID);

			var params = {
				placeID: $scope.place.placeID,
				name: $scope.place.name,
				website: $scope.place.website,
				phoneNumber: $scope.place.phoneNumber,
				twitterHandle: $scope.place.twitterHandle,
				description: $scope.place.description,
				emailAddress: $scope.place.emailAddress,
				locale: $scope.place.locale,
				prevCategory: $scope.place.category,
				prevSubcategory: $scope.place.subcategory,
				lat: $scope.place.lat,
				lng: $scope.place.lng,
				rating: $scope.place.rating,
				tags: $scope.place.tags,
				openingTimes: $scope.place.openingTimes,
				chain: $scope.place.chain,
				address: {
					line1: $scope.place.address.line1,
					line2: $scope.place.address.line2,
					suburb: $scope.place.address.suburb,
					city: $scope.place.address.city,
					postcode: $scope.place.address.postcode
				},
				isNewPlace: $scope.isNewPlace,
				locale: $scope.selectedLocale
			}
			if($scope.selectedCategory) {
				params.category = $scope.selectedCategory.tag;
			}
			if($scope.selectedSubcategory) {
				params.subcategory = $scope.selectedSubcategory.tag;
			}
			if($scope.uploadme.src.length > 0) {
				params.placeImageLink = $scope.place.placeImageLink;
			}

			dataService.post('web/1v0/places/place', params)
			.then(function(data) {
				console.log(data);
				$scope.result = data;
				console.log($scope.result.data);
				$scope.place.placeID = $scope.result.data.data._id;
				console.log($scope.result.data.place);
				$scope.place.resizedImageLink = $scope.result.data.place.resizedImageLink;
				console.log($scope.place.resizedImageLink);
				$scope.isNewPlace = false;
			});

			document.getElementById("rhs").style.display = "none";
			document.getElementById("rhs_done").style.display = "block";

			document.getElementById("done").style.display = "none";
			document.getElementById("not_done").style.display = "block";
		} else {
			console.log("Needs more data");
		}
	}

	$scope.rating = 1;
    $scope.rateFunction = function(rating) {
    	$scope.place.rating = rating;
    }

    $scope.loadTags = function(query) {
        //return $http.get("http://46.16.215.73:4444/web/1v0/tags", {params: {targetString: query}});
    };

    $scope.check = function() {
    	console.log('yis');
    	console.log($scope.image);

    	 var c=document.getElementById("myCanvas");
	    var ctx=c.getContext("2d");
	    var img=document.getElementById("testImage");
	    ctx.drawImage(img,10,10);

	    console.log(c.toDataURL());
    }

    $scope.uploadFromLink = function() {
    	console.log("KEK");
    	if($scope.place.imageLink) {
    		$scope.image = $scope.place.imageLink;
    		$http.get('//cors-anywhere.herokuapp.com/'+$scope.place.imageLink,{responseType: "blob"}).success((data) => {
    			var parts = $scope.place.imageLink.split('.');
    			console.log(parts.length);
    			var extension = "."+parts[parts.length-1];
    			console.log(extension);

				var file = new File([data], "temp.jpg");
				var reader = new FileReader();
				reader.onload = function(readerEvt) {
		            var binaryString = readerEvt.target.result;
		            $scope.uploadme.src = "data:image/jpeg;base64,"+btoa(binaryString);
		            $scope.$digest();
		            //console.log($scope.uploadme.src);
		            console.log("done");
		        };
				reader.readAsBinaryString(file);
			});
    	} else {
    		console.log("No image link!");
    	}
    }

    $scope.upload = function() {
    	if($scope.place.placeID.length === 0 && $scope.place.name) {
			var date = new Date();
		    $scope.place.placeID = $scope.place.name.replace(/[^\w]/g, '');
		    $scope.place.placeID += date.getTime().toString();
    	}
    	console.log($scope.place.placeID);
    	
    	if($scope.place.placeID) {
	    	if($scope.uploadme.src.length > 0) {
	    		var data = $scope.uploadme.src.split(':');
		    	var blob = data[1].split(',');
		    	var MIME = data[1].split(';');
		    	var imageType = MIME[0];
		    	
		    	var binary_string =  window.atob(blob[1]);
			    var len = binary_string.length;
			    var bytes = new Uint8Array( len );
			    for (var i = 0; i < len; i++)        {
			        bytes[i] = binary_string.charCodeAt(i);
			    }

				AWS.config.update({ accessKeyId: 'AKIAJPW4QXTBUYQCQ2QA', secretAccessKey: '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' });
		    	AWS.config.region = 'eu-west-1';
		    	var bucket = new AWS.S3({ params: { Bucket: 'pilgrim-placeimages' } });
		    	
	        	// Prepare filename
	        	switch(imageType) {
	        		case 'image/jpeg':
	        			var extension = '.jpg';
	        			break;
	        		case 'image/png':
	        			var extension = '.png';
	        			break;
	        		case 'image/gif':
	        			console.log("Cannot use gifs!");
	        			console.log(breakstuff);
	        			break;
	        	}
	        	var fileName = $scope.place.placeID+extension;

	        	var params = { Key: fileName, ContentType: imageType, Body: bytes.buffer, ServerSideEncryption: 'AES256' };

	        	console.log(fileName);
	        	bucket.putObject(params, function(err, data) {
	        		if(err) {
	            		return false;
	          		} else {
						$scope.place.placeImageLink = 'https://s3-eu-west-1.amazonaws.com/pilgrim-placeimages/'+fileName;
		            	$scope.$digest();
	          		}
	        	})
		        .on('httpUploadProgress',function(progress) {
		          	$scope.uploadProgress = Math.round(progress.loaded / progress.total * 100);
		          	$scope.$digest();

		        });
		    } else {
		    	console.log('No image');
		    }
		} else {
			console.log('No placeID');
		}
    }

    $scope.$watch('uploadme.src', function() {
    	$scope.upload();
    });

    $scope.searchResults = [];
    var date = new Date();
    var idExtension = date.getTime().toString();

	$scope.getPlaces = function(){
		var placesParams = {
			skip:$scope.skip,
			limit:$scope.limit,
            lat:$scope.place.lat,
            lng:$scope.place.lng
		};

		console.log(placesParams);
		dataService.get('web/1v0/places', placesParams)
		.then(function(data) {
			//console.log(data.data);
            $scope.places = data.data.data;
            console.log($scope.places);
		});
	}

	$scope.limit = 20;
	$scope.skip = 0;
	$scope.searching = false;
	$scope.onlyUncurated = false;

	// List functions
    $scope.nextSet = function(){
    	console.log("next");
        $scope.skip += $scope.limit;
    }

    $scope.prevSet = function(){
    	console.log("previous");
        if($scope.skip > 0){
            $scope.skip = Math.max(0, $scope.skip - $scope.limit);
        }
    }

    $scope.startSearch = function(){
    	$scope.searching = true;
    }

    $scope.searchPlaces = function(){
    	console.log($scope.onlyUncurated);
        $scope.skip = 0;
        $scope.limit = 20;

        
		document.getElementById("search").style.display = "block";

        if($scope.search.length) {
            //console.log('searching for '+$scope.search);
            $scope.searchFor({
                skip:$scope.skip,
                limit:$scope.limit,
                targetString:$scope.search,
                locale:$scope.limitLocale,
            	onlyUncurated:$scope.onlyUncurated
            });
        } else {
            $scope.searchResults = [];
        }
    }

    $scope.searchFor = function(args, callback){
        dataService.get("web/1v0/find/places", args)
        .then(function(data){
            $scope.searchResults = data.data;
            console.log($scope.searchResults);

            if(callback)
                callback();
        });
    }

    $scope.loadPlace = function(placeID) {
		$scope.place.placeID = placeID;
		$scope.getPlace();
	/*PG*/document.getElementById("search").style.display = "none";
	/*PG*/$scope.searchResults = "";
	/*PG*/$scope.search = "";
	}

	$scope.checkTime = function(field) {
	    var errorMsg = "";

	    // regular expression to match required time format
	    var re = /^(\d{1,2})(\d{2})(:00)?([ap]m)?$/;

	    if(field != '') {
	    	var regs = field.match(re);
	    	if(regs) {
	        	if(regs[4]) {
	          		// 12-hour time format with am/pm
	          		if(regs[1] < 1 || regs[1] > 12) {
	            		errorMsg = "Invalid value for hours: " + regs[1];
	          		}
	        	} else {
	          		// 24-hour time format
	          		if(regs[1] > 23) {
	            		errorMsg = "Invalid value for hours: " + regs[1];
	          		}
	        	}
		        if(!errorMsg && regs[2] > 59) {
		        	errorMsg = "Invalid value for minutes: " + regs[2];
		        }
	    	} else {
	        	errorMsg = "Invalid time format: " + field;
	    	}
	 	} else {
	    	errorMsg = "Empty field";
	    }

	    if(errorMsg != "") {
	    	console.log(errorMsg);
	    	return false;
	    }

		return true;
	}

}]);