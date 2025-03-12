// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";
import "../card-header/choice-header/choice-header.js";

// 更新：引入新的 helper 方法（文件名：generate-question-data.js）
import {
  ALL_TYPES,
  generateQuestionData,
} from "../../helpers/generate-question-data.js";
// 引入数据库接口，用于更新展示次数、记录答题记录及累计展示时长
import {
  updateShowCount,
  updateDisplayDuration,
  addHistoryRecord,
  addVocabulary,
} from "../../db.js";

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

    // 新增：计时器变量，记录详情区展示时长（单位：毫秒）
    this.displayTimer = {
      startTime: null, // 展开详情时的起始时间
      accumulatedTime: 0, // 当前卡片累计展示时长
    };

    // 新增：使用 Proxy 监听当前词汇数据和索引的变化
    this.cardState = {
      vocabulary: this._vocabulary,
      currentIndex: this._currentIndex,
    };
    this.stateProxy = new Proxy(this.cardState, {
      set: (target, prop, value) => {
        if (prop === "vocabulary" || prop === "currentIndex") {
          // 在更新前先刷新当前累计展示时长
          this._flushDisplayDuration();
        }
        target[prop] = value;
        if (prop === "vocabulary") {
          this._vocabulary = value;
        } else if (prop === "currentIndex") {
          this._currentIndex = value;
        }
        return true;
      },
    });

    // 新增：使用 Proxy 监听 _detailVisible 的变化（避免与原有逻辑耦合）
    this.detailProxy = new Proxy(
      { _detailVisible: this._detailVisible },
      {
        set: (target, prop, value) => {
          if (prop === "_detailVisible") {
            // detail 展开时记录起始时间
            if (value === true && target[prop] === false) {
              this.displayTimer.startTime = Date.now();
            }
            // detail 关闭时仅记录时间，不更新数据库（更新操作放到卡片换词时进行）
            else if (value === false && target[prop] === true) {
              if (this.displayTimer.startTime) {
                const elapsed = Date.now() - this.displayTimer.startTime;
                this.displayTimer.accumulatedTime += elapsed;
                this.displayTimer.startTime = null;
                console.log(
                  "[anki] displayTimer",
                  JSON.parse(JSON.stringify(this.displayTimer))
                );
              }
            }
            target[prop] = value;
            return true;
          }
          target[prop] = value;
          return true;
        },
      }
    );

    // 首次渲染
    this.render();

    // 统一监听 header 组件发出的答题记录事件
    this.shadowRoot.addEventListener("answerUpdated", (e) =>
      this._handleRecordAnswer(e)
    );
  }

  connectedCallback() {
    this._contentContainer.addEventListener(
      "click",
      this._handleClick.bind(this)
    );
  }

  disconnectedCallback() {
    // 当组件卸载前，立即更新数据库
    this._flushDisplayDuration();
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      // 多个词条
      this.stateProxy.vocabulary = data.vocabulary;
      this.stateProxy.currentIndex = 0;
      if (data.vocabulary[0].sentences?.length) {
        this._currentExample = data.vocabulary[0].sentences[0] || "";
      }
      console.log(
        "anki-card setData => array, length =",
        data.vocabulary.length
      );
    } else if (data && data.word) {
      // 单个词条
      this.stateProxy.vocabulary = [data];
      this.stateProxy.currentIndex = 0;
      if (data.sentences?.length) {
        this._currentExample = data.sentences[0];
      }
      console.log("anki-card setData => single word object");
    } else {
      this.stateProxy.vocabulary = [];
      this.stateProxy.currentIndex = 0;
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

    // 更新当前词的展示次数（异步更新，不阻塞界面）
    updateShowCount(cur.word, 1).catch((err) =>
      console.error("更新 showCount 失败", err)
    );

    // 如果题型未定，则随机选择
    if (!this._questionType) {
      const rand = Math.floor(Math.random() * ALL_TYPES.length);
      this._questionType = ALL_TYPES[rand];
      // 使用 Proxy 初始化 _detailVisible 状态：仅 display 题型默认展开详情
      this.detailProxy._detailVisible = this._questionType === "display";
      this._detailVisible = this.detailProxy._detailVisible;
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
    this.detailProxy._detailVisible = this._questionType === "display";
    this._detailVisible = this.detailProxy._detailVisible;

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

  _toggleDetails() {
    if (!this._detailsSection) return;
    // 仅切换详情区显示状态及视觉效果，不更新数据库
    this.detailProxy._detailVisible = !this.detailProxy._detailVisible;
    this._detailVisible = this.detailProxy._detailVisible;
    this._detailsSection.classList.toggle("hidden", !this._detailVisible);
    const arrowContainer =
      this._contentContainer.querySelector(".expand-arrow");
    if (arrowContainer) {
      arrowContainer.innerHTML = this._detailVisible
        ? `<svg viewBox="0 0 24 24"><polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/></svg>`
        : `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" stroke="white" stroke-width="2" fill="none"/></svg>`;
    }
  }

  _refresh() {
    // 基于当前词重新生成题目，不改变当前索引；同样适用于“刷新当前词汇集”
    const cur = this._vocabulary[this._currentIndex];
    if (cur) {
      let newType;
      do {
        newType = ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
      } while (newType === this._questionType);
      this._questionType = newType;
      this.detailProxy._detailVisible = newType === "display";
      this._detailVisible = this.detailProxy._detailVisible;
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

  async _flushDisplayDuration() {
    // 如果详情区仍处于展开状态，则先计算当前时长
    if (this.detailProxy._detailVisible && this.displayTimer.startTime) {
      const elapsed = Date.now() - this.displayTimer.startTime;
      this.displayTimer.accumulatedTime += elapsed;
      // 将详情区状态置为关闭（但不改变视觉效果，由卡片切换时 render 刷新）
      this.detailProxy._detailVisible = false;
      this._detailVisible = false;
      if (this._detailsSection) {
        this._detailsSection.classList.add("hidden");
      }
      this.displayTimer.startTime = null;
      console.log(
        "[anki] word changed, previous not finished",
        JSON.parse(JSON.stringify(this.displayTimer))
      );
    }
    // 若有累计时长，立即更新数据库
    if (this.displayTimer.accumulatedTime > 0) {
      try {
        console.log(
          "[anki] updating displayTime",
          JSON.parse(JSON.stringify(this.displayTimer))
        );
        await updateDisplayDuration(
          this._vocabulary[this._currentIndex].word,
          this.displayTimer.accumulatedTime
        );
        console.log(
          `Updated display duration for ${
            this._vocabulary[this._currentIndex].word
          } by ${this.displayTimer.accumulatedTime} ms`
        );
      } catch (err) {
        console.error("Error updating display duration:", err);
      }
    }
    // 重置计时器
    this.displayTimer.accumulatedTime = 0;
  }

  async showPrev() {
    if (this._vocabulary.length <= 1) return;
    // 在切换前立即更新数据库
    await this._flushDisplayDuration();
    // 左右切换：采用绕 Y 轴旋转 90° 效果，并在中途更新内容
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (cardEl) {
      cardEl.style.transition = "transform 0.3s ease";
      cardEl.style.transform = "rotateY(90deg)";
      setTimeout(() => {
        this.stateProxy.currentIndex =
          (this._currentIndex - 1 + this._vocabulary.length) %
          this._vocabulary.length;
        // 更新新题数据，并让新内容立刻显示
        this._questionType = null;
        this.render();
        // 完成旋转回正
        cardEl.style.transform = "rotateY(0deg)";
      }, 150);
    } else {
      this.stateProxy.currentIndex =
        (this._currentIndex - 1 + this._vocabulary.length) %
        this._vocabulary.length;
      this._questionType = null;
      this.render();
    }
  }

  async showNext() {
    if (this._vocabulary.length <= 1) return;
    // 在切换前立即更新数据库
    await this._flushDisplayDuration();
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (cardEl) {
      cardEl.style.transition = "transform 0.3s ease";
      cardEl.style.transform = "rotateY(90deg)";
      setTimeout(() => {
        this.stateProxy.currentIndex =
          (this._currentIndex + 1) % this._vocabulary.length;
        this._questionType = null;
        this.render();
        cardEl.style.transform = "rotateY(0deg)";
      }, 150);
    } else {
      this.stateProxy.currentIndex =
        (this._currentIndex + 1) % this._vocabulary.length;
      this._questionType = null;
      this.render();
    }
  }

  /**
   * 统一处理 header 组件派发的答题记录事件
   * header 组件应在答题后通过事件向上抛出 recordAnswer 事件，事件 detail 包含完整记录数据
   */
  async _handleRecordAnswer(e) {
    // e.detail 包含答题记录数据，要求的字段：vocabulary、questionData、answer、isCorrect、answerTime、
    // correctCountBefore、errorCountBefore、currentShowCount
    const record = e.detail;
    if (!record) return;
    // 同时更新当前 vocabulary 记录（例如：累积正确/错误次数），这里假设 header 组件已经传来记录前的计数
    try {
      await addHistoryRecord(record);
      console.log("答题记录已保存", record);
    } catch (err) {
      console.error("保存答题记录失败", err);
    }
  }
}

customElements.define("anki-card", AnkiCard);
