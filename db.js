// db.js
console.log("db.js loaded");

// IndexedDB 基本信息
const DB_NAME = "ankiAppDB";
const DB_VERSION = 1;
const VOCAB_STORE = "vocabulary";

// 打开数据库
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (evt) => {
      const db = evt.target.result;
      if (!db.objectStoreNames.contains(VOCAB_STORE)) {
        const store = db.createObjectStore(VOCAB_STORE, { keyPath: "word" });
        // 基本索引（可根据需求增删）
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
    req.onerror = (evt) => {
      reject(evt.target.error);
    };
  });
}

// 写入/更新一条记录
export async function addVocabulary(vocab) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const r = store.put(vocab); // 以 word 为主键，重复时覆盖
    r.onsuccess = () => resolve(true);
    r.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 中文表头 -> 系统字段映射
 * 如需更多列名，请自行补充
 */
const headerMapping = {
  单词: "word",
  词性: "pos",
  音标: "phonetic",
  中文释义: "chineseDefinition",
  英文释义: "englishDefinition",
  同义词: "synonym",
  反义词: "antonym",
  例句: "sentences",
};

/**
 * 导入 CSV：解析含引号、逗号、多行例句
 * 使用中文表头映射 -> 系统字段
 */
export async function importCSV(csvText, fileName) {
  console.log("importCSV -> file:", fileName);

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    console.log("CSV 行数不足2行");
    return;
  }
  // 第 0 行表头
  let rawHeaders = rows[0].map((h) => h.trim());
  console.log("Parsed raw headers:", rawHeaders);

  // 将中文表头映射为系统字段
  const mappedHeaders = rawHeaders.map((header) => {
    return headerMapping[header] || "";
  });
  console.log("mappedHeaders:", mappedHeaders);

  // 其余行为数据
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length === 0) continue;
    let vocab = {};

    for (let c = 0; c < mappedHeaders.length; c++) {
      const field = mappedHeaders[c];
      if (!field) continue; // 未匹配的列跳过
      let val = cols[c] || "";

      if (field === "sentences") {
        // 多行例句 -> 换行拆分
        vocab.sentences = val
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean);
      } else if (field === "synonym" || field === "antonym") {
        // 同义词/反义词 -> 按逗号或分号拆分
        vocab[field] = splitByCommaOrSemicolon(val);
      } else {
        // 普通字段
        vocab[field] = val;
      }
    }

    // 附加信息
    vocab.uploadFile = fileName;
    vocab.uploadTime = Date.now();

    if (vocab.word) {
      await addVocabulary(vocab);
      console.log("Inserted word:", vocab.word);
    } else {
      console.log("Skipped row, no 'word':", cols);
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
        if (!randomIndices.includes(r)) {
          randomIndices.push(r);
        }
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

/** 同义词/反义词拆分 */
function splitByCommaOrSemicolon(str) {
  return str
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 解析逗号+引号包裹的 CSV，多行例句 */
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

/** 逐字符解析一行，支持引号转义 "" */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // 遇到 ""
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
