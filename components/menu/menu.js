// components/menu/menu.js
console.log("menu.js loaded");

class CustomMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="components/menu/menu.css">
      <div class="menu-container">
        <div class="menu-icon">
          <svg viewBox="0 0 24 24">
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor"/>
          </svg>
        </div>
        <div class="menu-panel">
          <div class="menu-item upload">
            <span>上传 CSV</span>
            <input type="file" id="menuCsvUpload" accept=".csv" />
          </div>
          <div class="menu-item refresh-vocab">
            刷新词汇
          </div>
        </div>
      </div>
    `;

    // 文件上传
    const fileInput = this.shadowRoot.getElementById("menuCsvUpload");
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (file) {
        this.dispatchEvent(
          new CustomEvent("fileSelected", {
            detail: { file },
            bubbles: true,
            composed: true,
          })
        );
      }
    });

    // 刷新词汇
    const refreshItem = this.shadowRoot.querySelector(
      ".menu-item.refresh-vocab"
    );
    refreshItem.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("refreshVocab", {
          bubbles: true,
          composed: true,
        })
      );
    });
  }
}

customElements.define("custom-menu", CustomMenu);
