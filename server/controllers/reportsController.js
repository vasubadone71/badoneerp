const getReports = async (req, res) => {
  res.status(200).json({ message: 'Get reports placeholder' });
};

const generateReport = async (req, res) => {
  res.status(201).json({ message: 'Generate report placeholder' });
};

module.exports = { getReports, generateReport };
