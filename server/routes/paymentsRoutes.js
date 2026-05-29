const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');

router.post('/dealer', paymentsController.addDealerPayment);
router.delete('/dealer/:id', paymentsController.deleteDealerPayment);

module.exports = router;
