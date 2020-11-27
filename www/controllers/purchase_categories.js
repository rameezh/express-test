const _ = require('lodash'),
    mongoose = require('mongoose'),
    Joi = require('joi'),
    cities = mongoose.model('cities'),
    services = require('../services');

Joi.objectId = require('joi-objectid')(Joi);

exports.getPurchaseCategoryList = async (req, res) => {
    try {
        let condition = {status: "active"};
        let projection = {_id: 0, uName: 1, icon: 1, eName: 1, order: 1, google_type: 1};
        if(!_.isUndefined(req.user.back_office)) { // check backoffice user
            condition = {};
            projection = {dt: 0, dtu: 0};
        }
        const purchase_category_list = await services.PurchaseCategory.getList(condition, projection);
        if (_.isEmpty(purchase_category_list))
            throw new Error('Data not found');

        res.send({code: 200, message: 'success', success: true, data: purchase_category_list});

    } catch (err) {
        res.send(500, {code: 500, error: err, message: err.message, success: false});
    }
}

exports.getDetailById = async (req, res) => {
    try {
        // validation
        const schema = Joi.object().keys({
            id: Joi.objectId().required()
        });

        const _input = Object.assign({}, req.params);
        const { error, value } = Joi.validate(_input, schema, {abortEarly: false, allowUnknown: true});
        if (!_.isNull(error)) return res.send(400, {
            code: 400,
            error: error.details,
            message: 'validation error',
            success: false
        });

        const rs_purchase_category = await services.PurchaseCategory.getById(value.id, {
            uName: 1,
            eName: 1,
            icon: 1,
            name: 1,
            order: 1,
            status: 1
        });
        if (_.isNull(rs_purchase_category))
            throw new Error('Data not found');

        res.send({code: 200, message: 'success', success: true, data: rs_purchase_category});

    } catch (err) {
        res.send(500, {code: 500, error: err, message: err.message, success: false});
    }
}

exports.addPurchaseCategory = async (req, res) => {
    try {
        // validation
        const schema = Joi.object().keys({
            uName: Joi.string().required(),
            eName: Joi.string().required(),
            order: Joi.number().required(),
            icon: Joi.string(),
            status: Joi.string().valid('active', 'inactive'),
            name: Joi.string().required()
        });
        const { error, value } = Joi.validate(req.body, schema, {abortEarly: false, allowUnknown: true});
        if (!_.isNull(error)) return res.send(400, {
            code: 400,
            error: error.details,
            message: 'validation error',
            success: false
        });
        if (typeof req.files.image !== "undefined") {
            //uploadImage
            const image = await services.PurchaseCategory.uploadImage(req.files.image, req.files.image.name);
            value.icon = image.Location; // get complete URL of image
            const rs_purchase_category = await services.PurchaseCategory.create(value);
            if (_.isNull(rs_purchase_category))
                return res.send(409, {code: 409, message: 'Already exists', success: false});

            return res.send({code: 200, message: 'success', success: true, data: rs_purchase_category});
        } else
            return res.send(400, {code: 400, message: 'Please select file', success: false});
    } catch (err) {
        return res.send(500, {code: 500, error: err, message: err.message, success: false});
    }
}

exports.updatePurchaseCategory = async (req, res) => {
    try {
        // validation
        const schema = Joi.object().keys({
            id: Joi.objectId().required(),
            uName: Joi.string(),
            name: Joi.string(),
            eName: Joi.string(),
            icon: Joi.string(),
            status: Joi.string().valid('active', 'inactive'),
            order: Joi.number()
        });

        const _input = Object.assign({}, req.params, req.body);
        const { error, value } = Joi.validate(_input, schema, {abortEarly: false});
        if (!_.isNull(error)) return res.send(400, {
            code: 400,
            message: 'Validation error',
            error: error.details,
            success: false
        });
        if (typeof req.files.image !== "undefined") {
            //uploadImage
            const image = await services.PurchaseCategory.uploadImage(req.files.image, req.files.image.name);
            value.icon = image.Location; // get complete URL of image
        }
        const rs_purchase_category = await services.PurchaseCategory.update(value.id, value);
        if (_.isNull(rs_purchase_category))
            throw new Error('Data not found');

        res.send({code: 200, message: 'success', success: true, data: rs_purchase_category});

    } catch (err) {
        res.send(500, {code: 500, error: err, message: err.message, success: false});
    }
}

exports.deletePurchaseCategory = async (req, res) => {
    try {
        // validation
        const schema = Joi.object().keys({
            id: Joi.objectId().required()
        });

        const _input = Object.assign({}, req.params);
        const { error, value } = Joi.validate(_input, schema, {abortEarly: false, allowUnknown: true});
        if (!_.isNull(error)) return res.send(400, {
            code: 400,
            error: error.details,
            message: 'validation error',
            success: false
        });

        const rs_purchase_category = await services.PurchaseCategory.delete(value.id);
        if (_.isNull(rs_purchase_category))
            throw new Error('Data not found');

        res.send({code: 200, message: 'success', success: true});

    } catch (err) {
        res.send(500, {code: 500, error: err, message: err.message, success: false});
    }
}

exports.addPOI = async (req, res) => {

    // validation
    const schema = Joi.object().keys({
        _id: Joi.string().required(), // Passenger Id
        token_id: Joi.string().required(), // token
        name: Joi.string().required(),
        address: Joi.string().required(),
        google_address: Joi.string().required(), // google formatted address
        phone: Joi.string().max(15).regex(/^\d+$/),
        mobile: Joi.string().regex(/^(923)-{0,1}\d{2}-{0,1}\d{7}$|^\d{11}$|^\d{4}-\d{7}$/, 'numbers').max(12).min(12).required(), // mobile number
        images_id: Joi.array().items(Joi.objectId().required()),
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
        pluscode: Joi.string(),
        open_hours: Joi.string(),
        website: Joi.string().regex(/(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/),
        is_public: Joi.boolean().required(),
        category: Joi.array().items(Joi.string().required())
    });

    const { error, value } = Joi.validate(req.body, schema, { abortEarly: false });
    if (!_.isNull(error)) return res.send(400, { code: 400, message: error.details[0].message, error: error.details, success: false });

    try {

        let _params = _.clone(value);

        if (!_.isUndefined(_params.phone) && _params.phone.startsWith('0')) // i.e. 03451112223
            _params.phone = '92' + _params.phone.substr(1);

        if (_params.mobile.startsWith('0')) // i.e. 03451112223
            _params.mobile = '92' + _params.mobile.substr(1);

        _params.loc = { coordinates: [_params.lng, _params.lat] };
        _params.created_by = _params._id;
        _params = _.omit(_params, '_id'); // remove "_id"

        // add "point of interest"
        const result = await services.POI.add(_params);
        // update uploaded images
        await services.Upload.updateUploadFiles(value.images_id, {is_used : true});

        return res.send({ code: 200, message: 'success', success: true, data: result });
    } catch (err) {
        return res.send(500, { code: 500, error: err, message: "Please try later", success: false });
    }
}