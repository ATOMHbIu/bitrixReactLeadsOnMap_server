const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require('cors');
const bx = require('./api/bitrix')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cors());

app.use('/current',async(req,res)=>{
    let latest = await bx.getLatest()
    res.send(latest);
})

app.use('/getWithFilter', async(req,res)=>{
    let filtered = await bx.getWithFilter(req.body);
    res.send(filtered)
})

app.listen(8911,()=>{
	console.log('Start');
});