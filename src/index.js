import * as d3 from 'd3';
import * as d3ss from 'd3-simple-slider';
import $ from "jquery";
import geoData from './school_districts.json';
import scoresCsv from './scores.csv';
import sdCentersCsv from './school_district_centers.csv';

const math = 'Average Score (SAT Math)';
const reading = 'Average Score (SAT Reading)';
const writing = 'Average Score (SAT Writing)';

var scores = [] // Array of school objects with columns from scores csv
var districtGeos = new Map(); // Map of SD# to GeoOBJECT
var nycLoc = [40.7128, 74.0060]; // [lat, lon]
var centers = []; // Array of SD objects with columns {id, lat, lon, zoom}

// MAP VARIABLES
var mapOffset = [0, -0.04];  // map centering
var mapWidth = 600;
var mapHeight = 600;
var mapScale = 75000;  // map zoom
var mapBorderW = 2;
var mapBorderColor = 'black';
var mapStrokeColor = 'black';
var mapStrokeWidth = 0.5;
var mapFillColor = 'steelblue';
var mapOpacity = 0.9;
var mapHoverColor = '#2b506e';
var mapNonFocusOpacity = 0.6; // non-mouseovered SD opacity
var mouseTransDuration = 100; // warning: can be glitchy w/ quick mouseovers in succession

// NARRATIVE VARIABLES 
var lowScoreDistricts = ["sd8", "sd12", "sd11", "sd29", "sd24", "sd19", "sd32", "sd16", "sd23", "sd17", "sd18", "sd21", "sd20", "sd9", "sd7"]
var tutorialActive = true;

// POINT VARIABLES
var pointRadius = 2.5;
var pointColor = '#ff6600';
var pointStrokeColor = 'black'
var pointStrokeWidth = 0.7;
var pointOpacity = 1;

// SELECTION VARIABLES
var selected = null; // Selected SD
var selectedStrokeWidth = 1.6;
var selectedFillColor = '#2b506e';

// ZOOMED MAP VARIABLES
var mapScaleFactor = 1.2; // Scale zoomed map to desired dimensions
var mapZWidth = 350 * mapScaleFactor; // DO NOT CHANGE
var mapZHeight = 350 * mapScaleFactor; // DO NOT CHANGE
var mapZStartSD = null; // Load SD on zoomed map at start; null to deactivate
var mapZStrokeWidth = 2;
var mapZFillColor = mapFillColor;
var zPointRadius = 6;
var zPointColor = '#ff6600';
var zPointStrokeColor = 'black'
var zPointStrokeWidth = 1;
var zPointOpacity = 1;

// ZOOMED MAP POINT VARIABLES
var zSelected = null; // Selected school
var zSelectedStrokeWidth = 2;
var zSelectedPointRadius = 8;
var zSelectedFillColor = '#b04600';
var zHoverColor = '#b04600';
var zHoverRadius = 8;
var zSelected = null;

// SLIDER VARIABLES 
var rangeMath = [200, 800];
var rangeReading = [200, 800];
var rangeWriting = [200, 800];
var sliderWidth = 500;
var sliderHeight = 75;

// Remap SD geo data to correct keys
for (var idx in geoData.features) {
  var sd = geoData.features[idx].properties.SchoolDist;
  if (sd === 10 && districtGeos.has(10)) { // Deal with double SD10 geoJSON entries
    districtGeos.set(sd + 'b', geoData.features[idx])
  } else {
    districtGeos.set(sd, geoData.features[idx])
  }
}

// MOUSE EVENTS MAP ////////////////////////////////////////////////////////////////
let overviewMouseOver = function(d) { // Highlight SD on mouseover
  if (tutorialActive) { return; }
  d3.select(this) // Highlight overview target SD
      .transition()
      .duration(mouseTransDuration)
      .style('fill', mapHoverColor)
      .style('opacity', mapOpacity);
};

