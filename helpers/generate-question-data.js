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
   以下为题型选择逻辑函数（基于 state 逻辑，实现最终完整版本）
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
 * familarity = A 的逻辑：
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
    // 不 break，继续进入 nextup 判断
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
        "getQuestionForA: state为again, 转换为random, 返回错误率最高的题型"
      );
      return getHighestErrorType(wordObj);
    default:
      console.log("getQuestionForA: 未命中特定state，返回随机题型");
      return pickRandom(ALL_TYPES);
  }
}

/**
 * familarity = B 的逻辑：
 * - 当展示次数 < 3 且 时长 < 2 分钟，首刷题型为 display；
 * - 当展示次数 < 6 且 时长 < 4 分钟，首刷题型在非 display 题型中加权随机选择（display 概率保持在 5% 以下）；
 * - 当整体正确率 < 20%（展示次数>=10的题型），次刷题型为 display；
 * - 当 state 为 "again" 时，转换为 "random" 并返回错误率最高的题型。
 */
function getQuestionForB(wordObj, localData) {
  let ret = null;
  console.log("getQuestionForB: 初始state =", localData.state);
  switch (localData.state) {
    case "init":
      if (wordObj.showCount < 3 && wordObj.displayDuration < 2 * 60 * 1000) {
        localData.state = "nextup";
        ret = "display";
        console.log(
          "getQuestionForB: 条件1满足（<3 & <2min），state转换为nextup, 返回display"
        );
      } else if (
        wordObj.showCount < 6 &&
        wordObj.displayDuration < 4 * 60 * 1000
      ) {
        localData.state = "nextup";
        ret = getWeightedRandomNonDisplay(0.05);
        console.log(
          "getQuestionForB: 条件2满足（<6 & <4min），state转换为nextup, 返回非display =",
          ret
        );
      }
    // 不 break，进入 nextup 判断
    case "nextup":
      console.log(
        "getQuestionForB: 进入nextup判断, overallCorrectRate =",
        getOverallCorrectRate(wordObj)
      );
      if (getOverallCorrectRate(wordObj) < 0.2) {
        localData.state = "again";
        ret = "display";
        console.log(
          "getQuestionForB: overallCorrectRate < 0.2, state转换为again, 返回display"
        );
        return ret;
      }
      if (ret) {
        console.log("getQuestionForB: nextup阶段返回ret =", ret);
        return ret;
      }
      console.log(
        "getQuestionForB: nextup阶段未命中条件，返回加权非display（display概率<5%）"
      );
      return getWeightedRandomNonDisplay(0.05);
    case "again":
      localData.state = "random";
      console.log(
        "getQuestionForB: state为again, 转换为random, 返回错误率最高的题型"
      );
      return getHighestErrorType(wordObj);
    default:
      console.log("getQuestionForB: 默认返回加权非display（display概率<5%）");
      return getWeightedRandomNonDisplay(0.05);
  }
}

/**
 * familarity = C 的逻辑：
 * - 当展示次数 < 2 且 时长 < 1 分钟，首刷题型为 display；
 * - 当展示次数 < 4 且 时长 < 2 分钟，首刷题型在非 display 题型中加权随机选择（display概率保持在 3%以下）；
 * - 当整体正确率 < 20%（展示次数>=10），次刷题型为 display；
 * - 当 state 为 "again" 时，转换为 "random" 并返回错误率最高的题型。
 */
function getQuestionForC(wordObj, localData) {
  let ret = null;
  console.log("getQuestionForC: 初始state =", localData.state);
  switch (localData.state) {
    case "init":
      if (wordObj.showCount < 2 && wordObj.displayDuration < 1 * 60 * 1000) {
        localData.state = "nextup";
        ret = "display";
        console.log(
          "getQuestionForC: 条件1满足（<2 & <1min），state转换为nextup, 返回display"
        );
      } else if (
        wordObj.showCount < 4 &&
        wordObj.displayDuration < 2 * 60 * 1000
      ) {
        localData.state = "nextup";
        ret = getWeightedRandomNonDisplay(0.03);
        console.log(
          "getQuestionForC: 条件2满足（<4 & <2min），state转换为nextup, 返回非display =",
          ret
        );
      }
    // 不 break，进入 nextup
    case "nextup":
      console.log(
        "getQuestionForC: 进入nextup判断, overallCorrectRate =",
        getOverallCorrectRate(wordObj)
      );
      if (getOverallCorrectRate(wordObj) < 0.2) {
        localData.state = "again";
        ret = "display";
        console.log(
          "getQuestionForC: overallCorrectRate < 0.2, state转换为again, 返回display"
        );
        return ret;
      }
      if (ret) {
        console.log("getQuestionForC: nextup阶段返回ret =", ret);
        return ret;
      }
      console.log(
        "getQuestionForC: nextup阶段未命中条件，返回加权非display（display概率<3%）"
      );
      return getWeightedRandomNonDisplay(0.03);
    case "again":
      localData.state = "random";
      console.log(
        "getQuestionForC: state为again, 转换为random, 返回错误率最高的题型"
      );
      return getHighestErrorType(wordObj);
    default:
      console.log("getQuestionForC: 默认返回加权非display（display概率<3%）");
      return getWeightedRandomNonDisplay(0.03);
  }
}

