const express = require('express');
const router = express.Router();
const dealersController = require('../controllers/dealersController');

router.get('/', dealersController.getDealers);
router.post('/', dealersController.createDealer);
router.put('/:id', dealersController.updateDealer);
router.delete('/:id', dealersController.deleteDealer);

module.exports = router;
