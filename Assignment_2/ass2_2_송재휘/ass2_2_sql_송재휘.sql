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


INSERT INTO User (user_id, name, username, password) VALUES
(1, '송재휘', 'wotns0319', '1234'), 
(2, '양경훈', 'yangkh', 'yangkh1'), 
(3, '최형락', 'choihr', 'choihr1'),
(4, '조소연', 'chosy', 'chosy1'),
(5, '나림', 'narim', 'narim1'), 
(6, '강동훈', 'kangdh', 'kangdh1'), 
(7, '현규원', 'hyungw', 'hyungw1'),
(8, '이석철', 'leesc', 'leesc1'),
(9, '이상훈', 'leesh', 'leesh1'), 
(10, '이하늘', 'leejn', 'leejn1'),
(11, 'root', 'root', 'root');

INSERT INTO Stock (stock_id, name) VALUES
('005380', '현대차'),
('005930', '삼성전자'),
('000660', 'SK하이닉스'),
('373220', 'LG에너지솔루션'),
('066570', 'LG전자'),
('035420', 'NAVER'),
('000270', '기아'),
('005490','POSCO홀딩스'),
('055550', '신한지주'),
('035720', '카카오'),
('017670', 'SK텔레콤');

INSERT INTO account (account_id, user_id, balance) VALUES
(1, 1, 10000000),
(2, 2, 10000000),
(3, 3, 10000000),
(4, 4, 10000000),
(5, 5, 10000000),
(6, 6, 10000000),
(7, 7, 10000000),
(8, 8, 10000000),
(9, 9, 10000000),
(10, 10, 10000000),
(11, 11, 10000000);


-- Owning_stock 테이블 데이터
INSERT INTO Owning_stock (account_id, stock_id, quantity, buying_price) VALUES
(1, '000270', 100, 80000), -- 기아
(1, '005930', 200, 70000), -- 삼성전자
(1, '005380', 150, 180000), -- 현대차

(2, '000660', 120, 120000), -- SK하이닉스
(2, '005490', 80, 250000), -- POSCO홀딩스
(2, '005930', 150, 69000), -- 삼성전자

(3, '005380', 90, 179000), -- 현대차
(3, '000270', 130, 79000), -- 기아
(3, '000660', 100, 125000), -- SK하이닉스

(4, '005930', 170, 69000), -- 삼성전자
(4, '005490', 100, 248000), -- POSCO홀딩스
(4, '000270', 120, 80500), -- 기아

(5, '000660', 140, 127000), -- SK하이닉스
(5, '005380', 80, 181000), -- 현대차
(5, '005930', 220, 69500), -- 삼성전자

(6, '000270', 110, 79500), -- 기아
(6, '005490', 75, 249000), -- POSCO홀딩스
(6, '005380', 120, 180000), -- 현대차

(7, '005930', 150, 70500), -- 삼성전자
(7, '000660', 130, 128000), -- SK하이닉스
(7, '000270', 90, 79000), -- 기아

(8, '005490', 95, 250000), -- POSCO홀딩스
(8, '005380', 100, 182000), -- 현대차
(8, '000660', 160, 126000), -- SK하이닉스

(9, '005930', 210, 71000), -- 삼성전자
(9, '000270', 130, 80000), -- 기아
(9, '005490', 70, 247000), -- POSCO홀딩스

(10, '000660', 150, 129000), -- SK하이닉스
(10, '005380', 90, 183000), -- 현대차
(10, '000270', 100, 79500),

(11, '373220', 10000000, 105000), -- LG에너지 솔루션
(11, '066570', 10000000, 148000),  -- LG전자
(11, '035420', 10000000, 270000), -- NAVER
(11, '055550', 10000000, 89000), -- 신한지주
(11, '035720', 10000000, 140000), -- 카카오
(11, '017670', 10000000, 210000); -- SK텔레콤

-- 과거 데이터
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('BUY', 1, '000270', 80500, 50, 10, '2024-10-20', '10:15:00'),
('SELL', 2, '005930', 71500, 100, 20, '2024-10-20', '11:20:00'),
('BUY', 3, '005380', 182000, 80, 20, '2024-10-21', '09:50:00'),
('SELL', 4, '000660', 126000, 70, 30, '2024-10-21', '10:30:00'),
('BUY', 5, '005490', 250000, 60, 0, '2024-10-22', '11:45:00'),
('SELL', 6, '000270', 82000, 120, 40, '2024-10-23', '14:15:00'),
('BUY', 7, '005930', 69000, 90, 30, '2024-10-24', '13:40:00'),
('SELL', 8, '005380', 185000, 100, 50, '2024-10-25', '15:20:00'),
('BUY', 9, '000660', 125000, 110, 60, '2024-10-26', '10:30:00');

