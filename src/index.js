import * as d3 from 'd3';
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

var pointRadius = 2.5;
var pointColor = '#ff6600';
var pointStrokeColor = 'black'
var pointStrokeWidth = 0.7;
var pointOpacity = 1;

var mapHoverColor = '#2b506e';
var mapNonFocusOpacity = 0.6; // non-mouseovered SD opacity
var mouseTransDuration = 100; // warning: can be glitchy w/ quick mouseovers in succession

var selected = null; // Selected SD
var selectedStrokeWidth = 1.6;
var selectedFillColor = '#2b506e';

var mapScaleFactor = 2; // Scale zoomed map to desired dimensions
var mapZWidth = 350 * mapScaleFactor; // DO NOT CHANGE
var mapZHeight = 350 * mapScaleFactor; // DO NOT CHANGE
var mapZStartSD = null;
var mapZStrokeWidth = 2;
var mapZFillColor = mapFillColor;
var zPointRadius = 6;
var zPointColor = '#ff6600';
var zPointStrokeColor = 'black'
var zPointStrokeWidth = 1;
var zPointOpacity = 1;

// Remap SD geo data to correct keys
for (var idx in geoData.features) {
  var sd = geoData.features[idx].properties.SchoolDist;
  if (sd === 10 && districtGeos.has(10)) { // Deal with double SD10 geoJSON entries
    districtGeos.set(sd + 'b', geoData.features[idx])
  } else {
    districtGeos.set(sd, geoData.features[idx])
  }
}

// MOUSE EVENTS ////////////////////////////////////////////////////////////////
let mouseOver = function(d) { // Highlight SD on mouseover
  // d3.selectAll('.District') // Fade other SDs
  //     .transition()
  //     .duration(mouseTransDuration)
  //     .style('fill', mapFillColor)
  //     .style('opacity', mapOpacity);
  d3.select(this) // Highlight overview target SD
      .filter(function(d) { // Filter selected SD
        return selected ? this != selected : true;
      })
      .transition()
      .duration(mouseTransDuration)
      .style('fill', mapHoverColor)
      .style('opacity', mapOpacity);
  d3.select('#' + this.id + 'z') // Highlight zoomed target SD
      .transition()
      .duration(mouseTransDuration)
      .style('fill', mapHoverColor)
      .style('opacity', mapOpacity);
};
let mouseLeave = function(d) { // Unhighlight SD on mouse leave
  // d3.selectAll('.District') // Unfade other SDs
  //     .transition()
  //     .duration(mouseTransDuration)
  //     .style('opacity', mapOpacity);
  if (selected != this) { // Do not de-highlight selected SD
    d3.select(this) // De-highlight overview target SD
        .transition()
        .style('fill', mapFillColor)
        .duration(mouseTransDuration);
  }
  d3.select('#' + this.id + 'z')  // De-highlight zoomed target SD
      .transition()
      .duration(mouseTransDuration)
      .style('fill', mapFillColor)
      .style('opacity', mapOpacity);
};
let mouseClick = function(d) { //De/select SD on mouse click
  var unselect = this === selected ? true : false;
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
    d3.select(this)
        .transition()
        .style('fill', selectedFillColor)
        .attr('stroke-width', selectedStrokeWidth)
        .duration(mouseTransDuration);
    selected = this;
    updateZMap(+this.id.substring(2)); // Update zoomed map
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
var map = d3.select('body')
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
    .on('click', mouseClick);;

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
    .on('mouseover', mouseOver)
    .on('mouseleave', mouseLeave)
    .on('click', mouseClick);

// Add circle to map for each school data point
d3.csv(scoresCsv).then(function(d) {
  scores = d; // Save scores to global variable
  map.selectAll('circle')
    .data(d)
    .enter()
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
      .style('fill', pointColor)
      .style('stroke', pointStrokeColor)
      .style('stroke-width', pointStrokeWidth)
      .style('opacity', pointOpacity);
});

// ZOOMED MAP //////////////////////////////////////////////////////////////////
// Create zoomed map
var mapZ = d3.select('body')
  .append('svg')
    .attr('width', mapZWidth)
    .attr('height', mapZHeight);
mapZ.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', mapZWidth)
    .attr('width', mapZHeight)
    .style('stroke', mapBorderColor)
    .style('fill', 'none')
    .style('stroke-width', mapBorderW);

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
  console.log('DISTRICT ' + sd + ' SELECTED');

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
      // .attr('id', 'sd' + sd + 'z')
      .style('opacity', mapOpacity);
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
    // .attr('id', 'sd' + sd + 'z')
    .style('opacity', mapOpacity);
  }
  
  // Add circle to zoomed map for each school in target SD
  mapZ.selectAll('circle')
    .data(scores)
    .enter()
    .append('circle')
      .filter(function(d) { // Filter schools only in target SD
        if (sd === 10) { // Deal with double SD10 geoJSON entries
          return +d.District === sd || d.District === '10b';
        } else {
          return +d.District === sd;
        }
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
    .append('title') // Tooltip: {SchoolName: avgMath/avgReading/avgWriting}
      .text(function(d) {
        return d['School Name'] + ' Averages: ' + d[math] + ' Math/' + 
               d[reading] + ' Reading/' + d[writing] +' Writing';
      });
}