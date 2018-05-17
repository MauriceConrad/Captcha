import request from "./xhr.js";

/*
  NOTE
  Generally the whole style for the <captcha-auth> element is declared within its shadow root directly.
  But some general style rules that are used for the <captcha-auth> itself, have to be defined here
*/

export const globalStyleElement = document.createElement("style");
globalStyleElement.innerHTML = `
captcha-auth {
  display: inline-block;
  position: relative;
}
`;
document.head.append(globalStyleElement);






// Export element class that extends the HTMLElement class
export class CaptchaElement extends HTMLElement {
  constructor() {
    super();

    this.init();
  }
  connectedCallback() {

  }
  // Initialize the captcha
  init() {

    this.initShadowDOM();

    this.load();
  }
  initShadowDOM() {
    // Attach the shadow DOM
    this.attachShadow({
      mode: 'open'
    });
    // Create style element that contains all the style rules
    this.shadowRoot.styleSheet = document.createElement("style");
    // Append this style element to the shadow root
    this.shadowRoot.append(this.shadowRoot.styleSheet);
    // Load the currently stylesheet
    this.loadStyleSheet();
    // Create a render container that contains the interaction fields for the user
    this.shadowRoot.renderContainer = document.createElement("div");
    // Give this rendering conatiner a class
    this.shadowRoot.renderContainer.classList.add("render");
    // Append the rendering container on the same level as the style element to the shadow root
    this.shadowRoot.append(this.shadowRoot.renderContainer);
  }
  loadStyleSheet() {
    // Remove all child nodes from style element (clear its contents)
    removeAllChilds(this.shadowRoot.styleSheet);
    // Request for the url that is declared in the data-stylesheet attribute using XHR
    request(this.dataset.stylesheet).then(styleContext => {
      // Style loaded
      // Append the style context as text node to the style element
      this.shadowRoot.styleSheet.append(styleContext);
    });
  }
  get preload() {
    // Return the attribute 'preload' or, if it does not exist by default true
    return this.getAttribute("preload") === "false" ? false : true;
  }
  set preload(preloadEnabled) {
    this.setAttribute("preload", preloadEnabled);
  }
  async load() {
    this.data = await request(this.dataset.api + "/create", {
      responseType: "json"
    });

    this.render();
  }
  render() {
    const self = this;

    // Remove all childs
    removeAllChilds(this.shadowRoot.renderContainer);

    const renderElements = {
      description(descriptionText) {
        const description = document.createElement("span");
        description.classList.add("captcha-description");
        description.append(descriptionText);
        return description;
      },
      message() {
        const message = document.createElement("span");
        message.classList.add("captcha-message");
        return message;
      },
      sendBtn(clickHandler) {
        const sendBtn = document.createElement("button");
        sendBtn.classList.add("btn-send-captcha");
        sendBtn.append("Authentificate");
        sendBtn.addEventListener("click", clickHandler);
        return sendBtn;
      },
      layer() {
        const layer = document.createElement("div");
        layer.classList.add("captcha-layer");
        const successMessage = document.createElement("div");
        successMessage.classList.add("layer-message");
        successMessage.classList.add("message-success");
        successMessage.innerHTML = `
          <div class="icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 48 48" style="enable-background:new 0 0 48 48;" xml:space="preserve" width="100%" height="100%">
            	<path style="fill: #4CAF50;" d="M44,24c0,11.045-8.955,20-20,20S4,35.045,4,24S12.955,4,24,4S44,12.955,44,24z"></path>
            	<path style="fill: #CCFF90;" d="M34.602,14.602L21,28.199l-5.602-5.598l-2.797,2.797L21,33.801l16.398-16.402L34.602,14.602z"></path>
            </svg>
          </div>
          <span class="success-label">Authentificated</span>
        `;
        layer.append(successMessage);
        const spinnerMessage = document.createElement("div");
        spinnerMessage.classList.add("layer-message");
        spinnerMessage.classList.add("message-spinner");
        spinnerMessage.innerHTML = `
        <div class="spinner">
          <div class="double-bounce1"></div>
          <div class="double-bounce2"></div>
        </div>
        `;
        layer.append(spinnerMessage);
        return layer;
      }
    };

    const typeRender = {
      text() {
        const fragment = document.createDocumentFragment();
        const img = document.createElement("img");
        img.classList.add("captcha-image");
        // Set the images's source to data property of captcha's data to display it directly as URL/URI
        img.src = self.data.data;
        fragment.append(img);
        fragment.append(renderElements.description(self.data.description));
        fragment.append(renderElements.message());
        const input = document.createElement("input");
        input.classList.add("captcha-input");
        input.addEventListener("keydown", function(event) {
          if (event.keyCode === 13) sendBtn.click();
        });
        fragment.append(input);
        const sendBtn = renderElements.sendBtn(function() {
          const solution = input.value;
          self.validate(solution);
        });
        fragment.append(sendBtn);

        fragment.append(renderElements.layer());

        return fragment;
      },
      selection() {
        const fragment = document.createDocumentFragment();
        fragment.append(renderElements.description(self.data.description));
        fragment.append(renderElements.message());
        const selectionList = document.createElement("ul");
        selectionList.classList.add("captcha-selection-list");
        for (let dataEntry of self.data.data) {
          const selectItem = document.createElement("li");
          selectItem.classList.add("select-item");
          selectItem.addEventListener("click", function() {
            if (this.classList.contains("selected")) {
              this.classList.remove("selected");
            }
            else {
              this.classList.add("selected");
            }
          });
          const dataImg = document.createElement("img");
          dataImg.classList.add("item-image");
          dataImg.src = dataEntry;
          selectItem.append(dataImg);
          selectionList.append(selectItem);
        }
        fragment.append(selectionList);
        fragment.append(renderElements.sendBtn(function() {
          // Set solution array containing the selected states as boolean values ([true, false, true, false]) using map method on node list of selectable items (Firstly convert the node list to a array literal)
          const solution = Array.apply(null, selectionList.children).map(item => item.classList.contains("selected"));

          self.validate(solution);
        }));

        fragment.append(renderElements.layer());

        return fragment;
      }
    };
    // Check wether the loaded type is supported by a rendering function
    if (this.data.type in typeRender) {
      // Get a fragment of DOM elements that will be rendered
      const renderFragment = typeRender[this.data.type]();

      this.shadowRoot.renderContainer.append(renderFragment);
    }
    // Seems not to be supported, throw an error
    else {
      console.error("Captcha type '" + this.data.type + "' is not supported");
    }
  }
  async validate(solution) {
    this.openLoadScreen();
    const validation = await request(this.dataset.api + "/enter/" + this.data.id, {
      method: "POST",
      responseType: "json",
      body: JSON.stringify({ solution })
    });
    this.closeLoadScreen();
    if (validation.success) {
      this.emitAuth(validation.token);
    }
    else {
      this.emitError();
    }
  }
  emitAuth(token) {
    const authEvent = new CustomEvent("auth", {
      detail: { token }
    });
    this.dispatchEvent(authEvent);
    this.openSuccessScreen();
  }
  emitError() {
    const errEvent = new CustomEvent("err", {
      detail: {
        message: "Invald solution",
        code: 0
      }
    });
    this.dispatchEvent(errEvent);

    this.renderError();
  }
  renderError() {
    const message = this.shadowRoot.querySelector(".captcha-message");
    message.classList.add("show");
    removeAllChilds(message);
    message.append("Incorrect solution!");
    setTimeout(function() {
      message.classList.remove("show");
    }, 2000);
  }
  openLayer() {
    const layer = this.shadowRoot.querySelector(".captcha-layer");
    layer.classList.add("show");
  }
  closeLayer() {
    const layer = this.shadowRoot.querySelector(".captcha-layer");
    layer.classList.remove("show");
  }
  setLayerMessage(className) {
    const message = this.shadowRoot.querySelector(".captcha-layer").getElementsByClassName(className)[0];
    const activeMessage = this.shadowRoot.querySelector(".captcha-layer .active");
    if (activeMessage) {
      activeMessage.classList.remove("active");
    }
    message.classList.add("active");
  }
  openLoadScreen() {
    this.openLayer();
    this.setLayerMessage("message-spinner");
  }
  closeLoadScreen() {
    const layer = this.shadowRoot.querySelector(".captcha-layer");
    const loadMessageLayer = this.shadowRoot.querySelector(".captcha-layer .message-spinner");
    layer.classList.remove("show");
  }
  openSuccessScreen() {
    this.openLayer();
    this.setLayerMessage("message-success");
  }
}
// Register 'captcha-auth' as custom element
customElements.define("captcha-auth", CaptchaElement);



function removeAllChilds(element) {
  while (element.childNodes.length > 0) {
    element.removeChild(element.childNodes[0]);
  }
}
