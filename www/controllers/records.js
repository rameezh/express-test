'use strict';

const _ = require('lodash');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const boom = require('@hapi/boom');
const services = require('../services/');
const helper = require('../utils/helper');
const mongoose = require('mongoose');
const record_model = mongoose.model('records');

class Records {

    static async getRecords(req, res) {

        try {

            const { schema, data } = await global.plugins.call('record', req.body, { decoratorKey: 'getRecordsValidation' });

            const { error, value } = Joi.validate(data, schema, { abortEarly: false });

            if (!_.isNull(error)) {
                return res.send({
                    code: 1,
                    message: error.details[0].message,
                    success: false
                });
            }

            const records = await services.Record.getRecord(value);

            if (_.isNil(records) || _.isEmpty(records)) throw boom.notFound('No records found');

            res.send({ code: 0, success: true, data: records });

        } catch (error) {
            const error_response = helper.decorateErrorResponseV2(error);
            res.send(error_response._code, error_response._payload);
        }
    }


}

module.exports = Records;
