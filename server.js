// Dependencies
var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var passport 	  = require('passport');
var config      = require('./config/database'); // get db config file
var User        = require('./app/models/user'); // get the User mongoose model
var SP          = require('./app/models/sp'); // get the Service Provider mongoose model
var Admin       = require('./app/models/admin'); // get the Admin mongoose model
var RFQ         = require('./app/models/rfq'); // get the RFQ mongoose model
var Message     = require('./app/models/message'); // get the Message mongoose model
var Quotation   = require('./app/models/quotation'); // get the Quotation mongoose model
var port        = process.env.PORT || 3000;
var jwt         = require('jwt-simple');

// get our request parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// log to console
app.use(morgan('dev'));
// Use the passport package in our application
app.use(passport.initialize());
// demo Route (GET http://localhost:3000)
app.get('/', function(req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});
// connect to database
mongoose.connect(config.database);
// pass passport for configuration
require('./config/passport')(passport);
// bundle our routes
var apiRoutes = express.Router();

// create a new user account (POST http://localhost:3000/api/signup)
apiRoutes.post('/signup', function(req, res) {
  if (!req.body.FName || !req.body.LName || !req.body.Email || !req.body.Username || !req.body.password || !req.body.Surburb ) {
    res.json({success: false, msg: 'Please make sure you enter all the require fields. Fields in Red'});
  } else {
    User.findOne({ Username: req.body.Username}, function(err, user) {
      if (err) throw err;
      if (!user){
        SP.findOne({ Username: req.body.Username}, function(err, sp) {
          if(err) throw err;
          if(!sp) {
            Admin.findOne({ Username: req.body.Username }, function(err, admin) {
              if(!admin) {
                var newUser = new User({
                _id: req.body.FName.substring(0, 1)  +'_' + req.body.LName.substring(0, 3) +'_' + Date.now() + '_usr',
                FName: req.body.FName,
                LName: req.body.LName,
                Email: req.body.Email,
                Username: req.body.Username,
                password: req.body.password,
                Surburb: req.body.Surburb,
                City: req.body.City,
                Pic_Url: '/img/profile.jpg',
                Create_date: Date()
                });
                // save the user
                newUser.save(function(err) {
                  if (err) {
                    return res.json({success: false, msg: 'Sorry ' + newUser.FName +' your registration attempt has failed. Please try again.'});
                  } else {
                    // if user successfully created. A token is also created.
                  var token = jwt.encode(newUser, config.secret);
                  // return the information including token as JSON
                  return res.json({ success: true, token: 'JWT ' + token, msg: 'Your Account has been successfully Created.' });
                  }
                });
              } else { 
                  return res.json({success: false, msg: 'Sorry. Username belongs to a Administrator. Please submit a new Username.'});
                }
            });
          } else {
              return res.json({success: false, msg: 'Sorry. Username belongs to a Service Provider. Please submit a new Username.'});
          }
        });
      } else {
          return res.json({success: false, msg: 'Sorry. User already exists. Please submit a new Username.'});
      }
    });
  }
});
// route to authenticate a user (POST http://localhost:3000/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
  User.findOne({
    Username: req.body.Username
  }, function(err, user) {
    if (!user) {
      SP.findOne({ Username: req.body.Username}, function(err, sp) 
        {
          if(!sp) {
            Admin.findOne({ Username: req.body.Username }, function(err, admin)
              {
                if(!admin) { 
                  res.send({success: false, msg: 'Authentication failed. User not found.'}); 
                } else {
                    // check if password matches
                    admin.comparePassword(req.body.password, function (err, isMatch) {
                      if (isMatch && !err) {
                        // if user is found and password is right create a token
                        var token = jwt.encode(admin, config.secret);
                        // return the information including token as JSON
                        res.json({success: true , user: 'Admin' ,token: 'JWT ' + token});
                      } else {
                        res.send({success: false, msg: 'Authentication failed. Wrong password.'});
                      }
                    });
                  }
              });
          } else {
            // check if password matches
            sp.comparePassword(req.body.password, function (err, isMatch) {
              if (isMatch && !err) {
                // if admin is found and password is right create a token
                var token = jwt.encode(sp, config.secret);
                // return the information including token as JSON
                res.json({success: true ,user: 'SP' ,token: 'JWT ' + token});
              } else {
                res.send({success: false, msg: 'Authentication failed. Wrong password.'});
              }
            });
          }
        });
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(user, config.secret);
          // return the information including token as JSON
          res.json({success: true ,user: 'User' ,token: 'JWT ' + token});
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});
// route to a restricted info (GET http://localhost:3000/api/memberinfo)
apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      User_type: decoded.User_type,
      Username: decoded.Username
    }, function(err, user) {
        if (!user) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          res.json({success: true, msg: 'Welcome ' + user.User_type + ' '+ user.Username + '!'});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});

