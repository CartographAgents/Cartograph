const { Sequelize } = require('sequelize');

const createSequelize = () => {
    const dialect = process.env.DB_DIALECT || 'mysql';

    if (dialect === 'sqlite') {
        return new Sequelize({
            dialect: 'sqlite',
            storage: process.env.DB_STORAGE || ':memory:',
            logging: false
        });
    }

    return new Sequelize(
        process.env.DB_NAME || 'cartograph_db',
        process.env.DB_USER || 'cartograph',
        process.env.DB_PASSWORD || 'cartograph_pass',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'mysql',
            logging: false
        }
    );
};

const sequelize = createSequelize();

module.exports = sequelize;
