/* 김해공항(PUS) 항공권 · 최적기 대시보드
   순수 바닐라 JS · 외부 요청 없음 */
(function () {
  'use strict';
  var DATA = window.PUS_DATA;
  var ROUTES = DATA.routes;
  var WD = ['일', '월', '화', '수', '목', '금', '토'];

  /* ── 날짜 유틸 ───────────────────────────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromISO(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { var d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); }
  function diffDays(a, b) { return Math.round((fromISO(b) - fromISO(a)) / 86400000); }
  function md(s) { var d = fromISO(s); return (d.getMonth() + 1) + '.' + d.getDate(); }
  function mdwd(s) { var d = fromISO(s); return md(s) + '(' + WD[d.getDay()] + ')'; }
  function full(s) { var d = fromISO(s); return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()); }
  function ymd(s) { return s.replace(/-/g, ''); }
  function yymmdd(s) { return s.slice(2).replace(/-/g, ''); }
  function monthOfISO(s) { return fromISO(s).getMonth() + 1; }

  /* ── 상태 ────────────────────────────────── */
  var today = toISO(new Date());
  function defaultStart() {
    var p = DATA.presets.filter(function (x) { return x.start >= today; })[0];
    if (p) return p.start;
    var d = new Date(); d.setDate(d.getDate() + 14); return toISO(d);
  }
  var state = {
    start: defaultStart(),
    end: null,
    lock: true,
    pax: 2,
    depAfter: 11,
    retBefore: 22,
    region: 'all',
    directOnly: false,
    seasonBest: false,
    sort: 'fit'
  };
  state.end = addDays(state.start, 4);

  /* ── DOM ─────────────────────────────────── */
  var $ = function (s) { return document.querySelector(s); };
  var elStart = $('#startDate'), elEnd = $('#endDate'),
      elLock = $('#lock45'), elNights = $('#nightsLabel'),
      elPax = $('#pax'), elDep = $('#depAfter'), elRet = $('#retBefore'),
      elPresets = $('#presets'), elRegion = $('#regionFilter'),
      elDirect = $('#directOnly'), elSeason = $('#seasonBest'),
      elSort = $('#sortBy'), elCards = $('#routes'), elCount = $('#count'),
      elCond = $('#condLine'), elSeasonTable = $('#seasonTable'),
      elTrips = $('#tripList'), elZero = $('#zeroList'), elHoliday = $('#holidayList'),
      elToday = $('#todayChip');

  /* ── 링크 ────────────────────────────────── */
  function links(r) {
    var s = state.start, e = state.end, a = state.pax;
    var naver = 'https://flight.naver.com/flights/international/PUS-' + r.code + '-' + ymd(s) +
      '/' + r.code + '-PUS-' + ymd(e) + '?adult=' + a + '&child=0&infant=0&fareType=Y';
    var gq = 'Flights from PUS to ' + r.code + ' from ' + s + ' to ' + e + ' for ' + a + ' adults';
    var google = 'https://www.google.com/travel/flights?hl=ko&gl=KR&curr=KRW&q=' + encodeURIComponent(gq);
    var sky = 'https://www.skyscanner.co.kr/transport/flights/pus/' + r.code.toLowerCase() +
      '/' + yymmdd(s) + '/' + yymmdd(e) + '/?adultsv2=' + a + '&cabinclass=economy&rtn=1&preferdirects=' +
      (state.directOnly ? 'true' : 'false');
    return { naver: naver, google: google, sky: sky };
  }

  /* ── 시즌 표기 ────────────────────────────── */
  function scoreClass(v) {
    if (v >= 4.8) return 's5';
    if (v >= 4.5) return 's45';
    if (v >= 4.0) return 's4';
    if (v >= 3.5) return 's35';
    if (v >= 3.0) return 's3';
    if (v >= 2.5) return 's25';
    if (v >= 2.0) return 's2';
    if (v >= 1.7) return 's15';
    return 's1';
  }
  function seasonBadge(r) {
    var m = monthOfISO(state.start), sc = r.score[m - 1];
    var txt = (r.climate[m - 1] || '').replace(/^[^\s가-힣A-Za-z]+\s*/, '').split('/')[0].trim();
    var cls = sc >= 4.5 ? 'badge--season-ok' : (sc >= 3.4 ? 'badge--season-mid' : 'badge--season-bad');
    return '<span class="badge ' + cls + '" title="' + m + '월 기후">' + m + '월 ' + txt + '</span>';
  }
  function fitOf(r) {
    var m = monthOfISO(state.start);
    return r.score[m - 1] + r.fitBase;
  }
  function won(n) { return n ? n.toLocaleString('ko-KR') + '원' : '—'; }
  function hoursText(h) {
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return hh + '시간' + (mm ? ' ' + mm + '분' : '');
  }

  /* ── 카드 ────────────────────────────────── */
  function cardHTML(r) {
    var L = links(r), m = monthOfISO(state.start);
    var directBadge = r.direct
      ? '<span class="badge badge--direct">직항</span>'
      : '<span class="badge badge--via">경유 필요</span>';
    var best = fitOf(r) >= 5.6;
    return '' +
      '<article class="card' + (best ? ' card--best' : '') + '" id="card-' + r.code + '">' +
        '<div class="card__top">' +
          '<div class="card__title">' +
            '<div class="card__name">' + r.name + '<span class="card__code">' + r.code + '</span></div>' +
            '<div class="card__country">' + r.country + ' · ' + r.regionName + '</div>' +
          '</div>' +
          '<div class="card__price"><b>' + (r.price ? won(r.price) : '—') + '</b><span>' +
            (r.price ? '참고 시세' : '시세 미확인') + '</span></div>' +
        '</div>' +
        '<div class="badges">' + directBadge +
          '<span class="badge">' + hoursText(r.hours) + (r.direct ? ' 직항' : ' 최단') + '</span>' +
          seasonBadge(r) +
        '</div>' +
        '<div class="card__meta">' +
          '<span><b>최적기</b> ' + r.best + '</span>' +
          '<span><b>피할 때</b> ' + r.avoid + '</span>' +
        '</div>' +
        '<div class="links">' +
          '<a class="link link--naver" href="' + L.naver + '" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="' + r.name + ' 네이버 항공권 검색 (새 창)">네이버</a>' +
          '<a class="link link--google" href="' + L.google + '" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="' + r.name + ' 구글 플라이트 검색 (새 창)">구글</a>' +
          '<a class="link link--sky" href="' + L.sky + '" target="_blank" rel="noopener noreferrer" ' +
            'aria-label="' + r.name + ' 스카이스캐너 검색 (새 창)">스카이</a>' +
        '</div>' +
        '<details class="card__more">' +
          '<summary>' + r.airlines + ' · ' + mdwd(state.start) + '~' + mdwd(state.end) + ' 조건</summary>' +
          '<p>' + (r.via ? '경유: ' + r.via : '김해(PUS) → ' + r.name + '(' + r.code + ') 직항 ' + hoursText(r.hours)) + '</p>' +
          '<p>' + r.tag + ' · 12개월 적합도는 아래 <b>목적지별 최적기</b> 표 참고</p>' +
          '<div class="mini">' + r.score.map(function (v, i) {
            return '<i class="' + scoreClass(v) + '" title="' + (i + 1) + '월 · ' + (r.climate[i] || '') + '">' + (i + 1) + '</i>';
          }).join('') + '</div>' +
        '</details>' +
      '</article>';
  }

  function visibleRoutes() {
    var m = monthOfISO(state.start);
    var list = ROUTES.filter(function (r) {
      if (state.region !== 'all' && r.region !== state.region) return false;
      if (state.directOnly && !r.direct) return false;
      if (state.seasonBest && r.score[m - 1] < 4.4) return false;
      return true;
    });
    var by = state.sort;
    list.sort(function (a, b) {
      if (by === 'price') return (a.price || 9e9) - (b.price || 9e9);
      if (by === 'hour') return a.hours - b.hours;
      if (by === 'name') return a.name.localeCompare(b.name, 'ko');
      return fitOf(b) - fitOf(a);
    });
    return list;
  }

  function renderCards() {
    var list = visibleRoutes();
    elCount.textContent = list.length;
    elCards.innerHTML = list.length
      ? list.map(cardHTML).join('')
      : '<div class="empty"><b>조건에 맞는 노선이 없습니다</b>권역·직항·시기 필터를 풀어 보세요.</div>';
  }

  /* ── 조건 표시 ────────────────────────────── */
  function renderCond() {
    var nights = diffDays(state.start, state.end);
    elNights.textContent = nights >= 0 ? (nights + '박 ' + (nights + 1) + '일') : '';
    var bits = ['성인 ' + state.pax + '명'];
    bits.push(state.depAfter ? state.depAfter + '시 이후 출발' : '출발시간 무관');
    bits.push(state.retBefore ? state.retBefore + '시 이전 귀국' : '귀국시간 무관');
    elCond.textContent = bits.join(' · ');
    elStart.value = state.start;
    elEnd.value = state.end;
  }

  /* ── 프리셋 ─────────────────────────────── */
  function renderPresets() {
    elPresets.innerHTML = DATA.presets.map(function (p) {
      var on = (p.start === state.start && p.end === state.end);
      return '<button type="button" class="preset" data-start="' + p.start + '" data-end="' + p.end + '" ' +
        'aria-pressed="' + on + '">' +
        '<b>' + p.label + '</b>' +
        '<span>' + md(p.start) + '–' + md(p.end) + ' · 연차 ' + p.leave + '일</span></button>';
    }).join('');
  }

  /* ── 최적기 표 ──────────────────────────── */
  function renderSeasonTable() {
    var m = monthOfISO(state.start);
    var head = '<thead><tr><th>목적지</th>';
    for (var i = 1; i <= 12; i++) head += '<th' + (i === m ? ' class="now"' : '') + '>' + i + '월</th>';
    head += '</tr></thead>';
    var body = '<tbody>';
    DATA.regions.forEach(function (reg) {
      body += '<tr class="regionrow"><th scope="colgroup" colspan="13">' + reg.name + '</th></tr>';
      ROUTES.filter(function (r) { return r.region === reg.key; }).forEach(function (r) {
        body += '<tr><th scope="row">' + r.name + '<small>' + r.code + (r.direct ? ' · 직항' : ' · 경유') + '</small></th>';
        r.score.forEach(function (v, i) {
          body += '<td><div class="cell ' + scoreClass(v) + (i + 1 === m ? ' now' : '') + '" title="' +
            (i + 1) + '월 ' + (r.climate[i] || '') + '">' + v.toFixed(1) + '</div></td>';
        });
        body += '</tr>';
      });
    });
    body += '</tbody>';
    elSeasonTable.innerHTML = head + body;
  }

  /* ── 연휴 추천 ──────────────────────────── */
  function routeBy(code) { return ROUTES.filter(function (r) { return r.code === code; })[0]; }

  function renderTrips() {
    elTrips.innerHTML = DATA.trips.map(function (t) {
      var cities = t.cities.map(function (c, i) {
        var r = routeBy(c.code);
        return '<button type="button" class="trip__city" data-start="' + t.start + '" data-code="' + c.code + '">' +
          '<span class="rank">' + (i + 1) + '</span>' +
          '<span class="nm">' + c.name + '</span>' +
          '<span class="why">' + c.why + ' · ' + (c.direct ? '직항 ' + hoursText(c.hours) : '경유 ' + hoursText(c.hours)) + '</span>' +
          '<span class="go">조회 →</span></button>';
      }).join('');
      var alt = t.alts && t.alts.length
        ? '<div class="trip__alt">다른 출발일: ' + t.alts.map(function (a) {
            return '<button type="button" data-start="' + a.start + '">' + mdwd(a.start) + '~' + mdwd(a.end) + '</button>';
          }).join(' · ') + '</div>'
        : '';
      return '<article class="trip trip--' + t.leave + '">' +
        '<div class="trip__head"><div>' +
          '<div class="trip__when">' + mdwd(t.start) + ' → ' + mdwd(t.end) +
            '<small>' + full(t.start).slice(0, 4) + '년</small></div>' +
          '<div class="trip__name">' + t.cluster + '</div>' +
        '</div><div class="leave"><b>' + t.leave + '일</b><span>연차</span></div></div>' +
        '<div class="trip__cities">' + cities + '</div>' + alt +
        '</article>';
    }).join('');
  }

  function renderZero() {
    elZero.innerHTML = DATA.zeroLeave.map(function (z) {
      return '<button type="button" class="zchip" data-start="' + z.start + '" data-end="' + z.end + '">' +
        z.label + ' <b>' + z.year + '.' + md(z.start) + '–' + md(z.end) + '</b> · ' + z.nights + '박</button>';
    }).join('');
  }

  function renderHolidays() {
    elHoliday.innerHTML = DATA.holidays.map(function (h) {
      var d = fromISO(h.date);
      return '<li class="' + (h.kind === 'sub' ? 'sub' : '') + '"><b>' + (d.getMonth() + 1) + '.' + d.getDate() +
        '(' + WD[d.getDay()] + ')</b><span>' + h.name + '</span></li>';
    }).join('');
  }

  /* ── 이벤트 ─────────────────────────────── */
  function sync() { renderCond(); renderPresets(); renderCards(); renderSeasonTable(); }

  elStart.addEventListener('change', function () {
    if (!this.value) return;
    state.start = this.value;
    if (state.lock) state.end = addDays(state.start, 4);
    else if (state.end < state.start) state.end = addDays(state.start, 4);
    sync();
  });
  elEnd.addEventListener('change', function () {
    if (!this.value) return;
    if (this.value < state.start) this.value = state.start;
    state.end = this.value;
    if (diffDays(state.start, state.end) !== 4) { state.lock = false; elLock.setAttribute('aria-checked', 'false'); }
    sync();
  });
  elLock.addEventListener('click', function () {
    state.lock = !state.lock;
    this.setAttribute('aria-checked', String(state.lock));
    if (state.lock) state.end = addDays(state.start, 4);
    sync();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-shift]'), function (b) {
    b.addEventListener('click', function () {
      var n = Number(this.getAttribute('data-shift'));
      state.start = addDays(state.start, n);
      state.end = state.lock ? addDays(state.start, 4) : addDays(state.end, n);
      sync();
    });
  });
  elPax.addEventListener('change', function () { state.pax = Number(this.value); renderCards(); renderCond(); });
  elDep.addEventListener('change', function () { state.depAfter = Number(this.value); renderCond(); });
  elRet.addEventListener('change', function () { state.retBefore = Number(this.value); renderCond(); });
  elRegion.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-region]');
    if (!b) return;
    state.region = b.getAttribute('data-region');
    Array.prototype.forEach.call(elRegion.querySelectorAll('button'), function (x) {
      x.classList.toggle('on', x === b);
      x.setAttribute('aria-selected', String(x === b));
    });
    renderCards();
  });
  elDirect.addEventListener('change', function () { state.directOnly = this.checked; renderCards(); });
  elSeason.addEventListener('change', function () { state.seasonBest = this.checked; renderCards(); });
  elSort.addEventListener('change', function () { state.sort = this.value; renderCards(); });

  elPresets.addEventListener('click', function (e) {
    var b = e.target.closest('.preset');
    if (!b) return;
    state.start = b.getAttribute('data-start');
    state.end = b.getAttribute('data-end');
    state.lock = diffDays(state.start, state.end) === 4;
    elLock.setAttribute('aria-checked', String(state.lock));
    sync();
    document.getElementById('routes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  elTrips.addEventListener('click', function (e) {
    var b = e.target.closest('[data-start]');
    if (!b) return;
    state.start = b.getAttribute('data-start');
    state.end = b.getAttribute('data-end') || addDays(state.start, 4);
    state.lock = diffDays(state.start, state.end) === 4;
    elLock.setAttribute('aria-checked', String(state.lock));
    if (b.classList.contains('trip__city')) {
      var r = routeBy(b.getAttribute('data-code'));
      state.region = r.region;
      Array.prototype.forEach.call(elRegion.querySelectorAll('button'), function (x) {
        var on = x.getAttribute('data-region') === r.region;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', String(on));
      });
      state.sort = 'fit';
      elSort.value = 'fit';
    }
    sync();
    var target = b.classList.contains('trip__city')
      ? document.getElementById('card-' + b.getAttribute('data-code'))
      : document.getElementById('routes');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('flash');
      setTimeout(function () { target.classList.remove('flash'); }, 1400);
    }
  });

  elZero.addEventListener('click', function (e) {
    var b = e.target.closest('.zchip');
    if (!b) return;
    state.start = b.getAttribute('data-start');
    state.end = b.getAttribute('data-end');
    state.lock = diffDays(state.start, state.end) === 4;
    elLock.setAttribute('aria-checked', String(state.lock));
    sync();
    document.getElementById('routes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ── 초기 렌더 ──────────────────────────── */
  var t = new Date();
  elToday.innerHTML = '<b>' + (t.getMonth() + 1) + '월 ' + t.getDate() + '일 ' + WD[t.getDay()] + '요일</b>' +
    '기준 ' + DATA.generated;
  renderTrips();
  renderZero();
  renderHolidays();
  sync();
})();
