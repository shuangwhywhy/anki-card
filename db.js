// db.js
console.log("db.js loaded");

// IndexedDB 基本信息
const DB_NAME = "ankiAppDB";
const DB_VERSION = 1;
const VOCAB_STORE = "vocabulary";
const HISTORY_STORE = "history";

// 默认 myScore 对象
const DEFAULT_MY_SCORE = {
  "word-chinese": [0, 0, 0],
  "word-english": [0, 0, 0],
  "chinese-to-word": [0, 0, 0],
  "english-to-word": [0, 0, 0],
  synonym: [0, 0, 0],
  antonym: [0, 0, 0],
  sentence: [0, 0, 0],
  "fill-in": [0, 0, 0],
  display: [0],
};

/**
 * 打开数据库
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (evt) => {
      const db = evt.target.result;
      // 创建或更新 vocabulary store
      if (!db.objectStoreNames.contains(VOCAB_STORE)) {
        const store = db.createObjectStore(VOCAB_STORE, { keyPath: "word" });
        // 基本索引
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
        store.createIndex("showCount", "showCount", { unique: false });
        store.createIndex("displayDuration", "displayDuration", {
          unique: false,
        });
        store.createIndex("familiarity", "familiarity", { unique: false });
        // NEW: 选词权重，取值范围 [0.1, 1]
        store.createIndex("wordWeight", "wordWeight", { unique: false });
      } else {
        const store = evt.target.transaction.objectStore(VOCAB_STORE);
        if (!store.indexNames.contains("showCount")) {
          store.createIndex("showCount", "showCount", { unique: false });
        }
        if (!store.indexNames.contains("displayDuration")) {
          store.createIndex("displayDuration", "displayDuration", {
            unique: false,
          });
        }
        if (!store.indexNames.contains("familiarity")) {
          store.createIndex("familiarity", "familiarity", { unique: false });
        }
        if (!store.indexNames.contains("wordWeight")) {
          store.createIndex("wordWeight", "wordWeight", { unique: false });
        }
      }

      // 创建 history store
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const historyStore = db.createObjectStore(HISTORY_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        historyStore.createIndex("word", "word", { unique: false });
        historyStore.createIndex("answerTime", "answerTime", { unique: false });
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

/**
 * 写入/更新一条记录到 vocabulary store
 */
export async function addVocabulary(vocab) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    if (vocab.showCount === undefined) {
      vocab.showCount = 0;
    }
    if (vocab.displayDuration === undefined) {
      vocab.displayDuration = 0;
    }
    if (vocab.familiarity === undefined) {
      vocab.familiarity = "A";
    }
    if (vocab.myScore === undefined) {
      vocab.myScore = { ...DEFAULT_MY_SCORE };
    }
    // NEW: 若未设置 wordWeight，则计算并设置初始权重
    if (vocab.wordWeight === undefined) {
      vocab.wordWeight = computeWordWeight(vocab);
    }
    const r = store.put(vocab);
    r.onsuccess = () => resolve(true);
    r.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 更新 vocabulary 中指定单词的展示次数
 */
