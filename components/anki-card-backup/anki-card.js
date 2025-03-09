// components/anki-card/anki-card.js
import "../round-icon-button/round-icon-button.js"; // 根据实际路径引入

class AnkiCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // MVVM 数据模型：默认示例数据，超长单词作为示例
    this._vm = {
      word: "Supercalifragilisticexpialidocious",
      phonetic: "/ˌsuːpərˌkælɪˌfrædʒɪˌlɪstɪkˌɛkspiˌælɪˈdoʊʃəs/",
      pos: "adj.",
      chineseDefinition: "超级长的单词示例，表示非常棒或者难以形容。",
      englishDefinition:
        "A word used to express something extraordinarily good.",
      synonyms: ["Amazing", "Fantastic", "Incredible"],
      antonyms: ["Mediocre", "Ordinary"],
      exampleSentences: [
        "Supercalifragilisticexpialidocious is simply amazing!",
        "It might sound absurd, but it's quite extraordinary.",
        "Many people try to pronounce Supercalifragilisticexpialidocious correctly.",
      ],
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: 1,
    };

    this._answered = false;
    this._currentSentence = this._getRandomSentence();

    this.render();
  }

  /**
   * 外部接口：更新组件数据
   * @param {Object} vm 数据模型对象，包含 word, phonetic, pos, chineseDefinition, englishDefinition,
   *                    synonyms (数组), antonyms (数组), exampleSentences (数组), options (数组), correctIndex (数字)
   */
  setData(vm) {
    this._vm = Object.assign({}, vm);
    this._answered = false;
    this._currentSentence = this._getRandomSentence();
    this.render();
  }

  /**
   * 返回整个组件模板字符串
   */
  getTemplate() {
    return `
      <link rel="stylesheet" href="components/anki-card/anki-card.css">
      <div class="card-container">
        <div class="word-section">${this._vm.word}</div>
        <div class="options-section">
          ${this._vm.options
            .map(
              (option, index) =>
                `<div class="option" data-index="${index}">${option}</div>`
            )
            .join("")}
        </div>
        <div class="button-section">
          <round-icon-button 
            id="btn-prev"
            class="prev"
            label="上一题"
            icon='<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          ></round-icon-button>
          <round-icon-button 
            id="btn-detail"
            class="detail"
            label="详情"
            icon='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><line x1="12" y1="16" x2="12" y2="12" stroke="white" stroke-width="2"/><circle cx="12" cy="8" r="1" fill="white"/></svg>'
          ></round-icon-button>
          <round-icon-button 
            id="btn-refresh"
            class="refresh"
            label="刷新"
            icon='<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="1 20 1 14 7 14" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="3.51" y1="9.4" x2="9.93" y2="14.17" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="16.57" y1="9.44" x2="22.49" y2="14.14" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          ></round-icon-button>
          <round-icon-button 
            id="btn-next"
            class="next"
            label="下一题"
            icon='<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          ></round-icon-button>
        </div>
        <div id="details-section" class="details-section hidden">
          <div class="detail-row inline">
            <span class="phonetic">${this._vm.phonetic}</span>
            <span class="pos">${this._vm.pos}</span>
          </div>
          <div class="detail-row definition-cn">${
            this._vm.chineseDefinition
          }</div>
          <div class="detail-row definition-en">${
            this._vm.englishDefinition
          }</div>
          <div class="synonyms-row">
            <span class="synonyms-label">近义词：</span>
            <span class="synonyms">${this._vm.synonyms.join(" ")}</span>
          </div>
          <div class="antonyms-row">
            <span class="antonyms-label">反义词：</span>
            <span class="antonyms">${this._vm.antonyms.join(" ")}</span>
          </div>
          <div class="detail-row examples">
            <div class="label">例句：</div>
            <div id="exampleSentence" class="example-sentence">${
              this._currentSentence
            }</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染组件：生成模板、绑定事件，并在 requestAnimationFrame 中调用 adjustWordFontSize()
   */
  render() {
    this.shadowRoot.innerHTML = this.getTemplate();
    this.bindEvents();
    // 使用 requestAnimationFrame 确保布局完全渲染后调用字体适配函数
    requestAnimationFrame(() => this.adjustWordFontSize());
  }

  /**
   * 绑定所有事件：选项点击、导航按钮、例句切换等
   */
  bindEvents() {
    // 选项绑定
    const optionElems = this.shadowRoot.querySelectorAll(".option");
    optionElems.forEach((el) => {
      el.addEventListener("click", (e) => this.onOptionClick(e));
      el.addEventListener("mouseenter", () => el.classList.add("hover"));
      el.addEventListener("mouseleave", () => el.classList.remove("hover"));
    });

    // 导航按钮绑定（监听 round-icon-button 自定义事件）
    const btnDetail = this.shadowRoot.getElementById("btn-detail");
    btnDetail.addEventListener("roundButtonClick", () => this.toggleDetails());

    const btnPrev = this.shadowRoot.getElementById("btn-prev");
    btnPrev.addEventListener("roundButtonClick", () => {
      this.hideDetails();
      this.dispatchEvent(new CustomEvent("navigation", { detail: "btn-prev" }));
    });

    const btnRefresh = this.shadowRoot.getElementById("btn-refresh");
    btnRefresh.addEventListener("roundButtonClick", () => {
      this.hideDetails();
      this.dispatchEvent(
        new CustomEvent("navigation", { detail: "btn-refresh" })
      );
    });

    const btnNext = this.shadowRoot.getElementById("btn-next");
    btnNext.addEventListener("roundButtonClick", () => {
      this.hideDetails();
      this.dispatchEvent(new CustomEvent("navigation", { detail: "btn-next" }));
    });

    // 例句绑定：点击切换随机例句
    const exampleElem = this.shadowRoot.getElementById("exampleSentence");
    if (exampleElem) {
      exampleElem.addEventListener("click", () => {
        this._currentSentence = this._getRandomSentence();
        exampleElem.textContent = this._currentSentence;
      });
    }
  }

  /**
   * 处理选项点击：判断对错，并设置样式反馈
   */
  onOptionClick(event) {
    if (this._answered) return;
    this._answered = true;
    const selectedIndex = parseInt(
      event.currentTarget.getAttribute("data-index"),
      10
    );
    const optionElems = this.shadowRoot.querySelectorAll(".option");
    if (selectedIndex === this._vm.correctIndex) {
      event.currentTarget.classList.add("correct");
    } else {
      event.currentTarget.classList.add("incorrect");
      optionElems.forEach((el) => {
        if (
          parseInt(el.getAttribute("data-index"), 10) === this._vm.correctIndex
        ) {
          el.classList.add("correct");
        }
      });
    }
    this.dispatchEvent(
      new CustomEvent("answerSelected", {
        detail: {
          selected: selectedIndex,
          correct: selectedIndex === this._vm.correctIndex,
        },
      })
    );
  }

  /**
   * 切换详情区域显示/隐藏
   */
  toggleDetails() {
    const details = this.shadowRoot.getElementById("details-section");
    details.classList.toggle("hidden");
  }

  /**
   * 隐藏详情区域
   */
  hideDetails() {
    const details = this.shadowRoot.getElementById("details-section");
    details.classList.add("hidden");
  }

  /**
   * 从例句数组中随机选取一条返回
   */
  _getRandomSentence() {
    const sents = this._vm.exampleSentences;
    if (!sents || sents.length === 0) return "";
    const idx = Math.floor(Math.random() * sents.length);
    return sents[idx];
  }

  /**
   * 自动调整 .word-section 字体大小，确保超长单词在一行内完整显示，
   * 字号范围限定在 [10, 32] 之间。使用 wordElem.clientWidth 与 scrollWidth 进行比较。
   */
  adjustWordFontSize() {
    const wordElem = this.shadowRoot.querySelector(".word-section");
    if (!wordElem) return;

    // 获取当前字体大小（初始值）
    let minSize = 10;
    let maxSize = 32;
    let suitableSize = parseFloat(window.getComputedStyle(wordElem).fontSize);

    // 二分查找，直接比较 wordElem.clientWidth 与 wordElem.scrollWidth
    while (minSize <= maxSize) {
      const mid = Math.floor((minSize + maxSize) / 2);
      wordElem.style.fontSize = mid + "px";
      // 强制 reflow
      wordElem.offsetWidth;
      if (wordElem.scrollWidth > wordElem.clientWidth) {
        maxSize = mid - 1;
      } else {
        suitableSize = mid;
        minSize = mid + 1;
      }
    }
    wordElem.style.fontSize = suitableSize + "px";
  }
}

customElements.define("anki-card", AnkiCard);
