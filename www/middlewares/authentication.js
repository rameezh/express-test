const mongoose = require('mongoose');
const _ = require('lodash');
const services = require('../services');

const isAuthorized = async (req, res, next) => {
    try {
        let response_object = {
            code: 401,
            message: "unAuthrozied User",
            success: false
        };
        if (req.headers['token'] && req.headers['id'] && req.headers['user_type']) {
            let result;
            const id = mongoose.Types.ObjectId(req.headers['id']); // getting string in header that's why creating in object id
            // // check for driver
            // if(req.headers['user_type'] === "driver")
            //     result = await services.Driver.authenticate(id, req.headers['token']);
            // else if(req.headers['user_type'] === "passenger")
            //     result = await services.Passenger.authenticateByToken(id, req.headers['token']);
            if (req.headers['user_type'] === "admin") // authenticate admin users
                result = await services.Admin.authenticate(id, req.headers['token']);
            else
                return res.send(401, response_object);

            if(!_.isNull(result)) {
                req.user = result;
                next();
            } else {
                return res.send(401, response_object);
            }
        } else {
            return res.send(401, response_object);
        }
    } catch(err) {
        return res.send(500, {
            code: 500,
            message: "Please try later",
            success: false,
            err: err
        });
    }
}   

module.exports = { isAuthorized };