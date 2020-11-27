const mongoose = require('mongoose');
const _ = require('lodash');
const Joi = require('joi');
const boom = require('@hapi/boom');
const partnerHelper = require('../helpers/Partner');
const services = require('../services');
const batches = mongoose.model('batches');
const cache = require('../lib/Redis');
const _chars = 'ABCDEFGHIJKLMNOPQRSTUVWXY';
const GeoCoder = require('../controllers/geocoder');
const rabbitmqHelper = require('../helpers/RabbitMQ');
const websterHelper = require('../helpers/Webster');


const getRecords = async (data) => {
    
}

const updateBatch = async (batch_id, data) => {

    const batch = await services.BatchService.getBatchById(batch_id);

    if (_.isNil(batch)) {
        throw boom.notFound("Batch does not exist");
    }

    if (!['pending', 'arrived', 'started'].includes(batch.status)) {
        throw boom.badData(`Cannot update batch on ${batch.status} state`, { subcode: 1088 });
    }

    const updated_batch = await services.BatchService.updateBatch(batch_id, data);
    
    return updated_batch;
}


module.exports = { getRecords }

