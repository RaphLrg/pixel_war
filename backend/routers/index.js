const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');


// connecting an existing database (handling errors)
const db = new sqlite3.Database('./db/db_pixelwar.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database!');
});


// Raphaël Largeau
router.post('/data_room', (req, res, next) => {
    db.all("SELECT * FROM rooms ORDER BY name ASC", (err, rows) => {
        if (err){
            next(err);
        } else {
            res.json({rows: rows, playerRank: req.session.vipLevel, connected: req.session.connected});
        }
    });
});



// Raphaël Largeau
router.use('/', (req, res) => {
    res.render('index.ejs', {connected: req.session.connected, pseudo: req.session.pseudo, room : req.session.room});
});



// handling errors
// Raphaël Largeau
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
})

module.exports = router;