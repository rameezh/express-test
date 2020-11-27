const boom = require('@hapi/boom');
const _ = require('lodash');

exports.decorateErrorResponseV2 = (error) => {
    // if "joi" error object
    if (error && error.isJoi) {
        error = boom.badRequest(error.details[0].message, { error: error.details });
    }

    // if "boom" error object
    if (error && error.isBoom) {
        const _code = _.get(error, 'output.statusCode', 500);
        const _payload = Object.assign(error.output.payload, error.data, { message: error.message });

        // change "statusCode" to "code"
        _.set(_payload, 'code', _code);
        _.unset(_payload, 'statusCode');

        // remove "data" if "null"
        if (_.isNull(_payload.data))
            _.unset(_payload, 'data');

        // respond
        return { _code, _payload };

    }

    return { _code: 1, _payload: { message: 'Internal server error', error } };
}
