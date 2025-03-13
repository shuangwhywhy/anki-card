// helpers/generate-question-data.js

export const ALL_TYPES = [
  "word-chinese",
  "word-english",
  "chinese-to-word",
  "english-to-word",
  "synonym",
  "antonym",
  "sentence",
  "fill-in",
  "display",
];

export const CHOICE_TYPES = [
  "word-chinese",
  "word-english",
  "chinese-to-word",
  "english-to-word",
  "synonym",
  "antonym",
  "sentence",
];

/**
 * 从整个学习集 entireVocabulary 中生成一道选择题。
 * 如果传入 currentItem，则使用它作为主词条，不随机选取。
 *
 * @param {Array} entireVocabulary - 学习集数组
 * @param {string} [questionType] - 指定题型（若未指定，则随机选择 CHOICE_TYPES 中一种）
 * @param {Object} [currentItem] - 可选，如果提供，则使用它作为主词条
 * @returns {Object|null} 题目对象
 */
export function generateQuestionData(
  entireVocabulary,
  questionType,
  currentItem
) {
  if (!entireVocabulary || entireVocabulary.length === 0) {
    console.error("generateQuestionData: 学习集为空");
    return null;
  }
  if (!questionType || !ALL_TYPES.includes(questionType)) {
    const rand = Math.floor(Math.random() * CHOICE_TYPES.length);
    questionType = CHOICE_TYPES[rand];
  }
  const item =
    currentItem ||
    entireVocabulary[Math.floor(Math.random() * entireVocabulary.length)];
  if (
    (questionType === "synonym" &&
      (!Array.isArray(item.synonym) || item.synonym.length === 0)) ||
    (questionType === "antonym" &&
      (!Array.isArray(item.antonym) || item.antonym.length === 0))
  ) {
    const available = CHOICE_TYPES.filter((t) => t !== questionType);
    const rand = Math.floor(Math.random() * available.length);
    questionType = available[rand];
  }
  let questionText = "";
  let correctAnswer = "";
  let word = item.word || "";
  switch (questionType) {
    case "word-chinese":
      questionText = item.word || "???";
      correctAnswer = item.chineseDefinition || "暂无中文释义";
      break;
    case "word-english":
      questionText = item.word || "???";
      correctAnswer = item.englishDefinition || "No English Def";
      break;
    case "chinese-to-word":
      questionText = item.chineseDefinition || "暂无中文释义";
      correctAnswer = item.word || "???";
      break;
    case "english-to-word":
      questionText = item.englishDefinition || "No English Def";
      correctAnswer = item.word || "???";
      break;
    case "synonym":
      questionText = item.word || "???";
      correctAnswer = pickRandom(item.synonym);
      break;
    case "antonym":
      questionText = item.word || "???";
      correctAnswer = pickRandom(item.antonym);
      break;
    case "sentence":
      if (Array.isArray(item.sentences) && item.sentences.length > 0) {
        const sentence = pickRandom(item.sentences);
        if (sentence.toLowerCase().includes((item.word || "").toLowerCase())) {
          questionText = sentence.replace(new RegExp(item.word, "gi"), "_____");
          correctAnswer = item.word || "???";
        } else {
          console.error("generateQuestionData: 句子中未找到主词", item);
          questionText = sentence;
          correctAnswer = item.word || "???";
        }
      } else {
        console.error("generateQuestionData: 例句题型缺少 sentences", item);
        questionText = "___ (缺少句子)";
        correctAnswer = item.word || "defaultWord";
      }
      break;
    default:
      questionText = item.word || "???";
      correctAnswer = item.chineseDefinition || "暂无中文释义";
  }
  const distractors = pickDistractors(
    entireVocabulary,
    item,
    questionType,
    correctAnswer
  );
  let rawChoices = [correctAnswer, ...distractors];
  rawChoices = Array.from(new Set(rawChoices));
  if (rawChoices.length < 2) {
    rawChoices = [correctAnswer];
  } else if (rawChoices.length > 4) {
    rawChoices = rawChoices.slice(0, 4);
  }
  const shuffled = shuffle(rawChoices);
  const correctIndex = shuffled.indexOf(correctAnswer);
  return {
    questionType,
    questionText,
    choices: shuffled,
    correctIndex,
    word,
    chineseDefinition: item.chineseDefinition,
    englishDefinition: item.englishDefinition,
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickDistractors(
  entireVocabulary,
  currentItem,
  questionType,
  correctAnswer
) {
  let candidates = entireVocabulary.filter((it) => it !== currentItem);
  let extracted = [];
  switch (questionType) {
    case "word-chinese":
      extracted = candidates.map((it) => it.chineseDefinition).filter(Boolean);
      extracted = extracted.filter((d) => /[\u4e00-\u9fa5]/.test(d));
      break;
    case "word-english":
      extracted = candidates.map((it) => it.englishDefinition).filter(Boolean);
      extracted = extracted.filter((d) => /^[A-Za-z0-9\s\.,;:'"\-]+$/.test(d));
      break;
    case "chinese-to-word":
      extracted = candidates.map((it) => it.word).filter(Boolean);
      extracted = extracted.filter((d) =>
        /^[A-Za-z0-9\s\u4e00-\u9fa5\-]+$/.test(d)
      );
      break;
    case "english-to-word":
      extracted = candidates.map((it) => it.word).filter(Boolean);
      extracted = extracted.filter((d) => /^[A-Za-z0-9\s\.,;:'"\-]+$/.test(d));
      break;
    case "synonym":
      extracted = candidates.flatMap((it) =>
        Array.isArray(it.synonym) ? it.synonym : []
      );
      extracted = extracted.filter((d) => !/[\u4e00-\u9fa5]/.test(d));
      break;
    case "antonym":
      extracted = candidates.flatMap((it) =>
        Array.isArray(it.antonym) ? it.antonym : []
      );
      extracted = extracted.filter((d) => !/[\u4e00-\u9fa5]/.test(d));
      break;
    case "sentence":
      extracted = candidates.map((it) => it.word).filter(Boolean);
      extracted = extracted.filter((d) => /^[A-Za-z0-9\s\.,;:'"\-]+$/.test(d));
      break;
    default:
      extracted = candidates.map((it) => it.word).filter(Boolean);
      break;
  }
  extracted = extracted.filter((d) => d !== correctAnswer);
  return shuffle(extracted).slice(0, 3);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ==================================================
   以下为题型选择逻辑函数，基于 state 逻辑实现
   ================================================== */

/**
 * 根据 wordObj.familiarity 和 localStorage 中保存的 state 决定下次出题的题型。
 * isRefresh 为 true 表示刷新操作（多刷题型），false 表示切换进入（首刷题型）。
 */
export function getNextQuestionType(wordObj, isRefresh = false) {
  if (!wordObj || !wordObj.word) {
    console.log("getNextQuestionType: wordObj无效，返回随机题型");
    return pickRandom(ALL_TYPES);
  }
  let stored = localStorage.getItem(wordObj.word);
  let localData = stored ? JSON.parse(stored) : { state: "init" };
  console.log(
    "getNextQuestionType: 初始state =",
    localData,
    "word =",
    wordObj.word
  );
  let ret = null;
  if (isRefresh) {
    ret = pickRandom(ALL_TYPES);
    console.log("getNextQuestionType: 刷新操作，返回随机题型 =", ret);
    return ret;
  }
  switch (wordObj.familiarity) {
    case "A":
      ret = getQuestionForA(wordObj, localData);
      break;
    case "B":
      ret = getQuestionForB(wordObj, localData);
      break;
    case "C":
      ret = getQuestionForC(wordObj, localData);
      break;
    case "D":
      ret = getQuestionForD(wordObj, localData);
      break;
    default:
      ret = pickRandom(ALL_TYPES);
      break;
  }
  localStorage.setItem(wordObj.word, JSON.stringify(localData));
  console.log("getNextQuestionType: 最终state =", localData, "返回题型 =", ret);
  return ret;
}

/**
 * familarity = A 逻辑：
 * 1. 如果 state 为 "init"，则将 state 设为 "nextup"，返回 "display"（首刷默认）
 * 2. 如果 state 为 "nextup" 且整体正确率（仅统计展示次数>=10）小于 0.2，则将 state 设为 "again"，返回 "display"（触发次刷）
 * 3. 如果 state 为 "again"，则设为 "random"，返回错误率最高的题型
 * 默认返回随机题型。
 */
function getQuestionForA(wordObj, localData) {
  let ret = null;
  console.log("getQuestionForA: 初始state =", localData.state);
  switch (localData.state) {
    case "init":
      localData.state = "nextup";
      console.log("getQuestionForA: state从init转换到nextup");
      ret = "display";
      console.log("getQuestionForA: 首刷返回display");
    // 无 break，继续进入 nextup
    case "nextup":
      console.log(
        "getQuestionForA: 进入nextup判断, overallCorrectRate =",
        getOverallCorrectRate(wordObj)
      );
      if (getOverallCorrectRate(wordObj) < 0.2) {
        localData.state = "again";
        ret = "display";
        console.log(
          "getQuestionForA: overallCorrectRate < 0.2, state转换为again, 返回display"
        );
        return ret;
      }
      if (ret) {
        console.log("getQuestionForA: nextup阶段返回ret =", ret);
        return ret;
      }
      console.log("getQuestionForA: nextup阶段未命中条件，返回随机题型");
      return pickRandom(ALL_TYPES);
    case "again":
      localData.state = "random";
      console.log(
        "getQuestionForA: state为again，转换为random, 返回错误率最高的题型"
      );
      return getHighestErrorType(wordObj);
    default:
      console.log("getQuestionForA: 未命中特定state，返回随机题型");
      return pickRandom(ALL_TYPES);
  }
}

/**
 * familarity = B 的逻辑（完善后可根据具体需求调整）
 */
function getQuestionForB(wordObj, localData) {
  console.log(
    "getQuestionForB: 当前state =",
    localData.state,
    "word =",
    wordObj.word
  );
  localData.state = "random";
  return pickRandom(ALL_TYPES);
}

/**
 * familarity = C 的逻辑（完善后可根据具体需求调整）
 */
function getQuestionForC(wordObj, localData) {
  console.log(
    "getQuestionForC: 当前state =",
    localData.state,
    "word =",
    wordObj.word
  );
  localData.state = "random";
  return pickRandom(ALL_TYPES);
}

/**
 * familarity = D 的逻辑（完善后可根据具体需求调整）
 */
function getQuestionForD(wordObj, localData) {
  console.log(
    "getQuestionForD: 当前state =",
    localData.state,
    "word =",
    wordObj.word
  );
  localData.state = "random";
  return pickRandom(ALL_TYPES);
}

/**
 * 统计 wordObj.myScore 中非 display 题型（展示次数>=10）的最低正确率，若无则返回 1
 */
function getOverallCorrectRate(wordObj) {
  if (!wordObj.myScore) return 1;
  let minRate = 1;
  let found = false;
  for (let key in wordObj.myScore) {
    if (key === "display") continue;
    let data = wordObj.myScore[key];
    if (data[0] >= 10) {
      found = true;
      if (data[2] < minRate) {
        minRate = data[2];
      }
    }
  }
  return found ? minRate : 1;
}

/**
 * 返回 wordObj.myScore 中展示次数>=10的题型中正确率最低的题型，若无则返回 "display"
 */
function getHighestErrorType(wordObj) {
  if (!wordObj.myScore) return "display";
  let lowestRate = 1;
  let targetType = "display";
  for (let key in wordObj.myScore) {
    if (key === "display") continue;
    let data = wordObj.myScore[key];
    if (data[0] >= 10 && data[2] < lowestRate) {
      lowestRate = data[2];
      targetType = key;
    }
  }
  return targetType;
}
