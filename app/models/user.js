
// Dependecies
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

// Models
var User = require('../models/user')

// Schema
var UserSchema = new Schema({
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
 Surburb: {
        type: String,
        required: true
    },
 City: {
        type: String
    },
 Pic_Url: {
        type: String,
        unique: false,
        required: false,
    },
 Create_date: {
        type: String,
        required: false
  }
});

UserSchema.pre('save', function (next) {
    var user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});
 
UserSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

// Return Model
module.exports = mongoose.model('User', UserSchema);