// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";
import "../card-header/choice-header/choice-header.js";

// 更新：引入新的 helper 方法（文件名：generate-question-data.js）
import {
  ALL_TYPES,
  generateQuestionData,
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

    // 创建主容器，并添加外层包装（用于 perspective）
    this._contentContainer = document.createElement("div");
    this._contentContainer.className = "card-wrapper";
    this.shadowRoot.appendChild(this._contentContainer);

    // 数据初始化
    this._vocabulary = []; // 存放全部可用词汇
    this._currentIndex = 0;
    // 仅 display 类型默认展开详情，其它类型默认收起
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

    // 重置题型
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

    // 调用 helper 生成最终题目数据，并传递给 header 组件
    if (ALL_TYPES.includes(this._questionType)) {
      // 刷新时保持当前词，调用 helper 时传入当前词作为第三参数
      const currentItem = this._vocabulary[this._currentIndex];
      const questionData = generateQuestionData(
        this._vocabulary,
        this._questionType,
        currentItem
      );
      const headerComp = this.shadowRoot.getElementById("header-comp");
      if (headerComp && typeof headerComp.setData === "function") {
        console.log("[anki] headerComp.setData", questionData, headerComp, cur);
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
          ${
            cur.synonym && cur.synonym.length > 0
              ? `
          <div class="synonyms-row">
            <span class="synonyms-label">近义词：</span>
            <span class="synonyms">${cur.synonym.join(", ")}</span>
          </div>`
              : ""
          }
          ${
            cur.antonym && cur.antonym.length > 0
              ? `
          <div class="antonyms-row">
            <span class="antonyms-label">反义词：</span>
            <span class="antonyms">${cur.antonym.join(", ")}</span>
          </div>`
              : ""
          }
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
    // 只有 display 题型默认展开详情，其余均隐藏
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
    // 基于当前词重新生成题目，不改变 _currentIndex
    const cur = this._vocabulary[this._currentIndex];
    if (cur) {
      let newType;
      do {
        newType = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
      } while (newType === this._questionType);
      const previousType = this._questionType;
      this._questionType = newType;
      this._detailVisible = newType === "display";
      // 刷新时基于当前词调用 helper：传入 currentItem
      const questionData = generateQuestionData(
        this._vocabulary,
        this._questionType,
        cur
      );
      const headerComp = this.shadowRoot.getElementById("header-comp");
      const expectedTag = this._getExpectedHeaderTag(this._questionType);
      if (headerComp) {
        if (headerComp.tagName.toLowerCase() !== expectedTag) {
          // 类型不一致，重新渲染整个 header 部分
          this.render();
        } else {
          // 类型一致，直接更新数据
          headerComp.setData(questionData);
        }
      } else {
        this.render();
      }
    }
  }

  _getExpectedHeaderTag(type) {
    if (type === "fill-in") return "fill-in-header";
    if (type === "display") return "display-header";
    // 其余 7 种选择题统一由 choice-header 组件处理
    return "choice-header";
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

  _randomizeExample() {
    const cur = this._vocabulary[this._currentIndex];
    if (cur?.sentences?.length) {
      const idx = Math.floor(Math.random() * cur.sentences.length);
      this._currentExample = cur.sentences[idx];
      const exampleEl =
        this._contentContainer.querySelector(".example-sentence");
      if (exampleEl) {
        exampleEl.textContent = this._currentExample;
      }
    }
  }

  showPrev() {
    if (this._vocabulary.length <= 1) return;
    // 左右切换：采用绕 Y 轴旋转 90° 效果，并在中途更新内容
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (cardEl) {
      cardEl.style.transition = "transform 0.3s ease";
      cardEl.style.transform = "rotateY(90deg)";
      setTimeout(() => {
        this._currentIndex =
          (this._currentIndex - 1 + this._vocabulary.length) %
          this._vocabulary.length;
        // 更新新题数据，并让新内容立刻显示
        this._questionType = null;
        this.render();
        // 完成旋转回正
        cardEl.style.transform = "rotateY(0deg)";
      }, 150);
    } else {
      this._currentIndex =
        (this._currentIndex - 1 + this._vocabulary.length) %
        this._vocabulary.length;
      this._questionType = null;
      this.render();
    }
  }

  showNext() {
    if (this._vocabulary.length <= 1) return;
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (cardEl) {
      cardEl.style.transition = "transform 0.3s ease";
      cardEl.style.transform = "rotateY(90deg)";
      setTimeout(() => {
        this._currentIndex = (this._currentIndex + 1) % this._vocabulary.length;
        this._questionType = null;
        this.render();
        cardEl.style.transform = "rotateY(0deg)";
      }, 150);
    } else {
      this._currentIndex = (this._currentIndex + 1) % this._vocabulary.length;
      this._questionType = null;
      this.render();
    }
  }
}

customElements.define("anki-card", AnkiCard);
