let DESIGNERS = [];

window.addEventListener('DOMContentLoaded', () => {
    fetch('2026_web.csv', {cache:'no-store'})
        .then(response => {
            if (!response.ok) throw new Error('CSV 로드 실패');
            return response.text();
        })
        .then(csvString => {
            Papa.parse(csvString, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    const groupedDesigners = {};

                    results.data.forEach(row => {
                        const krName = row['이름'] || '';
                        if (!groupedDesigners[krName]) {
                            groupedDesigners[krName] = {
                                kr: krName,
                                en: row['영어 이름'] || '',
                                track: row['트랙'] || '',
                                insta: row['인스타'] || '',
                                intro: row['한줄 소개'] || '',
                                profileImg: row['프로필이미지'] || 'images/profiles/none.jpg',
                                works: []
                            };
                        }
                        var imgs = [];
                        var imgKeys = ['작품이미지','작품이미지2','작품이미지3','작품이미지4','작품이미지5','작품이미지6','작품이미지7'];
                        imgKeys.forEach(function(k){ if(row[k] && row[k].trim()) imgs.push(row[k].trim()); });
                        if(imgs.length === 0) imgs.push('images/works/none.jpg');
                        groupedDesigners[krName].works.push({
                            workTitle: row['작품명'] || '',
                            category: row['카테고리'] || '',
                            workImgs: imgs
                        });
                    });

                    // 가나다 순 정렬
                    DESIGNERS = Object.values(groupedDesigners)
                        .sort((a, b) => a.kr.localeCompare(b.kr, 'ko'))
                        .map((designer, index) => ({
                            id: index,
                            ...designer
                        }));

                    renderGrid();
                    renderWorks('all');
                    renderBooth();
                }
            });
        })
        .catch(err => console.error(err));
});

function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-links button').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('designer-detail').classList.remove('active');
  document.getElementById('work-detail').classList.remove('active');
  var pg = document.getElementById('page-' + name);
  var nb = document.getElementById('nav-' + name);
  if(pg) pg.classList.add('active');
  if(nb) nb.classList.add('active');
  // 메인 페이지는 라이트 테마
  document.body.classList.toggle('theme-light', name === 'main');
  window.scrollTo(0,0);
}

// filter: 검색어 (기본값 빈 문자열 = 전체 표시)
function renderGrid(filter) {
  filter = (filter || '').trim();
  var q = filter.toLowerCase();
  var html = '';
  var displayNum = 1;

  for (var i = 0; i < DESIGNERS.length; i++) {
    var d = DESIGNERS[i];
    // 한글 이름 또는 영어 이름으로 필터링
    if (q && !d.kr.includes(filter) && !d.en.toLowerCase().includes(q)) continue;
    html += '<div class="d-card" onclick="openDesigner(' + i + ')">'
      + '<span class="d-num">' + String(displayNum++).padStart(2, '0') + '</span>'
      + '<div class="d-avatar"><img src="' + d.profileImg + '" alt="' + d.kr + '" onerror="this.onerror=null;this.src=\'images/profiles/none.jpg\'"></div>'
      + '<div class="d-kr">' + d.kr + '</div>'
      + '<div class="d-en">' + d.en + '</div>'
      + '</div>';
  }

  if (!html) {
    html = '<p class="no-result">검색 결과가 없습니다.</p>';
  }

  document.getElementById('designer-grid').innerHTML = html;
}

function searchDesigner(value) {
  renderGrid(value);
}

