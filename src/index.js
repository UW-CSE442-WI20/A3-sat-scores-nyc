import * as d3 from 'd3';
import * as d3ss from 'd3-simple-slider';
import data from './school_districts.json';
import scores from './scores.csv';
import sdCenters from './school_district_centers.csv';

const math = 'Average Score (SAT Math)';
const reading = 'Average Score (SAT Reading)';
const writing = 'Average Score (SAT Writing)';
var selected = false;
var selectedSD = null;

// DEFINE FUNCTIONS

// hover functionality variables
var mouseTransDuration = 100; // warning: can be glitchy w/ quick mouseovers in succession
var mapHoverColor = '#2b506e';
var mapFillColor = 'steelblue';
var mapOpacity = 0.9;

// Mouse event functions: highlight SDs on mouseover
// 'this' basically map object: stroke, fill, class, id, style, etc
let mouseOver = function() {
  d3.select(this) // Highlight overview target SD
      .filter(function() { // Filter selected SD
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

let mouseLeave = function() {
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

let mouseClick = function() {
  if (this === selectedSD && selected) { // If targetting selected SD, unselect
    d3.select(this)
        .transition()
        .style('fill', mapFillColor)
        .duration(mouseTransDuration);
    selected = false;
  } else {
    if (selected) { // Unselect old selected SD
      d3.select(selectedSD)
          .transition()
          .style('fill', mapFillColor)
          .duration(mouseTransDuration);
    }
    d3.select(this) // Select target SD
        .transition()
        .style('fill', 'red')
        .duration(mouseTransDuration);
    selected = true;
    selectedSD = this;
  }
}

// DEFINE PROJECTION, MAP, MAPBORDER VARIABLES

// map variables
var mapWidth = 600;
var mapHeight = 600;
var mapScale = 75000;  // map zoom
var nycLoc = [40.7128, 74.0060]; // [long, lat]
var mapOffset = [0, -0.04];  // map centering
var mapBorderW = 2;
var mapBorderColor = 'black';
var mapStrokeColor = 'black';
var mapStrokeWidth = 0.5;

// Path generator: projection centered on NYC and scaled
var projection = d3.geoAlbers()
    .center([0, nycLoc[0] + mapOffset[0]])
    .rotate([nycLoc[1] + mapOffset[1], 0])
    .translate([mapWidth/2, mapHeight/2])
    .scale([mapScale]);
var path = d3.geoPath().projection(projection);

// Create Map SVG element
var map = d3.select("#map")
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

// ------------------------------------------------

// CREATING MAP AND PAINTING POINTS

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

// point variables
var pointRadius = 3;
var pointColor = 'orange';
var pointStrokeColor = 'gray'
var pointStrokeWidth = 0.25;
var pointOpacity = 0.75;

function update(val) {
  console.log("update called");
    // Add circle to map for each score data point
  d3.selectAll('circle').remove();
  d3.csv(scores).then(function(d) {
    map.selectAll('circle')
      .data(d)
      .enter()
      .filter(function(d) { 
        var score = d["Average Score (SAT Math)"]; 
        if (score == '')
          return false; 
        else if (score > val[0] && score < val[1]) {
          return true;
        } else 
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
        .style('fill', pointColor)
        .style('stroke', pointStrokeColor)
        .style('stroke-width', pointStrokeWidth)
        .style('opacity', pointOpacity)
      .append('title')
        .text(function(d) {
          return d['School Name'] + ': ' + d[math] + '/' + d[reading] + '/' + d[writing];
        });
  });
}
var vals = [0, 800];
update(vals);

// SLIDER STUFF 
var sliderRange = d3ss
.sliderBottom()
.width(300)
.ticks(8)
.min(0)
.max(800)
.default([400, 500])
.fill('#2196f3')
.on('onchange', val => {
  update(val);
});

var gRange = d3
.select('#math')
.append('svg')
.attr('width', 500)
.attr('height', 100)
.append('g')
.attr('transform', 'translate(30,30)');

gRange.call(sliderRange);

// CREATING SMALLER MAP

var mapZWidth = 350;
var mapZHeight = 350;
var mapZScale = 115000;

// // TESTING; CURRENT FOCUS: SD 31, STATEN ISLAND ///////////////
var statenSD = [40.58, 74.19]

// Create zoomed map
var mapZ = d3.select('#chart2')
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

// // Path generator: CENTERED ON STATEN ISLAND
var zProjection = d3.geoAlbers()
    .center([0, statenSD[0]])
    .rotate([statenSD[1] + mapOffset[1], 0])
    .translate([mapZWidth/2, mapZHeight/2])
    .scale([mapZScale]);
var zPath = d3.geoPath().projection(zProjection);

d3.csv(sdCenters).then(function(d) { // Load in csv of SD center lat/lon coords
  var statenSD = [+d[30].lat, +d[30].lon]; // SD 31 at index 30

  // Draw SD: 31 HARDCODED
  mapZ.selectAll('path')
    .data(data.features)
    .enter()
    .append('path')
      .filter(function(d) {
        return d.properties.SchoolDist === 31; // Staten SD
      })
      .attr('d', zPath)
      .attr('stroke', mapStrokeColor)
      .attr('stroke-width', mapStrokeWidth)
      .attr('fill', mapFillColor)
      .attr('class', function(d) {
        return 'District'
      })
      .attr('id', 'sd31z')
      .style('opacity', mapOpacity)
})
// // TESTING; CURRENT FOCUS: SD 31, STATEN ISLAND ///////////////

// // Remove this
// map.append('text')
//     .attr('x', 15)
//     .attr('y', 25)
//     .text('Hover a point to see school and average math/reading/writing SAT scores');
