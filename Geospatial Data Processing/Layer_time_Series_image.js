function maskCloudAndShadows(image) {
    var cloudProb = image.select('MSK_CLDPRB');
    var snowProb = image.select('MSK_SNWPRB');
    var cloud = cloudProb.lt(5);
    var snow = snowProb.lt(5);
    var scl = image.select('SCL'); 
    var shadow = scl.eq(3); // 3 = cloud shadow
    var cirrus = scl.eq(10); // 10 = cirrus
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    var qa = image.select('QA60');
    // Cloud probability less than 5% or cloud shadow classification
    var mask = (cloud.and(snow)).and(cirrus.neq(1)).and(shadow.neq(1)).and(qa.bitwiseAnd(cloudBitMask).eq(0)
        .and(qa.bitwiseAnd(cirrusBitMask).eq(0)));
    return image.updateMask(mask);
  }
  var startDate = '2022-06-01'
  var endDate = '2022-08-01'
  // Define a Polygon object.
  var polygon = ee.Geometry.Polygon(
      [[[8.630490880164624,45.34698177086573],[8.63067819334664,45.34644174811587],[8.630655631680176,45.34699121657558],[8.630490880164624,45.34698177086573]]]);
  
  // Apply the coordinates method to the Polygon object.
  var polygonCoordinates = polygon.coordinates();
  
  // Print the result to the console.
  //print('polygon.coordinates(...) =', polygonCoordinates);
  
  var collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterDate(startDate, endDate)
      .map(maskCloudAndShadows)
      .filter(ee.Filter.bounds(polygon))
   
  //Map.centerObject(testPoint, 10)
  var chart = ui.Chart.image.series({
      imageCollection: collection.select('B5'), // Select the values from Band5
      region: polygon.bounds()
      }).setOptions({
        interpolateNulls: true,
        lineWidth: 1,
        pointSize: 3,
        title: 'B5 over Time at a Single Location',
        vAxis: {title: 'B5'},
        hAxis: {title: 'Date', format: 'YYYY-MMM', gridlines: {count: 10}}
      })
  
  print("Time Series Chart",chart)
  print("Filtered Collection",collection)
  var allDates = ee.List(collection.aggregate_array('system:index'));
  //print(collection('0'))
  print(allDates)
  // Display relevant polygon the map.
  Map.setCenter(8.630490880164624,45.34698177086573); 
  //var ImageList= collection.toList(999);
  //var 2ndImage=ee.Image(ee.List(ImageList).get(1)); //note index 0 is the first image
  //print('2ndImage from FilteredCollection',2ndImage)
  //Get the image with image ID, you can get the image Id from the above List
  print(ee.Image('COPERNICUS/S2_SR/20220605T101559_20220605T102306_T32TMR')) 
  Map.addLayer(ee.Image('COPERNICUS/S2_SR/20220620T102041_20220620T102035_T32TMR'))
  Map.addLayer(polygon,
               {'color': 'black'},
               'Geometry [black]: polygon');