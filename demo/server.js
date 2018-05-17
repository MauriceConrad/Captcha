const express = require('express');
// Requireing captcha middleware
const Captcha = require('server-captcha');
// Create express app
const app = express();
// Use the captcha middle ware with static source for captchas
//var captchaHandler = new Captcha(__dirname + "/captchas.json");
// Use a dynamic generator
var captchaHandler = new Captcha(async function() {
  // Require captcha generator
  const CaptchaGenerator = require('node-captcha-generator');
  // Create captcha instance
  var currCaptcha = new CaptchaGenerator({
    length: 4,
    size: {
      width: 250,
      height: 90
    }
  });
  // Get the base64 string asynchronously wrapped into a promise
  const base64Str = await (new Promise(function(resolve, reject) {
    // Resolve the promise in callback
    currCaptcha.toBase64((err, base64Str) => resolve(base64Str));
  }));
  // Return captcha object
  return {
    type: "text",
    description: "Enter the text",
    data: base64Str,
    solution: currCaptcha.value
  };
});
// Use your captcha handler's internal Router with your express app
app.use('/captcha', captchaHandler.Router);

const url = require('url');

// Sample API Endpoint that requires captcha authentification
app.get("/api", function(req, res) {
  const reqUrl = url.parse(req.url, true);
  // Check wether the token is valid
  if (captchaHandler.validateToken(reqUrl.query.token)) {
    res.send("Hello World!");
    // Delete captcha by token to avoid re using this token
    captchaHandler.deleteCaptcha(reqUrl.query.token);
  }
  res.end("You are not authentificated!");
});
// Use express static router to serve example page that uses the sample API above
app.use(express.static(__dirname + '/public'));



app.listen(65104, function() {
  console.log("Listening example server at port 8080");
});
