'use strict';

const recordMediator = require('../controllers/records');

//  constants
const apiVersion = "/api/v1/";

module.exports = (config, app) => {

   app.post(apiVersion + 'get/records', recordMediator.getRecords);
}