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
    // 保存完整题目数据，包括完整单词结构（vocab）和其他题目信息
    this._questionData = null;
  }

  /**
   * setData({
   *   questionType: string,
   *   questionText: string,
   *   choices: string[], // 2~4
   *   correctIndex: number, // 0~3
   *   word: string,
   *   vocab: object  // 完整的单词数据
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
    // 保存完整题目数据（包括 vocab 信息）
    this._questionData = data;
    this._selected = false;

    this.render();
  }

  render() {
    // 构建题干
    let html = `<div class="choice-question">${this.questionText}</div>`;
    // 增加题型说明，例如 "Please choose the correct <synonym>."
    let explanation = "";
    switch (this.questionType) {
      case "word-chinese":
        explanation = `Please choose the correct <span class="highlight">Chinese definition</span>.`;
        break;
      case "word-english":
        explanation = `Please choose the correct <span class="highlight">English definition</span>.`;
        break;
      case "chinese-to-word":
        explanation = `Please choose the correct <span class="highlight">word</span> for the Chinese definition.`;
        break;
      case "english-to-word":
        explanation = `Please choose the correct <span class="highlight">word</span> for the English definition.`;
        break;
      case "synonym":
        explanation = `Please choose the correct <span class="highlight">synonym</span>.`;
        break;
      case "antonym":
        explanation = `Please choose the correct <span class="highlight">antonym</span>.`;
        break;
      case "sentence":
        explanation = `Please choose the <span class="highlight">correct word</span> to fill in the blank in the sentence.`;
        break;
      default:
        explanation = "";
    }
    if (explanation) {
      html += `<div class="choice-explanation">${explanation}</div>`;
    }
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

  async _handleOptionClick(e) {
    if (this._selected) return;
    this._selected = true;

    const chosenEl = e.currentTarget;
    const idx = parseInt(chosenEl.dataset.idx, 10);
    const optionEls = Array.from(this.shadowRoot.querySelectorAll(".option"));

    const isCorrect = idx === this.correctIndex;
    if (isCorrect) {
      chosenEl.classList.add("correct");
    } else {
      chosenEl.classList.add("incorrect");
      if (this.correctIndex < optionEls.length) {
        optionEls[this.correctIndex].classList.add("correct");
      }
    }
    // 禁止再次点击
    optionEls.forEach((o) => {
      o.style.pointerEvents = "none";
    });

    // 构造答题记录
    const answerTime = Date.now();
    // 假定 this._questionData.vocab 包含完整的 vocabulary 数据，并包含 correctCount、errorCount、showCount 字段
    let vocabRecord = this._questionData.vocab || {};
    if (vocabRecord.correctCount === undefined) vocabRecord.correctCount = 0;
    if (vocabRecord.errorCount === undefined) vocabRecord.errorCount = 0;
    const correctCountBefore = vocabRecord.correctCount;
    const errorCountBefore = vocabRecord.errorCount;
    const currentShowCount = vocabRecord.showCount || 0;

    // 更新计数（外部 card 组件会统一处理数据库更新，这里仅传递记录）
    const record = {
      vocabulary: vocabRecord,
      questionData: this._questionData,
      answer: idx,
      isCorrect: isCorrect,
      answerTime: answerTime,
      correctCountBefore: correctCountBefore,
      errorCountBefore: errorCountBefore,
      currentShowCount: currentShowCount,
    };

    // 派发事件 answerUpdated，向上抛出答题记录
    this.dispatchEvent(
      new CustomEvent("answerUpdated", {
        detail: record,
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define("choice-header", ChoiceHeader);
