const _ = require('lodash');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

exports.schema = () => {
    return Joi.object().keys({
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
        minCount: Joi.number().positive().allow(0).required(),
        maxCount: Joi.number().positive().allow(0).required(),
    });
};

exports.decorate = (value) => {
    return _(value).omitBy(_.isUndefined).omitBy(_.isNull).value();
};