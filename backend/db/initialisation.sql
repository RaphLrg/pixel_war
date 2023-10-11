-- Auteur du fichier Léo Zedek

CREATE TABLE colors 
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	colorCode TEXT
);

CREATE TABLE rooms
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT,
	pwdHash TEXT,
	canvasId INTEGER,
	avatarName TEXT,
	palette TEXT,
	creatorId TEXT,
	minimumTime INTEGER,
	minimumTimeVIP INTEGER,
	minimumRank INTEGER,
	history INTEGER
);

CREATE TABLE canvas
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	canvaName TEXT,
	size INTEGER,
	colorStats TEXT,
	nbModif INTEGER
);

CREATE TABLE user
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pseudo TEXT,
	pwdHash TEXT,
	vipLevel INTEGER,
	avatarId INTEGER,
	colorStats TEXT,
	nbModif INTEGER,
	lastModifTime DATE
);
