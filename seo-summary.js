(() => {
  const DIRECTORY_URL = '/sunset-forecast/';
  let lastSignature = '';
  let queued = false;

  const text = (selector, root = document) => (root.querySelector(selector)?.textContent || '').trim();

  function metricValue(label) {
    const cards = [...document.querySelectorAll('#metrics .metric')];
    const card = cards.find((item) => text('.metric-label', item).toLowerCase() === label.toLowerCase());
    return card ? text('.metric-value', card) : '—';
  }

  function locationFromTopline() {
    const topline = text('#forecastTopline');
    const separator = topline.indexOf('·');
    return separator >= 0 ? topline.slice(separator + 1).trim() : topline;
  }

  function outlookText() {
    return [...document.querySelectorAll('#days .day-btn')]
      .map((item) => {
        const day = text('.day-name', item);
        const score = text('.day-score', item);
        const note = text('.day-note', item).split('·')[0].trim();
        return day && score ? `${day} ${score}/100${note ? ` ${note}` : ''}` : '';
      })
      .filter(Boolean)
      .join(' · ');
  }

  function renderSummary() {
    queued = false;
    const hero = document.querySelector('#forecastHero');
    if (!hero || hero.classList.contains('hidden')) return;

    const location = locationFromTopline();
    const score = text('#scoreNumber');
    const verdict = text('#verdict');
    const sunset = text('#sunsetTime');
    const why = text('#whyText');
    if (!location || !score || !verdict || !sunset) return;

    const placeName = location.split(',')[0].trim() || location;
    const visibility = metricValue('Visibility');
    const highCloud = metricValue('High cloud');
    const rainChance = metricValue('Rain chance');
    const outlook = outlookText();
    const signature = [location, score, verdict, sunset, visibility, highCloud, rainChance, outlook].join('|');
    if (signature === lastSignature && document.querySelector('.seo-location-summary')) return;
    lastSignature = signature;

    let section = document.querySelector('.seo-location-summary');
    if (!section) {
      section = document.createElement('section');
      section.className = 'seo-location-summary';
      section.setAttribute('aria-labelledby', 'locationForecastSummary');
      const main = document.querySelector('main');
      if (!main) return;
      main.appendChild(section);
    }

    section.innerHTML = `
      <div class="seo-location-summary-inner">
        <h2 id="locationForecastSummary">${escapeHtml(placeName)} sunset forecast</h2>
        <p>Tonight in ${escapeHtml(location)}, sunset is at <strong>${escapeHtml(sunset)}</strong>. Skying rates the conditions <strong>${escapeHtml(score)}/100 (${escapeHtml(verdict)})</strong>. ${escapeHtml(why)}</p>
        <dl class="seo-location-facts">
          <div><dt>Sunset</dt><dd>${escapeHtml(sunset)}</dd></div>
          <div><dt>Visibility</dt><dd>${escapeHtml(visibility)}</dd></div>
          <div><dt>High cloud</dt><dd>${escapeHtml(highCloud)}</dd></div>
          <div><dt>Rain chance</dt><dd>${escapeHtml(rainChance)}</dd></div>
        </dl>
        ${outlook ? `<p><strong>7-day sunset outlook:</strong> ${escapeHtml(outlook)}.</p>` : ''}
        <p><a href="${DIRECTORY_URL}">Browse more sunset forecast locations</a></p>
      </div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(renderSummary);
  }

  const observer = new MutationObserver(queueRender);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class']
  });

  const originalPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    const result = originalPushState(...args);
    queueRender();
    return result;
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => {
    const result = originalReplaceState(...args);
    queueRender();
    return result;
  };

  window.addEventListener('popstate', queueRender);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queueRender, { once: true });
  } else {
    queueRender();
  }
})();
