// components/anki-card/anki-card.js
import "../round-icon-button/round-icon-button.js";

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // 多条词汇数组
    this._vocabulary = [];
    // 当前展示词汇的索引
    this._currentIndex = 0;
    // 详情区是否显示
    this._detailVisible = true;
    // 当前显示的例句
    this._currentExample = "";

    this.render();
  }

  /**
   * 外部调用：传入 { vocabulary: [...] } 或单个词汇对象，
   * 并对数组进行随机洗牌，确保学习次序随机
   */
  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      this._vocabulary = this._shuffleArray(data.vocabulary);
      this._currentIndex = 0;
      if (this._vocabulary[0] && Array.isArray(this._vocabulary[0].sentences)) {
        this._currentExample = this._vocabulary[0].sentences[0] || "";
      }
      console.log(
        "anki-card received array, shuffled length =",
        this._vocabulary.length
      );
    } else if (data && data.word) {
      this._vocabulary = [data];
      this._currentIndex = 0;
      if (data.sentences && Array.isArray(data.sentences)) {
        this._currentExample = data.sentences[0] || "";
      }
      console.log("anki-card received single word object");
    } else {
      console.warn("anki-card setData: no valid vocabulary found");
      this._vocabulary = [];
      this._currentIndex = 0;
      this._currentExample = "";
    }
    this._detailVisible = true;
    this.render();
  }

  /**
   * Fisher–Yates 洗牌算法
   */
  _shuffleArray(array) {
    let arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * 随机切换当前词汇中的例句
   */
  _randomizeExample() {
    const current = this._vocabulary[this._currentIndex];
    if (
      current &&
      Array.isArray(current.sentences) &&
      current.sentences.length > 0
    ) {
      const idx = Math.floor(Math.random() * current.sentences.length);
      this._currentExample = current.sentences[idx];
      console.log("Randomized example:", this._currentExample);
      this.render();
    }
  }

  getTemplate() {
    if (this._vocabulary.length === 0) {
      // 空态时返回空容器（大上传区域在外部处理）
      return `<div class="card-container"></div>`;
    }

    // 取当前词汇
    const currentWord = this._vocabulary[this._currentIndex] || {};
    const word = currentWord.word || "???";
    const phonetic = currentWord.phonetic || "";

    // 词性处理：使用英文 mapping
    const pos = currentWord.pos || "";
    const posMapping = {
      noun: "n.",
      verb: "v.",
      adjective: "adj.",
      adverb: "adv.",
      pronoun: "pron.",
      preposition: "prep.",
      conjunction: "conj.",
      interjection: "interj.",
    };
    const posAbbrev = posMapping[pos.toLowerCase()] || pos;

    const cdef = currentWord.chineseDefinition || "";
    const edef = currentWord.englishDefinition || "";
    const synonyms = currentWord.synonym || [];
    const antonyms = currentWord.antonym || [];
    const sents = currentWord.sentences || [];
    const example = Array.isArray(sents)
      ? this._currentExample || sents[0] || ""
      : sents;

    const detailClass = this._detailVisible ? "" : " hidden";

    return `
      <link rel="stylesheet" href="components/anki-card/anki-card.css">
      <div class="card-container">
        <!-- 顶部单词区域 -->
        <div class="word-section">${word}</div>

        <!-- 刷新按钮（右上角） -->
        <round-icon-button
          id="btn-refresh"
          class="refresh"
          label="刷新"
          icon='<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="1 20 1 14 7 14" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="3.51" y1="9.4" x2="9.93" y2="14.17" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="16.57" y1="9.44" x2="22.49" y2="14.14" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        ></round-icon-button>

        <!-- 详情区域 -->
        <div id="details-section" class="details-section${detailClass}">
          <div class="detail-row inline">
            <span class="phonetic">${phonetic}</span>
            <span class="pos">${posAbbrev}</span>
          </div>
          <div class="detail-row definition-cn">
            ${cdef}
          </div>
          <div class="detail-row definition-en">
            ${edef}
          </div>
          <div class="synonyms-row">
            <span class="synonyms-label">近义词：</span>
            <span class="synonyms">${
              Array.isArray(synonyms) ? synonyms.join(" ") : synonyms
            }</span>
          </div>
          <div class="antonyms-row">
            <span class="antonyms-label">反义词：</span>
            <span class="antonyms">${
              Array.isArray(antonyms) ? antonyms.join(" ") : antonyms
            }</span>
          </div>
          <div class="examples">
            <div class="label">例句（点击切换）：</div>
            <div class="example-sentence">${example}</div>
          </div>
        </div>

        <!-- 底部“展开更多”交互区 -->
        <div class="expand-more" id="expandMoreArea">
          <div class="expand-line"></div>
          <div class="expand-arrow">
            ${
              this._detailVisible
                ? '<svg viewBox="0 0 24 24"><polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/></svg>'
                : '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" stroke="white" stroke-width="2" fill="none"/></svg>'
            }
          </div>
        </div>
      </div>
    `;
  }

  render() {
    this.shadowRoot.innerHTML = this.getTemplate();
    this.bindEvents();
  }

  bindEvents() {
    // 刷新按钮
    const btnRefresh = this.shadowRoot.getElementById("btn-refresh");
    if (btnRefresh) {
      btnRefresh.addEventListener("roundButtonClick", () => {
        this.hideDetails();
        this.dispatchEvent(
          new CustomEvent("refreshClicked", {
            bubbles: true,
            composed: true,
          })
        );
      });
    }
    // 展开更多区域
    const expandArea = this.shadowRoot.getElementById("expandMoreArea");
    if (expandArea) {
      expandArea.addEventListener("click", () => {
        this._detailVisible = !this._detailVisible;
        this.render();
      });
    }
    // 例句点击事件：随机切换例句
    const exampleEl = this.shadowRoot.querySelector(".example-sentence");
    if (exampleEl) {
      exampleEl.addEventListener("click", () => {
        this._randomizeExample();
      });
    }
  }

  hideDetails() {
    this._detailVisible = false;
    this.render();
  }
}

customElements.define("anki-card", AnkiCard);