function openDesigner(idx) {
  var d = DESIGNERS[idx];
  if(!d) return;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.getElementById('designer-detail').classList.add('active');
  document.getElementById('work-detail').classList.remove('active');
  var avEl = document.getElementById('dd-av');
  avEl.innerHTML = '<img src="' + d.profileImg + '" alt="' + d.kr + '" onerror="this.onerror=null;this.src=\'images/profiles/none.jpg\'">';
  document.getElementById('dd-kr').textContent = d.kr;
  document.getElementById('dd-en').textContent = d.en;
  document.getElementById('dd-track').textContent = d.track;
  document.getElementById('dd-insta').textContent = d.insta||'—';
  var cats = d.works.map(function(w){ return w.category; }).filter(function(c,i,a){ return a.indexOf(c)===i; }).join(' · ');
  document.getElementById('dd-cat').textContent = cats||'—';
  document.getElementById('dd-intro').textContent = d.intro||'';
  var whtml = '';
  for(var wi=0; wi<d.works.length; wi++){
    var w = d.works[wi];
    whtml += '<div class="work-card" onclick="openWorkDirect('+idx+','+wi+')">'
      +'<div class="work-thumb"><img src="'+w.workImgs[0]+'" alt="'+w.workTitle+'" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'">'
      +'<div class="work-tag">'+w.category+'</div></div>'
      +'<div class="work-info"><div class="work-title">'+w.workTitle+'</div>'
      +'<div class="work-by">'+w.category+' · 2026</div></div>'
      +'</div>';
  }
  document.getElementById('dd-works').innerHTML = whtml;
  window.scrollTo(0,0);
}

function openWorkDirect(dIdx, wIdx) {
  var d = DESIGNERS[dIdx];
  if(!d) return;
  var w = d.works[wIdx]||d.works[0];
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.getElementById('designer-detail').classList.remove('active');
  document.getElementById('work-detail').classList.add('active');
  document.getElementById('wd-title').textContent = w.workTitle;
  document.getElementById('wd-desc').textContent = d.kr+' 디자이너의 졸업 작품입니다. '+(d.intro||'')+' Captcha! 졸업전시를 위해 제작되었습니다.';
  document.getElementById('wd-by').textContent = d.kr+' / '+d.en;
  document.getElementById('wd-cat2').textContent = w.category;
  document.getElementById('wd-dlink').onclick = function(){ openDesigner(dIdx); };
  // 썸네일 (workImgs[0])
  var thumbEl = document.getElementById('wdv-thumb');
  thumbEl.onerror = function(){ this.onerror=null; this.src='images/works/none.jpg'; };
  thumbEl.src = (w.workImgs && w.workImgs[0]) || 'images/works/none.jpg';
  thumbEl.alt = w.workTitle;
  // 갤러리 이미지 (workImgs[1] ~), 없으면 none.jpg
  var galleryImgs = (w.workImgs || []).slice(1);
  if(galleryImgs.length === 0) galleryImgs = ['images/works/none.jpg'];
  var ghtml = '';
  galleryImgs.forEach(function(src, i) {
    ghtml += '<div class="wdv-img-wrap">'
      +'<img src="'+src+'" alt="'+w.workTitle+' '+(i+1)+'" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'">'
      +'</div>';
  });
  document.getElementById('wdv-gallery').innerHTML = ghtml;
  window.scrollTo(0,0);
}

function renderWorks(cat) {
  var html = '';
  for(var i=0; i<DESIGNERS.length; i++){
    var d = DESIGNERS[i];
    for(var wi=0; wi<d.works.length; wi++){
      var w = d.works[wi];
      if(cat!=='all' && w.category!==cat) continue;
      html += '<div class="work-card" onclick="openWorkDirect('+i+','+wi+')">'
        +'<div class="work-thumb"><img src="'+w.workImgs[0]+'" alt="'+w.workTitle+'" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'">'
        +'<div class="work-tag">'+w.category+'</div></div>'
        +'<div class="work-info"><div class="work-title">'+w.workTitle+'</div>'
        +'<div class="work-by">'+d.kr+' · '+d.en.split(' ')[0]+'</div></div>'
        +'</div>';
    }
  }
  document.getElementById('work-grid').innerHTML = html;
}

function filterWork(btn, cat) {
  document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderWorks(cat);
}

