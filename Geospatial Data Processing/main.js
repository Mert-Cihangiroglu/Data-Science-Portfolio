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
  
  // Adding a EOM band
  function addEOM(image) {
    var EOM = image.normalizedDifference(['B3', 'B12']).rename('EOM')
    return image.addBands([EOM])
  }
  
  
  var startDate = '2019-01-01'
  var endDate = '2022-08-01'
  
  var collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterDate(startDate, endDate)
      .map(maskCloudAndShadows)
      .map(addEOM)
      .filter(ee.Filter.bounds(dusaf))
      
  var testPoint = ee.Feature(dusaf.first())
  //Map.centerObject(testPoint, 10)
  var chart = ui.Chart.image.series({
      imageCollection: collection.select('EOM'),
      region: testPoint.geometry().bounds()
      }).setOptions({
        interpolateNulls: true,
        lineWidth: 1,
        pointSize: 3,
        title: 'EOM2 over Time at a Single Location',
        vAxis: {title: 'EOM2'},
        hAxis: {title: 'Date', format: 'YYYY-MMM', gridlines: {count: 12}}
  
      })
  print(chart)
  
  var filteredCollection = collection.select('EOM').filter(ee.Filter.bounds(testPoint.geometry().bounds()))
  
  var timeSeries = ee.FeatureCollection(filteredCollection.map(function(image) {
    var stats = image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: testPoint.geometry().bounds(),
      scale: 10,
      maxPixels: 1e10
    })
    // reduceRegion doesn't return any output if the image doesn't intersect
    // with the point or if the image is masked out due to cloud
    // If there was no EOM value found, we set the EOM to a NoData value -9999
    var EOM = ee.List([stats.get('EOM'), -9999])
      .reduce(ee.Reducer.firstNonNull())
  
    // Create a feature with null geometry and EOM value and date as properties
    var f = ee.Feature(null, {'EOM': EOM,
      'date': ee.Date(image.get('system:time_start')).format('YYYY-MM-dd')})
    return f
  }))
  
  // Check the results
  print("Time Series", timeSeries)
  
  // Export to CSV
  Export.table.toDrive({
      collection: timeSeries,
      description: 'Single_Location_EOM_time_series',
      folder: 'earthengine',
      fileNamePrefix: 'EOM_time_series_single',
      fileFormat: 'CSV'
  })
  
  /////////////////////////////////////////////////////////////////////////////////////////////
  
  var chart = ui.Chart.image.seriesByRegion({
      imageCollection: collection.select('EOM'),
      regions: dusaf,
      reducer: ee.Reducer.mean()
  })
  var triplets = collection.map(function(image) {
    return image.select('EOM').reduceRegions({
      collection: dusaf, 
      reducer: ee.Reducer.mean().setOutputs(['EOM']), 
      scale: 10,
    })// reduceRegion doesn't return any output if the image doesn't intersect
      // with the point or if the image is masked out due to cloud
      // If there was no EOM value found, we set the EOM to a NoData value -9999
      .map(function(feature) {
      var EOM = ee.List([feature.get('EOM'), -9999])
        .reduce(ee.Reducer.firstNonNull())
      return feature.set({'EOM': EOM, 'imageID': image.id()})
      })
    }).flatten();
    
    print("Triplets:", triplets.first())
    
    var format = function(table, rowId, colId) {
    var rows = table.distinct(rowId); 
    var joined = ee.Join.saveAll('matches').apply({
      primary: rows, 
      secondary: table, 
      condition: ee.Filter.equals({
        leftField: rowId, 
        rightField: rowId
      })
    });
          
    return joined.map(function(row) {
        var values = ee.List(row.get('matches'))
          .map(function(feature) {
            feature = ee.Feature(feature);
            return [feature.get(colId), feature.get('EOM')];
          });
        return row.select([rowId]).set(ee.Dictionary(values.flatten()));
      });
  };
  
  var sentinelResults = format(triplets, 'fid', 'imageID');
  
  print("sentinelResults", sentinelResults.first())
  var merge = function(table, rowId) {
    return table.map(function(feature) {
      var id = feature.get(rowId)
      var allKeys = feature.toDictionary().keys().remove(rowId)
      var substrKeys = ee.List(allKeys.map(function(val) { 
          return ee.String(val).slice(0,8)}
          ))
      var uniqueKeys = substrKeys.distinct()
      var pairs = uniqueKeys.map(function(key) {
        var matches = feature.toDictionary().select(allKeys.filter(ee.Filter.stringContains('item', key))).values()
        var val = matches.reduce(ee.Reducer.max())
        return [key, val]
      })
      return feature.select([rowId]).set(ee.Dictionary(pairs.flatten()))
    })
  }
  var sentinelMerged = merge(sentinelResults, 'fid');
  print("Sentinel Merged", sentinelMerged.first())
  Export.table.toDrive({
      collection: sentinelMerged,
      description: 'Multiple_Locations_MNDWI_time_series',
      folder: 'earthengine',
      fileNamePrefix: 'MNDWI_time_series_multiple',
      fileFormat: 'CSV'
  })
  