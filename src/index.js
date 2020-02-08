import * as d3 from 'd3';
import data from './school_districts.json';

var nycLoc = [40.7128, 74.0060]; // [long, lat]
var mapOffset = [0, -0.04];  // map centering
var mapWidth = 800;
var mapHeight = 800;
var mapScale = 95000;  // map zoom
var mapBorderW = 2;
var mapBorderColor = 'black';
var mapFillColor = 'steelblue';

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
  .attr('fill', mapFillColor);
