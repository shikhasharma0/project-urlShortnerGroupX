const urlModel = require('../Model/UrlModel');
const redis = require('redis');
const { promisify }  = require('util');

const redisClient = redis.createClient(
    19583,
    "redis-19583.c264.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check : true }
);

redisClient.auth("jNaSKPRAwt9PNonuiu5pKiEAsOJ3moYV", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

const SET_ASYNC = promisify(redisClient.SETEX).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const shortenURL = async function(req,res)
{
    try
    {
        if(Object.keys(req.body).length!=1)

            return res.status(400).send({status : false, message : "Please provide data or provide only one longurl"});

        if(req.body.longUrl==undefined&&typeof(req.body.longUrl)!='string')

            return res.status(400).send({status : false, message : "originalUrl is required and should be  a string."});

        if(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test(req.body.originalURL))
        
            return res.status(400).send({ status: false, message : "The given originalUrl is not valid URL!"});

        const longUrl = req.body.longUrl;

        let cachedUrlData = JSON.parse(await GET_ASYNC(`${longUrl}`));

        if(cachedUrlData)
        {
            return res.status(200).send({status : true, message : "cache hit", data : { longUrl : cachedUrlData.longUrl, shortUrl : cachedUrlData.shortUrl, urlCode : cachedUrlData.urlCode }});
        }

        let urlExists = await urlModel.findOne({longUrl});

        if(urlExists)
        {
            await SET_ASYNC(`${longUrl}`,120,JSON.stringify(urlExists));
            return res.status(200).send({status : true, message : "from db", data : { longUrl : urlExists.longUrl, shortUrl : urlExists.shortUrl, urlCode : urlExists.urlCode }});
        }

        let characters = 'ABCDEFGHIJKLMNOPQRSTUWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        
        let length = 5;
        
        let urlCode = '';
        
        for(let i=0;i<length;++i)

            urlCode+=characters.charAt(Math.floor(Math.random()*characters.length));

        const shortUrl = "http://localhost:3000/"+urlCode;

        const urlData = { longUrl, shortUrl, urlCode };

        await urlModel.create(urlData);

        await SET_ASYNC(`${longUrl}`,120,JSON.stringify(urlData));

        return res.status(201).send({status : true, data : urlData});
            
    }
    catch(error)
    {
        return res.status(500).send({ status : false, message : error.message });   
    }
};

const getURL = async function(req,res)
{
    try
    {
        const urlCode = req.params.urlCode;

        if(!urlCode)

            return res.status(400).send({status : false, message : "Invalid request parameter. Please provide urlCode"});

        if((urlCode.length!=5)&&!(/[^-]\w{5}/.test(urlCode)))

            return res.status(400).send({status : false, message : "The given urlCode is invalid."});
        
        let cachedUrlData = JSON.parse(await GET_ASYNC(`${req.params.urlCode}`));

        if(cachedUrlData)

            return res.redirect(301,cachedUrlData.longUrl);

        const originalURL = await urlModel.findOne({urlCode});

        if(!originalURL)

            return res.status(404).send({status : false, message : "URL not found !"});

        await SET_ASYNC(`${urlCode}`,120,JSON.stringify(originalURL));

        return res.redirect(301,originalURL.longUrl);
    }
    catch(error)
    {
        return res.status(500).send({ status : false, message : error.message });   
    }
};

module.exports={shortenURL,getURL};