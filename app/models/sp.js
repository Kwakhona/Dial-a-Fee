
// Dependecies
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

// Models
var sp = require('../models/sp')

// Schema
var SPSchema = new Schema({
  _id: {
        type: String,
        unique: true,
        required: true
    },
  Name: {
        type: String,
        required: true
    },
  Address: {
        type: String
    },
  Email: {
        type: String,
        required: true
    },
  Username: {
        type: String,
        unique: true,
        required: true
    },
  password: {
        type: String,
        required: true
    },
  Service: {
        type: String,
        required: true
    },
  Experience: {
        type: String
    },
  Create_date: {
        type: String,
        required: true
    },
  Reg_Status: {
        type: String,
        require: true
    },
  Pic_Url: {
        type: String,
        unique: false,
        required: false,
    },
  Admin_id: {
        type: String,
        unique: false,
        required: true
  }
});

SPSchema.pre('save', function (next) {
    var sp = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(sp.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                sp.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});
 
SPSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

// Return Model
module.exports = mongoose.model('SP', SPSchema);