(function () {
  const DATA_URL = 'graveyard/graves.json';
  const PHOTO_PREFIX = 'graveyard/LoRes10Tombs/';

  const els = {
    mapWrap: document.getElementById('map-wrap'),
    mapImg: document.getElementById('churchyard-map'),
    canvas: document.getElementById('churchyard-map-canvas'),
    mapMarker: document.getElementById('churchyard-map-marker'),
    mapMarkerLabel: document.getElementById('map-marker-label'),
    form: document.getElementById('churchyard-search-form'),
    nameInput: document.getElementById('search-name'),
    resultSummary: document.getElementById('result-summary'),
    resultsList: document.getElementById('search-results'),
    detail: document.getElementById('stone-detail'),
    detailTitle: document.getElementById('detail-title'),
    detailId: document.getElementById('detail-id'),
    detailPeople: document.getElementById('detail-people'),
    detailPhotos: document.getElementById('detail-photos'),
    detailPhoto: document.getElementById('detail-photo'),
    photoPrev: document.getElementById('photo-prev'),
    photoNext: document.getElementById('photo-next'),
    photoCounter: document.getElementById('photo-counter'),
    clusterNav: document.getElementById('cluster-nav'),
    clusterNavLabel: document.getElementById('cluster-nav-label'),
    clusterPrev: document.getElementById('cluster-prev'),
    clusterNext: document.getElementById('cluster-next'),
  };

  /** Nearby-grave prev/next: map pixels and cap (dense areas stay manageable). */
  const NEARBY_MAX_RADIUS_MAP = 95;
  const NEARBY_MAX_COUNT = 12;
  const PICK_RADIUS_PX = 14;

  if (!els.canvas || !els.mapImg) {
    return;
  }

  const ctx = els.canvas.getContext('2d');

  const defaultMapMeta = {
    width: 1502,
    height: 825,
    coord_width: 1502,
    coord_height: 825,
    scale: 1,
    offset_x: 0,
    offset_y: 0,
  };

  let mapMeta = { ...defaultMapMeta };

  function applyMapMeta(raw) {
    mapMeta = { ...defaultMapMeta, ...(raw || {}) };
    mapMeta.width = Number(mapMeta.width) || defaultMapMeta.width;
    mapMeta.height = Number(mapMeta.height) || defaultMapMeta.height;
    mapMeta.coord_width = Number(mapMeta.coord_width) || defaultMapMeta.coord_width;
    mapMeta.coord_height = Number(mapMeta.coord_height) || defaultMapMeta.coord_height;
    mapMeta.scale = Number(mapMeta.scale);
    if (!Number.isFinite(mapMeta.scale)) {
      mapMeta.scale = mapMeta.width / mapMeta.coord_width;
    }
    mapMeta.offset_x = Number(mapMeta.offset_x) || 0;
    mapMeta.offset_y = Number(mapMeta.offset_y) || 0;
  }

  function mapX(stone) {
    return stone.x * mapMeta.scale + mapMeta.offset_x;
  }

  function mapY(stone) {
    return stone.y * mapMeta.scale + mapMeta.offset_y;
  }

  function toDisplayX(stone) {
    return mapX(stone) * displayScale;
  }

  function toDisplayY(stone) {
    return mapY(stone) * displayScale;
  }
  let stones = [];
  let stoneById = new Map();
  let filteredIds = null;
  let selectedId = null;
  let photoIndex = 0;
  let displayScale = 1;

  function normalize(s) {
    return (s || '').trim().toLowerCase();
  }

  function personMatchesName(person, query) {
    if (!query) return true;
    const hay = [
      person.first_name,
      person.middle_names,
      person.surname,
      person.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(query);
  }

  function runSearch() {
    const nameQuery = normalize(els.nameInput.value);

    if (!nameQuery) {
      filteredIds = null;
      updateResultSummary();
      drawMap();
      return;
    }

    const ids = [];
    for (const stone of stones) {
      const people = stone.people || [];
      const hit = people.some((p) => personMatchesName(p, nameQuery));
      if (hit) ids.push(stone.id);
    }
    filteredIds = new Set(ids);
    updateResultSummary();
    renderResultsList(ids);
    drawMap();
  }

  function updateResultSummary() {
    if (filteredIds == null) {
      els.resultSummary.textContent = '';
      els.resultsList.innerHTML = '';
      return;
    }
    const n = filteredIds.size;
    els.resultSummary.textContent =
      n === 0 ? 'No memorials match your search.' : `${n} memorial${n === 1 ? '' : 's'} found.`;
  }

  function isUnknownDatePart(part) {
    if (part == null) return true;
    const t = String(part).trim();
    return t === '' || /^_+$/.test(t);
  }

  function padDateComponent(n) {
    const num = parseInt(String(n).replace(/^0+/, '') || n, 10);
    if (Number.isNaN(num)) return String(n).trim();
    return String(num).padStart(2, '0');
  }

  /** Turn d/m/y tokens (with _ for unknown) into dotted display; null if nothing known. */
  function formatKnownDateParts(day, month, year) {
    const dU = isUnknownDatePart(day);
    const mU = isUnknownDatePart(month);
    const yU = isUnknownDatePart(year);
    if (dU && mU && yU) return null;
    if (!dU && !mU && !yU) {
      return `${padDateComponent(day)}.${padDateComponent(month)}.${String(year).trim()}`;
    }
    if (dU && mU && !yU) return String(year).trim();
    if (dU && !mU && !yU) {
      return `${padDateComponent(month)}.${String(year).trim()}`;
    }
    if (!dU && !mU && yU) {
      return `${padDateComponent(day)}.${padDateComponent(month)}`;
    }
    if (!dU && mU && !yU) return `${padDateComponent(day)}.${String(year).trim()}`;
    if (dU && !mU && yU) return `${padDateComponent(month)}.${String(year).trim()}`;
    return null;
  }

  function formatIsoDate(iso) {
    if (!iso || typeof iso !== 'string') return null;
    const t = iso.trim();
    const full = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (full) {
      return `${full[3]}.${full[2]}.${full[1]}`;
    }
    const partial = t.match(/^(\d{4})-(\d{2})$/);
    if (partial) {
      return `${partial[2]}.${partial[1]}`;
    }
    return null;
  }

  function parseRecordedDate(raw) {
    if (raw == null) return null;
    let s = String(raw).trim();
    if (!s || s === '_/_/_') return null;

    const spaceIdx = s.search(/\s/);
    let datePart = s;
    let suffix = '';
    if (spaceIdx !== -1) {
      datePart = s.slice(0, spaceIdx);
      suffix = s.slice(spaceIdx);
    }

    if (!datePart.includes('/')) return null;
    const segs = datePart.split('/');
    if (segs.length !== 3) return null;

    const formatted = formatKnownDateParts(segs[0], segs[1], segs[2]);
    if (!formatted) return null;
    return formatted + suffix;
  }

  function bornIsEstimate(person) {
    return /^yes$/i.test(String(person.born_is_estimate || '').trim());
  }

  function formatBornDisplay(person) {
    const fromRecorded = parseRecordedDate(person.born_as_recorded);
    if (fromRecorded) return fromRecorded;
    if (person.born_year != null && person.born_year !== '') {
      const y = String(person.born_year);
      return bornIsEstimate(person) ? `c. ${y}` : y;
    }
    return '';
  }

  function formatDiedDisplay(person) {
    const fromRecorded = parseRecordedDate(person.died_as_recorded);
    if (fromRecorded) return fromRecorded;
    const fromIso = formatIsoDate(person.died_date);
    if (fromIso) return fromIso;
    if (person.died_year != null && person.died_year !== '') {
      return String(person.died_year);
    }
    return '';
  }

  function formatPersonName(person) {
    const nameParts = [person.first_name, person.middle_names, person.surname].filter(Boolean);
    return nameParts.length ? nameParts.join(' ') : '';
  }

  function memorialTitle(stone) {
    const names = (stone.people || []).map(formatPersonName).filter(Boolean);
    if (names.length === 0) {
      return stone.display_number ? `Memorial ${stone.display_number}` : `Memorial ${stone.id}`;
    }
    if (names.length === 1) return `Memorial for ${names[0]}`;
    if (names.length === 2) return `Memorial for ${names[0]} and ${names[1]}`;
    const last = names[names.length - 1];
    const rest = names.slice(0, -1).join(', ');
    return `Memorial for ${rest} and ${last}`;
  }

  function formatPerson(person) {
    const name = formatPersonName(person) || 'Unknown name';
    const born = formatBornDisplay(person);
    const died = formatDiedDisplay(person);
    const age = person.age_as_recorded ? ` · ${person.age_as_recorded}` : '';
    const dates = [born, died].filter(Boolean).join(' – ');
    const notes = person.notes ? ` — ${person.notes}` : '';
    return `${name}${dates ? ` (${dates}${age})` : age}${notes}`;
  }

  function renderResultsList(ids) {
    els.resultsList.innerHTML = '';
    const max = 80;
    const slice = ids.slice(0, max);
    for (const id of slice) {
      const stone = stoneById.get(id);
      if (!stone) continue;
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'churchyard-result-btn';
      const primary = (stone.people && stone.people[0]) || null;
      const label = primary ? formatPerson(primary) : stone.display_number || stone.id;
      btn.textContent = `${stone.display_number || stone.id}: ${label}`;
      btn.dataset.stoneId = id;
      if (id === selectedId) btn.setAttribute('aria-current', 'true');
      btn.addEventListener('click', () =>
        selectStone(id, { scrollDetail: true, focusMap: true })
      );
      li.appendChild(btn);
      els.resultsList.appendChild(li);
    }
    if (ids.length > max) {
      const li = document.createElement('li');
      li.className = 'small';
      li.textContent = `… and ${ids.length - max} more. Refine your search to see fewer results.`;
      els.resultsList.appendChild(li);
    }
  }

  function selectStone(id, opts) {
    selectedId = id;
    const stone = stoneById.get(id);
    if (!stone) return;

    photoIndex = 0;
    els.detail.hidden = false;
    els.detailTitle.textContent = memorialTitle(stone);
    if (els.detailId) els.detailId.hidden = true;

    els.detailPeople.innerHTML = '';
    for (const person of stone.people || []) {
      const li = document.createElement('li');
      li.textContent = formatPerson(person);
      els.detailPeople.appendChild(li);
    }
    if (!(stone.people || []).length) {
      const li = document.createElement('li');
      li.textContent = 'No inscription text recorded yet.';
      els.detailPeople.appendChild(li);
    }

    updatePhotos(stone);
    updateResultsListSelection();
    drawMap();
    updateClusterNav();
    updateMapMarker();

    if (opts && opts.focusMap) {
      els.mapWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (opts && opts.scrollDetail) {
      els.detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function updateResultsListSelection() {
    const buttons = els.resultsList.querySelectorAll('.churchyard-result-btn[data-stone-id]');
    for (const btn of buttons) {
      if (btn.dataset.stoneId === selectedId) {
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.removeAttribute('aria-current');
      }
    }
  }

  function updateMapMarker() {
    if (!els.mapMarker) return;
    if (!selectedId) {
      els.mapMarker.hidden = true;
      return;
    }
    const stone = stoneById.get(selectedId);
    if (!stone || !mapMeta.width || !mapMeta.height) {
      els.mapMarker.hidden = true;
      return;
    }
    const leftPct = (mapX(stone) / mapMeta.width) * 100;
    const topPct = (mapY(stone) / mapMeta.height) * 100;
    els.mapMarker.style.left = `${leftPct}%`;
    els.mapMarker.style.top = `${topPct}%`;
    if (els.mapMarkerLabel) {
      els.mapMarkerLabel.textContent = stone.display_number || stone.id;
    }
    els.mapMarker.hidden = false;
  }

  function updatePhotos(stone) {
    const photos = stone.photos || [];
    if (!photos.length) {
      els.detailPhotos.hidden = true;
      return;
    }
    els.detailPhotos.hidden = false;
    photoIndex = Math.min(photoIndex, photos.length - 1);
    const path = PHOTO_PREFIX + photos[photoIndex];
    els.detailPhoto.src = path;
    els.detailPhoto.alt = `Gravestone photograph ${photoIndex + 1} for ${stone.display_number || stone.id}`;
    els.photoCounter.textContent = `${photoIndex + 1} / ${photos.length}`;
  }

  function resizeCanvas() {
    const rect = els.mapImg.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w < 1 || h < 1) return;
    displayScale = w / mapMeta.width;
    els.canvas.width = w;
    els.canvas.height = h;
    els.canvas.style.width = `${w}px`;
    els.canvas.style.height = `${h}px`;
    drawMap();
    updateMapMarker();
  }

  function stoneVisible(stone) {
    if (filteredIds != null && !filteredIds.has(stone.id)) return false;
    return true;
  }

  function getNearbyStoneIds(centerId) {
    const center = stoneById.get(centerId);
    if (!center) return [];

    const cx = mapX(center);
    const cy = mapY(center);
    const candidates = [];

    for (const stone of stones) {
      if (!stoneVisible(stone)) continue;
      const d = Math.hypot(mapX(stone) - cx, mapY(stone) - cy);
      if (d <= NEARBY_MAX_RADIUS_MAP) {
        candidates.push({ id: stone.id, d, stone });
      }
    }

    candidates.sort((a, b) => a.d - b.d);
    const picked = candidates.slice(0, NEARBY_MAX_COUNT);
    if (picked.length <= 1) return picked.map((c) => c.id);

    picked.sort((a, b) => {
      const angleA = Math.atan2(mapY(a.stone) - cy, mapX(a.stone) - cx);
      const angleB = Math.atan2(mapY(b.stone) - cy, mapX(b.stone) - cx);
      return angleA - angleB;
    });
    return picked.map((c) => c.id);
  }

  function updateClusterNav() {
    if (!els.clusterNav) return;
    const nearbyIds = getNearbyStoneIds(selectedId);
    if (nearbyIds.length <= 1) {
      els.clusterNav.hidden = true;
      return;
    }
    const pos = nearbyIds.indexOf(selectedId);
    els.clusterNav.hidden = false;
    els.clusterNavLabel.textContent = `Nearby graves (${pos + 1} of ${nearbyIds.length})`;
  }

  function cycleCluster(delta) {
    const nearbyIds = getNearbyStoneIds(selectedId);
    if (nearbyIds.length <= 1) return;
    let idx = nearbyIds.indexOf(selectedId);
    if (idx < 0) idx = 0;
    idx = (idx + delta + nearbyIds.length) % nearbyIds.length;
    selectStone(nearbyIds[idx], { scrollDetail: false, focusMap: false });
  }

  function drawMap() {
    const w = els.canvas.width;
    const h = els.canvas.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    const fill = 'rgb(255, 235, 0)';
    const visible = stones.filter(stoneVisible);

    for (const stone of visible) {
      const x = toDisplayX(stone);
      const y = toDisplayY(stone);
      const isSelected = stone.id === selectedId;
      let radius = 1.35;
      if (isSelected) radius = 1.75;

      ctx.beginPath();
      ctx.arc(x, y, radius + 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(20, 30, 20, 0.85)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgb(184, 149, 106)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function pickStoneAt(clientX, clientY) {
    const rect = els.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    let bestId = null;
    let bestDist = PICK_RADIUS_PX;
    for (const stone of stones) {
      if (!stoneVisible(stone)) continue;
      const d = Math.hypot(toDisplayX(stone) - x, toDisplayY(stone) - y);
      if (d < bestDist) {
        bestDist = d;
        bestId = stone.id;
      }
    }
    return bestId;
  }

  function onMapPointer(ev) {
    const id = pickStoneAt(ev.clientX, ev.clientY);
    if (id) selectStone(id, { scrollDetail: true });
  }

  els.form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    runSearch();
  });
  els.canvas.addEventListener('click', onMapPointer);
  els.canvas.addEventListener('touchend', (ev) => {
    if (ev.changedTouches.length === 1) {
      const t = ev.changedTouches[0];
      onMapPointer({ clientX: t.clientX, clientY: t.clientY });
    }
  });

  els.photoPrev.addEventListener('click', () => {
    const stone = stoneById.get(selectedId);
    if (!stone || !(stone.photos || []).length) return;
    photoIndex = (photoIndex - 1 + stone.photos.length) % stone.photos.length;
    updatePhotos(stone);
  });

  els.photoNext.addEventListener('click', () => {
    const stone = stoneById.get(selectedId);
    if (!stone || !(stone.photos || []).length) return;
    photoIndex = (photoIndex + 1) % stone.photos.length;
    updatePhotos(stone);
  });

  if (els.clusterPrev) {
    els.clusterPrev.addEventListener('click', () => cycleCluster(-1));
  }
  if (els.clusterNext) {
    els.clusterNext.addEventListener('click', () => cycleCluster(1));
  }

  window.addEventListener('resize', resizeCanvas);
  els.mapImg.addEventListener('load', resizeCanvas);

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error('Could not load grave records.');
      return r.json();
    })
    .then((data) => {
      applyMapMeta(data.map);
      stones = data.stones || [];
      stoneById = new Map(stones.map((s) => [s.id, s]));
      updateResultSummary();
      const paint = () => resizeCanvas();
      if (els.mapImg.complete) {
        requestAnimationFrame(paint);
      } else {
        els.mapImg.addEventListener('load', () => requestAnimationFrame(paint), { once: true });
      }
    })
    .catch(() => {
      els.resultSummary.textContent =
        'Grave records could not be loaded. If you opened this file directly from disk, use a local web server instead.';
    });
})();
