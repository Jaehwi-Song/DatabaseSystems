const express = require('express');
const sql_connection = require('./db');

const router = express.Router();

router.route("/createAccount")
.get((req, res) => {
    const userID = req.query.user_id;
    const clientName = req.query.clientName;

    sql_connection.query('SELECT * FROM Account WHERE user_id = ?', [userID], (err, data, area) => {
        if (err) throw err;

        if (data.length > 0) {
            res.render("mainPage", {clientName: clientName, userID: userID, accountID: data[0].account_id});
        }
        else {
            sql_connection.query('INSERT INTO Account(user_id, balance) values (?, 0)', [userID], (error, results, fields) => {
                if (error) throw error;
                const accountID = results.insertId;
        
                res.render("mainPage", {clientName: clientName, userID: userID, accountID: accountID});
            })
        }
    })
})

// GET /account/myAccount - 계좌 정보 페이지
router.get('/myAccount', async (req, res) => {
    const userID = req.query.user_id;
    const accountId = req.query.account_id;

    try {
        // 사용자 정보 및 계좌 정보 조회
        const [userResult] = await sql_connection.promise().query('SELECT * FROM User WHERE user_id = ?', [userID]);
        const [accountResult] = await sql_connection.promise().query('SELECT * FROM Account WHERE account_id = ?', [accountId]);
        const [owningStocks] = await sql_connection.promise().query(
            `SELECT O.stock_id, S.name, O.quantity, O.buying_price 
             FROM Owning_stock as O 
             JOIN Stock as S ON O.stock_id = S.stock_id 
             WHERE O.account_id = ?`,
            [accountId]
        );

        // 각 주식 별 현재가, 거래 가능 수량, 평가 손익, 등락률 계산
        for (const stock of owningStocks) {
            const stockId = stock.stock_id;

            // 현재가 계산 (매도 호가 중 가장 낮은 값과 매수 호가 중 가장 높은 값 중 최근 거래가로 설정)
            const [[{ recent_price }]] = await sql_connection.promise().query(
                `SELECT
                    CASE 
                        WHEN sell_trade.date > buy_trade.date OR (sell_trade.date = buy_trade.date AND sell_trade.time > buy_trade.time)
                        THEN sell_trade.price
                        ELSE buy_trade.price
                    END as recent_price
                FROM 
                    (SELECT price, date, time 
                    FROM Transaction 
                    WHERE stock_id = ? and type = 'SELL' and left_quantity > 0 
                    ORDER BY price 
                    LIMIT 1) as sell_trade,
                    (SELECT price, date, time 
                    FROM Transaction 
                    WHERE stock_id = ? and type = 'BUY' and left_quantity > 0 
                    ORDER BY price desc
                    LIMIT 1) as buy_trade`,
                [stockId, stockId]
            );

            stock.current_price = recent_price || stock.buying_price;

            // 거래 가능 수량 계산
            const [pendingSellOrders] = await sql_connection.promise().query(
                `SELECT coalesce(sum(left_quantity), 0) as pending_quantity
                FROM Transaction 
                WHERE account_id = ? and stock_id = ? and type = 'SELL' and left_quantity > 0`,
                [accountId, stockId]
            );

            const pendingQuantity = pendingSellOrders[0].pending_quantity;
            stock.tradable_quantity = stock.quantity - pendingQuantity;

            // 평가 손익 계산
            stock.profit_loss = ((stock.current_price - stock.buying_price) * stock.quantity).toFixed(2);
            
            // 등락률 계산
            stock.price_change_rate = (((stock.current_price - stock.buying_price) / stock.buying_price) * 100).toFixed(2);
        }

        if (userResult.length > 0 && accountResult.length > 0) {
            res.render('myAccount', {
                clientName: userResult[0].name,
                account: accountResult[0],
                owningStocks
            });
        } else {
            res.status(404).send("유저 정보 또는 계좌 정보가 존재하지 않습니다.");
        }
    } catch (error) {
        console.error("Error fetching account data:", error);
        res.status(500).send("계좌 정보를 읽어오는 과정에서 에러가 발생했습니다.");
    }
});

