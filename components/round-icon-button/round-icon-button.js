// components/round-icon-button/round-icon-button.js
class RoundIconButton extends HTMLElement {
  static get observedAttributes() {
    return ["icon", "label", "class"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // 引入组件样式
    const linkElem = document.createElement("link");
    linkElem.setAttribute("rel", "stylesheet");
    linkElem.setAttribute(
      "href",
      "components/round-icon-button/round-icon-button.css"
    );
    this.shadowRoot.appendChild(linkElem);

    // 默认图标与标签
    this._icon = `
      <svg viewBox="0 0 24 24">
        <path d="M9 18l6-6-6-6" stroke="white" stroke-width="2" fill="none"/>
      </svg>
    `;
    this._label = "Button";

    // 创建内部按钮元素
    this._buttonElem = document.createElement("button");
    this._buttonElem.classList.add("round-btn");
    this.updateClass();

    this.updateButtonContent();
    this.shadowRoot.appendChild(this._buttonElem);

    // 监听点击，向外派发自定义事件
    this._buttonElem.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("roundButtonClick", {
          detail: { label: this._label },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "icon") {
      this._icon = newValue;
      this.updateButtonContent();
    } else if (name === "label") {
      this._label = newValue;
      this.updateButtonContent();
    } else if (name === "class") {
      this.updateClass();
    }
  }

  updateClass() {
    // 重置内部按钮 class，保留 round-btn
    this._buttonElem.className = "round-btn";
    // 将宿主元素的 class（排除 round-icon-button 本身）复制到内部按钮
    const hostClasses = this.className
      .split(/\s+/)
      .filter((c) => c && c !== "round-icon-button");
    hostClasses.forEach((cls) => {
      this._buttonElem.classList.add(cls);
    });
  }

  updateButtonContent() {
    this._buttonElem.innerHTML = `<div class="icon-slot">${this._icon}</div>`;
    this._buttonElem.setAttribute("title", this._label);
  }

  setIcon(svgString) {
    this._icon = svgString;
    this.updateButtonContent();
  }

  setLabel(text) {
    this._label = text;
    this.updateButtonContent();
  }
}

customElements.define("round-icon-button", RoundIconButton);
