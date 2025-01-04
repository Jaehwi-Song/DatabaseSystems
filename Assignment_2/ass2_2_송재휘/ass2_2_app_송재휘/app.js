const setupApp = require('./appConfig');
const app = setupApp();
const userRouter = require('./user');
const accountRouter = require('./account');
const stockRouter = require('./stock');
const transactionRouter = require('./transaction');

app.use('/users', userRouter);
app.use('/account', accountRouter);
app.use('/stock', stockRouter);
app.use('/transactions', transactionRouter);

app.get('/', (req, res) => {
    res.render("app"); // views 폴더에 들어있는 파일명 (.ejs 생략))
});

app.listen(3000, () => {
    console.log("서버 실행 중...");
});