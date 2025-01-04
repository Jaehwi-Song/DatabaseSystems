const express = require('express');
const sql_connection = require('./db');

const router = express.Router();

// GET /transactions/buy - 매수 페이지 렌더링
router.get('/buy', async (req, res) => {
    const { stock_id, clientName, account_id } = req.query;

    try {
        // 매도 주문 (높은 가격부터 상위 5개)
        const [sellOrders] = await sql_connection.promise().query(
            `SELECT sum(left_quantity) as sell_quantity, price as sell_price 
             FROM Transaction 
             WHERE stock_id = ? AND type = 'SELL' AND left_quantity > 0 
             GROUP BY price
             ORDER BY price DESC
             LIMIT 5`,
            [stock_id]
        );

        // 매수 주문 (높은 가격부터 상위 5개)
        const [buyOrders] = await sql_connection.promise().query(
            `SELECT sum(left_quantity) as buy_quantity, price as buy_price 
             FROM Transaction 
             WHERE stock_id = ? AND type = 'BUY' AND left_quantity > 0 
             GROUP BY price
             ORDER BY price DESC 
             LIMIT 5`,
            [stock_id]
        );

        // Account 정보에서 잔고 조회
        const [[accountInfo]] = await sql_connection.promise().query(
            `SELECT balance 
             FROM Account 
             WHERE account_id = ?`,
            [account_id]
        );

        const [[stockInfo]] = await sql_connection.promise().query(
            `SELECT name
             FROM stock
             WHERE stock_id = ?`,
             [stock_id]
        );

        // 해당 종목의 보유 수량 조회
        const [holdingResult] = await sql_connection.promise().query(
            `SELECT quantity 
             FROM Owning_stock 
             WHERE account_id = ? AND stock_id = ?`,
            [account_id, stock_id]
        );

        const holdingQuantity = holdingResult.length > 0 ? holdingResult[0].quantity : 0;

        res.render('stockBuy', {
            clientName,
            account_id,
            stock_id,
            sellOrders,
            buyOrders,
            balance: accountInfo.balance,
            stockName: stockInfo.name,
            holdingQuantity
        });
    } catch (error) {
        console.error("Error fetching buy page data:", error);
        res.status(500).send("매수 페이지 렌더링 과정에서 에러가 발생했습니다.");
    }
});

