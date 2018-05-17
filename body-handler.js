module.exports = function BodyHandler(req, res, next) {
  const bodyChunks = [];
  req.on("data", function(chunk) {
    bodyChunks.push(chunk);
  });
  req.on("end", function() {
    req.body = Buffer.concat(bodyChunks);
    next();
  });
};
