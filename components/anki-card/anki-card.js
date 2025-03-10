// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Add CSS link only once
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.setAttribute("rel", "stylesheet");
      linkElem.setAttribute("href", "components/anki-card/anki-card.css");
      this.shadowRoot.appendChild(linkElem);
    }

    // Create a fixed container for dynamic updates (without clearing the entire shadowRoot)
    this._contentContainer = document.createElement("div");
    this.shadowRoot.appendChild(this._contentContainer);

    // Data related
    this._vocabulary = [];
    this._currentIndex = 0;
    // Details area visibility; for "display" type, details are shown, for others, hidden by default.
    this._detailVisible = true;
    this._currentExample = "";
    this._questionType = null; // question type

    this.render();
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      // Process vocabulary entries; support possible Chinese headers
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
    // Reset question type and details visibility
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

  // Randomly choose question type; available types: "display" and "fill-in"
  _getHeaderTemplate() {
    if (!this._questionType) {
      const types = ["display", "fill-in"];
      const rand = Math.floor(Math.random() * types.length);
      this._questionType = types[rand];
      // For "display", details are shown; for others, hidden by default.
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

    // Convert pos to abbreviation using a mapping
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

    return `
      <div class="card-container">
        <!-- Header component: content depends on question type -->
        <div class="card-header">
          ${headerTemplate}
        </div>
        <!-- Refresh button -->
        <div class="card-refresh-btn" id="refresh-btn">
          <div class="icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6a6 6 0 016 6 6 6 0 01-6 6 6 6 0 01-5.65-4H4.26A8 8 0 0012 20a8 8 0 000-16z"/>
            </svg>
          </div>
        </div>
        <!-- Details area: definitions, synonyms, antonyms, example sentence -->
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
        <!-- Toggle details button -->
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

    // If question type is fill-in or display, pass current word data to header component
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
      // Toggle details area on click (fixed to toggle instead of always showing)
      expandArea.addEventListener("click", () => {
        this._detailVisible = !this._detailVisible;
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
