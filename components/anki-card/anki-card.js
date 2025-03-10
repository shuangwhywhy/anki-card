// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";
import "../card-header/choice-header/choice-header.js";

// 引入工具函数
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

    // 主容器
    this._contentContainer = document.createElement("div");
    this.shadowRoot.appendChild(this._contentContainer);

    // 数据初始化
    this._vocabulary = []; // 存放全部可用词汇
    this._currentIndex = 0;
    // 对于 display 题型 => 默认展开，其余 => 收起
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
    // 绑定点击
    this._contentContainer.addEventListener(
      "click",
      this._handleClick.bind(this)
    );
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      // 多个词条
      this._vocabulary = data.vocabulary.map((item) => ({
        ...item,
        chineseDefinition:
          item.chineseDefinition || item["中文释义"] || "暂无中文释义",
        englishDefinition:
          item.englishDefinition || item["英文释义"] || "暂无英文释义",
      }));
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
      this._vocabulary = [
        {
          ...data,
          chineseDefinition:
            data.chineseDefinition || data["中文释义"] || "暂无中文释义",
          englishDefinition:
            data.englishDefinition || data["英文释义"] || "暂无英文释义",
        },
      ];
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

    // 在 setData 阶段 => 暂不确定题型 => 先对全部 item 生成 distractors, correctWord
    // 这里仅能做“最小准备” => 最终题型随机 => generateQuestionData 时需要 questionType
    // => 但 questionType 是在 render 中才随机
    // => 所以我们可以先不做 => 也可对 fill-in, display 不做 => 其余都做
    // 这里简单演示：先对 ALL_TYPES 里(排除 fill-in, display) 做 generateQuestionData
    // 也可以在render中 => 但会频繁执行 => 这里一次性处理
    this._vocabulary.forEach((item) => {
      // 先给一个默认 questionType(比如 word-chinese)
      // 以便 item.distractors 不混杂 => 后面随机到别的type => 可能不匹配 => 需二次 refine
      // 最小改动 => 仅演示
      generateQuestionData(item, this._vocabulary, "word-chinese");
    });

    this._questionType = null;
    this.render();
  }

  // 生成 / 重新渲染
  render() {
    this._contentContainer.innerHTML = this.getTemplate();
    this._detailsSection =
      this._contentContainer.querySelector("#details-section");
    this._updateFontSizeProperty();

    const cur = this._vocabulary[this._currentIndex];
    if (!cur) return;

    // 如果题型未定 => 随机
    if (!this._questionType) {
      const rand = Math.floor(Math.random() * ALL_TYPES.length);
      this._questionType = ALL_TYPES[rand];
      this._detailVisible = this._questionType === "display";
      // 现在有了 questionType => 需要重新生成 distractors
      generateQuestionData(cur, this._vocabulary, this._questionType);
    }

    // 找到 headerComp
    const headerComp = this.shadowRoot.getElementById("header-comp");
    if (headerComp && typeof headerComp.setData === "function") {
      if (ALL_TYPES.includes(this._questionType)) {
        // 可能需要再次 refine => 以最终 questionType => 生成 distractors
        generateQuestionData(cur, this._vocabulary, this._questionType);

        headerComp.setData({
          word: cur.word || "",
          chineseDefinition: cur.chineseDefinition || "暂无中文释义",
          englishDefinition: cur.englishDefinition || "暂无英文释义",
          correctSynonym: cur.correctSynonym || "",
          correctAntonym: cur.correctAntonym || "",
          sentence: cur.sentence || "",
          correctWord: cur.correctWord || "",
          distractors: cur.distractors || [],
        });
      }
    }
  }

  // 组装 HTML
  getTemplate() {
    if (!this._vocabulary.length) {
      return `<div class="card-container">No Data</div>`;
    }
    const cur = this._vocabulary[this._currentIndex];
    const headerTemplate = this._getHeaderTemplate();
    const detailsClass = this._detailVisible ? "" : " hidden";

    // pos
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

    // toggleArrow
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

  // 生成 header template
  _getHeaderTemplate() {
    if (!this._questionType) {
      const rand = Math.floor(Math.random() * ALL_TYPES.length);
      this._questionType = ALL_TYPES[rand];
      this._detailVisible = this._questionType === "display";
    }
    if (ALL_TYPES.includes(this._questionType)) {
      if (this._questionType === "fill-in") {
        return `<fill-in-header id="header-comp"></fill-in-header>`;
      }
      if (this._questionType === "display") {
        return `<display-header id="header-comp"></display-header>`;
      }
      // 其余 => choice-header
      return `<choice-header id="header-comp" choice-type="${this._questionType}"></choice-header>`;
    }
    return `<div>[${this._questionType} placeholder]</div>`;
  }

  // DOM style
  _updateFontSizeProperty() {
    this._contentContainer.style.setProperty(
      "--letterFontSize",
      `${this._fontSize}px`
    );
  }

  // 点击事件
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
    // 现在任何类型都可点击展开/收起
    this._detailVisible = !this._detailVisible;
    this._detailsSection.classList.toggle("hidden", !this._detailVisible);
    const arrowContainer =
      this._contentContainer.querySelector(".expand-arrow");
    if (arrowContainer) {
      arrowContainer.innerHTML = this._detailVisible
        ? `<svg viewBox="0 0 24 24">
             <polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/>
           </svg>`
        : `<svg viewBox="0 0 24 24">
             <polyline points="6 9 12 15 18 9" stroke="white" stroke-width="2" fill="none"/>
           </svg>`;
    }
  }

  // 左右翻页
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
