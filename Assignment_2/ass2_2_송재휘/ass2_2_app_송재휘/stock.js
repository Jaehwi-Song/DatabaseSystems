const express = require('express');
const sql_connection = require('./db');

const router = express.Router();

// GET /stock/stockList - 주식 정보 페이지 렌더링
router.get('/stockList', (req, res) => {
    const { clientName, account_id } = req.query; // account_id와 clientName을 쿼리로 받음
    res.render('stockList', { clientName, account_id });
});

// GET /stock/search - 주식 검색 처리
router.get('/search', async (req, res) => {
    const { stockName } = req.query;

    try {
        const query = stockName
            ? `SELECT * FROM Stock WHERE name LIKE ?`
            : `SELECT * FROM Stock`;
        const params = stockName ? [`%${stockName}%`] : [];

        const [stocks] = await sql_connection.promise().query(query, params);
        res.json(stocks);
    } catch (error) {
        console.error("Error fetching stocks:", error);
        res.status(500).json([]);
    }
});

// GET /stock/details - 주식 세부 정보 페이지 렌더링
router.get('/details', async (req, res) => {
    const { stock_id, clientName, account_id } = req.query;

    try {
        // 종목명 및 현재가 계산
        const [[stockInfo]] = await sql_connection.promise().query(
            `SELECT stock_id, name
             FROM Stock 
             WHERE stock_id = ?`,
            [stock_id]
        );

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
            [stock_id, stock_id]
        );

        if (recent_price === undefined) {
            recent_price = 0;
        }

        // 전일 종가 계산 (어제 마지막 거래 가격)
        const [[{ previous_close_price }]] = await sql_connection.promise().query(
            `SELECT T.price as previous_close_price
             FROM Transaction as T
             WHERE T.stock_id = ? AND T.date = CURDATE() - INTERVAL 1 DAY
             ORDER BY T.time DESC
             LIMIT 1`,
            [stock_id]
        );

        // 등락률 계산
        let priceChangeRate = null;
        if (previous_close_price) {
            priceChangeRate = ((recent_price - previous_close_price) / previous_close_price) * 100;
        }

        res.render('stockDetails', {
            stockInfo,
            clientName,
            account_id,
            recent_price,
            previous_close_price,
            priceChangeRate
        });
    } catch (error) {
        console.error("Error fetching stock details:", error);
        res.status(500).send("Error fetching stock details");
    }
});

// GET /stock/details/transactions - 특정 기간 동안의 거래 내역 조회
router.get('/details/transactions', async (req, res) => {
    const { stock_id, startDate, endDate } = req.query;

    try {
        const [transactions] = await sql_connection.promise().query(
            `SELECT type, price, quantity, date, time 
             FROM Transaction
             WHERE stock_id = ? AND date BETWEEN ? AND ?
             ORDER BY date DESC, time DESC`,
            [stock_id, startDate, endDate]
        );

        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json([]);
    }
});

// 거래량 순위 조회
router.get('/transaction-ranking', async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        // 특정 기간 동안의 거래량 순위를 조회
        const [transactionBuyRanking] = await sql_connection.promise().query(
            `SELECT S.stock_id, S.name, sum(T.quantity - T.left_quantity) as total_volume
             FROM Transaction as T
             JOIN Stock as S ON T.stock_id = S.stock_id
             WHERE T.date BETWEEN ? and ? and T.type = 'BUY'
                and (T.left_quantity = 0 or T.quantity > T.left_quantity)
             GROUP BY S.stock_id, S.name
             ORDER BY total_volume desc`,
            [startDate, endDate]
        );
        
        const [transactionSellRanking] = await sql_connection.promise().query(
            `SELECT S.stock_id, S.name, sum(T.quantity - T.left_quantity) as total_volume
             FROM Transaction as T
             JOIN Stock as S ON T.stock_id = S.stock_id
             WHERE T.date BETWEEN ? and ? and T.type = 'SELL'
                and (T.left_quantity = 0 or T.quantity > T.left_quantity)
             GROUP BY S.stock_id, S.name
             ORDER BY total_volume desc`,
            [startDate, endDate]
        );

        // 거래량 계산 (매수, 매도 내역 기준 높은 값으로 설정)
        const buyMap = Object.fromEntries(transactionBuyRanking.map(item => [item.stock_id, item]));
        const sellMap = Object.fromEntries(transactionSellRanking.map(item => [item.stock_id, item]));

        const transactionRanking = Object.values(
            (transactionBuyRanking.length > transactionSellRanking.length) ? buyMap : sellMap
        ).map(item => {
            const stockID = item.stock_id;
            const buyVolume = buyMap[stockID] ? Number(buyMap[stockID].total_volume) : 0;
            const sellVolume = sellMap[stockID] ? Number(sellMap[stockID].total_volume) : 0;

            // 더 큰 값 사용
            const maxVolume = Math.max(buyVolume, sellVolume);

            return {
                stock_id: stockID,
                name: item.name,
                total_volume: maxVolume
            };
        });

        transactionRanking.sort((a, b) => {
            // 거래량 같은 경우 이름 오름차순으로 정렬
            if (b.total_volume === a.total_volume) {
                return a.name.localeCompare(b.name); 
            }
            // 거래량 다른 경우, 거래량 내림차순으로 정렬
            return b.total_volume - a.total_volume;
        });
       

        res.json(transactionRanking);
    } catch (error) {
        console.error("Error fetching volume ranking data:", error);
        res.status(500).json({ message: "거래량 순위를 조회하는 과정에서 에러가 발생했습니다." });
    }
});

module.exports = router;