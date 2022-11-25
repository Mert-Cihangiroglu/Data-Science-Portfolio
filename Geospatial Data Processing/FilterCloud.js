//  Filter the image within a specific time frame and choose the image that has the least amount of clouds.

//choose the coordinate of the city
var city = ee.Geometry.Point(119.86402211849132,-0.8879604180432479);
Map.centerObject(city,7.5);

//filter the date of the image
var start = ee.Date('2019-01-01');
var end = ee.Date('2019-12-31');

//create image collection
var palu = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
  .filterBounds(city)
  .filterDate(start,end)
  .sort('CLOUD_COVER',false);
Map.addLayer(palu);
print(palu);

//choose image using specific threshold for cloud
var palu2 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
   .filterBounds(city)
  .filterDate(start,end)
  .filterMetadata('CLOUD_COVER', 'less_than', 30);
Map.addLayer(palu2);
print(palu2);

//choose image using specific threshold for cloud
var palu3 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
   .filterBounds(city)
  .filterDate(start,end)
  .filterMetadata('CLOUD_COVER', 'less_than', 5);
Map.addLayer(palu3);
print(palu3);