-- 2024년 11월 5일 데이터
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 1, '005930', 72000, 180, 90, '2024-11-05', '09:30:00'),
('BUY', 2, '005930', 70000, 140, 60, '2024-11-05', '10:45:00'),
('SELL', 3, '000660', 127000, 150, 70, '2024-11-05', '11:00:00'),
('BUY', 4, '000270', 81000, 90, 20, '2024-11-05', '11:20:00'),
('SELL', 5, '005380', 183000, 100, 30, '2024-11-05', '12:00:00'),
('BUY', 6, '005490', 248000, 130, 60, '2024-11-05', '13:40:00'),
('SELL', 7, '000270', 82500, 170, 90, '2024-11-05', '14:00:00');

-- 어제 데이터
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 1, '005930', 72500, 200, 100, CURDATE() - INTERVAL 1 DAY, '09:15:00'),
('BUY', 2, '005930', 71000, 160, 80, CURDATE() - INTERVAL 1 DAY, '10:10:00'),
('SELL', 3, '000660', 128000, 130, 50, CURDATE() - INTERVAL 1 DAY, '11:00:00'),
('BUY', 4, '005490', 247000, 110, 20, CURDATE() - INTERVAL 1 DAY, '11:30:00'),
('SELL', 5, '005380', 186000, 120, 60, CURDATE() - INTERVAL 1 DAY, '12:20:00'),
('BUY', 6, '000270', 81000, 140, 50, CURDATE() - INTERVAL 1 DAY, '13:40:00'),
('SELL', 7, '005930', 73000, 180, 90, CURDATE() - INTERVAL 1 DAY, '14:50:00');

-- 오늘 데이터
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 8, '005490', 250000, 190, 80, CURDATE(), '09:30:00'),
('BUY', 9, '005490', 249000, 200, 90, CURDATE(), '10:40:00'),
('SELL', 10, '000270', 83000, 220, 100, CURDATE(), '11:25:00'),
('BUY', 1, '005930', 70500, 150, 70, CURDATE(), '12:10:00'),
('SELL', 2, '005380', 184000, 250, 150, CURDATE(), '13:45:00'),
('BUY', 3, '000660', 124000, 170, 60, CURDATE(), '14:30:00'),
('SELL', 4, '005930', 73500, 210, 80, CURDATE(), '15:20:00');


-- LG에너지 솔루션
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 11, '373220', 112000, 199239, 123233, CURDATE() - INTERVAL 1, '09:30:00'),
('SELL', 11, '373220', 111000, 298292, 279889, CURDATE() - INTERVAL 1, '10:30:00'),
('SELL', 11, '373220', 110000, 129009, 90002, CURDATE(), '09:30:00'),
('SELL', 11, '373220', 109000, 420090, 390122, CURDATE(), '09:40:00'),
('SELL', 11, '373220', 108000, 34534, 23232, CURDATE(), '12:30:00'),
('BUY', 11, '373220', 107000, 25043, 23232, CURDATE() - INTERVAL 1, '14:30:00'),
('BUY', 11, '373220', 106000, 123242, 92340, CURDATE() - INTERVAL 1, '09:30:00'),
('BUY', 11, '373220', 105000, 234321, 198983, CURDATE(), '09:30:00'),
('BUY', 11, '373220', 104000, 342839, 223232, CURDATE(), '10:30:00'),
('BUY', 11, '373220', 103000, 345342, 332324, CURDATE(), '15:30:00');

-- LG전자 (066570) 거래 기록
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 11, '066570', 150000, 253674, 232500, CURDATE() - INTERVAL 1 DAY, '09:30:00'),
('SELL', 11, '066570', 149000, 184678, 151234, CURDATE() - INTERVAL 1 DAY, '10:45:00'),
('SELL', 11, '066570', 148000, 193753, 162475, CURDATE(), '09:15:00'),
('SELL', 11, '066570', 147000, 76345, 48765, CURDATE(), '11:00:00'),
('SELL', 11, '066570', 146000, 69485, 32564, CURDATE(), '14:00:00'),
('BUY', 11, '066570', 145000, 75684, 48563, CURDATE() - INTERVAL 1 DAY, '12:00:00'),
('BUY', 11, '066570', 144000, 93572, 75482, CURDATE() - INTERVAL 1 DAY, '15:00:00'),
('BUY', 11, '066570', 143000, 151234, 132764, CURDATE(), '09:45:00'),
('BUY', 11, '066570', 142000, 176823, 151256, CURDATE(), '13:30:00'),
('BUY', 11, '066570', 141000, 402345, 374326, CURDATE(), '15:15:00');

