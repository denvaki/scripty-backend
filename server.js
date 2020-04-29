const express = require('express');
const app = express();
const mainRouter = express.Router();
const debApi = require('./debianAPI');

const PORT = process.env.PORT || 5999

app.use('/api*', (req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,POST');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    res.append('Content-Type', 'application/json');
    next();
});
app.use('/api', mainRouter);


mainRouter.get('/packageSearch', (req, res) => {
    console.log(req.query.packageName);
    debApi.packageSearch(req.query.packageName).then(json => res.send(json));
    return;
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));