const keys = require('../keys/keys');

module.exports = {
  HOST: keys.MYSQL_HOST,
  USER: keys.MYSQL_USER,
  PASSWORD: keys.MYSQL_PASSWORD,
  DB: keys.MYSQL_DB,
  PORT: keys.MYSQL_PORT,
  dialect: 'mysql',
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
};
