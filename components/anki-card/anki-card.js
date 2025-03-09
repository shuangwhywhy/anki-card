// components/anki-card/anki-card.js
import "../round-icon-button/round-icon-button.js";

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._vocabulary = [];
    this._currentIndex = 0;
    this._detailVisible = true;
    this.render();
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      this._vocabulary = data.vocabulary;
      this._currentIndex = 0;
      console.log(
        "anki-card received array, length =",
        this._vocabulary.length
      );
    } else if (data && data.word) {
      this._vocabulary = [data];
      this._currentIndex = 0;
      console.log("anki-card received single word");
    } else {
      console.warn("anki-card setData: no valid vocabulary");
      this._vocabulary = [];
      this._currentIndex = 0;
    }
    this._detailVisible = true;
    this.render();
  }

  getTemplate() {
    if (this._vocabulary.length === 0) {
      // 不显示任何空态
      return `<div class="card-container"></div>`;
    }

    const currentWord = this._vocabulary[this._currentIndex] || {};
    const word = currentWord.word || "???";
    const phonetic = currentWord.phonetic || "";
    const pos = currentWord.pos || "";
    const cdef = currentWord.chineseDefinition || "";
    const edef = currentWord.englishDefinition || "";
    const synonyms = currentWord.synonym || [];
    const antonyms = currentWord.antonym || [];
    const sents = currentWord.sentences || [];
    const example = Array.isArray(sents) ? sents[0] || "" : sents;

    const detailClass = this._detailVisible ? "" : " hidden";

    return `
      <link rel="stylesheet" href="components/anki-card/anki-card.css">
      <div class="card-container">
        <div class="word-section">${word}</div>
        <div class="nav-buttons">
          <round-icon-button 
            id="btn-prev"
            class="prev"
            label="上一条"
            icon='<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="white" stroke-width="2" fill="none"/></svg>'
          ></round-icon-button>
          <round-icon-button 
            id="btn-next"
            class="next"
            label="下一条"
            icon='<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="white" stroke-width="2" fill="none"/></svg>'
          ></round-icon-button>
        </div>
        <round-icon-button
          id="btn-refresh"
          class="refresh"
          label="刷新"
          icon='<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" stroke="white" stroke-width="2" fill="none"/><polyline points="1 20 1 14 7 14" stroke="white" stroke-width="2" fill="none"/><line x1="3.51" y1="9.4" x2="9.93" y2="14.17" stroke="white" stroke-width="2" fill="none"/><line x1="16.57" y1="9.44" x2="22.49" y2="14.14" stroke="white" stroke-width="2" fill="none"/></svg>'
        ></round-icon-button>

        <div id="details-section" class="details-section${detailClass}">
          <div class="detail-row inline" style="margin-top:2px;">
            <span class="phonetic">${phonetic}</span>
            <span class="pos">${pos}</span>
          </div>
          <div class="detail-row definition-cn" style="margin-top:24px;">
            ${cdef}
          </div>
          <div class="detail-row definition-en" style="margin-top:8px;">
            ${edef}
          </div>
          <div class="synonyms-row" style="margin-top:24px;">
            <span class="synonyms-label">近义词：</span>
            <span class="synonyms">${
              Array.isArray(synonyms) ? synonyms.join(" ") : synonyms
            }</span>
          </div>
          <div class="antonyms-row" style="margin-top:8px;">
            <span class="antonyms-label">反义词：</span>
            <span class="antonyms">${
              Array.isArray(antonyms) ? antonyms.join(" ") : antonyms
            }</span>
          </div>
          <div class="examples" style="margin-top:20px;">
            <div class="label">例句：</div>
            <div class="example-sentence">${example}</div>
          </div>
        </div>
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
    const btnPrev = this.shadowRoot.getElementById("btn-prev");
    if (btnPrev) {
      btnPrev.addEventListener("roundButtonClick", () => this.showPrev());
    }
    const btnNext = this.shadowRoot.getElementById("btn-next");
    if (btnNext) {
      btnNext.addEventListener("roundButtonClick", () => this.showNext());
    }
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
    const expandArea = this.shadowRoot.getElementById("expandMoreArea");
    if (expandArea) {
      expandArea.addEventListener("click", () => {
        this._detailVisible = !this._detailVisible;
        this.render();
      });
    }
  }

  showPrev() {
    if (this._vocabulary.length <= 1) return;
    this._currentIndex--;
    if (this._currentIndex < 0) {
      this._currentIndex = this._vocabulary.length - 1;
    }
    this.render();
  }

  showNext() {
    if (this._vocabulary.length <= 1) return;
    this._currentIndex++;
    if (this._currentIndex >= this._vocabulary.length) {
      this._currentIndex = 0;
    }
    this.render();
  }

  hideDetails() {
    this._detailVisible = false;
    this.render();
  }
}

customElements.define("anki-card", AnkiCard);
