
// Dependecies
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Models
var message = require('../models/message')

// Schema
var MessageSchema = new Schema({
  Subject: {
        type: String
    },
  Message: {
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
  Create_date: {
        type: String
    }
});

// Return Model
module.exports = mongoose.model('Message', MessageSchema);