export async function updateShowCount(word, delta = 1) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const req = store.get(word);
    req.onsuccess = (evt) => {
      const record = evt.target.result;
      if (record) {
        record.showCount = (record.showCount || 0) + delta;
        // 更新选词权重
        record.wordWeight = computeWordWeight(record);
        const updateReq = store.put(record);
        updateReq.onsuccess = () => resolve(true);
        updateReq.onerror = (e) => reject(e.target.error);
      } else {
        reject(new Error("单词不存在"));
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 更新指定单词的累计展示时长
 */
export async function updateDisplayDuration(word, additionalDuration) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const req = store.get(word);
    req.onsuccess = (evt) => {
      const record = evt.target.result;
      if (record) {
        record.displayDuration =
          (record.displayDuration || 0) + additionalDuration;
        // 更新选词权重
        record.wordWeight = computeWordWeight(record);
        const updateReq = store.put(record);
        updateReq.onsuccess = () => resolve(true);
        updateReq.onerror = (e) => reject(e.target.error);
      } else {
        reject(new Error("单词不存在"));
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 更新指定单词的 myScore 信息中的“累计展示次数”
 */
export async function updateMyScoreDisplay(word, questionType, delta) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const req = store.get(word);
    req.onsuccess = (evt) => {
      const record = evt.target.result;
      if (record) {
        if (!record.myScore) {
          record.myScore = { ...DEFAULT_MY_SCORE };
        }
        if (questionType === "display") {
          record.myScore["display"][0] =
            (record.myScore["display"][0] || 0) + delta;
        } else {
          if (!record.myScore[questionType]) {
            record.myScore[questionType] = [0, 0, 0];
          }
          record.myScore[questionType][0] += delta;
          record.myScore[questionType][2] =
            record.myScore[questionType][0] > 0
              ? record.myScore[questionType][1] /
                record.myScore[questionType][0]
              : 0;
        }
        // 更新选词权重
        record.wordWeight = computeWordWeight(record);
        const updateReq = store.put(record);
        updateReq.onsuccess = () => resolve(true);
        updateReq.onerror = (e) => reject(e.target.error);
      } else {
        reject(new Error("单词不存在"));
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 更新指定单词的 myScore 信息（正确次数更新）
 */
export async function updateMyScore(word, questionType, isCorrect) {
  return new Promise(async (resolve, reject) => {
    if (!word) {
      reject(new Error("Invalid key provided for updateMyScore"));
      return;
    }
    const db = await openDB();
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const req = store.get(word);
    req.onsuccess = (evt) => {
      const record = evt.target.result;
      if (record) {
        if (!record.myScore) {
          record.myScore = { ...DEFAULT_MY_SCORE };
        }
        if (questionType === "display") {
          record.myScore["display"][0] =
            (record.myScore["display"][0] || 0) + 1;
        } else {
          if (!record.myScore[questionType]) {
            record.myScore[questionType] = [0, 0, 0];
          }
          record.myScore[questionType][0] += 1;
          if (isCorrect) {
            record.myScore[questionType][1] += 1;
          }
          record.myScore[questionType][2] =
            record.myScore[questionType][0] > 0
              ? record.myScore[questionType][1] /
                record.myScore[questionType][0]
              : 0;
        }
        // 更新选词权重
        record.wordWeight = computeWordWeight(record);
        const updateReq = store.put(record);
        updateReq.onsuccess = () => resolve(true);
        updateReq.onerror = (e) => reject(e.target.error);
      } else {
        reject(new Error("单词不存在"));
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 添加一条答题记录到 history store
 */
export async function addHistoryRecord(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE, "readwrite");
    const store = tx.objectStore(HISTORY_STORE);
    const req = store.add(record);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 计算单词的选词权重
 * 基于熟悉度（采用指数级递减）、展示次数、累计展示时长以及正确率（仅统计展示次数>=10的题型）
 * 返回值范围在 [0.1, 1]
 */
export function computeWordWeight(wordObj) {
  // 指数级基础权重：定义熟悉度等级数值
  const famLevels = { A: 0, B: 1, C: 2, D: 3 };
  const k = 0.5; // 可调节常数，越大衰减越快
  let fam = wordObj.familiarity;
  let base = famLevels.hasOwnProperty(fam)
    ? Math.exp(-k * famLevels[fam])
    : 1.0;

  let showCount = wordObj.showCount || 0;
  let durationMin = (wordObj.displayDuration || 0) / 60000; // 转换为分钟
  let alpha = 0.1;
  let beta = 0.5;
  let F_disp = 1 / (1 + alpha * (showCount + beta * durationMin));

  let correctRate = 1;
  if (wordObj.myScore) {
    let minRate = 1;
    let found = false;
    for (let key in wordObj.myScore) {
      if (key === "display") continue;
      let data = wordObj.myScore[key]; // [展示次数, 正确次数, 正确率]
      if (data[0] >= 10) {
        found = true;
        if (data[2] < minRate) {
          minRate = data[2];
        }
      }
    }
    if (found) correctRate = minRate;
  }
  // 采用 2 - correctRate 使得正确率越高（接近 1）时 F_correct 越小
  let F_correct = 2 - correctRate;
  let weight = base * F_disp * F_correct;
  if (weight < 0.1) weight = 0.1;
  if (weight > 1) weight = 1;
  return weight;
}

/**
 * 更新指定单词的选词权重
 */
export async function updateWordWeight(word, wordObj) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const req = store.get(word);
    req.onsuccess = (evt) => {
      const record = evt.target.result;
      if (record) {
        record.wordWeight = computeWordWeight(record);
        const updateReq = store.put(record);
        updateReq.onsuccess = () => resolve(true);
        updateReq.onerror = (e) => reject(e.target.error);
      } else {
        reject(new Error("单词不存在"));
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 中文表头 -> 系统字段映射
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
  分类: "familiarity",
};

/**
 * 导入 CSV：解析含引号、逗号、多行例句，并按表头映射为系统字段
 */
export async function importCSV(csvText, fileName) {
  console.log("importCSV -> file:", fileName);
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    console.log("CSV 行数不足2行");
    return;
  }
  let rawHeaders = rows[0].map((h) => h.trim());
  console.log("Parsed raw headers:", rawHeaders);
  const mappedHeaders = rawHeaders.map((header) => {
    return headerMapping[header] || "";
  });
  console.log("mappedHeaders:", mappedHeaders);
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length === 0) continue;
    let vocab = {};
    for (let c = 0; c < mappedHeaders.length; c++) {
      const field = mappedHeaders[c];
      if (!field) continue;
      let val = cols[c] || "";
      if (field === "sentences") {
        vocab.sentences = val
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean);
      } else if (field === "synonym" || field === "antonym") {
        vocab[field] = splitByCommaOrSemicolon(val);
      } else {
        vocab[field] = val;
      }
    }
    vocab.uploadFile = fileName;
    vocab.uploadTime = Date.now();
    if (vocab.showCount === undefined) {
      vocab.showCount = 0;
    }
    if (vocab.displayDuration === undefined) {
      vocab.displayDuration = 0;
    }
    if (vocab.familiarity === undefined) {
      vocab.familiarity = "A";
    }
    if (vocab.myScore === undefined) {
      vocab.myScore = { ...DEFAULT_MY_SCORE };
    }
    // 初始化选词权重
    if (vocab.word && vocab.wordWeight === undefined) {
      vocab.wordWeight = computeWordWeight(vocab);
    }
    if (vocab.word) {
      await addVocabulary(vocab);
      console.log("Inserted/Updated word:", vocab.word);
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
          resolve(results.sort(() => (Math.random() < 0.5 ? -1 : 1)));
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

/** 解析 CSV，多行例句 */
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

/** 逐字符解析一行 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
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

/**
 * 删除 vocabulary store 中的所有词汇记录
 */
export async function deleteAllVocabulary() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOCAB_STORE, "readwrite");
    const store = tx.objectStore(VOCAB_STORE);
    const req = store.clear();
    req.onsuccess = () => {
      console.log("All vocabulary deleted from database.");
      resolve(true);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}
