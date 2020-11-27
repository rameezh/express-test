const _ = require('lodash');
const boom = require('@hapi/boom');

//  constants

/**
 * Run data decorator and return data along with validation schema
 * @description Run data decorator and return data along with validation schema
 * @instance
 * @param {Object} data - Data
 * @param {Object} plugins - Plugins Collection
 * @param {Object} [options] - options
 * @param {Boolean} [options.update=false] - If its update plugin
 * @return {Object} { schema, trip_data }
 */
module.exports = async (data, plugins, options = {}, config) => {

    // set defaults
    _.defaults(options, { update: false });

    const _schema = plugins[options.decoratorKey].schema();
    const _data = plugins[options.decoratorKey].decorate(data);

    return {
        schema: _schema,
        data: _data,
    };

};