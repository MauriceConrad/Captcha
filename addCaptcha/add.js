const ArgumentParser = require('argparse').ArgumentParser;
const fs = require('fs');
const path = require('path');

var parser = new ArgumentParser({
  addHelp: true,
  description: 'Add captcha'
});

parser.addArgument(['-d', '--data'], {
  help: 'Source file(s) of image(s) you want to use as data. If multiple, seperate them using comma'
});
parser.addArgument([ '-t', '--type' ], {
  help: 'Type of captcha. Can be "text" or "selection"'
});
parser.addArgument(['-dp', '--description'], {
  help: 'Description of the captcha that explains the usage to the user'
});
parser.addArgument(['-s', '--solution'], {
  help: 'Solution of the captcha. In case of "text" captcha, this is also just a text. In case of "solution" captcha, this is a list like "true,false,true"'
});
parser.addArgument(['-o', '--output'], {
  help: 'Output file the captcha should be added to'
});

var args = parser.parseArgs();

const captcha = Object.assign({}, args);
delete captcha.output;

function toDataURI(filepath) {
  return new Promise(function(resolve, reject) {
    const extension = path.extname(filepath).substring(1);
    // Get data type by extension
    const dataType = {
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png"
    }[extension];

    fs.readFile(filepath, function(err, contents) {
      if (err) reject(err);
      const base64Str = contents.toString("base64");
      const dataURI = 'data:' + dataType + ';base64,' + base64Str;
      resolve(dataURI);
    });
  });
}

const typeHandlers = {
  async text() {
    captcha.data = await toDataURI(captcha.data);
    // Return the property directly as promise
    return captcha.data;
  },
  async selection() {
    // Convert the solution "true,false,true" text to a real array
    captcha.solution = captcha.solution.split(",").map(activeState => activeState == "true");

    // Replace the data property with an array of filepaths splitted by "," and directly replaced by a promise that converts it directly to a data URI
    captcha.data = captcha.data.split(",").map(async filePath => await toDataURI(filePath));
    // Return a general promise that waits for all images to be resolved
    await Promise.all(captcha.data);
    for (var i = 0; i < captcha.data.length; i++) {
      captcha.data[i] = await captcha.data[i];
    }
    return;
  }
};
typeHandlers[captcha.type]().then(function() {
  fs.readFile(args.output, "utf8", function(err, contents) {
    if (err) console.error(err);
    const data = JSON.parse(contents);
    data.push(captcha);
    fs.writeFile(args.output, JSON.stringify(data, null, 2), function(err) {
      if (err) return console.error(err);
    });
  })
});
