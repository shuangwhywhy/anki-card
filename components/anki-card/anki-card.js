// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";
import "../card-header/choice-header/choice-header.js";

import {
  ALL_TYPES,
  generateQuestionData,
  getNextQuestionType,
} from "../../helpers/generate-question-data.js";
import {
  updateShowCount,
  updateDisplayDuration,
  addHistoryRecord,
  addVocabulary,
  updateMyScore,
  updateMyScoreDisplay,
} from "../../db.js";

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.rel = "stylesheet";
      linkElem.href = "components/anki-card/anki-card.css";
      this.shadowRoot.appendChild(linkElem);
    }
    this._contentContainer = document.createElement("div");
    this._contentContainer.className = "card-wrapper";
    this.shadowRoot.appendChild(this._contentContainer);

    this._vocabulary = [];
    this._currentIndex = 0;
    this._detailVisible = true;
    this._currentExample = "";
    this._questionType = null;

    this._detailsSection = null;
    this._fontSize = 32;

    this.displayTimer = {
      startTime: null,
      accumulatedTime: 0,
    };

    this.pendingDisplayIncrement = 0;
    this._debounceTimer = null;

    this.cardState = {
      vocabulary: this._vocabulary,
      currentIndex: this._currentIndex,
    };
    this.stateProxy = new Proxy(this.cardState, {
      set: (target, prop, value) => {
        if (prop === "vocabulary" || prop === "currentIndex") {
          this._flushDisplayDuration();
          this._updateMyScoreDisplayDebounced();
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

    this.detailProxy = new Proxy(
      { _detailVisible: this._detailVisible },
      {
        set: (target, prop, value) => {
          if (prop === "_detailVisible") {
            if (value === true && target[prop] === false) {
              this.displayTimer.startTime = Date.now();
            } else if (value === false && target[prop] === true) {
              if (this.displayTimer.startTime) {
                const elapsed = Date.now() - this.displayTimer.startTime;
                this.displayTimer.accumulatedTime += elapsed;
                this.displayTimer.startTime = null;
                console.log(
                  "[anki] displayTimer",
                  JSON.stringify(this.displayTimer)
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

    this.render();
    this.shadowRoot.addEventListener("answerUpdated", (e) =>
      this._handleRecordAnswer(e)
    );
  }

  connectedCallback() {
    this._contentContainer.addEventListener(
      "click",
      this._handleClick.bind(this)
    );
    // 绑定菜单上删除所有词汇的按钮（假设全局页面中该按钮 id 为 "delete-all-btn"）
    const deleteBtn = document.getElementById("delete-all-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (confirm("确定要清空所有词汇吗？")) {
          try {
            await import("../../db.js").then((module) =>
              module.deleteAllVocabulary()
            );
            console.log("所有词汇已删除");
            this._vocabulary = [];
            this.render();
          } catch (err) {
            console.error("删除所有词汇失败", err);
          }
        }
      });
    }
  }

  disconnectedCallback() {
    this._flushDisplayDuration();
    if (this.pendingDisplayIncrement > 0) {
      const cur = this._vocabulary[this._currentIndex];
      if (cur && cur.word && this._questionType) {
        updateMyScoreDisplay(
          cur.word,
          this._questionType,
          this.pendingDisplayIncrement
        )
          .then(() => {
            console.log(
              `Final myScore display updated for ${cur.word} on ${this._questionType} by ${this.pendingDisplayIncrement}`
            );
            this.pendingDisplayIncrement = 0;
          })
          .catch((err) =>
            console.error("Final updateMyScoreDisplay error", err)
          );
      }
    }
  }

  setCardWord(index) {
    this.stateProxy.currentIndex = index;
    this._questionType = null;
    const cur = this._vocabulary[index];
    if (cur && cur.word) {
      localStorage.setItem(cur.word, JSON.stringify({ state: "init" }));
      this._questionType = getNextQuestionType(cur, false);
    }
    if (cur.sentences?.length) {
      this._currentExample = cur.sentences[0] || "";
    }
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      this.stateProxy.vocabulary = data.vocabulary;
    } else if (data && data.word) {
      this.stateProxy.vocabulary = [data];
    } else {
      this.stateProxy.vocabulary = [];
    }
    console.log("anki-card setData => array", this._vocabulary);
    this.setCardWord(0);
    this.render();
  }

  render() {
    this._contentContainer.innerHTML = this.getTemplate();
    this._detailsSection =
      this._contentContainer.querySelector("#details-section");
    this._updateFontSizeProperty();
    const cur = this._vocabulary[this._currentIndex];
    if (!cur) return;
    updateShowCount(cur.word, 1).catch((err) =>
      console.error("更新 showCount 失败", err)
    );
    this.pendingDisplayIncrement = (this.pendingDisplayIncrement || 0) + 1;
    this._updateMyScoreDisplayDebounced();
    if (!this._questionType) {
      this._questionType = getNextQuestionType(cur, false);
      this.detailProxy._detailVisible = this._questionType === "display";
      this._detailVisible = this.detailProxy._detailVisible;
    }
    if (ALL_TYPES.includes(this._questionType)) {
      const questionData = generateQuestionData(
        this._vocabulary,
        this._questionType,
        cur
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
              ? `<div class="synonyms-row">
                 <span class="synonyms-label">近义词：</span>
                 <span class="synonyms">${cur.synonym.join(", ")}</span>
               </div>`
              : ""
          }
          ${
            cur.antonym && cur.antonym.length > 0
              ? `<div class="antonyms-row">
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
      const cur = this._vocabulary[this._currentIndex];
      this._questionType = getNextQuestionType(cur, false);
    }
    this.detailProxy._detailVisible = this._questionType === "display";
    this._detailVisible = this.detailProxy._detailVisible;
    if (ALL_TYPES.includes(this._questionType)) {
      if (this._questionType === "fill-in") {
        return `<fill-in-header id="header-comp"></fill-in-header>`;
      }
      if (this._questionType === "display") {
        return `<display-header id="header-comp"></display-header>`;
      }
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
    const cur = this._vocabulary[this._currentIndex];
    if (cur) {
      this._questionType = getNextQuestionType(cur, true);
      this.detailProxy._detailVisible = this._questionType === "display";
      this._detailVisible = this.detailProxy._detailVisible;
      const questionData = generateQuestionData(
        this._vocabulary,
        this._questionType,
        cur
      );
      const headerComp = this.shadowRoot.getElementById("header-comp");
      const expectedTag = this._getHeaderTemplate();
      if (headerComp) {
        if (headerComp.tagName.toLowerCase() !== expectedTag) {
          this.render();
        } else {
          headerComp.setData(questionData);
        }
      } else {
        this.render();
      }
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

  async _flushDisplayDuration() {
    if (this.detailProxy._detailVisible && this.displayTimer.startTime) {
      const elapsed = Date.now() - this.displayTimer.startTime;
      this.displayTimer.accumulatedTime += elapsed;
      this.detailProxy._detailVisible = false;
      this._detailVisible = false;
      if (this._detailsSection) {
        this._detailsSection.classList.add("hidden");
      }
      this.displayTimer.startTime = null;
      console.log(
        "[anki] word changed, previous not finished",
        JSON.stringify(this.displayTimer)
      );
    }
    if (this.displayTimer.accumulatedTime > 0) {
      try {
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
    this.displayTimer.accumulatedTime = 0;
  }

  _updateMyScoreDisplayDebounced() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      const cur = this._vocabulary[this._currentIndex];
      if (cur && cur.word && this._questionType) {
        updateMyScoreDisplay(
          cur.word,
          this._questionType,
          this.pendingDisplayIncrement
        )
          .then(() => {
            console.log(
              `[anki] Debounced myScore display count updated for ${cur.word} on ${this._questionType} by ${this.pendingDisplayIncrement}`
            );
            this.pendingDisplayIncrement = 0;
          })
          .catch((err) =>
            console.error("[anki] Debounced updateMyScoreDisplay error", err)
          );
      }
      this._debounceTimer = null;
    }, 500);
  }

  async changeCard(index, direction) {
    if (this._vocabulary.length <= 1) return;
    await this._flushDisplayDuration();
    this._updateMyScoreDisplayDebounced();
    const cardEl = this._contentContainer.querySelector(".card-container");
    if (cardEl) {
      cardEl.style.transition = "transform 0.3s ease";
      cardEl.style.transform = `rotateY(${direction > 0 ? "" : "-"}90deg)`;
      setTimeout(() => {
        this.setCardWord(index);
        this.render();
        cardEl.style.transform = "rotateY(0deg)";
      }, 150);
    } else {
      this.setCardWord(index);
      this.render();
    }
  }

  async showPrev() {
    await this.changeCard(
      (this._currentIndex - 1 + this._vocabulary.length) %
        this._vocabulary.length,
      -1
    );
  }

  async showNext() {
    await this.changeCard(
      (this._currentIndex + 1 + this._vocabulary.length) %
        this._vocabulary.length,
      1
    );
  }

  async _handleRecordAnswer(e) {
    const record = e.detail;
    if (!record) return;
    try {
      await addHistoryRecord(record);
      console.log("答题记录已保存", record);
      let wordKey = null;
      if (record.vocabulary && record.vocabulary.word) {
        wordKey = record.vocabulary.word;
      } else if (
        this._vocabulary[this._currentIndex] &&
        this._vocabulary[this._currentIndex].word
      ) {
        wordKey = this._vocabulary[this._currentIndex].word;
      }
      if (!wordKey) {
        throw new Error(
          "Fatal Error: 缺少有效的 vocabulary.word。\nrecord.vocabulary: " +
            JSON.stringify(record.vocabulary) +
            "\n当前卡片: " +
            JSON.stringify(this._vocabulary[this._currentIndex])
        );
      }
      if (
        !record.questionData ||
        !record.questionData.questionType ||
        typeof record.isCorrect !== "boolean"
      ) {
        throw new Error(
          "Fatal Error: 更新 myScore 所需的必要信息缺失。\nrecord.questionData: " +
            JSON.stringify(record.questionData) +
            "\nrecord.isCorrect: " +
            record.isCorrect
        );
      }
      await updateMyScore(
        wordKey,
        record.questionData.questionType,
        record.isCorrect
      );
      console.log(
        `myScore updated for ${wordKey} on ${record.questionData.questionType}`
      );
    } catch (err) {
      console.error(
        "保存答题记录失败，详细调试信息：",
        err,
        "\nRecord详细信息：" + JSON.stringify(record)
      );
      throw err;
    }
  }
}

customElements.define("anki-card", AnkiCard);