// Get the Username
apiRoutes.get('/getUsername', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      Username: decoded.Username
    }, function(err, user) {
        if (!user) {
          SP.findOne({ Username: decoded.Username }, function(err, sp) {
            if(!sp) {
              Admin.findOne({ Username: decoded.Username}, function(err,admin) {
                if(!admin) {
                  return res.status(403).send({success: false, msg: 'Authentication failed. User information not found.'});
                } else {
                    return res.json({
                      success: true,
                      username: admin.Username
                    });
                }
              })
            } else {
              return res.json({
                success: true,
                username: sp.Username
              });
            }
          })
        } else {
          return res.json({
            success: true,
            username: user.Username
          });
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// get all Users
apiRoutes.get('/getUsers', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.find({}, function(err, user) {
        SP.find({}, function(err, sp) {
          Admin.find({}, function(err, admin){
            res.json({success: true, users: user, sps: sp, admins: admin});
          })
        })
    });

  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// Get User Type
apiRoutes.get('/getUserId', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({ _id: decoded._id }, function(err, user) {
        if (!user) {
          SP.findOne({ _id: decoded._id}, function(err, sp){
            if(!sp){
              Admin.findOne({ _id: decoded._id }, function(err, admin){
                if(!admin){
                  return res.status(403).send({success: false, msg: 'Authentication failed. User ID not found.'});
                } else {
                    return res.json({success: true, ID: admin._id});
                  }
              })
            } else {
                return res.json({success: true, ID: sp._id});
            }
          })
        } else {
          return res.json({success: true, ID: user._id});
          }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// Getting the User Details: FName, LName, Email, Username, Suburb, City and Pic_Url
apiRoutes.get('/Userinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      FName: decoded.FName,
      LName: decoded.LName,
      Email: decoded.Email,
      Username: decoded.Username,
      Surburb: decoded.Surburb,
      City: decoded.City,
      Pic_Url: decoded.Pic_Url
      //userid: decoded._id
    }, function(err, user) {
        if (!user) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User information not found.'});
        } else {
          res.json({
            success: true,
            id: user._id,
            fname: user.FName,
            lname: user.LName,
            email: user.Email,
            username: user.Username,
            password: user.password,
            surburb: user.Surburb,
            city: user.City,
            pic_url: user.Pic_Url,
            msg : "Thank you for coming in. We hope you enjoy your stay. Please call again."
          });
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
apiRoutes.post('/getFrom_ID', function(req, res) {
  User.findOne({ Username: req.body.from }, function(err, user){
    if(!user){
      SP.findOne({ Username: req.body.from}, function(err, sp){
        if(!sp){
          Admin.findOne({ Username: req.body.from }, function(err, admin){
            if(!admin){
              return res.json({success: false, msg: 'Sorry the User does not exits'});
            } else {
                return res.json({success: true, id: admin._id});
            }
          });
        } else {
            return res.json({success: true, id: sp._id});
        }
      });
    } else {
        return res.json({success: true, id: user._id});
    }
  });
});
// Update the User First Name
apiRoutes.post('/user/update/FName', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      Username: req.body.Username
    }, function(err, user) {
        if(!user){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.FName){
            return res.json({success: false, msg: 'Please enter your First Name!'});
          } else {
              user.FName = req.body.FName;
              user.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your First Name has been updated'});
                  }
              });
            }
          }
      });
    }
});
// Update the User Last Name
apiRoutes.post('/user/update/LName', function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      Username: req.body.Username
    }, function(err, user) {
        if(!user){
          return res.json({err});
        } else {
          if(!req.body.LName) {
            return res.json({success: false, msg: 'Please enter your Last Name!'});
          } else {
              user.LName = req.body.LName;
              user.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your Last Name has been updated'});
                  }
              });
            }
          }
      });
  }
});
// Update the User Suburb
apiRoutes.post('/user/update/Suburb', function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      Username: req.body.Username
    }, function(err, user) {
        if(!user){
          return res.json({err});
        } else {
          if (!req.body.Surburb) {
            return res.json({success: false, msg: 'Please enter your Suburb!'});
          } else {
              user.Surburb = req.body.Surburb;
              user.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry update has failed'});
                } else {
                    return res.json({success: true, msg: 'The suburb has been updated'});
                  }
              });
            }
        }
      });
  }
});
// Update the User City
apiRoutes.post('/user/update/City', function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    User.findOne({
      Username: req.body.Username
    }, function(err, user) {
        if(!user){
          return res.json({err});
        } else {
          if(!req.body.City) {
            return res.json({success: false, msg: 'Please enter your City!'});
          } else {
              user.City = req.body.City;
              user.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry update has failed'});
                } else { return res.json({success: true, msg: 'The city has been updated'}); }
              });
            }
          }
      });
  }
});

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

