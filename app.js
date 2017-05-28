let express = require('express');
let path = require('path');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');


//app
let app = express();

//app conf
const fs = require('fs');
const content = fs.readFileSync('./private/conf.json');
const conf = JSON.parse(content);


// view engine setup (pour eviter le message d'erreur du demon)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//connection mongo
let Mongoose = require('mongoose');
Mongoose.Promise = global.Promise;
let connect = Mongoose.connect("mongodb://"+conf.db.user+":"+conf.db.password+"@"+conf.db.url+":"+conf.db.port+"/"+conf.db.db);

//Models
let UsersModel = require('./private/models/Users')(app, connect);
let ProductsModel = require('./private/models/Products')(app, connect);

//session
let sessions = require('client-sessions');
app.use(sessions({
	cookieName: 'userSession',
	requestKey: 'session', // requestKey overrides cookieName for the key name added to the request object.
	secret: 'dqip4DgfEbU2bqzd3N7pZuewVv9c4UUVhu0EiHIfgzbUUoL35Jv8e', // should be a large unguessable string or Buffer
	duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
}));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//routes
app.use('/users', require('./routes/users')(app, UsersModel, ProductsModel));
app.use('/products', require('./routes/products')(app, UsersModel, ProductsModel));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