let overviewMouseLeave = function(d) { // Unhighlight SD on mouse leave
  if (tutorialActive) { return; }

  if (selected != this) { // Do not de-highlight selected SD
    d3.select(this) // De-highlight overview target SD
        .transition()
        .style('fill', mapFillColor)
        .duration(mouseTransDuration);
  }
};

let overviewMouseClick = function(d) { //De/select SD on mouse click
  if (tutorialActive) { return; }
  var unselect = this === selected ? true : false;
  console.log(this);
  if (selected) { // Unselect selected SD if one exists
    d3.select(selected)
        .transition()
        .style('fill', mapFillColor)
        .attr('stroke-width', mapStrokeWidth)
        .duration(mouseTransDuration);
    mapZ.selectAll('path').remove();
    mapZ.selectAll('circle').remove();
    selected = null;
  }
  if (d && selected !== this && !unselect) { // Select target SD not already selected when clicked on
    statBox.selectAll('text').remove();
    zSelected = null;
    d3.select(this)
        .transition()
        .style('fill', selectedFillColor)
        .attr('stroke-width', selectedStrokeWidth)
        .duration(mouseTransDuration);
    selected = this;
    updateZMap(+this.id.substring(2)); // Update zoomed map
  }
}

// MOUSE EVENTS ZOOMED MAP ////////////////////////////////////////////////////////////////
let zMouseOver = function(d) { // Highlight school on mouseover
  if (!zSelected) {
    updateStats(d)
  }
  d3.select(this) // Highlight target school
      .transition()
      .duration(mouseTransDuration)
      .attr('r', zHoverRadius)
      .style('fill', zHoverColor);
}

let zMouseLeave = function(d) { // Unhighlight school on mouse leave
  if (!zSelected) {
    statBox.selectAll('text').remove();
  }
  if (zSelected != this) { // Do not de-highlight selected school
    d3.select(this) // De-highlight target school
      .transition()
      .duration(mouseTransDuration)
      .attr('r', zPointRadius)
      .style('fill', zPointColor)
  }
}

let zMouseClick = function(d) { // De/select school on mouse click
  var unselect = this === zSelected;
  if (zSelected) { // Unselect selected school if one exists
    statBox.selectAll('text').remove();
    d3.select(zSelected)
        .transition()
        .duration(mouseTransDuration)
        .attr('r', zPointRadius)
        .style('fill', zPointColor)
        .style('stroke-width', zPointStrokeWidth);
    zSelected = null;
  }
  if (d && d.type != 'Feature' && zSelected !== this && !unselect) { // Select target school not already selected
    d3.select(this)
        .transition()
        .duration(mouseTransDuration)
        .style('fill', zSelectedFillColor)
        .style('stroke-width', zSelectedStrokeWidth)
        .attr('r', zSelectedPointRadius);
    zSelected = this;
    updateStats(d);
  }
}

// OVERVIEW MAP ////////////////////////////////////////////////////////////////
// Path generator: projection centered on NYC and scaled
var projection = d3.geoAlbers()
    .center([0, nycLoc[0] + mapOffset[0]])
    .rotate([nycLoc[1] + mapOffset[1], 0])
    .translate([mapWidth/2, mapHeight/2])
    .scale([mapScale]);
var path = d3.geoPath().projection(projection);

// Create Map SVG element
var map = d3.select('#map')
  .append('svg')
    .attr('width', mapWidth)
    .attr('height', mapHeight);

// Create border on Map
var mapBorder = map.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', mapHeight)
    .attr('width', mapWidth)
    .attr('pointer-events', 'all')
    .style('stroke', mapBorderColor)
    .style('fill', 'none')
    .style('stroke-width', mapBorderW)
    .on('click', overviewMouseClick);

let drawMapDefault = function() {
// Create map of NYC SDs
map.selectAll('path')
  .data(geoData.features)
  .enter()
  .append('path')
    .attr('d', path)
    .attr('stroke', mapStrokeColor)
    .attr('stroke-width', mapStrokeWidth)
    .attr('fill', mapFillColor)
    .attr('class', function(d) {
      return 'District'
    })
    .attr('id', function(d) {
      return 'sd' + d.properties.SchoolDist;
    })
    .style('opacity', mapOpacity)
    .on('mouseover', overviewMouseOver)
    .on('mouseleave', overviewMouseLeave)
    .on('click', overviewMouseClick);
}
drawMapDefault();

