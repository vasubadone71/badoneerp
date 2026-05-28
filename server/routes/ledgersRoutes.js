const express = require('express');
const router = express.Router();
const ledgersController = require('../controllers/ledgersController');

router.get('/dealers', ledgersController.getDealerLedgers);
router.get('/transactions', ledgersController.getDealerTransactions);
router.get('/commissions', ledgersController.getCommissions);

module.exports = router;
