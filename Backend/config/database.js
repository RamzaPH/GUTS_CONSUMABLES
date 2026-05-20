const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'guts_db';
const DB_USER = process.env.DB_USER || 'guts_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'guts_password';
const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_SSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require';

const sequelizeOptions = {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

if (DB_SSL) {
  const ca = process.env.DB_CA_CERT || null;
  sequelizeOptions.dialectOptions.ssl = ca
    ? {
        ca: ca,
        rejectUnauthorized: true,
      }
    : {
        rejectUnauthorized: false, // BINAGO NATIN ITO: Gawing false para sa Aiven
      };
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, sequelizeOptions);

module.exports = sequelize;