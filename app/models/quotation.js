
// Dependecies
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Models
var quotation = require('../models/quotation')

// Schema
var QuotationSchema = new Schema({
  Notes: {
        type: String
    },
  Amount: {
        type: String
    },
  From: {
        type: String,
        required: true
    },
  To: {
        type: String,
        required: true
    },
  RFQ: {
        type: String
    },  
  Create_date: {
        type: String
    }
});

// Return Model
module.exports = mongoose.model('Quotation', QuotationSchema);