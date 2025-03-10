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
    // 生成说明文字
    const explanation = this._getExplanation();

    // 构建题干与说明文字
    let html = `<div class="choice-question">${this.questionText}</div>`;
    html += `<div class="choice-explanation">${explanation}</div>`;
    // 构建选项区域
    html += `<div class="options-container">`;
    this.choices.forEach((opt, i) => {
      html += `<div class="option" data-idx="${i}">${opt}</div>`;
    });
    html += `</div>`;

    this._container.innerHTML = html;

    // 绑定点击事件
    const optionEls = Array.from(this._container.querySelectorAll(".option"));
    optionEls.forEach((el) => {
      el.addEventListener("click", (e) => this._handleOptionClick(e));
    });
  }

  _getExplanation() {
    // 根据当前题型返回说明文字及高亮部分
    let text = "";
    let highlight = "";
    switch (this.questionType) {
      case "word-chinese":
        text = "Please choose the correct ";
        highlight = "Chinese definition";
        break;
      case "word-english":
        text = "Please choose the correct ";
        highlight = "English definition";
        break;
      case "chinese-to-word":
        text = "Please choose the correct word for the ";
        highlight = "Chinese definition";
        break;
      case "english-to-word":
        text = "Please choose the correct word for the ";
        highlight = "English definition";
        break;
      case "synonym":
        text = "Please choose the correct ";
        highlight = "synonym";
        break;
      case "antonym":
        text = "Please choose the correct ";
        highlight = "antonym";
        break;
      case "sentence":
        text = "Please choose the correct word to complete the ";
        highlight = "sentence";
        break;
      default:
        text = "Please choose the correct answer.";
        highlight = "";
    }
    if (highlight) {
      return `${text}<span class="highlight">${highlight}</span>.`;
    }
    return text;
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