function renderBooth() {
  var html = '';
  var n = Math.min(DESIGNERS.length, 48);
  for(var i=0; i<n; i++){
    var d = DESIGNERS[i];
    html += '<div class="booth-cell">'
      +String.fromCharCode(65+Math.floor(i/8))+(i%8+1)
      +'<div class="booth-tooltip">'+d.kr+'</div>'
      +'</div>';
  }
  document.getElementById('booth-map').innerHTML = html;
}


/* ── 캐러셀 ── */
var _carImgs = [];
var _carIdx  = 0;

function initCarousel(imgs, altText) {
  _carImgs = imgs && imgs.length ? imgs : ['images/works/none.jpg'];
  _carIdx  = 0;
  var multi = _carImgs.length > 1;

  // 화살표 표시/숨김
  document.getElementById('wdc-prev').style.display = multi ? 'flex' : 'none';
  document.getElementById('wdc-next').style.display = multi ? 'flex' : 'none';

  // 도트 생성
  var dots = document.getElementById('wdc-dots');
  if(multi) {
    dots.innerHTML = _carImgs.map(function(_, i){
      return '<span class="wdc-dot' + (i===0?' active':'') + '" onclick="carGoTo('+i+')"></span>';
    }).join('');
    dots.style.display = 'flex';
  } else {
    dots.innerHTML = '';
    dots.style.display = 'none';
  }

  _carSetImg(0, altText);
}

function _carSetImg(idx, altText) {
  _carIdx = idx;
  var img = document.getElementById('wd-img');
  img.onerror = function(){ this.onerror=null; this.src='images/works/none.jpg'; };
  img.alt = altText || '';
  img.src = _carImgs[idx];
  // 도트 active
  document.querySelectorAll('.wdc-dot').forEach(function(d,i){ d.classList.toggle('active', i===idx); });
}

function carStep(dir) {
  _carSetImg((_carIdx + dir + _carImgs.length) % _carImgs.length);
}

function carGoTo(idx) {
  _carSetImg(idx);
}

/* ── 포토부스 ── */
var boothStream = null;
var boothPhotos = [];
var boothRunning = false;

/* ── 뷰티 필터 ── */
var _bPrevW = 640, _bPrevH = 360;
var _bTmpC, _bTmpCtx, _bPrevCtx, _bAnimId, _bLUT;

function _buildBeautyLUT(w, h) {
  var lut = new Float32Array(w * h * 2);
  var cx = w / 2, faceCY = h * 0.45;
  // 세로 가우시안: 얼굴 높이 근처에서만 슬리밍, 위아래로 자연스럽게 감쇠
  var slimSigY = h * 0.32, slimStr = 0.025;
  // 가로 가우시안 추가: 프레임 가장자리 수평으로도 감쇠 → 사이드 이동 시 경계 없음
  var slimSigX = w * 0.42;
  var eyeCx = cx, eyeCy = h * 0.38, eyeR = Math.min(w, h) * 0.20, eyeStr = 0.09;
  for (var dy = 0; dy < h; dy++) {
    for (var dx = 0; dx < w; dx++) {
      var dCX = dx - cx;
      // 수직+수평 가우시안으로 워프 강도 결정 → 경계 없는 자연스러운 감쇠
      var gY = Math.exp(-((dy - faceCY) * (dy - faceCY)) / (2 * slimSigY * slimSigY));
      var gX = Math.exp(-(dCX * dCX) / (2 * slimSigX * slimSigX));
      var slimG = gY * gX;
      var sx = cx + dCX * (1 + slimStr * slimG);
      var sy = dy;
      // 눈 확대: cosine 감쇠로 경계 부드럽게
      var edx = sx - eyeCx, edy = sy - eyeCy;
      var ed = Math.sqrt(edx * edx + edy * edy);
      if (ed < eyeR && ed > 0) {
        var cosFade = 0.5 * (1 + Math.cos(Math.PI * ed / eyeR)); // 중심→가장자리 cosine 감쇠
        sx -= edx * eyeStr * cosFade;
        sy -= edy * eyeStr * cosFade;
      }
      var i = (dy * w + dx) * 2;
      lut[i]   = Math.max(0, Math.min(w - 1, sx));
      lut[i+1] = Math.max(0, Math.min(h - 1, sy));
    }
  }
  return lut;
}