-- NAVER (035420) 거래 기록
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 11, '035420', 280000, 168924, 143212, CURDATE() - INTERVAL 1 DAY, '09:45:00'),
('SELL', 11, '035420', 279000, 282367, 256384, CURDATE() - INTERVAL 1 DAY, '11:20:00'),
('SELL', 11, '035420', 278000, 293578, 167485, CURDATE(), '10:30:00'),
('SELL', 11, '035420', 277000, 74852, 52348, CURDATE(), '13:00:00'),
('SELL', 11, '035420', 276000, 62458, 38974, CURDATE(), '15:20:00'),
('BUY', 11, '035420', 275000, 51245, 39823, CURDATE() - INTERVAL 1 DAY, '10:15:00'),
('BUY', 11, '035420', 274000, 89654, 78345, CURDATE() - INTERVAL 1 DAY, '13:40:00'),
('BUY', 11, '035420', 273000, 147852, 134652, CURDATE(), '11:50:00'),
('BUY', 11, '035420', 272000, 265347, 151234, CURDATE(), '14:30:00'),
('BUY', 11, '035420', 271000, 383456, 272345, CURDATE(), '16:10:00');

-- 신한지주 (055550) 거래 기록
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 11, '055550', 95000, 278562, 254832, CURDATE() - INTERVAL 1 DAY, '09:20:00'),
('SELL', 11, '055550', 94000, 385645, 361782, CURDATE() - INTERVAL 1 DAY, '11:10:00'),
('SELL', 11, '055550', 93000, 195763, 145089, CURDATE(), '10:10:00'),
('SELL', 11, '055550', 92000, 65478, 30456, CURDATE(), '13:40:00'),
('SELL', 11, '055550', 91000, 49876, 26745, CURDATE(), '15:30:00'),
('BUY', 11, '055550', 90000, 47634, 39854, CURDATE() - INTERVAL 1 DAY, '09:30:00'),
('BUY', 11, '055550', 89000, 62345, 53482, CURDATE() - INTERVAL 1 DAY, '14:15:00'),
('BUY', 11, '055550', 88000, 150124, 127638, CURDATE(), '12:00:00'),
('BUY', 11, '055550', 87000, 263958, 248231, CURDATE(), '14:45:00'),
('BUY', 11, '055550', 86000, 272634, 265987, CURDATE(), '16:30:00');

-- 카카오 (035720) 거래 기록
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 11, '035720', 140000, 257483, 132984, CURDATE() - INTERVAL 1 DAY, '09:10:00'),
('SELL', 11, '035720', 139000, 268743, 243219, CURDATE() - INTERVAL 1 DAY, '10:35:00'),
('SELL', 11, '035720', 138000, 174562, 50321, CURDATE(), '10:05:00'),
('SELL', 11, '035720', 137000, 63548, 39823, CURDATE(), '12:50:00'),
('SELL', 11, '035720', 136000, 58234, 31025, CURDATE(), '14:25:00'),
('BUY', 11, '035720', 135000, 46234, 34212, CURDATE() - INTERVAL 1 DAY, '09:40:00'),
('BUY', 11, '035720', 134000, 72345, 58239, CURDATE() - INTERVAL 1 DAY, '13:20:00'),
('BUY', 11, '035720', 133000, 153478, 134567, CURDATE(), '11:20:00'),
('BUY', 11, '035720', 132000, 264539, 243958, CURDATE(), '13:30:00'),
('BUY', 11, '035720', 131000, 379534, 265432, CURDATE(), '15:40:00');

-- SK텔레콤 (017670) 거래 기록
INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
('SELL', 11, '017670', 270000, 273654, 251234, CURDATE() - INTERVAL 1 DAY, '09:50:00'),
('SELL', 11, '017670', 269000, 385432, 267328, CURDATE() - INTERVAL 1 DAY, '10:20:00'),
('SELL', 11, '017670', 268000, 194567, 70234, CURDATE(), '11:15:00'),
('SELL', 11, '017670', 267000, 82345, 65327, CURDATE(), '13:50:00'),
('SELL', 11, '017670', 266000, 65478, 48239, CURDATE(), '15:05:00'),
('BUY', 11, '017670', 265000, 52345, 40234, CURDATE() - INTERVAL 1 DAY, '09:25:00'),
('BUY', 11, '017670', 264000, 76234, 61234, CURDATE() - INTERVAL 1 DAY, '14:10:00'),
('BUY', 11, '017670', 263000, 261234, 245367, CURDATE(), '12:30:00'),
('BUY', 11, '017670', 262000, 172345, 153987, CURDATE(), '14:40:00'),
('BUY', 11, '017670', 261000, 187234, 78456, CURDATE(), '16:20:00');