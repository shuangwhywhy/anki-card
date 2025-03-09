// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // 添加 CSS 链接，仅添加一次
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.setAttribute("rel", "stylesheet");
      linkElem.setAttribute("href", "components/anki-card/anki-card.css");
      this.shadowRoot.appendChild(linkElem);
    }

    // 创建一个固定的容器用于更新动态内容，不清空整个 shadowRoot
    this._contentContainer = document.createElement("div");
    this.shadowRoot.appendChild(this._contentContainer);

    // 数据相关
    this._vocabulary = [];
    this._currentIndex = 0;
    // 默认根据题型初始化详情显示状态，在 setData() 内会根据题型设置
    this._detailVisible = true;
    this._currentExample = "";
    this._questionType = null; // 题型

    this.render();
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      // 遍历词条，兼容可能的中文表头
      this._vocabulary = this._shuffle(data.vocabulary).map((item) => {
        return {
          ...item,
          chineseDefinition:
            item.chineseDefinition || item["中文释义"] || "暂无中文释义",
          englishDefinition:
            item.englishDefinition || item["英文释义"] || "暂无英文释义",
        };
      });
      this._currentIndex = 0;
      if (this._vocabulary[0].sentences?.length) {
        this._currentExample = this._vocabulary[0].sentences[0] || "";
      }
      console.log(
        "anki-card setData => array, length =",
        this._vocabulary.length
      );
    } else if (data && data.word) {
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
    // 重置题型和详情显示状态
    this._questionType = null;
    this.render();
  }

  _shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  _randomizeExample() {
    const cur = this._vocabulary[this._currentIndex];
    if (cur?.sentences?.length) {
      const idx = Math.floor(Math.random() * cur.sentences.length);
      this._currentExample = cur.sentences[idx];
      this.render();
    }
  }

  // 随机选择题型，扩展题型数组包含 "display" 与其他
  _getHeaderTemplate() {
    if (!this._questionType) {
      const types = ["display", "fill-in"]; // 可扩展更多题型
      const rand = Math.floor(Math.random() * types.length);
      this._questionType = types[rand];
      // 根据题型设置详情区域默认显示状态：display 默认展开，其它默认隐藏
      this._detailVisible = this._questionType === "display";
    }
    if (this._questionType === "fill-in") {
      return `<fill-in-header id="header-comp"></fill-in-header>`;
    } else if (this._questionType === "display") {
      return `<display-header id="header-comp"></display-header>`;
    } else {
      return `<div>[${this._questionType} placeholder]</div>`;
    }
  }

  getTemplate() {
    if (!this._vocabulary.length) {
      return `<div class="card-container">No Data</div>`;
    }
    const cur = this._vocabulary[this._currentIndex];

    // 词性缩写逻辑：转换 pos 为简写
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
    const detailClass = this._detailVisible ? "" : " hidden";

    // anki-card 仅渲染 header（由各 header 组件自行展示单词等）、
    // 刷新按钮、详情区域（释义、近反义词、例句等）
    return `
      <div class="card-container">
        <!-- Header 组件：由具体题型决定显示内容 -->
        <div class="card-header">
          ${headerTemplate}
        </div>
        <!-- 刷新按钮 -->
        <div class="card-refresh-btn" id="refresh-btn">
          <div class="icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6a6 6 0 016 6 6 6 0 01-6 6 6 6 0 01-5.65-4H4.26A8 8 0 0012 20a8 8 0 000-16z"/>
            </svg>
          </div>
        </div>
        <!-- 详情区域：释义、近反义词、例句 -->
        <div id="details-section" class="details-section${detailClass}">
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
            <svg viewBox="0 0 24 24">
              <polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    this._contentContainer.innerHTML = this.getTemplate();
    this.bindEvents();

    // 如果题型为 fill-in 或 display，则将当前单词数据传给 header 组件
    if (this._questionType === "fill-in" || this._questionType === "display") {
      const headerComp = this.shadowRoot.getElementById("header-comp");
      if (headerComp && typeof headerComp.setData === "function") {
        const cur = this._vocabulary[this._currentIndex];
        headerComp.setData({
          word: cur.word || "",
          chineseDefinition: cur.chineseDefinition || "暂无中文释义",
          englishDefinition: cur.englishDefinition || "暂无英文释义",
        });
      }
    }
  }

  bindEvents() {
    const refreshBtn = this.shadowRoot.getElementById("refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this._questionType = null;
        this.hideDetails();
        this.dispatchEvent(
          new CustomEvent("refreshClicked", { bubbles: true, composed: true })
        );
      });
    }
    const expandArea = this.shadowRoot.getElementById("expandMoreArea");
    if (expandArea) {
      expandArea.addEventListener("click", () => {
        this._detailVisible = true;
        this.render();
      });
    }
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

  showPrev() {
    if (this._vocabulary.length <= 1) return;
    this._currentIndex--;
    if (this._currentIndex < 0) {
      this._currentIndex = this._vocabulary.length - 1;
    }
    this._questionType = null;
    this.render();
  }

  showNext() {
    if (this._vocabulary.length <= 1) return;
    this._currentIndex++;
    if (this._currentIndex >= this._vocabulary.length) {
      this._currentIndex = 0;
    }
    this._questionType = null;
    this.render();
  }
}

customElements.define("anki-card", AnkiCard);