function _applyWarp(src, dst, lut, w, h) {
  // 고정 마스크 제거: LUT 자체의 가우시안 감쇠가 경계를 자연스럽게 처리
  for (var i = 0; i < w * h; i++) {
    var di = i * 4;
    var sx = lut[i*2], sy = lut[i*2+1];
    var x0=sx|0, y0=sy|0, x1=Math.min(w-1,x0+1), y1=Math.min(h-1,y0+1);
    var fx=sx-x0, fy=sy-y0;
    var i00=(y0*w+x0)*4,i10=(y0*w+x1)*4,i01=(y1*w+x0)*4,i11=(y1*w+x1)*4;
    for (var c=0;c<3;c++) {
      dst[di+c]=(src[i00+c]*(1-fx)*(1-fy)+src[i10+c]*fx*(1-fy)+
                 src[i01+c]*(1-fx)*fy+src[i11+c]*fx*fy)|0;
    }
    dst[di+3]=255;
  }
}

function _boothLoop() {
  var video = document.getElementById('booth-video');
  if (boothStream && video.readyState >= 2) {
    var w = _bPrevW, h = _bPrevH;
    var vw = video.videoWidth || w, vh = video.videoHeight || h;
    var tRatio = w / h, sRatio = vw / vh;
    var sx, sy, sw, sh;
    if (sRatio > tRatio) { sh = vh; sw = Math.round(vh * tRatio); sx = Math.round((vw-sw)/2); sy = 0; }
    else                 { sw = vw; sh = Math.round(vw / tRatio); sx = 0; sy = Math.round((vh-sh)/2); }
    _bTmpCtx.save();
    _bTmpCtx.translate(w, 0); _bTmpCtx.scale(-1, 1);
    _bTmpCtx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    _bTmpCtx.restore();
    var src = _bTmpCtx.getImageData(0, 0, w, h);
    var dst = new ImageData(w, h);
    _applyWarp(src.data, dst.data, _bLUT, w, h);
    _bPrevCtx.putImageData(dst, 0, 0);
  }
  _bAnimId = requestAnimationFrame(_boothLoop);
}

function _boothStartBeauty() {
  var w = _bPrevW, h = _bPrevH;
  _bTmpC = document.createElement('canvas');
  _bTmpC.width = w; _bTmpC.height = h;
  _bTmpCtx = _bTmpC.getContext('2d', { willReadFrequently: true });
  var prev = document.getElementById('booth-preview');
  prev.width = w; prev.height = h;
  _bPrevCtx = prev.getContext('2d');
  _bLUT = _buildBeautyLUT(w, h);
  if (_bAnimId) cancelAnimationFrame(_bAnimId);
  _boothLoop();
}

function boothInitCam() {
  if (boothStream) return Promise.resolve();
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(function(stream) {
      boothStream = stream;
      document.getElementById('booth-video').srcObject = stream;
      _boothStartBeauty();
    });
}

/* ── 포토부스 상수: 1열 세로 스트립, 16:9 가로형 프레임 ── */
var OUT_FRAME_W = 960, OUT_FRAME_H = 540; // 16:9 landscape
var OUT_PAD = 28, OUT_GAP = 10, OUT_FOOTER = 64;
var OUT_W = OUT_PAD + OUT_FRAME_W + OUT_PAD;
var OUT_H = OUT_PAD + (OUT_FRAME_H + OUT_GAP) * 4 - OUT_GAP + OUT_FOOTER + OUT_PAD;

var _bubblePos = { x: 14, y: null };

