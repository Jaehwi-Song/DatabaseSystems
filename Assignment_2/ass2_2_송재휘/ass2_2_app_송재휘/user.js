const express = require('express');
const sql_connection = require('./db');

const router = express.Router();

router.route("/login")
.get((req, res) => {
    res.render("loginPage");
})
.post(async (req, res) => {
    const {userID, userPassword} = req.body;

    try {
        const [userResults] = await sql_connection.promise().query(
            `SELECT * 
             FROM User 
             WHERE username = ? and password = ?`, 
             [userID, userPassword]
        );

        if (userResults.length > 0) {
            const [accountResults] = await sql_connection.promise().query(
                `SELECT * 
                 FROM Account
                 WHERE user_id = ?`, 
                [userResults[0].user_id]
            );

            if (accountResults.length > 0) {
                res.render("mainPage", {
                    clientName: userResults[0].name, 
                    userID: userResults[0].user_id, 
                    accountID: accountResults[0].account_id
                });
            }
            else {
                res.render("mainPage", {
                    clientName: userResults[0].name, 
                    userID: userResults[0].user_id
                });
            }
        } 
        else {
            res.render("loginPage", {loginResult: 'fail'});
        }
    }
    catch (error) {
        console.error("Error processing login:", error);
        res.status(500).send("로그인 과정에서 에러가 발생했습니다.");
    }
});

router.route("/signup")
.get((req, res) => {
    res.render("signupPage");
})
.post((req, res) => {
    const {name, userID, userPassword} = req.body;
    
    sql_connection.query('SELECT * FROM User WHERE username = ?', [userID], (error, results, fields) => {
        if (error) throw error;

        if (results.length > 0) {
            res.render("signupPage", {signupResult: 'fail'});
        }
        else {
            sql_connection.query('INSERT INTO User(name, username, password) values (?, ?, ?)', [name, userID, userPassword], (error, results, fields) => {
                if (error) throw error;
                else {
                    res.redirect('/users/login');
                }
            })
        }
    })
});

// 계정 삭제
router.get('/deleteUser', async (req, res) => {
    const userId = req.query.user_id;

    try {
        // Transaction tuple 삭제
        await sql_connection.promise().query(
            `DELETE FROM Transaction 
             WHERE account_id in (SELECT account_id 
                                  FROM Account 
                                  WHERE user_id = ?)`,
            [userId]
        );

        // Owning_stock tuple 삭제
        await sql_connection.promise().query(
            `DELETE FROM Owning_stock 
             WHERE account_id in (SELECT account_id 
                                  FROM Account 
                                  WHERE user_id = ?)`,
            [userId]
        );

        // Account tuple 삭제
        await sql_connection.promise().query(
            `DELETE FROM Account 
             WHERE user_id = ?`,
            [userId]
        );

        // 4. User 정보 삭제
        await sql_connection.promise().query(
            `DELETE FROM User 
             WHERE user_id = ?`,
            [userId]
        );

        // 첫 페이지로 돌아가기
        res.redirect('/');
    } catch (error) {
        console.error("Error deleting user data:", error);
        res.status(500).send("유저 정보 삭제 중 에러가 발생했습니다.");
    }
});
module.exports = router;