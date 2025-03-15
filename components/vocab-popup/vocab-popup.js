// components/vocab-popup/vocab-popup.js
class VocabPopup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.data = {};
    // 用于保存 Chart.js 实例
    this.gaugeChart = null;
    this.barChart = null;
    this._render();

    // 检测系统暗色模式
    this.darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.darkModeMediaQuery.addEventListener("change", () =>
      this._applyTheme()
    );
  }

  /**
   * setData 接受数据对象：
   * {
   *   mappedFamiliarity: string,
   *   showCount: number,
   *   displayDuration: number, // 毫秒
   *   masterySummary: string,
   *   totalScore: number,
   *   bestType: string,   // 代码标识（待转换为自然语言）
   *   worstType: string,  // 代码标识
   *   rates: { meaningRate, sentenceRate, fillinRate } // 百分比
   * }
   */
  setData(data) {
    this.data = data;
    this._render();
    // 渲染完 DOM 后绘制图表
    requestAnimationFrame(() => this._renderCharts());
  }

  // 将题型代码映射为自然语言说明
  _mapQuestionType(type) {
    const mapping = {
      "word-chinese": "单词释义（中）",
      "word-english": "单词释义（英）",
      "chinese-to-word": "中译英",
      "english-to-word": "英译中",
      synonym: "同义词选择",
      antonym: "反义词选择",
      sentence: "例句选词",
      "fill-in": "拼写填空",
    };
    return mapping[type] || type;
  }

  // 获取主题色
  _getThemeColors() {
    const isDarkMode = this.darkModeMediaQuery.matches;
    return {
      background: isDarkMode
        ? "rgba(30, 30, 30, 0.8)"
        : "rgba(255, 255, 255, 0.8)",
      text: isDarkMode ? "#ffffff" : "#333333",
      subtext: isDarkMode ? "#bbbbbb" : "#666666",
      accent: "#2196f3",
      success: "#4caf50",
      warning: "#ff9800",
      error: "#f44336",
      chartBackground: isDarkMode ? "#333333" : "#f5f5f5",
      gridLines: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    };
  }

  // 应用主题
  _applyTheme() {
    this._render();
    requestAnimationFrame(() => this._renderCharts());
  }

  _render() {
    if (!this.shadowRoot) return;

    const {
      mappedFamiliarity = "",
      showCount = 0,
      displayDuration = 0,
      masterySummary = "",
      totalScore = 50,
      bestType = "",
      worstType = "",
      rates = { meaningRate: 0, sentenceRate: 0, fillinRate: 0 },
    } = this.data || {};

    // 将毫秒转换为秒
    const displaySeconds = Math.round(displayDuration / 1000);

    // 为总分生成对应的表情和颜色
    const scoreEmoji = this._getScoreEmoji(totalScore);
    const scoreColor = this._getScoreColor(totalScore);

    // 设置CSS变量作为自定义属性，供CSS文件访问
    if (this.shadowRoot.host) {
      const host = this.shadowRoot.host;
      const colors = this._getThemeColors();

      // 设置所有CSS变量
      this._setCSSVars(host, {
        "--score-color": scoreColor,
        "--color-bg": colors.background,
        "--color-text": colors.text,
        "--color-subtext": colors.subtext,
        "--color-accent": colors.accent,
        "--color-success": colors.success,
        "--color-warning": colors.warning,
        "--color-error": colors.error,
        "--color-chart-bg": colors.chartBackground,
        "--color-grid-lines": colors.gridLines,
      });
    }

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="components/vocab-popup/vocab-popup.css">
      <div class="popup-container">
        <div class="info-block">
          <div class="header">
            <div class="title">词汇掌握详情</div>
          </div>
          
          <div class="highlight">
            <div class="info-label">掌握得分</div>
            <div class="info-value">${scoreEmoji} ${totalScore}</div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">熟悉度</div>
              <div class="info-value">
                <span class="mastery-indicator mastery-level-${this._getMasteryLevel(
                  mappedFamiliarity
                )}">
                  <span class="dot"></span>
                  ${mappedFamiliarity}
                </span>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-label">掌握情况</div>
              <div class="info-value">${masterySummary}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">展示次数</div>
              <div class="info-value">
                <span class="icon">📊</span>
                ${showCount}
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-label">展示时间</div>
              <div class="info-value">
                <span class="icon">⏱️</span>
                ${displaySeconds}秒
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-label">最擅长</div>
              <div class="info-value">
                <span class="icon">💪</span>
                ${this._mapQuestionType(bestType)}
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-label">最不擅长</div>
              <div class="info-value">
                <span class="icon">🔍</span>
                ${this._mapQuestionType(worstType)}
              </div>
            </div>
          </div>
        </div>
        
        <div class="charts-block">
          <div class="chart-item">
            <div class="chart-title">总体掌握度</div>
            <canvas id="gaugeChart" width="180" height="120"></canvas>
          </div>
          <div class="chart-item">
            <div class="chart-title">各类型得分</div>
            <canvas id="barChart" width="200" height="140"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  // 设置多个CSS变量的辅助方法，避免重复代码
  _setCSSVars(element, cssVars) {
    if (element && typeof element.style !== "undefined") {
      Object.entries(cssVars).forEach(([prop, value]) => {
        element.style.setProperty(prop, value);
      });
    }
  }

  // 根据得分获取相应表情
  _getScoreEmoji(score) {
    if (score >= 90) return "🌟";
    if (score >= 75) return "😀";
    if (score >= 60) return "🙂";
    if (score >= 40) return "😐";
    return "🔍";
  }

  // 根据得分获取相应颜色
  _getScoreColor(score) {
    if (score >= 90) return "#4caf50"; // 绿色
    if (score >= 75) return "#8bc34a"; // 浅绿色
    if (score >= 60) return "#ffeb3b"; // 黄色
    if (score >= 40) return "#ff9800"; // 橙色
    return "#f44336"; // 红色
  }

  // 根据熟悉度获取熟练度级别（用于样式）
  _getMasteryLevel(familiarity) {
    const levels = {
      非常熟悉: "high",
      熟悉: "high",
      较熟悉: "medium",
      一般: "medium",
      较陌生: "low",
      陌生: "low",
      非常陌生: "low",
    };
    return levels[familiarity] || "medium";
  }

  _renderCharts() {
    // 确保Chart.js已加载
    if (typeof window["Chart"] === "undefined") {
      console.warn("Chart.js 未加载，请确保从 vendor/chart.min.js 正确加载。");
      return;
    }

    // 销毁旧的图表实例
    if (this.gaugeChart) this.gaugeChart.destroy();
    if (this.barChart) this.barChart.destroy();

    const { totalScore = 50, rates } = this.data;
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;

    const gaugeCanvas = shadowRoot.getElementById("gaugeChart");
    const barCanvas = shadowRoot.getElementById("barChart");
    if (!gaugeCanvas || !barCanvas) return;

    // 安全类型转换 - 正确处理canvas元素
    const gaugeCtx =
      gaugeCanvas && "getContext" in gaugeCanvas
        ? gaugeCanvas.getContext("2d")
        : null;
    const barCtx =
      barCanvas && "getContext" in barCanvas
        ? barCanvas.getContext("2d")
        : null;
    if (!gaugeCtx || !barCtx) return;

    const colors = this._getThemeColors();
    const Chart = window["Chart"];

    // 仪表盘：Doughnut 图模拟半圆仪表
    this.gaugeChart = new Chart(gaugeCtx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [totalScore, 100 - totalScore],
            backgroundColor: [
              this._getScoreColor(totalScore),
              colors.chartBackground,
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        rotation: -Math.PI,
        circumference: Math.PI,
        cutout: "75%",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { enabled: false },
          legend: { display: false },
        },
        animation: {
          duration: 1500,
          easing: "easeOutQuart",
        },
      },
    });

    // 自定义绘制仪表盘中间的分数和表情
    const gaugeCenterText = {
      id: "gaugeCenterText",
      afterDraw: (chart) => {
        const {
          ctx,
          chartArea: { width, height },
        } = chart;

        // 中央区域坐标
        const centerX = width / 2;
        const centerY = height / 1.2;

        // 绘制分数
        ctx.save();
        ctx.font = `bold 18px var(--font-main, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)`;
        ctx.fillStyle = this._getScoreColor(totalScore);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${totalScore}分`, centerX, centerY);

        // 绘制表情
        ctx.font = "16px Arial";
        ctx.fillText(this._getScoreEmoji(totalScore), centerX, centerY - 24);

        ctx.restore();
      },
    };
    this.gaugeChart.config.plugins = [gaugeCenterText];
    this.gaugeChart.update();

    // 条形图：展示词义、情景、拼写三个方面正确率
    const { meaningRate = 0, sentenceRate = 0, fillinRate = 0 } = rates || {};

    // 自定义渐变色
    const gradientBg = (ctx, startColor, endColor) => {
      const gradient = ctx.createLinearGradient(0, 0, 300, 0);
      gradient.addColorStop(0, startColor);
      gradient.addColorStop(1, endColor);
      return gradient;
    };

    this.barChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: ["词义", "情景", "拼写"],
        datasets: [
          {
            label: "正确率(%)",
            data: [meaningRate, sentenceRate, fillinRate],
            backgroundColor: [
              gradientBg(barCtx, colors.accent, "#64b5f6"),
              gradientBg(barCtx, colors.warning, "#ffcc80"),
              gradientBg(barCtx, colors.error, "#ef9a9a"),
            ],
            borderRadius: 4,
            barThickness: 12,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: colors.gridLines,
              drawBorder: false,
            },
            ticks: {
              color: colors.subtext,
              font: {
                size: 10,
              },
              stepSize: 25,
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: colors.text,
              font: {
                size: 12,
              },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: colors.background,
            titleColor: colors.text,
            bodyColor: colors.text,
            bodyFont: {
              size: 12,
            },
            displayColors: false,
            callbacks: {
              label: (context) => `正确率: ${context.raw}%`,
            },
          },
        },
        animation: {
          duration: 1000,
          easing: "easeOutQuart",
        },
      },
    });
  }
}

customElements.define("vocab-popup", VocabPopup);
