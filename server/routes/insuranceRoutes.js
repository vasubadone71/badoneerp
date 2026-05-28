const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');

router.get('/', insuranceController.getInsurance);
router.post('/', insuranceController.createInsurance);
router.put('/:id', insuranceController.updateInsurance);
router.delete('/:id', insuranceController.deleteInsurance);

module.exports = router;
