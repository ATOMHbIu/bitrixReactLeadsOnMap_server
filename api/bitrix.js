const bitrix =require('../api/rest-api');
const config = require('../config/bitrix.json');
// const url = `https://moscow.neo-service24.ru`;
const moment = require('moment')
const basicAuth = Buffer.from(config.name+':'+config.password).toString('base64');
var mainArr=[];

// console.log(auth);

const actions = {
    getLatest: async()=>{
        let today = moment().format('YYYY-MM-DD')
        let tomorrow = moment(today, "YYYY-MM-DD").subtract(10, 'd').format('YYYY-MM-DD')
        let select = ["ID","TITLE", "UF_CRM_1605016734510","DATE_CREATE"]
        // let filter = {"!UF_CRM_1605016734510":"null"}
        let filter = {">DATE_CREATE": moment().format('YYYY-MM-DDT00:00:00+03:00'), "<DATE_CREATE": moment().format('YYYY-MM-DDT23:59:59+03:00'), "!UF_CRM_1605016734510":"null"}
        let action = `crm.lead.list`
        let filtered;
        let resp;
        const auth = await bitrix.authorize(config.address, config.localKey, config.appkey, basicAuth);
        let info = await bitrix.callMethod(action,{
            order: { "ID": "DESC" },
            select:select,
            filter:filter
        },auth.access_token, config.address)
        .then(async(data)=>{
            let temp = data.json().result;
            filtered = temp.filter((e)=>{
                if(e!=null&&e.UF_CRM_1605016734510){
                    let coords = e.UF_CRM_1605016734510.split('|')[1]
                    if(coords!=undefined){
                        e.UF_CRM_1605016734510 = [coords.split(';')[0],coords.split(';')[1]]
                    }
                    return coords
                }else{
                    return e
                }
            })
        })
        return {
                    date:moment().format('YYYY-MM-DDT00:00:00+03:00'),
                    points:filtered
                }
    },
    getWithFilter: async(data)=>{
        let type = data.type;
        let start = data.startDate;
        let end = data.endDate;
        console.log(type, start, end);
        let select = ["ID","TITLE", "UF_CRM_1605016734510","DATE_CREATE"]
        // let filter = {"!UF_CRM_1605016734510":"null"}
        let filter = {">DATE_CREATE": moment(start).format('YYYY-MM-DDT00:00:00+03:00'), "<DATE_CREATE": moment(end).format('YYYY-MM-DDT23:59:59+03:00'), "!UF_CRM_1605016734510":"null"}
        let action = `crm.`+type+`.list`
        const auth = await bitrix.authorize(config.address, config.localKey, config.appkey, basicAuth);
        let info = await bitrix.callMethod(action,{
            order: { "ID": "DESC" },
            select:select,
            filter:filter
        },auth.access_token, config.address)
        .then(async(data)=>{
            let temp = data.json().result;
            filtered = temp.filter((e)=>{
                if(e!=null&&e.UF_CRM_1605016734510){
                    let coords = e.UF_CRM_1605016734510.split('|')[1]
                    if(coords!=undefined){
                        e.UF_CRM_1605016734510 = [coords.split(';')[0],coords.split(';')[1]]
                    }
                    return coords
                }else{
                    return e
                }
            })
        })
        console.log(filtered.length)
        return {
                    points:filtered
                }
    }
}

module.exports =  actions;