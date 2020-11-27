'use strict';

process.env.staging = true; // TODO: move it to global settings or config

const { isUndefined } = require('lodash');
const path = require('path');
const nconf = require('nconf');

// Setup nconf to use (in-order):
//   1. Command-line arguments
//   2. Environment variables
//   3. A file located at '/config/env/{environment}.json'

// load config
nconf.argv(); // read from cli arguments
nconf.env(); // read from process.env

// identify env
let env = nconf.get('env');

if (isUndefined(nconf.get('env'))) {
    if (isUndefined(process.env.NODE_ENV)) {
        process.env.NODE_ENV = 'development'; // set default env
    }
    env = process.env.NODE_ENV;
} else {
    process.env.NODE_ENV = env;
}

// load config
nconf.file({ file: path.join(__dirname, 'env', `${env}.json`) }); // read from file

console.log('=======================');
console.log('env', env);
console.log('environment', nconf.get('environment'));
console.log('NODE_ENV', process.env.NODE_ENV);
console.log('=======================');

// cookie expiration one year from now
var now = new Date();
var oneYear = new Date();
oneYear.setYear(now.getFullYear() + 1);

// load default config
nconf.defaults({
    root: path.resolve(__dirname + '/../'),
    app: {
        name: 'Getir-Backend-test'
    },
});

module.exports = nconf;
