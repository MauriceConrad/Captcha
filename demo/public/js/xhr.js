export default function Request(url, options = {}) {
  return new Promise(function(resolve, reject) {
    options = Object.assign({
      method: "GET",
      headers: {},
      body: "",
      responseType: undefined
    }, options);
    const xhr = new XMLHttpRequest();
    xhr.responseType = options.responseType;
    xhr.open(options.method, url, true);
    xhr.addEventListener("load", function() {
      resolve(this.response);
    });
    xhr.send(options.body);
  });
}
