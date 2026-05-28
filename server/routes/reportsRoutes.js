const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/', reportsController.getReports);
router.post('/', reportsController.generateReport);

module.exports = router;
