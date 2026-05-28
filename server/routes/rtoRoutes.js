const express = require('express');
const router = express.Router();
const rtoController = require('../controllers/rtoController');

router.get('/', rtoController.getRTO);
router.post('/', rtoController.createRTO);
router.put('/:id', rtoController.updateRTO);
router.delete('/:id', rtoController.deleteRTO);

module.exports = router;
