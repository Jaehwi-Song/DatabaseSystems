DROP DATABASE IF EXISTS DB_2020081958;
CREATE DATABASE DB_2020081958;
USE DB_2020081958;

CREATE TABLE User (
    user_id     INT AUTO_INCREMENT,
    name        VARCHAR(20) NOT NULL,
    username    VARCHAR(20) NOT NULL,
    password    VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE Stock (
    stock_id    VARCHAR(10),
    name        VARCHAR(20) NOT NULL,
    PRIMARY KEY (stock_id)
);

CREATE TABLE Account (
    account_id  INT AUTO_INCREMENT,
    user_id     INT,
    balance     NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (account_id),
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

CREATE TABLE Owning_stock (
    account_id  INT,
    stock_id    VARCHAR(10),
    quantity    INT NOT NULL,
    buying_price    NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (account_id, stock_id),
    FOREIGN KEY (account_id) REFERENCES Account(account_id),
    FOREIGN KEY (stock_id) REFERENCES Stock(stock_id)
);

CREATE TABLE Transaction (
    transaction_id  INT AUTO_INCREMENT,
    type        ENUM('BUY', 'SELL') NOT NULL,
    account_id  INT,
    stock_id    VARCHAR(10),
    price       NUMERIC(10, 2) NOT NULL,
    quantity    INT NOT NULL,
    left_quantity   INT NOT NULL,
    date        DATE NOT NULL,
    time        TIME NOT NULL,
    PRIMARY KEY (transaction_id),
    FOREIGN KEY (account_id) REFERENCES Account(account_id),
    FOREIGN KEY (stock_id) REFERENCES Stock(stock_id)
);