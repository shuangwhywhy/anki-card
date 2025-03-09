// db.js
console.log("db.js loaded");

const DB_NAME = "ankiAppDB";
const DB_VERSION = 1;
const VOCAB_STORE = "vocabulary";

/**
 * 打开数据库
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (evt) => {
      const db = evt.target.result;
      if (!db.objectStoreNames.contains(VOCAB_STORE)) {
        const store = db.createObjectStore(VOCAB_STORE, { keyPath: "word" });
        // 根据需求添加索引
        store.createIndex("pos", "pos", { unique: false });
        store.createIndex("phonetic", "phonetic", { unique: false });
        store.createIndex("chineseDefinition", "chineseDefinition", {
          unique: false,
        });
        store.createIndex("englishDefinition", "englishDefinition", {
          unique: false,
        });
        store.createIndex("synonym", "synonym", { unique: false });
        store.createIndex("antonym", "antonym", { unique: false });
        store.createIndex("sentences", "sentences", { unique: false });
        store.createIndex("uploadFile", "uploadFile", { unique: false });
        store.createIndex("uploadTime", "uploadTime", { unique: false });
      }
    };
    req.onsuccess = (evt) => {
      console.log("IndexedDB open success");
      resolve(evt.target.result);
    };
    req.onerror = (evt) => reject(evt.target.error);
  });
}

/**
 * 写入/更新词汇
 */
export async function addVocabulary(vocab) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const r = store.put(vocab);
    r.onsuccess = () => resolve(true);
    r.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 导入 CSV（支持逗号、引号、多行例句）
 */
export async function importCSV(csvText, fileName) {
  console.log("importCSV -> file:", fileName);
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    console.log("CSV 行数不足2行");
    return;
  }
  const headers = rows[0].map((h) => h.trim());
  console.log("Parsed headers:", headers);

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length === 0) continue;
    let vocab = {};

    // 示例：0=word,1=pos,2=phonetic,3=chineseDef,4=englishDef,5=synonym,6=antonym,7=sentences
    for (let c = 0; c < headers.length; c++) {
      const colName = headers[c].toLowerCase();
      const val = cols[c] || "";
      if (colName.includes("word")) {
        vocab.word = val;
      } else if (colName.includes("pos")) {
        vocab.pos = val;
      } else if (colName.includes("phonetic") || colName.includes("音标")) {
        vocab.phonetic = val;
      } else if (colName.includes("中文")) {
        vocab.chineseDefinition = val;
      } else if (colName.includes("英文")) {
        vocab.englishDefinition = val;
      } else if (colName.includes("synonym") || colName.includes("同义")) {
        vocab.synonym = splitByCommaOrSemicolon(val);
      } else if (colName.includes("antonym") || colName.includes("反义")) {
        vocab.antonym = splitByCommaOrSemicolon(val);
      } else if (colName.includes("例句") || colName.includes("sentence")) {
        // 多行例句 -> 用换行拆分
        vocab.sentences = val
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean);
      }
    }
    vocab.uploadFile = fileName;
    vocab.uploadTime = Date.now();

    if (vocab.word) {
      await addVocabulary(vocab);
      console.log("Inserted word:", vocab.word);
    }
  }
  console.log("importCSV done, total rows =", rows.length);
}

/**
 * 从 entire DB 随机抽 50
 */
export async function getRandomVocabulary(limit = 50) {
  console.log("getRandomVocabulary called");
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readonly");
    const store = tx.objectStore(VOCAB_STORE);

    const countReq = store.count();
    countReq.onsuccess = () => {
      const total = countReq.result;
      if (total === 0) {
        resolve([]);
        return;
      }
      const numToFetch = Math.min(limit, total);
      const randomIndices = [];
      while (randomIndices.length < numToFetch) {
        const r = Math.floor(Math.random() * total);
        if (!randomIndices.includes(r)) randomIndices.push(r);
      }
      randomIndices.sort((a, b) => a - b);

      let results = [];
      let currentIndex = 0;
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (evt) => {
        const cursor = evt.target.result;
        if (cursor) {
          if (randomIndices[0] === currentIndex) {
            results.push(cursor.value);
            randomIndices.shift();
          }
          currentIndex++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      cursorReq.onerror = (e) => reject(e.target.error);
    };
    countReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 从指定 fileName 获取全部词汇并随机打乱
 */
export async function getAllWordsByFile(fileName) {
  console.log("getAllWordsByFile:", fileName);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readonly");
    const store = tx.objectStore(VOCAB_STORE);

    let matched = [];
    const req = store.openCursor();
    req.onsuccess = (evt) => {
      const cursor = evt.target.result;
      if (cursor) {
        if (cursor.value.uploadFile === fileName) {
          matched.push(cursor.value);
        }
        cursor.continue();
      } else {
        matched.sort(() => Math.random() - 0.5);
        resolve(matched);
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

function splitByCommaOrSemicolon(str) {
  return str
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 解析逗号+引号包裹的 CSV
 * 支持多行例句
 */
function parseCSV(text) {
  const rawLines = text.split(/\r?\n/);
  let finalLines = [];
  let tempLine = "";
  let inQuotes = false;

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    tempLine += tempLine === "" ? line : "\n" + line;
    let totalQuotes = (tempLine.match(/"/g) || []).length;
    inQuotes = totalQuotes % 2 !== 0;
    if (!inQuotes) {
      finalLines.push(tempLine);
      tempLine = "";
    }
  }
  if (tempLine) {
    finalLines.push(tempLine);
  }

  const rows = finalLines.map((l) => parseCSVLine(l));
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // 转义 ""
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