// creating the RFQ
apiRoutes.post('/rfq/create', function(req, res) {
  if(!req.body.Type || !req.body.Description || !req.body.Content_Link || !req.body.User_id  || !req.body.location) {
    res.json({success: false, msg: 'Please make sure you enter all the required fields. Issue Type, Description of Issue and Upload an image'});
  } else {
      var token = getToken(req.headers);
      if(token) {
        RFQ.findOne({
          _id: req.body.rfq_id
        }, function(err, rfq) {
            if(!rfq){
              var newRFQ = new RFQ({
                Type: req.body.Type,
                Description: req.body.Description,
                Content_Link: req.body.Content_Link,
                location: req.body.location,
                User_id: req.body.User_id,
                Create_date: Date(),
                Status: 'Request Submitted'
              });

              newRFQ.save(function(err) {
                if (err) {
                  return res.json({success: false, msg: 'Sorry. Your Request For Quotation has failed. Please make sure your enter upload a Picture or Video.'});
                } else {
                    return res.json({ success: true, msg: 'Your request for quotation has been submitted.' });
                }
              });
            } else {
                return res.json({success: false, msg: 'Sorry. RFQ already exists. Please submit a new RFQ.'});
            }
        });
      }
  }
});
// Get the RFQ_ID
apiRoutes.post('/getRFQ_id', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    RFQ.findOne({'User_id' : req.body.ID }, function(err, rfq) {
        if (!rfq) {
          return res.status(403).send({success: false, msg: 'Authentication failed. RFQ information not found.'});
        } else {
          res.json({rfq});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// get RFQs of by User_id
apiRoutes.post('/user/rfqs/view', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    if(!req.body.id) {
      return res.status(403).send({success: false, msg: 'Please enter the UserID'});
    } else {
        RFQ.find({'User_id': req.body.id}, function(err, rfq) {
            if (!rfq) {
              return res.status(403).send({success: false, msg: 'RFQs not found.'});
            } else {
              return res.json({success: true, msg: 'Here it is user id:' + req.body.id, rfqs: rfq});
            }
        });
    }
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// get All RFQs
apiRoutes.get('/rfqs/view', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    RFQ.find({ }, function(err, rfq) {
        if (!rfq) {
          return res.status(403).send({success: false, msg: 'RFQs not found.'});
        } else {
          res.json({success: true, rfqs: rfq});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});


// Create and send message
apiRoutes.post('/messages/create', function(req, res) {
  if(!req.body.From || !req.body.To || !req.body.Subject || !req.body.Message) {
    res.json({success: false, msg: 'Please make sure you enter all the required fields. Subject, Message and To'});
  } else {
      var token = getToken(req.headers);
      if(token) {
        Message.findOne({
          Subject: req.body.Subject,
          Message: req.body.Message,
          To: req.body.To
        }, function(err, message) {
            if(!message){
              var newMessage = new Message({
                Subject: req.body.Subject,
                Message: req.body.Message,
                From: req.body.From,
                To: req.body.To,
                Create_date: Date() 
              });

              newMessage.save(function(err) {
                if (err) {
                  return res.json({success: false, msg: 'Sorry. There is a problem with the message.'});
                } else {
                    return res.json({ success: true, msg: 'Your message has been sent.' });
                }
              });
            } else {
                return res.json({success: false, msg: 'Sorry. Message already exists. Please compile a new message.'});
            }
        });
      }
  }
});
// get all recieved Messages - From
apiRoutes.post('/messages/from', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    if(!req.body.From) {
      return res.json({success: false, msg: "Please enter the From field"});
    } else {
        Message.find({ 'From': req.body.From }, function(err, messages) {
          if (!messages) {
            return res.status(403).send({success: false, msg: 'Messages are not found.'});
          } else {
            res.json({success: true, messages: messages});
          }
      });
    }
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// get all sent Messages -to
apiRoutes.post('/messages/to', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Message.find({'To': req.body.To}, function(err, messages) {
        if (!messages) {
          return res.status(403).send({success: false, msg: 'Messages are not found.'});
        } else {
          res.json({success: true, messages});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// get all Messages
apiRoutes.get('/messages/view', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Message.find({}, function(err, messages) {
        if (!messages) {
          return res.status(403).send({success: false, msg: 'Messages are not found.'});
        } else {
          res.json({messages});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});


// Create a Quotation
apiRoutes.post('/quotation/create', function(req, res) {
  if(!req.body.From || !req.body.To || !req.body.RFQ || !req.body.Notes || !req.body.Amount) {
    res.json({success: false, msg: 'Please make sure you enter all the required fields.'});
  } else {
      var token = getToken(req.headers);
      if(token) {
        Quotation.findOne({
          _id: req.body.Quotation_id
        }, function(err, quotation) {
            if(!quotation){
              var newQuotation = new Quotation({
                Notes: req.body.Notes,
                Amount: req.body.Amount,
                From: req.body.From,
                To: req.body.To,
                RFQ: req.body.RFQ,
                Create_date: Date() 
              });

              newQuotation.save(function(err) {
                if (err) {
                  return res.json({success: false, msg: 'Sorry. There is a problem with the Quotation.'});
                } else {
                    return res.json({ success: true, msg: 'Your quotation has been sent.' });
                }
              });
            } else {
                return res.json({success: false, msg: 'Sorry. Quotation already exists. Please create a new Quotation.'});
            }
        });
      }
  }
});
// get All Quotations by Recipient - To
apiRoutes.post('/quotations/to', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Quotation.find({'To': req.body.To}, function(err, quotation) {
        if (!quotation) {
          return res.status(403).send({success: false, msg: 'Quotations are not found.'});
        } else {
          res.json({quotation});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// get All Quotations by Sender - From
apiRoutes.post('/quotations/from', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Quotation.find({'From': req.body.From}, function(err, quotation) {
        if (!quotation) {
          return res.status(403).send({success: false, msg: 'Quotations are not found.'});
        } else {
          res.json({quotation});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// get all Quotations
apiRoutes.get('/quotations/view', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Quotation.find({}, function(err, quotation) {
        if (!quotation) {
          return res.status(403).send({success: false, msg: 'Quotations were not found.'});
        } else {
          res.json({quotation});
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});



// create a new Service Provider account (POST http://localhost:3000/api/register/sp)
apiRoutes.post('/register/sp', function(req, res) {
  if (!req.body.Name || !req.body.Email || !req.body.Address || !req.body.Username || !req.body.password || !req.body.Service || !req.body.Experience ) {
    res.json({success: false, msg: 'Please make sure you enter all the require fields.'});
  } else {
    SP.findOne({ Username: req.body.Username}, function(err, sp) {
      if (err) throw err;
      if (!sp){
        User.findOne({ Username: req.body.Username }, function(err, user) {
          if(err) throw err;
          if(!user){
            Admin.findOne({ Username: req.body.Username }, function(err, admin) {
              if(err) throw err;
              if(!admin) {
                var newSP = new SP({
                _id: req.body.Name.substring(0, 1)  +'_' + req.body.Username.substring(0, 3) +'_' + Date.now() + '_spr',
                Name: req.body.Name,
                Address: req.body.Address,
                Email: req.body.Email,
                Username: req.body.Username,
                password: req.body.password,
                Create_date: Date(),
                Service: req.body.Service,
                Experience: req.body.Experience,
                Reg_Status: 'Registration Pending',
                Pic_Url: '/img/profile.jpg',
                Admin_id: 'K_Mah_1450174573234_adm'
              });
              // save the SP account
              newSP.save(function(err) {
                if (err) {
                  return res.json({success: false, msg: 'Sorry ' + newSP.Name +' your registration attempt has failed. Please try again.'});
                } else {
                  // if SP successfully created. A token is also created.
                var token = jwt.encode(newSP, config.secret);
                // return the information including token as JSON
                return res.json({ success: true, token: 'JWT ' + token, msg: 'Your Registration request has been successfully created.' });
                }
              });
            } else {
                return res.json({success: false, msg: 'Sorry. Username belongs to a Admin. Please submit a new Username.'});
            }
            });
          } else {
              return res.json({success: false, msg: 'Sorry. Username belongs to a User. Please submit a new Username.'});
          }
        });

      } else {
          return res.json({success: false, msg: 'Sorry. User already exists. Please submit a new Username.'});
      }
    });
  }
});
// route to authenticate a Service Provider(POST http://localhost:3000/api/authenticate/sp)
apiRoutes.post('/authenticate/sp', function(req, res) {
  SP.findOne({
    Username: req.body.Username
  }, function(err, sp) {
    if (!sp) {
      res.send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      sp.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if SP is found and password is right create a token
          var token = jwt.encode(sp, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});
// Getting the SP Details: id, name, address, email, service, experience, reg_status, pic_url, admin_id
apiRoutes.get('/SPinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    SP.findOne({
      Name: decoded.Name,
      Address: decoded.Address,
      Email: decoded.Email,
      Username: decoded.Username,
      Service: decoded.Service,
      Experience: decoded.Experience,
      Create_date: decoded.Create_date,
      Reg_Status: decoded.Reg_Status,
      Pic_Url: decoded.Pic_Url,
      Admin_id: decoded.Admin_id
      //userid: decoded._id
    }, function(err, sp) {
        if (!sp) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User information not found.'});
        } else {
          res.json({
            success: true,
            id: sp._id,
            name: sp.Name,
            address: sp.Address,
            email: sp.Email,
            username: sp.Username,
            created: sp.Create_date,
            service: sp.Service,
            experience: sp.Experience,
            reg_status: sp.Reg_Status,
            pic_url: sp.Pic_Url,
            admin_id: sp.Admin_id
          });
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// Update Service Provider: Full Name
apiRoutes.post('/sp/update/Name', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    SP.findOne({
      Username: req.body.Username
    }, function(err, sp) {
        if(!sp){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.Name) {
            return res.json({success: false, msg: 'Please enter your Full Name!'});
          } else {
              sp.Name = req.body.Name;
              sp.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry full name update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your full name has been updated'});
                  }
              });
          }
        }
      });
    }
});
// Update Service Provider: Address
apiRoutes.post('/sp/update/Address', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    SP.findOne({
      Username: req.body.Username
    }, function(err, sp) {
        if(!sp){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.Address) {
            return res.json({success: false, msg: 'Please enter your Physical Address!'});  
          } else {
              sp.Address = req.body.Address;
              sp.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry physical address update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your physical address has been updated'});
                  }
              });
            }
          }
      });
    }
});
// Update Service Provider: Service
apiRoutes.post('/sp/update/Service', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    SP.findOne({
      Username: req.body.Username
    }, function(err, sp) {
        if(!sp){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.Service){
            return res.json({success: false, msg: 'Please enter your Service!'});
          } else {
              sp.Service = req.body.Service;
              sp.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry service update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your service has been updated'});
                  }
              });
            }
          }
      });
    }
});
// Update Service Provider: Experience
apiRoutes.post('/sp/update/Experience', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    SP.findOne({
      Username: req.body.Username
    }, function(err, sp) {
        if(!sp){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.Experience) {
            return res.json({success: false, msg: 'Please enter your Experience!'});
          } else {
              sp.Experience = req.body.Experience;
              sp.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry experience update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your experience has been updated'});
                  }
              });
            }
          }
      });
    }
});
// Update Service Provider: Pic_Url
apiRoutes.post('/sp/update/Pic_Url', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    SP.findOne({
      Username: req.body.Username
    }, function(err, sp) {
        if(!sp){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.Pic_Url) {
            return res.json({success: false, msg: 'Please upload the profile picture!'});
          } else {
              sp.Pic_Url = req.body.Pic_Url;
              sp.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry profile picture update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your profile picture has been updated'});
                  }
              });
            }
          }
      });
    }
});



