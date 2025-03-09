// main.js
import { importCSV, getAllWordsByFile, getRandomVocabulary } from "./db.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded -> initialize global set");
  initializeLearningSetGlobal();

  // 大上传区域 input
  const bigUploadInput = document.getElementById("bigCsvUpload");
  if (bigUploadInput) {
    bigUploadInput.addEventListener("change", handleBigUpload);
  }

  // 监听菜单组件 fileSelected 事件
  document.addEventListener("fileSelected", async (e) => {
    const file = e.detail.file;
    if (!file) return;
    console.log("menu fileSelected -> uploading:", file.name);
    await handleCsvUpload(file);
  });

  // 监听菜单组件 refreshVocab 事件
  document.addEventListener("refreshVocab", () => {
    console.log("refreshVocab -> re-initialize global set");
    initializeLearningSetGlobal();
  });

  // 绑定外部左右翻页按钮
  const externalPrev = document.getElementById("external-prev");
  const externalNext = document.getElementById("external-next");
  const card = document.querySelector("anki-card");

  if (externalPrev && card && typeof card.showPrev === "function") {
    externalPrev.addEventListener("click", () => {
      card.showPrev();
    });
  }
  if (externalNext && card && typeof card.showNext === "function") {
    externalNext.addEventListener("click", () => {
      card.showNext();
    });
  }
});

/**
 * 启动时：从 entire DB 随机抽 50 个词汇
 */
async function initializeLearningSetGlobal() {
  try {
    const words = await getRandomVocabulary(50);
    console.log("Global random words:", words);

    if (words.length === 0) {
      showBigUploadArea(true);
      showAnkiCard(false);
    } else {
      showBigUploadArea(false);
      showAnkiCard(true);
      updateAnkiCard(words);
    }
  } catch (err) {
    console.error("Global init error:", err);
  }
}

/**
 * 处理大上传区域的 CSV 上传
 */
async function handleBigUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  console.log("bigUpload -> uploading:", file.name);
  await handleCsvUpload(file);
}

/**
 * CSV 上传并更新学习集（仅该 CSV 的全部词汇）
 */
async function handleCsvUpload(file) {
  const csvText = await file.text();
  await importCSV(csvText, file.name);
  console.log("CSV 导入完成, now load from that file:", file.name);

  const words = await getAllWordsByFile(file.name);
  console.log(`All words from [${file.name}]:`, words);

  showBigUploadArea(false);
  showAnkiCard(true);
  updateAnkiCard(words);
}

/**
 * 更新 anki-card
 */
function updateAnkiCard(words) {
  const card = document.querySelector("anki-card");
  if (!card) {
    console.warn("anki-card not found");
    return;
  }
  if (typeof card.setData === "function") {
    card.setData({ vocabulary: words });
    console.log("anki-card updated, count =", words.length);
  }
}

/**
 * 显示/隐藏大上传区域
 */
function showBigUploadArea(show) {
  const bigArea = document.getElementById("big-upload-area");
  if (!bigArea) return;
  bigArea.classList.toggle("hidden", !show);
}

/**
 * 显示/隐藏 anki-card
 */
function showAnkiCard(show) {
  const mainContainer = document.getElementById("main-container");
  if (!mainContainer) return;
  mainContainer.style.display = show ? "flex" : "none";
}
