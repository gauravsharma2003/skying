import {evaluate,skyBackground} from './scoring.js';
import {placePath,LOCATIONS,slugify} from './locations.js';
import {solarClock,solarTimes,solarWindow} from './solar.js';
    (() => {
      'use strict';

      // Photon is an OpenStreetMap-backed geocoder designed for search-as-you-type.
      // The public instance is a demo service: for production traffic, self-host Photon
      // or replace this endpoint with a geocoding provider that offers an SLA.
      const GEO_SEARCH = 'https://photon.komoot.io/api/';
      const GEO_REVERSE = 'https://photon.komoot.io/reverse';
      

      // Approximate, permission-free city detection from the public IP.
      // ipapi.co's free endpoint is suited to development/testing; use your own paid or
      // infrastructure-level IP geolocation for production.
      const IP_GEO = 'https://ipapi.co/json/';

      const state = {
        query: '',
        place: null,
        data: null,
        forecasts: [],
        selected: 0,
        loading: false,
        suggestions: [],
        suggestionIndex: -1,
        suggestionTimer: null,
        activeInput: null,
        selectedSuggestion: null,
        approximatePlace: null,
        userEdited: false,
        requestId: 0,
      };

      const el = {
        header: document.getElementById('siteHeader'),
        headerSearch: document.getElementById('headerSearch'),
        empty: document.getElementById('emptyState'),
        status: document.getElementById('status'),
        hero: document.getElementById('forecastHero'),
        backdropImage: document.getElementById('forecastBackdropImage'),
        dashboard: document.getElementById('dashboard'),
        topline: document.getElementById('forecastTopline'),
        message: document.getElementById('forecastMessage'),
        score: document.getElementById('scoreNumber'),
        verdict: document.getElementById('verdict'),
        sunset: document.getElementById('sunsetTime'),
        whyText: document.getElementById('whyText'),
        bestWindow: document.getElementById('bestWindow'),
        horizon: document.getElementById('horizonClarity'),
        visibility: document.getElementById('visibilityValue'),
        ruler: document.getElementById('eveningRuler'),
        goldenDetail: document.getElementById('goldenDetail'),
        blueDetail: document.getElementById('blueDetail'),
        localTimeNote: document.getElementById('localTimeNote'),
        days: document.getElementById('days'),
        metrics: document.getElementById('metrics'),
        mobileSearchToggle: document.getElementById('mobileSearchToggle'),
        mobileSearchClose: document.getElementById('mobileSearchClose'),
        mobileLocationLabel: document.getElementById('mobileLocationLabel'),
        landingLocate: document.getElementById('landingLocate'),
        mobilePopularPlaces: document.getElementById('mobilePopularPlaces'),
        themeToggle: document.getElementById('themeToggle'),
      };

      const searchInputs = [...document.querySelectorAll('[data-search-input]')];
      const searchForms = [...document.querySelectorAll('[data-search-form]')];
      const locateButtons = [...document.querySelectorAll('[data-locate]')];
      const findButtons = [...document.querySelectorAll('[data-find]')];

      const popularSlugs = ['new-delhi-india','mumbai-india','london-united-kingdom','new-york-united-states','dubai-united-arab-emirates','sydney-australia'];
      if (el.mobilePopularPlaces) {
        popularSlugs.map(slug => LOCATIONS.find(place => place.slug === slug)).filter(Boolean).forEach(place => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'mobile-popular-place';
          button.innerHTML = `<span>${escapeHtml(place.name)}</span><small>${escapeHtml(place.country)}</small>`;
          button.addEventListener('click', () => runSearch(place));
          el.mobilePopularPlaces.appendChild(button);
        });
      }

      function applyTheme(theme) {
        const value = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = value;
        const next = value === 'light' ? 'dark' : 'light';
        const label = `Switch to ${next} theme`;
        if (el.themeToggle) {
          el.themeToggle.setAttribute('aria-label', label);
          el.themeToggle.title = label;
        }
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'dark' ? '#17232b' : '#e9edf0');
      }

      try { applyTheme(localStorage.getItem('skying-theme') || 'light'); } catch { applyTheme('light'); }

      const niceDate = iso => new Intl.DateTimeFormat('en-GB', {timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(`${iso}T12:00:00Z`));
      const fmtTime = iso => iso ? iso.split('T')[1]?.slice(0,5) || '—' : '—';
      const messageFor = score => score >= 78 ? 'An evening worth going out for.' : score >= 63 ? 'A promising evening if the horizon holds.' : score >= 45 ? 'A subtle sunset, with a chance of colour.' : 'A quiet evening for the horizon.';

      function localClock(instant, timezone) {
        if (!instant) return null;
        return new Intl.DateTimeFormat('en-GB', {timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant));
      }

      function minuteValue(clock) {
        const [hour, minute] = String(clock || '').split(':').map(Number);
        return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
      }

      function renderRuler(sunsetIso, light, timezone) {
        const sunsetClock = fmtTime(sunsetIso);
        const sunsetMinute = minuteValue(sunsetClock);
        if (sunsetMinute == null) return '<p class="detail-note">No complete evening timeline is available.</p>';
        const start = sunsetMinute - 120;
        const position = value => `${Math.max(0, Math.min(100, ((value - start) / 180) * 100))}%`;
        const goldenStart = minuteValue(localClock(light.goldenStart, timezone));
        const goldenEnd = minuteValue(localClock(light.goldenEnd, timezone));
        const rangeStart = goldenStart == null ? sunsetMinute - 45 : goldenStart;
        const rangeEnd = goldenEnd == null ? sunsetMinute + 15 : goldenEnd;
        const label = value => `${String(Math.floor((value + 1440) % 1440 / 60)).padStart(2,'0')}:${String((value + 1440) % 60).padStart(2,'0')}`;
        return `<div class="ruler-line" style="--range-start:${position(rangeStart)};--range-width:${Math.max(2, Math.min(100, ((rangeEnd-rangeStart)/180)*100))}%;--sunset-position:${position(sunsetMinute)}"><span class="golden-range"></span><span class="sunset-marker"></span></div><div class="ruler-labels"><span>${label(start)}</span><span>${label(start+60)}</span><span>${label(sunsetMinute)}</span><span>${label(start+180)}</span></div>`;
      }

      function setStatus(message) {
        el.status.textContent = message || '';
        document.querySelectorAll('.search-status').forEach(item => {item.textContent=message || '';});
      }

      function syncInputs(value, source = null) {
        state.query = value;
        searchInputs.forEach(input => {
          if (input !== source && input.value !== value) input.value = value;
        });
      }

      function setLoading(loading) {
        state.loading = loading;
        findButtons.forEach(btn => {
          btn.disabled = loading;
          btn.textContent = loading ? 'Reading' : 'Find';
        });
        locateButtons.forEach(btn => btn.disabled = loading);
      }

      function placeLabel(place) {
        return [place.name, place.admin1, place.country].filter(Boolean).join(', ');
      }

      function photonFeatureToPlace(feature, fallback = '') {
        const p = feature?.properties || {};
        const c = feature?.geometry?.coordinates || [];
        const cityLike = p.city || p.town || p.village || p.locality || p.district || '';
        return {
          name: p.name || cityLike || fallback || 'Selected place',
          admin1: p.state || p.county || '',
          country: p.country || '',
          latitude: Number(c[1]),
          longitude: Number(c[0]),
          osmType: p.osm_type || p.type || '',
          city: cityLike,
        };
      }

      function formatSuggestion(feature) {
        const p = feature.properties || {};
        const main = p.name || p.city || p.town || p.village || p.locality || 'Unnamed place';
        const details = [p.city || p.town || p.village, p.state, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && v !== main);
        return {
          main,
          details: details.join(', '),
          type: (p.osm_value || p.type || '').replaceAll('_', ' '),
        };
      }

      function currentSuggestionBox() {
        return state.activeInput?.closest('.search-wrap')?.querySelector('[data-suggestions]') || null;
      }

      function closeSuggestions() {
        document.querySelectorAll('[data-suggestions]').forEach(box => {
          box.classList.remove('open');
          box.innerHTML = '';
        });
        searchInputs.forEach(input => input.setAttribute('aria-expanded', 'false'));
        state.suggestions = [];
        state.suggestionIndex = -1;
      }

      function renderSuggestions(features, box) {
        if (!box) return;
        state.suggestions = features;
        state.suggestionIndex = -1;
        box.innerHTML = '';

        if (!features.length) {
          box.innerHTML = '<div class="suggestion-info">No matching places.</div>';
          box.classList.add('open');
          state.activeInput?.setAttribute('aria-expanded', 'true');
          return;
        }

        features.forEach((feature, index) => {
          const f = formatSuggestion(feature);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'suggestion';
          btn.setAttribute('role', 'option');
          btn.dataset.index = String(index);
          btn.innerHTML = `<span><strong>${escapeHtml(f.main)}</strong><small>${escapeHtml(f.details || 'OpenStreetMap place')}</small></span><span class="type">${escapeHtml(f.type || 'place')}</span>`;
          btn.addEventListener('mousedown', e => e.preventDefault());
          btn.addEventListener('click', () => chooseSuggestion(index));
          box.appendChild(btn);
        });
        box.classList.add('open');
        state.activeInput?.setAttribute('aria-expanded', 'true');
      }

      function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
      }

      function updateSuggestionHighlight() {
        const box = currentSuggestionBox();
        if (!box) return;
        [...box.querySelectorAll('.suggestion')].forEach((btn, i) => btn.classList.toggle('active', i === state.suggestionIndex));
      }

      function chooseSuggestion(index) {
        const feature = state.suggestions[index];
        if (!feature) return;
        const found = photonFeatureToPlace(feature, state.query);
        state.selectedSuggestion = found;
        const label = placeLabel(found);
        syncInputs(label);
        searchInputs.forEach(input => input.value = label);
        closeSuggestions();
        state.activeInput?.focus();
      }

      async function fetchSuggestions(query, requestId) {
        if (query.trim().length < 2) {
          closeSuggestions();
          return;
        }

        const focus = state.approximatePlace;
        const url = new URL(GEO_SEARCH);
        url.searchParams.set('q', query.trim());
        url.searchParams.set('limit', '6');
        url.searchParams.set('lang', 'en');
        if (focus?.latitude && focus?.longitude) {
          url.searchParams.set('lat', String(focus.latitude));
          url.searchParams.set('lon', String(focus.longitude));
          url.searchParams.set('zoom', '8');
          url.searchParams.set('location_bias_scale', '0.25');
        }

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Suggestions unavailable');
          const geo = await response.json();
          if (requestId !== state.requestId) return;
          renderSuggestions(geo.features || [], currentSuggestionBox());
        } catch {
          if (requestId !== state.requestId) return;
          const box = currentSuggestionBox();
          if (box) {
            box.innerHTML = '<div class="suggestion-info">Suggestions are temporarily unavailable. You can still press Find.</div>';
            box.classList.add('open');
          }
        }
      }

      function queueSuggestions(input) {
        clearTimeout(state.suggestionTimer);
        state.requestId += 1;
        const id = state.requestId;
        state.suggestionTimer = setTimeout(() => fetchSuggestions(input.value, id), 320);
      }

      async function forwardGeocode(query) {
        const key=slugify(query);
        const local=LOCATIONS.find(p=>[slugify(p.name),p.slug,...p.aliases].includes(key));
        if(local) return local;
        const url = new URL(GEO_SEARCH);
        url.searchParams.set('q', query.trim());
        url.searchParams.set('limit', '1');
        url.searchParams.set('lang', 'en');
        if (state.approximatePlace?.latitude && state.approximatePlace?.longitude) {
          url.searchParams.set('lat', String(state.approximatePlace.latitude));
          url.searchParams.set('lon', String(state.approximatePlace.longitude));
          url.searchParams.set('zoom', '8');
          url.searchParams.set('location_bias_scale', '0.2');
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('Location search is unavailable.');
        const geo = await response.json();
        const feature = geo.features?.[0];
        if (!feature) throw new Error('That location could not be found.');
        const found = photonFeatureToPlace(feature, query);
        if (!Number.isFinite(found.latitude) || !Number.isFinite(found.longitude)) throw new Error('That location has no usable coordinates.');
        return found;
      }

      async function reverseGeocode(latitude, longitude) {
        const url = new URL(GEO_REVERSE);
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));
        url.searchParams.set('limit', '1');
        url.searchParams.set('lang', 'en');
        const response = await fetch(url);
        if (!response.ok) throw new Error('Reverse geocoding unavailable.');
        const geo = await response.json();
        const feature = geo.features?.[0];
        if (!feature) return { name: 'Current location', admin1: '', country: '', latitude, longitude };
        const found = photonFeatureToPlace(feature, 'Current location');
        found.latitude = latitude;
        found.longitude = longitude;
        return found;
      }

      async function runSearch(explicitPlace = null) {
        const q = state.activeInput?.value?.trim() || state.query.trim();
        if ((!q && !explicitPlace) || state.loading) return;
        closeSuggestions(); setLoading(true); setStatus('Finding the horizon…');
        try {
          const candidate=explicitPlace || state.selectedSuggestion;
          const found=candidate && (explicitPlace || q===placeLabel(candidate)) ? candidate : await forwardGeocode(q);
          window.location.assign(placePath(found));
        } catch (error) {
          setStatus(error instanceof Error ? error.message : 'Location search unavailable.');
          setLoading(false);
        }
      }

      function openMobileSearch() {
        if (window.innerWidth > 767) return;
        el.header.classList.add('mobile-search-open');
        document.body.classList.add('search-modal-open');
        const input = document.getElementById('placeHeader');
        state.activeInput = input;
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }, 40);
      }

      function closeMobileSearch() {
        el.header.classList.remove('mobile-search-open');
        document.body.classList.remove('search-modal-open');
        closeSuggestions();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }

      function showEmpty() {
        el.empty.classList.remove('hidden');
        el.hero.classList.add('hidden');
        el.dashboard.classList.add('hidden');
        el.headerSearch.classList.add('hidden');
        el.header.classList.add('compact-empty');
        el.header.classList.remove('mobile-search-open');
        document.body.classList.remove('search-modal-open');
      }

      function renderForecast(focusDay = false) {
        const data = state.data;
        const current = state.forecasts[state.selected];
        const sunset = data?.daily?.sunset?.[state.selected];
        if (!data) return;

        el.empty.classList.add('hidden');
        el.hero.classList.remove('hidden');
        el.dashboard.classList.remove('hidden');
        el.headerSearch.classList.remove('hidden');
        el.header.classList.remove('compact-empty');
        el.header.classList.remove('mobile-search-open');
        document.body.classList.remove('search-modal-open');

        const location = state.place ? placeLabel(state.place) : 'Your next horizon';
        if (el.mobileLocationLabel) el.mobileLocationLabel.textContent = state.place?.name || 'Change place';
        const dayLabel = state.selected === 0 ? 'Today' : niceDate(data.daily.time[state.selected] || '', true);
        el.topline.textContent = `${dayLabel} · ${location} · ${data.timezone}`;
        document.getElementById('cityHeading').textContent = `${state.place.name} sunset forecast`;
        el.score.textContent = current ? String(current.score) : '—';
        el.verdict.textContent = current?.verdict || 'Unavailable';
        el.message.textContent = current ? messageFor(current.score) : 'The evening forecast is unavailable.';
        const backdrop = skyBackground(current);
        if (el.backdropImage) {
          el.backdropImage.src = backdrop.src;
          el.backdropImage.dataset.situation = backdrop.situation;
        }
        el.sunset.textContent = fmtTime(sunset);
        el.whyText.textContent = current ? current.reasons.join(' ') : 'No complete sunset-quality forecast is available for this date.';
        const light=solarTimes(data.daily.time[state.selected],state.place,data.timezone);
        el.bestWindow.textContent = solarWindow(light.goldenStart,light.goldenEnd,data.timezone,data.daily.time[state.selected]);
        el.horizon.textContent = current ? `${Math.round(current.horizonScore)}% · ${current.horizonScore >= 80 ? 'excellent' : 'mixed'}` : 'Unavailable';
        el.visibility.textContent = current ? `${current.vis.toFixed(0)} km` : 'Unavailable';
        el.ruler.innerHTML = renderRuler(sunset, light, data.timezone);
        el.goldenDetail.textContent = solarWindow(light.goldenStart,light.goldenEnd,data.timezone,data.daily.time[state.selected]);
        el.blueDetail.textContent = solarWindow(light.blueStart,light.blueEnd,data.timezone,data.daily.time[state.selected]);
        el.localTimeNote.textContent = `Forecasts are estimates. All times are local to ${data.timezone}.`;

        const previousDayScroll = el.days.scrollLeft;
        const existingDayButtons = [...el.days.querySelectorAll('.day-btn')];
        if (existingDayButtons.length !== state.forecasts.length) el.days.innerHTML = '';
        state.forecasts.forEach((forecast, index) => {
          const btn = el.days.children[index] || document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('aria-pressed', String(index===state.selected));
          btn.className = `day-btn${index === state.selected ? ' selected' : ''}`;
          const name = index === 0 ? 'Today' : niceDate(data.daily.time[index] || '').split(',')[0];
          btn.innerHTML = `<span class="day-name">${escapeHtml(name)}</span><span class="day-score">${forecast?.score ?? '—'}</span><span class="day-note">${escapeHtml(forecast?.verdict || 'Unavailable')}</span><span class="day-time">${escapeHtml(fmtTime(data.daily.sunset[index]))}</span>`;
          if (!btn.dataset.bound) {
            btn.dataset.bound = 'true';
            btn.addEventListener('click', () => {
              state.selected = index;
              renderForecast(true);
            });
          }
          if (!btn.isConnected) el.days.appendChild(btn);
        });
        el.days.scrollLeft = previousDayScroll;
        if (focusDay) el.days.querySelector('.selected')?.focus({preventScroll:true});

        const cards = current ? [
          ['High cloud', `${Math.round(current.high)}%`, 'colour canvas'],
          ['Low cloud', `${Math.round(current.low)}%`, 'horizon block'],
          ['Visibility', `${current.vis.toFixed(1)} km`, 'atmospheric reach'],
          ['Rain chance', `${Math.round(current.precip)}%`, 'during the window'],
        ] : [];
        el.metrics.innerHTML = cards.map(([label, value, note]) => `
          <article class="metric"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div><div class="metric-note">${escapeHtml(note)}</div></article>
        `).join('');


      }

      async function usePreciseLocation() {
        closeSuggestions();
        if (!('geolocation' in navigator)) {
          setStatus('Precise location is not supported by this browser.', 'Your approximate IP location can still be used.');
          return;
        }

        setLoading(true);
        setStatus('Asking your browser for precise location…', 'The browser may show its own permission prompt the first time.');
        navigator.geolocation.getCurrentPosition(async position => {
          try {
            const { latitude, longitude } = position.coords;
            setStatus('Naming your location…', '');
            const found = await reverseGeocode(latitude, longitude);
            syncInputs(placeLabel(found));
            found.precise = true;
            state.selectedSuggestion = found;
            setLoading(false);
            await runSearch(found);
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Could not use your location.', 'You can search by city instead.');
          } finally {
            setLoading(false);
          }
        }, error => {
          setLoading(false);
          const reason = error.code === 1 ? 'Location permission was not granted.' : 'Could not get a precise device location.';
          setStatus(reason);
        }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 10 * 60 * 1000 });
      }

      async function detectApproximateLocation() {
        try {
          const response = await fetch(IP_GEO, { headers: { 'Accept': 'application/json' } });
          if (!response.ok) throw new Error('IP location unavailable');
          const p = await response.json();
          const found = {
            name: p.city || 'Nearby',
            admin1: p.region || '',
            country: p.country_name || p.country || '',
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
          };
          if (!Number.isFinite(found.latitude) || !Number.isFinite(found.longitude)) throw new Error('IP location had no coordinates');
          state.approximatePlace = found;

          if (!state.userEdited && !state.place) {
            const label = placeLabel(found);
            syncInputs(label);
            state.selectedSuggestion = found;
            setStatus('');
          }
        } catch {
          setStatus('');
        }
      }

      searchForms.forEach(form => {
        form.addEventListener('submit', event => {
          event.preventDefault();
          state.activeInput = form.querySelector('[data-search-input]');
          runSearch();
        });
      });

      searchInputs.forEach(input => {
        input.addEventListener('focus', () => {
          state.activeInput = input;
          syncInputs(input.value, input);
          if (input.value.trim().length >= 2 && state.userEdited) queueSuggestions(input);
        });

        input.addEventListener('input', () => {
          state.activeInput = input;
          state.userEdited = true;
          state.selectedSuggestion = null;
          syncInputs(input.value, input);
          searchInputs.forEach(other => { if (other !== input) other.value = input.value; });
          queueSuggestions(input);
        });

        input.addEventListener('keydown', event => {
          if (event.key === 'ArrowDown' && state.suggestions.length) {
            event.preventDefault();
            state.suggestionIndex = Math.min(state.suggestions.length - 1, state.suggestionIndex + 1);
            updateSuggestionHighlight();
          } else if (event.key === 'ArrowUp' && state.suggestions.length) {
            event.preventDefault();
            state.suggestionIndex = Math.max(0, state.suggestionIndex - 1);
            updateSuggestionHighlight();
          } else if (event.key === 'Enter' && state.suggestionIndex >= 0) {
            event.preventDefault();
            chooseSuggestion(state.suggestionIndex);
          } else if (event.key === 'Escape') {
            closeSuggestions();
            closeMobileSearch();
          }
        });
      });

      locateButtons.forEach(btn => btn.addEventListener('click', usePreciseLocation));
      if (el.landingLocate) el.landingLocate.addEventListener('click', usePreciseLocation);
      if (el.mobileSearchToggle) el.mobileSearchToggle.addEventListener('click', openMobileSearch);
      if (el.mobileSearchClose) el.mobileSearchClose.addEventListener('click', closeMobileSearch);
      if (el.themeToggle) el.themeToggle.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem('skying-theme', next); } catch {}
      });

      document.addEventListener('click', event => {
        if (!(event.target instanceof Element) || !event.target.closest('.search-wrap')) closeSuggestions();
      });



      const ssrPage = window.__SKYING_PAGE__;
      if (ssrPage?.place && ssrPage?.data) {
        state.place = ssrPage.place;
        state.data = ssrPage.data;
        state.selected = 0;
        state.forecasts = ssrPage.data.daily.time.map((_, index) => evaluate(ssrPage.data.hourly, ssrPage.data.daily.sunset[index] || ''));
        state.selectedSuggestion = ssrPage.place;
        syncInputs(placeLabel(ssrPage.place));
        renderForecast();
      } else {
        showEmpty();
        detectApproximateLocation();
      }
    })();
