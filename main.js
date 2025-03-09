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

  // 监听菜单组件 fileSelected
  document.addEventListener("fileSelected", async (e) => {
    const file = e.detail.file;
    if (!file) return;
    console.log("menu fileSelected -> uploading:", file.name);
    await handleCsvUpload(file);
  });

  // 监听菜单组件 refreshVocab
  document.addEventListener("refreshVocab", () => {
    console.log("refreshVocab -> re-init global set");
    initializeLearningSetGlobal();
  });
});

/**
 * 启动时：若 DB 有数据则抽50，否则显示大上传区域
 */
async function initializeLearningSetGlobal() {
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
}

/**
 * 大上传区域
 */
async function handleBigUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  console.log("bigUpload -> uploading:", file.name);
  await handleCsvUpload(file);
}

/**
 * CSV 上传 -> DB -> 只显示该CSV的全部词汇
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
  mainContainer.style.display = show ? "block" : "none";
}
