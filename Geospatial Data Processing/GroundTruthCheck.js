var START_DATE = ee.Date('2021-01-01');
var END_DATE = ee.Date('2021-12-31');
var MAX_CLOUD_PROBABILITY = 15;
var region = Tarla3

function maskClouds(img) {
  var clouds = ee.Image(img.get('cloud_mask')).select('probability');
  var isNotCloud = clouds.lt(MAX_CLOUD_PROBABILITY);
  return img.updateMask(isNotCloud);
}

function maskEdges(s2_img) {
  return s2_img.updateMask(s2_img.select('B8A').mask().updateMask(s2_img.select('B9').mask()));
}

// Criteria = AOI and Date Range
var criteria = ee.Filter.and(ee.Filter.bounds(region),ee.Filter.date(START_DATE, END_DATE));
// Filter out Sentinel-2 Level 2A collection based on criteria
s2Sr = s2Sr.filter(criteria).map(maskEdges);
// Filter out S2_CLOUD_PROBABILITY collection based on criteria
s2Clouds = s2Clouds.filter(criteria);

// Merge two datasets.
var s2SrWithCloudMask = ee.Join.saveFirst('cloud_mask').apply({
  primary: s2Sr,
  secondary: s2Clouds,
  condition:ee.Filter.equals({leftField: 'system:index', rightField: 'system:index'})
});

/*
Below function calculates the average cloudiness of an image within a specified region. 
It does this by first applying the reduceRegion method to the clouds image, which applies a specified reducer (in this case, the mean reducer) to the image and returns 
the resulting value for each band in the image. The geometry and scale parameters are also provided to specify the region over which the reduction should be performed 
and the scale at which the reduction should be performed, respectively.The get method is then called on the result of the reduceRegion method, which extracts the specified 
property (in this case, the 'probability' property) from the result and returns it as a server-side object. This value represents the average cloudiness of the image within the specified region.
*/
function filterClouds(img) {
    var clouds = ee.Image(img.get('cloud_mask')).select('probability');
    var cloudiness = clouds.reduceRegion({
        reducer: 'mean',
        geometry: region,
        scale: 10,
    }).get('probability');
    return img.set({'CLOUD_COVERAGE_AOI': cloudiness});
}

s2SrWithCloudMask = s2SrWithCloudMask.map(filterClouds);
s2SrWithCloudMask = s2SrWithCloudMask.filterMetadata('CLOUD_COVERAGE_AOI', 'less_than', MAX_CLOUD_PROBABILITY)

 function addEOM(image) {
    var EOM = image.normalizedDifference(['B12', 'B4']).rename('EOM')
    var NDVI = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands([EOM,NDVI])
  }
var collection = ee.ImageCollection(s2SrWithCloudMask).map(addEOM);
   
  // get the time series analysis of the area
var chart_EOM = ui.Chart.image.series({
    imageCollection: collection.select('EOM'),
    region: region.bounds()
    }).setOptions({
        interpolateNulls: true,
        lineWidth: 1,
        pointSize: 3,
        title: 'EOM2 over Time at a Single Location',
        vAxis: {title: 'EOM2'},
        hAxis: {title: 'Date', format: 'YYYY-MMM', gridlines: {count: 10}}
  
    })
    
var chart_NDVI = ui.Chart.image.series({
    imageCollection: collection.select('NDVI'),
    region: region.bounds()
    }).setOptions({
        interpolateNulls: true,
        lineWidth: 1,
        pointSize: 3,
        title: 'EOM2 over Time at a Single Location',
        vAxis: {title: 'EOM2'},
        hAxis: {title: 'Date', format: 'YYYY-MMM', gridlines: {count: 10}}
  
  })    
  
print("Time Series EOM", chart_EOM)
print("Time Series NDVI", chart_NDVI)  
print("Collection", s2SrWithCloudMask);

// Print list of Collection Images
print(collection)
// Put all the dates of images in a list
var allDates = ee.List(collection.aggregate_array('system:index'));
print(allDates)
Map.setCenter(35.23259396706073,36.6281503841465);
  
var image_1 = ee.Image('COPERNICUS/S2_SR/20210219T082001_20210219T082249_T36SXF')
var image_2 = ee.Image('COPERNICUS/S2_SR/20210907T081601_20210907T082251_T36SXF')
var image_3 = ee.Image('COPERNICUS/S2_SR/20211017T081941_20211017T082254_T36SXF')
var rgbVis = {min: 0, max: 3000, bands: ['B4', 'B3', 'B2']};
Map.addLayer(image_1, vizParams, '1')  
Map.addLayer(image_2, vizParams, '2')  
Map.addLayer(image_3, vizParams, '3')  
Map.addLayer(Tarla1,{'color': 'red'},'Geometry [red]: polygon');
