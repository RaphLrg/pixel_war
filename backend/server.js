// import express module and create your express app
const express = require('express');
const app = express();
const session = require('express-session');
const WebSocket = require('ws');

app.set('view engine', 'ejs');

// set the server host and port
const port = 3000;

app.use(session({
    secret: 'supersecret', //used to sign the session ID cookie
    name: 'session', // (optional) name of the session cookie
    resave: true, // forces the session to be saved back to the session store
    saveUninitialized: true, // forces a session an uninitialized session to be saved to the store
    cookie: { // characteristics of the cookie used
        maxAge: 10*60*1000 // the cookie will expire after maxAge milliseconds
        // secure: true  // forces the use of HTTPS (won't work when testing locally)
    }
}));

// add data to req.body (for POST requests)
app.use(express.urlencoded({ extended: true }));

// serve static files
app.use(express.static('../frontend'));

// home
app.use('/index.html', function (req, res) {
	res.redirect('/');
});


// routers
const create_room = require('./routers/creation_salon');
app.use('/create_room', create_room);

const canva = require('./routers/canva');
app.use('/canva', canva);

const stats_salon = require("./routers/stats_salon");
app.use("/room_statistics", stats_salon);

const stats_user = require("./routers/profil_user");
app.use("/user_statistics", stats_user);

const connexion_creation_compte = require('./routers/connexion_creation_compte');
app.use('/', connexion_creation_compte);

const index = require('./routers/index');
app.use('/', index);

// run the server
app.listen(port, () => {
	// callback executed when the server is launched
	console.log(`Express app listening on port ${port}`);
});