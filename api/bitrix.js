const bitrix =require('../api/rest-api');
const config = require('../config/bitrix.json');
// const url = `https://moscow.neo-service24.ru`;
const moment = require('moment')
const basicAuth = Buffer.from(config.name+':'+config.password).toString('base64');
var buffer=[]

const actions = {
    getWithFilter: async(data)=>{
        let type = data.type;
        let start = data.startDate;
        let end = data.endDate;
        let filtered;
        let addressField = type==='lead'?'UF_CRM_1605016734510':'UF_CRM_5F9A69533CBC6'
        let addressFilter = '!'+[addressField]
        let select = ["ID","TITLE", addressField,"DATE_CREATE"]
        let filter = {">DATE_CREATE": moment(start).format('YYYY-MM-DDT00:00:00+03:00'), "<DATE_CREATE": moment(end).format('YYYY-MM-DDT23:59:59+03:00'), [addressFilter]:"null"}
        let action = `crm.`+type+`.list`
        const auth = await bitrix.authorize(config.address, config.localKey, config.appkey, basicAuth);
        let info = await bitrix.callMethod(action,{
            order: { "ID": "DESC" },
            select:select,
            filter:filter
        },auth.access_token, config.address)
        .then(async(data)=>{
            let temp = data.json().result;
            if (data.next()){
                buffer.push(...temp)
                await offsetCall(action,select,filter,auth.access_token, config.address,data.next())
                filtered = buffer.filter((e)=>{
                    if(e!=null&&e[addressField]){
                        let coords = e[addressField].split('|')[1]
                        if(coords!=undefined){
                            e.coords = [coords.split(';')[0],coords.split(';')[1]]
                        }
                        return coords
                    }else{
                        return e
                    }
                })
                buffer =[];
            }else{
                filtered = temp.filter((e)=>{
                    if(e!=null&&e[addressField]){
                        let coords = e[addressField].split('|')[1]
                        if(coords!=undefined){
                            e.coords = [coords.split(';')[0],coords.split(';')[1]]
                        }
                        return coords
                    }else{
                        return e
                    }
                })
            }
        })
        return {
                    points:filtered
                }
    }
}

async function offsetCall(action,select,filter,access, url,next){
    let info = await bitrix.callMethod(action,{
        start:next,
        order: { "ID": "DESC" },
        select:select,
        filter:filter
    },access, url)
    .then(async(data)=>{
        let temp = data.json().result;
        buffer=[...buffer, ...temp];
        if(data.next()){
            await offsetCall(action,select,filter,access,url,data.next())
        }
    })
}

module.exports =  actions;