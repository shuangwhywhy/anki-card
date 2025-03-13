// components/menu/menu.js
import { deleteAllVocabulary } from "../../db.js";

class CustomMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="components/menu/menu.css">
      <div class="menu-toolbar">
        <div class="menu-item" id="upload-btn" title="上传 CSV 文件">
          <svg width="24px" height="24px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M14,9.41421 C14.5523,9.41421 15,9.86192 15,10.41418 L15,13.41418 C15,14.51878 14.1046,15.41418 13,15.41418 L3,15.41418 C1.89543,15.41418 1,14.51878 1,13.41418 L1,10.41418 C1,9.86192 1.44772,9.41421 2,9.41421 C2.55228,9.41421 3,9.86192 3,10.41418 L3,13.41418 L13,13.41418 L13,10.41418 C13,9.86192 13.4477,9.41421 14,9.41421 Z M8,2 L11.7071,5.7071 C12.0976,6.09763 12.0976,6.73079 11.7071,7.12132 C11.3166,7.51184 10.6834,7.51184 10.2929,7.12132 L9,5.82842 L9,10.41418 C9,10.96648 8.55228,11.41418 8,11.41418 C7.44772,11.41418 7,10.96648 7,10.41418 L7,5.82842 L5.70711,7.12132 C5.31658,7.51184 4.68342,7.51184 4.29289,7.12132 C3.90237,6.73079 3.90237,6.09763 4.29289,5.7071 L8,2 Z"/>
          </svg>
        </div>
        <div class="menu-item" id="record-btn" title="答题记录">
          <svg width="24px" height="24px" viewBox="0 0 16 16" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <rect width="16" height="16" id="icon-bound" fill="none" />
            <path d="M9,4H7v4.416l3.294,3.291l1.413-1.416L9,7.584V4z M8,0C3.581,0,0,3.581,0,8s3.581,8,8,8s8-3.581,8-8S12.419,0,8,0z M8,14 c-3.312,0-6-2.688-6-6s2.688-6,6-6s6,2.688,6,6S11.312,14,8,14z" />
          </svg>
        </div>
        <div class="menu-item" id="refresh-btn" title="刷新词汇">
          <svg width="24px" height="24px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path d="M643.759 876.884c77.46-26.672 141.075-75.755 185.988-137.307a19.72 19.72 0 005.693-17.36 19.44 19.44 0 00-.088-.589l-.01-.049a19.667 19.667 0 00-10.709-14.159l-56.53-40.088a19.77 19.77 0 00-17.265-5.427c-.155.02-.31.042-.464.066l-.072.019a19.825 19.825 0 00-14.149 10.532c-31.44 42.857-75.609 76.947-129.836 95.619-140.801 48.482-293.643-25.746-341.963-166.079s26.422-292.924 167.222-341.406c131.991-45.448 273.616 14.979 330.786 138.05l-89.429.558c-8.995-1.174-17.65 3.91-20.99 12.331a19.656 19.656 0 006.332 23.117l153.694 155.17c3.812 3.848 9.047 5.96 14.475 5.84s10.574-2.461 14.228-6.475l148.171-162.749c6.482-5.349 8.872-14.193 5.961-22.048-.05-.132-.102-.264-.156-.394a19.374 19.374 0 00-1.228-2.599l-.04-.09c-4.015-7.084-11.99-10.968-20.072-9.775l-89.491.945-1.173-3.406c-68.86-199.985-287.86-306.346-488.523-237.252S86.366 439.616 155.226 639.601c68.86 199.985 287.86 306.345 488.523 237.251l.011.033z"/>
          </svg>
        </div>
        <div class="menu-item" id="clear-btn" title="清空词汇">
          <svg width="24px" height="24px" viewBox="-0.5 0 19 19" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <g id="out" stroke="none" stroke-width="1" fill-rule="evenodd">
              <path d="M4.91666667,14.8888889 C4.91666667,15.3571429 5.60416667,16 6.0625,16 L12.9375,16 C13.3958333,16 14.0833333,15.3571429 14.0833333,14.8888889 L14.0833333,6 L4.91666667,6 L4.91666667,14.8888889 Z M15,3.46500003 L12.5555556,3.46500003 L11.3333333,2 L7.66666667,2 L6.44444444,3.46500003 L4,3.46500003 L4,4.93000007 L15,4.93000007 L15,3.46500003 Z" id="path"></path>
            </g>
          </svg>
        </div>
      </div>
      <input type="file" id="menuCsvUpload" accept=".csv" style="display: none;" />
    `;
    this.bindEvents();
  }

  bindEvents() {
    const uploadBtn = this.shadowRoot.getElementById("upload-btn");
    const recordBtn = this.shadowRoot.getElementById("record-btn");
    const refreshBtn = this.shadowRoot.getElementById("refresh-btn");
    const clearBtn = this.shadowRoot.getElementById("clear-btn");
    const fileInput = this.shadowRoot.getElementById("menuCsvUpload");

    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });
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
    recordBtn.addEventListener("click", () => {
      console.log("答题记录功能暂未实现");
    });
    refreshBtn.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("refreshVocab", {
          bubbles: true,
          composed: true,
        })
      );
    });
    clearBtn.addEventListener("click", () => {
      if (confirm("确定要清空所有词汇吗？")) {
        // 直接调用删除所有词汇的接口
        deleteAllVocabulary()
          .then(() => {
            console.log("所有词汇已删除");
            this.dispatchEvent(
              new CustomEvent("vocabCleared", {
                bubbles: true,
                composed: true,
              })
            );
          })
          .catch((err) => {
            console.error("删除所有词汇失败", err);
          });
      }
    });
  }
}

customElements.define("custom-menu", CustomMenu);
