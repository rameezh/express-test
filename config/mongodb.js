'use strict';

const config = require('./config');
const _ = require('lodash');
const mongoose = require('mongoose');
const requireWalk = require('../www/utils/requireWalk').requireWalk;

module.exports = (onConnectedHandler) => {
    // mongoose events
    mongoose.connection.on('connecting', () => { console.log('MONGOOSE_EVENT [connecting]'); });

    mongoose.connection.on('connected', () => {
        console.log('MONGOOSE_EVENT [connected]');
        console.log(' [\u2713] MONGOOSE_EVENT [connected]');
        if (_.isFunction(onConnectedHandler)) onConnectedHandler.apply(null, arguments);
    });

    mongoose.connection.once('open', () => { console.log('MONGOOSE_EVENT [opened]'); });

    mongoose.connection.on('reconnected', () => { console.log('MONGOOSE_EVENT [reconnected]'); });

    mongoose.connection.on('disconnected', () => { console.log('MONGOOSE_EVENT [disconnected]'); });

    mongoose.connection.on('error', (error) => {
        console.error('MONGOOSE_EVENT [error]: ' + error);
        mongoose.disconnect();
    });

    // close connection on process EXIT
    process.on('SIGINT', () => {
        mongoose.connection.close(() => {
            console.log('Mongoose disconnected through app termination');
            process.exit(0);
        });
    });

    // const uri = `${config.get('database').mongodb.uri}:${config.get('database').mongodb.port}/${config.get('database').mongodb.dbname}`;
    const uri = "mongodb+srv://challengeUser:WUMglwNBaydH8Yvu@challenge-xzwqd.mongodb.net/getir-case-study?retryWrites=true"
    const options = Object.assign(
        _.get(config.get('database').mongodb, 'options', {}), // if "options" provided in "config"
        { useNewUrlParser: true }
    );

    console.log('MONGO DB connecting to: ', uri);

    mongoose.connect(uri, options);

    const requireModels = requireWalk(config.get('root') + '/www/models');
    requireModels();
};

