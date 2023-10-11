// Auteur du fichier : Léo Zedek

const express = require('express');
const router = express.Router();

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db/db_pixelwar.db', (err) => {
	if (err) {
		console.error(err.message);
	}
	console.log('Connected to the database!');
});

router.post('/get_statistics', (req, res) => {
	let data = req.body;
	let room_name = data["name"];

	let color_stats, nb_modif;
	const colors = {};
	let erreur_database = false;

	if (room_name != null) {

		db.serialize(() => {
			const statement = db.prepare("SELECT canvas.colorStats, canvas.nbModif FROM canvas INNER JOIN rooms ON canvas.id = rooms.id WHERE rooms.name = ?;");
			statement.get(room_name, (err, result) => {
				if (err) {
					console.error(err.message);
					erreur_database = true;
				}
				else {
					if (result != null) {
						color_stats = result["colorStats"];
						nb_modif = result["nbModif"];

						db.all("SELECT * FROM colors;", (err, rows) => {
							if (err || erreur_database) {
								console.error("Erreur Database");
							} else {
								for (row in rows) {
									colors[rows[row].id] = rows[row].colorCode;
								}

								//console.log({colors : colors, color_stats : color_stats, nb_modif : nb_modif});
								res.json({ colors: colors, color_stats: color_stats, nb_modif: nb_modif });
							}
						});
					}
					else {
						console.error("Canva not found : " + room_name);
						erreur_database = true;
					}
				}
			})

			statement.finalize();


		})
	}

	else {
		erreur_database = true;
		console.error("id_canva pas valable");
	}
})

router.get('/', (req, res) => {
	let data = req.query;
	let room_name = data["name"];

	res.render("stats_salon.ejs", { room_name: room_name, connected: req.session.connected, pseudo: req.session.pseudo, room: req.session.room });

})

module.exports = router;
