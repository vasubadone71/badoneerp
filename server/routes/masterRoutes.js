const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

router.get('/', masterController.getMasterEntries);
router.post('/', masterController.createMasterEntry);
router.put('/:id', masterController.updateMasterEntry);
router.delete('/:id', masterController.deleteMasterEntry);

module.exports = router;
