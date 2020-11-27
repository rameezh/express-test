const config = require('./config/config');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const _ = require('lodash');
const async = require('async');
const express = require('express');
const http = require('http');
require('./config/mongodb')();
const passport = require('passport');

const requireWalk = require('./www/utils/requireWalk').requireWalk;

// constants
const env = config.get('environment');
const _server_port = config.get('server').api.port;

// expressjs setup
const app = express();

let server = null;

http.globalAgent.maxSockets = Infinity;
server = http.createServer(app);

async.series([
    function (callback) {
        require('./config/express')(app, express);
        callback(null, true);
    },  
    function (callback) {
        var requireRoutes = requireWalk(config.get('root') + '/www/routes');
        requireRoutes(config, app, passport);
        callback(null, true);
    },
    function (callback) {
        //init plugins
        const plugins = require('./www/plugins/index');

        global.plugins = new plugins();
        callback(null, true);
    },
]);


server.listen(_server_port, () => {
    console.log(' [\u2713] Process ' + process.pid + ' is listening on port ' + _server_port);
});