let updateMapPoints = function(rangeMath, rangeReading, rangeWriting) {
  // Add circle to map for each school data point
  map.selectAll('circle').remove();
  d3.csv(scoresCsv).then(function(d) {
    scores = d; // Save scores to global variable
    map.selectAll('circle')
      .data(d)
      .enter()
      .filter(function(d) { 
        var math = d["Average Score (SAT Math)"]; 
        var reading = d["Average Score (SAT Reading)"];
        var writing = d["Average Score (SAT Writing)"]; 

        var mathInRange = math >= rangeMath[0] && math <= rangeMath[1];
        var readingInRange = reading >= rangeReading[0] && reading <= rangeReading[1];
        var writingInRange = writing >= rangeWriting[0] && writing <= rangeWriting[1];

        if (mathInRange && readingInRange && writingInRange)
          return true;
        else 
          return false; })
      .append('circle')
        .attr('cx', function(d) {
          return projection([d.Longitude, d.Latitude])[0];
        })
        .attr('cy', function(d) {
          return projection([d.Longitude, d.Latitude])[1];
        })
        .attr('r', pointRadius)
        .attr('class', function(d) {
          return 'School'
        })
        .attr('pointer-events', 'none')
        .style('fill', pointColor)
        .style('stroke', pointStrokeColor)
        .style('stroke-width', pointStrokeWidth)
        .style('opacity', pointOpacity);
  });
}
updateMapPoints(rangeMath, rangeReading, rangeWriting);

///////// SCHOOL STATS /////////////
let updateStats = function(d) {
  // remove school information
  statBox.selectAll('text').remove();

  statBox.append('text')
  .attr('x', '1em')
  .attr('y', '1em')
  .attr('dy', "0.4em")
  .text(d['School Name']);

  statBox.append('text')
  .attr('x', '2.5em')
  .attr('y', '3em')
  .attr('d', '0.5em')
  .text("Average Score (SAT Math): " + d[math]);

  statBox.append('text')
  .attr('x', '2.5em')
  .attr('y', '4.5em')
  .attr('d', '0.5em')
  .text("Average Score (SAT Reading): " + d[reading]);

  statBox.append('text')
  .attr('x', '2.5em')
  .attr('y', '6em')
  .attr('d', '0.5em')
  .text("Average Score (SAT Writing): " + d[writing]);
}
///////// DISTRICT STATS ///////////
var statBox = d3.select('#stats')
  .append('svg')
  .attr('width', mapZWidth)
  .attr('height', 110);

statBox.append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('height', 110)
  .attr('width', mapZWidth)
  .style('stroke', mapBorderColor)
  .style('fill', 'none')
  .style('stroke-width', mapBorderW);



// ZOOMED MAP //////////////////////////////////////////////////////////////////
// Create zoomed map
var mapZ = d3.select('#map-zoomed')
  .append('svg')
    .attr('width', mapZWidth)
    .attr('height', mapZHeight);
mapZ.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', mapZWidth)
    .attr('width', mapZHeight)
    .attr('pointer-events', 'all')
    .style('stroke', mapBorderColor)
    .style('fill', 'none')
    .style('stroke-width', mapBorderW)
    .on('click', zMouseClick);

// Create zoomed path generator
var zProjection = d3.geoAlbers()
    .translate([mapZWidth/2, mapZHeight/2])
var zPath = d3.geoPath().projection(zProjection);

// Load in csv of SD center lat/long coords, set zoomed map to mapZStartSD at start
d3.csv(sdCentersCsv).then(function(d) {
  centers = d; // Save center coords to global variable
  if (mapZStartSD) {
    updateZMap(mapZStartSD); // Update zoomed map to start SD
  }
});

