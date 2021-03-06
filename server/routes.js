var express = require('express');

var router = express.Router();

var multiparty = require('multiparty');
var fs = require('fs');

var db = require('mongoskin').db(process.env.MONGO_URL);

// get the collection passed in param and return the result in JSON
router.get('/api/v1/:collection', function(req, res){

  var collection = req.params.collection
  var model = req.getModel();

  var query = model.query(collection, {});
	query.subscribe(function(err) {
  	if (err) return next(err);
  	res.json(query.get());
	});

});

// Get all distinct material technique values from the database
router.get('/api/v1/collection/materialTechnique', function(req, res, next) {
  // in mongo this works : db.collection.aggregate({$group: {_id: "$materialTechnique"}})
  db.collection('collection').aggregate({$group: {_id: "$materialTechnique"}}, function(err, result) {
    res.json(result);
  });
});

router.get('/api/v1/admin/views', function(req, res, next) {
  db.collection('adminViews').aggregate({$group: {_id: "$name"}}, function(err, result) {
    res.json(result);
  });
});

router.get('/api/v1/admin/fields', function(req, res, next) {
  db.collection('adminFields').aggregate({$group: {_id: "$internalName"}}, function(err, result) {
    res.json(result);
  });
});

// file upload
router.post('/p/collection/upload', function(req, res, next) {
  var form, model, fileUploaded;
  model = req.getModel();
  form = new multiparty.Form();
  form.on('file', function(name, file) {
    // debug :
    /*console.log('name', name);
    console.log('file', file);*/
    fs.readFile(file.path, function (err, data) {
      var newPath = __dirname + '/../public/files/'+ file.fieldName;
      fs.writeFile(newPath, data, function (err) {
        if (err) {
          console.log('error file upload', err);
          return next(err);
        }
        fileUploaded = {
          id: file.fieldName.replace(/\.[^/.]+$/, ""),
          fileOriginalFilename: file.originalFilename,
          fileName: file.fieldName,
          fileSize: file.size
        };
        // save in model
        model.add('file', fileUploaded)
        // return result for processing
        return res.json(fileUploaded);
      });
    });
  });

  /*
  form.on('part', function(part) {
    var cancel, companyId, data, esc, fileId, fileName;
    fileName = part.filename;
    console.log('part', fileName);
    if (!fileName) {
      console.log('field', part.name);
      data = '';
      part.on('data', function(chunk) {
        return data += chunk;
      });
      part.on('end', function() {
        return console.log('value', part.name, data);
      });
      return part.resume();
    }
    companyId = model.id();
    fileId = model.id();
    console.log('companyId='+companyId);
    console.log('fileId='+fileId);
    //esc = util.esc(next, debug);
    //await(storage.upload(part, companyId, fileId, fileName, esc(defer(file))));
    cancel = function(err) {
      console.log('cancel', err);
      // storage.remove(file);
      return next(err);
    };
    //esc = util.esc(cancel, debug);
    console.log('add file');
    await(model.add('files', file, esc(defer())));
    console.log('response');
    return res.json({
      fileId: fileId
    });
  });
  */

  form.on('error', function(err) {
    return console.log('error', err);
  });
  form.on('close', function() {
    return console.log('completed');
  });
  return form.parse(req);
  });

module.exports = router;
