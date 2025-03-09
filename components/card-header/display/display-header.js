// components/card-header/display/display-header.js
class DisplayHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // 默认数据，供测试使用；实际数据由 setData() 更新
    this._data = {
      word: "EXAMPLE",
      options: ["Option A", "Option B", "Option C", "Option D"],
    };
    this.render();
  }

  setData(data) {
    this._data = Object.assign({}, data);
    this.render();
  }

  getTemplate() {
    return `
      <link rel="stylesheet" href="components/card-header/display/display-header.css">
      <div class="header-container">
        <div class="word-section">${this._data.word || ""}</div>
        <div class="options-section">
          ${(this._data.options || [])
            .map(
              (opt, idx) =>
                `<div class="option" data-index="${idx}">${opt}</div>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  render() {
    this.shadowRoot.innerHTML = this.getTemplate();
    this.bindEvents();
  }

  bindEvents() {
    const optionElems = this.shadowRoot.querySelectorAll(".option");
    optionElems.forEach((el) => {
      el.addEventListener("click", (e) => {
        this.dispatchEvent(
          new CustomEvent("optionSelected", {
            detail: { index: e.target.getAttribute("data-index") },
            bubbles: true,
            composed: true,
          })
        );
      });
    });
  }
}

customElements.define("display-header", DisplayHeader);
