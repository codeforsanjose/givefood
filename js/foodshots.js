
/**
 * @classDestription - Placeholder for Food Shot application variables and functions.
 * @class - Foodshot
 */
var Foodshots = (function($) {
	var constructor = function(infoboxoptions){
		this.AddressMarker = null;
		
		// Now
		this.now = Date.parse('now');
		
		this.Events = [];
		
		// Can we geolocate?
		this.geolocate = navigator.geolocation;
		
		this.setIcal = function(Event)
		{
			return function(){
				$('#ical-'+Event.data.id).icalendar({
					start: new Date(Date._parse(Event.data.begin_date+' '+Event.data.begin_time)),
					end: new Date(Date._parse(Event.data.begin_date+' '+Event.data.end_time)),
					title: 'Food Shot Event',
					summary: 'Food Shot Event',
					description: "Please remember to bring your immunization/shot records with you.",
					location: Event.data.facility_name+' - '+Event.data.street1+' - '+Event.data.city+' '+Event.data.state+' '+Event.data.postal_code,
					iconSize: 16,
					sites: ['icalendar'],
					echoUrl: '//flushots.smartchicagoapps.org/ical.php'
				});
			};
		};
		
		this.getEvents = function(columns,rows,Map)
		{
			// Copy the flu shot data to the Event object
			for (var i in rows)
			{
				this.Events[i] = new Event();
				for(var j in columns)
				{
					var colname = columns[j];
					this.Events[i].data[colname] = rows[i][j];
				}
				// Create the Google LatLng object
				this.Events[i].latlng = new google.maps.LatLng(this.Events[i].data.latitude,this.Events[i].data.longitude);
				// Create the markers for each event
				var icon = 'img/red.png';
				this.Events[i].marker = new google.maps.Marker({
					position: this.Events[i].latlng,
					map: Map.Map,
					icon:icon,
					shadow:'img/shadow.png',
					clickable:true
				});
				// Make the info box
				this.Events[i].infobox = new InfoBox(infoboxoptions);
			}
			for(var i in this.Events)
			{
				// Listen for marker clicks
				google.maps.event.addListener(this.Events[i].marker, 'click', this.Events[i].toggleInfoBox(Map.Map,this.Events[i]));
				// If it is a one-day event, add the ical link.
				if(this.Events[i].data.begin_date === this.Events[i].data.end_date)
				{
					google.maps.event.addListener(this.Events[i].infobox, 'domready', this.setIcal(this.Events[i]));
				}
			}
		};
		
		/**
		 * Set the address for a latlng
		 */
		this.codeLatLng = function(Latlng)
		{
			var Geocoder = new google.maps.Geocoder();
			Geocoder.geocode(
				{'latLng': Latlng},
				function(Results,Status)
				{
					if (Status == google.maps.GeocoderStatus.OK)
					{
						if (Results[0])
						{
							var formattedAddress = Results[0].formatted_address.split(',');
							$('#nav-address').val(formattedAddress[0]);
							
							// Mask the exact address before recording
							// Example: '1456 W Greenleaf Ave' becomes '1400 W Greenleaf Ave'
							var addarray = $.trim($('#nav-address').val()).split(' ');
							// Chicago addresses start with numbers. So look for them and mask them.
							if(addarray[0].match(/^[0-9]+$/) !== null)
							{
								var replacement = addarray[0].substr(0,addarray[0].length-2)+'00';
								if(replacement !== '00')
								{
									addarray[0] = replacement;
								}
								else
								{
									addarray[0] = '0';
								}
							}
							var maskedAddress = addarray.join(' ');
							_gaq.push(['_trackEvent', 'Find Me', 'Address', maskedAddress]);
						}
						else
						{
							alert('We\'re sorry. We could not find an address for this location.');
						}
					}
					else
					{
						alert('We\'re sorry. We could not find an address for this location.');
					}
				}
			);
		};
		
		// Put a Pan/Zoom control on the map
		this.setFindMeControl = function(controlDiv,Map,Food,Default)
		{
			// Set CSS styles for the DIV containing the control
			// Setting padding to 5 px will offset the control
			// from the edge of the map.
			controlDiv.style.padding = '1em';
			// Set CSS for the control border.
			var controlUI = document.createElement('div');
			controlUI.style.backgroundColor = '#333';
			//controlUI.style.color = 'white';
			controlUI.style.borderStyle = 'solid';
			controlUI.style.borderWidth = '0px';
			controlUI.style.cursor = 'pointer';
			controlUI.style.textAlign = 'center';
			controlUI.style.borderRadius = '6px';
			controlUI.title = 'Click to find your location.';
			controlDiv.appendChild(controlUI);
			// Set CSS for the control interior.
			var controlText = document.createElement('div');
			controlText.style.fontFamily = '"Helvetica Neue",Helvetica,Arial,sans-serif';
			controlText.style.fontSize = '12px';
			controlText.style.color = '#fff';
			controlText.style.paddingLeft = '.5em';
			controlText.style.paddingRight = '.5em';
			controlText.style.paddingTop = '.3em';
			controlText.style.paddingBottom = '.3em';
			controlText.innerHTML = 'Find Me';
			controlUI.appendChild(controlText);
			// Setup the click event listeners.
			google.maps.event.addDomListener(controlUI, 'click', function() {
				if(navigator.geolocation)
				{
					navigator.geolocation.getCurrentPosition(
						// Success
						function(position)
						{
							//_gaq.push(['_trackEvent', 'GPS', 'Success']);
							var Latlng = new google.maps.LatLng(
								position.coords.latitude,
								position.coords.longitude
							);
							Map.Map.setCenter(Latlng);
							Map.Map.setZoom(Default.zoomaddress);
							// Make a map marker if none exists yet
							if(Food.AddressMarker === null)
							{
								Food.AddressMarker = new google.maps.Marker({
									position:Latlng,
									map: Map.Map,
									icon:Default.iconlocation,
									clickable:false
								});
							}
							else
							{
								// Move the marker to the new location
								Food.AddressMarker.setPosition(Latlng);
								// If the marker is hidden, unhide it
								if(Food.AddressMarker.getMap() === null)
								{
									Food.AddressMarker.setMap(Map.Map);
								}
							}
							Food.codeLatLng(Latlng);
						},
						// Failure
						function()
						{
							alert('We\'re sorry. We could not find you. Please type in an address.');
						},
						{
							timeout:5000,
							enableHighAccuracy:true
						}
					);
				}
			});
		};
		
		this.setMapLegend = function(controlDiv,Map,Food,Default)
		{
			// Set CSS styles for the DIV containing the control
			// Setting padding to 5 px will offset the control
			// from the edge of the map.
			controlDiv.style.padding = '1em';
			// Set CSS for the control border.
			var controlUI = document.createElement('div');
			controlUI.style.backgroundColor = 'rgb(255,255,255)';
			//controlUI.style.color = 'white';
			controlUI.style.borderStyle = 'solid';
			controlUI.style.borderWidth = '0px';
			controlUI.style.cursor = 'pointer';
			controlUI.style.textAlign = 'center';
			controlUI.style.borderRadius = '6px';
			controlUI.title = 'Click to hide.';
			controlDiv.appendChild(controlUI);
			// Set CSS for the control interior.
			var controlText = document.createElement('div');
			controlText.style.fontFamily = '"Helvetica Neue",Helvetica,Arial,sans-serif';
			controlText.style.fontSize = '12px';
			controlText.style.color = '#333';
			controlText.style.paddingLeft = '.5em';
			controlText.style.paddingRight = '.5em';
			controlText.style.paddingTop = '.3em';
			controlText.style.paddingBottom = '.3em';
			controlText.innerHTML = '<div><a data-toggle="modal" href="#modal-fee">Donation Location</a><img src="img/red.png" /></div>';
			controlUI.appendChild(controlText);
		// Setup the click event listeners.
		//	google.maps.event.addDomListener(controlUI, 'click', function() {
		//		Map.Map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].clear();
		//	});
		};
		
		this.setMarkersByDay = function(day)
		{
			for(var i in this.Events)
			{
            this.Events[i].marker.setIcon('img/red.png');
			}
		};
	};
	return constructor;
})(jQuery);
