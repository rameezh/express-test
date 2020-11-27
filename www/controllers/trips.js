/**
 * Created by APC 3 on 10/12/2016.
 */
const mongoose = require('mongoose');
const Drivers = mongoose.model('drivers');
const Trips = mongoose.model('trips');
const invoice = mongoose.model('invoices');
const Users = mongoose.model('passengers');
const UserRatting = mongoose.model('user_ratings');
const helperSocket = require('../socket/helper.socket');
const helper = require('./helper');
const rabbitmqHelper = require('../helpers/RabbitMQ');
const cache = require('../lib/Redis');

const _ = require('lodash');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const services = require('../services');
const notification_events = require('../notifications/events');


//var nodemailer = require('nodemailer');
//var transporter = nodemailer.createTransport('smtp://applico008@gmail.com:apppassword@smtp.gmail.com');



/**
 * @api {get} /getdriverrunningtrip Check Driver Running Trips
 * @apiVersion 0.1.0
 * @apiName check-driver-running-trips
 * @apiGroup Trips
 *
 * @apiDescription Check all that trips which is not completed due to internet failer or any other reason.
 *
 * @apiParam {String} token_id The Token ID.
 * @apiParam {String} _id ID could be passender_id or driver_id.
 *
 *
 * @apiSuccess {String}   code       200.
 * @apiSuccess {String}   message    success message.
 * @apiSuccess {String}   success    true
 *
 */

