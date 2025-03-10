// components/card-header/choice-header/choice-header.js

class ChoiceHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // 加载 CSS
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.setAttribute("rel", "stylesheet");
      linkElem.setAttribute(
        "href",
        "components/card-header/choice-header/choice-header.css"
      );
      this.shadowRoot.appendChild(linkElem);
    }

    this._container = document.createElement("div");
    this._container.className = "choice-header-container";
    this.shadowRoot.appendChild(this._container);

    // 内部状态
    this.questionType = "";
    this.questionText = "";
    this.choices = [];
    this.correctIndex = 0;
    this.word = "";
    this._selected = false;
  }

  /**
   * setData({
   *   questionType: string,
   *   questionText: string,
   *   choices: string[], // 2~4
   *   correctIndex: number, // 0~3
   *   word: string
   * })
   */
  setData(data) {
    if (!data) return;

    this.questionType = data.questionType || "word-chinese";
    this.questionText = data.questionText || "";
    this.choices = Array.isArray(data.choices) ? data.choices : [];
    this.correctIndex =
      typeof data.correctIndex === "number" ? data.correctIndex : 0;
    this.word = data.word || "";
    this._selected = false;

    this.render();
  }

  render() {
    // 构建题干
    let html = `<div class="choice-question">${this.questionText}</div>`;
    // 构建选项
    html += `<div class="options-container">`;
    this.choices.forEach((opt, i) => {
      html += `<div class="option" data-idx="${i}">${opt}</div>`;
    });
    html += `</div>`;

    this._container.innerHTML = html;

    // 绑定点击
    const optionEls = Array.from(this._container.querySelectorAll(".option"));
    optionEls.forEach((el) => {
      el.addEventListener("click", (e) => this._handleOptionClick(e));
    });
  }

  _handleOptionClick(e) {
    if (this._selected) return;
    this._selected = true;

    const chosenEl = e.currentTarget;
    const idx = parseInt(chosenEl.dataset.idx, 10);
    const optionEls = Array.from(this.shadowRoot.querySelectorAll(".option"));

    if (idx === this.correctIndex) {
      chosenEl.classList.add("correct");
    } else {
      chosenEl.classList.add("incorrect");
      // 正确选项
      if (this.correctIndex < optionEls.length) {
        optionEls[this.correctIndex].classList.add("correct");
      }
    }

    // 禁止再次点击
    optionEls.forEach((o) => {
      o.style.pointerEvents = "none";
    });
  }
}

customElements.define("choice-header", ChoiceHeader);
