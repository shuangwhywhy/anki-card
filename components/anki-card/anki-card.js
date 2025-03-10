// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";
import "../card-header/choice-header/choice-header.js";

// 更新：引入新的 helper 方法
import {
  ALL_TYPES,
  generateChoiceQuestion,
} from "../../helpers/generate-question-data.js";

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // 加载 CSS（只加载一次）
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.rel = "stylesheet";
      linkElem.href = "components/anki-card/anki-card.css";
      this.shadowRoot.appendChild(linkElem);
    }

    // 主容器
    this._contentContainer = document.createElement("div");
    this.shadowRoot.appendChild(this._contentContainer);

    // 数据初始化
    this._vocabulary = []; // 存放全部可用词汇
    this._currentIndex = 0;
    // 对于 display 题型，详情区默认展开；其他类型默认收起
    this._detailVisible = true;
    this._currentExample = "";
    this._questionType = null;

    // 缓存详情区元素（第一次 render 后设置）
    this._detailsSection = null;
    // 初始字号（px）
    this._fontSize = 32;

    // 首次渲染
    this.render();
  }

  connectedCallback() {
    this._contentContainer.addEventListener(
      "click",
      this._handleClick.bind(this)
    );
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      // 多个词条
      this._vocabulary = data.vocabulary;
      this._currentIndex = 0;
      if (this._vocabulary[0].sentences?.length) {
        this._currentExample = this._vocabulary[0].sentences[0] || "";
      }
      console.log(
        "anki-card setData => array, length =",
        this._vocabulary.length
      );
    } else if (data && data.word) {
      // 单个词条
      this._vocabulary = [data];
      this._currentIndex = 0;
      if (data.sentences?.length) {
        this._currentExample = data.sentences[0];
      }
      console.log("anki-card setData => single word object");
    } else {
      this._vocabulary = [];
      this._currentIndex = 0;
      this._currentExample = "";
      console.warn("anki-card setData => no valid data");
    }

    // 此处暂不对 distractors 做额外处理，全部由 helper 生成
    this._questionType = null;
    this.render();
  }

  render() {
    this._contentContainer.innerHTML = this.getTemplate();
    this._detailsSection =
      this._contentContainer.querySelector("#details-section");
    this._updateFontSizeProperty();

    const cur = this._vocabulary[this._currentIndex];
    if (!cur) return;

    // 如果题型未定，则随机选择
    if (!this._questionType) {
      const rand = Math.floor(Math.random() * ALL_TYPES.length);
      this._questionType = ALL_TYPES[rand];
      this._detailVisible = this._questionType === "display";
    }

    // 如果题型属于选择题（7种），调用 helper 生成最终题目数据，并传递给 header 组件
    if (ALL_TYPES.includes(this._questionType)) {
      const questionData = generateChoiceQuestion(
        this._vocabulary,
        this._questionType
      );
      const headerComp = this.shadowRoot.getElementById("header-comp");
      if (headerComp && typeof headerComp.setData === "function") {
        console.log("[anki] headerComp.setData", questionData, headerComp);
        headerComp.setData(questionData);
      }
    }
  }

  getTemplate() {
    if (!this._vocabulary.length) {
      return `<div class="card-container">No Data</div>`;
    }
    const cur = this._vocabulary[this._currentIndex];

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
    const posAbbrev = cur.pos
      ? posMapping[cur.pos.toLowerCase()] || cur.pos
      : "";

    const headerTemplate = this._getHeaderTemplate();
    const detailsClass = this._detailVisible ? "" : " hidden";

    const toggleArrowSVG = this._detailVisible
      ? `<svg viewBox="0 0 24 24">
           <polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/>
         </svg>`
      : `<svg viewBox="0 0 24 24">
           <polyline points="6 9 12 15 18 9" stroke="white" stroke-width="2" fill="none"/>
         </svg>`;

    return `
      <div class="card-container">
        <div class="card-header">
          ${headerTemplate}
        </div>
        <div class="card-refresh-btn" id="refresh-btn">
          <div class="icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6a6 6 0 016 6 6 6 0 01-6 6 6 6 0 01-5.65-4H4.26A8 8 0 0012 20a8 8 0 000-16z"/>
            </svg>
          </div>
        </div>
        <div id="details-section" class="details-section ${detailsClass}">
          <div class="detail-row inline">
            <span class="phonetic">${cur.phonetic || ""}</span>
            <span class="pos">${posAbbrev}</span>
          </div>
          <div class="detail-row definition-cn">
            ${cur.chineseDefinition || ""}
          </div>
          <div class="detail-row definition-en">
            ${cur.englishDefinition || ""}
          </div>
          <div class="synonyms-row">
            <span class="synonyms-label">近义词：</span>
            <span class="synonyms">${cur.synonym || ""}</span>
          </div>
          <div class="antonyms-row">
            <span class="antonyms-label">反义词：</span>
            <span class="antonyms">${cur.antonym || ""}</span>
          </div>
          <div class="examples">
            <div class="label">例句（点击切换）：</div>
            <div class="example-sentence">${this._currentExample}</div>
          </div>
        </div>
        <div class="expand-more" id="expandMoreArea">
          <div class="expand-line"></div>
          <div class="expand-arrow">
            ${toggleArrowSVG}
          </div>
        </div>
      </div>
    `;
  }

  _getHeaderTemplate() {
    if (!this._questionType) {
      const rand = Math.floor(Math.random() * ALL_TYPES.length);
      this._questionType = ALL_TYPES[rand];
    }
    // 如果不是 display 类型，则隐藏详情区
    this._detailVisible = this._questionType === "display";

    if (ALL_TYPES.includes(this._questionType)) {
      if (this._questionType === "fill-in") {
        return `<fill-in-header id="header-comp"></fill-in-header>`;
      }
      if (this._questionType === "display") {
        return `<display-header id="header-comp"></display-header>`;
      }
      // 其余 7 种选择题由 choice-header 组件处理
      return `<choice-header id="header-comp" choice-type="${this._questionType}"></choice-header>`;
    }
    return `<div>[${this._questionType} placeholder]</div>`;
  }

  _updateFontSizeProperty() {
    this._contentContainer.style.setProperty(
      "--letterFontSize",
      `${this._fontSize}px`
    );
  }

  _handleClick(e) {
    const target = e.target;
    const refreshBtn = this._contentContainer.querySelector("#refresh-btn");
    if (refreshBtn && refreshBtn.contains(target)) {
      this._refresh();
      return;
    }
    const expandArea = this._contentContainer.querySelector("#expandMoreArea");
    if (expandArea && expandArea.contains(target)) {
      this._toggleDetails();
      return;
    }
    const exampleEl = this._contentContainer.querySelector(".example-sentence");
    if (exampleEl && exampleEl.contains(target)) {
      this._randomizeExample();
      return;
    }
  }

  _refresh() {
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (cardEl) {
      cardEl.classList.add("fade-out");
      setTimeout(() => {
        let newType;
        do {
          newType = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
        } while (newType === this._questionType);
        this._questionType = newType;
        this._detailVisible = newType === "display";
        this.render();
        const newCard = this._contentContainer.querySelector(".card-container");
        if (newCard) {
          newCard.classList.add("fade-in");
          setTimeout(() => newCard.classList.remove("fade-in"), 200);
        }
        this.dispatchEvent(
          new CustomEvent("refreshClicked", { bubbles: true, composed: true })
        );
      }, 200);
    } else {
      let newType;
      do {
        newType = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
      } while (newType === this._questionType);
      this._questionType = newType;
      this._detailVisible = newType === "display";
      this.render();
      this.dispatchEvent(
        new CustomEvent("refreshClicked", { bubbles: true, composed: true })
      );
    }
  }

  _toggleDetails() {
    if (!this._detailsSection) return;
    this._detailVisible = !this._detailVisible;
    this._detailsSection.classList.toggle("hidden", !this._detailVisible);
    const arrowContainer =
      this._contentContainer.querySelector(".expand-arrow");
    if (arrowContainer) {
      arrowContainer.innerHTML = this._detailVisible
        ? `<svg viewBox="0 0 24 24"><polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/></svg>`
        : `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" stroke="white" stroke-width="2" fill="none"/></svg>`;
    }
  }

  showPrev() {
    if (this._vocabulary.length <= 1) return;
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (!cardEl) {
      this._currentIndex =
        (this._currentIndex - 1 + this._vocabulary.length) %
        this._vocabulary.length;
      this._questionType = null;
      this.render();
      return;
    }
    cardEl.classList.add("flip-out-left");
    setTimeout(() => {
      this._currentIndex =
        (this._currentIndex - 1 + this._vocabulary.length) %
        this._vocabulary.length;
      this._questionType = null;
      this.render();
      const newCard = this._contentContainer.querySelector(".card-container");
      if (newCard) {
        newCard.classList.add("flip-in-left");
        setTimeout(() => newCard.classList.remove("flip-in-left"), 200);
      }
    }, 200);
  }

  showNext() {
    if (this._vocabulary.length <= 1) return;
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (!cardEl) {
      this._currentIndex = (this._currentIndex + 1) % this._vocabulary.length;
      this._questionType = null;
      this.render();
      return;
    }
    cardEl.classList.add("flip-out-right");
    setTimeout(() => {
      this._currentIndex = (this._currentIndex + 1) % this._vocabulary.length;
      this._questionType = null;
      this.render();
      const newCard = this._contentContainer.querySelector(".card-container");
      if (newCard) {
        newCard.classList.add("flip-in-right");
        setTimeout(() => newCard.classList.remove("flip-in-right"), 200);
      }
    }, 200);
  }
}

customElements.define("anki-card", AnkiCard);
