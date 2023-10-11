DATABASE_PATH=./backend/db

create_database: $(DATABASE_PATH)/db_pixelwar.db
	sqlite3 $< ".read $(DATABASE_PATH)/remplir_database.sql"


$(DATABASE_PATH)/db_pixelwar.db:
	sqlite3 $@ ".read $(DATABASE_PATH)/initialisation.sql"