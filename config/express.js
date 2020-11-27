'use strict';

var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development',
  config = require('./config'),
// Custom winston logger
  params = require('express-params'),
  cors = require('cors'),
  compression = require('compression'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override');


module.exports = function (app, express) {
  app.use(bodyParser.json({limit: '5mb'}));
  app.use (function (error, req, res, next){
    if (req.path.indexOf('/v3')) {
      if (error) return res
      .status(403)
      .send('Forbidden')
      .end();    
    }
  });
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.text({type:"text/plain"}));
  params.extend(app);
  app.use(compression());
  app.set('port', config.get('port'));
  app.use(cors());

  //app.use(express.urlencoded())

  app.disable('x-powered-by');

  app.use(methodOverride('X-HTTP-Method-Override'));
  // HTTP log
  app.use(app.router);

  // static files are handled by NGINX in production
  app.use(express.static([config.get('root'), 'app'].join('/')));
};