// POST /transactions/market-buy - 시장가 매수
router.post('/market-buy', async (req, res) => {
    const { stock_id, account_id, quantity } = req.body;

    try {
        const [[accountBalance]] = await sql_connection.promise().query(
            `SELECT balance 
             FROM Account 
             WHERE account_id = ?`,
            [account_id]
        );

        let remainingQuantity = quantity;
        let totalCost = 0;

        // 매도 주문을 시장가로 매수
        const [sellOrders] = await sql_connection.promise().query(
            `SELECT price, left_quantity, transaction_id, account_id as seller_account_id
             FROM Transaction
             WHERE stock_id = ? and type = 'SELL' and left_quantity > 0
             ORDER BY price, date, time`,
            [stock_id]
        );
        
        // 예수금 충분한지 확인 (매도 호가 차례로 긁는 시뮬레이션 수행)
        for (const order of sellOrders) {
            const {price, left_quantity, transaction_id, seller_account_id} = order;
            const tradeQuantity = Math.min(remainingQuantity, left_quantity);
            const cost = tradeQuantity * price;

            if (accountBalance.balance < totalCost + cost) {
                return res.status(400).json({ message: '예수금이 충분하지 않습니다!' });
            }

            totalCost += cost;
            remainingQuantity -= tradeQuantity;

            if (remainingQuantity === 0) break;
        }

        if (remainingQuantity !== 0) {
            console.log(sellOrders[-1]);
            totalCost += sellOrders[-1].price * remainingQuantity;

            if (accountBalance.balance < totalCost) {
                return res.status(400).json({ message: '예수금이 충분하지 않습니다!' });
            }
        }

        // 계좌 잔액 업데이트
        await sql_connection.promise().query(
            `UPDATE Account 
             SET balance = balance - ? 
             WHERE account_id = ?`,
            [totalCost, account_id]
        );

        remainingQuantity = quantity;

        // 실제 매수 처리
        for (const order of sellOrders) {
            const { price, left_quantity, transaction_id, seller_account_id} = order;
            const tradeQuantity = Math.min(remainingQuantity, left_quantity);
            const cost = tradeQuantity * price;

            remainingQuantity -= tradeQuantity;

            // 매도 주문 업데이트
            await sql_connection.promise().query(
                `UPDATE Transaction 
                 SET left_quantity = left_quantity - ? 
                 WHERE transaction_id = ?`,
                [tradeQuantity, transaction_id]
            );

            // 매도자 보유 주식 수 업데이트
            await sql_connection.promise().query(
                `UPDATE Owning_stock
                 SET quantity = quantity - ?
                 WHERE account_id = ? and stock_id = ?`,
                 [tradeQuantity, seller_account_id, stock_id]
            );
            
            // 매도자의 보유 주식 수가 0이 되는 경우
            const [[{ updatedQuantity }]] = await sql_connection.promise().query(
                `SELECT coalesce(quantity, 0) as updatedQuantity
                 FROM Owning_stock
                 WHERE account_id = ? and stock_id = ?`,
                [seller_account_id, stock_id]
            );

            if (updatedQuantity <= 0) {
                await sql_connection.promise().query(
                    `DELETE FROM Owning_stock
                     WHERE account_id = ? and stock_id = ?`,
                     [seller_account_id, stock_id]
                );
            }

            // 매도자 예수금 업데이트
            await sql_connection.promise().query(
                `UPDATE Account
                 SET balance = balance + ?
                 WHERE account_id = ?`,
                 [cost, seller_account_id]
            );

            // 매수자 보유 주식 정보 업데이트
            const [accountStockInfo] = await sql_connection.promise().query(
                `SELECT *
                 FROM Owning_stock
                 WHERE account_id = ? and stock_id = ?`,
                 [account_id, stock_id]
            );

            // 이미 해당 종목 있는 경우 수량, 평단가 update
            if (accountStockInfo.length > 0) {
                let newBuyingPrice = accountStockInfo[0].buying_price * accountStockInfo[0].quantity;
                newBuyingPrice += cost;
                newBuyingPrice = parseFloat((newBuyingPrice / (accountStockInfo[0].quantity + tradeQuantity)).toFixed(2));

                await sql_connection.promise().query(
                    `UPDATE Owning_stock
                     SET quantity = quantity + ?,
                         buying_price = ?
                     WHERE account_id = ? and stock_id = ?`,
                     [tradeQuantity, newBuyingPrice, account_id, stock_id]
                );
            }  
            else {  // 없는 경우 새로 항목 만들기
                await sql_connection.promise().query(
                    `INSERT INTO Owning_stock (account_id, stock_id, quantity, buying_price) VALUES
                     (?, ?, ?, ?)`,
                     [account_id, stock_id, tradeQuantity, price]
                );
            }

            // 주문 record 추가 
            await sql_connection.promise().query(
                `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
                 ('BUY', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
                [account_id, stock_id, price, tradeQuantity, 0]
            );

            if (remainingQuantity === 0) break;
        }

        // 시장가 매수 잔량이 남은 경우
        if (remainingQuantity !== 0) {
            // 매도 주문이 없는 경우, 현재 가장 높은 매수 호가로 걸어두기
            if (sellOrders.length === 0) {
                const [[{ buyPrice }]] = await sql_connection.promise().query(
                    `SELECT price as buyPrice
                     FROM Transaction
                     WHERE stock_id = ? and type = 'BUY' and left_quantity > 0
                     ORDER BY price desc
                     LIMIT 1`,
                     [stock_id]
                );

                // 주문 record 추가 
                await sql_connection.promise().query(
                    `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
                    ('BUY', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
                    [account_id, stock_id, buyPrice, remainingQuantity, remainingQuantity]
                );   
            }
            // 주문 record 추가 
            await sql_connection.promise().query(
                `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
                 ('BUY', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
                [account_id, stock_id, sellOrders[-1].price, remainingQuantity, remainingQuantity]
            );       
        }

        res.json({ message: '시장가 매수 주문이 완료되었습니다.', balance: accountBalance.balance - totalCost });
    } catch (error) {
        console.error("Error processing market buy:", error);
        res.status(500).json({ message: '시장가 매수 주문 과정에서 에러가 발생했습니다!' });
    }
});

// POST /transactions/limit-buy - 지정가 매수
router.post('/limit-buy', async (req, res) => {
    const { stock_id, account_id, quantity, price } = req.body;

    try {
        const [[accountBalance]] = await sql_connection.promise().query(
            `SELECT balance 
             FROM Account 
             WHERE account_id = ?`,
            [account_id]
        );

        const totalCost = price * quantity;

        if (accountBalance.balance < totalCost) {
            return res.status(400).json({ message: '예수금이 충분하지 않습니다.' });
        }

        // 계좌 잔액 업데이트
        await sql_connection.promise().query(
            `UPDATE Account 
             SET balance = balance - ? 
             WHERE account_id = ?`,
            [totalCost, account_id]
        );

        // 지정가 매수 주문 record 추가
        const [result] = await sql_connection.promise().query(
            `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
             ('BUY', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
            [account_id, stock_id, price, quantity, quantity]
        );

        const buyer_transaction_id = result.insertId;

        // 거래 체결을 위해 매도 주문 검색
        const [sellOrders] = await sql_connection.promise().query(
            `SELECT left_quantity, transaction_id, account_id as seller_account_id
             FROM Transaction
             WHERE stock_id = ? and type = 'SELL' and left_quantity > 0 and price = ?
             ORDER BY date, time`,
            [stock_id, price]
        );

        let remainingQuantity = quantity;

        // 매도 주문이 존재하는 경우
        if (sellOrders.length > 0) {
            for (const order of sellOrders) {
                const {left_quantity, transaction_id, seller_account_id} = order;
                const tradeQuantity = Math.min(remainingQuantity, left_quantity);
                const cost = tradeQuantity * price;

                remainingQuantity -= tradeQuantity;

                // 매도 주문 업데이트
                await sql_connection.promise().query(
                    `UPDATE Transaction 
                     SET left_quantity = left_quantity - ? 
                     WHERE transaction_id = ?`,
                    [tradeQuantity, transaction_id]
                );

                // 매도자 보유 주식 수 업데이트
                await sql_connection.promise().query(
                    `UPDATE Owning_stock
                     SET quantity = quantity - ?
                     WHERE account_id = ? and stock_id = ?`,
                    [tradeQuantity, seller_account_id, stock_id]
                );

                // 매도자의 보유 주식 수가 0이 되는 경우
                const [[{ updatedQuantity }]] = await sql_connection.promise().query(
                    `SELECT quantity as updatedQuantity
                     FROM Owning_stock
                     WHERE account_id = ? and stock_id = ?`,
                    [seller_account_id, stock_id]
                );

                if (updatedQuantity <= 0) {
                    await sql_connection.promise().query(
                        `DELETE FROM Owning_stock
                         WHERE account_id = ? and stock_id = ?`,
                        [seller_account_id, stock_id]
                    );
                }

                // 매도자 예수금 업데이트
                await sql_connection.promise().query(
                    `UPDATE Account
                     SET balance = balance + ?
                     WHERE account_id = ?`,
                    [cost, seller_account_id]
                );

                // 매수 주문 잔여 수량 줄이기
                await sql_connection.promise().query(
                    `UPDATE Transaction
                     SET left_quantity = left_quantity - ?
                     WHERE transaction_id = ?`,
                     [tradeQuantity, buyer_transaction_id]
                );

                // 매수자 보유 주식 정보 업데이트
                const [accountStockInfo] = await sql_connection.promise().query(
                    `SELECT *
                     FROM Owning_stock
                     WHERE account_id = ? and stock_id = ?`,
                    [account_id, stock_id]
                );

                // 이미 해당 종목 있는 경우 수량, 평단가 update
                if (accountStockInfo.length > 0) {
                    let newBuyingPrice = accountStockInfo[0].buying_price * accountStockInfo[0].quantity;
                    newBuyingPrice += cost;
                    newBuyingPrice = parseFloat((newBuyingPrice / (accountStockInfo[0].quantity + tradeQuantity)).toFixed(2));

                    await sql_connection.promise().query(
                        `UPDATE Owning_stock
                         SET quantity = quantity + ?,
                             buying_price = ?
                         WHERE account_id = ? and stock_id = ?`,
                        [tradeQuantity, newBuyingPrice, account_id, stock_id]
                    );
                }  
                else {  // 없는 경우 새로 항목 만들기
                    await sql_connection.promise().query(
                        `INSERT INTO Owning_stock (account_id, stock_id, quantity, buying_price) VALUES
                        (?, ?, ?, ?)`,
                        [account_id, stock_id, tradeQuantity, price]
                    );
                }

                if (remainingQuantity === 0) break;
            }
        }

        res.json({ message: '지정가 매수 주문이 완료되었습니다.', balance: accountBalance.balance - totalCost });
    } catch (error) {
        console.error("Error processing limit buy:", error);
        res.status(500).json({ message: '지정가 매수 주문 과정에서 에러가 발생했습니다.' });
    }
});

// 매도 페이지 렌더링
router.get('/sell', async (req, res) => {
    const { stock_id, clientName, account_id } = req.query;

    try {
        // 매도 주문 (높은 가격부터 상위 5개)
        const [sellOrders] = await sql_connection.promise().query(
            `SELECT sum(left_quantity) as sell_quantity, price as sell_price 
             FROM Transaction 
             WHERE stock_id = ? AND type = 'SELL' AND left_quantity > 0 
             GROUP BY price
             ORDER BY price DESC
             LIMIT 5`,
            [stock_id]
        );

        // 매수 주문 (높은 가격부터 상위 5개)
        const [buyOrders] = await sql_connection.promise().query(
            `SELECT sum(left_quantity) as buy_quantity, price as buy_price 
             FROM Transaction 
             WHERE stock_id = ? AND type = 'BUY' AND left_quantity > 0 
             GROUP BY price
             ORDER BY price DESC 
             LIMIT 5`,
            [stock_id]
        );

        // Account 정보에서 잔고 조회
        const [[accountInfo]] = await sql_connection.promise().query(
            `SELECT balance 
             FROM Account 
             WHERE account_id = ?`,
            [account_id]
        );

        const [[stockInfo]] = await sql_connection.promise().query(
            `SELECT name
             FROM stock
             WHERE stock_id = ?`,
             [stock_id]
        );

        // 해당 종목의 보유 수량 조회
        const [holdingResult] = await sql_connection.promise().query(
            `SELECT quantity 
             FROM Owning_stock 
             WHERE account_id = ? and stock_id = ?`,
            [account_id, stock_id]
        );

        const holdingQuantity = holdingResult.length > 0 ? holdingResult[0].quantity : 0;

        // 거래 가능 수량 조회
        const [pendingSellOrders] = await sql_connection.promise().query(
            `SELECT coalesce(sum(left_quantity), 0) as pending_quantity
             FROM Transaction 
             WHERE account_id = ? and stock_id = ? and type = 'SELL' and left_quantity > 0`,
            [account_id, stock_id]
        );

        const pendingQuantity = pendingSellOrders[0].pending_quantity;
        const tradableQuantity = holdingQuantity - pendingQuantity;


        res.render('stockSell', {
            clientName,
            account_id,
            stock_id,
            sellOrders,
            buyOrders,
            balance: accountInfo.balance,
            stockName: stockInfo.name,
            holdingQuantity,
            tradableQuantity
        });
    } catch (error) {
        console.error("Error fetching sell page data:", error);
        res.status(500).send("매도 페이지 처리 렌더링 과정에서 에러가 발생했습니다.");
    }
});

// POST /transactions/market-sell - 시장가 매도
router.post('/market-sell', async (req, res) => {
    const { account_id, stock_id, quantity, tradable_quantity } = req.body;

    try {
        // 거래 가능 수량이 충분한지 확인 (매수 호가 차례로 긁는 시뮬레이션 수행)
        if (Number(quantity) > Number(tradable_quantity)) {
            return res.status(400).json({ message: "거래 가능 수량을 초과한 매도 주문입니다." });
        }

        // 매수 호가 조회 (높은 가격부터)
        const [buyOrders] = await sql_connection.promise().query(
            `SELECT price, left_quantity, transaction_id, account_id as buyer_account_id
             FROM Transaction 
             WHERE stock_id = ? and type = 'BUY' and left_quantity > 0 
             ORDER BY price desc, date, time`,
            [stock_id]
        );

        let remainingQuantity = quantity;

        for (const order of buyOrders) {
            const {price, left_quantity, transaction_id, buyer_account_id} = order;
            const tradeQuantity = Math.min(remainingQuantity, left_quantity);
            const cost = tradeQuantity * price;

            remainingQuantity -= tradeQuantity;

            // 매수 주문 업데이트
            await sql_connection.promise().query(
                `UPDATE Transaction 
                 SET left_quantity = left_quantity - ? 
                 WHERE transaction_id = ?`,
                [tradeQuantity, transaction_id]
            );

            // 매수자 보유 주식 정보 업데이트
            const [accountStockInfo] = await sql_connection.promise().query(
                `SELECT *
                 FROM Owning_stock
                 WHERE account_id = ? and stock_id = ?`,
                 [buyer_account_id, stock_id]
            );

            // 이미 해당 종목 있는 경우 수량, 평단가, 수량 update
            if (accountStockInfo.length > 0) {
                let newBuyingPrice = accountStockInfo[0].buying_price * accountStockInfo[0].quantity;
                newBuyingPrice += cost;
                newBuyingPrice = parseFloat((newBuyingPrice / (accountStockInfo[0].quantity + tradeQuantity)).toFixed(2));

                await sql_connection.promise().query(
                    `UPDATE Owning_stock
                     SET quantity = quantity + ?,
                         buying_price = ?
                     WHERE account_id = ? and stock_id = ?`,
                     [tradeQuantity, newBuyingPrice, buyer_account_id, stock_id]
                );
            }  
            else {  // 없는 경우 새로 항목 만들기
                await sql_connection.promise().query(
                    `INSERT INTO Owning_stock (account_id, stock_id, quantity, buying_price) VALUES
                     (?, ?, ?, ?)`,
                     [buyer_account_id, stock_id, tradeQuantity, price]
                );
            }

            // 매도자 보유 주식 수 업데이트
            await sql_connection.promise().query(
                `UPDATE Owning_stock
                 SET quantity = quantity - ?
                 WHERE account_id = ? and stock_id = ?`,
                 [tradeQuantity, account_id, stock_id]
            );

             // 매도자의 보유 주식 수가 0이 되는 경우, 해당 종목 보유 삭제
             const [[{ updatedQuantity }]] = await sql_connection.promise().query(
                `SELECT quantity as updatedQuantity
                 FROM Owning_stock
                 WHERE account_id = ? and stock_id = ?`,
                [account_id, stock_id]
            );
            
            if (updatedQuantity <= 0) {
                await sql_connection.promise().query(
                    `DELETE FROM Owning_stock
                     WHERE account_id = ? and stock_id = ?`,
                     [account_id, stock_id]
                );
            }

            // 매도자 예수금 업데이트
            await sql_connection.promise().query(
                `UPDATE Account
                 SET balance = balance + ?
                 WHERE account_id = ?`,
                 [cost, account_id]
            );

            // 주문 record 추가
            await sql_connection.promise().query(
                `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
                 ('SELL', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
                 [account_id, stock_id, price, tradeQuantity, 0]
            );

            if (remainingQuantity === 0) break;
        }

        // 시장가 매도 잔량이 남은 경우 (걸어 놓기)
        if (remainingQuantity !== 0) {
            // 주문 record 추가 (매수 주문이 없는 경우, 현재 가장 낮은 매도 호가로 걸어두기)
            if (buyOrders.length === 0) {
                const [[{ sellPrice }]] = await sql_connection.promise().query(
                    `SELECT price as sellPrice
                     FROM Transaction
                     WHERE stock_id = ? and type = 'SELL' and left_quantity > 0
                     ORDER BY price
                     LIMIT 1`,
                     [stock_id]
                );

                await sql_connection.promise().query(
                    `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
                     ('SELL', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
                     [account_id, stock_id, sellPrice, remainingQuantity, remainingQuantity]
                );
            }
            else {
                await sql_connection.promise().query(
                    `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
                     ('SELL', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
                     [account_id, stock_id, buyOrders[buyOrders.length - 1].price, remainingQuantity, remainingQuantity]
                );
            }
        }

        res.json({ message: '시장가 매도 주문이 완료되었습니다.' });
    } catch (error) {
        console.error("Error processing market sell:", error);
        res.status(500).json({ message: '시장가 매도 주문 과정에서 에러가 발생했습니다!' });
    }
});

router.post('/limit-sell', async (req, res) => {
    const { account_id, stock_id, price, quantity, tradable_quantity } = req.body;
    try {
        // 거래 가능 수량 확인
        if (Number(quantity) > Number(tradable_quantity)) {
            return res.status(400).json({ message: "보유 수량을 초과한 매도 주문입니다." });
        }

        // 지정가 매도 주문 record 추가
        const [result] = await sql_connection.promise().query(
            `INSERT INTO Transaction (type, account_id, stock_id, price, quantity, left_quantity, date, time) VALUES
                 ('SELL', ?, ?, ?, ?, ?, CURDATE(), CURTIME())`,
                 [account_id, stock_id, price, quantity, quantity]
        );

        const seller_transaction_id = result.insertId;

        // 거래 체결을 위해 매수 주문 검색
        const [buyOrders] = await sql_connection.promise().query(
            `SELECT price, left_quantity, transaction_id, account_id as buyer_account_id
             FROM Transaction 
             WHERE stock_id = ? and type = 'BUY' and left_quantity > 0 and price = ?
             ORDER BY date, time`,
            [stock_id, price]
        );

        let remainingQuantity = quantity;

        // 매수 주문이 존재하는 경우
        if (buyOrders.length > 0) {
            for (const order of buyOrders) {
                const {price, left_quantity, transaction_id, buyer_account_id} = order;
                const tradeQuantity = Math.min(remainingQuantity, left_quantity);
                const cost = tradeQuantity * price;

                remainingQuantity -= tradeQuantity;
    
                // 매수 주문 업데이트
                await sql_connection.promise().query(
                    `UPDATE Transaction 
                     SET left_quantity = left_quantity - ? 
                     WHERE transaction_id = ?`,
                    [tradeQuantity, transaction_id]
                );

                // 매수자 보유 주식 정보 업데이트
                const [accountStockInfo] = await sql_connection.promise().query(
                    `SELECT *
                     FROM Owning_stock
                     WHERE account_id = ? and stock_id = ?`,
                    [buyer_account_id, stock_id]
                );

                // 이미 해당 종목 있는 경우 수량, 평단가, 수량 update
                if (accountStockInfo.length > 0) {
                    let newBuyingPrice = accountStockInfo[0].buying_price * accountStockInfo[0].quantity;
                    newBuyingPrice += cost;
                    newBuyingPrice = parseFloat((newBuyingPrice / (accountStockInfo[0].quantity + tradeQuantity)).toFixed(2));

                    await sql_connection.promise().query(
                        `UPDATE Owning_stock
                        SET quantity = quantity + ?,
                            buying_price = ?
                        WHERE account_id = ? and stock_id = ?`,
                        [tradeQuantity, newBuyingPrice, buyer_account_id, stock_id]
                    );
                }  
                else {  // 없는 경우 새로 항목 만들기
                    await sql_connection.promise().query(
                        `INSERT INTO Owning_stock (account_id, stock_id, quantity, buying_price) VALUES
                        (?, ?, ?, ?)`,
                        [buyer_account_id, stock_id, tradeQuantity, price]
                    );
                }

                // 매도자 보유 주식 수 업데이트
                await sql_connection.promise().query(
                    `UPDATE Owning_stock
                     SET quantity = quantity - ?
                     WHERE account_id = ? and stock_id = ?`,
                    [tradeQuantity, account_id, stock_id]
                );

                // 매도자의 보유 주식 수가 0이 되는 경우, 해당 종목 보유 삭제
                const [[{ updatedQuantity }]] = await sql_connection.promise().query(
                    `SELECT quantity as updatedQuantity
                     FROM Owning_stock
                     WHERE account_id = ? and stock_id = ?`,
                    [account_id, stock_id]
                );
                
                if (updatedQuantity <= 0) {
                    await sql_connection.promise().query(
                        `DELETE FROM Owning_stock
                         WHERE account_id = ? and stock_id = ?`,
                        [account_id, stock_id]
                    );
                }

                // 매도자 예수금 업데이트
                await sql_connection.promise().query(
                    `UPDATE Account
                    SET balance = balance + ?
                    WHERE account_id = ?`,
                    [cost, account_id]
                );

                // 매도 주문 잔여 수량 줄이기
                await sql_connection.promise().query(
                    `UPDATE Transaction
                     SET left_quantity = left_quantity - ?
                     WHERE transaction_id = ?`,
                     [tradeQuantity, seller_transaction_id]
                )

                if (remainingQuantity === 0) break;
            }
        }

        res.json({ message: '지정가 매도 주문이 완료되었습니다.' });

    } catch (error) {
        console.error("Error processing limit sell:", error);
        res.status(500).json({ message: '지정가 매도 주문 과정에서 에러가 발생했습니다!' });
    }
});


module.exports = router;