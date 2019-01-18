var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');
var basename = path.basename(__filename);

var config = require('config');
// const { connection } = config;
// const { database, username, password, options } = connection;



var db = {};
let sequelize;
if(process.env.CLEARDB_DATABASE_URL) {
	sequelize = new Sequelize(process.env.database, process.env.username, process.env.password, {
		host: process.env.host,
		dialect: 'mysql',
		logging: false,
		force: false,
		dialectOptions: {
			"charset": "utf8mb4"
		}
	});
} else {
  sequelize = new Sequelize(database, username, password, options);
}


fs
	.readdirSync(__dirname)
	.filter(file => {
		return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
	})
	.forEach(file => {
		var model = sequelize['import'](path.join(__dirname, file));
		db[model.name] = model;
	});

Object.keys(db).forEach(modelName => {
	if (db[modelName].associate) {
		db[modelName].associate(db);
	}
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
