// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";

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

    // 创建用于动态更新内容的容器
    this._contentContainer = document.createElement("div");
    this.shadowRoot.appendChild(this._contentContainer);

    // 数据初始化
    this._vocabulary = [];
    this._currentIndex = 0;
    // 对于 "display" 题型，详情区默认展开；其他题型，默认隐藏
    this._detailVisible = true;
    this._currentExample = "";
    this._questionType = null; // "display" 或 "fill-in"

    // 缓存详情区元素（第一次 render 后设置）
    this._detailsSection = null;

    // 初始字号（px），实际字号由 CSS 自定义属性控制
    this._fontSize = 32;

    // 初次渲染
    this.render();
  }

  connectedCallback() {
    // 使用事件委托绑定点击事件（只绑定一次）
    this._contentContainer.addEventListener(
      "click",
      this._handleClick.bind(this)
    );
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      // 处理词汇数据，兼容中文表头
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
    // 重置题型；详情显示状态由题型决定
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
      // 仅更新例句文本，避免全量重绘
      const exampleEl =
        this._contentContainer.querySelector(".example-sentence");
      if (exampleEl) {
        exampleEl.textContent = this._currentExample;
      }
    }
  }

  // 随机选择题型，支持 "display" 和 "fill-in"
  _getHeaderTemplate() {
    if (!this._questionType) {
      const types = ["display", "fill-in"];
      const rand = Math.floor(Math.random() * types.length);
      this._questionType = types[rand];
      // 对于 display 题型，详情区默认展开；其他题型默认隐藏
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
    // 将词性转换为简写
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

    // Toggle 箭头，根据详情区显示状态变化
    const toggleArrowSVG = this._detailVisible
      ? `<svg viewBox="0 0 24 24">
           <polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/>
         </svg>`
      : `<svg viewBox="0 0 24 24">
           <polyline points="6 9 12 15 18 9" stroke="white" stroke-width="2" fill="none"/>
         </svg>`;

    return `
      <div class="card-container">
        <!-- Header组件，由各自header文件处理提交等逻辑 -->
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
        <!-- 详情区域 -->
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
        <!-- 详情切换按钮 -->
        <div class="expand-more" id="expandMoreArea">
          <div class="expand-line"></div>
          <div class="expand-arrow">
            ${toggleArrowSVG}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    // 使用 getTemplate() 更新内容
    this._contentContainer.innerHTML = this.getTemplate();
    // 缓存详情区域元素以便后续切换
    this._detailsSection =
      this._contentContainer.querySelector("#details-section");
    this._updateFontSizeProperty();

    // 如果题型为 fill-in 或 display，则传递当前单词数据给 header 组件
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

  _updateFontSizeProperty() {
    this._contentContainer.style.setProperty(
      "--letterFontSize",
      `${this._fontSize}px`
    );
  }

  _handleClick(event) {
    const target = event.target;
    // 刷新按钮点击
    const refreshBtn = this._contentContainer.querySelector("#refresh-btn");
    if (refreshBtn && refreshBtn.contains(target)) {
      const headerContainer =
        this._contentContainer.querySelector(".card-header");
      if (headerContainer) {
        headerContainer.classList.add("fade-out");
        setTimeout(() => {
          // 如果当前 header 为 display，则切换到 fill-in；否则切换到 display
          if (this._questionType === "display") {
            this._questionType = "fill-in";
            this._detailVisible = false;
          } else {
            this._questionType = "display";
            this._detailVisible = true;
          }
          this.render();
          this.dispatchEvent(
            new CustomEvent("refreshClicked", { bubbles: true, composed: true })
          );
        }, 300);
      } else {
        // 若未找到 headerContainer，则直接切换
        if (this._questionType === "display") {
          this._questionType = "fill-in";
          this._detailVisible = false;
        } else {
          this._questionType = "display";
          this._detailVisible = true;
        }
        this.render();
        this.dispatchEvent(
          new CustomEvent("refreshClicked", { bubbles: true, composed: true })
        );
      }
      return;
    }
    // 切换详情按钮点击
    const expandArea = this._contentContainer.querySelector("#expandMoreArea");
    if (expandArea && expandArea.contains(target)) {
      if (this._detailsSection) {
        this._detailVisible = !this._detailVisible;
        this._detailsSection.classList.toggle("hidden", !this._detailVisible);
        // 同时更新箭头方向
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
      return;
    }
    // 例句点击切换
    const exampleEl = this._contentContainer.querySelector(".example-sentence");
    if (exampleEl && exampleEl.contains(target)) {
      this._randomizeExample();
      return;
    }
  }

  /**
   * 新增：切换卡片时渐隐过渡
   * 先为 .card-container 添加 fade-out，动画结束后再切换 index 并 render
   */
  showPrev() {
    if (this._vocabulary.length <= 1) return;
    const cardContainer =
      this._contentContainer.querySelector(".card-container");
    if (cardContainer) {
      cardContainer.classList.add("fade-out");
      setTimeout(() => {
        this._currentIndex =
          (this._currentIndex - 1 + this._vocabulary.length) %
          this._vocabulary.length;
        this._questionType = null;
        this.render();
        // 渲染后移除 fade-out
        const newCardContainer =
          this._contentContainer.querySelector(".card-container");
        if (newCardContainer) {
          newCardContainer.classList.remove("fade-out");
        }
      }, 300);
    } else {
      // 如果未找到 cardContainer，直接切换
      this._currentIndex =
        (this._currentIndex - 1 + this._vocabulary.length) %
        this._vocabulary.length;
      this._questionType = null;
      this.render();
    }
  }

  showNext() {
    if (this._vocabulary.length <= 1) return;
    const cardContainer =
      this._contentContainer.querySelector(".card-container");
    if (cardContainer) {
      cardContainer.classList.add("fade-out");
      setTimeout(() => {
        this._currentIndex = (this._currentIndex + 1) % this._vocabulary.length;
        this._questionType = null;
        this.render();
        // 渲染后移除 fade-out
        const newCardContainer =
          this._contentContainer.querySelector(".card-container");
        if (newCardContainer) {
          newCardContainer.classList.remove("fade-out");
        }
      }, 300);
    } else {
      // 如果未找到 cardContainer，直接切换
      this._currentIndex = (this._currentIndex + 1) % this._vocabulary.length;
      this._questionType = null;
      this.render();
    }
  }
}

customElements.define("anki-card", AnkiCard);
