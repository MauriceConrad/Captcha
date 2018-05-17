const express = require('express');
const bodyHandler = require('./body-handler');
const fs = require('fs');
const crypto = require('crypto');

// Require action handlers for API
const apiActionHandlers = {
  create: require('./actions/create'),
  enter: require("./actions/enter"),
  getToken: require('./actions/get-token'),
  deleteToken: require("./actions/delete-token")
};


const {  } = require('./helper');

const __captchaFilePath = __dirname + "/captchas.json";

class Captcha {
  constructor(captchasBase = []) {
    const self = this;


    // Gets all captchas from given argument
    this.allCaptchas = new Promise(function(resolve, reject) {
      // If the given arg is a string, interprete it as a file path and read the file
      if (typeof captchasBase == "string") {
        fs.readFile(captchasBase, "utf8", function(err, contents) {
          if (err) return reject(err);
          resolve(JSON.parse(contents));
        });
      }
      else if (typeof captchasBase == "function") {
        const captchasListProxy = [];
        Object.defineProperty(captchasListProxy, 0, {
          get() {
            return captchasBase();
          }
        });

        resolve(captchasListProxy);
      }
      // Interprete it directly as an object (array)
      else {
        resolve(captchasBase);
      }
    });



    // Create router instance
    this.Router = express.Router();
    // Use body handler for using the streamed data (POST)
    this.Router.use(bodyHandler);
    // Initialize captchas array containing all active captchas
    this.captchas = [];

    this.Router.use((req, res, next) => next());

    // Initialize API endpoints

    // Handle GET request to endpoint /create to create a new captcha using the action handler function required above
    this.Router.get('/create', function() {
      // Pass 'this' and arguments trough the action handler
      apiActionHandlers.create.apply(self, arguments);
    });
    // Handle POST request to endpoint /enter/[captchaId] to enter a captcha solution for a specific one and check its correctness using the action handler function required above
    this.Router.post('/enter/:captchaId', function() {
      // Pass 'this' and arguments trough the action handler
      apiActionHandlers.enter.apply(self, arguments);
    });
    // Handle GET request to endpoint /token/[token] to get a token's correctness using the action handler function required above
    this.Router.route("/token/:token").get(function() {
      // Pass 'this' and arguments trough the action handler
      apiActionHandlers.getToken.apply(self, arguments);
    }).delete(function() {
      // Pass 'this' and arguments trough the action handler
      apiActionHandlers.deleteToken.apply(self, arguments);
    });

  }
  async create() {
    const captcha = await this.getRandom();

    return this.register(captcha);
  }
  enter(captchaId, solution) {
    const captchaRecord = this.captchas.itemByKey(captchaId, "id");
    // If captchaRecord is not a valid object, return undefined
    if (!captchaRecord) {
      return;
    }
    // Delete existing token to prevent it to be sent (Mostly, the token should be deleted after using first time)
    delete captchaRecord.token;
    // If entered captcha text equals to correct solution
    if (JSON.stringify(captchaRecord.solution) === JSON.stringify(solution)) {
      // Generate save 64 byte token
      captchaRecord.token = crypto.randomBytes(16).toString('hex');
    }

    return captchaRecord.token;
  }
  validateToken(token) {
    const captchaRecord = this.captchas.itemByKey(token, "token");

    return !!captchaRecord;
  }
  deleteCaptcha(token) {
    // Try to get a related captcha
    const captchaIndex = this.captchas.indexOfKey(token, "token");
    // Get the existence of a realted captcha
    const captchaExistence = captchaIndex in this.captchas;
    // Delete this captcha
    delete this.captchas[captchaIndex];
    // Resort the captchas array
    this.captchas = this.captchas.filter(captcha => captcha);
    // Return wether a captcha was really deleted (If no one existed, no one was was deleted)
    return captchaExistence;
  }
  async getRandom() {
    // Get all captchas
    const captchas = await this.allCaptchas;
    // Get random item of captchas list
    return captchas[Math.trunc(Math.random() * captchas.length)];
  }
  register(captcha) {
    const newCaptcha = Object.assign(captcha, {
      // Create id from current timestamp
      id: Date.now().toString()
    });
    this.captchas.push(newCaptcha);

    return newCaptcha;
  }
}

module.exports = Captcha;
