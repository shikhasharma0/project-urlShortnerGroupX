const express = require('express');
const router = express.Router();
const urlController = require("../Controller/urlController")


router.post("/url/shorten", urlController.shortenURL)
router.get("/:urlCode", urlController.getURL )

module.exports = router;