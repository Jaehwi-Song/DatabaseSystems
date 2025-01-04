const express = require('express');

const setupApp = () => {
    const app = express();

    app.set("view engine", "ejs");
    app.set("views", "./views");

    app.use(express.json());
    app.use(express.urlencoded({extended : true}));

    return app
}

module.exports = setupApp;
