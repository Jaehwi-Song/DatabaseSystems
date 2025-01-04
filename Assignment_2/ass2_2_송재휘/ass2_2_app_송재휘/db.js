const mysql = require('mysql2');

const db_info = {
    host: "localhost",
    port: "3306",
    user: "root",
    password: "ehdtns12!",
    database: "DB_2020081958"
};

const sql_connection = mysql.createConnection(db_info);

sql_connection.connect();

module.exports = sql_connection;