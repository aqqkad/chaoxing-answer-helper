// ==UserScript==
// @name         超星作业答案辅助
// @namespace    https://github.com/aqqkad/chaoxing-answer-helper
// @version      1.1.1
// @description  超星作业答案辅助填题，支持单选、多选、判断、填空，兼容同步/异步更新答案的页面
// @author       aqqkad
// @match        *://mooc1.chaoxing.com/*
// @match        *://mooc1-1.chaoxing.com/*
// @match        *://mooc1-2.chaoxing.com/*
// @match        *://mooc2-ans.chaoxing.com/*
// @updateURL    https://raw.githubusercontent.com/aqqkad/chaoxing-answer-helper/main/chaoxing-answer-helper.meta.js
// @downloadURL  https://raw.githubusercontent.com/aqqkad/chaoxing-answer-helper/main/chaoxing-answer-helper.user.js
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const PANEL_ID = "cx-answer-helper-panel";
  const TOGGLE_ID = "cx-answer-helper-toggle";
  const STYLE_ID = "cx-answer-helper-style";
  const TEXTAREA_ID = "cx-answer-helper-input";
  const STATUS_ID = "cx-answer-helper-status";

  const TYPE_NAMES = {
    single: "单选",
    multiple: "多选",
    judge: "判断",
    fill: "填空",
    matching: "连线",
    unknown: "未知"
  };

  if (document.getElementById(PANEL_ID)) {
    const panel = document.getElementById(PANEL_ID);
    setExpanded(panel.style.display === "none");
    return;
  }

  function setExpanded(expanded) {
    document.getElementById(PANEL_ID).style.display = expanded ? "block" : "none";
    const toggle = document.getElementById(TOGGLE_ID);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.textContent = expanded ? "收起答案助手" : "答案助手";
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${TOGGLE_ID} {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 999999;
        border: 0;
        border-radius: 8px;
        padding: 10px 16px;
        background: #2563eb;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 13px;
        font-weight: 600;
      }
      #${TOGGLE_ID}:hover {
        background: #1d4ed8;
      }
      #${PANEL_ID} {
        position: fixed;
        top: 88px;
        right: 24px;
        z-index: 999999;
        width: 340px;
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        color: #1f2937;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      #${PANEL_ID} * {
        box-sizing: border-box;
      }
      #${PANEL_ID} .cx-title {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }
      #${PANEL_ID} .cx-tip {
        margin: 0 0 12px;
        font-size: 12px;
        line-height: 1.6;
        color: #6b7280;
      }
      #${PANEL_ID} textarea {
        width: 100%;
        height: 180px;
        resize: vertical;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 10px 12px;
        outline: none;
        background: #ffffff;
        color: #111827;
        font: inherit;
        font-size: 13px;
        line-height: 1.5;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      #${PANEL_ID} textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
      #${PANEL_ID} textarea::placeholder {
        color: #9ca3af;
      }
      #${PANEL_ID} .cx-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      #${PANEL_ID} button {
        border: 1px solid transparent;
        border-radius: 8px;
        padding: 9px 12px;
        cursor: pointer;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
      }
      #${PANEL_ID} button:disabled {
        cursor: default;
        opacity: 0.6;
      }
      #${PANEL_ID} .cx-primary {
        flex: 1;
        background: #2563eb;
        color: #ffffff;
      }
      #${PANEL_ID} .cx-primary:hover:not(:disabled) {
        background: #1d4ed8;
      }
      #${PANEL_ID} .cx-secondary {
        border-color: #d1d5db;
        background: #ffffff;
        color: #4b5563;
      }
      #${PANEL_ID} .cx-secondary:hover:not(:disabled) {
        background: #f3f4f6;
      }
      #${PANEL_ID} .cx-sort {
        width: 100%;
      }
      #${PANEL_ID} .cx-status {
        margin-top: 10px;
        max-height: 260px;
        overflow-y: auto;
        min-height: 18px;
        padding-top: 10px;
        border-top: 1px solid #f0f1f3;
        font-size: 12px;
        line-height: 1.5;
        color: #6b7280;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
    `;
    document.head.appendChild(style);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function textOf(el) {
    return el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function uniqueSortedLetters(text) {
    return Array.from(new Set(String(text || "").split(""))).sort().join("");
  }

  function fire(el, type) {
    try {
      el.dispatchEvent(new Event(type, { bubbles: true }));
    } catch (error) {
      /* 忽略无法派发事件的控件 */
    }
  }

  function normalizeLetters(raw) {
    const letters = String(raw || "").toUpperCase().match(/[A-Z]/g);
    return letters ? uniqueSortedLetters(letters.join("")) : "";
  }

  function judgeLetter(raw) {
    const text = String(raw || "").trim();
    if (/^(?:T|TRUE|Y|YES|对|正确|√|✓|A)$/i.test(text)) {
      return "A";
    }
    if (/^(?:F|FALSE|N|NO|错|错误|X|×|B)$/i.test(text)) {
      return "B";
    }
    return "";
  }

  function splitFillParts(raw) {
    const text = String(raw || "");
    // 多空答案优先用 */* 或 */ 分割，避免答案本身含逗号时被拆错
    if (/\*\/\*?/.test(text)) {
      return text
        .split(/\*\/\*?/)
        .map(function (part) {
          return part.trim();
        })
        .filter(function (part) {
          return part.length > 0;
        });
    }
    return text
      .split(/[,，;；|]/)
      .map(function (part) {
        return part.trim();
      })
      .filter(function (part) {
        return part.length > 0;
      });
  }

  function compactText(value) {
    return String(value == null ? "" : value)
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sameFillValue(a, b) {
    const left = compactText(a);
    const right = compactText(b);
    if (left === right) {
      return true;
    }
    if (!left || !right) {
      return false;
    }
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    return (
      Number.isFinite(leftNumber) &&
      Number.isFinite(rightNumber) &&
      leftNumber === rightNumber
    );
  }

  function isHiddenNode(node, root) {
    let current = node;
    while (current && current !== root && current.nodeType === 1) {
      if (current.type === "hidden" || current.hidden) {
        return true;
      }
      const style = current.getAttribute ? current.getAttribute("style") : "";
      if (style && /(?:^|;)\s*display\s*:\s*none|(?:^|;)\s*visibility\s*:\s*hidden/i.test(style)) {
        return true;
      }
      if (current.getAttribute && current.getAttribute("aria-hidden") === "true") {
        return true;
      }
      try {
        const view = current.ownerDocument && current.ownerDocument.defaultView;
        const computed = view && view.getComputedStyle ? view.getComputedStyle(current) : null;
        if (computed && (computed.display === "none" || computed.visibility === "hidden")) {
          return true;
        }
      } catch (error) {
        /* 某些节点取不到计算样式，忽略 */
      }
      current = current.parentElement;
    }
    return false;
  }

  function normalizeOptionKey(raw, optionText) {
    let text = String(raw || "").trim();
    if (!text) {
      return "";
    }

    if (/^(?:TRUE|对|正确|√|✓)$/i.test(text)) {
      return "A";
    }
    if (/^(?:FALSE|错|错误|X|×)$/i.test(text)) {
      return "B";
    }

    // 判断题选项只有“对/错”文字时，T/F 也映射到 A/B
    const trueText = /^(?:[A-Z][.、．)）]?\s*)?(?:对|正确|true|√|✓)(?:\s*(?:对|正确|true|√|✓))*\s*(?:[（(]|$)/i;
    const falseText = /^(?:[A-Z][.、．)）]?\s*)?(?:错|错误|false|×)(?:\s*(?:错|错误|false|×))*\s*(?:[（(]|$)/i;
    if (trueText.test(optionText || "") && /^(?:T|TRUE)$/i.test(text)) {
      return "A";
    }
    if (falseText.test(optionText || "") && /^(?:F|FALSE)$/i.test(text)) {
      return "B";
    }

    // 个别页面把选项编号写成 "A." / "（A）" / "A、"
    text = text.toUpperCase();
    const single = text.match(/[A-Z]/);
    if (single && text.replace(/[^A-Z]/g, "").length === 1) {
      return single[0];
    }

    return "";
  }

  function letterForIndex(index) {
    let value = "";
    let n = index;
    do {
      value = String.fromCharCode(65 + (n % 26)) + value;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return value;
  }

  function buildOptionMap(questionEl) {
    let optionEls = Array.from(questionEl.querySelectorAll(".answerBg"));

    if (!optionEls.length) {
      optionEls = Array.from(questionEl.querySelectorAll("li")).filter(function (li) {
        return li.querySelector('input[type="radio"], input[type="checkbox"]');
      });
    }

    const map = new Map();
    optionEls.forEach(function (optionEl, index) {
      const badge = optionEl.querySelector("span[data]");
      const numberBadge = optionEl.querySelector(".num_option");
      const nativeInput = optionEl.querySelector('input[type="radio"], input[type="checkbox"]');
      const optionText = textOf(optionEl);
      let raw = "";

      if (badge) {
        raw = badge.getAttribute("data") || textOf(badge);
      }
      if (!raw && numberBadge) {
        raw = textOf(numberBadge);
      }
      if (!raw) {
        raw = optionEl.getAttribute("data") || "";
      }
      if (!raw && nativeInput) {
        raw = nativeInput.value || nativeInput.id || "";
      }

      let key = normalizeOptionKey(raw, optionText);
      if (!key || map.has(key)) {
        key = letterForIndex(index);
      }

      // 记录页面实际显示的字母。选项乱序时 data 可能是原始字母，
      // 显示字母按行号重新排列，用它给用户展示映射关系。
      let displayKey = badge ? normalizeLetters(textOf(badge)) : "";
      if (displayKey.length !== 1) {
        displayKey = numberBadge ? normalizeLetters(textOf(numberBadge)) : "";
      }
      if (displayKey.length !== 1) {
        displayKey = letterForIndex(index);
      }
      optionEl.__cxDisplayLetter = displayKey;

      if (!map.has(key)) {
        map.set(key, optionEl);
      }
    });

    return map;
  }

  function getFillTargets(questionEl) {
    const selector =
      'textarea, input[type="text"], input:not([type]), [contenteditable]:not([contenteditable="false"])';
    let targets = Array.from(questionEl.querySelectorAll(selector))
      .filter(function (node) {
        if (node.tagName === "INPUT" && node.type && node.type !== "text") {
          return false;
        }
        if (node.disabled || node.readOnly) {
          return false;
        }
        if (node.closest(".mark_answer, .answer-content, .correct-answer, .teacher-comment, .editor-toolbar")) {
          return false;
        }
        const editable = node.getAttribute("contenteditable");
        if (editable && editable !== "false" && node.closest(".edui, .edui-editor, .ueditor")) {
          return false;
        }
        return !isHiddenNode(node, questionEl);
      })
      .map(function (node) {
        const editable = node.getAttribute("contenteditable");
        return {
          kind: editable && editable !== "false" ? "editable" : node.tagName.toLowerCase(),
          el: node
        };
      });

    const iframes = Array.from(questionEl.querySelectorAll("iframe")).filter(function (frame) {
      if (!frame.contentDocument || !frame.contentDocument.body) {
        return false;
      }
      const src = String(frame.getAttribute("src") || "");
      if (/video|player|audio/i.test(src)) {
        return false;
      }
      const id = String(frame.id || "");
      const className = String(frame.className || "");
      return (
        frame.contentDocument.body.isContentEditable ||
        /edui|ueditor/i.test(id) ||
        /edui|ueditor/i.test(className) ||
        /ueditor/i.test(src)
      );
    });

    if (iframes.length) {
      iframes.forEach(function (frame) {
        const editorRoot =
          frame.closest(".edui, .edui-editor, .ueditor, [id^='ueditor']") || frame.parentElement;
        targets = targets.filter(function (target) {
          return !editorRoot || !editorRoot.contains(target.el);
        });
        targets.push({ kind: "iframe", el: frame });
      });
    }

    // 多个空可能是多个 iframe，按 DOM 顺序排好，避免填错空
    targets.sort(function (a, b) {
      if (a.el === b.el) {
        return 0;
      }
      return a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1;
    });

    return targets;
  }

  function readQuestionType(questionEl, typeInput, titleText, optionMap, fillTargets) {
    const rawType = typeInput ? String(typeInput.value || "").trim() : "";
    const typeByValue = {
      "0": "single",
      "1": "multiple",
      "2": "fill",
      "3": "judge",
      "4": "fill",
      "5": "fill",
      "6": "fill",
      "7": "fill",
      "8": "fill",
      "9": "fill",
      "10": "fill",
      "11": "matching",
      "14": "fill",
      "15": "fill",
      "21": "multiple"
    };

    const optionEls = Array.from(optionMap.values());
    const looksLikeChoice = optionEls.some(function (optionEl) {
      return !!optionEl.querySelector(
        'input[type="radio"], input[type="checkbox"], span[data], .num_option, .answer_p'
      );
    });

    if (typeByValue[rawType]) {
      // 题型值偶尔会写错：没有真正选项、只有文本框时按填空处理
      if (
        (typeByValue[rawType] === "single" ||
          typeByValue[rawType] === "multiple" ||
          typeByValue[rawType] === "judge") &&
        !looksLikeChoice &&
        fillTargets.length
      ) {
        return "fill";
      }
      return typeByValue[rawType];
    }

    const titleLabelMatch = titleText.match(/[（(【\[]\s*([^）)】\]]{1,12}题)\s*[）)】\]]/);
    const label = [
      questionEl.getAttribute("typename") || "",
      questionEl.getAttribute("data-type") || "",
      titleLabelMatch ? titleLabelMatch[1] : "",
      titleText.slice(0, 40),
      typeInput ? typeInput.getAttribute("name") || "" : ""
    ].join(" ");

    if (/多项选择|多选题|多选/.test(label)) {
      return "multiple";
    }
    if (/单项选择|单选题|单选/.test(label)) {
      return "single";
    }
    if (/判断题|判断|是非/.test(label)) {
      return "judge";
    }
    if (/填空题|填空/.test(label)) {
      return "fill";
    }
    if (/连线|匹配/.test(label)) {
      return "matching";
    }

    if (fillTargets.length && !looksLikeChoice) {
      return "fill";
    }

    if (optionMap.size) {
      if (
        optionEls.some(function (el) {
          return el.querySelector('input[type="checkbox"]');
        })
      ) {
        return "multiple";
      }
      if (
        optionEls.some(function (el) {
          return el.querySelector('input[type="radio"]');
        })
      ) {
        return "single";
      }
      if (
        optionEls.some(function (el) {
          return /check_answer_dx/.test(String(el.className || ""));
        })
      ) {
        return "multiple";
      }
      return "single";
    }

    if (fillTargets.length) {
      return "fill";
    }

    return "unknown";
  }

  function readQuestionNumber(questionEl, titleText, index) {
    const attrNames = ["data-num", "data-number", "data-question-num", "data-index"];
    for (let i = 0; i < attrNames.length; i += 1) {
      const value = questionEl.getAttribute(attrNames[i]);
      if (value && /^\d{1,3}$/.test(value.trim())) {
        return Number(value.trim());
      }
    }

    const patterns = [
      /^\s*(?:第\s*)?(\d{1,3})\s*(?:题|[.．、:：])/,
      /^\s*[（(]\s*(\d{1,3})\s*[）)]/,
      /^\s*(\d{1,3})\s*[）)]/,
      /^\s*(\d{1,3})\s*$/
    ];
    for (let i = 0; i < patterns.length; i += 1) {
      const match = titleText.match(patterns[i]);
      if (match) {
        return Number(match[1]);
      }
    }
    return index + 1;
  }

  function getQuestions() {
    let nodes = Array.from(document.querySelectorAll(".questionLi"));

    if (!nodes.length) {
      nodes = Array.from(
        document.querySelectorAll(".TiMu, .question-item[data-question-id], [data-questionid], .singleQuesId")
      );
    }

    nodes = nodes.filter(function (el) {
      return el.querySelector('.answerBg, input, textarea, [contenteditable]:not([contenteditable="false"])');
    });

    const questions = nodes.map(function (el, index) {
      const idText = String(el.id || "");
      const idMatch = idText.match(/(\d+)/);
      const qid =
        el.getAttribute("data") ||
        el.getAttribute("data-qid") ||
        el.getAttribute("data-question-id") ||
        el.getAttribute("data-questionid") ||
        (idMatch ? idMatch[1] : "");

      const titleEl = el.querySelector("h3, .mark_name, .Zy_TItle .clearfix, .question-title, .stem");
      const titleText = textOf(titleEl);
      const number = readQuestionNumber(el, titleText, index);

      const answerInput =
        (qid && document.getElementById("answer" + qid)) ||
        el.querySelector(
          'input[id^="answer"]:not([id^="answertype"]), textarea[id^="answer"], input[name^="answer"], textarea[name^="answer"]'
        );
      const typeInput =
        (qid && document.getElementById("answertype" + qid)) ||
        el.querySelector('input[id^="answertype"], input[name^="answertype"], input[name^="type"]');

      const optionMap = buildOptionMap(el);
      const fillTargets = getFillTargets(el);
      const hasNativeInputs = Array.from(optionMap.values()).some(function (optionEl) {
        return optionEl.querySelector('input[type="radio"], input[type="checkbox"]');
      });
      const type = readQuestionType(el, typeInput, titleText, optionMap, fillTargets);

      return {
        el: el,
        qid: qid,
        number: number,
        title: titleText,
        type: type,
        typeInput: typeInput,
        answerInput: answerInput,
        optionMap: optionMap,
        fillTargets: fillTargets,
        hasNativeInputs: hasNativeInputs
      };
    });

    const usedNumbers = new Set();
    questions.forEach(function (question, index) {
      if (usedNumbers.has(question.number)) {
        let fallback = index + 1;
        while (usedNumbers.has(fallback)) {
          fallback += 1;
        }
        question.number = fallback;
      }
      usedNumbers.add(question.number);
    });

    return questions;
  }

  function parseNumberedSegments(raw) {
    const pattern = /(^|[\s;；])(?:第\s*)?(\d{1,3})\s*(?:题\s*)?[.．、:：)）]\s*/g;
    const found = [];
    let match;

    while ((match = pattern.exec(raw))) {
      const start = match.index + match[1].length;
      found.push({
        number: Number(match[2]),
        start: start,
        contentStart: pattern.lastIndex
      });
    }

    if (!found.length) {
      return [];
    }

    // 只有开头一个题号才算带题号格式，避免把“答案是 1.A”误判
    if (found.length === 1 && found[0].start > 0) {
      return [];
    }

    // 题号必须递增。填空答案里可能出现 "2.1" 这类小数，
    // 它会被正则误认成“第 2 题”，用递增规则过滤掉。
    const markers = [];
    found.forEach(function (marker) {
      const last = markers[markers.length - 1];
      if (!last) {
        if (marker.number <= 500) {
          markers.push(marker);
        }
        return;
      }
      if (
        marker.number > last.number &&
        marker.number <= 500 &&
        marker.number - last.number <= 50 &&
        raw.slice(last.contentStart, marker.start).trim().length > 0
      ) {
        markers.push(marker);
      }
    });

    return markers
      .map(function (marker, index) {
        const end = index + 1 < markers.length ? markers[index + 1].start : raw.length;
        return {
          number: marker.number,
          text: raw.slice(marker.contentStart, end).trim()
        };
      })
      .filter(function (segment) {
        return segment.text.length > 0;
      });
  }

  function isChoiceLikeToken(token) {
    return /^(?:[A-Za-z]{1,8}|[TF]|TRUE|FALSE|对|错|正确|错误|√|✓|×)$/i.test(token);
  }

  function finalizeNumberedAnswers(numberedMap, questions) {
    const extras = [];
    const questionNumbers = new Set(
      questions.map(function (question) {
        return question.number;
      })
    );

    const inputNumbers = Array.from(numberedMap.keys()).sort(function (a, b) {
      return a - b;
    });
    const pageNumbers = questions
      .map(function (question) {
        return question.number;
      })
      .sort(function (a, b) {
        return a - b;
      });

    // 页面题号整体偏移时（例如答案 1-30、页面 41-70），
    // 按顺序回退；题号有缺漏/重复时不回退，避免错位。
    if (inputNumbers.length === questions.length && inputNumbers.length === pageNumbers.length) {
      const offset = pageNumbers[0] - inputNumbers[0];
      const aligns = inputNumbers.every(function (number, index) {
        return pageNumbers[index] === number + offset;
      });
      if (aligns) {
        const answers = new Map();
        const byNumber = new Map(
          questions.map(function (question) {
            return [question.number, question];
          })
        );
        inputNumbers.forEach(function (number) {
          const targetNumber = number + offset;
          if (byNumber.has(targetNumber)) {
            answers.set(targetNumber, numberedMap.get(number));
          }
        });
        return { answers: answers, numbered: true, extras: extras, remapped: offset !== 0 };
      }
    }

    // 题号完全不匹配但数量一致时，按页面顺序兜底
    if (inputNumbers.length === questions.length) {
      const matched = inputNumbers.some(function (number) {
        return questionNumbers.has(number);
      });
      if (!matched) {
        const answers = new Map();
        inputNumbers.forEach(function (number, index) {
          const question = questions[index];
          if (question) {
            answers.set(question.number, numberedMap.get(number));
          }
        });
        return { answers: answers, numbered: true, extras: extras, remapped: true };
      }
    }

    const answers = new Map();
    numberedMap.forEach(function (value, number) {
      if (questionNumbers.has(number)) {
        answers.set(number, value);
      } else {
        extras.push(number);
      }
    });
    return { answers: answers, numbered: true, extras: extras, remapped: false };
  }

  function parseInput(rawText, questions) {
    const raw = String(rawText || "").trim();
    if (!raw || !questions.length) {
      return { answers: new Map(), numbered: false, extras: [], remapped: false };
    }

    const segments = parseNumberedSegments(raw);
    if (segments.length) {
      const numberedMap = new Map();
      segments.forEach(function (segment) {
        if (!numberedMap.has(segment.number)) {
          numberedMap.set(segment.number, segment.text);
        }
      });
      return finalizeNumberedAnswers(numberedMap, questions);
    }

    const lines = raw
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    const answers = new Map();

    if (lines.length > 1) {
      lines.forEach(function (line, index) {
        if (questions[index]) {
          answers.set(questions[index].number, line);
        }
      });
      return {
        answers: answers,
        numbered: false,
        extras: [],
        remapped: false
      };
    }

    const line = lines[0] || "";
    const singleFillQuestion = questions.length === 1 && questions[0].type === "fill";

    if (singleFillQuestion) {
      answers.set(questions[0].number, line);
      return { answers: answers, numbered: false, extras: [], remapped: false };
    }

    let tokens = null;
    if (/[\/|｜；;]/.test(line)) {
      tokens = line
        .split(/[\/|｜；;]+/)
        .map(function (token) {
          return token.trim();
        })
        .filter(Boolean);
    }

    if (!tokens) {
      const commaTokens = line
        .split(/[,，]+/)
        .map(function (token) {
          return token.trim();
        })
        .filter(Boolean);
      const spaceTokens = line
        .split(/\s+/)
        .map(function (token) {
          return token.trim();
        })
        .filter(Boolean);
      const candidates = commaTokens.length > 1 ? commaTokens : spaceTokens;

      if (
        candidates.length > 1 &&
        (candidates.length === questions.length ||
          (questions.every(function (question) {
            return question.type !== "fill";
          }) &&
            candidates.every(isChoiceLikeToken)))
      ) {
        tokens = candidates;
      }
    }

    if (tokens && tokens.length && questions.length > 1) {
      tokens.forEach(function (token, index) {
        if (questions[index]) {
          answers.set(questions[index].number, token);
        }
      });
      return { answers: answers, numbered: false, extras: [], remapped: false };
    }

    // 只有一题时整行就是答案（填空题里的逗号不能被拆开）
    if (tokens && tokens.length > 1 && questions.length === 1) {
      answers.set(questions[0].number, tokens[0]);
      return { answers: answers, numbered: false, extras: [], remapped: false };
    }

    answers.set(questions[0].number, line);
    return { answers: answers, numbered: false, extras: [], remapped: false };
  }

  function normalizeAnswerForQuestion(raw, question) {
    const text = String(raw || "").trim();
    if (!text) {
      return "";
    }

    if (question.type === "fill") {
      return text;
    }

    if (question.type === "judge") {
      return judgeLetter(text) || normalizeLetters(text).charAt(0);
    }

    // 单选/多选里只有完整的 True/False、对/错才按判断处理，
    // 单个字母 F/T 优先当作选项字母，避免 6 个选项的 F 被误判为 False。
    if (/^(?:TRUE|FALSE|对|错|正确|错误|√|✓|×)$/i.test(text)) {
      return judgeLetter(text);
    }

    if (
      /^[TF]$/i.test(text) &&
      question.optionMap.size <= 2 &&
      !question.optionMap.has(text.toUpperCase()) &&
      question.optionMap.has("A") &&
      question.optionMap.has("B")
    ) {
      return judgeLetter(text);
    }

    return normalizeLetters(text);
  }

  function isOptionChecked(optionEl) {
    if (!optionEl) {
      return false;
    }
    // 有原生 radio/checkbox 时以控件的 checked 为准，
    // 避免样式类与真实选中状态不同步时误判。
    const input = optionEl.querySelector('input[type="radio"], input[type="checkbox"]');
    if (input) {
      return !!input.checked;
    }
    if (
      optionEl.classList.contains("check_answer") ||
      optionEl.classList.contains("check_answer_dx") ||
      optionEl.getAttribute("aria-checked") === "true"
    ) {
      return true;
    }
    if (optionEl.querySelector(".check_answer, .check_answer_dx, [aria-checked='true']")) {
      return true;
    }
    return false;
  }

  function lettersFromAnswerInput(question) {
    if (!question.answerInput) {
      return [];
    }
    const raw = String(question.answerInput.value || "").trim();
    if (!raw) {
      return [];
    }
    // 只有完整的 True/False、对/错才按判断处理；单个 F/T 仍可能是选项字母
    if (/^(?:TRUE|FALSE|对|错|正确|错误|√|✓|×)$/i.test(raw)) {
      const judged = judgeLetter(raw);
      if (judged) {
        return [judged];
      }
    }
    return normalizeLetters(raw)
      .split("")
      .filter(function (letter) {
        return question.optionMap.has(letter);
      });
  }

  function readChoiceState(question) {
    const checked = [];
    question.optionMap.forEach(function (optionEl, letter) {
      if (isOptionChecked(optionEl)) {
        checked.push(letter);
      }
    });

    if (checked.length) {
      return uniqueSortedLetters(checked.join(""));
    }
    if (question.hasNativeInputs) {
      return "";
    }
    return lettersFromAnswerInput(question).join("");
  }

  function domStateAvailable(question) {
    if (question.hasNativeInputs) {
      return true;
    }
    return Array.from(question.optionMap.values()).some(isOptionChecked);
  }

  function isOptionSelected(question, letter) {
    const optionEl = question.optionMap.get(letter);
    if (isOptionChecked(optionEl)) {
      return true;
    }
    if (!domStateAvailable(question)) {
      return readChoiceState(question).includes(letter);
    }
    return false;
  }

  function clickOption(optionEl) {
    // 优先点选项文字：不少页面把 click 处理绑在 .answer_p 上；
    // 文字在 label 内时，浏览器也会顺带切换原生 radio/checkbox。
    const textTarget = optionEl.querySelector(".answer_p, .textDIV, .eidtDiv");
    const label = optionEl.querySelector("label");
    const nativeInput = optionEl.querySelector('input[type="radio"], input[type="checkbox"]');
    const target = textTarget || label || nativeInput || optionEl;
    try {
      target.click();
    } catch (error) {
      fire(optionEl, "click");
    }
  }

  function sameLetters(a, b) {
    return uniqueSortedLetters(a) === uniqueSortedLetters(b);
  }

  async function waitUntil(predicate, timeout) {
    const deadline = Date.now() + (timeout || 900);
    while (Date.now() < deadline) {
      if (predicate()) {
        return true;
      }
      await sleep(50);
    }
    return !!predicate();
  }

  async function applySingle(question, desired) {
    if (desired.length !== 1) {
      return { status: "invalid", detail: "单选题只应有一个选项，解析到 " + desired };
    }

    const target = desired.charAt(0);
    const optionEl = question.optionMap.get(target);
    if (!optionEl) {
      return {
        status: "invalid",
        detail: "没有找到选项 " + target + "（页面选项：" + Array.from(question.optionMap.keys()).join("") + "）"
      };
    }

    if (isOptionSelected(question, target)) {
      return { status: "unchanged" };
    }

    clickOption(optionEl);
    const ok = await waitUntil(function () {
      return isOptionChecked(optionEl) || sameLetters(readChoiceState(question), target);
    }, 800);

    if (ok) {
      return { status: "applied" };
    }

    return {
      status: "invalid",
      detail: "点击 " + target + " 后实际为 " + (readChoiceState(question) || "空")
    };
  }

  async function applyMultiple(question, desired) {
    const target = uniqueSortedLetters(desired);
    const missing = target.split("").filter(function (letter) {
      return !question.optionMap.has(letter);
    });
    if (missing.length) {
      return {
        status: "invalid",
        detail: "没有找到选项 " + missing.join("") + "（页面选项：" + Array.from(question.optionMap.keys()).join("") + "）"
      };
    }

    const before = readChoiceState(question);

    async function clickDiff() {
      const remove = Array.from(question.optionMap.keys()).filter(function (letter) {
        return isOptionSelected(question, letter) && !target.includes(letter);
      });
      const add = target.split("").filter(function (letter) {
        return !isOptionSelected(question, letter);
      });

      for (let i = 0; i < remove.length; i += 1) {
        clickOption(question.optionMap.get(remove[i]));
        await sleep(60);
      }
      for (let i = 0; i < add.length; i += 1) {
        clickOption(question.optionMap.get(add[i]));
        await sleep(60);
      }
      return remove.length + add.length;
    }

    const clicked = await clickDiff();
    let ok = await waitUntil(function () {
      return sameLetters(readChoiceState(question), target);
    }, 800);

    if (!ok) {
      await sleep(250);
      const after = readChoiceState(question);
      if (sameLetters(after, before)) {
        return {
          status: "invalid",
          detail:
            "点击后页面状态没有变化（目标 " +
            target +
            "，实际 " +
            (after || "空") +
            "），可能选项 DOM 不匹配"
        };
      }

      await clickDiff();
      ok = await waitUntil(function () {
        return sameLetters(readChoiceState(question), target);
      }, 800);
    }

    if (!ok) {
      return {
        status: "invalid",
        detail: "目标 " + target + "，实际 " + (readChoiceState(question) || "空")
      };
    }

    return { status: clicked ? "applied" : "unchanged" };
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    fire(el, "input");
    fire(el, "change");
  }

  function setFillTargetValue(target, value) {
    const el = target.el;

    if (target.kind === "iframe") {
      try {
        const doc = el.contentDocument;
        const body = doc.body;
        body.textContent = value;
        fire(body, "input");
        fire(body, "change");
      } catch (error) {
        /* 跨域或编辑器未初始化 */
      }

      try {
        const container = el.closest("[id^='ueditor']");
        const candidates = [
          String(el.id || "").replace(/_iframe$/, ""),
          String(el.id || ""),
          container ? container.id : ""
        ].filter(Boolean);
        if (window.UE && window.UE.getEditor) {
          for (let i = 0; i < candidates.length; i += 1) {
            let editor = null;
            try {
              editor = window.UE.getEditor(candidates[i]);
            } catch (error) {
              editor = null;
            }
            if (editor && typeof editor.setContent === "function") {
              editor.setContent(value);
              break;
            }
          }
        }
      } catch (error) {
        /* 忽略 UEditor 未就绪 */
      }
      return;
    }

    if (target.kind === "editable") {
      el.textContent = value;
      fire(el, "input");
      fire(el, "change");
      return;
    }

    setNativeValue(el, value);
    try {
      el.focus({ preventScroll: true });
      el.blur();
    } catch (error) {
      /* 忽略 focus 兼容问题 */
    }
  }

  function readFillTargetValue(target) {
    const el = target.el;
    if (target.kind === "iframe") {
      try {
        return compactText(el.contentDocument.body.textContent || "");
      } catch (error) {
        return "";
      }
    }
    if (target.kind === "editable") {
      return compactText(el.textContent || "");
    }
    return compactText(el.value || "");
  }

  async function applyFill(question, raw) {
    const value = String(raw || "").trim();
    const targets = question.fillTargets;

    if (!targets.length) {
      return {
        status: "invalid",
        detail: "没有找到可填写的控件（可能是富文本/特殊题型，或控件在 iframe 内）"
      };
    }

    const splitParts = splitFillParts(value);
    if (targets.length === 1 && splitParts.length > 1) {
      const questionText = String(question.el.textContent || "");
      const blankCount = (questionText.match(/_{2,}/g) || []).length;
      if (blankCount > 1) {
        return {
          status: "invalid",
          detail:
            "题干有 " +
            blankCount +
            " 个空，但只识别到 1 个输入框；可能是 iframe/富文本或动态控件，请把该题 DOM 发我"
        };
      }
    }

    let parts;
    if (targets.length === 1) {
      parts = [value];
    } else {
      parts = splitParts;
      if (parts.length !== targets.length) {
        const semicolonParts = value
          .split(/[;；|]/)
          .map(function (part) {
            return part.trim();
          })
          .filter(Boolean);
        if (semicolonParts.length === targets.length) {
          parts = semicolonParts;
        } else {
          return {
            status: "invalid",
            detail:
              "页面有 " +
              targets.length +
              " 个空，答案只能拆成 " +
              parts.length +
              " 段；多空请用 */* 或逗号一空一段"
          };
        }
      }
    }

    const before = targets.map(readFillTargetValue);
    parts.forEach(function (part, index) {
      setFillTargetValue(targets[index], part);
    });
    await sleep(30);

    const after = targets.map(readFillTargetValue);
    const changed = parts.some(function (part, index) {
      return !sameFillValue(before[index], part);
    });
    const ok = parts.every(function (part, index) {
      return sameFillValue(after[index], part);
    });

    if (!ok) {
      return {
        status: "invalid",
        detail: "写入后为 " + after.map(function (item) {
          return item || "空";
        }).join(" | ")
      };
    }

    return { status: changed ? "applied" : "unchanged" };
  }

  async function applyQuestion(question, raw) {
    if (!String(raw || "").trim()) {
      return { status: "skipped" };
    }

    if (question.type === "fill") {
      return applyFill(question, raw);
    }

    if (question.type === "matching") {
      return { status: "invalid", detail: "连线题暂不支持" };
    }

    const desired = normalizeAnswerForQuestion(raw, question);

    if (!desired) {
      return { status: "invalid", detail: "无法识别答案“" + String(raw).trim() + "”" };
    }

    if (question.type === "unknown") {
      if (question.optionMap.size) {
        return desired.length > 1 ? applyMultiple(question, desired) : applySingle(question, desired);
      }
      if (question.fillTargets.length) {
        return applyFill(question, raw);
      }
      return { status: "invalid", detail: "无法识别题型" };
    }

    if (question.type === "multiple") {
      return applyMultiple(question, desired);
    }

    return applySingle(question, desired);
  }

  function typeSummary(questions, answerMap) {
    const counts = { single: 0, multiple: 0, judge: 0, fill: 0, matching: 0, unknown: 0 };
    questions.forEach(function (question) {
      if (answerMap.has(question.number)) {
        counts[question.type] = (counts[question.type] || 0) + 1;
      }
    });

    return Object.keys(counts)
      .filter(function (type) {
        return counts[type] > 0;
      })
      .map(function (type) {
        return TYPE_NAMES[type] + " " + counts[type];
      })
      .join("，");
  }

  function setOptionBadgeLetter(badge, key) {
    const original = String(badge.textContent || "").trim();
    if (!/^[A-Za-z](?:[.、．])?$/.test(original)) {
      return false;
    }

    const next = key + (/\.\s*$/.test(original) ? "." : "");

    // 尽量只改文字节点，保留 badge 里的图标等子元素
    const textNode = Array.from(badge.childNodes).find(function (node) {
      return node.nodeType === 3 && String(node.textContent || "").trim();
    });
    if (textNode) {
      textNode.textContent = next;
      return true;
    }

    const letterChild = Array.from(badge.children).find(function (child) {
      return /^[A-Za-z](?:[.、．])?$/.test(String(child.textContent || "").trim());
    });
    if (letterChild) {
      letterChild.textContent = next;
      return true;
    }

    badge.textContent = next;
    return true;
  }

  function sortOptionsByData() {
    const questions = getQuestions();
    let sorted = 0;
    let skipped = 0;

    questions.forEach(function (question) {
      if (question.type !== "single" && question.type !== "multiple") {
        return;
      }

      const entries = Array.from(question.optionMap.entries());
      if (entries.length < 2) {
        return;
      }

      const parent = entries[0][1].parentElement;
      const sameParent = entries.every(function (entry) {
        return entry[1].parentElement === parent;
      });
      if (!parent || !sameParent) {
        skipped += 1;
        return;
      }

      entries.sort(function (a, b) {
        return a[0].localeCompare(b[0], "en", { numeric: true });
      });

      const optionSet = new Set(
        entries.map(function (entry) {
          return entry[1];
        })
      );
      const firstInDom = Array.from(parent.children).find(function (child) {
        return optionSet.has(child);
      });
      const marker = document.createComment("cx-sort");
      parent.insertBefore(marker, firstInDom || entries[0][1]);

      entries.forEach(function (entry) {
        const key = entry[0];
        const optionEl = entry[1];
        parent.insertBefore(optionEl, marker);

        // 只重排显示，不改 data；把可见字母同步成 data 字母，
        // 这样页面上的 A/B/C 就和答案键一致了。
        const badge = optionEl.querySelector("span[data]") || optionEl.querySelector(".num_option");
        if (badge) {
          setOptionBadgeLetter(badge, key);
        }
        optionEl.__cxDisplayLetter = key;
      });

      parent.removeChild(marker);
      sorted += 1;
    });

    if (!sorted) {
      return skipped
        ? "有 " + skipped + " 题选项不在同一容器，未能重排。"
        : "没有找到可重排的选择题选项。";
    }

    return (
      "已按 data 顺序重排 " +
      sorted +
      " 题" +
      (skipped ? "，跳过 " + skipped + " 题" : "") +
      "；刷新页面可恢复。"
    );
  }

  async function applyAnswers(rawText) {
    const questions = getQuestions();
    if (!questions.length) {
      return "当前页面没有找到题目（.questionLi），请确认在作业/考试答题页。";
    }

    const parsed = parseInput(rawText, questions);
    const answerMap = parsed.answers;

    if (!answerMap.size) {
      return "没有解析出答案。支持：一行一题、A/ABC/T/F、1.A 2.ABC，填空多空用 */* 或逗号分隔。";
    }

    let applied = 0;
    let unchanged = 0;
    let failed = 0;
    let processed = 0;
    const issues = [];
    const mappingNotes = [];

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      if (!answerMap.has(question.number)) {
        continue;
      }

      const rawAnswer = answerMap.get(question.number);
      const mappingTarget =
        question.type === "fill" || question.type === "judge"
          ? ""
          : normalizeAnswerForQuestion(rawAnswer, question);
      if (mappingTarget && question.optionMap.size) {
        const hasAllOptions = mappingTarget.split("").every(function (letter) {
          return question.optionMap.has(letter);
        });
        if (hasAllOptions) {
          const visual = uniqueSortedLetters(
            mappingTarget
              .split("")
              .map(function (letter) {
                const optionEl = question.optionMap.get(letter);
                return (optionEl && optionEl.__cxDisplayLetter) || letter;
              })
              .join("")
          );
          if (visual && visual !== mappingTarget) {
            mappingNotes.push(
              "第" +
                question.number +
                "题 " +
                mappingTarget +
                " → 页面 " +
                visual.split("").join(",")
            );
          }
        }
      }

      processed += 1;
      setStatus("正在处理第 " + processed + "/" + answerMap.size + " 题…");
      const result = await applyQuestion(question, rawAnswer);
      if (result.status === "applied") {
        applied += 1;
      } else if (result.status === "unchanged" || result.status === "skipped") {
        unchanged += 1;
      } else {
        failed += 1;
        issues.push("第 " + question.number + " 题（" + (TYPE_NAMES[question.type] || "未知") + "）：" + result.detail);
      }
    }

    if (parsed.extras.length) {
      parsed.extras.forEach(function (number) {
        issues.push("答案里的第 " + number + " 题在页面上没有找到");
      });
    }

    let summary =
      "已处理 " +
      answerMap.size +
      " 题：成功变更 " +
      applied +
      " 题，原本已一致 " +
      unchanged +
      " 题，失败 " +
      failed +
      " 题";
    if (parsed.extras.length) {
      summary += "，另有 " + parsed.extras.length + " 条题号未匹配";
    }
    const types = typeSummary(questions, answerMap);
    if (types) {
      summary += "\n解析题型：" + types;
    }
    if (parsed.remapped) {
      summary += "\n题号与页面不一致，已自动对齐题号。";
    }
    if (mappingNotes.length) {
      summary +=
        "\n选项乱序映射（答案 → 页面显示）：" +
        mappingNotes.slice(0, 5).join("；") +
        (mappingNotes.length > 5 ? "；其余 " + (mappingNotes.length - 5) + " 题同理" : "");
    }
    if (issues.length) {
      summary += "\n" + issues.join("\n");
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
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="cx-title">答案辅助填题</div>
    <div class="cx-tip">支持三种格式：<br>1. 按顺序一行一个：A / ABC / T<br>2. 单行分隔：A/ABC/T/F/BD<br>3. 带题号：1.A  2.ABC  41.T<br>填空多空用 */* 或逗号分隔：25.False*/*不确定*/*True*/*False</div>
    <textarea id="${TEXTAREA_ID}" placeholder="示例：&#10;A&#10;ABC&#10;T&#10;&#10;或者&#10;A/ABC/T/F&#10;&#10;或者&#10;1.A&#10;2.ABC&#10;41.T&#10;&#10;填空：&#10;25.False*/*不确定*/*True*/*False"></textarea>
    <div class="cx-actions">
      <button type="button" class="cx-primary" id="cx-answer-helper-apply">应用答案</button>
      <button type="button" class="cx-secondary" id="cx-answer-helper-clear">清空</button>
      <button type="button" class="cx-secondary" id="cx-answer-helper-close">收起</button>
    </div>
    <div class="cx-actions">
      <button type="button" class="cx-secondary cx-sort" id="cx-answer-helper-sort">按 data 顺序重排选项</button>
    </div>
    <div class="cx-status" id="${STATUS_ID}">把答案贴进来后，点“应用答案”。</div>
  `;

  document.body.appendChild(panel);

  const toggle = document.createElement("button");
  toggle.id = TOGGLE_ID;
  toggle.type = "button";
  toggle.setAttribute("aria-controls", PANEL_ID);
  document.body.appendChild(toggle);
  setExpanded(false);

  toggle.addEventListener("click", function () {
    setExpanded(panel.style.display === "none");
  });

  document.getElementById("cx-answer-helper-apply").addEventListener("click", async function () {
    const button = this;
    const text = document.getElementById(TEXTAREA_ID).value;
    button.disabled = true;
    setStatus("正在识别并填写…");
    try {
      const result = await applyAnswers(text);
      setStatus(result);
    } catch (error) {
      setStatus("应用答案时出错：" + (error && error.message ? error.message : String(error)));
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("cx-answer-helper-sort").addEventListener("click", function () {
    setStatus(sortOptionsByData());
  });

  document.getElementById("cx-answer-helper-clear").addEventListener("click", function () {
    document.getElementById(TEXTAREA_ID).value = "";
    setStatus("输入框已清空。");
  });

  document.getElementById("cx-answer-helper-close").addEventListener("click", function () {
    setExpanded(false);
  });

  document.getElementById(TEXTAREA_ID).addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      document.getElementById("cx-answer-helper-apply").click();
    }
  });

  document.addEventListener("keydown", function (event) {
    const isA = event.code === "KeyA" || String(event.key || "").toLowerCase() === "a";
    if (event.altKey && event.shiftKey && isA) {
      event.preventDefault();
      setExpanded(panel.style.display === "none");
    }
  });
})();
