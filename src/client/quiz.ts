export const quizCode = `
    // --- Quiz state ---
    let quizData = null;
    let quizFlat = [];
    let quizIdx = 0;
    let quizAnswers = {};
    let pendingAnswers = {};
    let quizPhase = "idle";

    function loadQuiz(fileName) {
      if (!mainContent) return;
      quizPhase = "loading";
      mainContent.innerHTML = '<div class="quiz"><div class="quiz__header"><div class="quiz__title">Loading quiz...</div></div></div>';

      fetch("/api/resources/quizzes/" + encodeURIComponent(fileName))
        .then(function(r) {
          if (!r.ok) throw new Error("Failed to load quiz");
          return r.json();
        })
        .then(function(data) {
          quizData = data;
          quizFlat = flattenQuizItems(data.items);
          quizIdx = 0;
          quizAnswers = {};
          pendingAnswers = {};
          quizPhase = "active";
          renderQuiz();
        })
        .catch(function(err) {
          mainContent.innerHTML = '<article class="markdown-body"><p>Error: ' + escapeHtml(err.message) + '</p></article>';
          quizPhase = "idle";
        });
    }

    function flattenQuizItems(items) {
      var flat = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.type === "section") {
          for (var j = 0; j < item.items.length; j++) {
            var sub = Object.assign({}, item.items[j]);
            sub.sectionTitle = item.title;
            flat.push(sub);
          }
        } else {
          flat.push(item);
        }
      }
      return flat;
    }

    function getQuizQuestions() {
      var questions = [];
      for (var i = 0; i < quizFlat.length; i++) {
        var item = quizFlat[i];
        if (item.type === "group") {
          for (var j = 0; j < item.parts.length; j++) questions.push(item.parts[j]);
        } else if (item.type !== "info") {
          questions.push(item);
        }
      }
      return questions;
    }

    function checkQuizAnswer(q, answer) {
      switch (q.type) {
        case "single": return q.correctAnswer === answer;
        case "multi": {
          if (!Array.isArray(answer)) return false;
          var s = answer.slice().sort(function(a,b){return a-b;});
          var e = q.correctAnswers.slice().sort(function(a,b){return a-b;});
          return s.length === e.length && s.every(function(v,i){return v === e[i];});
        }
        case "truefalse": return q.correctAnswer === answer;
        case "freetext": {
          if (typeof answer !== "string") return false;
          return matchFreetextSpec(q.answer, answer, !!q.caseSensitive);
        }
      }
    }

    function matchFreetextSpec(spec, answer, caseSensitive) {
      if (!spec || typeof spec !== "object") return false;
      var trimmed = String(answer).trim();
      switch (spec.kind) {
        case "string": {
          var a = caseSensitive ? trimmed : trimmed.toLowerCase();
          var b = caseSensitive ? String(spec.value).trim() : String(spec.value).trim().toLowerCase();
          return a === b;
        }
        case "number": {
          var n = Number(trimmed);
          if (!isFinite(n)) return false;
          return n === spec.value;
        }
        case "range": {
          var nr = Number(trimmed);
          if (!isFinite(nr)) return false;
          if (spec.minInclusive ? nr < spec.min : nr <= spec.min) return false;
          if (spec.maxInclusive ? nr > spec.max : nr >= spec.max) return false;
          return true;
        }
        case "any": {
          for (var i = 0; i < spec.specs.length; i++) {
            if (matchFreetextSpec(spec.specs[i], answer, caseSensitive)) return true;
          }
          return false;
        }
      }
      return false;
    }

    function findQuizQuestion(qId) {
      for (var i = 0; i < quizFlat.length; i++) {
        var item = quizFlat[i];
        if (item.type === "group") {
          for (var j = 0; j < item.parts.length; j++) {
            if (item.parts[j].id === qId) return item.parts[j];
          }
        } else if (item.id === qId) {
          return item;
        }
      }
      return null;
    }

    function renderQuiz() {
      if (!mainContent || !quizData || quizPhase === "idle") return;

      if (quizPhase === "finished") {
        renderQuizResults();
        return;
      }

      var item = quizFlat[quizIdx];
      var allQ = getQuizQuestions();
      var answeredCount = 0;
      for (var i = 0; i < allQ.length; i++) {
        if (quizAnswers[allQ[i].id] !== undefined) answeredCount++;
      }
      var remaining = allQ.length - answeredCount;

      var h = '<div class="quiz">';

      // Header
      h += '<div class="quiz__header">';
      h += '<div class="quiz__title">' + escapeHtml(quizData.title) + '</div>';
      if (item.sectionTitle) {
        h += '<div class="quiz__section">' + escapeHtml(item.sectionTitle) + '</div>';
      }
      h += '<div class="quiz__progress">' + (quizIdx + 1) + ' / ' + quizFlat.length;
      h += '<span class="quiz__answered">' + answeredCount + ' of ' + allQ.length + ' answered</span>';
      h += '</div>';
      h += '</div>';

      // Body
      h += '<div class="quiz__body">';
      if (item.type === "info") {
        h += '<div class="quiz__info">' + item.contentHtml + '</div>';
      } else if (item.type === "group") {
        h += renderGroupHtml(item);
      } else {
        h += renderQuestionHtml(item, item.id);
      }
      h += '</div>';

      // Nav
      h += '<div class="quiz__nav">';
      h += '<button class="quiz__nav-btn" id="quiz-prev"' + (quizIdx === 0 ? ' disabled' : '') + '>Previous</button>';
      h += '<button class="quiz__nav-btn quiz__nav-btn--finish" id="quiz-finish"' + (remaining > 0 ? ' disabled title="Answer all questions first"' : '') + '>Finish' + (remaining > 0 ? ' (' + remaining + ' remaining)' : '') + '</button>';
      h += '<button class="quiz__nav-btn" id="quiz-next"' + (quizIdx >= quizFlat.length - 1 ? ' disabled' : '') + '>Next</button>';
      h += '</div>';

      h += '</div>';

      mainContent.innerHTML = h;
      mainContent.scrollTo(0, 0);
      setupQuizHandlers();
    }

    function renderQuestionHtml(q, qId) {
      var ans = quizAnswers[qId];
      var submitted = ans !== undefined;
      var h = '<div class="quiz__question" data-qid="' + escapeHtml(qId) + '">';

      h += '<div class="quiz__question-text">' + q.questionHtml + '</div>';

      if (q.hintHtml && !submitted) {
        h += '<div class="quiz__hint">';
        h += '<button class="quiz__hint-btn" data-hint="' + escapeHtml(qId) + '">Show hint</button>';
        h += '<div class="quiz__hint-text" id="hint-' + escapeHtml(qId) + '" style="display:none">' + q.hintHtml + '</div>';
        h += '</div>';
      }

      switch (q.type) {
        case "single": h += renderSingleInput(q, qId, submitted, ans); break;
        case "multi": h += renderMultiInput(q, qId, submitted, ans); break;
        case "truefalse": h += renderTrueFalseInput(q, qId, submitted, ans); break;
        case "freetext": h += renderFreeTextInput(q, qId, submitted, ans); break;
      }

      if (submitted) {
        h += '<div class="quiz__feedback">';
        h += '<div class="quiz__feedback-result quiz__feedback-result--' + (ans.correct ? 'correct' : 'wrong') + '">';
        h += ans.correct ? 'Correct!' : 'Incorrect';
        h += '</div>';

        if (!ans.correct) {
          h += '<div class="quiz__correct-answer">';
          if (q.type === "single") {
            h += 'Answer: ' + (q.optionsHtml ? q.optionsHtml[q.correctAnswer] : escapeHtml(q.options[q.correctAnswer]));
          } else if (q.type === "multi") {
            h += 'Answer: ' + q.correctAnswers.map(function(idx) { return q.optionsHtml ? q.optionsHtml[idx] : escapeHtml(q.options[idx]); }).join(', ');
          } else if (q.type === "truefalse") {
            h += 'Answer: ' + (q.correctAnswer ? 'True' : 'False');
          } else if (q.type === "freetext") {
            h += 'Answer: ' + escapeHtml(q.answerDisplay || '');
          }
          h += '</div>';
        }

        if (q.explanationHtml) {
          h += '<div class="quiz__explanation">' + q.explanationHtml + '</div>';
        }
        h += '</div>';
      }

      h += '</div>';
      return h;
    }

    function renderSingleInput(q, qId, submitted, ans) {
      var pending = pendingAnswers[qId];
      var h = '<div class="quiz__options">';
      for (var i = 0; i < q.options.length; i++) {
        var cls = 'quiz__option';
        if (submitted) {
          if (i === q.correctAnswer) cls += ' quiz__option--correct';
          else if (i === ans.userAnswer) cls += ' quiz__option--wrong';
          cls += ' quiz__option--disabled';
        } else if (pending === i) {
          cls += ' quiz__option--selected';
        }
        h += '<button class="' + cls + '" data-option="' + i + '" data-type="single" data-qid="' + escapeHtml(qId) + '"' + (submitted ? ' disabled' : '') + '>';
        h += '<span class="quiz__option-marker">' + String.fromCharCode(65 + i) + '</span>';
        h += '<span class="quiz__option-text">' + (q.optionsHtml ? q.optionsHtml[i] : escapeHtml(q.options[i])) + '</span>';
        h += '</button>';
      }
      h += '</div>';
      if (!submitted) {
        h += '<button class="quiz__submit-btn" data-submit="single" data-qid="' + escapeHtml(qId) + '"' + (pending === undefined ? ' disabled' : '') + '>Submit</button>';
      }
      return h;
    }

    function renderMultiInput(q, qId, submitted, ans) {
      var pending = pendingAnswers[qId] || [];
      var h = '<div class="quiz__options quiz__options--multi">';
      for (var i = 0; i < q.options.length; i++) {
        var cls = 'quiz__option';
        if (submitted) {
          var isCorrect = q.correctAnswers.indexOf(i) >= 0;
          var wasSelected = Array.isArray(ans.userAnswer) && ans.userAnswer.indexOf(i) >= 0;
          if (isCorrect) cls += ' quiz__option--correct';
          else if (wasSelected) cls += ' quiz__option--wrong';
          cls += ' quiz__option--disabled';
        } else if (pending.indexOf(i) >= 0) {
          cls += ' quiz__option--selected';
        }
        var showCheck = submitted ? (Array.isArray(ans.userAnswer) && ans.userAnswer.indexOf(i) >= 0) : (pending.indexOf(i) >= 0);
        h += '<button class="' + cls + '" data-option="' + i + '" data-type="multi" data-qid="' + escapeHtml(qId) + '"' + (submitted ? ' disabled' : '') + '>';
        h += '<span class="quiz__option-check">' + (showCheck ? '\\u2713' : '') + '</span>';
        h += '<span class="quiz__option-text">' + (q.optionsHtml ? q.optionsHtml[i] : escapeHtml(q.options[i])) + '</span>';
        h += '</button>';
      }
      h += '</div>';
      if (!submitted) {
        h += '<button class="quiz__submit-btn" data-submit="multi" data-qid="' + escapeHtml(qId) + '"' + (pending.length === 0 ? ' disabled' : '') + '>Submit</button>';
      }
      return h;
    }

    function renderTrueFalseInput(q, qId, submitted, ans) {
      var h = '<div class="quiz__tf-options">';
      var vals = [true, false];
      for (var i = 0; i < vals.length; i++) {
        var val = vals[i];
        var cls = 'quiz__tf-btn';
        if (submitted) {
          if (val === q.correctAnswer) cls += ' quiz__tf-btn--correct';
          else if (val === ans.userAnswer) cls += ' quiz__tf-btn--wrong';
          cls += ' quiz__tf-btn--disabled';
        }
        h += '<button class="' + cls + '" data-tf="' + val + '" data-qid="' + escapeHtml(qId) + '"' + (submitted ? ' disabled' : '') + '>' + (val ? 'True' : 'False') + '</button>';
      }
      h += '</div>';
      return h;
    }

    function renderFreeTextInput(q, qId, submitted, ans) {
      var h = '<div class="quiz__freetext">';
      if (submitted) {
        h += '<div class="quiz__freetext-answer">' + escapeHtml(String(ans.userAnswer)) + '</div>';
      } else {
        h += '<input class="quiz__freetext-input" type="text" id="freetext-' + escapeHtml(qId) + '" data-qid="' + escapeHtml(qId) + '" placeholder="' + escapeHtml(q.placeholder || 'Type your answer...') + '">';
        h += '<button class="quiz__submit-btn" data-submit="freetext" data-qid="' + escapeHtml(qId) + '">Submit</button>';
      }
      h += '</div>';
      return h;
    }

    function renderGroupHtml(group) {
      var allPartsAnswered = group.parts.every(function(p) { return quizAnswers[p.id] !== undefined; });
      var h = '<div class="quiz__group">';
      h += '<div class="quiz__group-prompt">' + group.questionHtml + '</div>';

      if (group.hintHtml && !allPartsAnswered) {
        h += '<div class="quiz__hint">';
        h += '<button class="quiz__hint-btn" data-hint="' + escapeHtml(group.id) + '">Show hint</button>';
        h += '<div class="quiz__hint-text" id="hint-' + escapeHtml(group.id) + '" style="display:none">' + group.hintHtml + '</div>';
        h += '</div>';
      }

      var letters = "abcdefghijklmnopqrstuvwxyz";
      for (var i = 0; i < group.parts.length; i++) {
        var part = group.parts[i];
        h += '<div class="quiz__group-part">';
        h += '<div class="quiz__group-part-label">Part ' + letters[i] + '</div>';
        h += renderQuestionHtml(part, part.id);
        h += '</div>';
      }

      if (allPartsAnswered && group.explanationHtml) {
        h += '<div class="quiz__explanation">' + group.explanationHtml + '</div>';
      }

      h += '</div>';
      return h;
    }

    function renderQuizResults() {
      var allQ = getQuizQuestions();
      var correct = 0;
      for (var i = 0; i < allQ.length; i++) {
        if (quizAnswers[allQ[i].id] && quizAnswers[allQ[i].id].correct) correct++;
      }
      var total = allQ.length;
      var pct = total > 0 ? Math.round((correct / total) * 100) : 0;

      var h = '<div class="quiz quiz__results">';
      h += '<div class="quiz__results-header">';
      h += '<div class="quiz__title">' + escapeHtml(quizData.title) + '</div>';
      h += '<div class="quiz__results-score">' + pct + '%</div>';
      h += '<div class="quiz__results-detail">' + correct + ' of ' + total + ' correct</div>';
      h += '</div>';

      h += '<div class="quiz__results-list">';
      var qNum = 0;
      for (var i = 0; i < quizFlat.length; i++) {
        var item = quizFlat[i];
        if (item.type === "info") continue;
        if (item.type === "group") {
          for (var j = 0; j < item.parts.length; j++) {
            qNum++;
            var part = item.parts[j];
            var ans = quizAnswers[part.id];
            var isCorrect = ans && ans.correct;
            h += '<div class="quiz__result-item quiz__result-item--' + (isCorrect ? 'correct' : 'wrong') + '">';
            h += '<span class="quiz__result-marker">' + (isCorrect ? '\\u2713' : '\\u2717') + '</span>';
            h += '<span class="quiz__result-num">Q' + qNum + '</span>';
            h += '<span class="quiz__result-text">' + part.questionHtml + '</span>';
            h += '</div>';
          }
        } else {
          qNum++;
          var ans = quizAnswers[item.id];
          var isCorrect = ans && ans.correct;
          h += '<div class="quiz__result-item quiz__result-item--' + (isCorrect ? 'correct' : 'wrong') + '">';
          h += '<span class="quiz__result-marker">' + (isCorrect ? '\\u2713' : '\\u2717') + '</span>';
          h += '<span class="quiz__result-num">Q' + qNum + '</span>';
          h += '<span class="quiz__result-text">' + item.questionHtml + '</span>';
          h += '</div>';
        }
      }
      h += '</div>';

      h += '<div class="quiz__results-actions">';
      h += '<button class="quiz__nav-btn" id="quiz-retry">Retry quiz</button>';
      h += '</div>';

      h += '</div>';

      mainContent.innerHTML = h;
      mainContent.scrollTo(0, 0);

      var retryBtn = document.getElementById("quiz-retry");
      if (retryBtn) {
        retryBtn.addEventListener("click", function() {
          quizAnswers = {};
          quizIdx = 0;
          pendingAnswers = {};
          quizPhase = "active";
          renderQuiz();
        });
      }
    }

    function setupQuizHandlers() {
      // Prev / Next / Finish
      var prevBtn = document.getElementById("quiz-prev");
      var nextBtn = document.getElementById("quiz-next");
      var finishBtn = document.getElementById("quiz-finish");

      if (prevBtn) prevBtn.addEventListener("click", function() {
        if (quizIdx > 0) { quizIdx--; renderQuiz(); }
      });
      if (nextBtn) nextBtn.addEventListener("click", function() {
        if (quizIdx < quizFlat.length - 1) { quizIdx++; renderQuiz(); }
      });
      if (finishBtn) finishBtn.addEventListener("click", function() {
        quizPhase = "finished";
        renderQuiz();
      });

      // Hint toggle
      document.querySelectorAll(".quiz__hint-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var hintId = "hint-" + btn.dataset.hint;
          var hintEl = document.getElementById(hintId);
          if (hintEl) {
            var hidden = hintEl.style.display === "none";
            hintEl.style.display = hidden ? "" : "none";
            btn.textContent = hidden ? "Hide hint" : "Show hint";
          }
        });
      });

      // Single-choice option clicks — toggle selection without re-render
      document.querySelectorAll('[data-type="single"]').forEach(function(btn) {
        btn.addEventListener("click", function() {
          if (btn.disabled) return;
          var qId = btn.dataset.qid;
          var idx = parseInt(btn.dataset.option);
          pendingAnswers[qId] = idx;

          var container = btn.closest(".quiz__options");
          container.querySelectorAll('[data-type="single"]').forEach(function(el) {
            el.classList.toggle("quiz__option--selected", parseInt(el.dataset.option) === idx);
            var marker = el.querySelector(".quiz__option-marker");
            // marker styling handled by CSS via --selected class
          });

          var submitBtn = btn.closest(".quiz__question").querySelector('[data-submit="single"]');
          if (submitBtn) submitBtn.disabled = false;
        });
      });

      // Multi-choice option clicks — toggle selection
      document.querySelectorAll('[data-type="multi"]').forEach(function(btn) {
        btn.addEventListener("click", function() {
          if (btn.disabled) return;
          var qId = btn.dataset.qid;
          var idx = parseInt(btn.dataset.option);

          if (!pendingAnswers[qId]) pendingAnswers[qId] = [];
          var arr = pendingAnswers[qId];
          var pos = arr.indexOf(idx);
          if (pos >= 0) arr.splice(pos, 1);
          else arr.push(idx);

          btn.classList.toggle("quiz__option--selected");
          var checkEl = btn.querySelector(".quiz__option-check");
          if (checkEl) checkEl.textContent = btn.classList.contains("quiz__option--selected") ? "\\u2713" : "";

          var submitBtn = btn.closest(".quiz__question").querySelector('[data-submit="multi"]');
          if (submitBtn) submitBtn.disabled = arr.length === 0;
        });
      });

      // True/False clicks — immediate submit
      document.querySelectorAll("[data-tf]").forEach(function(btn) {
        btn.addEventListener("click", function() {
          if (btn.disabled) return;
          var val = btn.dataset.tf === "true";
          var qId = btn.dataset.qid;
          var q = findQuizQuestion(qId);
          if (q) {
            quizAnswers[qId] = { userAnswer: val, correct: checkQuizAnswer(q, val) };
            renderQuiz();
          }
        });
      });

      // Submit buttons
      document.querySelectorAll("[data-submit]").forEach(function(btn) {
        btn.addEventListener("click", function() {
          if (btn.disabled) return;
          var type = btn.dataset.submit;
          var qId = btn.dataset.qid;
          var q = findQuizQuestion(qId);
          if (!q) return;

          var answer;
          if (type === "single") {
            answer = pendingAnswers[qId];
            if (answer === undefined) return;
          } else if (type === "multi") {
            answer = (pendingAnswers[qId] || []).slice();
            if (answer.length === 0) return;
          } else if (type === "freetext") {
            var input = document.getElementById("freetext-" + qId);
            if (!input || !input.value.trim()) return;
            answer = input.value;
          }

          quizAnswers[qId] = { userAnswer: answer, correct: checkQuizAnswer(q, answer) };
          delete pendingAnswers[qId];
          renderQuiz();
        });
      });

      // Freetext Enter key
      document.querySelectorAll(".quiz__freetext-input").forEach(function(input) {
        input.addEventListener("keydown", function(e) {
          if (e.key === "Enter") {
            e.preventDefault();
            var qId = input.dataset.qid;
            var q = findQuizQuestion(qId);
            if (!q || !input.value.trim()) return;
            quizAnswers[qId] = { userAnswer: input.value, correct: checkQuizAnswer(q, input.value) };
            delete pendingAnswers[qId];
            renderQuiz();
          }
        });
        // Auto-focus the first freetext input
        if (!document.querySelector(".quiz__freetext-input:focus")) {
          input.focus();
        }
      });
    }
`;