function boothUpdateBubble() {
  var msg = document.getElementById('booth-msg-input').value.trim();
  var overlay  = document.getElementById('booth-bubble-overlay');
  var bubbleEl = document.getElementById('booth-bubble-text');
  var liveWrap = document.getElementById('booth-bubble-live-wrap');
  var liveEl   = document.getElementById('booth-bubble-live');
  var dragHint = document.getElementById('booth-msg-hint-drag');

  // 왼쪽 라이브 미리보기: 항상 표시 (사진 없어도)
  if (msg) {
    if (liveEl) liveEl.textContent = msg;
    if (liveWrap) liveWrap.style.display = 'block';
  } else {
    if (liveWrap) liveWrap.style.display = 'none';
  }

  // 오른쪽 스트립 말풍선: 사진 4장 있을 때만
  if (msg && boothPhotos.length === 4) {
    bubbleEl.textContent = msg;
    overlay.style.display = 'block';
    if (dragHint) dragHint.style.display = 'block';
    if (_bubblePos.y === null) {
      var wrap = document.querySelector('.booth-strip-wrap');
      var wh = wrap ? wrap.offsetHeight : 600;
      _bubblePos.y = Math.round(wh * 0.6);
    }
    bubbleEl.style.left = _bubblePos.x + 'px';
    bubbleEl.style.top  = _bubblePos.y + 'px';
  } else {
    overlay.style.display = 'none';
    if (dragHint) dragHint.style.display = 'none';
  }
}

/* ── 드래그 ── */
(function() {
  var dragging = false, startX, startY, origX, origY;

  function getEl() { return document.getElementById('booth-bubble-text'); }

  function onDown(e) {
    var el = getEl();
    if (!el) return;
    dragging = true;
    el.classList.add('dragging');
    var touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    origX = _bubblePos.x;
    origY = _bubblePos.y || 0;
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    var touch = e.touches ? e.touches[0] : e;
    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;
    var el = getEl();
    if (!el) return;
    var wrap = el.parentElement; // overlay
    var maxX = wrap.offsetWidth  - el.offsetWidth;
    var maxY = wrap.offsetHeight - el.offsetHeight - 10; // 꼬리 여유
    _bubblePos.x = Math.max(0, Math.min(maxX, origX + dx));
    _bubblePos.y = Math.max(0, Math.min(maxY, origY + dy));
    el.style.left = _bubblePos.x + 'px';
    el.style.top  = _bubblePos.y + 'px';
    e.preventDefault();
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    var el = getEl();
    if (el) el.classList.remove('dragging');
  }

  document.addEventListener('mousedown', function(e) {
    if (e.target && e.target.id === 'booth-bubble-text') onDown(e);
  });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchstart', function(e) {
    if (e.target && e.target.id === 'booth-bubble-text') onDown(e);
  }, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);
})();

function boothStart() {
  if (boothRunning) return;
  boothInitCam().then(function() {
    boothRunning = true;
    boothPhotos = [];
    var btn  = document.getElementById('booth-start-btn');
    var hint = document.getElementById('booth-hint');
    btn.disabled = true;
    document.getElementById('booth-qr-btn').disabled = true;
    document.getElementById('booth-bubble-overlay').style.display = 'none';
    _bubblePos = { x: 14, y: null };
    for (var i = 0; i < 4; i++) {
      var f = document.getElementById('booth-frame-' + i);
      f.innerHTML = '<span class="booth-frame-num">' + (i + 1) + '</span>';
    }
    boothShootSequence(0, btn, hint);
  }).catch(function() {
    alert('카메라 접근 권한이 필요합니다.');
  });
}

function boothShootSequence(shotIdx, btn, hint) {
  if (shotIdx >= 4) {
    boothRunning = false;
    btn.disabled = false;
    hint.textContent = '다시 촬영하려면 버튼을 누르세요';
    document.getElementById('booth-qr-btn').disabled = false;
    boothUpdateBubble();
    return;
  }
  hint.textContent = (shotIdx + 1) + ' / 4 촬영 중...';
  boothCountdown(3, function() {
    boothCapture(shotIdx);
    setTimeout(function() { boothShootSequence(shotIdx + 1, btn, hint); }, 600);
  });
}

