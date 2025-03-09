// components/card-header/fill-in-header/fill-in-header.js
class FillInHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // 仅加载一次样式
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.setAttribute("rel", "stylesheet");
      linkElem.setAttribute(
        "href",
        "components/card-header/fill-in-header/fill-in-header.css"
      );
      this.shadowRoot.appendChild(linkElem);
    }

    // 创建专用容器，用于动态内容更新
    this._container = document.createElement("div");
    this.shadowRoot.appendChild(this._container);

    // 数据初始化
    this.word = "";
    this.letterBlocks = []; // 每项: { given: boolean, letter: string, userInput: string }
    this.currentBlankIndex = 0;

    this.chineseDefinition = "";
    this.englishDefinition = "";

    // 提交状态: null=未提交, true=正确, false=错误
    this.submitStatus = null;

    // 初始字体大小（px），后续动态调整
    this._fontSize = 32;

    this.render();
  }

  /**
   * setData({ word, chineseDefinition, englishDefinition, ... })
   */
  setData(data) {
    if (!data || !data.word) return;
    this.word = data.word;
    this.chineseDefinition = data.chineseDefinition || "";
    this.englishDefinition = data.englishDefinition || "";
    this._initLetterBlocks();
    this.submitStatus = null;
    this.render();
    requestAnimationFrame(() => {
      this._fitToWidth();
      this._focusCurrentBlank();
    });
  }

  _initLetterBlocks() {
    const n = this.word.length;
    const ratio = 0.2 + Math.random() * 0.3; // 20%-50%
    let givenCount = Math.max(1, Math.floor(n * ratio));
    if (givenCount >= n) {
      givenCount = n - 1; // 至少留一个空缺
    }
    this.letterBlocks = [];
    for (let i = 0; i < n; i++) {
      if (i < givenCount) {
        // 给出的字母：直接显示，固定为黑色，无下划线
        this.letterBlocks.push({
          given: true,
          letter: this.word[i],
          userInput: this.word[i],
        });
      } else {
        // 空缺区域：初始为空，默认显示为黑色，下划线显示
        this.letterBlocks.push({
          given: false,
          letter: this.word[i],
          userInput: "",
        });
      }
    }
    const blankIndex = this.letterBlocks.findIndex((b) => !b.given);
    this.currentBlankIndex = blankIndex === -1 ? n - 1 : blankIndex;
  }

  _fitToWidth() {
    const qBlock = this._container.querySelector(".question-block");
    const letterLine = this._container.querySelector(".letter-line");
    if (!qBlock || !letterLine) return;
    const minFontSize = 14;
    while (
      letterLine.scrollWidth > qBlock.offsetWidth &&
      this._fontSize > minFontSize
    ) {
      this._fontSize--;
      letterLine.style.fontSize = `${this._fontSize}px`;
    }
  }

  _focusCurrentBlank() {
    const blankEl = this._container.querySelector(
      `.letter.blank[data-index="${this.currentBlankIndex}"]`
    );
    if (blankEl) {
      blankEl.focus();
    }
  }

  _handleKeyDown(e, index) {
    // 如果按下 Enter 键，则触发提交逻辑
    if (e.key === "Enter") {
      this._triggerSubmit();
      e.preventDefault();
      return;
    }
    // 若按下 Ctrl、Meta、Alt 等控制键（不包括 CapsLock 和 Shift），直接返回
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    const block = this.letterBlocks[index];
    if (!block || block.given) return;

    // 先处理 Backspace（注意 Backspace 的 e.key 长度不为 1）
    if (e.key === "Backspace") {
      block.userInput = "";
      this.render();
      requestAnimationFrame(() => {
        this._fitToWidth();
        let prev = index - 1;
        while (prev >= 0 && this.letterBlocks[prev].given) {
          prev--;
        }
        if (prev >= 0) {
          this.currentBlankIndex = prev;
        }
        this._focusCurrentBlank();
      });
      e.preventDefault();
      return;
    }

    // 如果输入的不是单个字符（其他控制键），则不处理
    if (e.key.length !== 1) return;

    // 允许输入字母和短横 "-"
    if (/[a-zA-Z\-]/.test(e.key)) {
      let inputChar = e.key;
      // 判断大小写逻辑：
      // 如果 CapsLock 开启：若同时按下 Shift，则输入小写，否则输入大写；
      // 如果 CapsLock 未开启：若按下 Shift，则输入大写，否则输入小写。
      if (e.getModifierState("CapsLock")) {
        inputChar = e.shiftKey
          ? inputChar.toLowerCase()
          : inputChar.toUpperCase();
      } else {
        inputChar = e.shiftKey
          ? inputChar.toUpperCase()
          : inputChar.toLowerCase();
      }
      block.userInput = inputChar;
      this.render();
      requestAnimationFrame(() => {
        this._fitToWidth();
        let next = index + 1;
        while (
          next < this.letterBlocks.length &&
          this.letterBlocks[next].given
        ) {
          next++;
        }
        if (next < this.letterBlocks.length) {
          this.currentBlankIndex = next;
        }
        this._focusCurrentBlank();
      });
      e.preventDefault();
    }
  }

  _triggerSubmit() {
    if (this.submitStatus !== null) {
      // 如果已经提交，再次按下回车则重置
      this._initLetterBlocks();
      this.submitStatus = null;
      this.render();
      requestAnimationFrame(() => {
        this._fitToWidth();
        this._focusCurrentBlank();
      });
    } else {
      const correct = this._checkAnswer();
      this.submitStatus = correct;
      this.render();
      requestAnimationFrame(() => this._fitToWidth());
    }
  }

  _checkAnswer() {
    for (let i = 0; i < this.letterBlocks.length; i++) {
      const b = this.letterBlocks[i];
      if (!b.given && b.userInput.toLowerCase() !== b.letter.toLowerCase()) {
        return false;
      }
    }
    return true;
  }

  _getCorrectAnswerHtml() {
    let html = `<div class="answer-line" style="font-size:${this._fontSize}px;">`;
    for (let i = 0; i < this.letterBlocks.length; i++) {
      const b = this.letterBlocks[i];
      let color = "green";
      if (!b.given) {
        color =
          b.userInput.toLowerCase() === b.letter.toLowerCase()
            ? "green"
            : "red";
      }
      // 正确答案不带下划线
      html += `<span class="letter-answer" data-index="${i}" style="color:${color};">${b.letter}</span>`;
    }
    html += `</div>`;
    return html;
  }

  getTemplate() {
    if (!this.word)
      return `<div class="fill-in-header-container">No Word Provided</div>`;

    let lettersHtml = "";
    for (let i = 0; i < this.letterBlocks.length; i++) {
      const b = this.letterBlocks[i];
      if (b.given) {
        lettersHtml += `<span class="letter given" data-index="${i}">${b.letter}</span>`;
      } else {
        const content = b.userInput || "";
        let extraClass = "";
        if (
          this.submitStatus === false &&
          b.userInput.toLowerCase() !== b.letter.toLowerCase()
        ) {
          extraClass = " error";
        }
        lettersHtml += `<span class="letter blank${extraClass}" data-index="${i}" tabindex="0">${content}</span>`;
      }
    }

    // 构建 question-block，分左右两块：左侧包含 letter-line 和 answer-line，右侧为提交按钮
    const questionLine = `
      <div class="question-line">
        <div class="left-part">
          <div class="letter-line" style="font-size:${this._fontSize}px;">
            ${lettersHtml}
          </div>
          ${this.submitStatus === false ? this._getCorrectAnswerHtml() : ""}
        </div>
        <div class="right-part">
          <div class="submit-btn" id="submit-btn" style="background-color:transparent;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 16V8.5C20 7.67157 19.3587 7 18.5195 7C18 7 17 7.3 17 8.5V5.5C17 4.67157 16.3588 4 15.5195 4C15.013 4 14 4.3 14 5.5V3.5C14 2.67157 13.3588 2 12.5195 2C11.6803 2 11 2.67157 11 3.5V5.5C11 4.3 10.0065 4 9.5 4C8.66076 4 8 4.69115 8 5.51957L8.00004 14" stroke="#1041CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M11 5.5V11" stroke="#1041CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 5.5V11" stroke="#1041CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M17 5.5V11" stroke="#1041CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 16C20 20 16.866 22 13 22C9.13401 22 7.80428 21 4.80428 16L3.23281 13.3949C2.69684 12.5274 3.1259 11.4011 4.11416 11.0812C4.77908 10.866 5.51122 11.0881 5.93175 11.6326L8 14.0325" stroke="#1041CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    `;

    const definitions = `
      <div class="definition-area">
        <div class="definition-cn">${this.chineseDefinition}</div>
        <div class="definition-en">${this.englishDefinition}</div>
      </div>
    `;

    return `
      <div class="fill-in-header-container">
        <div class="question-block">
          ${questionLine}
        </div>
        ${definitions}
      </div>
    `;
  }

  render() {
    this._container.innerHTML = this.getTemplate();
    this.bindEvents();
  }

  bindEvents() {
    const blanks = this._container.querySelectorAll(".letter.blank");
    blanks.forEach((el) => {
      el.addEventListener("keydown", (e) => {
        const idx = parseInt(el.getAttribute("data-index"), 10);
        this._handleKeyDown(e, idx);
      });
    });
    const submitBtn = this._container.querySelector("#submit-btn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        this._triggerSubmit();
      });
    }
  }
}

customElements.define("fill-in-header", FillInHeader);
