import * as d3 from 'd3';
import data from './school_districts.json';
import scores from './scores.csv';
import sdCenters from './school_district_centers.csv';

const math = 'Average Score (SAT Math)';
const reading = 'Average Score (SAT Reading)';
const writing = 'Average Score (SAT Writing)';

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

var pointRadius = 3;
var pointColor = 'orange';
var pointStrokeColor = 'gray'
var pointStrokeWidth = 0.25;
var pointOpacity = 0.75;

var mapHoverColor = '#2b506e';
var mapNonFocusOpacity = 0.6; // non-mouseovered SD opacity
var mouseTransDuration = 100; // warning: can be glitchy w/ quick mouseovers in succession

var mapScaleFactor = 2; // Scale zoomed map to desired dimensions
var mapZWidth = 350 * mapScaleFactor; // DO NOT CHANGE
var mapZHeight = 350 * mapScaleFactor; // DO NOT CHANGE
var mapZStartSD = 31;
var mapZStrokeWidth = 2;

var selected = false;
var selectedSD = null;
var selectedStrokeWidth = 2;
var selectedFillColor = 'red';

// Mouse event functions: highlight SDs on mouseover, select SD on mouseclick
let mouseOver = function(d) {
  // d3.selectAll('.District') // Fade other SDs
  //     .transition()
  //     .duration(mouseTransDuration)
  //     .style('fill', mapFillColor)
  //     .style('opacity', mapOpacity);
  d3.select(this) // Highlight overview target SD
      .filter(function(d) { // Filter selected SD
        return selected ? this != selectedSD : true;
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
let mouseLeave = function(d) {
  // d3.selectAll('.District') // Unfade other SDs
  //     .transition()
  //     .duration(mouseTransDuration)
  //     .style('opacity', mapOpacity);
  if (selectedSD != this) { // Do not de-highlight selected SD
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
let mouseClick = function(d) {
  if (this === selectedSD && selected) { // If targetting selected SD, unselect
    d3.select(this)
        .transition()
        .style('fill', mapFillColor)
        .attr('stroke-width', mapStrokeWidth)
        .duration(mouseTransDuration);
    selected = false;
  } else {
    if (selected) { // Unselect old selected SD
      d3.select(selectedSD)
          .transition()
          .style('fill', mapFillColor)
          .attr('stroke-width', mapStrokeWidth)
          .duration(mouseTransDuration);
    }
    d3.select(this) // Select target SD
        .transition()
        .style('fill', selectedFillColor)
        .attr('stroke-width', selectedStrokeWidth)
        .duration(mouseTransDuration);
    selected = true;
    selectedSD = this;
    updateZMap(this); // Update zoomed map
  }
}

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
    .style('stroke', mapBorderColor)
    .style('fill', 'none')
    .style('stroke-width', mapBorderW);

// Create map of NYC SDs
map.selectAll('path')
  .data(data.features)
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

// Add circle to map for each score data point
d3.csv(scores).then(function(d) {
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
      .style('opacity', pointOpacity)
    .append('title') // Tooltip: {SchoolName: avgMath/avgReading/avgWriting}
      .text(function(d) {
        return d['School Name'] + ': ' + d[math] + '/' + d[reading] + '/' + d[writing];
      });
});

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
d3.csv(sdCenters).then(function(d) {
  centers = d; // Save center coords to global variable

  // Update projection to center and zoom on set start SD
  zProjection.center([0, +d[mapZStartSD - 1].lat])
    .rotate([+d[mapZStartSD - 1].lon, 0])
    .scale(+d[mapZStartSD - 1].zoom * mapScaleFactor);
  zPath = d3.geoPath().projection(zProjection);

  // Draw set start SD on zoomed map
  mapZ.selectAll('path')
    .data(data.features)
    .enter()
    .append('path')
      .filter(function(d) {
        return d.properties.SchoolDist === mapZStartSD;
      })
      .attr('d', zPath)
      .attr('stroke', mapStrokeColor)
      .attr('stroke-width', mapStrokeWidth)
      .attr('fill', mapFillColor)
      .attr('class', function(d) {
        return 'District'
      })
      .attr('id', 'sd' + mapZStartSD + 'z')
      .style('opacity', mapOpacity);
})

// Updates zoomed map to target SD
let updateZMap = function(sd) {
  mapZ.selectAll('path').remove(); // Remove previous SD
  var district = +sd.id.substring(2);
  var center = [+centers[district - 1].lat, +centers[district - 1].lon]; // target SD center coords
  console.log('DISTRICT ' + district + ' SELECTED');

  // Update zoomed path generator to target SD
  zProjection.center([0, center[0]])
      .rotate([center[1], 0])
      .scale(+centers[district-1].zoom * mapScaleFactor);
  zPath = d3.geoPath().projection(zProjection);

  // Draw target SD on zoomed map
  mapZ.selectAll('path')
    .data(data.features)
    .enter()
    .append('path')
      .filter(function(d) {
        return d.properties.SchoolDist === district;
      })
      .attr('d', zPath)
      .attr('stroke', mapStrokeColor)
      .attr('stroke-width', mapZStrokeWidth)
      .attr('fill', mapFillColor)
      .attr('class', function(d) {
        return 'District'
      })
      .attr('id', 'sd' + district + 'z')
      .style('opacity', mapOpacity);
}

// Remove this
map.append('text')
    .attr('x', 15)
    .attr('y', 25)
    .text('Hover a point to see school and average math/reading/writing SAT scores');
