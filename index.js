// Define a point of interest (Nairobi, Kenya)
var point = ee.Geometry.Point([36.8219, -1.2864]);  // Longitude, Latitude for Nairobi

Map.centerObject(point, 6);

// Define the time range for analysis
var time_start = '2014-01-01', time_end = '2024-12-31';

// Filter image collection (CHIRPS Precipitation Data)
var pr = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')
  .filterDate(time_start, time_end)
  .filterBounds(point);

print('Initial Image Collection Size:', pr.size()); 

// Function to calculate mean precipitation for each image
function pr_class(img) {
  var stats = img.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: point,
    scale: 5000,
    bestEffort: true
  });
  
  var pr_mean = ee.Algorithms.If(stats.contains('precipitation'), stats.get('precipitation'), 0); // Handle null values

  return img.set('pr_mean', pr_mean);
}

// Apply the function to the image collection
var pr_values = pr.map(pr_class).filter(ee.Filter.gt('pr_mean', 0)); // Remove images with zero precipitation

// Define realistic dry and wet thresholds based on Nairobi’s climate
var dry = pr_values.filter(ee.Filter.lt('pr_mean', 1));  // Precipitation < 1 mm
var wet = pr_values.filter(ee.Filter.gt('pr_mean', 5));  // Precipitation > 5 mm
var mid = pr_values.filter(ee.Filter.rangeContains('pr_mean', 1, 5)); // 1 mm <= Precipitation <= 5 mm

print('Dry Conditions Image Collection Size:', dry.size());
print('Wet Conditions Image Collection Size:', wet.size());
print('Mid-range Conditions Image Collection Size:', mid.size());

// Chart for dry conditions
var dryChart = ui.Chart.image.series(dry, point, ee.Reducer.mean(), 5000)
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Dry Conditions (Precipitation < 1 mm)',
    vAxis: {title: 'Mean Precipitation (mm)', format: 'decimal'},
    hAxis: {title: 'Date', format: 'yyyy-MM-dd'},
    series: {0: {color: 'red'}},
    lineWidth: 2,
    pointSize: 4
  });
print(dryChart);

// Chart for wet conditions
var wetChart = ui.Chart.image.series(wet, point, ee.Reducer.mean(), 5000)
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Wet Conditions (Precipitation > 5 mm)',
    vAxis: {title: 'Mean Precipitation (mm)'},
    hAxis: {title: 'Date', format: 'yyyy-MM-dd'},
    series: {0: {color: 'blue'}},
    lineWidth: 2,
    pointSize: 4
  });
print(wetChart);

// Monthly Mean Precipitation Trend
var months = ee.List.sequence(1, 12); // List of months

// Function to compute monthly mean precipitation
var monthlyMeans = months.map(function(m) {
  var filtered = pr_values.filter(ee.Filter.calendarRange(m, m, 'month'));
  
  var meanPrecip = filtered.aggregate_mean('pr_mean'); // Compute mean precipitation for the month
  
  return ee.Feature(null, {'month': m, 'mean_precipitation': meanPrecip});
});

// Convert to FeatureCollection for visualization
var monthlyCollection = ee.FeatureCollection(monthlyMeans);

// Create a chart for monthly mean precipitation
var monthlyChart = ui.Chart.feature.byFeature(monthlyCollection, 'month', 'mean_precipitation')
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Monthly Mean Precipitation in Nairobi (2014-2024)',
    vAxis: {title: 'Mean Precipitation (mm)'},
    hAxis: {title: 'Month', format: '0'},
    series: {0: {color: 'purple'}},
    legend: {position: 'none'}
  });
print(monthlyChart);

// ** Public Health Epidemiology Analysis **
// 1. Compute the number of extreme dry and wet events per year
var yearlyTrends = ee.List.sequence(2014, 2024).map(function(year) {
  var dryCount = dry.filter(ee.Filter.calendarRange(year, year, 'year')).size();
  var wetCount = wet.filter(ee.Filter.calendarRange(year, year, 'year')).size();
  
  return ee.Feature(null, {
    'year': year,
    'dry_events': dryCount,
    'wet_events': wetCount
  });
});

// Convert to FeatureCollection for charting
var yearlyTrendsFC = ee.FeatureCollection(yearlyTrends);

// Create a time series chart for extreme events
var extremeEventsChart = ui.Chart.feature.byFeature(yearlyTrendsFC, 'year', ['dry_events', 'wet_events'])
  .setChartType('LineChart')
  .setOptions({
    title: 'Yearly Trends in Extreme Dry and Wet Events',
    vAxis: {title: 'Number of Events'},
    hAxis: {title: 'Year'},
    series: {
      0: {color: 'red', label: 'Dry Events'},
      1: {color: 'blue', label: 'Wet Events'}
    }
  });

print(extremeEventsChart);

// ** Interpretation for Epidemiologists **
print('Public Health Insights:');
print('1. Dry periods (red on the heatmap) may indicate higher risks of waterborne diseases due to reduced water availability.');
print('2. Wet periods (blue on the heatmap) may indicate increased mosquito breeding sites, raising risks of malaria and dengue fever.');
print('3. Seasonal precipitation trends help predict disease outbreaks and support disaster preparedness efforts.');

// Add the point of interest to the map for visual reference
Map.addLayer(point, {color: 'yellow'}, 'Point of Interest');