const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const jimp = require('jimp');
const WebSocket = require('ws');

const VIPlevel = 20;

// Mathias Hersent
function selectModifsById(modifs, id) {
    let result = [];
    for (let i = 0; i < modifs.length; i++) {
        if (modifs[i].id === id) {
            result.push(modifs[i]);
        }
    }
    return result;
}

// Les sockets: Mathias Hersent
let lastModifs = [];
const server = new WebSocket.Server({
    port: 8080
});
let sockets = [];
server.on('connection', function (socket) {
    sockets.push(socket);

    // When you receive a message, send that message to every socket.
    socket.on('message', function (data) {
        data = JSON.parse(data.toString());

        lastModifs.push(data);
        sockets.forEach(s => s.send(JSON.stringify(selectModifsById(lastModifs, data.id))));

        let colorStats;
        db.serialize(() => {
            // On récupère les stats de couleurs
            const statement = db.prepare("SELECT colorStats, nbModif FROM canvas WHERE id = ?;");
            statement.get(data.id, (err, result) => {
                if (err) {
                    console.error(err.message);
                } else if (result.colorStats !== null) {
                    colorStats = result.colorStats;
                    let nbModifRoom = result.nbModif + 1;
                    // On récupère le l'id correspondant au code hexa de la couleur
                    let colorId;
                    const statement1 = db.prepare("SELECT id FROM colors WHERE colorCode = ?;");
                    statement1.get(data.hexa, (err, result) => {
                        if (err) {
                            console.error(err.message);
                        } else if (result.id !== null) {
                            colorId = result.id;

                            // On met à jour les stats de couleur
                            let tmp = colorStats.split(',');
                            tmp.pop();
                            let colorStatsDict = {};
                            let tab;
                            for (let i = 0; i < tmp.length; i++) {
                                tab = tmp[i].split(':');
                                colorStatsDict[tab[0]] = tab[1];
                            }
                            colorStatsDict[colorId] = (parseInt(colorStatsDict[colorId]) + 1).toString();
                            let updatedColorStats = JSON.stringify(colorStatsDict).toString().replace(/\"/g, '').replace('{', '').replace('}', '') + ',';

                            const statement2 = db.prepare("UPDATE canvas SET colorStats = ?, nbModif = ? where id = ?;");
                            statement2.run(updatedColorStats, nbModifRoom, data.id);
                            statement2.finalize();
                        }
                    });
                    statement1.finalize();
                }
            });
            statement.finalize();

            const statement3 = db.prepare("SELECT nbModif, colorStats FROM user WHERE id = ?;");
            statement3.get(data.userId, (err, result) => {
                if (err) {
                    console.error(err.message);
                } else if (result !== undefined) {
                    // Update nbModifs
                    let updatedNbModif = result.nbModif + 1;

                    // Test si le user peut devenir VIP
                    if (updatedNbModif > VIPlevel) {
                        const statement5 = db.prepare("UPDATE user SET vipLevel = ? where id = ?;");
                        statement5.run(1, data.userId);
                        statement5.finalize();
                    }

                    const statement4 = db.prepare("UPDATE user SET nbModif = ? where id = ?;");
                    statement4.run(updatedNbModif, data.userId);
                    statement4.finalize();

                    let colorId;
                    let userColorStats = result.colorStats;
                    const statement5 = db.prepare("SELECT id FROM colors WHERE colorCode = ?;");
                    statement5.get(data.hexa, (err, result) => {
                        if (err) {
                            console.error(err.message);
                        } else if (result.id !== null) {
                            colorId = result.id;

                            // Mise à jour des stats de couleur du user
                            let tmp = userColorStats.split(',');
                            tmp.pop();
                            let colorStatsDict = {};
                            let tab;
                            for (let i = 0; i < tmp.length; i++) {
                                tab = tmp[i].split(':');
                                colorStatsDict[tab[0]] = tab[1];
                            }
                            if (colorStatsDict[colorId] === undefined) {
                                colorStatsDict[colorId] = "1";
                            } else {
                                colorStatsDict[colorId] = (parseInt(colorStatsDict[colorId]) + 1).toString();
                            }
                            let updatedUserColorStats = JSON.stringify(colorStatsDict).toString().replace(/\"/g, '').replace('{', '').replace('}', '') + ',';
                            //console.log(updatedUserColorStats);

                            const statement6 = db.prepare("UPDATE user SET colorStats = ? where id = ?;");
                            statement6.run(updatedUserColorStats, data.userId);
                            statement6.finalize();
                        }
                    });
                    statement5.finalize();
                }
            });
            statement3.finalize();
        });

        jimp.read('../frontend/assets/img/canvas/canva_' + data.id + '.png')
            .then(image => {
                image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                    if (x == data.x && y == data.y) {
                        this.bitmap.data[idx + 0] = data.color[0];   // red channel
                        this.bitmap.data[idx + 1] = data.color[1];   // green channel
                        this.bitmap.data[idx + 2] = data.color[2];   // blue channel
                    }
                });
                return image;
            })
            .then(image => {
                return image.write('../frontend/assets/img/canvas/canva_' + data.id + '.png');
            })
            .catch(err => {
                console.error(err);
            });
    });

    // When a socket closes, or disconnects, remove it from the array.
    socket.on('close', function () {
        // console.log('deco ', socket.request.headers.data);
        sockets = sockets.filter(s => s !== socket);
    });
});

