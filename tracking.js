/*
 * Umami custom events for Year 2 / Year 4 Explorations.
 * Loaded on every page alongside umami.js. Uses event delegation so it
 * doesn't need to know which handlers the page itself already wires up.
 *
 * Events emitted:
 *   read-aloud           - when a Read-to-me button is clicked
 *   featured-open        - when a deep-dive card is opened (Mayan / Rivers)
 *   chapter-tab-click    - when a sticky chapter tab is clicked
 *   quiz-start           - fires ONCE per page load, on the first quiz answer
 *   quiz-complete        - when every quiz question on the page has been
 *                          answered, with { score, total } properties
 *
 * All events include a `page` property so you can filter by URL in the
 * Umami dashboard.
 */
(function() {
  function pageKey() {
    var p = (location.pathname || '/').split('/').pop();
    return p || 'index.html';
  }
  function track(name, data) {
    if (window.umami && typeof window.umami.track === 'function') {
      try { window.umami.track(name, Object.assign({ page: pageKey() }, data || {})); }
      catch (e) { /* swallow */ }
    }
  }

  /* ---- click events (delegated) ---- */
  document.addEventListener('click', function(e) {
    var readBtn = e.target.closest('[data-read]');
    if (readBtn) {
      var label = readBtn.querySelector('.read-label');
      track('read-aloud', { label: label ? label.textContent.trim() : '' });
    }

    var featured = e.target.closest('.featured');
    if (featured) {
      track('featured-open', { href: featured.getAttribute('href') || '' });
    }

    var tab = e.target.closest('.tab[data-tab]');
    if (tab) {
      track('chapter-tab-click', { tab: tab.getAttribute('data-tab') });
    }
  }, true);

  /* ---- quiz lifecycle ---- */
  var quizStarted = false;
  var quizCompleteTracked = false;

  function checkQuizState() {
    var wrap = document.getElementById('quiz-wrap');
    if (!wrap) return;
    var cards = wrap.querySelectorAll('.quiz');
    if (!cards.length) return;
    var total = cards.length;
    var done = 0;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].dataset && cards[i].dataset.answered) done++;
    }

    if (done > 0 && !quizStarted) {
      quizStarted = true;
      track('quiz-start', { total: total });
    }

    if (total > 0 && done === total && !quizCompleteTracked) {
      // Score box renders asynchronously after the last answer — wait a tick
      setTimeout(function() {
        var scoreEl = document.querySelector('.quiz-score-box h3')
                   || document.querySelector('#quiz-score h3');
        if (!scoreEl) return;
        var m = scoreEl.textContent.match(/(\d+)\s*out\s*of\s*(\d+)/i);
        if (m) {
          quizCompleteTracked = true;
          var score = parseInt(m[1], 10);
          var t = parseInt(m[2], 10);
          track('quiz-complete', {
            score: score,
            total: t,
            perfect: score === t ? 1 : 0,
            ratio: t ? Math.round((score / t) * 100) : 0
          });
        }
      }, 150);
    }
  }

  function initQuizObserver() {
    var wrap = document.getElementById('quiz-wrap');
    if (!wrap || !window.MutationObserver) return;
    var mo = new MutationObserver(checkQuizState);
    mo.observe(wrap, { subtree: true, attributes: true, attributeFilter: ['data-answered', 'class'], childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuizObserver);
  } else {
    initQuizObserver();
  }
})();