/**
 * familarity = D 的逻辑：
 * - 当展示次数 < 1 且 时长 < 30 秒，首刷题型为 display；
 * - 当展示次数 < 10 且 时长 < 5 分钟，首刷题型必须为 fill-in；
 * - 当整体正确率 < 20%（展示次数>=10），次刷题型为 display；
 * - 当 state 为 "again" 时，转换为 "random" 并返回错误率最高的题型；
 * - 其他情况下，返回加权随机结果：display 概率 < 1%，fill-in 概率 40%，其他随机。
 */
function getQuestionForD(wordObj, localData) {
  let ret = null;
  console.log("getQuestionForD: 初始state =", localData.state);
  switch (localData.state) {
    case "init":
      if (wordObj.showCount < 1 && wordObj.displayDuration < 30 * 1000) {
        localData.state = "nextup";
        ret = "display";
        console.log(
          "getQuestionForD: 条件1满足（<1 & <30s），state转换为nextup, 返回display"
        );
      } else if (
        wordObj.showCount < 10 &&
        wordObj.displayDuration < 5 * 60 * 1000
      ) {
        localData.state = "nextup";
        ret = "fill-in";
        console.log(
          "getQuestionForD: 条件2满足（<10 & <5min），state转换为nextup, 返回fill-in"
        );
      }
    // 不 break，进入 nextup
    case "nextup":
      console.log(
        "getQuestionForD: 进入nextup判断, overallCorrectRate =",
        getOverallCorrectRate(wordObj)
      );
      if (getOverallCorrectRate(wordObj) < 0.2) {
        localData.state = "again";
        ret = "display";
        console.log(
          "getQuestionForD: overallCorrectRate < 0.2, state转换为again, 返回display"
        );
        return ret;
      }
      if (ret) {
        console.log("getQuestionForD: nextup阶段返回ret =", ret);
        return ret;
      }
      console.log("getQuestionForD: nextup阶段未命中条件，返回加权随机结果");
      return getWeightedRandomForD();
    case "again":
      localData.state = "random";
      console.log(
        "getQuestionForD: state为again, 转换为random, 返回错误率最高的题型"
      );
      return getHighestErrorType(wordObj);
    default:
      console.log("getQuestionForD: 默认返回加权随机结果");
      return getWeightedRandomForD();
  }
}

/**
 * 返回一个非 display 的随机题型，
 * 参数 maxDisplayProb 指定 display 类型最大出现概率，剩余返回其他类型。
 */
function getWeightedRandomNonDisplay(maxDisplayProb) {
  const chance = Math.random();
  if (chance < maxDisplayProb) {
    console.log("getWeightedRandomNonDisplay: 随机命中，返回 display");
    return "display";
  } else {
    const nonDisplay = ALL_TYPES.filter((t) => t !== "display");
    const res = pickRandom(nonDisplay);
    console.log("getWeightedRandomNonDisplay: 返回非display类型 =", res);
    return res;
  }
}

/**
 * 针对 familarity = D 的加权随机：
 * display 概率 < 1%，fill-in 概率 40%，其他随机。
 */
function getWeightedRandomForD() {
  const chance = Math.random();
  if (chance < 0.01) {
    console.log("getWeightedRandomForD: 随机命中，返回 display (<1%)");
    return "display";
  } else if (chance < 0.01 + 0.4) {
    console.log("getWeightedRandomForD: 随机命中，返回 fill-in (40%)");
    return "fill-in";
  } else {
    const others = ALL_TYPES.filter((t) => t !== "display" && t !== "fill-in");
    const res = pickRandom(others);
    console.log("getWeightedRandomForD: 返回其他题型 =", res);
    return res;
  }
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
    let data = wordObj.myScore[key]; // [count, correct, rate]
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