exports.getRunningDriverTrip = function(req,res){
    var requirement = {"token_id": null, "_id": null};
    var data =req.query;
    //console.log("\n\n ******************************************************************************************\n\n");
    //console.log("\n\n getRunningDriverTrip = ", data);
    //console.log("\n\n ******************************************************************************************\n\n");

    for (var key in requirement) {
        if (!data[key] || data[key] == '' || data[key] == null) {
            return res.send({
                code: 401, message: "Please Send " + key, success: false
            });
        }
    }
    var log_obj = {};
    helper.is_login(data, Drivers, function (err, user) {
        if (err) {
            log_obj = {
                code: 400, message: "", success: false, result: err
            };
            helper.addAuditLog('Drivers', data, '', log_obj,  data._id, 'D');
            return res.send(err);
        } else if (!user || user == null || user == '') {
            log_obj = {
                code: 401, message: "User not found", success: false
            };
            helper.addAuditLog('Drivers', data, '', log_obj,  data._id, 'P');
            return res.send(log_obj);
        } else {
            Trips.findOne({
                driver_id: data._id,
                $or: [{'status': 'accepted'}, {'status': 'started'}, {status: 'arrived'},{status:'finished'}] //Accepted, Started, Arrived, Completed, Cancelled
            }, function (err, result) {

                if (err) {
                    log_obj = {
                        code: 400, message: "Database Error Occurred", success: false
                    };
                    helper.addAuditLog('Trips', data, '', log_obj,  data._id, 'P');
                    return res.send(log_obj);
                } else if (!result || result == null || result == '') {
                    return res.send({
                        code: 404, message: "Trip Not Found", success: false
                    });
                } else {
                    if(typeof result.invoice_id !== "undefined"){
                        helper.getOne({trip_id:result._id},invoice, function(err, Inv){
                            //console.log("\n\n\n\n invoice data = ", Inv);
                            if(err){
                                log_obj = { code: 400, message: "Database error occurred", success: false,error:err};
                                return res.send(log_obj);
                            }else if(!Inv || Inv == null){
                                log_obj = { code: 400, message: "Your Trip Has No Invoice Please Contact Support", success: true, data: result};
                                return res.send(log_obj)
                            }else{
                                helper.getOne({_id:result.passenger_id},Users, function(err,pass){
                                    if(err){
                                        return res.send({
                                            code:400,message:"Passenger Not Available For Complete This Trip Please Contact Support",
                                            success:false
                                        })
                                    }else{
                                        Inv = JSON.stringify(Inv);
                                        Inv = JSON.parse(Inv);
                                        result = JSON.stringify(result);
                                        result = JSON.parse(result);
                                        if(typeof result.status == "undefined"){
                                            // Assign value to the property here
                                            result.status = "";
                                        }
                                        var initateTime = new Date(result.created_at).getTime();
                                        var ress = {
                                            trip_id:result._id,
                                            pass_id : pass._id,
                                            full_name : pass.full_name,
                                            phone_no : pass.phone,
                                            start_lat : result.pickup_lat,
                                            start_lng :result.pickup_lng,
                                            rec_no: result.rec_no ? result.rec_no : "",
                                            status : result.status,
                                            cType  : result.creator_type,
                                            trip_no:result.trip_no,
                                            initiate_time : initateTime,
                                            wc      :pass.credits
                                        };
                                        for( var i  in result){
                                            if(i == '_id'){
                                                ress['trip_id'] = result['_id']
                                            }else{
                                                ress[i] =  result[i];
                                            }
                                        }

                                        for (var j in Inv){
                                            if(j =='_id'){
                                                ress['invoice_id'] =Inv[j];
                                            }else{
                                                ress[j] =Inv[j]
                                            }
                                        }
                                        ress["status"]="finished";
                                        return res.send({
                                            code: 200, message: "Incomplete Trip Data", success: true, data: ress
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        var status = "completed";
                        var key = result._id + "-completed";
                        helperSocket.getRedis(key, function (err, tripCompleted){
                            //console.log("redis tripCompleted = ", err, tripCompleted);
                            tripCompleted = JSON.parse(tripCompleted);
                            if (tripCompleted && tripCompleted.completed) {
                                helper.updateOne({"_id": result._id}, {"$set": {"status": status}}, Trips, function (errors, trips) {});
                                return res.send({
                                    code: 404, message: "Trip Not Found", success: false
                                });
                            } else {
                                key = result._id + "-feedbackflag";
                                helperSocket.getRedis(key, function (err, tripFeedback){
                                    //console.log("redis tripFeedback = ", err, tripFeedback);
                                    tripFeedback = JSON.parse(tripFeedback);
                                    //console.log("tripFeedback = ", err, tripFeedback);
                                    if (tripFeedback && tripFeedback.feedback) {
                                        status = "feedback";

                                        helper.updateOne({"_id": result._id}, {"$set": {"status": status}}, Trips, function (errors, result) {
                                            return res.send({
                                                code: 404, message: "Trip Not Found", success: false
                                            });
                                        });
                                    } else {
                                        key = result._id + "-finishedflag";
                                        helperSocket.getRedis(key, function (err, tripFinished){
                                            tripFinished = JSON.parse(tripFinished);
                                            //console.log("redis Finished = ", err, tripFinished);
                                            if (tripFinished && tripFinished.finished) {
                                                status = "finished";

                                                helper.updateOne({"_id": result._id}, {"$set": {"status": status}}, Trips, function (errors, result) {
                                                    helper.getOne({trip_id:result._id},invoice, function(err, Inv){
                                                        //console.log("\n\n\n\n invoice data = ", Inv);
                                                        if(err){
                                                            log_obj = { code: 400, message: "Database error occurred", success: false,error:err};
                                                            return res.send(log_obj);
                                                        }else if(!Inv || Inv == null){
                                                            log_obj = { code: 400, message: "Your Trip Has No Invoice Please Contact Support", success: true, data: result};
                                                            return res.send(log_obj)
                                                        }else{
                                                            helper.getOne({_id:result.passenger_id},Users, function(err,pass){
                                                                if(err){
                                                                    return res.send({
                                                                        code:400,message:"Passenger Not Available For Complete This Trip Please Contact Support",
                                                                        success:false
                                                                    })
                                                                }else{
                                                                    Inv = JSON.stringify(Inv);
                                                                    Inv = JSON.parse(Inv);
                                                                    result = JSON.stringify(result);
                                                                    result = JSON.parse(result);
                                                                    if(typeof result.status == "undefined"){
                                                                        // Assign value to the property here
                                                                        result.status = "";
                                                                    }
                                                                    var initateTime = new Date(result.created_at).getTime();
                                                                    var ress = {
                                                                        trip_id:result._id,
                                                                        pass_id : pass._id,
                                                                        full_name : pass.full_name,
                                                                        phone_no : pass.phone,
                                                                        start_lat : result.pickup_lat,
                                                                        start_lng :result.pickup_lng,
                                                                        rec_no: result.rec_no ? result.rec_no : "",
                                                                        status :result.status,
                                                                        trip_no:result.trip_no,
                                                                        initiate_time : initateTime,
                                                                        cType  : result.creator_type,
                                                                        wc      :pass.credits
                                                                    };
                                                                    for( var i  in result){
                                                                        if(i == '_id'){
                                                                            ress['trip_id'] = result['_id']
                                                                        }else{
                                                                            ress[i] =  result[i];
                                                                        }
                                                                    }

                                                                    for (var j in Inv){
                                                                        if(j =='_id'){
                                                                            ress['invoice_id'] =Inv[j];
                                                                        }else{
                                                                            ress[j] =Inv[j]
                                                                        }
                                                                    }
                                                                    ress["status"]="finished";
                                                                    return res.send({
                                                                        code: 200, message: "Incomplete Trip Data", success: true, data: ress
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                });
                                                //
                                            } else {
                                                key = result._id + "-startedflag";
                                                helperSocket.getRedis(key, function (err, tripStarted){
                                                    //console.log("\n\n\n\n redis tripStarted = ", tripStarted);
                                                    tripStarted = JSON.parse(tripStarted);
                                                    if (tripStarted && tripStarted.started) {
                                                        status = "started";
                                                        //console.log("tripStarted = ", err, tripStarted);
                                                        helper.updateOne({"_id": result._id}, {"$set": {"status": status}}, Trips, function (errors, result) {
                                                            helper.getOne({_id: result.passenger_id}, Users, function (err, pass) {
                                                                if (err) {
                                                                    log_obj = {
                                                                        code: 400,
                                                                        message: "Passenger Not Available For Complete This Trip Please Contact Support",
                                                                        success: false
                                                                    };
                                                                    helper.addAuditLog('Trips', result, '', log_obj, data._id, 'P');
                                                                    return res.send(log_obj)
                                                                } else {
                                                                    if (pass) {
                                                                        result = JSON.stringify(result);
                                                                        result = JSON.parse(result);
                                                                        if (typeof result.status == "undefined") {
                                                                            // Assign value to the property here
                                                                            result.status = "";
                                                                        }
                                                                        var initateTime = new Date(result.created_at).getTime();
                                                                        var ress = {
                                                                            trip_id: result._id,
                                                                            pass_id: pass._id,
                                                                            full_name: pass.full_name,
                                                                            phone_no: pass.phone,
                                                                            start_lat: result.pickup_lat,
                                                                            start_lng: result.pickup_lng,
                                                                            rec_no: result.rec_no ? result.rec_no : "",
                                                                            trip_no: result.trip_no,
                                                                            status: result.status,
                                                                            initiate_time: initateTime,
                                                                            cType  : result.creator_type,
                                                                            wc      :pass.credits
                                                                        };
                                                                        for (var i  in result) {
                                                                            ress[i] = result[i]
                                                                        }
                                                                        return res.send({
                                                                            code: 200,
                                                                            message: "Incomplete Trip Data",
                                                                            success: true,
                                                                            data: ress
                                                                        });
                                                                    }
                                                                }
                                                            });
                                                        });
                                                    } else {
                                                        helper.getOne({_id: result.passenger_id}, Users, function (err, pass) {
                                                            if (err) {
                                                                log_obj = {
                                                                    code: 400,
                                                                    message: "Passenger Not Available For Complete This Trip Please Contact Support",
                                                                    success: false
                                                                };
                                                                helper.addAuditLog('Trips', result, '', log_obj, data._id, 'P');
                                                                return res.send(log_obj)
                                                            } else {
                                                                if (pass) {
                                                                    result = JSON.stringify(result);
                                                                    result = JSON.parse(result);
                                                                    if (typeof result.status == "undefined") {
                                                                        // Assign value to the property here
                                                                        result.status = "";
                                                                    }
                                                                    var initateTime = new Date(result.created_at).getTime();
                                                                    var ress = {
                                                                        trip_id: result._id,
                                                                        pass_id: pass._id,
                                                                        full_name: pass.full_name,
                                                                        phone_no: pass.phone,
                                                                        start_lat: result.pickup_lat,
                                                                        rec_no: result.rec_no ? result.rec_no : "",
                                                                        start_lng: result.pickup_lng,
                                                                        trip_no: result.trip_no,
                                                                        status: result.status,
                                                                        initiate_time: initateTime,
                                                                        cType  : result.creator_type,
                                                                        wc      :pass.credits
                                                                    };
                                                                    for (var i  in result) {
                                                                        ress[i] = result[i]
                                                                    }
                                                                    return res.send({
                                                                        code: 200,
                                                                        message: "Incomplete Trip Data",
                                                                        success: true,
                                                                        data: ress
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    });
};


/**
 * @api {get} /getpassengerrunningtrip Check Passenger Running Trips
 * @apiVersion 0.1.0
 * @apiName check-passenger-running-trips
 * @apiGroup Trips
 *
 * @apiDescription Check all that trips which is not completed due to internet failer or any other reason.
 *
 * @apiParam {String} token_id The Token ID.
 * @apiParam {String} _id ID could be passender_id or driver_id.
 *
 *
 * @apiSuccess {String}   code       200.
 * @apiSuccess {String}   message    success message.
 * @apiSuccess {String}   success    true
 *
 */

exports.getRunningPassengerTrip = function (req, res) {

    var data = req.query;
    var requirement = {"token_id": null, "_id": null};

    for (var key in requirement) {
        if (!data[key] || data[key] == '' || data[key] == null) {
            return res.send({
                code: 400, message: "Please Send " + key, success: false
            });
        }
    }
    var log_obj = {};
    //console.log("\n\n\n getRunningPassengerTrip data = ",data);
    helper.is_login(data, Users, function (err, user) {
        if (err) {
            log_obj = {code: 400, message: "", success: false, result: err};
            return res.send(err);
        } else if (!user || user == null || user == '') {
            log_obj = {code: 401, message: "User not found", success: false};
            return res.send(log_obj);
        } else {
            var condition = {passenger_id: data._id, "status": 'feedback'};
            var driver_projection = 'full_name mobile_1 img_id plate_no phone service_type current_lat current_lng';
            var invoice_projection = 'trip_charges total wallet_deduction promo_deduction dropoff_discount';

            Trips.findOne(condition, {})
                .lean()
                .sort({_id: -1})
                .populate({
                    path: 'driver_id',
                    model: 'drivers',
                    select: driver_projection
                })
                .populate({
                    path: 'invoice_id',
                    model: 'invoices',
                    select: invoice_projection
                })
                .exec(function (err, result) {
                    if (result) {
                        result = JSON.stringify(result);
                        result = JSON.parse(result);
                        result = helper.arrangeResponse(result);
                        var obj1 = {
                            status: result.status,
                            code: 200,
                            message: result.status,
                            success: true,
                            data: result
                        }
                        return res.send(obj1);
                    } else {
                        var condition = {
                            passenger_id: data._id,
                            "status": {$in: ['accepted', 'arrived', 'started', 'finished']}
                        };
                        //console.log("\n\n\n condition = ", condition);
                        Trips.findOne(condition, {})
                            .lean()
                            .sort({_id: -1})
                            .populate({
                                path: 'driver_id',
                                model: 'drivers',
                                select: driver_projection
                            })
                            .populate({
                                path: 'invoice_id',
                                model: 'invoices',
                                select: invoice_projection
                            })
                            .exec(function (err, result) {
                                if (err) {
                                    log_obj = {
                                        code: 400,
                                        message: "Some thing went wrong please try later",
                                        success: false
                                    };
                                    return res.send(log_obj);
                                } else if (!result || result == null || result == '') {
                                    return res.send({code: 404, message: "Records are not found", success: false});
                                } else {
                                    result = JSON.stringify(result);
                                    result = JSON.parse(result);
                                    result = helper.arrangeResponse(result);

                                    var obj1 = {
                                        status: result.status,
                                        code: 200,
                                        message: result.status,
                                        success: true,
                                        data: result
                                    }
                                    return res.send(obj1);
                                }
                            });
                    }
                });
        }
    });
};

exports.getTripInfo = async (req, res) => {
    try {
        const schema = Joi.object().keys({
            searchby: Joi.string().valid("_id", "trip_number", "trip_no").required(), // field name
            searchvalue: Joi.string().required() // service type e.g Ride/ Purchase etc
        });
    
        const _input = Object.assign({}, req.query, req.params);
        const { error, value } = Joi.validate(_input, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });
    
        const condition = {};
        condition[value.searchby] = value.searchvalue;
        // get trip information
        const trip_projection = {rating_driving_id : 0, rating_pass_id : 0, updated_at : 0};
        const driver_projection = { is_deleted: 0, deleted_by: 0, advertising_id: 0, updated_by: 0, last_lat: 0, last_lng: 0, socket_id: 0, reg_id: 0, one_signal_p_id: 0, img_id: 0, pin_code: 0, driver_license_image_id: 0, worker_id: 0, token_id: 0 };
        const passenger_projection = { img_id: 0, updated_by: 0, reg_id: 0, promo_max_limit: 0, new: 0, promo_total_limit: 0, promo_used_id: 0, update_at: 0, pin_code: 0, address_id: 0, created_by: 0, token_id: 0, worker_id: 0, is_deleted: 0, notification_status: 0, status: 0, one_signal_p_id: 0, advertising_id: 0, socket_id: 0 };
        const invoice_projection = {created_at : 0, trip_id : 0, trip_no : 0, passenger_id : 0, driver_id : 0};

        const trip_data = await services.Trip.getTripInfo(condition, trip_projection, driver_projection, passenger_projection, invoice_projection);
        if(!_.isNull(trip_data))
            return res.send({code: 200, success: true, message: "Success", data: trip_data});
        else
            return res.send(404, {code: 404, success: false, message: "No data found"});
    } catch(err){
        return res.send(500, {err: err, code: 500, success: false, message: "Please try later"});
    }

}

exports.createByServiceCode = async (req, res) => {
    let data = { ...req.body };
    
    const params = { ...req.params };

    data.trip['service_code'] = params.service_code;

    req.body = data;

    return await exports.createTrip(req, res);
};

exports.createTrip = async (req, res) => {
    try {
        const data = { ...req.body };

        const schema = Joi.object().keys({
            token_id: Joi.string().required(),
            _id: Joi.objectId().required(),
            trip: Joi.object().keys({
                service_code: Joi.number().valid(21,22,7).required(),
                cod_value: Joi.number().when('service_code', {
                    is: 22,
                    then: Joi.required(),
                    otherwise: Joi.forbidden(),
                }),
                creator: Joi.string().required(), 
                lat: Joi.number().min(-90).max(90).required(),
                lng: Joi.number().min(-180).max(180).required(),
                imei: Joi.string().required(),
            }),
            pickup_info: Joi.object().keys({
                name: Joi.string().max(50).optional(), 
                number: Joi.string().regex(/^(923)\d{9}$/, 'numbers').max(12).min(12).required(), 
                lat: Joi.number().min(-90).max(90).required(),
                lng: Joi.number().min(-180).max(180).required(),
                address: Joi.string().max(255).required()
            }),
            dropoff_info: Joi.object().keys({
                name: Joi.string().max(50).optional(), 
                number: Joi.string().regex(/^(923)\d{9}$/, 'numbers').max(12).min(12).required(), 
                lat: Joi.number().min(-90).max(90).required(),
                lng: Joi.number().min(-180).max(180).required(),
                address: Joi.string().max(255).required()
            }),
            extra_info:  Joi.object().keys({
                voice_note: Joi.string().optional(),
                parcel_value: Joi.number().optional(), 
                order_id: Joi.string().optional(), 
            }).optional(),
        });

        const { error, value } = Joi.validate(data, schema, { abortEarly: false });
        
        if (!_.isNull(error)) return res.send(400, {
            code: 400,
            message: error.details[0].message,
            success: false
        });

        // check if passenger is blocked for cancellations
        const isBlocked = await services.CancelTrip.isBlocked(value._id);

        if (isBlocked === true) {
            return res.send(422, { code: 422, message: 'Passenger blocked', success: false, subcode: 1020 });
        }

        // check fence
        if (!_.isUndefined(value.pickup_info)) {
            const _pickup_fence = await services.City.fenceCheck(value.pickup_info.lat, value.pickup_info.lng);
            if (_pickup_fence.inFence === false)
                return res.send(422, { code: 422, message: 'pick up out of fence', success: false, subcode: 1018 });
        }
        if (!_.isUndefined(value.dropoff_info)) {
            const _dropoff_fence = await services.City.fenceCheck(value.dropoff_info.lat, value.dropoff_info.lng);
            if (_dropoff_fence.inFence === false)
                return res.send(422, { code: 422, message: 'dropoff out of fence', success: false, subcode: 1019 });
        }

        //Get Vehical Category title from Service Code
        const category = await services.Category.getServiceType(value.trip.service_code);

        value.trip['trip_type'] = category.name;

        const trip = await services.Trip.create(value);

        const _trip = await services.Trip.getById(trip._id);

        const tripMqPacket = await global.plugins.call('trip', _trip , { decorateForMq: true });

        if ([21,22].includes(value.trip.service_code) === true) {
            rabbitmqHelper.send(rabbitmqHelper.Exchanges.loadboard, rabbitmqHelper.RoutingKeys.x_loadboard_create, {
                data: tripMqPacket
            });
        } else {
            rabbitmqHelper.send(rabbitmqHelper.Exchanges.trip, rabbitmqHelper.RoutingKeys.search_driver, {
                id: trip._id,
                trip_type: 'single'
            });
        }

       

        const responseObj = {
            trip_id: _trip._id,
            trip_no: _trip.trip_no,
            passenger_id: _trip.passenger_id
        };

        return res.send(200, {code: 200, success: true, message: "Trip creation successful", data: responseObj });
    } catch (_err) { 
        if (_err && _err.isBoom) {
            return res.send(_err.output.statusCode, { code: _err.output.statusCode, success: false, message: _err.output.payload.message});
        } else {
            return res.send(500, {err: _err, code: 500, success: false, message: "Trip creation failed, please try again later"});
        }
        
    }
};

exports.getOpenBookings = async (req, res) => {
    try {
        const data = { ...req.query };

        const schema = Joi.object().keys({
            _id: Joi.objectId().required(),
            token_id: Joi.string().required(),
            limit: Joi.number().default(20).min(5).max(20), 
            page: Joi.number().default(1).min(1)
        });

        const { error, value } = Joi.validate(data, schema, { abortEarly: false });

        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });

        const condition = {
            status: 'open',
            passenger_id: value._id
        }

        const projection = {
            trip_no: 1,
            _id: 1,
            created_at: 1,
            trip_status_code: 1,
            status: 1,
        };

        const sortBy = {
            created_at: -1
        };

        const trips = await services.Trip.getListByCondition(condition, value.page, value.limit, projection, sortBy);

        if (trips.length === 0) {
            return res.send(200, {code: 200, success: true, message: "No active bookings found", data: [] });
        } else {
            return res.send(200, {code: 200, success: true, message: "Successfully loaded active bookings", data: trips });
        }

    } catch (_err) {
        return res.send(500, {err: _err, code: 500, success: false, message: "Failed to load open bookings, please try again later"});
    }
};

exports.getBookingDetails = async (req, res) => {
    try {
        const data = { ...req.params };

        const schema = Joi.object().keys({
            id: Joi.objectId().required(),
        });

        const { error, value } = Joi.validate(data, schema, { abortEarly: false });

        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });

        const projection = {
            trip_status_code: 1,
            start_address: 1,
            end_address: 1,
            sender_phone: 1,
            receiver_phone: 1,
            sender_address: 1,
            receiver_address: 1,
            status: 1,
            is_cod: 1,
            trip_no: 1,
            
            // pickup
            pickup_lat: 1,
            pickup_lng: 1,
            zone_pickup_name: 1,
            zone_pickup_name_urdu: 1,

            // dropoff
            dropoff_lat: 1,
            dropoff_lng: 1,
            zone_dropoff_name: 1,
            zone_dropoff_name_urdu: 1,

            // receiver info
            receiver_phone: 1,
            receiver_name: 1,
            receiver_address: 1,

            // sender info
            sender_name: 1,
            sender_phone: 1,
            sender_address: 1,

            // received person info
            received_by_name: 1,
            received_by_phone: 1,

            // extra info
            voice_note: 1,
            amount_parcel_value: 1,
            amount: 1,
            order_no: 1
        };

        const condition = {
            _id: mongoose.Types.ObjectId(value.id),
        };

        const result = await services.Trip.getOneTrip(condition, projection);

        return res.send(200, {code: 200, success: true, message: "Successfully loaded booking details", data: result });

    } catch (_err) {
        return res.send(500, {err: _err, code: 500, success: false, message: "Failed to load booking details, please try again later"});
    }
};


/**
 * Trip Accept Event
 * @description Trip Accept Event
 * @static
 * @param {ObjectId} trip_id - Trip primary key
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} accept_timer_seconds - Driver accept call on second number
 * @param {number} battery - Driver Mobile battery
 * @param {number} os - Driver Mobile OS version
 * @param {string} os_name - Driver OS name
 * @param {number} connection_strength - Driver Mobile data strength
 * @param {string} imei - Driver Mobile IMEI number
 * @param {string} used_memory - Driver Mobile memory
 * @return {Object} return object with success/error
 */

exports.accept = async (req, res) => {

    try {
        // validation
        const data = Object.assign(req.body, req.params);
        const schema = Joi.object().keys({
            _id: Joi.objectId().required(),
            token_id: Joi.string().required(),
            trip_id: Joi.objectId().required(),
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required(),
            accept_timer_seconds: Joi.number().required(), // number of seconds after driver accepted the call
            battery: Joi.number(),
            os: Joi.number(),
            os_name: Joi.string(), // android, ios
            connection_strength: Joi.number(),
            imei: Joi.string(),
            used_memory: Joi.string()
        });

        const { error, value } = Joi.validate(data, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });

        const _trip_accepted = await services.Trip.accept(value.trip_id, value._id, value.lat, value.lng, value.accept_timer_seconds);


        // set Driver busy
        await services.Driver.busy(value._id);


        await services.Device.saveDriverDeviceInfo(value.trip_id, value._id, value.battery, value.os, value.imei, value.connection_strength, value.used_memory);

        // Sending Passenger notification
        await notification_events.customer.BOOKING_ACCEPTED(_trip_accepted);


        // remove from redis (acknowledge expire value)
        const val = cache.KEYS.BOOKING_REQUEST_EXPIRE_ID(value.trip_id, value._id);
        const key = cache.KEYS.BOOKING_REQUEST_EXPIRE;
        cache.Redis.removeFromOrderedList(key, val);


        // sending response
        res.send({
            code: 200,
            message: 'Booking has been accepted',
            success: true,
            data : {trip_id: value.trip_id}
        });

    } catch (error) {
        return res.send(500, {
            code: 500,
            message: error.message,
            success: false
        });
    }
}


exports.acknowledgement = async (req, res) => {

    try {
        // validation
        const data = Object.assign(req.body, req.params);
        const schema = Joi.object().keys({
            _id: Joi.objectId().required(), // driver id
            token_id: Joi.any().required(), // driver tokepass_fine.
            trip_id: Joi.objectId().required(),
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required()
        });

        const { error, value } = Joi.validate(data, schema, { abortEarly: false, allowUnknown: false });
        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });

        console.log(value)
        const _trip_acknowledged = await services.Trip.acknowledge(value.trip_id, value._id, value.lat, value.lng);


        console.log(_trip_acknowledged)
        // remove from redis (acknowledge expire value)
        const val = cache.KEYS.BOOKING_ACKNOWLEDGE_EXPIRE_ID(value.trip_id, value._id);
        const key = cache.KEYS.BOOKING_ACKNOWLEDGE_EXPIRE;
        cache.Redis.removeFromOrderedList(key, val);


        // store in redis (miss trip value)
        const date = new Date();
        const missed_time = date.setSeconds(date.getSeconds() + 20); // add 20 seconds
        const cache_result = await cache.Redis.pushToOrderedList(cache.KEYS.BOOKING_REQUEST_EXPIRE, cache.KEYS.BOOKING_REQUEST_EXPIRE_ID(value.trip_id, value._id), missed_time);



        // sending response
        res.send({
            code: 200,
            message: 'Booking request has been acknowledged',
            success: true,
            data : {trip_id: value.trip_id}
        });

    } catch (error) {
        return res.send(500, {
            code: 500,
            message: error.message,
            success: false
        });
    }

};

exports.customerCancelTrip = async (req, res) => {
    try {
        const data = Object.assign(req.body, req.params);

        const schema = Joi.object().keys({
            _id: Joi.string().required(),
            token_id: Joi.string().required(),
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required(),
            reason: Joi.string().required(),
            trip_id: Joi.objectId().required()
        });

        const { error, value } = Joi.validate(data, schema, { abortEarly: false });
        if (!_.isNull(error))
            return res.send({ code: 400, message: error.details[0].message, success: false });

        // cancel
        const trip_cancelled = await services.CancelTrip.customer(value.trip_id, value.reason, value.lat, value.lng, value._id);

        // send notification to driver if "driver_id" is available
        if (!_.isUndefined(trip_cancelled.driver_id)) {

            const driver = await Drivers.findById(trip_cancelled.driver_id);
            const user_info = {
                device_type: (driver.device_type) ? driver.device_type : 'android',
                reg_id: (driver.reg_id) ? driver.reg_id : '',
            };
            const response = { code: 200, message: 'Booking Cancelled', status: 'cancelled', success: true };
            // send cancellation event to partner
            await helperSocket.sendMultipleDeliveryResponse(driver.socket_id, 'trip-notification', response, global.ioSocket, user_info, 'current_cluster.worker.id', driver.worker_id);
        }

        // response to passenger
        res.send({ code: 200, message: 'success', success: true });

    } catch (error) {
        return res.send(500, { code: 500, message: error.message, success: false });
    }
}

exports.start = async (req, res) => {
    
    const params = { ...req.params };

    const data = { ...req.body, ...params};

    const schema = Joi.object().keys({
        _id: Joi.objectId().required(),
        token_id: Joi.string().required(),
        trip_id: Joi.objectId().required(),
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required(),
        address: Joi.string().max(255).required(),
        route: Joi.array().items(Joi.object().keys({ // list of Pickup Routes
            date: Joi.date().required(), // date
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required()
        })),
    });

    const { error, value } = Joi.validate(data, schema, { abortEarly: false, allowUnknown: false });

    if (!_.isNull(error)) return res.send(400, {
        code: 400,
        message: error.details[0].message,
        success: false
    });

    try {
        const { trip_id, lat, lng, address, _id , route } = value;

        const _trip_start = await services.Trip.start(trip_id, lat, lng, address, {
            driver_id: _id,
            route
        });
        
        await notification_events.customer.BOOKING_STARTED(_trip_start);

        res.send({
            code: 200,
            message: 'Booking has been started',
            success: true,
            data : {
                trip_id,
            }
        });

    } catch (_err) {
        return res.send(500, {
            code: 500,
            message: _err.message,
            success: false
        });
    }
};

/**
 * Trip arrived Event
 * @description Trip Accept Event
 * @static
 * @param {ObjectId} trip_id - Trip primary key
 * @param {ObjectId} _id - Driver primary key
 * @param {string} token_id - Driver auth token
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {array} route - driver coordinate between accept and arrived event
 * @return {Object} return object with success/error
 */

exports.arrived = async (req, res) => {

    try {

        // validation
        const data = Object.assign(req.body, req.params);
        const schema = Joi.object().keys({
            _id: Joi.objectId().required(), // driver id
            token_id: Joi.any().required(), // driver token

            trip_id: Joi.objectId().required(),

            lat: Joi.number().min(-90).max(90).required(), // latitude
            lng: Joi.number().min(-180).max(180).required(), // longitude
            route: Joi.array().items(Joi.object().keys({ // list of Pickup Routes
                date: Joi.date().required(), // date
                lat: Joi.number().min(-90).max(90).required(),
                lng: Joi.number().min(-180).max(180).required()
            }))
        });

        const driver = req.user;
        const { error, value } = Joi.validate(data, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });
        const _trip_arrived = await services.Trip.arrive(value.trip_id, value.lat, value.lng, value.route, {driver});

        // Sending Passenger notification
        await notification_events.customer.BOOKING_ARRIVED(_trip_arrived);

        // sending response
        res.send({
            code: 200,
            message: 'You have arrived Successfully',
            success: true,
            data : {trip_id: value.trip_id}
        });


    } catch (error) {
        console.log(error)
        return res.send(500, {
            code: 500,
            message: error.message,
            success: false
        });
    }
}



exports.finish = async (req, res) => {

    try {
        // validation
        const data = Object.assign(req.body, req.params);
        const schema = Joi.object().keys({
            _id: Joi.objectId().required(), // driver id
            token_id: Joi.any().required(), // driver token
            trip_id: Joi.objectId().required(), // primary key of trips model
            lat: Joi.number().min(-90).max(90).required(), // latitude
            lng: Joi.number().min(-180).max(180).required(), // longitude
            route: Joi.array().items(Joi.object().keys({ // list of Pickup Routes
                date: Joi.date().required(), // date
                lat: Joi.number().min(-90).max(90).required(),
                lng: Joi.number().min(-180).max(180).required()
            }))
        });

        const {error, value} = Joi.validate(data, schema, {abortEarly: false, allowUnknown: false});
        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });

        const driver = req.user;

        const _trip_finish = await services.Trip.finish(value.trip_id, value.lat, value.lng, value.route, {driver});

        // Sending Passenger notification
        await notification_events.customer.BOOKING_FINISHED(_trip_finish.trip);

        const response = {
            trip: _.pick(_trip_finish.trip, ['ended_at', 'end_address', 'end_lat', 'end_lng', 'status', 'wait_mins', 'trip_time', 'eta', 'distance', 'invoice_id']),
            invoice: _trip_finish.invoice
        };

        // sending response
        res.send({
            code: 200,
            message: 'Booking request has been finished',
            success: true,
            data : response
        });


    } catch (error) {
        return res.send(500, {
            code: 500,
            message: error.message,
            success: false
        });
    }
};



exports.feedback = async (req, res) => {

    try {

        // validation
        const data = Object.assign(req.body, req.params);
        const schema = Joi.object().keys({
            _id: Joi.objectId().required(), // driver id
            token_id: Joi.any().required(), // driver token
            received_amount: Joi.number().required(), // Received amount
            trip_id: Joi.objectId().required(),
            feedback: Joi.string().required(),
            rate: Joi.number().min(0).max(5).required(), // rate
            lat: Joi.number().min(-90).max(90).required(), // latitude
            lng: Joi.number().min(-180).max(180).required(), // longitude

            delivery_status: Joi.boolean(), // Delivery Status (whether delivery was successful)
            delivery_message: Joi.string(), // Delivery Message
            received_by_phone: Joi.when('delivery_status', { is: true, then: Joi.string().required() }),    // receiver phone number
            received_by_name: Joi.when('delivery_status', { is: true, then: Joi.string().required() }),      // receiver name
            purchase_amount: Joi.number().default(0) // Purchase Amount
        });


        const driver = req.user;
        const { error, value } = Joi.validate(data, schema, { abortEarly: false });
        if (!_.isNull(error)) return res.send({
            code: 400,
            message: error.details[0].message,
            success: false
        });

        const _trip_feedback = await services.Trip.feedback(value.trip_id, value.received_amount, value.feedback, value.rate, value.delivery_status, value.purchase_amount, value.delivery_message, value.received_by_phone, value.received_by_name, value.lat, value.lng);

        // Sending Passenger notification
        await notification_events.customer.BOOKING_FEEDBACK(_trip_feedback.trip);

        // sending response
        res.send({
            code: 200,
            message: 'Trip has been completed Successfully',
            success: true,
            data: { trip_id: value.trip_id }
        });



    } catch (error) {
        return res.send(500, {
            code: 500,
            message: error.message,
            success: false
        });
    }
}
