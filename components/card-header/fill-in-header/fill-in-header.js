// components/card-header/fill-in-header/fill-in-header.js
class FillInHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Load CSS only once
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.setAttribute("rel", "stylesheet");
      linkElem.setAttribute(
        "href",
        "components/card-header/fill-in-header/fill-in-header.css"
      );
      this.shadowRoot.appendChild(linkElem);
    }

    // Create container for dynamic content
    this._container = document.createElement("div");
    this.shadowRoot.appendChild(this._container);

    // Data initialization
    this.word = "";
    this.letterBlocks = []; // Each item: { given: boolean, letter: string, userInput: string }
    this.currentBlankIndex = 0;

    this.chineseDefinition = "";
    this.englishDefinition = "";

    // Submission state: null = not submitted, true = correct, false = incorrect
    this.submitStatus = null;

    // Initial font size (px), to be adjusted dynamically
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

  // Randomly distribute given letters: randomly select givenCount indices; others remain blanks.
  _initLetterBlocks() {
    const n = this.word.length;
    const ratio = 0.2 + Math.random() * 0.3; // 20%-50%
    let givenCount = Math.max(1, Math.floor(n * ratio));
    if (givenCount >= n) {
      givenCount = n - 1; // Ensure at least one blank
    }
    // Create an array of indices and shuffle
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const givenIndices = new Set(indices.slice(0, givenCount));

    this.letterBlocks = [];
    for (let i = 0; i < n; i++) {
      if (givenIndices.has(i)) {
        this.letterBlocks.push({
          given: true,
          letter: this.word[i],
          userInput: this.word[i],
        });
      } else {
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
      this._updateFontSizeProperty();
    }
  }

  _updateFontSizeProperty() {
    // Set CSS custom property for font size so that CSS can use it (no inline font-size on individual elements)
    this._container.style.setProperty(
      "--letterFontSize",
      `${this._fontSize}px`
    );
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
    if (e.key === "Enter") {
      this._triggerSubmit();
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    const block = this.letterBlocks[index];
    if (!block || block.given) return;

    if (e.key === "Backspace") {
      block.userInput = "";
      this.render();
      requestAnimationFrame(() => {
        this._fitToWidth();
        let prev = index - 1;
        while (prev >= 0 && this.letterBlocks[prev].given) {
          prev--;
        }
        this.currentBlankIndex = prev >= 0 ? prev : index;
        this._focusCurrentBlank();
      });
      e.preventDefault();
      return;
    }

    if (e.key.length !== 1) return;

    if (/[a-zA-Z\-]/.test(e.key)) {
      let inputChar = e.key;
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
      // Already submitted: reset the letter blocks
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
    let html = `<div class="answer-line">`;
    for (let i = 0; i < this.letterBlocks.length; i++) {
      const b = this.letterBlocks[i];
      let color = "green";
      if (!b.given) {
        color =
          b.userInput.toLowerCase() === b.letter.toLowerCase()
            ? "green"
            : "red";
      }
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

    // For the submit button, use classes instead of inline style.
    let submitBtnClass = "submit-btn";
    if (this.submitStatus === true) {
      submitBtnClass += " btn-correct";
    } else if (this.submitStatus === false) {
      submitBtnClass += " btn-incorrect";
    } else {
      submitBtnClass += " btn-default";
    }

    // Build the question line (left: letter-line, right: submit button)
    const questionLine = `
      <div class="question-line">
        <div class="left-part">
          <div class="letter-line">
            ${lettersHtml}
          </div>
          ${this.submitStatus === false ? this._getCorrectAnswerHtml() : ""}
        </div>
        <div class="right-part">
          <div class="${submitBtnClass}" id="submit-btn">
            ${
              this.submitStatus === true
                ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <g transform="translate(2.4,2.4) scale(0.8)">
                       <polyline points="20 6 9 17 4 12"/>
                     </g>
                   </svg>`
                : this.submitStatus === false
                ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <g transform="translate(2.4,2.4) scale(0.8)">
                       <line x1="6" y1="6" x2="18" y2="18"/>
                       <line x1="6" y1="18" x2="18" y2="6"/>
                     </g>
                   </svg>`
                : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#1041CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <g transform="translate(2.4,2.4) scale(0.8)">
                       <path d="M20 16V8.5C20 7.67157 19.3587 7 18.5195 7C18 7 17 7.3 17 8.5V5.5C17 4.67157 16.3588 4 15.5195 4C15.013 4 14 4.3 14 5.5V3.5C14 2.67157 13.3588 2 12.5195 2C11.6803 2 11 2.67157 11 3.5V5.5C11 4.3 10.0065 4 9.5 4C8.66076 4 8 4.69115 8 5.51957L8.00004 14" />
                       <path d="M11 5.5V11"/>
                       <path d="M14 5.5V11"/>
                       <path d="M17 5.5V11"/>
                       <path d="M20 16C20 20 16.866 22 13 22C9.13401 22 7.80428 21 4.80428 16L3.23281 13.3949C2.69684 12.5274 3.1259 11.4011 4.11416 11.0812C4.77908 10.866 5.51122 11.0881 5.93175 11.6326L8 14.0325"/>
                     </g>
                   </svg>`
            }
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
    this._updateFontSizeProperty();
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
    // Note: Toggle details functionality is removed from header.
  }
}

customElements.define("fill-in-header", FillInHeader);
