const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const { createCanvas } = require('canvas');
const fs = require('fs');

// connecting an existing database (handling errors)
const db = new sqlite3.Database('./db/db_pixelwar.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database!');
});


// Raphaël Largeau
const createCanva = (canvaSize, color_selected, canvaIndex) => {

    db.serialize(() => {
        // CREATION DE LA CHAINE DE CARACTERE CARACTERISANT LA PALETTE 
        let colorStats = "";
        color_selected.forEach((element, index) => {
            myIndex = index + 1;
            if (element === "true") {
                colorStats = colorStats + myIndex + ":0,";
            }
        });

        // CREATION DU FICHIER DU CANVA ICI
        canvaSize = parseInt(canvaSize);
        const canvas = createCanvas(canvaSize, canvaSize);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvaSize, canvaSize);

        // ENREGISTREMENT DU CANVA ICI
        const stream = canvas.createPNGStream();
        const out = fs.createWriteStream("../frontend/assets/img/canvas/canva_" + canvaIndex + ".png");
        stream.pipe(out);

        const statement3 = db.prepare("INSERT INTO canvas (id, canvaName, colorStats, size) VALUES (?,?,?,?)");
        statement3.run([canvaIndex, "canva_" + canvaIndex + ".png", colorStats, canvaSize], (err) => {
            if (err) {
                console.error(err.message);
            }
        });

        statement3.finalize();
    });
}



// Raphaël Largeau
router.post('/colors', (req, res) => {
    const colors = [];
    db.serialize(() => {
        db.all("SELECT * FROM colors;", (err, rows) => {
            if (err) {
                next(err);
            } else {
                for (row in rows) {
                    colors.push({ color: rows[row].colorCode, id: rows[row].id - 1 });
                }
            }
            res.json({colors: colors, playerRank: req.session.vipLevel});
        });
    });
});



// Raphaël Largeau
router.post('/submit', (req, res) => {

    const data = req.body;
    if (data.pwd !== "") {
        data.pwd = bcrypt.hashSync(data.pwd, 10);
    }
    db.serialize(() => {
        const statement = db.prepare("SELECT * FROM rooms WHERE name=?;");
        statement.get(data.name, (err, result) => {
            if (err) {
                console.error(err.message);
            } else {
                if (result === undefined) {
                    db.serialize(() => {
                        db.get("SELECT MAX(id) FROM canvas", (err, result) => {
                            if (err) {
                                console.error(err.message);
                            } else {
                                let canvaId = 0;
                                if (result !== undefined) {
                                    canvaId = result['MAX(id)'] + 1;
                                }
                                const avatarName = "canva_" + canvaId + ".png";
                                createCanva(data.canva_size, data.color_selected, canvaId);

                                const statement2 = db.prepare("INSERT INTO rooms (name,pwdHash,canvasId,creatorId,minimumTime,minimumTimeVIP,minimumRank,avatarName) VALUES (?,?,?,?,?,?,?,?);");
                                statement2.run([data.name, data.pwd, canvaId, req.session.userId, data.time, data.vip_time, data.minimum_rank, avatarName], (err) => {
                                    if (err) {
                                        console.error(err.message);
                                        res.json({ err: true });
                                    } else {
                                        res.json({ redirect: "/canva?name=" + data.name });
                                    }
                                });
                                statement2.finalize();
                            }
                        });
                    });
                } else {
                    res.json({ exists: true });
                }
            }
        });
        statement.finalize();
    });
});



// Raphaël Largeau
router.use('/', (req, res) => {
    res.render('creation_salon.ejs',  {connected : req.session.connected, pseudo : req.session.pseudo, room : req.session.room});
});



// handling errors
// Raphaël Largeau
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
})

module.exports = router;