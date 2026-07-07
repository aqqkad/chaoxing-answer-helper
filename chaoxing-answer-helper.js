(function () {
  const PANEL_ID = "cx-answer-helper-panel";
  const STYLE_ID = "cx-answer-helper-style";
  const TEXTAREA_ID = "cx-answer-helper-input";
  const STATUS_ID = "cx-answer-helper-status";

  if (document.getElementById(PANEL_ID)) {
    const panel = document.getElementById(PANEL_ID);
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    return;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 88px;
        right: 24px;
        z-index: 999999;
        width: 320px;
        padding: 14px;
        border-radius: 14px;
        background: rgba(20, 28, 45, 0.96);
        color: #f4f7fb;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      #${PANEL_ID} * {
        box-sizing: border-box;
      }
      #${PANEL_ID} .cx-title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 700;
      }
      #${PANEL_ID} .cx-tip {
        margin: 0 0 10px;
        font-size: 12px;
        line-height: 1.5;
        color: #c9d4e7;
      }
      #${PANEL_ID} textarea {
        width: 100%;
        height: 180px;
        resize: vertical;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 10px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        font-size: 13px;
        line-height: 1.5;
      }
      #${PANEL_ID} textarea::placeholder {
        color: #aebcd3;
      }
      #${PANEL_ID} .cx-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      #${PANEL_ID} button {
        border: 0;
        border-radius: 10px;
        padding: 10px 12px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }
      #${PANEL_ID} .cx-primary {
        flex: 1;
        background: #58a6ff;
        color: #0b1728;
      }
      #${PANEL_ID} .cx-secondary {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
      }
      #${PANEL_ID} .cx-status {
        margin-top: 10px;
        min-height: 18px;
        font-size: 12px;
        line-height: 1.5;
        color: #dce6f7;
        white-space: pre-wrap;
      }
    `;
    document.head.appendChild(style);
  }

  function uniqueSortedLetters(text) {
    return Array.from(new Set(text.split(""))).sort().join("");
  }

  function normalizeAnswer(raw) {
    let text = String(raw || "").trim().toUpperCase();
    if (!text) {
      return "";
    }

    if (/^(对|正确|TRUE|T|√)$/.test(text)) {
      return "A";
    }
    if (/^(错|错误|FALSE|F|X|×)$/.test(text)) {
      return "B";
    }

    const letters = text.match(/[A-Z]/g);
    if (!letters) {
      return "";
    }

    return uniqueSortedLetters(letters.join(""));
  }

  function getQuestions() {
    return Array.from(document.querySelectorAll('.questionLi[id^="question"]')).map(function (el, index) {
      const qid = el.getAttribute("data") || el.id.replace(/^question/, "");
      const title = (el.querySelector("h3") || {}).textContent || "";
      const numberMatch = title.trim().match(/^(\d+)\./);
      const number = numberMatch ? Number(numberMatch[1]) : index + 1;
      const answerInput = document.getElementById("answer" + qid);
      const typeInput = document.getElementById("answertype" + qid);
      const optionMap = new Map();

      Array.from(el.querySelectorAll(".answerBg")).forEach(function (optionEl) {
        const badge = optionEl.querySelector("span[data]");
        const letter = badge ? badge.textContent.trim().toUpperCase() : "";
        if (letter) {
          optionMap.set(letter, optionEl);
        }
      });

      return {
        el: el,
        qid: qid,
        number: number,
        answerInput: answerInput,
        type: typeInput ? String(typeInput.value || "") : "",
        optionMap: optionMap
      };
    });
  }

  function parseInput(rawText, questions) {
    const raw = String(rawText || "").trim();
    const lines = raw
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    const result = new Map();
    if (!lines.length) {
      return result;
    }

    const inlineNumberedMatches = Array.from(
      raw.matchAll(/(?:^|\s)(\d+)\s*[\.\-、:：]\s*([^\s]+)/g)
    );
    if (inlineNumberedMatches.length > 1) {
      inlineNumberedMatches.forEach(function (match) {
        result.set(Number(match[1]), normalizeAnswer(match[2]));
      });
      return result;
    }

    const numberedPattern = /^(\d+)\s*[\.\-、:：，,\s]\s*(.+)$/;
    const allNumbered = lines.every(function (line) {
      return numberedPattern.test(line);
    });

    if (allNumbered) {
      lines.forEach(function (line) {
        const match = line.match(numberedPattern);
        if (!match) {
          return;
        }
        result.set(Number(match[1]), normalizeAnswer(match[2]));
      });
      return result;
    }

    if (lines.length === 1) {
      const tokens = raw
        .split(/[\/\s,，；;|]+/)
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean);

      if (tokens.length > 1) {
        tokens.forEach(function (token, index) {
          if (questions[index]) {
            result.set(questions[index].number, normalizeAnswer(token));
          }
        });
        return result;
      }
    }

    lines.forEach(function (line, index) {
      if (questions[index]) {
        result.set(questions[index].number, normalizeAnswer(line));
      }
    });

    return result;
  }

  function getCurrentAnswer(question) {
    return normalizeAnswer(question.answerInput ? question.answerInput.value : "");
  }

  function clickOption(optionEl) {
    optionEl.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  }

  function applySingle(question, desired) {
    if (!desired) {
      return { status: "skip" };
    }

    const letter = desired.charAt(0);
    const optionEl = question.optionMap.get(letter);
    if (!optionEl) {
      return { status: "invalid", detail: "没有找到选项 " + letter };
    }

    const current = getCurrentAnswer(question);
    if (current === letter) {
      return { status: "unchanged" };
    }

    clickOption(optionEl);
    return getCurrentAnswer(question) === letter
      ? { status: "applied" }
      : { status: "invalid", detail: "点击后未成功写入 " + letter };
  }

  function applyMultiple(question, desired) {
    if (!desired) {
      return { status: "skip" };
    }

    const target = uniqueSortedLetters(desired);
    const current = getCurrentAnswer(question);

    current.split("").forEach(function (letter) {
      if (letter && !target.includes(letter)) {
        const optionEl = question.optionMap.get(letter);
        if (optionEl) {
          clickOption(optionEl);
        }
      }
    });

    target.split("").forEach(function (letter) {
      const latest = getCurrentAnswer(question);
      if (!latest.includes(letter)) {
        const optionEl = question.optionMap.get(letter);
        if (optionEl) {
          clickOption(optionEl);
        }
      }
    });

    const after = getCurrentAnswer(question);
    return after === target
      ? (current === target ? { status: "unchanged" } : { status: "applied" })
      : { status: "invalid", detail: "目标 " + target + "，实际 " + (after || "空") };
  }

  function applyAnswers(rawText) {
    const questions = getQuestions();
    const answerMap = parseInput(rawText, questions);

    if (!answerMap.size) {
      return "请输入答案后再点“应用答案”。";
    }

    let applied = 0;
    let unchanged = 0;
    const issues = [];

    questions.forEach(function (question) {
      if (!answerMap.has(question.number)) {
        return;
      }

      const desired = answerMap.get(question.number);
      let result;

      if (question.type === "1" || question.type === "21") {
        result = applyMultiple(question, desired);
      } else {
        result = applySingle(question, desired);
      }

      if (result.status === "applied") {
        applied += 1;
      } else if (result.status === "unchanged" || result.status === "skip") {
        unchanged += 1;
      } else {
        issues.push("第 " + question.number + " 题：" + result.detail);
      }
    });

    const parsedCount = answerMap.size;
    let summary = "已处理 " + parsedCount + " 题，成功变更 " + applied + " 题";
    if (unchanged) {
      summary += "，原本已一致 " + unchanged + " 题";
    }
    if (issues.length) {
      summary += "\n" + issues.slice(0, 8).join("\n");
      if (issues.length > 8) {
        summary += "\n其余问题共 " + (issues.length - 8) + " 条。";
      }
    }

    return summary;
  }

  function setStatus(text) {
    const statusEl = document.getElementById(STATUS_ID);
    if (statusEl) {
      statusEl.textContent = text;
    }
  }

  ensureStyle();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="cx-title">答案辅助填题</div>
    <div class="cx-tip">支持三种格式：<br>1. 按顺序一行一个：A / ABC / T<br>2. 单行分隔：A/ABC/T/F/BD<br>3. 带题号：1.A  2.ABC  41.T</div>
    <textarea id="${TEXTAREA_ID}" placeholder="示例：&#10;A&#10;ABC&#10;T&#10;&#10;或者&#10;A/ABC/T/F&#10;&#10;或者&#10;1.A&#10;2.ABC&#10;41.T"></textarea>
    <div class="cx-actions">
      <button type="button" class="cx-primary" id="cx-answer-helper-apply">应用答案</button>
      <button type="button" class="cx-secondary" id="cx-answer-helper-clear">清空</button>
      <button type="button" class="cx-secondary" id="cx-answer-helper-close">关闭</button>
    </div>
    <div class="cx-status" id="${STATUS_ID}">把答案贴进来后，点“应用答案”。</div>
  `;

  document.body.appendChild(panel);

  document.getElementById("cx-answer-helper-apply").addEventListener("click", function () {
    const text = document.getElementById(TEXTAREA_ID).value;
    setStatus(applyAnswers(text));
  });

  document.getElementById("cx-answer-helper-clear").addEventListener("click", function () {
    document.getElementById(TEXTAREA_ID).value = "";
    setStatus("输入框已清空。");
  });

  document.getElementById("cx-answer-helper-close").addEventListener("click", function () {
    panel.style.display = "none";
  });

  document.getElementById(TEXTAREA_ID).addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      document.getElementById("cx-answer-helper-apply").click();
    }
  });
})();
