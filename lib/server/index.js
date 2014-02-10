var express = require('express');
var derby = require('derby');
var racerBrowserChannel = require('racer-browserchannel');
var liveDbMongo = require('livedb-mongo');
var MongoStore = require('connect-mongo')(express);
var app = require('../app');
var error = require('./error');
var fs = require('fs');

var expressApp = module.exports = express();

// Get Redis configuration
if (process.env.REDIS_HOST) {
  var redis = require('redis').createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
  redis.auth(process.env.REDIS_PASSWORD);
} else if (process.env.REDISCLOUD_URL) {
  var redisUrl = require('url').parse(process.env.REDISCLOUD_URL);
  var redis = require('redis').createClient(redisUrl.port, redisUrl.hostname);
  redis.auth(redisUrl.auth.split(":")[1]);
} else {
  var redis = require('redis').createClient();
}
redis.select(process.env.REDIS_DB || 1);
// Get Mongo configuration 
var mongoUrl = process.env.MONGO_URL || process.env.MONGOHQ_URL ||
  'mongodb://localhost:27017/temple';

// The store creates models and syncs data
var store = derby.createStore({
  db: {
    db: liveDbMongo(mongoUrl + '?auto_reconnect', {safe: true})
  , redis: redis
  }
});

function createUserId(req, res, next) {
  var model = req.getModel();
  var userId = req.session.userId || (req.session.userId = model.id());
  model.set('_session.userId', userId);
  next();
}


expressApp

expressApp
  .use(express.favicon())
  // Gzip dynamically
  .use(express.compress())
  // Respond to requests for application script bundles
  .use(app.scripts(store))
  // Serve static files from the public directory
  .use(express.static(__dirname + '/../../public'))

  // Add browserchannel client-side scripts to model bundles created by store,
  // and return middleware for responding to remote client messages
  .use(racerBrowserChannel(store))
  // Add req.getModel() method
  .use(store.modelMiddleware())

  // Parse form data
  .use(express.bodyParser())
  // .use(express.methodOverride())

  // Session middleware
  .use(express.cookieParser())
  .use(express.session({
    secret: process.env.SESSION_SECRET || 'ThisIsZetCom!'
  , store: new MongoStore({url: mongoUrl, safe: true})
  }))
  .use(createUserId)



  // Create an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(error())


// SERVER-SIDE ROUTES //

expressApp.post('/upload', function(req, res) {
  console.log("uploading file " + req.files.media.name)
  /* 
  var tempPath = req.files.media.path,
    targetPath = path.resolve('./upload/test.png') */

  var model = req.getModel();

  var collection = model.at('_page.collection')

  if (!collection.get('id')) {
    // var checkId = collection.on('change', 'id')
    model.add('collection', collection.get())
  }
  //app.history.push('/collection')
  // app.page.redirect("/search")

});

expressApp.all('*', function(req, res, next) {
  next('404: ' + req.url);
});


