const crypto = require('crypto');

module.exports = function(req, res, next) {

  var solution;
  try {
    const reqData = JSON.parse(req.body.toString());
    solution = reqData.solution;
  }
  catch (err) {
    //console.error(err);
  }

  const token = this.enter(req.params.captchaId, solution);

  res.json({
    success: !!token,
    token: token
  });



  next();
};
