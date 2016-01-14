
// Dependecies
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Models
var RFQ = require('../models/rfq')

// Schema
var RFQSchema = new Schema({
  Type: {
        type: String,
        required: true
    },
  Description: {
        type: String
    },
  Content_Link: {
        type: String,
        required: true,
        unique: true
    },
  User_id: {
        type: String,
        required: true
    },
  Create_date: {
        type: String,
        required: true
    },
  Status: {
        type: String,
        required: true
    }
});

// Return Model
module.exports = mongoose.model('RFQ', RFQSchema);