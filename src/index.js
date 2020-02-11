import * as d3 from 'd3';
import data from './school_districts.json';
import scores from './scores.csv'

const math = 'Average Score (SAT Math)';
const reading = 'Average Score (SAT Reading)';
const writing = 'Average Score (SAT Writing)';

var nycLoc = [40.7128, 74.0060]; // [long, lat]
var mapOffset = [0, -0.04];  // map centering
var mapWidth = 800;
var mapHeight = 800;
var mapScale = 95000;  // map zoom
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

// Mouse event functions: highlight SD on mouseover
let mouseOver = function(d) {
  d3.selectAll('.District')
      .transition()
      .duration(mouseTransDuration)
      .style('fill', mapFillColor)
      .style('opacity', mapOpacity);
  d3.select(this)
      .transition()
      .duration(mouseTransDuration)
      .style('fill', mapHoverColor)
      .style('opacity', mapOpacity);
};
let mouseLeave = function(d) {
  d3.selectAll('.District')
      .transition()
      .duration(mouseTransDuration)
      .style('opacity', mapOpacity);
  d3.select(this)
      .transition()
      .style('fill', mapFillColor)
      .duration(mouseTransDuration);
};

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
    .style('opacity', mapOpacity)
    .on('mouseover', mouseOver)
    .on('mouseleave', mouseLeave);

// Add circle to map for each score data point
d3.csv(scores).then(function(d) {
  console.log(d);
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

// Remove this
map.append('text')
    .attr('x', 15)
    .attr('y', 25)
    .text('Hover a point to see school and average math/reading/writing SAT scores');
