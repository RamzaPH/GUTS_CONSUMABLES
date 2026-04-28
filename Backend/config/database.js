const { Sequelize } = require('sequelize');
require('dotenv').config();
const fs = require('fs');

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || 3306;
const DB_SSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require';

const sequelizeOptions = {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {},
};

if (DB_SSL) {
  const ca = process.env.DB_CA_CERT || null;
  sequelizeOptions.dialectOptions.ssl = ca
    ? {
        ca: ca,
        rejectUnauthorized: true,
      }
    : {
        rejectUnauthorized: true,
      };
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, sequelizeOptions);

module.exports = sequelize;