// POST /account/deposit - 입금 처리
router.post('/deposit', async (req, res) => {
    const { account_id, amount } = req.body;

    try {
        await sql_connection.promise().query(
            `UPDATE Account 
             SET balance = balance + ? 
             WHERE account_id = ?`,
            [amount, account_id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error depositing:", error);
        res.status(500).json({ success: false });
    }
});

// POST /account/withdraw - 출금 처리
router.post('/withdraw', async (req, res) => {
    const { account_id, amount } = req.body;

    try {
        // 현재 잔액 조회
        const [accountResult] = await sql_connection.promise().query('SELECT balance FROM Account WHERE account_id = ?', [account_id]);
        
        if (accountResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        const currentBalance = accountResult[0].balance;
        
        // 출금 가능한지 확인
        if (currentBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        await sql_connection.promise().query(
            `UPDATE Account 
             SET balance = balance - ? 
             WHERE account_id = ?`,
            [amount, account_id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error withdrawing:", error);
        res.status(500).json({ success: false });
    }
});

// GET /account/searchStock - 종목 검색 처리
router.get('/searchStock', async (req, res) => {
    const { account_id, stockName } = req.query;

    try {
        const [owningStocks] = await sql_connection.promise().query(
            `SELECT O.stock_id, S.name, O.quantity, O.buying_price
             FROM Owning_stock as O 
             JOIN Stock as S ON O.stock_id = S.stock_id
             WHERE O.account_id = ? AND S.name LIKE ?`,
            [account_id, `%${stockName}%`]
        );

         // 각 주식 별 현재가, 거래 가능 수량, 평가 손익, 등락률 계산
         for (const stock of owningStocks) {
            const stockId = stock.stock_id;
            const accountId = account_id;

            // 현재가 계산 (매도 호가 중 가장 낮은 값과 매수 호가 중 가장 높은 값 중 최근 거래가로 설정)
            const [[{ recent_price }]] = await sql_connection.promise().query(
                `SELECT
                    CASE 
                        WHEN sell_trade.date > buy_trade.date OR (sell_trade.date = buy_trade.date AND sell_trade.time > buy_trade.time)
                        THEN sell_trade.price
                        ELSE buy_trade.price
                    END as recent_price
                FROM 
                    (SELECT price, date, time 
                    FROM Transaction 
                    WHERE stock_id = ? and type = 'SELL' and left_quantity > 0 
                    ORDER BY price 
                    LIMIT 1) as sell_trade,
                    (SELECT price, date, time 
                    FROM Transaction 
                    WHERE stock_id = ? and type = 'BUY' and left_quantity > 0 
                    ORDER BY price desc
                    LIMIT 1) as buy_trade`,
                [stockId, stockId]
            );

            stock.current_price = recent_price || stock.buying_price;

            // 거래 가능 수량 계산
            const [pendingSellOrders] = await sql_connection.promise().query(
                `SELECT coalesce(sum(left_quantity), 0) as pending_quantity
                FROM Transaction 
                WHERE account_id = ? and stock_id = ? and type = 'SELL' and left_quantity > 0`,
                [accountId, stockId]
            );

            const pendingQuantity = pendingSellOrders[0].pending_quantity;
            stock.tradable_quantity = stock.quantity - pendingQuantity;

            // 평가 손익 계산
            stock.profit_loss = ((stock.current_price - stock.buying_price) * stock.quantity).toFixed(2);
            
            // 등락률 계산
            stock.price_change_rate = (((stock.current_price - stock.buying_price) / stock.buying_price) * 100).toFixed(2);
        }

        res.json(owningStocks);
    } catch (error) {
        console.error("Error searching stock:", error);
        res.status(500).json([]);
    }
});

// GET /account/userTransactionHistory - 거래 내역 페이지 렌더링
router.get('/userTransactionHistory', (req, res) => {
    const accountId = req.query.account_id;
    res.render('userTransactionHistory', { account_id: accountId });
});

// GET /account/userTransactionHistory/filter - 기간 필터를 통한 거래 내역 조회
router.get('/userTransactionHistory/filter', async (req, res) => {
    const { account_id, startDate, endDate } = req.query;

    try {
        const [transactions] = await sql_connection.promise().query(
            `SELECT S.name, T.type, T.price, T.quantity, T.date, T.time, T.left_quantity, T.transaction_id
             FROM Transaction as T 
             JOIN Stock as S ON T.stock_id = S.stock_id 
             WHERE T.account_id = ? AND T.date BETWEEN ? AND ?
             ORDER BY T.date desc, T.time desc`,
            [account_id, startDate, endDate]
        );
        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json([]);
    }
});

// GET /account/userTransactionHistory/search - 종목명 검색을 통한 거래 내역 조회
router.get('/userTransactionHistory/search', async (req, res) => {
    const { account_id, stockName, startDate, endDate } = req.query;

    try {
        let query;
        let params = [account_id, `%${stockName}%`];

        // 기간이 설정된 경우에만 기간 조건 추가
        if (startDate && endDate) {
            query = `
                SELECT S.name, T.type, T.price, T.quantity, T.date, T.time, T.left_quantity, T.transaction_id
                FROM Transaction as T 
                JOIN Stock as S ON T.stock_id = S.stock_id 
                WHERE T.account_id = ? and S.name LIKE ? and T.date BETWEEN ? and ?
                ORDER BY T.date desc, T.time desc
            `;
            params.push(startDate, endDate);
        } else {
            query = `
                SELECT S.name, T.type, T.price, T.quantity, T.date, T.time, T.left_quantity, T.transaction_id
                FROM Transaction as T 
                JOIN Stock as S ON T.stock_id = S.stock_id 
                WHERE T.account_id = ? AND S.name LIKE ?
                ORDER BY T.date desc, T.time desc
            `;
        }

        const [transactions] = await sql_connection.promise().query(query, params);
        res.json(transactions);
    } catch (error) {
        console.error("Error searching transactions:", error);
        res.status(500).json([]);
    }
});

// POST /account/cancelTransaction - 거래 취소 처리
router.post('/cancelTransaction', async (req, res) => {
    const { transactionId, accountId, type, price, leftQuantity } = req.body;

    try {
        // 거래 내역 조회
        const [[transaction]] = await sql_connection.promise().query(
            `SELECT quantity, left_quantity 
             FROM Transaction 
             WHERE transaction_id = ?`, 
             [transactionId]
        );
        console.log(transactionId);
        console.log(transaction);
        if (!transaction) {
            return res.status(404).json({ message: "거래 내역을 찾을 수 없습니다." });
        }

        const { quantity, left_quantity } = transaction;

        // 취소 시 수량 조정 또는 삭제
        if (quantity === left_quantity) {
            // 체결된 수량이 없으면 전체 삭제
            await sql_connection.promise().query(`DELETE FROM Transaction WHERE transaction_id = ?`, [transactionId]);
        } else {
            // 일부 체결된 경우 남은 수량을 0으로 업데이트하고 체결 수량 반영
            await sql_connection.promise().query(
                `UPDATE Transaction SET quantity = ?, left_quantity = 0 WHERE transaction_id = ?`,
                [quantity - left_quantity, transactionId]
            );
        }

        // 예수금 또는 보유 주식 수 조정
        if (type === 'BUY') {
            await sql_connection.promise().query(
                `UPDATE Account 
                 SET balance = balance + ? 
                 WHERE account_id = ?`, 
                [price * leftQuantity, accountId]
            );
        }

        res.json({ message: '주문이 성공적으로 취소되었습니다.' });
    } catch (error) {
        console.error("Error canceling transaction:", error);
        res.status(500).json({ message: '주문 취소 과정에서 에러가 발생했습니다!' });
    }
});

module.exports = router;