module.exports = function(req, res) {
  const access = this.validateToken(req.params.token);

  res.json({ access });
};
