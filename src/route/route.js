const express = require('express');
const router = express.Router();
const urlController = require("../Controller/urlController")


router.post("/url/shorten", urlController.shortUrl)
router.get("/:urlCode", urlController.getShortUrl)

module.exports = router;