
// Dependecies
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

// Models
var admin = require('../models/admin')

// Schema
var AdminSchema = new Schema({
  _id: {
        type: String,
        unique: true,
        required: true
  },
  FName: {
        type: String,
        required: true
    },
  LName: {
        type: String,
        required: true
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
  Create_date: {
        type: String,
        required: true
  },
  Pic_Url: {
        type: String,
        unique: false,
        required: false,
    },
 Reg_Requests: {
        type: String,
        unique: false,
        required: true
  }
});

AdminSchema.pre('save', function (next) {
    var admin = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(admin.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                admin.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});
 
AdminSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

// Return Model
module.exports = mongoose.model('Admin', AdminSchema);