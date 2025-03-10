// helpers/generate-question-data.js

/**
 * 统一管理所有题型
 */
export const ALL_TYPES = [
  "fill-in",
  "display",
  "word-chinese",
  "word-english",
  "chinese-to-word",
  "english-to-word",
  "synonym",
  "antonym",
  "sentence",
];

/**
 * 主函数：为当前词条 item 生成/校验 correctWord, distractors 等。
 * @param {Object} item 当前词条对象
 * @param {Object[]} entireVocabulary 整个词库
 * @param {String} questionType 具体题型
 * @returns {Object} item (带有更新后的 distractors, correctWord 等字段)
 */
export function generateQuestionData(item, entireVocabulary, questionType) {
  // 1) 若是 sentence 且没有 correctWord，则简单兜底
  if (questionType === "sentence" && !item.correctWord) {
    item.correctWord = "someDefaultWord";
  }

  // 如果是 synonym 类型但缺少 correctSynonym，只做 console.error 提示
  if (questionType === "synonym" && !item.correctSynonym) {
    console.error(
      `ChoiceHeader: choice-type 为 synonym，但未提供 correctSynonym。item=`,
      item
    );
    // 保证流程继续
    item.correctSynonym = item.word || "someDefaultSynonym";
  }

  // 2) 确定 correctValue(正确答案文本) & mode("chinese"|"english"|"word")
  //    根据 questionType 判断
  const { correctValue, mode } = _extractCorrectValue(item, questionType);

  // 3) 若 item.distractors 已有且数量>=3，先过滤出同语言/类型
  if (item.distractors && item.distractors.length >= 3) {
    item.distractors = _filterDistractors(item.distractors, mode, correctValue);
    // 若过滤后仍>=3，就无需自动生成
    if (item.distractors.length >= 3) {
      return item;
    }
  }

  // 4) 从 entireVocabulary 中找可用干扰项(同语言/类型、不含自己、不等于 correctValue)
  let candidates = entireVocabulary.filter((it) => it !== item);
  candidates = candidates
    .map((c) => _extractValueByMode(c, mode))
    .filter(Boolean);
  // 去重、去相同
  const setCandidates = new Set(candidates);
  setCandidates.delete(correctValue);
  // 洗牌
  const shuffled = _shuffle(Array.from(setCandidates));

  // 5) 取前3个
  let chosen = shuffled.slice(0, 3);
  // 过滤掉不合语言/类型
  chosen = _filterDistractors(chosen, mode, correctValue);

  // 6) 若还是不足3个 => 保留 chosen 长度即可(最少1 => correct + 1 => 2选项)
  item.distractors = chosen;
  return item;
}

/**
 * 根据 questionType，提取 item 中的正确答案文本 correctValue 以及 mode
 * "word-chinese" => correctValue = item.chineseDefinition, mode="chinese"
 * "word-english" => correctValue = item.englishDefinition, mode="english"
 * "synonym"/"antonym"/"sentence"/"chinese-to-word"/"english-to-word" => 视为 word
 */
function _extractCorrectValue(item, questionType) {
  let correctValue = "";
  let mode = "word"; // "chinese"|"english"|"word"
  switch (questionType) {
    case "word-chinese":
      correctValue = item.chineseDefinition || "暂无中文释义";
      mode = "chinese";
      break;
    case "word-english":
      correctValue = item.englishDefinition || "No English Def";
      mode = "english";
      break;
    case "chinese-to-word":
    case "english-to-word":
    case "synonym":
    case "antonym":
    case "sentence":
      // 视为 "word" 类型(同义词/反义词/单词/sentence)
      // correctValue 可能是 item.correctSynonym/correctAntonym/correctWord/...
      correctValue =
        item.correctSynonym ||
        item.correctAntonym ||
        item.correctWord ||
        item.word ||
        "";
      mode = "word";
      break;
    default:
      // fallback => "word-chinese"
      correctValue = item.chineseDefinition || "暂无中文释义";
      mode = "chinese";
  }
  return { correctValue, mode };
}

/**
 * 提取 c 中与 mode 匹配的值(中文释义/英文释义/单词)
 */
function _extractValueByMode(item, mode) {
  switch (mode) {
    case "chinese":
      return item.chineseDefinition || "";
    case "english":
      return item.englishDefinition || "";
    case "word":
      // 优先 correctSynonym/correctAntonym/correctWord/word
      if (item.correctSynonym) return item.correctSynonym;
      if (item.correctAntonym) return item.correctAntonym;
      if (item.correctWord) return item.correctWord;
      return item.word || "";
    default:
      return "";
  }
}

/**
 * 过滤 distractors 中与 correctValue 同语言/类型的值
 * 同时移除与 correctValue 相同的值
 */
function _filterDistractors(distractors, mode, correctValue) {
  // 根据 mode 判断中文/英文/word
  const isChineseMode = mode === "chinese";
  const isEnglishMode = mode === "english";
  const isWordMode = mode === "word";

  // 移除相同
  let arr = distractors.filter((d) => d !== correctValue);
  // 如果中文模式 => d 应包含中文字符
  // 如果英文模式 => d 应该是纯英文
  // 如果 word => 只要不包含中文就行
  arr = arr.filter((d) => {
    if (isChineseMode) {
      return /[\u4e00-\u9fa5]/.test(d);
    } else if (isEnglishMode) {
      return /^[A-Za-z0-9\s]+$/.test(d);
    } else if (isWordMode) {
      return !/[\u4e00-\u9fa5]/.test(d);
    }
    return false;
  });
  return _shuffle(arr).slice(0, 3);
}

/** 洗牌 */
function _shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