// Updates zoomed map to target SD
let updateZMap = function(sd) {
  mapZ.selectAll('path').remove(); // Remove previous SD
  mapZ.selectAll('circle').remove();
  var center = [+centers[sd - 1].lat, +centers[sd - 1].lon]; // target SD center coords

  // Update zoomed path generator to target SD
  zProjection.center([0, center[0]])
      .rotate([center[1], 0])
      .scale(+centers[sd - 1].zoom * mapScaleFactor);
  zPath = d3.geoPath().projection(zProjection);

  // Draw target SD on zoomed map
  mapZ.append('path')
      .datum(districtGeos.get(sd))
      .attr('d', zPath)
      .attr('stroke', mapStrokeColor)
      .attr('stroke-width', mapZStrokeWidth)
      .attr('fill', mapZFillColor)
      .attr('class', function(d) {
        return 'District'
      })
      .style('opacity', mapOpacity)
      .on('click', zMouseClick);
  if (sd === 10) { // Deal with double SD10 geoJSON entries
    mapZ.append('path')
    .datum(districtGeos.get('10b'))
    .attr('d', zPath)
    .attr('stroke', mapStrokeColor)
    .attr('stroke-width', mapZStrokeWidth)
    .attr('fill', mapZFillColor)
    .attr('class', function(d) {
      return 'District'
    })
    .style('opacity', mapOpacity);
  }
  updateMapZoomedPoints(sd, rangeMath, rangeReading, rangeWriting);
}

let updateMapZoomedPoints = function(sd, rangeMath, rangeReading, rangeWriting) {
  // Add circle to zoomed map for each school in target SD
  mapZ.selectAll('circle').remove();
  mapZ.selectAll('circle')
  .data(scores)
  .enter()
  .append('circle')
    .filter(function(d) { // Filter schools only in target SD and in slider ranges
      var inSd = +d.District === sd;
      if (sd === 10) {  // deal with double SD10 geoJSON entries
        inSd = inSd || d.District === '10b'; 
      }

      var mathScore = d[math]; 
      var readingScore = d[reading]; 
      var writingScore= d[writing]; 

      var mathInRange = mathScore >= rangeMath[0] && mathScore <= rangeMath[1];
      var readingInRange = readingScore >= rangeReading[0] && readingScore <= rangeReading[1];
      var writingInRange = writingScore >= rangeWriting[0] && writingScore <= rangeWriting[1];

      return mathInRange && readingInRange && writingInRange && inSd;
    })
    .attr('cx', function(d) {
      return zProjection([d.Longitude, d.Latitude])[0];
    })
    .attr('cy', function(d) {
      return zProjection([d.Longitude, d.Latitude])[1];
    })
    .attr('r', zPointRadius)
    .attr('class', function(d) {
      return 'School'
    })
    .style('fill', zPointColor)
    .style('stroke', zPointStrokeColor)
    .style('stroke-width', zPointStrokeWidth)
    .style('opacity', zPointOpacity)
    .on('mouseover', zMouseOver)
    .on('mouseleave', zMouseLeave)
    .on('click', zMouseClick)
  .append('title') // Tooltip: {SchoolName: avgMath/avgReading/avgWriting}
    .text(function(d) {
      return d['School Name'] + ' Averages: ' + d[math] + ' Math/' + 
              d[reading] + ' Reading/' + d[writing] +' Writing';
    });
}

// SLIDER ELEMENT //////////////////////////////////////////////////////////////////
var sliderRangeMath = d3ss
.sliderBottom()
.width(300)
.ticks(8)
.min(0)
.max(800)
.default([200, 800])
.fill('#2196f3')
.on('onchange', val => {
  rangeMath = val;
  updateMapPoints(rangeMath, rangeReading, rangeWriting);

  if (selected != null)
    updateMapZoomedPoints(+selected.id.substring(2), rangeMath, rangeReading, rangeWriting);
});

