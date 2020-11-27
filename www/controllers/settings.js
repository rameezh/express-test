const _ = require('lodash');
const Promise = require('bluebird');
const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const settings = mongoose.model('settings');
const cities = mongoose.model('cities');
const helper = require('./helper');
const services = require('../services');

exports.addField = function (req, res) {
    var data = req.body;
    var requirement = { field_name: null, field_value: null };
    for (var k in requirement) {
        if (data[k] == null || data[k] == '' || !data[k]) {
            return res.status(400).json({ code: 400, success: false, message: "Please Send " + k });
        }
    }
    var obj = new settings(data);
    obj.save(function (err, d) {
        if (err) {
            return res.status(400).json({ code: 400, success: false, message: "database occurred error", err: err });
        } else {
            return res.status(200).json({ code: 200, success: true, message: "Successfully Created ", data: d });
        }
    })
};

exports.createBanner = async (req, res, next) => {
    try {

        // validation
        const schema = Joi.object().keys({
            service_code: Joi.any().required(),
            img_url: Joi.string().required(),
            city: Joi.string().required()
        });

        const _input = Object.assign(req.body);
        const { error, value } = Joi.validate(_input, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send(400, { code: 400, message: '', error: error.details, success: false });

        const result = await services.Media.Banner.create(value.img_url, value.service_code, value.city);

        res.send({ data: result, code: 200, success: true });

    } catch (e) {
        res.send(500, { code: 500, message: '', error: e.message, success: false });
    }
}

exports.getBanners = async (req, res, next) => {
    try {

        // validation
        const schema = Joi.object().keys({
            lng: Joi.number().min(-180).max(180),
            lat: Joi.number().min(-90).max(90),
            city: Joi.string().default(null),
            lang: Joi.string().default('ur')
        }).and('lat', 'lng');

        const _input = Object.assign(req.query);
        const { error, value } = Joi.validate(_input, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send(400, { code: 400, message: '', error: error.details, success: false });

        // get city id
        let city_id;
        if (!_.isNull(value.city))
            city_id = await cities.findOne({ name: value.city }); // TODO: create a method for this in service
        if ((_.isNull(city_id) || _.isUndefined(city_id)) && !_.isUndefined(value.lat))
            city_id = await Promise.promisify(helper.getNearestCity)(value.lat, value.lng); // TODO: move this method to service

        // get banner list
        const condition = { status: 'active', lang: value.lang };
        if(!_.isNull(city_id) && !_.isUndefined(city_id)) { 
            condition['city'] = city_id;
        }
        const result = await services.Media.Banner.getByCondition(condition);
        res.send({ data: result, code: 200, success: true });

    } catch (e) {
        res.send(500, { code: 500, message: '', error: e, success: false });
    }
}

exports.destroyBanner = async (req, res, next) => {
    try {
        // validation
        const schema = Joi.object().keys({
            id: Joi.objectId().required()
        });

        const _input = Object.assign({}, req.params);
        const { error, value } = Joi.validate(_input, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send(400, { code: 400, message: '', error: error.details, success: false });

        // delete banner
        const result = await services.Media.Banner.delete(value.id);

        if (result)
            res.send({ code: 200, success: true });
        else
            res.send(404, { code: 404, message: '', success: false });
    } catch (e) {
        res.send(500, { code: 500, message: '', error: e, success: false });
    }
}

exports.updateBanner = async (req, res, next) => {
    try {

        // validation
        const schema = Joi.object().keys({
            id: Joi.objectId(),
            sequence: Joi.number().positive().required()
        });

        const _input = Object.assign({}, req.params, req.body);
        const { error, value } = Joi.validate(_input, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send(400, { code: 400, message: '', error: error.details, success: false });

        // update banner
        const result = await services.Media.Banner.update(value.id, value.sequence);

        res.send({ data: result, code: 200, success: true });

    } catch (e) {
        res.send(500, { code: 500, message: '', error: e, success: false });
    }
}

exports.getAllServices = async (req, res, next) => {
    try {
        // validation
        const schema = Joi.object().keys({
            lng: Joi.number().min(-180).max(180),
            lat: Joi.number().min(-90).max(90),
            city: Joi.string().default(null)
        }).and('lat', 'lng');

        const _input = Object.assign(req.query);
        const { error, value } = Joi.validate(_input, schema, { abortEarly: false, allowUnknown: true });
        if (!_.isNull(error)) return res.send(400, { code: 400, message: '', error: error.details, success: false });

        // get city id
        let result;
        if (!_.isNull(value.city)) {
            const city = await services.City.getByName(value.city);
            result = await services.Category.getByCity(city._id, { app_visible: true });
        } else
            result = await services.Category.getByLocation(value.lat, value.lng, { app_visible: true });

        res.send({ data: result, code: 200, success: true });

    } catch (e) {
        res.send(500, { code: 500, message: '', error: e, success: false });
    }
}