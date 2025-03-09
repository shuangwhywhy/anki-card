// components/card-header/fill-in/fill-in-header.js
class FillInHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // 默认数据，实际数据由 setData() 更新
    // _data.word：原始单词
    // _data.visibleIndices：数组，表示哪些索引的字母初始显示（例如 [0, 1] 表示显示前两个字母）
    // _data.filled：数组，长度与 word 相同，表示用户输入的字母，初始为空字符串
    this._data = {
      word: "EXAMPLE",
      visibleIndices: [0, 1],
      filled: [],
    };
    this._initFilled();
    this.render();
  }

  _initFilled() {
    // 确保 filled 数组与 word 长度一致
    this._data.filled = Array.from(
      { length: this._data.word.length },
      () => ""
    );
  }

  setData(data) {
    this._data = Object.assign({}, data);
    if (
      !this._data.filled ||
      this._data.filled.length !== this._data.word.length
    ) {
      this._initFilled();
    }
    this.render();
  }

  getTemplate() {
    // 构建单词显示：每个字母根据 visibleIndices 和 filled 状态显示
    const lettersHtml = Array.from(this._data.word)
      .map((letter, idx) => {
        if (this._data.visibleIndices.includes(idx)) {
          // 初始显示的字母
          return `<span class="letter visible">${letter}</span>`;
        } else if (this._data.filled[idx]) {
          // 用户输入的字母
          return `<span class="letter filled">${this._data.filled[idx]}</span>`;
        } else {
          // 空缺，显示下划线
          return `<span class="letter blank"></span>`;
        }
      })
      .join("");

    return `
      <link rel="stylesheet" href="components/card-header/fill-in/fill-in-header.css">
      <div class="fill-in-container">
        <div class="word-display">${lettersHtml}</div>
        <div class="submit-button">
          <button id="submitBtn">
            <svg viewBox="0 0 24 24">
              <!-- 初始手形图标 -->
              <path d="M12 2 L12 22" stroke="black" stroke-width="2" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  render() {
    this.shadowRoot.innerHTML = this.getTemplate();
    this.bindEvents();
    this.focusNextBlank(0);
  }

  bindEvents() {
    // 监听键盘输入，用于填充字母
    this.shadowRoot.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // 提交按钮事件
    const submitBtn = this.shadowRoot.getElementById("submitBtn");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => this.handleSubmit());
    }
  }

  handleKeyDown(e) {
    // 简单实现：仅处理 A-Z 字母和 Backspace
    if (/^[a-zA-Z]$/.test(e.key)) {
      // 找到第一个空缺位置（非 visible）并填入字母
      const idx = this._data.filled.findIndex(
        (v, i) => !this._data.visibleIndices.includes(i) && v === ""
      );
      if (idx !== -1) {
        this._data.filled[idx] = e.key.toUpperCase();
        e.preventDefault();
        this.render();
      }
    } else if (e.key === "Backspace") {
      // 删除最后一个非 visible 的已填字母
      let idx = this._data.filled.lastIndexOf((v) => v !== "");
      if (idx === -1) {
        // 全为空则不处理
      } else {
        this._data.filled[idx] = "";
        e.preventDefault();
        this.render();
      }
    }
  }

  focusNextBlank(startIndex) {
    // 此方法可用于实现视觉焦点指示，目前作为占位函数
  }

  handleSubmit() {
    // 检查每个填空是否正确
    const results = this._data.word.split("").map((letter, idx) => {
      if (this._data.visibleIndices.includes(idx)) {
        return true;
      } else {
        return this._data.filled[idx].toUpperCase() === letter.toUpperCase();
      }
    });
    // 触发提交事件，传递结果数组
    this.dispatchEvent(
      new CustomEvent("submitFilled", {
        detail: { results },
        bubbles: true,
        composed: true,
      })
    );
    // 可在此根据结果调整显示（例如变色等），此处仅触发事件
  }
}

customElements.define("fill-in-header", FillInHeader);