// create a new Admin account (POST http://localhost:3000/api/register/admin)
apiRoutes.post('/register/admin', function(req, res) {
  if (!req.body.FName || !req.body.LName || !req.body.Email || !req.body.Username || !req.body.password) {
    res.json({success: false, msg: 'Please make sure you enter all the require fields.'});
  } else {
    Admin.findOne({ Username: req.body.Username}, function(err, admin) {
      if (err) throw err;
      if (!admin){
        User.findOne({ Username: req.body.Username }, function(err, user) {
          if(err) throw err;
          if(!user) {
            SP.findOne({ Username: req.body.Username }, function(err, sp) {
              if(err) throw err;
              if(!sp) {
                var newAdmin = new Admin({
                _id: req.body.FName.substring(0, 1)  +'_' + req.body.LName.substring(0, 3) +'_' + Date.now() + '_adm',
                FName: req.body.FName,
                LName: req.body.LName,
                Email: req.body.Email,
                Username: req.body.Username,
                password: req.body.password,
                Create_date: Date(),
                Pic_Url: '/img/profile.jpg',
                Reg_Requests: '0'
              });
              // save the Admin account
              newAdmin.save(function(err) {
                if (err) {
                  return res.json({success: false, msg: 'Sorry ' + newAdmin.Name +' your registration attempt has failed. Please try again.'});
                } else {
                  // if Admin successfully created. A token is also created.
                var token = jwt.encode(newAdmin, config.secret);
                // return the information including token as JSON
                return res.json({ success: true, token: 'JWT ' + token, msg: 'The Admin account has been successfully created.' });
                }
              });
              } else {
                  return res.json({success: false, msg: 'Sorry. Username belongs to a Service Provider. Please submit a new Username.'});
              }
            })
          } else {
              return res.json({success: false, msg: 'Sorry. Username belongs to a User. Please submit a new Username.'});
          }
        })
      } else {
          return res.json({success: false, msg: 'Sorry. User already exists. Please submit a new Username.'});
      }
    });
  }
});
// route to authenticate a user (POST http://localhost:3000/api/authenticate/admin)
apiRoutes.post('/authenticate/admin', function(req, res) {
  Admin.findOne({
    Username: req.body.Username
  }, function(err, admin) {
    if (!admin) {
      res.send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      admin.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(admin, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token});
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});
// Getting the Admin Details: id, FName, LName, Email, Username, Created, Registration Requests, Pic_Url
apiRoutes.get('/Admininfo', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Admin.findOne({
      success: true,
      FName: decoded.FName,
      LName: decoded.LName,
      Email: decoded.Email,
      Username: decoded.Username,
      Create_date: decoded.Create_date,
      Reg_Requests: decoded.Reg_Requests,
      Pic_Url: decoded.Pic_Url
      //userid: decoded._id
    }, function(err, admin) {
        if (!admin) {
          return res.status(403).send({success: false, msg: 'Authentication failed. User information not found.'});
        } else {
          res.json({
            id:           admin._id,
            fname:        admin.FName,
            lname:        admin.LName,
            email:        admin.Email,
            username:     admin.Username,
            created:      admin.Create_date,
            reg_requests: admin.Reg_Requests,
            pic_url:      admin.Pic_Url
          });
        }
    });
  } else {
    return res.status(403).send({success: false, msg: 'No token provided.'});
  }
});
// Update Admin: FName
apiRoutes.post('/admin/update/FName', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Admin.findOne({
      Username: req.body.Username
    }, function(err, admin) {
        if(!admin){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.FName) {
            return res.json({success: false, msg: 'Please enter your First Name!'});
          } else {
              admin.FName = req.body.FName;
              admin.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry first name update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your first name has been updated'});
                  }
              });
            }
          }
      });
    }
});
// Update Admin: LName
apiRoutes.post('/admin/update/LName', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Admin.findOne({
      Username: req.body.Username
    }, function(err, admin) {
        if(!admin){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          admin.LName = req.body.LName;
          admin.save(function(err){
            if (err) {
              return res.json({success: false, msg: 'Sorry last name update has failed'});
            } else {
                return res.json({success: true, msg: 'Your last name has been updated'});
              }
          });
        }
      });
    }
});
// Update Admin: Pic_Url
apiRoutes.post('/admin/update/Pic_Url', passport.authenticate('jwt', { session: false}), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    var decoded = jwt.decode(token, config.secret);
    Admin.findOne({
      Username: req.body.Username
    }, function(err, admin) {
        if(!admin){
          return res.json({success: false, msg: 'Sorry the user does not exists!'});
        } else {
          if(!req.body.Pic_Url){
            return res.json({success: false, msg: 'Please make sure your upload the profile picture!'});
          } else {
              admin.Pic_Url = req.body.Pic_Url;
              admin.save(function(err){
                if (err) {
                  return res.json({success: false, msg: 'Sorry profile picture update has failed'});
                } else {
                    return res.json({success: true, msg: 'Your profile picture has been updated'});
                  }
              });
            }
          }
      });
    }
});


// connect the api routes under /api/*
app.use('/api', apiRoutes);
// Start Server
app.listen(port);
console.log('There are dragons: http://localhost:' + port);
