// components/anki-card/anki-card.js
import "../card-header/fill-in-header/fill-in-header.js";
import "../card-header/display-header/display-header.js";

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // Load CSS only once
    if (!this.shadowRoot.querySelector('link[rel="stylesheet"]')) {
      const linkElem = document.createElement("link");
      linkElem.rel = "stylesheet";
      linkElem.href = "components/anki-card/anki-card.css";
      this.shadowRoot.appendChild(linkElem);
    }

    // Create a container for dynamic content
    this._contentContainer = document.createElement("div");
    this.shadowRoot.appendChild(this._contentContainer);

    // Data initialization
    this._vocabulary = [];
    this._currentIndex = 0;
    // For "display" type, details are shown; for others, hidden by default.
    this._detailVisible = true;
    this._currentExample = "";
    this._questionType = null; // "display" or "fill-in"

    // Cache for details section element (set after first render)
    this._detailsSection = null;

    // Initial font size (px) for dynamic sizing; actual font size is set via CSS custom property.
    this._fontSize = 32;

    // Bind our click handler once.
    this._handleClick = this._handleClick.bind(this);

    this.render();
  }

  connectedCallback() {
    // Bind events once using event delegation on the content container.
    this._contentContainer.addEventListener("click", this._handleClick);
  }

  setData(data) {
    if (data && Array.isArray(data.vocabulary)) {
      // Process vocabulary entries; support possible Chinese headers.
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
    // Reset question type; details visibility is determined by header type.
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
      // Update only the example sentence text
      const exampleEl =
        this._contentContainer.querySelector(".example-sentence");
      if (exampleEl) {
        exampleEl.textContent = this._currentExample;
      }
    }
  }

  // Choose header type randomly; available types: "display" and "fill-in"
  _getHeaderTemplate() {
    if (!this._questionType) {
      const types = ["display", "fill-in"];
      const rand = Math.floor(Math.random() * types.length);
      this._questionType = types[rand];
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
    // Convert part-of-speech to abbreviation
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

    // Determine the toggle arrow SVG based on details visibility:
    // When details are visible, arrow points up; when hidden, arrow points down.
    const toggleArrowSVG = this._detailVisible
      ? `<svg viewBox="0 0 24 24">
           <polyline points="6 15 12 9 18 15" stroke="white" stroke-width="2" fill="none"/>
         </svg>`
      : `<svg viewBox="0 0 24 24">
           <polyline points="6 9 12 15 18 9" stroke="white" stroke-width="2" fill="none"/>
         </svg>`;

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
        <!-- Details section -->
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
        <!-- Expand/Collapse toggle button -->
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
    // Update container content without re-binding events
    this._contentContainer.innerHTML = this.getTemplate();
    // Cache details section element for toggling
    this._detailsSection =
      this._contentContainer.querySelector("#details-section");
    this._updateFontSizeProperty();

    // Delegate header data update if needed
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
    // Submit button click
    const submitBtn = this._contentContainer.querySelector("#submit-btn");
    if (submitBtn && submitBtn.contains(target)) {
      const headerComp = this.shadowRoot.getElementById("header-comp");
      if (headerComp && typeof headerComp._triggerSubmit === "function") {
        headerComp._triggerSubmit();
      }
      return;
    }
    // Refresh button click
    const refreshBtn = this._contentContainer.querySelector("#refresh-btn");
    if (refreshBtn && refreshBtn.contains(target)) {
      this._questionType = null;
      this._detailVisible = false;
      this.render();
      this.dispatchEvent(
        new CustomEvent("refreshClicked", { bubbles: true, composed: true })
      );
      return;
    }
    // Toggle details
    const expandArea = this._contentContainer.querySelector("#expandMoreArea");
    if (expandArea && expandArea.contains(target)) {
      if (this._detailsSection) {
        this._detailVisible = !this._detailVisible;
        this._detailsSection.classList.toggle("hidden", !this._detailVisible);
        // Re-render only the toggle arrow part by forcing update of the expand arrow:
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
    // Example sentence click
    const exampleEl = this._contentContainer.querySelector(".example-sentence");
    if (exampleEl && exampleEl.contains(target)) {
      this._randomizeExample();
      return;
    }
  }

  connectedCallback() {
    this._contentContainer.addEventListener(
      "click",
      this._handleClick.bind(this)
    );
  }

  showPrev() {
    if (this._vocabulary.length <= 1) return;
    this._currentIndex =
      (this._currentIndex - 1 + this._vocabulary.length) %
      this._vocabulary.length;
    this._questionType = null;
    this.render();
  }

  showNext() {
    if (this._vocabulary.length <= 1) return;
    this._currentIndex = (this._currentIndex + 1) % this._vocabulary.length;
    this._questionType = null;
    this.render();
  }
}

customElements.define("anki-card", AnkiCard);
