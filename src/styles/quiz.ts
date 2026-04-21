export const quizStyles = `
    /* Quiz container */
    .quiz {
      width: 100%;
      padding: 32px 24px;
      font-family: var(--font-body);
    }

    /* Header */
    .quiz__header {
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
    }

    .quiz__title {
      font-size: 1.375em;
      font-weight: 700;
      color: var(--color-text);
      margin-bottom: 4px;
    }

    .quiz__section {
      font-size: 0.75em;
      color: var(--color-link);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
      font-family: var(--font-mono);
    }

    .quiz__progress {
      font-size: 0.75em;
      color: var(--color-text-muted);
      font-family: var(--font-mono);
    }

    .quiz__answered { margin-left: 12px; }

    /* Question */
    .quiz__question { margin-bottom: 24px; }

    .quiz__question-text {
      font-size: 0.9375em;
      line-height: 1.6;
      color: var(--color-text);
      margin-bottom: 16px;
    }

    .quiz__question-text p:last-child { margin-bottom: 0; }

    /* Options */
    .quiz__options {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }

    .quiz__option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--color-sidebar-bg);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      font-family: var(--font-body);
      font-size: 0.875em;
      color: var(--color-text);
      text-align: left;
      transition: border-color 0.12s, background 0.12s;
    }

    .quiz__option:hover:not(.quiz__option--disabled) {
      border-color: var(--color-text-muted);
    }

    .quiz__option--selected {
      border-color: var(--color-link);
      background: var(--color-active-bg);
    }

    .quiz__option--correct {
      border-color: #2da44e;
      background: rgba(45, 164, 78, 0.1);
    }

    .quiz__option--wrong {
      border-color: #cf222e;
      background: rgba(207, 34, 46, 0.1);
    }

    .quiz__option--disabled { cursor: default; pointer-events: none; }

    .quiz__option-marker {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.6875em;
      font-weight: 600;
      font-family: var(--font-mono);
      background: var(--color-border);
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .quiz__option--selected .quiz__option-marker {
      background: var(--color-link);
      color: white;
    }

    .quiz__option--correct .quiz__option-marker {
      background: #2da44e;
      color: white;
    }

    .quiz__option--wrong .quiz__option-marker {
      background: #cf222e;
      color: white;
    }

    .quiz__option-text { flex: 1; }
    .quiz__option-text p { margin: 0; }

    /* Multi-choice check */
    .quiz__option-check {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--color-border);
      border-radius: 3px;
      font-size: 0.6875em;
      flex-shrink: 0;
    }

    .quiz__option--selected .quiz__option-check {
      border-color: var(--color-link);
      background: var(--color-link);
      color: white;
    }

    .quiz__option--correct .quiz__option-check {
      border-color: #2da44e;
      background: #2da44e;
      color: white;
    }

    .quiz__option--wrong .quiz__option-check {
      border-color: #cf222e;
      background: #cf222e;
      color: white;
    }

    /* True/False */
    .quiz__tf-options {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .quiz__tf-btn {
      flex: 1;
      padding: 14px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-sidebar-bg);
      cursor: pointer;
      font-size: 0.9375em;
      font-weight: 600;
      font-family: var(--font-body);
      color: var(--color-text);
      transition: border-color 0.12s, background 0.12s;
    }

    .quiz__tf-btn:hover:not(.quiz__tf-btn--disabled) {
      border-color: var(--color-text-muted);
    }

    .quiz__tf-btn--correct {
      border-color: #2da44e;
      background: rgba(45, 164, 78, 0.1);
      color: #2da44e;
    }

    .quiz__tf-btn--wrong {
      border-color: #cf222e;
      background: rgba(207, 34, 46, 0.1);
      color: #cf222e;
    }

    .quiz__tf-btn--disabled { cursor: default; pointer-events: none; }

    /* Free text */
    .quiz__freetext { margin-bottom: 16px; }

    .quiz__freetext-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-bg);
      color: var(--color-text);
      font-size: 0.875em;
      font-family: var(--font-body);
      margin-bottom: 8px;
      outline: none;
      box-sizing: border-box;
    }

    .quiz__freetext-input:focus { border-color: var(--color-link); }

    .quiz__freetext-answer {
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-sidebar-bg);
      font-size: 0.875em;
      color: var(--color-text);
    }

    /* Submit button */
    .quiz__submit-btn {
      padding: 7px 20px;
      border: 1px solid var(--color-link);
      border-radius: 5px;
      background: var(--color-link);
      color: white;
      font-size: 0.8125em;
      font-weight: 500;
      font-family: var(--font-body);
      cursor: pointer;
      transition: opacity 0.12s;
    }

    .quiz__submit-btn:disabled { opacity: 0.4; cursor: default; }
    .quiz__submit-btn:hover:not(:disabled) { opacity: 0.85; }

    /* Hint */
    .quiz__hint { margin-bottom: 16px; }

    .quiz__hint-btn {
      padding: 3px 10px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.6875em;
      font-family: var(--font-mono);
      cursor: pointer;
      transition: all 0.12s;
    }

    .quiz__hint-btn:hover {
      border-color: var(--color-text-muted);
      color: var(--color-text);
    }

    .quiz__hint-text {
      margin-top: 8px;
      padding: 10px 14px;
      border-left: 3px solid var(--color-link);
      background: var(--color-sidebar-bg);
      font-size: 0.8125em;
      color: var(--color-text);
    }

    .quiz__hint-text p:last-child { margin-bottom: 0; }

    /* Feedback */
    .quiz__feedback {
      margin-top: 16px;
      padding: 14px;
      border-radius: 6px;
      background: var(--color-sidebar-bg);
      border: 1px solid var(--color-border);
    }

    .quiz__feedback-result {
      font-size: 0.9375em;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .quiz__feedback-result--correct { color: #2da44e; }
    .quiz__feedback-result--wrong { color: #cf222e; }

    .quiz__correct-answer {
      font-size: 0.8125em;
      color: var(--color-text-muted);
      margin-bottom: 6px;
      font-family: var(--font-mono);
    }

    .quiz__explanation {
      font-size: 0.8125em;
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
      padding-top: 8px;
      margin-top: 8px;
    }

    .quiz__explanation p:last-child { margin-bottom: 0; }

    /* Navigation */
    .quiz__nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid var(--color-border);
      margin-top: 32px;
    }

    .quiz__nav-btn {
      padding: 7px 18px;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      background: var(--color-sidebar-bg);
      color: var(--color-text);
      font-size: 0.75em;
      font-family: var(--font-mono);
      cursor: pointer;
      transition: all 0.12s;
    }

    .quiz__nav-btn:hover:not(:disabled) { border-color: var(--color-text-muted); }
    .quiz__nav-btn:disabled { opacity: 0.35; cursor: default; }

    .quiz__nav-btn--finish {
      border-color: var(--color-link);
      color: var(--color-link);
    }

    /* Group */
    .quiz__group-prompt {
      font-size: 0.9375em;
      line-height: 1.6;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--color-border);
    }

    .quiz__group-prompt p:last-child { margin-bottom: 0; }

    .quiz__group-part {
      margin-bottom: 24px;
      padding-left: 16px;
      border-left: 2px solid var(--color-border);
    }

    .quiz__group-part-label {
      font-size: 0.6875em;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
      font-family: var(--font-mono);
    }

    /* Info page */
    .quiz__info-label {
      display: inline-block;
      font-size: 0.6875em;
      font-weight: 600;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-link);
      background: var(--color-active-bg);
      border: 1px solid var(--color-link);
      border-radius: 4px;
      padding: 2px 8px;
      margin-bottom: 16px;
    }

    .quiz__info {
      font-size: 0.9375em;
      line-height: 1.7;
      color: var(--color-text);
      background: var(--color-sidebar-bg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 20px 24px;
    }

    .quiz__info p { margin-bottom: 12px; }
    .quiz__info p:last-child { margin-bottom: 0; }

    .quiz__info h1, .quiz__info h2, .quiz__info h3 {
      color: var(--color-text);
      font-weight: 600;
      margin: 20px 0 8px;
    }
    .quiz__info h2 { font-size: 1em; border-bottom: 1px solid var(--color-border); padding-bottom: 6px; }
    .quiz__info h3 { font-size: 0.9375em; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75em; }

    .quiz__info ul, .quiz__info ol {
      padding-left: 20px;
      margin-bottom: 12px;
    }
    .quiz__info li { margin-bottom: 4px; }

    .quiz__info table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 0.875em;
    }
    .quiz__info th {
      text-align: left;
      padding: 6px 10px;
      border-bottom: 2px solid var(--color-border);
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .quiz__info td {
      padding: 6px 10px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
    }

    .quiz__info code {
      font-family: var(--font-mono);
      font-size: 0.85em;
      background: var(--color-code-bg);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      padding: 1px 5px;
      color: var(--color-link);
    }

    .quiz__info pre {
      background: var(--color-code-bg);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 14px 16px;
      overflow-x: auto;
      margin: 12px 0;
    }
    .quiz__info pre code {
      background: none;
      border: none;
      padding: 0;
      color: var(--color-text);
      font-size: 0.875em;
    }

    .quiz__info blockquote {
      border-left: 3px solid var(--color-link);
      padding: 8px 14px;
      margin: 12px 0;
      background: var(--color-active-bg);
      border-radius: 0 4px 4px 0;
      font-style: italic;
    }
    .quiz__info blockquote p:last-child { margin-bottom: 0; }

    /* Results */
    .quiz__results-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--color-border);
    }

    .quiz__results-score {
      font-size: 3em;
      font-weight: 700;
      color: var(--color-text);
      margin: 12px 0 4px;
      font-family: var(--font-mono);
    }

    .quiz__results-detail {
      font-size: 0.8125em;
      color: var(--color-text-muted);
      font-family: var(--font-mono);
    }

    .quiz__results-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-bottom: 24px;
    }

    .quiz__result-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 0.8125em;
    }

    .quiz__result-item--correct { background: rgba(45, 164, 78, 0.07); }
    .quiz__result-item--wrong { background: rgba(207, 34, 46, 0.07); }

    .quiz__result-marker { width: 18px; text-align: center; font-weight: 700; }
    .quiz__result-item--correct .quiz__result-marker { color: #2da44e; }
    .quiz__result-item--wrong .quiz__result-marker { color: #cf222e; }

    .quiz__result-num {
      font-family: var(--font-mono);
      font-size: 0.6875em;
      color: var(--color-text-muted);
      min-width: 28px;
    }

    .quiz__result-text { flex: 1; color: var(--color-text); }
    .quiz__result-text p { margin: 0; }

    .quiz__results-actions { text-align: center; }
`;