// connecting an existing database (handling errors)
const db = new sqlite3.Database('./db/db_pixelwar.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database!');
});

router.post('/check_password', function (req, res) {
    // Auteur : Léo Zedek

    let data = req.body;
    let submit_password = data["submit_password"];
    let submit_password_hash = bcrypt.hashSync(submit_password, 10);
    let room_name = data["room_name"];

    db.serialize(() => {
        const statement = db.prepare("SELECT pwdHash FROM rooms WHERE rooms.name = ?;");

        statement.get(room_name, (err, result) => {
            if (err) {
                console.error(err.message);
                res.json(null);

            } else if (result !== undefined) {

                bcrypt.compare(submit_password, result["pwdHash"], function (err, result) {
                    if (err) {
                        console.error(err.message);
                    }

                    else {
                        if (result) {
                            res.json({ good_password: true });
                        }
                        else {
                            res.json({ good_password: false });
                        }
                    }
                });

            } else {
                console.error("Room's name not found :" + room_name);
                res.json(null);
            }
        });

        statement.finalize();
    })
});

router.post('/get_password_hash', function (req, res) {
    // Auteur : Léo Zedek

    let data = req.body;
    let room_name = data["name"];

    db.serialize(() => {
        const statement = db.prepare("SELECT pwdHash FROM rooms WHERE rooms.name = ?;");

        statement.get(room_name, (err, result) => {
            if (err) {
                console.error(err.message);
                res.json(null);

            } else if (result !== undefined) {
                res.json({ password_hash: result["pwdHash"] });

            } else {
                console.error("Room's name not found :" + room_name);
                res.json(null);
            }
        });

        statement.finalize();
    })
});

// Mathias Hersent
router.post('/info', function (req, res) {
    let data = req.body;
    db.serialize(() => {
        const colors = [];
        db.all("SELECT * FROM colors;", (err, rows) => {
            if (err) {
                console.error(err);
            } else {
                for (row in rows) {
                    colors.push({ color: rows[row].colorCode, id: rows[row].id - 1 });
                }
            }
            const statement = db.prepare("SELECT * FROM canvas INNER JOIN rooms ON canvas.id = rooms.id WHERE rooms.name = ?;");
            statement.get(data.name, (err, result) => {
                if (err) {
                    console.error(err.message);
                    res.json(null);
                } else if (result !== undefined) {
                    let info = {};
                    info.id = result.id;
                    info.size = result.size;
                    info.colors = result.colorStats;
                    info.minTime = result.minimumTime;
                    info.minTimeVIP = result.minimumTimeVIP;
                    info.minRank = result.minimumRank;
                    info.listColors = colors;
                    console.log(info)
                    res.json(info);
                } else {
                    res.json(null);
                }
            });
            statement.finalize();
        });
        
    });
});

router.post("/get_time_to_wait", (req, res) => {
    // Auteur : Léo Zedek

    let data = req.body;
    let id = data["user_id"];

    db.serialize(() => {

        const statement = db.prepare("SELECT lastModifTime FROM user WHERE id = ?;");
        statement.get(id, (err, result) => {
            if (err) {
                console.error(err.message);
                res.json(null);
            }

            else if (result != undefined) {
                let last_modif_time = result["lastModifTime"];

                let time_now = Math.floor(Date.now() / 1000); // seconds since epoch

                res.json({ time_since_last_modif: time_now - last_modif_time });
            }

            else {
                console.error("Id user not found : " + id);
                res.json(null);
            }
        })

        statement.finalize();

    });
});

router.post("/update_date", (req, res) => {
    // Auteur : Léo Zedek


    // Update in the database the variable lastModifTime of the user that match the id
    let data = req.body;
    let id = data["user_id"];

    db.serialize(() => {

        let time_now = Math.floor(Date.now() / 1000); // seconds since epoch 

        const statement = db.prepare("UPDATE user SET lastModifTime = ? where id = ?;");

        statement.run(time_now, id);

        statement.finalize();

        const statement2 = db.prepare("SELECT nbModif FROM user where id = ?;");

        statement2.get(id, (err, result) => {
            if (err) {
                console.error(err.message);
                res.json(null);
            }

            else if (result != undefined) {
                let nbModif = result["nbModif"];

                if (nbModif >= VIPlevel) {
                    req.session.vipLevel = 1;
                }
                res.json({ new_vip_level: req.session.vipLevel })

            }

            else {
                console.error("Id user not found : " + id);
                res.json(null);
            }
        })

        statement2.finalize();
    });
});

router.use('/', (req, res) => {
    let data = req.query;
    let room_name = data["name"];
    req.session.room = room_name
    res.render('canva.ejs', { pseudo: req.session.pseudo, userId: req.session.userId, connected: req.session.connected, room: req.session.room, vipLevel: req.session.vipLevel });
});

// handling errors
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
})

module.exports = router;
