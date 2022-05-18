const urlModel = require("../Model/UrlModel");
const redis = require("redis");
const { promisify } = require("util");

const validUrl = require('valid-url')
const shortid = require('shortid')
const baseUrl = 'http://localhost:3000'

const isValid = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
};
const isValidRequestBody = function (body) {
    return Object.keys(body).length > 0;
};

const redisClient = redis.createClient(
    14691,
    "redis-14691.c264.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("aQ2JSiqcecabkUCFLqvlELCQnfNZu6m4", function (err) {
    if (err) throw err;
});
redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});


const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const shortUrl = async function (req, res) {
    try {
        if (!isValidRequestBody(req.body)) {
            return res.status(400).send({ status: false, message: "Please provide details" })
        }
        let { longUrl } = req.body
        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: "Please provide longUrl" })
        }
        if (!validUrl.isUri(longUrl)) {
            return res.status(400).send('Invalid base URL')
        }
        let check = await urlModel.findOne({ longUrl: longUrl })
        if (check) {
            return res.status(409).send({ status: false, message: "already exist" })
        }
        const urlCode = shortid.generate(longUrl)
        let url = await urlModel.findOne({ urlCode: urlCode })
        if (url) {
            return res.status(409).send({ status: false, message: "already exist" })
        }
        const shortUrl = baseUrl + '/' + urlCode
        const newUrl = { longUrl, shortUrl, urlCode }
        const short = await urlModel.create(newUrl)
        return res.status(201).send({ status: true, data: short })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }

}

const getShortUrl = async function (req, res) {
    try {
        let cahcedUrleData = await GET_ASYNC(`${req.params.urlCode}`)
        if (cahcedUrleData) { return res.status(302).redirect(cahcedUrleData.longUrl) }
        let urlCode = req.params.urlCode
        let url = await urlModel.findOne({ urlCode: urlCode })
        console.log(url)
        if (url) {
            return res.status(302).redirect(url.longUrl)
        }
        return res.status(404).send({ status: false, message: "url not found" })
        await SET_ASYNC(`${req.params.urlCode}`, JSON.stringify(url),)
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = { shortUrl, getShortUrl }