function boothCountdown(sec, cb) {
  var el = document.getElementById('booth-countdown');
  if (sec <= 0) { el.textContent = ''; el.classList.remove('show'); cb(); return; }
  el.textContent = sec;
  el.classList.add('show');
  setTimeout(function() { boothCountdown(sec - 1, cb); }, 1000);
}

function boothCapture(idx) {
  var video = document.getElementById('booth-video');
  var vw = video.videoWidth  || 1280;
  var vh = video.videoHeight || 720;
  var targetRatio = 16 / 9;
  var srcRatio = vw / vh;
  var srcX, srcY, srcW, srcH;
  if (srcRatio > targetRatio) {
    srcH = vh; srcW = Math.round(vh * targetRatio);
    srcX = Math.round((vw - srcW) / 2); srcY = 0;
  } else {
    srcW = vw; srcH = Math.round(vw / targetRatio);
    srcX = 0; srcY = Math.round((vh - srcH) / 2);
  }
  // 캡처 해상도 (OUT_FRAME_W x OUT_FRAME_H)
  var cW = OUT_FRAME_W, cH = OUT_FRAME_H;
  var tmpC = document.createElement('canvas');
  tmpC.width = cW; tmpC.height = cH;
  var tmpCtx = tmpC.getContext('2d', { willReadFrequently: true });
  tmpCtx.save();
  tmpCtx.translate(cW, 0); tmpCtx.scale(-1, 1);
  tmpCtx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, cW, cH);
  tmpCtx.restore();
  // 뷰티 워프 적용
  var capLUT = _buildBeautyLUT(cW, cH);
  var src = tmpCtx.getImageData(0, 0, cW, cH);
  var dst = new ImageData(cW, cH);
  _applyWarp(src.data, dst.data, capLUT, cW, cH);
  // 피부 보정: 워프 결과 + 살짝 블러 블렌드
  var canvas = document.createElement('canvas');
  canvas.width = cW; canvas.height = cH;
  var ctx = canvas.getContext('2d');
  var warpC = document.createElement('canvas');
  warpC.width = cW; warpC.height = cH;
  warpC.getContext('2d').putImageData(dst, 0, 0);
  ctx.drawImage(warpC, 0, 0);           // 선명한 레이어 100%
  ctx.filter = 'blur(1.2px) contrast(1.07)';
  ctx.globalAlpha = 0.28;
  ctx.drawImage(warpC, 0, 0);           // 블러 레이어 28% (피부 부드럽게)
  ctx.globalAlpha = 1; ctx.filter = 'none';
  var dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  boothPhotos[idx] = dataUrl;
  var frame = document.getElementById('booth-frame-' + idx);
  frame.innerHTML = '<img src="' + dataUrl + '" alt="photo ' + (idx + 1) + '">';
}

function boothDrawBubble(ctx, msg, x, y, s) {
  if (!msg) return;
  var fontSize = 13 * s;
  var padX = 14 * s, padY = 10 * s;
  var radius = 14 * s;
  var tailSize = 8 * s;
  ctx.font = '600 ' + fontSize + 'px -apple-system, sans-serif';
  // 줄바꿈 처리
  var maxW = 200 * s;
  var words = msg.split('');
  var lines = [], line = '';
  for (var i = 0; i < words.length; i++) {
    var test = line + words[i];
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
    else { line = test; }
  }
  if (line) lines.push(line);
  var lineH = fontSize * 1.5;
  var bw = 0;
  lines.forEach(function(l) { bw = Math.max(bw, ctx.measureText(l).width); });
  bw += padX * 2;
  var bh = lineH * lines.length + padY * 2;
  // 말풍선 배경
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + bw - radius, y);
  ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
  ctx.lineTo(x + bw, y + bh - radius);
  ctx.quadraticCurveTo(x + bw, y + bh, x + bw - radius, y + bh);
  ctx.lineTo(x + radius * 2 + tailSize, y + bh);
  // 꼬리 (왼쪽 아래)
  ctx.lineTo(x + radius, y + bh + tailSize);
  ctx.lineTo(x + radius, y + bh);
  ctx.lineTo(x + radius, y + bh);
  ctx.quadraticCurveTo(x, y + bh, x, y + bh - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 12 * s;
  ctx.shadowOffsetY = 4 * s;
  ctx.fill();
  ctx.restore();
  // 텍스트
  ctx.fillStyle = '#111111';
  ctx.font = '600 ' + fontSize + 'px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  lines.forEach(function(l, li) {
    ctx.fillText(l, x + padX, y + padY + fontSize + li * lineH);
  });
}

