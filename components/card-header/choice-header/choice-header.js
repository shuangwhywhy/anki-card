// components/card-header/choice-header/choice-header.js
class ChoiceHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // 加载 CSS（仅加载一次）
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute(
        "href",
        "components/card-header/choice-header/choice-header.css"
      );
      this.shadowRoot.appendChild(link);
    }
    // 创建容器（仅创建一次，后续仅更新内容）
    this._container = document.createElement("div");
    this._container.className = "choice-header-container";
    this.shadowRoot.appendChild(this._container);
    // 内部状态
    this._data = null;
    this._selected = false;
    this._shuffledOptions = [];
  }

  /**
   * setData 参数格式：
   * {
   *   word: string,                    // 单词
   *   chineseDefinition: string,       // 中文释义（仅用于 "word-chinese"）
   *   englishDefinition: string,       // 英文释义（仅用于 "word-english"）
   *   correctSynonym: string,          // 正确同义词（仅用于 "synonym"）
   *   correctAntonym: string,          // 正确反义词（仅用于 "antonym"）
   *   sentence: string,                // 带空缺的句子（仅用于 "sentence"）
   *   correctWord: string,             // 例句中正确的单词（仅用于 "sentence"）
   *   distractors: string[]            // 干扰项数组（至少3个，所有选择题模式均需要）
   * }
   */
  setData(data) {
    if (
      !data ||
      !data.word ||
      !data.distractors ||
      !Array.isArray(data.distractors) ||
      data.distractors.length < 3
    ) {
      console.error("ChoiceHeader: 数据格式不正确");
      return;
    }
    const type = this.getAttribute("choice-type") || "word-chinese";
    // 根据题型校验必需字段
    if (type === "word-chinese" && !data.chineseDefinition) {
      console.error(
        "ChoiceHeader: choice-type 为 word-chinese 时，必须提供 chineseDefinition"
      );
      return;
    }
    if (type === "word-english" && !data.englishDefinition) {
      console.error(
        "ChoiceHeader: choice-type 为 word-english 时，必须提供 englishDefinition"
      );
      return;
    }
    if (type === "chinese-to-word" && !data.chineseDefinition) {
      console.error(
        "ChoiceHeader: choice-type 为 chinese-to-word 时，必须提供 chineseDefinition"
      );
      return;
    }
    if (type === "english-to-word" && !data.englishDefinition) {
      console.error(
        "ChoiceHeader: choice-type 为 english-to-word 时，必须提供 englishDefinition"
      );
      return;
    }
    if (type === "synonym" && !data.correctSynonym) {
      console.error(
        "ChoiceHeader: choice-type 为 synonym 时，必须提供 correctSynonym"
      );
      return;
    }
    if (type === "antonym" && !data.correctAntonym) {
      console.error(
        "ChoiceHeader: choice-type 为 antonym 时，必须提供 correctAntonym"
      );
      return;
    }
    if (type === "sentence" && (!data.sentence || !data.correctWord)) {
      console.error(
        "ChoiceHeader: choice-type 为 sentence 时，必须提供 sentence 和 correctWord"
      );
      return;
    }
    this._data = data;
    this._selected = false;
    this.render();
  }

  render() {
    if (!this._data) return;
    const type = this.getAttribute("choice-type") || "word-chinese";
    let questionText = "";
    let correct = "";
    // 根据题型决定 questionText 与 correct 答案
    switch (type) {
      case "word-chinese":
        questionText = this._data.word;
        correct = this._data.chineseDefinition;
        break;
      case "word-english":
        questionText = this._data.word;
        correct = this._data.englishDefinition;
        break;
      case "chinese-to-word":
        questionText = this._data.chineseDefinition;
        correct = this._data.word;
        break;
      case "english-to-word":
        questionText = this._data.englishDefinition;
        correct = this._data.word;
        break;
      case "synonym":
        questionText = this._data.word;
        correct = this._data.correctSynonym;
        break;
      case "antonym":
        questionText = this._data.word;
        correct = this._data.correctAntonym;
        break;
      case "sentence":
        questionText = this._data.sentence;
        correct = this._data.correctWord;
        break;
      default:
        questionText = this._data.word;
        correct = this._data.chineseDefinition;
    }
    // 合并正确答案与干扰项，确保总共 4 个选项
    const distractors = this._data.distractors.slice(0, 3);
    let options = [correct, ...distractors];
    options = this._shuffle(options);
    this._shuffledOptions = options; // 保存当前选项顺序

    // 构建组件 HTML，不重新更新 CSS 节点，避免过度渲染
    const html = `
      <div class="word-display">${questionText}</div>
      <div class="options-container">
        ${options
          .map(
            (optionText) =>
              `<div class="option" data-option="${optionText}">${optionText}</div>`
          )
          .join("")}
      </div>
    `;
    this._container.innerHTML = html;
    // 为所有选项绑定点击事件（注意仅绑定内容区域内元素，不重复绑定外部已加载样式等）
    const optionEls = Array.from(this._container.querySelectorAll(".option"));
    optionEls.forEach((optionEl) => {
      optionEl.addEventListener("click", (e) => this._handleOptionClick(e));
    });
  }

  _handleOptionClick(e) {
    if (this._selected) return;
    this._selected = true;
    const chosenEl = e.currentTarget;
    const chosenText = chosenEl.dataset.option;
    const type = this.getAttribute("choice-type") || "word-chinese";
    let correct = "";
    switch (type) {
      case "word-chinese":
        correct = this._data.chineseDefinition;
        break;
      case "word-english":
        correct = this._data.englishDefinition;
        break;
      case "chinese-to-word":
        correct = this._data.word;
        break;
      case "english-to-word":
        correct = this._data.word;
        break;
      case "synonym":
        correct = this._data.correctSynonym;
        break;
      case "antonym":
        correct = this._data.correctAntonym;
        break;
      case "sentence":
        correct = this._data.correctWord;
        break;
      default:
        correct = this._data.chineseDefinition;
    }
    const optionEls = Array.from(this.shadowRoot.querySelectorAll(".option"));
    if (chosenText === correct) {
      chosenEl.classList.add("correct");
    } else {
      chosenEl.classList.add("incorrect");
      optionEls.forEach((opt) => {
        if (opt.dataset.option === correct) {
          opt.classList.add("correct");
        }
      });
    }
    optionEls.forEach((opt) => {
      opt.style.pointerEvents = "none";
    });
  }

  _shuffle(arr) {
    const array = arr.slice();
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

customElements.define("choice-header", ChoiceHeader);
