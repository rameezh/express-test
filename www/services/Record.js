
const _ = require('lodash');
const mongoose = require('mongoose');
const record_model = mongoose.model('records');
const moment = require('moment');

class RecordService {

    /**
     * Get record based on ranges
     * @description Get record based on ranges
     * @static
     * @param {object} data 
     * @return {array} return an array of objects
     */
    static async getRecord(data) {
        const { startDate, endDate, minCount, maxCount } = data;

        const query = await record_model.aggregate([
            {
                $project: {
                    _id: 0,
                    key: 1,
                    createdAt: 1,
                    totalCount: { $sum: "$counts" }
                },
            },
            {
                $match: {
                    totalCount: { 
                        $gte: parseInt(minCount),
                        $lte: parseInt(maxCount)
                    },
                    createdAt: {
                        $gte: moment(startDate, 'YYYY-MM-DD').add(1, 'day').toDate(),
                        $lte: moment(endDate, 'YYYY-MM-DD').add(1, 'day').toDate()
                    }
                }
            },
        ]);

        return query;
    }

}

module.exports = RecordService;