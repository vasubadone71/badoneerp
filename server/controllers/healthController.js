const checkHealth = (req, res) => {
  res.status(200).send('SERVER RUNNING');
};

module.exports = { checkHealth };
