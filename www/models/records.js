'use strict';

const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const Records = new Schema({
    key: { type: String },
    created_at :{type:Date,default:Date.now},
    value: { type: String },
    counts: { type: Array }
});

mongoose.model('records', Records);