var gRangeMath = d3
.select('#math')
.append('svg')
.attr('width', sliderWidth)
.attr('height', sliderHeight)
.append('g')
.attr('transform', 'translate(30,30)');

gRangeMath.call(sliderRangeMath);

var sliderRangeReading = d3ss
.sliderBottom()
.width(300)
.ticks(8)
.min(0)
.max(800)
.default([200, 800])
.fill('#2196f3')
.on('onchange', val => {
  rangeReading = val;
  updateMapPoints(rangeMath, rangeReading, rangeWriting);

  if (selected != null)
    updateMapZoomedPoints(+selected.id.substring(2), rangeMath, rangeReading, rangeWriting);
});

var gRangeReading = d3
.select('#reading')
.append('svg')
.attr('width', sliderWidth)
.attr('height', sliderHeight)
.append('g')
.attr('transform', 'translate(30,30)');

gRangeReading.call(sliderRangeReading);

var sliderRangeWriting = d3ss
.sliderBottom()
.width(300)
.ticks(8)
.min(0)
.max(800)
.default([200, 800])
.fill('#2196f3')
.on('onchange', val => {
  rangeWriting = val;
  updateMapPoints(rangeMath, rangeReading, rangeWriting);

  if (selected != null)
    updateMapZoomedPoints(+selected.id.substring(2), rangeMath, rangeReading, rangeWriting);
});

var gRangeWriting = d3
.select('#writing')
.append('svg')
.attr('width', sliderWidth)
.attr('height', sliderHeight)
.append('g')
.attr('transform', 'translate(30,30)');

gRangeWriting.call(sliderRangeWriting);

// BUTTONS
$('#buttonFinish').on('click', function(event) {
  tutorialActive = false;
  $('#flexRow').remove();
  $('#math').fadeIn(500, function() {
    $(this).show();
  });
  $('#mathText').fadeIn(500, function() {
    $(this).show();
  });
  $('#reading').fadeIn(500, function() {
    $(this).show();
  });
  $('#readingText').fadeIn(500, function() {
    $(this).show();
  });
  $('#writing').fadeIn(500, function() {
    $(this).show();
  });
  $('#writingText').fadeIn(500, function() {
    $(this).show();
});

 mapZ.selectAll('text')
    .transition()
    .duration(200)
    .style('opacity', 0)
    .remove()

  map.selectAll("path")
  .attr("fill", function(d) {
      return mapFillColor;
  });
});

// adds trend for states that are below average
let preButton = function() {
  $('#math').hide();
  $('#mathText').hide();
  $('#reading').hide();
  $('#readingText').hide();
  $('#writing').hide();
  $('#writingText').hide();

  map.selectAll("path")
  .attr("fill", function(d) {
    if (lowScoreDistricts.indexOf(this.id) >= 0)
      return 'red';
    else 
      return mapFillColor;
  });

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '2em')
  .attr('d', '0.5em')
  .text("If you take the southern part of New York City as the ");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '3.2em')
  .attr('d', '0.5em')
  .text("center of interest and you start increasing the minimum");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '4.4em')
  .attr('d', '0.5em')
  .text("score of each subject, you notice that as we move away" );

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '5.6em')
  .attr('d', '0.5em')
  .text("from the southern part, the schools' performance tends");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '6.8em')
  .attr('d', '0.5em')
  .text("to get better.");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '9.8em')
  .attr('d', '0.5em')
  .text("The districts highlighted red indicate the districts that");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '11em')
  .attr('d', '0.5em')
  .text("did not contain a single school that perfomed better than");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '12.2em')
  .attr('d', '0.5em')
  .text("the SAT national average for a particular subject.");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '15.2em')
  .attr('d', '0.5em')
  .text("You can use the sliders at the bottom to filter out");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '16.4em')
  .attr('d', '0.5em')
  .text("various schools depending on how they performed for");

  mapZ.append('text')
  .attr('x', '1em')
  .attr('y', '17.6em')
  .attr('d', '0.5em')
  .text("a given subject. Click on a district to zoom in.");  
}

preButton();