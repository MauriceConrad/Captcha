module.exports = function(req, res) {
  const deleteSuccess = this.deleteCaptcha(req.params.token);

  res.json(deleteSuccess);
};
