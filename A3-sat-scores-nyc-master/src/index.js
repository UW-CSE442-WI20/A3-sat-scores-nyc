import * as d3 from 'd3';
import data from './school_districts.json';
import scores from './scores.csv';

let math = 'Average Score (SAT Math)';
let reading = 'Average Score (SAT Reading)';
let writing = 'Average Score (SAT Writing)';

var nycLoc = [40.7128, 74.0060]; // [long, lat]
var mapOffset = [0, -0.04];  // map centering
var mapWidth = 800;  // Change it a little bit
var mapHeight = 800;
var mapScale = 95000;  // map zoom
var mapBorderW = 2;
var mapBorderColor = 'black';
var mapStrokeColor = 'black';
var mapStrokeWidth = 0.5;
var mapFillColor = 'steelblue';

var panelWidth = 700;
var panelHeight = 700;
var satFullscore = 2400;

var pointRadius = 3;
var pointColor = 'orange';
var pointStrokeColor = 'gray';
var pointStrokeWidth = 0.25;
var pointOpacity = 0.75;

var mapNonFocusOpacity = 0.6; // non-mouseovered SD opacity
var mouseTransDuration = 0; // warning: can be glitchy w/ quick mouseovers in succession


// Mouse event functions: highlight SD on mouseover
let mouseOver = function(d) {
  d3.selectAll('.District')
    .transition()
    .duration(mouseTransDuration)
    .style('opacity', mapNonFocusOpacity);
  d3.select(this)
    .transition()
    .duration(mouseTransDuration)
    .style('opacity', 1)

  var cool = d3.select(this).data()[0];
  //console.log(cool); 
  // Filter function works at here.
  // var dd = [1, 2, 3, 5, 6, 7, 7, 7];
  // var ee = dd.filter(function(d){return d > 2;});
  // console.log(ee)
  
  var sat_all = [];
  var sat_math = [];
  var sat_reading = [];
  var sat_writing = [];
  d3.csv(scores).then(function(data){
    data.forEach(function(d){
      if (d3.geoContains(cool, [parseFloat(d.Longitude), parseFloat(d.Latitude)]))
      {
        if (d["Average Score (SAT Math)"])
        {
          sat_math.push(parseFloat(d["Average Score (SAT Math)"]));
          sat_reading.push(parseFloat(d["Average Score (SAT Reading)"]));
          sat_writing.push(parseFloat(d["Average Score (SAT Writing)"]));
          sat_all.push(parseFloat(d["Average Score (SAT Math)"]) + parseFloat(d["Average Score (SAT Reading)"]) + parseFloat(d["Average Score (SAT Writing)"]));
        }
      }
      //console.log(d3.geoContains(cool, [parseFloat(d.Longitude), parseFloat(d.Latitude)]));
      
    });

    // Sort the arrays in-place in ascending order
    sat_math.sort(function(a, b){return a-b});
    sat_reading.sort(function(a, b){return a-b});
    sat_writing.sort(function(a, b){return a-b});
    sat_all.sort(function(a, b){return a-b});
    //console.log(sat_all);

    // Find q1, median and q3
    var q1_all = d3.quantile(sat_all, .25);
    var median_all = d3.quantile(sat_all, .5);
    var q3_all = d3.quantile(sat_all, .75);
    var interQuantileRange_all = q3_all - q1_all;
    var min_all = q1_all - 1.5 * interQuantileRange_all;
    var max_all = q1_all + 1.5 * interQuantileRange_all;

    var q1_math = d3.quantile(sat_math, .25);
    var median_math = d3.quantile(sat_math, .5);
    var q3_math = d3.quantile(sat_math, .75);
    var interQuantileRange_math = q3_math - q1_math;
    var min_math = q1_math - 1.5 * interQuantileRange_math;
    var max_math = q1_math + 1.5 * interQuantileRange_math;

    var q1_reading = d3.quantile(sat_reading, .25);
    var median_reading = d3.quantile(sat_reading, .5);
    var q3_reading = d3.quantile(sat_reading, .75);
    var interQuantileRange_reading = q3_reading - q1_reading;
    var min_reading = q1_reading - 1.5 * interQuantileRange_reading;
    var max_reading = q1_reading + 1.5 * interQuantileRange_reading;

    var q1_writing = d3.quantile(sat_writing, .25);
    var median_writing = d3.quantile(sat_writing, .5);
    var q3_writing = d3.quantile(sat_writing, .75);
    var interQuantileRange_writing = q3_writing - q1_writing;
    var min_writing = q1_writing - 1.5 * interQuantileRange_writing;
    var max_writing = q1_writing + 1.5 * interQuantileRange_writing;



    // Try updated plots
    svg.selectAll("toto").remove(); // can comment this line without any effect.
    svg.selectAll("rect").remove();
    svg.selectAll("line").remove();

    // Add the y axis
    svg.call(d3.axisLeft(y));

    // Add the main line
    svg
    .append("line")
      .attr("x1", 150)
      .attr("x2", 150)
      .attr("y1", y(min_all) )
      .attr("y2", y(max_all) )
      .attr("stroke", "black")

    // Show the box
    var center = 150;
    var width = 100;
    svg
    .append("rect")
      .attr("x", center - width/2)
      .attr("y", y(q3_all) )
      .attr("height", (y(q1_all)-y(q3_all)) )
      .attr("width", width )
      .attr("stroke", "black")
      .style("fill", "#69b3a2")

    // show median, min and max horizontal lines
    svg
    .selectAll("toto")
    .data([min_all, median_all, max_all])
    .enter()
    .append("line")
      .attr("x1", center-width/2)
      .attr("x2", center+width/2)
      .attr("y1", function(d){ return(y(d))} )
      .attr("y2", function(d){ return(y(d))} )
      .attr("stroke", "black")

    //svg.remove();




  });
}

var svg = d3.select("body")
    .append("svg")
      .attr("width", 400)
      .attr("height", 800)
      .attr('x', 200)
      .attr('y', 200)
    .append("g")
      .attr("transform",
            "translate(" + 50 + "," + 50 + ")");

var y = d3.scaleLinear()
  .domain([600,2000])
  .range([500, 0]);
//svg.call(d3.axisLeft(y))


    // Add the main line


let mouseLeave = function(d) {
  d3.selectAll('.District')
    .transition()
    .duration(mouseTransDuration)
    .style('opacity', 1);
  d3.select(this)
    .transition()
    .duration(mouseTransDuration)
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
    .on('mouseover', mouseOver)
    .on('mouseleave', mouseLeave);  
    //.on('click', mouseClick);
    // let mouseClick

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



































