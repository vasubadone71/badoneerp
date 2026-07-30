const express = require('express');
const router = express.Router();
const { getNumberPlates, updateNumberPlate, getNumberPlateStats } = require('../controllers/numberPlateController');

router.get('/stats', getNumberPlateStats);
router.get('/', getNumberPlates);
router.put('/:id', updateNumberPlate);

module.exports = router;
