# Captcha API

* Server side express middleware for creating and handling captcha authentication
* Client side API for handling captchas using a `<captcha-auth>` (custom) element

[Live Demo](https://dev.maurice-conrad.eu/captcha-demo/)

# How it works

1. Client creates captcha from **our** API with an unique id
2. Client sends capture text to **our** API:
  - Incorrect:
    1. Client gets an error
  - Correct:
    1. Client gets a token
    2. Client sends the token to **your** API when performing an action
    3. **Your** API sends the token back to **our** API and checks its correctness:
      - Incorrect:
         1. **Our** API gives back `false`
         2. **Your** API should not to preform the requested action
      - Correct:
         1. **Our** API gives back `true`
         2. **Your** API should perform the requested action
         3. **Your** API performs a `DELETE` request to **our** API for the captcha to prevent re-using the old token (Now, the captcha cannot be used again)

## Basics

This is the way your API **should** work, otherwise the protection is completely useless. The only reason why a token does not gets deleted automatically after validating it, is that you can scale your API usage much more individually. If your API performed everything, you **should** *delete* the used captcha. How to, is described below.

### Different Captcha Types

This API supports **two** types of captcha.
1. Text based. The user has to type in a text you see on a picture
2. Selection. The user has to select a specific kind of images


# Middleware (Server Side)

```javascript
const Captcha = require('captchajs');
// In this case, the captcha's dataset is just a file containing static captchas
const myCaptchasDataset = "myCaptchasSource.json";

const myCaptcha = new Captcha(myCaptchasDataset);
yourExpressApp.use("/captcha", myCaptcha.Router);

```

## Captchas Dataset

The captchas database can be a static JSON file containing an array that contains each captchas you want to use.
But you also could use a generator function that returns a completely random list of possible captchas.

## Captchas from Generator Function

As explained, you can also generate the captchas passing a function that returns a new captcha object.

```javascript
const myCaptcha = new Captcha(async function() {
  // Example
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
yourExpressApp.use("/captcha", myCaptcha.Router);
```


## Important

**Please note** that the API you want to protect and the server that handles the captchas do not have to be equal! The middleware for handling captchas can completely be used from *outside* using the API.

### Easy Way

To **create** and **enter** captchas in a very easy way, use the [Client API](#client-api) that is represented by the file `/captcha.client.js`. When using this feature, you do not have to care about `/create` and `/enter` or about handling the different types of captchas. You just create a `<captcha-auth>` element and listen to some events.


## Example

Just have a look at the sample app at `/demo`. Just call the `/demo` folder with `node` and a example server starts at port **8080**.
The client side of the `/demo` can be found within at `/demo/public`.

Or just open the [Live Demo](https://dev.maurice-conrad.eu/captcha-demo/)

# HTTP API

All the endpoints used here are relative to the endpoint of the captcha API. This dependents which endpoints you use for the express middleware. (`/captcha` in the example above).

Please also note that the API usage of **creating** or **validating** a captcha can be replaced by using the **Client API** that does this stuff automatically.

## Create a Captcha

To create a **random** capture with an unique id, the client has to perform a `GET` request to `/create`

#### Endpoint

```http
GET /create
```

#### Response

Please note that the response dependents from the `type` of captcha you are getting. See more below.

##### Text Captcha

```json
{
  "type": "text",
  "description": "Enter the text above",
  "data": "URLToSource",
  "id": "1525800405919"
}
```

##### Selection Captcha

```json
{
  "type": "selection",
  "description": "Select all pictures with cars",
  "data": [
    "URLToPicture1"
  ],
  "id": "1525800405919"
}
```

The `type` property can be `text` or `selection` which describes wether you have a text based or selectable captcha.
The `description` property is a simple text that explains the way the user should use the captcha.
The `data` property contains the captcha's data.
If it is a `text` captcha, `data` contains directly an URL that points to the image the user has to interpret.
If it is a `selection` captcha, `data` contains an array containing each image's URL.
Such an URL can be a normal URL or a data URI.

The `id` is an unique id that represents this capture in the API.

## Enter a Captcha

To enter a *solution* for a captcha, the client has to preform a `POST` request to `/enter/1525800405919`
Of course, `1525800405919` is just an example and should be replaced by the `id` of your captcha.

#### Endpoint

```http
POST /enter/[captchaId]
```

#### Body

##### Text Captcha

```json
{
  "solution": "V4XBG"
}
```

##### Selection Captcha

```json
{
  "solution": [false, true, false, true, false]
}
```

As you see, the way of validating a *solution* for each type of captcha is different. When validating a `text` captcha, just use the typed text as string in `solution`. But when validating a `selection` captcha, you have to pass each images's selection state (`true` | `false`) using an array.

#### Response

```json
{
  "success": true,
  "token": "5a9a5e88070106c8a491f8b49dce1b72"
}
```
(Of course, The `token` above is just an example).

Of course, `success` is `false` if the given `solution` is incorrect. In this case, there is also no `token`!

## Validate Token

To validate a token, **your** API has to perform a `GET` request to `/token/5a9a5e88070106c8a491f8b49dce1b72`

#### Endpoint

```http
GET /token/[token]
```

#### Response

```json
{
  "access": true
}
```

Of course, `access` is `false` if the given token is not valid.

## Delete Captcha

If **your** API thinks, a captcha should not be used any more, you shall perform a `DELETE` request to the associated token (e.g. `/token/5a9a5e88070106c8a491f8b49dce1b72`) that deletes the whole captcha entry in this API.

It may confuses you why we `DELETE` captchas using their related `token`? This is because the `DELETE` action normally will be performed by the API that is protected by the captcha to prevent re-using the same token. And this API normally does not **know** the `id` of a captcha but only a given `token` from the client. Therefore this API just uses the token to delete the related captcha.

#### Endpoint

```http
DELETE /token/[token]
```

#### Response

```json
true
```
`true` *means that the deleting process was successfully. If the request token does not exist (anymore), the request will response with* `false`. *This information is not very necessary, I know.*

**After performing this, the related captcha cannot be used anymore.**

# Internal API

If the captcha handler (middleware) you are using runs on the same server, the API you want to protect with captcha runs, you theoretically could use the internal JS API methods provided by your captcha instance (e.g. `myCaptcha`). So, this may is some milliseconds faster than requesting your endpoints internally at `localhost` or you just want cleaner code. Therefore, all methods provided by the captcha API can be used directly on your captcha instance.

Please make sure that I will always use `myCaptcha` as sample for your captcha instance. Your captcha instance is just the instance you get from `new Captcha()`;

## Create a Captcha

This is mostly useless because creating a captcha is mostly something that happens on client side.

```javascript
// Await for the promise to be rejected (A promise because the captcha source file is loaded asynchronously. Normally this doe snot need any time)
const captchaObj = await myCaptcha.create();
// Returns the captcha including its 'data' and 'id'
```

## Enter a Captcha

This is *very* useless because a solution normally will be entered by the client.

```javascript
// Enter a solution for a captcha using its id
const token = myCaptcha.enter(captchaId, solution);
// If the solution was incorrect, this returns undefined
```

## Validate Token

```javascript
// Validate a given token
const access = myCaptcha.validateToken(token);
// Returns wether the given token is valid or not
```

## Delete Captcha

```javascript
// Delete a captcha by its token
const deletionSuccess = myCaptcha.deleteToken(token);
// Returns wether the deletion was successfully
```

# Client API

Using this API, you do not have to care about `/create` and `/enter` and the different types of captchas. You just create a `<captcha-auth>` element and listen to some events.

```javascript
// Import the whole name space object
import * as Captcha from "./captcha.client.js"
// Or just import the script anonymously
import "./captcha.client.js"
```

If you import the whole module name scape object, you have direct access to some methods and the `CaptchaElement` class but you don't need this normally.

Using a captcha element:

```html
<!-- data-api refers to the api endpoint that is used for captcha request here -->
<!-- This should be any possible url that refers to a endpoint which routes to the captcha express middleware-->

<captcha-auth data-api="/captcha" data-stylesheet="default-stylesheet.css"></captcha-auth>

<!-- data-stylesheet refers to the stylesheet that will be used to render the captcha -->
<!-- By default, this should be the stylesheet -->
```


```javascript
// Get the <captcha-auth> element we've created above
const captchaElement = document.querySelector("captcha-auth");
// Listen for 'auth' event that will be fired when the user typed in a correct solution
captchaElement.addEventListener("auth", function(event) {
  // Here is our token!
  console.log(event.detail.token);
});
```

As you see, using this API is much easier than handling the `/create` or `/enter` request on your own with different types of captchas.

When your client has the `token`, the `token` should be sent to **your** API endpoint that is protected by the captcha.
**Your** API endpoint should **validate** the token at the original captcha endpoint your client also uses (endpoint of the middleware).
If this API returns `true`, your user is identified.

## Demo

Because you may want to test the client API without setting up your own node server (which is needed to use the middleware), you can test the API at the captcha endpoint `https://dev.maurice-conrad.eu/captcha-demo/captcha`. Just test `/create`, `/enter` etc. relative to this endpoint.

## Captcha Dataset

In the `/demo` folder exist a very small `captchas.json` dataset for captchas.
