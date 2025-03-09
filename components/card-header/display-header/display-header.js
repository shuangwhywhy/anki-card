// components/card-header/display-header/display-header.js
class DisplayHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // 加载样式（仅加载一次）
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.setAttribute("rel", "stylesheet");
      linkElem.setAttribute(
        "href",
        "components/card-header/display-header/display-header.css"
      );
      this.shadowRoot.appendChild(linkElem);
    }

    // 创建内部容器
    this._container = document.createElement("div");
    this._container.classList.add("display-header-container");
    this.shadowRoot.appendChild(this._container);

    // 数据
    this.word = "";
    // 初始字号（单位px），将通过自动缩放调整
    this._fontSize = 32;

    this.render();
  }

  /**
   * setData({ word, ... })
   */
  setData(data) {
    if (!data || !data.word) return;
    this.word = data.word;
    this.render();
    // 在渲染后自动适应宽度
    requestAnimationFrame(() => this._fitToWidth());
  }

  /**
   * 自动适应宽度: 根据容器宽度逐步降低字号，确保单词在一行内完整显示
   */
  _fitToWidth() {
    const container = this._container;
    if (!container) return;
    const minFontSize = 14;
    // 当内容宽度超出容器宽度时，递减字号
    while (
      container.scrollWidth > container.offsetWidth &&
      this._fontSize > minFontSize
    ) {
      this._fontSize--;
      container.style.fontSize = `${this._fontSize}px`;
    }
  }

  getTemplate() {
    return `
      <div class="display-word" style="font-size:${this._fontSize}px;">
        ${this.word}
      </div>
    `;
  }

  render() {
    this._container.innerHTML = this.getTemplate();
    // 适应宽度
    this._fitToWidth();
  }
}

customElements.define("display-header", DisplayHeader);
