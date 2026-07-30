const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const insuranceRoutes = require('./insuranceRoutes');
const rtoRoutes = require('./rtoRoutes');
const dealersRoutes = require('./dealersRoutes');
const ledgersRoutes = require('./ledgersRoutes');
const reportsRoutes = require('./reportsRoutes');
const paymentsRoutes = require('./paymentsRoutes');
const masterRoutes = require('./masterRoutes');
const uploadRoutes = require('./uploadRoutes');
const settingsRoutes = require('./settingsRoutes');
const backupRoutes = require('./backupRoutes');
const numberPlateRoutes = require('./numberPlateRoutes');
const { verifyToken } = require('../middleware/authMiddleware');

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

// Protect all routes below with JWT
router.use(verifyToken);
router.use('/dashboard', dashboardRoutes);
router.use('/master', masterRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/rto', rtoRoutes);
router.use('/dealers', dealersRoutes);
router.use('/ledgers', ledgersRoutes);
router.use('/reports', reportsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/upload', uploadRoutes);
router.use('/settings', settingsRoutes);
router.use('/backup', backupRoutes);
router.use('/number-plates', numberPlateRoutes);

module.exports = router;
