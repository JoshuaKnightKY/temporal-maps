(function () {

  var map = L.map('map', {
    zoomSnap: .1,
    center: [39.8283, -98.5795],
    zoom: 4.5,
    minZoom: 4,
    maxZoom: 9,
  });

  var accessToken = 'pk.eyJ1Ijoia29uc29sdXMiLCJhIjoiY2pnd2d2dXJrMTk4MzMzcGRmNjl6enpmYyJ9.MC43t60Y6axGbi32YET_tA'

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=' + accessToken, {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.light',
    accessToken: accessToken
  }).addTo(map);

  // create Leaflet control for the legend
  var legendControl = L.control({
    position: 'bottomright'
  });

  // when the control is added to the map
  legendControl.onAdd = function (map) {

    // select the legend using id attribute of legend
    var legend = L.DomUtil.get("legend");

    // disable scroll and click functionality
    L.DomEvent.disableScrollPropagation(legend);
    L.DomEvent.disableClickPropagation(legend);

    // return the selection
    return legend;

  }

  legendControl.addTo(map);

    // use omnivore to load the CSV data
  omnivore.csv('data/us_urban_diabetes_rates.csv')
    .on('ready', function (e) {
      drawMap(e.target.toGeoJSON());
      drawLegend(e.target.toGeoJSON());
    })
    .on('error', function (e) {
      console.log(e.error[0].message);
    });

  function drawMap(data) {

    var options = {
      pointToLayer: function (feature, ll) {
        return L.circleMarker(ll, {
            opacity: 1,
            weight: 2,
            fillOpacity: 0,
        })
      }
    }

    // create 2 separate layers from GeoJSON data
    var femaleLayer = L.geoJson(data, options).addTo(map),
        maleLayer = L.geoJson(data, options).addTo(map);

    // fit the bounds of the map to one of the layers
    map.fitBounds(femaleLayer.getBounds());

    // adjust zoom level of map
    map.setZoom(map.getZoom() - .4);

    femaleLayer.setStyle({
        color: '#3E5902',
    });
    maleLayer.setStyle({
        color: '#732002',
    });

    resizeCircles(femaleLayer, maleLayer, 2011);
    sequenceUI(femaleLayer, maleLayer);

  } // end drawMap()

  function calcRadius(val) {

    var radius = Math.sqrt(val / Math.PI);
    return radius * 10;

  }

  function resizeCircles(femaleLayer, maleLayer, currentYear) {

    femaleLayer.eachLayer(function (layer) {
      var radius = calcRadius(Number(layer.feature.properties['F' + currentYear]));
      layer.setRadius(radius);
    });
    maleLayer.eachLayer(function (layer) {
      var radius = calcRadius(Number(layer.feature.properties['M' + currentYear]));
      layer.setRadius(radius);
    });

    // update the hover window with current year's info
    retrieveInfo(maleLayer, currentYear);
    drawSliderLegend(currentYear);

  }

  function sequenceUI(femaleLayer, maleLayer) {

    // create Leaflet control for the slider
    var sliderControl = L.control({
      position: 'bottomleft'
    });


    sliderControl.onAdd = function (map) {

      var controls = L.DomUtil.get("slider");

      L.DomEvent.disableScrollPropagation(controls);
      L.DomEvent.disableClickPropagation(controls);

      return controls;

    }

    sliderControl.addTo(map);
    // createTimeLegend();

    //select the slider's input and listen for change
    $('#slider input[type=range]')
      .on('input', function () {

        // current value of slider is current year level
        var currentYear = this.value;

        // resize the circles with updated year level
        resizeCircles(femaleLayer, maleLayer, currentYear);
      });

  }

  function drawLegend (data) {

    // loop through all features (i.e., the cities)
    var dataValues = data.features.map(function (cities) {
      // for each year in a city
      for (var year in cities.properties) {
        // shorthand to each value
        var value = cities.properties[year];
        // if the value can be converted to a number
        if (+value) {
          //return the value to the array
          return +value;
        }

      }
    });
    console.log(dataValues);
    // sort our array
    var sortedValues = dataValues.sort(function(a, b) {
        return b - a;
    });

    // round the highest number and use as our large circle diameter
    var maxValue = (sortedValues[0] / 1000) * 1000;
    console.log(maxValue);

    // calc the diameters
    var largeDiameter = calcRadius(maxValue) * 2,
        smallDiameter = largeDiameter / 2;

    // select our circles container and set the height
    $(".legend-circles").css('height', largeDiameter.toFixed());

    // set width and height for large circle
    $('.legend-large').css({
        'width': largeDiameter.toFixed(),
        'height': largeDiameter.toFixed()
    });
    // set width and height for small circle and position
    $('.legend-small').css({
        'width': smallDiameter.toFixed(),
        'height': smallDiameter.toFixed(),
        'top': largeDiameter - smallDiameter,
        'left': smallDiameter / 2
    })

    // label the max and median value
    $(".legend-large-label").html(maxValue.toLocaleString());
    $(".legend-small-label").html((maxValue / 2).toLocaleString());

    // adjust the position of the large based on size of circle
    $(".legend-large-label").css({
        'top': -11,
        'left': largeDiameter + 30,
    });

    // adjust the position of the large based on size of circle
    $(".legend-small-label").css({
        'top': smallDiameter - 11,
        'left': largeDiameter + 30
    });

    // insert a couple hr elements and use to connect value label to top of each circle
    $("<hr class='large'>").insertBefore(".legend-large-label")
    $("<hr class='small'>").insertBefore(".legend-small-label").css('top', largeDiameter - smallDiameter - 8);

  } // end drawLegend

  function retrieveInfo(maleLayer, currentYear) {

    // select the element and reference with variable
    // and hide it from view initially
    var info = $('#info').hide();

    // since maleLayer is on top, use to detect mouseover events
    maleLayer.on('mouseover', function (e) {

      // remove the none class to display and show
      info.show();

      // access properties of target layer
      var props = e.layer.feature.properties;

      // empty arrays for male and female values
      var femaleValues = [],
        maleValues = [];

      // loop through the year levels and push values into those arrays
      for (var i = 2011; i <= 2016; i++) {
        femaleValues.push(props['F' + i]);
        maleValues.push(props['M' + i]);
      }

      // populate HTML elements with relevant info
      $('#info span').html(props.CITY);
      $(".female span:first-child").html('(year ' + currentYear + ')');
      $(".male span:first-child").html('(year ' + currentYear + ')');
      $(".female span:last-child").html(Number(props['F' + currentYear]).toLocaleString());
      $(".male span:last-child").html(Number(props['M' + currentYear]).toLocaleString());

      $('.femalespark').sparkline(femaleValues, {
          width: '200px',
          height: '30px',
          lineColor: '#72A304',
          fillColor: '#3E5902',
          spotRadius: 0,
          lineWidth: 2
      });

      $('.malespark').sparkline(maleValues, {
          width: '200px',
          height: '30px',
          lineColor: '#B03103',
          fillColor: '#732002',
          spotRadius: 0,
          lineWidth: 2
      });

      // raise opacity level as visual affordance
      e.layer.setStyle({
        fillOpacity: .6
      });

    });

    // hide the info panel when mousing off layergroup and remove affordance opacity
    maleLayer.on('mouseout', function(e) {

        // hide the info panel
        info.hide();

        // reset the layer style
        e.layer.setStyle({
            fillOpacity: 0
        });
    });

    // when the mouse moves on the document
    $(document).mousemove(function(e) {
        // first offset from the mouse position of the info window
        info.css({
            "left": e.pageX + 6,
            "top": e.pageY - info.height() - 25
        });

        // if it crashes into the top, flip it lower right
        if (info.offset().top < 4) {
            info.css({
                "top": e.pageY + 15
            });
        }
        // if it crashes into the right, flip it to the left
        if (info.offset().left + info.width() >= $(document).width() - 40) {
            info.css({
                "left": e.pageX - info.width() - 80
            });
        }
    });

    // when the mouse moves on the document
    $(document).mousemove(function(e) {
        // first offset from the mouse position of the info window
        info.css({
            "left": e.pageX + 6,
            "top": e.pageY - info.height() - 25
        });

        // if it crashes into the top, flip it lower right
        if (info.offset().top < 4) {
            info.css({
                "top": e.pageY + 15
            });
        }
        // if it crashes into the right, flip it to the left
        if (info.offset().left + info.width() >= $(document).width() - 40) {
            info.css({
                "left": e.pageX - info.width() - 80
            });
        }
    });

  } // end of retrieveInfo

  function drawSliderLegend(currentYear) {

    $('.year span').html(currentYear);

  }
})();
