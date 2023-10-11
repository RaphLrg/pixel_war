// Auteur du fichier : Léo Zedek

const express = require('express');
const bcrypt = require('bcryptjs')
const router = express.Router();

// add data to req.body (for POST requests)
router.use(express.urlencoded({ extended: true }));


const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db/db_pixelwar.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database!');
});

router.post("/update_profil", (req, res) => {
	let data = req.body;

	let id_user = data.id_user;
	let new_pseudo = data.new_pseudo;
	let new_password = data.new_password;
	let new_avatar_id = data.new_avatar_id;

	if (new_password != ''){
		bcrypt.hash(new_password, 10, function (err, new_hash) {
			const statement = db.prepare("UPDATE user SET pseudo = ?, pwdHash = ?, avatarId = ? where id = ?;");
			statement.run(new_pseudo, new_hash, new_avatar_id, id_user);
			statement.finalize();
		})
		req.session.pseudo = new_pseudo
	}
	res.status(200).end();
})

router.post('/get_statistics', (req, res) => {
	let data = req.body;
	let id_user = data["id"];

	let pseudo, pwd_hash, vip_level, color_stats, nb_modif, avatar_id;
	const colors = {};
	let error_database = false;


	if (id_user != null) {

		db.serialize(() => {
			const statement = db.prepare("SELECT pseudo, pwdHash, vipLevel, avatarId, colorStats, nbModif FROM user WHERE id=?;");

			statement.get(id_user, (err, result) => {
				if (err) {
					console.err(err.message);
					error_database = true;
				}
				else {
					if (result != null) {
						pseudo = result["pseudo"];
						pwd_hash = result["pwdHash"];
						vip_level = result["vipLevel"];
						avatar_id = result["avatarId"];
						color_stats = result["colorStats"];
						nb_modif = result["nbModif"];
					}
					else {
						error_database = true;
						console.error("Id user not found : " + id_user);
					}
				}
			})

			statement.finalize();

			db.all("SELECT * FROM colors;", (err, rows) => {
	            if (err || error_database) {
	                console.error("Erreur requete AJAX");
	            } else {
	                for (row in rows) {
	                    colors[rows[row].id] = rows[row].colorCode;
	                }

	                res.json({
						colors : colors,
						pseudo : pseudo,
						pwd_hash : pwd_hash,
						vip_level : vip_level,
						avatar_id : avatar_id,
						color_stats : color_stats,
						nb_modif : nb_modif
					});
	            }
	        });
		})
	}

	else {
		console.error("id_user pas valable");
	}
})

router.use('/', (req, res) => {
	let id_user = req.session.userId;
	
	res.render("profil_user.ejs", {id_user : id_user,  connected : req.session.connected, pseudo : req.session.pseudo, room : req.session.room});

})

module.exports = router;
