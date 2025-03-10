// helpers/generate-choice-question.js

// 在本文件内定义所有题型，避免外部引用
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

/**
 * 题型定义（共7种）：
 * "word-chinese": 给单词选中文释义
 * "word-english": 给单词选英文释义
 * "chinese-to-word": 给中文释义选单词
 * "english-to-word": 给英文释义选单词
 * "synonym": 给单词选同义词
 * "antonym": 给单词选反义词
 * "sentence": 给缺词例句选单词
 */
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
 * 从整个学习集 entireVocabulary 中随机生成一道选择题。
 * 数据来源为 CSV 导入，每个 item 至少包含：
 *    - word: string
 *    - chineseDefinition: string
 *    - englishDefinition: string
 *    - synonyms: string[]  (数组，允许为空，但若为空则不出同义词题)
 *    - antonyms: string[]  (数组，允许为空，但若为空则不出反义词题)
 *    - sentences: string[] (数组，允许为空，但对于 sentence 题型必有)
 *
 * 注意：correctWord 不是 CSV 原始数据，应在生成题目时根据 type 自动生成。
 *
 * @param {Array} entireVocabulary - 学习集数组
 * @param {string} [questionType] - 指定题型（若未指定，则随机选择 CHOICE_TYPES 中一种）
 * @returns {Object|null} 题目对象，格式：
 * {
 *   questionType,     // 题型（7种之一）
 *   questionText,     // 题干文本（单词、释义或处理后的句子）
 *   choices,          // 选项数组（2~4个，保证同语言同类型，不混杂）
 *   correctIndex,     // 正确选项在 choices 中的下标
 *   word          // 当前主词汇（对于单词选题或填空题，取 item.word）
 * }
 */
export function generateChoiceQuestion(entireVocabulary, questionType) {
  if (!entireVocabulary || entireVocabulary.length === 0) {
    console.error("generateChoiceQuestion: 学习集为空");
    return null;
  }

  // 1. 确定题型
  if (!questionType || !ALL_TYPES.includes(questionType)) {
    const rand = Math.floor(Math.random() * CHOICE_TYPES.length);
    questionType = CHOICE_TYPES[rand];
  }

  // 2. 随机选取一个主词条
  const item =
    entireVocabulary[Math.floor(Math.random() * entireVocabulary.length)];

  // 3. 如果题型为 "synonym" 或 "antonym"，但当前词条对应数组为空，则随机选择其他题型
  if (
    questionType === "synonym" &&
    (!Array.isArray(item.synonyms) || item.synonyms.length === 0)
  ) {
    const available = CHOICE_TYPES.filter((t) => t !== "synonym");
    const rand = Math.floor(Math.random() * available.length);
    questionType = available[rand];
  }
  if (
    questionType === "antonym" &&
    (!Array.isArray(item.antonyms) || item.antonyms.length === 0)
  ) {
    const available = CHOICE_TYPES.filter((t) => t !== "antonym");
    const rand = Math.floor(Math.random() * available.length);
    questionType = available[rand];
  }

  // 4. 根据题型构造题干、正确答案、主词汇
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
      // 此处必有 synonyms 数组，否则前面已转换题型
      correctAnswer = pickRandom(item.synonyms);
      break;
    case "antonym":
      questionText = item.word || "???";
      correctAnswer = pickRandom(item.antonyms);
      break;
    case "sentence":
      if (Array.isArray(item.sentences) && item.sentences.length > 0) {
        const sentence = pickRandom(item.sentences);
        if (sentence.toLowerCase().includes((item.word || "").toLowerCase())) {
          questionText = replaceWordWithUnderscore(sentence, item.word);
          correctAnswer = item.word || "???";
        } else {
          console.error("generateChoiceQuestion: 句子中未找到主词", item);
          questionText = sentence;
          correctAnswer = item.word || "???";
        }
      } else {
        console.error("generateChoiceQuestion: 例句题型缺少 sentences", item);
        questionText = "___ (缺少句子)";
        correctAnswer = item.word || "defaultWord";
      }
      break;
    default:
      questionText = item.word;
      correctAnswer = item.word;
  }

  // 5. 生成干扰项（选项必须与 correctAnswer 同语言/同类型，不混杂）
  const distractors = pickDistractors(
    entireVocabulary,
    item,
    questionType,
    correctAnswer
  );

  // 6. 构造选项数组：正确答案 + 干扰项；若不足2个，则仅保留正确答案
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

/** 从数组中随机选一个元素 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 替换 sentence 中出现 item.word（忽略大小写）的部分，
 * 替换为连续下划线（长度取决于主词去空格后的字符数，最少3个）
 */
function replaceWordWithUnderscore(sentence, word) {
  const re = new RegExp(word, "gi");
  const underscore = makeUnderscoreSegment(word);
  const replaced = sentence.replace(re, underscore);
  if (replaced === sentence) {
    console.error("replaceWordWithUnderscore: 未匹配到主词，fallback");
    return sentence.replace(/\w+/, "___");
  }
  return replaced;
}

function makeUnderscoreSegment(word) {
  const stripped = word.replace(/\s+/g, "");
  const len = Math.max(3, stripped.length);
  return "_".repeat(len);
}

/**
 * 从整个学习集中过滤出干扰项：
 * 选项必须与 correctAnswer 同语言/同类型：
 *   - 如果 correctAnswer 含有中文，则只选含中文的；
 *   - 如果 correctAnswer 为纯英文，则只选纯英文的；
 *   - 对于 sentence 类型，干扰项取 candidate.word，要求与 correctAnswer 同语言；
 * 排除当前 item 以及与 correctAnswer 相同的值。
 * 返回一个数组（可能不足3个）。
 */
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
      extracted = extracted.filter((d) => /^[A-Za-z0-9\s-]+$/.test(d));
      break;
    case "chinese-to-word":
      extracted = candidates.map((it) => it.word).filter(Boolean);
      extracted = extracted.filter((d) => /^[A-Za-z0-9\s-]+$/.test(d));
      break;
    case "english-to-word":
      extracted = candidates.map((it) => it.word).filter(Boolean);
      extracted = extracted.filter((d) => /^[A-Za-z0-9\s-]+$/.test(d));
      break;
    case "synonym":
      extracted = candidates.flatMap((it) =>
        Array.isArray(it.synonyms) ? it.synonyms : []
      );
      extracted = extracted.filter((d) => !/^[A-Za-z0-9\s-]+$/.test(d));
      break;
    case "antonym":
      extracted = candidates.flatMap((it) =>
        Array.isArray(it.antonyms) ? it.antonyms : []
      );
      extracted = extracted.filter((d) => !/^[A-Za-z0-9\s-]+$/.test(d));
      break;
    case "sentence":
      extracted = candidates.map((it) => it.word).filter(Boolean);
      extracted = extracted.filter((d) => /^[A-Za-z0-9\s-]+$/.test(d));
      break;
    default:
      extracted = candidates.map((it) => it.word).filter(Boolean);
      break;
  }
  extracted = extracted.filter((d) => d !== correctAnswer);
  return shuffle(extracted).slice(0, 3);
}

/** 简单洗牌 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
