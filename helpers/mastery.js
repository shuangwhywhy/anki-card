// helpers/mastery.js

/**
 * 将初始熟悉度字母映射为简短描述：
 * A：全新词汇
 * B：印象模糊
 * C：基本熟悉
 * D：深度掌握
 */
export function mapFamiliarity(letter) {
  const mapping = {
    A: "全新词汇",
    B: "印象模糊",
    C: "基本熟悉",
    D: "深度掌握",
  };
  return mapping[letter] || "未定义";
}

/**
 * 根据曝光次数和正确率返回熟练程度标签
 */
export function getProficiencyLabel(rate, exposures) {
  if (exposures < 5) return "待评估";
  if (rate >= 0.95) return "熟练";
  if (rate >= 0.8) return "欠缺";
  return "需重点练习";
}

/**
 * 计算掌握情况总结，针对词义理解、情景运用和拼写三个方面
 */
export function computeMasterySummary(record) {
  const score = record.myScore || {};
  // 词义理解：综合 word-chinese, word-english, chinese-to-word, english-to-word, synonym, antonym
  const meaningTypes = [
    "word-chinese",
    "word-english",
    "chinese-to-word",
    "english-to-word",
    "synonym",
    "antonym",
  ];
  let meaningExp = 0,
    meaningCorr = 0;
  meaningTypes.forEach((key) => {
    if (score[key] && Array.isArray(score[key])) {
      const [exp = 0, corr = 0] = score[key];
      meaningExp += exp;
      meaningCorr += corr;
    }
  });
  const meaningRate = meaningExp >= 5 ? meaningCorr / meaningExp : null;
  const meaningLabel = getProficiencyLabel(meaningRate, meaningExp);

  // 情景运用：仅统计 sentence
  let sentenceExp = 0,
    sentenceCorr = 0;
  if (score["sentence"] && Array.isArray(score["sentence"])) {
    const [exp = 0, corr = 0] = score["sentence"];
    sentenceExp = exp;
    sentenceCorr = corr;
  }
  const sentenceRate = sentenceExp >= 5 ? sentenceCorr / sentenceExp : null;
  const sentenceLabel = getProficiencyLabel(sentenceRate, sentenceExp);

  // 拼写：仅统计 fill-in
  let fillinExp = 0,
    fillinCorr = 0;
  if (score["fill-in"] && Array.isArray(score["fill-in"])) {
    const [exp = 0, corr = 0] = score["fill-in"];
    fillinExp = exp;
    fillinCorr = corr;
  }
  const fillinRate = fillinExp >= 5 ? fillinCorr / fillinExp : null;
  const fillinLabel = getProficiencyLabel(fillinRate, fillinExp);

  return `词义理解${meaningLabel}，情景运用${sentenceLabel}，拼写${fillinLabel}`;
}

/**
 * 计算各方面正确率（百分比），返回对象：
 * { meaningRate, sentenceRate, fillinRate }
 */
export function computeRates(record) {
  const score = record.myScore || {};
  const meaningTypes = [
    "word-chinese",
    "word-english",
    "chinese-to-word",
    "english-to-word",
    "synonym",
    "antonym",
  ];
  let meaningExp = 0,
    meaningCorr = 0;
  meaningTypes.forEach((key) => {
    if (score[key] && Array.isArray(score[key])) {
      const [exp = 0, corr = 0] = score[key];
      meaningExp += exp;
      meaningCorr += corr;
    }
  });
  let meaningRate =
    meaningExp >= 5 ? Math.round((meaningCorr / meaningExp) * 100) : 0;

  let sentenceExp = 0,
    sentenceCorr = 0;
  if (score["sentence"] && Array.isArray(score["sentence"])) {
    const [exp = 0, corr = 0] = score["sentence"];
    sentenceExp = exp;
    sentenceCorr = corr;
  }
  let sentenceRate =
    sentenceExp >= 5 ? Math.round((sentenceCorr / sentenceExp) * 100) : 0;

  let fillinExp = 0,
    fillinCorr = 0;
  if (score["fill-in"] && Array.isArray(score["fill-in"])) {
    const [exp = 0, corr = 0] = score["fill-in"];
    fillinExp = exp;
    fillinCorr = corr;
  }
  let fillinRate =
    fillinExp >= 5 ? Math.round((fillinCorr / fillinExp) * 100) : 0;

  return { meaningRate, sentenceRate, fillinRate };
}

/**
 * 计算题型统计：返回最擅长和最不擅长的题型（曝光不足 5 的不计入）
 */
export function computeQuestionTypeStats(record) {
  const score = record.myScore || {};
  const types = [
    "word-chinese",
    "word-english",
    "chinese-to-word",
    "english-to-word",
    "synonym",
    "antonym",
    "sentence",
    "fill-in",
  ];
  let evaluated = []; // { type, rate }
  types.forEach((type) => {
    if (score[type] && Array.isArray(score[type])) {
      const [exp = 0, corr = 0] = score[type];
      if (exp >= 5) {
        evaluated.push({ type, rate: corr / exp });
      }
    }
  });
  let best =
    evaluated.length > 0
      ? evaluated.reduce((prev, curr) => (curr.rate > prev.rate ? curr : prev))
          .type
      : "无";
  let worst =
    evaluated.length > 0
      ? evaluated.reduce((prev, curr) => (curr.rate < prev.rate ? curr : prev))
          .type
      : "无";
  return { best, worst };
}

/**
 * 计算总得分：初始 50 分，加上 (平均正确率 - 0.5)×100，最后控制在 0～100 分范围内
 */
export function computeTotalScore(record) {
  const score = record.myScore || {};
  const types = [
    "word-chinese",
    "word-english",
    "chinese-to-word",
    "english-to-word",
    "synonym",
    "antonym",
    "sentence",
    "fill-in",
  ];
  let totalExp = 0,
    totalCorr = 0;
  types.forEach((type) => {
    if (score[type] && Array.isArray(score[type])) {
      const [exp = 0, corr = 0] = score[type];
      totalExp += exp;
      totalCorr += corr;
    }
  });
  let avgRate = totalExp >= 5 ? totalCorr / totalExp : 0.5;
  let rawScore = 50 + (avgRate - 0.5) * 100;
  if (rawScore > 100) rawScore = 100;
  if (rawScore < 0) rawScore = 0;
  return Math.round(rawScore);
}