function boothBuildCanvas(cb) {
  var fW = OUT_FRAME_W, fH = OUT_FRAME_H;
  var pad = OUT_PAD, gap = OUT_GAP, foot = OUT_FOOTER;
  var totalW = OUT_W, totalH = OUT_H;
  // 1열 세로 스트립
  var positions = [
    { x: pad, y: pad },
    { x: pad, y: pad + (fH + gap) },
    { x: pad, y: pad + (fH + gap) * 2 },
    { x: pad, y: pad + (fH + gap) * 3 }
  ];
  var canvas = document.getElementById('booth-canvas');
  canvas.width  = totalW;
  canvas.height = totalH;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, totalW, totalH);
  var loaded = 0;
  boothPhotos.forEach(function(src, i) {
    var img = new Image();
    img.onload = function() {
      var pos = positions[i];
      ctx.drawImage(img, pos.x, pos.y, fW, fH);
      loaded++;
      if (loaded === 4) {
        ctx.fillStyle = '#888';
        ctx.font = '700 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Captcha! — 2026 SNUT', totalW / 2, totalH - 24);
        var msg = (document.getElementById('booth-msg-input').value || '').trim();
        if (msg && _bubblePos.y !== null) {
          var previewWrap = document.querySelector('.booth-strip-wrap');
          var previewW = previewWrap ? previewWrap.offsetWidth  : 200;
          var previewH = previewWrap ? previewWrap.offsetHeight : 200;
          var scaleX = totalW / previewW;
          var scaleY = totalH / previewH;
          boothDrawBubble(ctx, msg, _bubblePos.x * scaleX, _bubblePos.y * scaleY, totalW / 800);
        }
        cb(canvas);
      }
    };
    img.src = src;
  });
}

function boothShowQR() {
  if (boothPhotos.length < 4) return;
  var qrBtn = document.getElementById('booth-qr-btn');
  qrBtn.disabled = true;
  qrBtn.textContent = '업로드 중...';
  boothBuildCanvas(function(canvas) {
    canvas.toBlob(function(blob) {
      var form = new FormData();
      form.append('file', blob, 'photobooth_2026_snut.jpg');
      // file.io: CORS 지원, 10분 만료
      fetch('https://file.io/?expires=10m', { method: 'POST', body: form })
        .then(function(r) { return r.json(); })
        .then(function(json) {
          if (!json.success || !json.link) throw new Error('link 없음');
          boothOpenQRModal(json.link);
        })
        .catch(function(err) {
          console.error('file.io 실패, tmpfiles 시도:', err);
          var form2 = new FormData();
          form2.append('file', blob, 'photobooth_2026_snut.jpg');
          return fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form2 })
            .then(function(r) { return r.json(); })
            .then(function(json) {
              var url = json.data && json.data.url;
              if (!url) throw new Error('url 없음');
              boothOpenQRModal(url.replace('tmpfiles.org/', 'tmpfiles.org/dl/'));
            });
        })
        .catch(function() {
          alert('업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
        })
        .finally(function() {
          qrBtn.disabled = false;
          qrBtn.textContent = '↗ QR로 받기 — Save';
        });
    }, 'image/jpeg', 0.95);
  });
}

function boothOpenQRModal(url) {
  var qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=' + encodeURIComponent(url);
  document.getElementById('booth-qr-img').src = qrImgUrl;
  document.getElementById('booth-qr-link').href = url;
  document.getElementById('booth-qr-modal').classList.add('show');
}

function boothCloseQR() {
  document.getElementById('booth-qr-modal').classList.remove('show');
}
