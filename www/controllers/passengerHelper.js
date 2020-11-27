/**
 * this file created by jawad nsiar on 15-3-2018 to isolate passenger helper functions that is required again and again
 * @type {*|Mongoose}
 */
var mongoose = require('mongoose');
var User = mongoose.model('passengers');
var helper = require('./helper');

exports.addUnverfiedPhone = function (req, phoneNumbers, code, cb) {

    var obj = {
        code:code,
        is_verified:false,
        created_at: new Date(),
        phone:req.body.phone,
        user_type:req.body.user_type
    };
    helper.add(obj,phoneNumbers,function(err,phone){
        console.log("-->> adding unverified phone into phone_numbers collection");
    });
    obj = {message: "Success", success: true, code: 200};
    helper.addAuditLog('phoneNumbers', req.body, '', obj, 'sendPincode', req.body.phone, 'P');
    cb(obj);
};
