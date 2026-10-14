const Sequelize = require('sequelize');
const dbConfig = require('../../config/db.config');
const keys = require('../../keys/keys');
const { loadModels } = require('../db_model_structure');

/**
 * Creates a Sequelize connection and loads the given models.
 * Used by every service's db_connectivity/<service>/index.js.
 */
function createDb(serviceName, modelNames) {
  const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    dialect: dbConfig.dialect,
    pool: dbConfig.pool,
    timezone: '+05:30',
    dialectOptions: { dateStrings: true, typeCast: true, decimalNumbers: true },
    logging: keys.SEQUELIZE_LOGGING ? console.log : false,
  });

  const db = loadModels(sequelize, modelNames);
  db.Sequelize = Sequelize;
  db.sequelize = sequelize;
  db.Op = Sequelize.Op;

  sequelize
    .authenticate()
    .then(() => console.log(`[${serviceName}] Database connection established.`))
    .catch((err) => console.error(`[${serviceName}] Unable to connect to the database:`, err.message));

  return db;
}

module.exports = { createDb };
