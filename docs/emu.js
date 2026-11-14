// CramBoy — frontend for desmume-wasm.
// Globals shared with kr/ui.js: Module, screenCanvas, emuIsRunning, emuIsGameLoaded, uiCurrentMode.
'use strict';

var Module = { print: function (s) { console.log(s); }, printErr: function (s) { console.warn(s); } };
var screenCanvas = [document.getElementById('top'), document.getElementById('bottom')];
var emuIsRunning = false, emuIsGameLoaded = false, uiCurrentMode = 'home';

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = { right: 0, left: 1, down: 2, up: 3, select: 4, start: 5, b: 6, a: 7, y: 8, x: 9, l: 10, r: 11 };
  var FRAME_MS = 1000 / 60;

  var ready = false, gameID = '', gameTitle = '', gameBanner = '', romSize = 0;
  var ctx2d = screenCanvas.map(function (c) { return c.getContext('2d', { alpha: false }); });
  var touchKeys = 0, keyboardKeys = 0, touchDown = 0, touchX = 0, touchY = 0;
  var fastForward = false, frameNo = 0, lastT = 0, acc = 0;
  var prevSaveFlag = 0, saveDirty = false;
  // ctlOpacity: how see-through the floating controls are (portrait; landscape is 15 points stronger).
  var settings = { sound: true, controls: 'floating', resume: false, ctlOpacity: 0.45 };

  var TAGLINE = '';   // no slogan; the line only shows status messages
  // ---------- startup ----------
  window.wasmReady = function () {
    ready = true;
    $('status').textContent = TAGLINE;
    $('btn-open').disabled = false;
    loadLibrary().then(renderLibrary).catch(function () {});
  };
  KV.get('settings').then(function (s) { if (s) { settings.sound = s.sound !== false; settings.controls = 'floating'; /* the Below layout was removed */ settings.resume = s.resume === true; if (s.ctlOpacity >= 0.15 && s.ctlOpacity <= 1) settings.ctlOpacity = s.ctlOpacity; } }).catch(function () {});

  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = window.navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  if (isIOS && !standalone) $('ios-hint').hidden = false;
  var APP_VERSION = '0.6.6';   // semantic version; keep in sync with sw.js
  $('ver').textContent = 'Version ' + APP_VERSION;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      reg.update().catch(function () {});
      // Check again whenever the app comes back to the foreground.
      document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
    }).catch(function () {});
    // A new version finished installing: reload right away on the start screen, otherwise offer it.
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }
      if (uiCurrentMode !== 'player') location.reload();
      else toast('Update ready: Menu → Close game to apply', { icon: 'info', ms: 6000 });
    });
  }

  $('btn-open').onclick = function () { unlockAudio(); $('file-rom').click(); };
  $('file-rom').onchange = function () {
    var f = this.files[0]; this.value = '';
    if (!f) return;
    readHeader(f).then(function (h) {
      // Check before storing, so a wrong file never ends up in the library.
      if (h.error) { $('status').textContent = TAGLINE; alert(h.error); return; }
      loader(0, h.banner || h.title || f.name, h.icon || null); $('loader-pct').textContent = 'Storing on this device…';
      return addToLibrary(f, h).then(function (entry) {
        startGame(f, f.name, entry && entry.id);
      });
    });
  };

  // ---------- game library ----------
  // KV 'library': [{id, name, title, size, icon, played}], ROM data in KV 'rom:<id>'.
  var library = [];
  function loadLibrary() {
    return KV.get('library').then(function (lib) {
      library = Array.isArray(lib) ? lib : [];
      // Older versions kept a single game under 'rom'.
      return KV.get('rom').then(function (old) {
        if (!old || !old.blob) return;
        return readHeader(old.blob).then(function (h) {
          if (!h.error) return addToLibrary(old.blob, h, old.name);
        }).then(function () { return KV.del('rom'); });
      });
    }).then(function () { return library; });
  }
  function saveLibrary() { return KV.set('library', library); }
  function addToLibrary(blob, h, name) {
    var id = h.id.trim() + '-' + blob.size;
    library = library.filter(function (e) { return e.id !== id; });
    var entry = { id: id, name: name || blob.name || h.title, title: h.banner || h.title, size: blob.size, icon: h.icon, played: Date.now() };
    library.unshift(entry);
    return KV.set('rom:' + id, blob).then(saveLibrary).then(function () { renderLibrary(); return entry; }, function () {
      library = library.filter(function (e) { return e.id !== id; });
      alert('There wasn\'t enough storage to keep this game in your list. It will still play now, but you\'ll need to open the file again next time.');
      return null;
    });
  }
  function removeFromLibrary(id) {
    library = library.filter(function (e) { return e.id !== id; });
    return KV.del('rom:' + id).then(saveLibrary).then(renderLibrary);
  }
  // Remove with a short "Undo" window; the ROM data is kept in memory until then.
  function removeWithUndo(e) {
    KV.get('rom:' + e.id).then(function (blob) {
      removeFromLibrary(e.id);
      toast('Removed ' + e.title, { icon: 'trash', ms: 5000, action: 'Undo', onAction: function () {
        if (!blob) return;
        library.push(e);
        KV.set('rom:' + e.id, blob).then(saveLibrary).then(renderLibrary).catch(function () {});
      } });
    });
  }
  function playFromLibrary(id) {
    KV.get('rom:' + id).then(function (blob) {
      if (!blob) { alert('This game\'s file is missing. Please add it again.'); return removeFromLibrary(id); }
      var e = library.filter(function (x) { return x.id === id; })[0];
      startGame(blob, e ? e.name : '', id);
    });
  }
  function ago(t) {
    var d = Math.floor((Date.now() - t) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? d + ' days ago' : new Date(t).toLocaleDateString();
  }
  function sizeText(n) { return n >= 1048576 ? Math.round(n / 1048576) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  var RECENT = 3;
  function renderLibrary() {
    library.sort(function (a, b) { return b.played - a.played; });
    var recent = $('recent'), all = $('all-list');
    recent.innerHTML = ''; all.innerHTML = '';
    library.slice(0, RECENT).forEach(function (e) { recent.appendChild(gameRow(e)); });
    if (library.length > RECENT) {
      var more = document.createElement('button');
      more.className = 'all-cell flex w-full items-center gap-2 px-4 py-3.5 text-left active:bg-zinc-50 dark:active:bg-zinc-800';
      more.innerHTML = '<span class="flex-1">All Games</span>' +
        '<span class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">' + library.length + '</span>' + HI('chevron-right', 'size-5 shrink-0 text-zinc-300 dark:text-zinc-600');
      more.onclick = openAllGames;
      recent.appendChild(more);
    }
    library.forEach(function (e) { all.appendChild(gameRow(e)); });
    var has = library.length > 0;
    $('recent').hidden = $('recent-h').hidden = $('recent-f').hidden = !has;
    if (!all.children.length && !$('page-all').hidden) closeAllGames();
  }

  function gameRow(e) {
    // Hook classes (swipe, swipe-del, cell) drive the swipe behaviour; the rest is Tailwind styling.
    var wrap = document.createElement('div'); wrap.className = 'swipe relative overflow-hidden bg-white dark:bg-zinc-900';
    var del = document.createElement('button');
    del.className = 'swipe-del absolute inset-y-0 right-0 w-full bg-red-500 pr-5 text-right font-medium text-white';
    del.textContent = 'Remove';
    var cell = document.createElement('div');
    cell.className = 'cell relative flex items-center gap-3 bg-white px-4 py-3 active:bg-zinc-50 dark:bg-zinc-900 dark:active:bg-zinc-800';
    // The DS icon keeps square corners inside a rounded tile, so no pixels get cut off
    var tile = 'grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100 ring-1 ring-inset ring-zinc-900/5 dark:bg-zinc-800 dark:ring-white/10';
    cell.innerHTML = (e.icon ? '<span class="' + tile + '"><img class="size-9 [image-rendering:pixelated]" alt="" src="' + e.icon + '"></span>'
                             : '<span class="' + tile + ' text-xs font-medium text-zinc-400 dark:text-zinc-500">DS</span>') +
      '<div class="min-w-0 flex-1"><p class="g-title truncate font-semibold"></p><p class="g-sub truncate text-sm text-zinc-500 dark:text-zinc-400"></p></div>' + HI('chevron-right', 'size-5 shrink-0 text-zinc-300 dark:text-zinc-600');
    cell.querySelector('.g-title').textContent = e.title;
    cell.querySelector('.g-sub').textContent = 'Played ' + ago(e.played) + ' · ' + sizeText(e.size);
    wrap.appendChild(del); wrap.appendChild(cell);
    attachSwipe(wrap, cell, function () { unlockAudio(); playFromLibrary(e.id); }, function () { removeWithUndo(e); });
    del.onclick = function () { collapse(wrap, function () { removeWithUndo(e); }); };
    return wrap;
  }

  // iOS-style swipe: drag left to reveal "Remove"; release past the middle removes it.
  var openSwipe = null, REVEAL = 96;
  function setX(wrap, cell, x, animate) {
    wrap.classList.toggle('anim', !!animate);
    cell.style.transform = x ? 'translateX(' + x + 'px)' : '';
    wrap._x = x;
    if (x) wrap.classList.add('open');
    else setTimeout(function () { if (!wrap._x) wrap.classList.remove('open'); }, animate ? 270 : 0);
  }
  function closeOpenSwipe(except) {
    if (openSwipe && openSwipe !== except) { setX(openSwipe, openSwipe.lastChild, 0, true); openSwipe = null; }
  }
  function collapse(wrap, done) {
    var h = wrap.offsetHeight; wrap.style.height = h + 'px';
    setX(wrap, wrap.lastChild, -wrap.offsetWidth, true);
    setTimeout(function () { wrap.classList.add('removing'); wrap.style.height = '0px'; wrap.style.opacity = 0; }, 180);
    setTimeout(done, 430);
    openSwipe = null;
  }
  function attachSwipe(wrap, cell, onTap, onRemove) {
    var x0 = 0, y0 = 0, start = 0, drag = false, moved = false, id = null;
    wrap._x = 0;
    cell.addEventListener('pointerdown', function (ev) {
      id = ev.pointerId; x0 = ev.clientX; y0 = ev.clientY; start = wrap._x || 0; drag = false; moved = false;
      closeOpenSwipe(wrap);
    });
    cell.addEventListener('pointermove', function (ev) {
      if (ev.pointerId !== id) return;
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!drag) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { drag = true; cell.setPointerCapture(id); }
        else if (Math.abs(dy) > 8) { id = null; return; }   // vertical: let the page scroll
        else return;
      }
      moved = true;
      var x = Math.min(0, start + dx);
      if (x > 0) x = 0;
      setX(wrap, cell, x, false);
    });
    function end(ev) {
      if (ev.pointerId !== id) return;
      id = null;
      if (!drag) return;
      var x = wrap._x || 0, w = wrap.offsetWidth;
      if (x < -w * 0.55) collapse(wrap, onRemove);
      else if (x < -REVEAL / 2) { setX(wrap, cell, -REVEAL, true); openSwipe = wrap; }
      else { setX(wrap, cell, 0, true); if (openSwipe === wrap) openSwipe = null; }
    }
    cell.addEventListener('pointerup', end);
    cell.addEventListener('pointercancel', end);
    cell.addEventListener('click', function () {
      if (moved) { moved = false; return; }
      if ((wrap._x || 0) !== 0) { setX(wrap, cell, 0, true); openSwipe = null; return; }
      onTap();
    });
  }
  document.addEventListener('pointerdown', function (ev) {
    if (openSwipe && !openSwipe.contains(ev.target)) closeOpenSwipe();
  });

  // All Games page (slides in from the right)
  function openAllGames() {
    var pg = $('page-all'); pg.hidden = false; pg.classList.add('off');
    requestAnimationFrame(function () { requestAnimationFrame(function () { pg.classList.remove('off'); }); });
  }
  function closeAllGames() {
    var pg = $('page-all'); pg.classList.add('off');
    setTimeout(function () { pg.hidden = true; }, 300);
  }
  $('nav-back').onclick = closeAllGames;

  function readHeader(blob) {
    return blob.slice(0, 0x200).arrayBuffer().then(function (ab) {
      var u8 = new Uint8Array(ab), id = '', title = '';
      for (var i = 0; i < 0x10; i++) id += u8[i] ? String.fromCharCode(u8[i]) : ' ';
      title = id.slice(0, 12).trim();
      var h = { id: id, title: title, code: id.slice(12, 16), error: checkRom(u8, blob) };
      if (h.error) return h;
      var bannerOff = u8[0x68] | (u8[0x69] << 8) | (u8[0x6A] << 16) | (u8[0x6B] << 24);
      if (!bannerOff || bannerOff + 0xA40 > blob.size) return h;
      return blob.slice(bannerOff, bannerOff + 0xA40).arrayBuffer().then(function (bb) {
        try { readBanner(new Uint8Array(bb), h); } catch (e) {}
        return h;
      });
    });
  }

  // The banner holds the game's 32x32 icon and its title in several languages.
  function readBanner(b, h) {
    var ver = b[0] | (b[1] << 8);
    function str(off) {
      var s = ''; for (var i = 0; i < 0x80; i++) { var c = b[off + i * 2] | (b[off + i * 2 + 1] << 8); if (!c) break; s += String.fromCharCode(c); }
      return s;
    }
    var t = (ver >= 3 && str(0x940).trim()) || str(0x340).trim();   // Korean title if present, else English
    if (t) { var lines = t.split('\n'); h.banner = (lines.length > 1 ? lines.slice(0, -1) : lines).join(' ').trim(); }
    var pal = [];
    for (var p = 0; p < 16; p++) {
      var c = b[0x220 + p * 2] | (b[0x221 + p * 2] << 8);
      pal.push([(c & 31) * 255 / 31, ((c >> 5) & 31) * 255 / 31, ((c >> 10) & 31) * 255 / 31]);
    }
    var cv = document.createElement('canvas'); cv.width = cv.height = 32;
    var g = cv.getContext('2d'), img = g.createImageData(32, 32);
    for (var ty = 0; ty < 4; ty++) for (var tx = 0; tx < 4; tx++) for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      var byte = b[0x20 + (ty * 4 + tx) * 32 + y * 4 + (x >> 1)], ix = (x & 1) ? byte >> 4 : byte & 15;
      var o = ((ty * 8 + y) * 32 + tx * 8 + x) * 4, col = pal[ix];
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = ix ? 255 : 0;
    }
    g.putImageData(img, 0, 0);
    h.icon = cv.toDataURL('image/png');
  }

  // Returns a message if this isn't a DS game file, else null.
  function checkRom(u8, blob) {
    var unpack = ' Unpack it first and pick the .nds file inside.\n\n' +
      'A .zip unpacks by tapping it in the Files app. A .rar needs an unpacking app (e.g. iZip).';
    if (u8[0] === 0x50 && u8[1] === 0x4B) return 'This is a ZIP archive, not a DS game.' + unpack;
    if (u8[0] === 0x52 && u8[1] === 0x61 && u8[2] === 0x72 && u8[3] === 0x21) return 'This is a RAR archive, not a DS game.' + unpack;
    if (u8[0] === 0x37 && u8[1] === 0x7A && u8[2] === 0xBC && u8[3] === 0xAF) return 'This is a 7z archive, not a DS game.' + unpack;
    // Every DS game header has the checksum of the Nintendo logo (0xCF56) at 0x15C.
    var logoOk = u8.length >= 0x160 && (u8[0x15C] | (u8[0x15D] << 8)) === 0xCF56;
    if (!logoOk || blob.size < 0x8000) {
      return 'This doesn\'t look like a Nintendo DS game (.nds), so it wasn\'t loaded.' +
        (blob.name ? '\n\nFile: ' + blob.name : '');
    }
    return null;
  }

  // ---------- load ----------
  // DS firmware languages: 0 Japanese, 1 English, 2 French, 3 German, 4 Italian, 5 Spanish.
  var FW_LANG = { J: 0, E: 1, P: 1, K: 1, F: 2, D: 3, I: 4, S: 5 }, gameRegion = '';
  function startGame(blob, name, libId, retried) {
    unlockAudio();
    if (!ready) return;
    if ($('loader').hidden) loader(0, name, null);
    readHeader(blob).then(function (h) {
      if (h.error) {
        loader(false);
        if (libId) removeFromLibrary(libId);
        alert(h.error + '\n\nPlease open your game again with "Open ROM file…".');
        throw 'not a game';
      }
      gameID = h.code[0] === '#' ? name : h.id;
      gameTitle = h.title; gameBanner = h.banner || '';
      gameRegion = (h.code || '').charAt(3);
      loader(0, h.banner || h.title || name, h.icon);
      if (libId) {
        library.forEach(function (e) { if (e.id === libId) e.played = Date.now(); });
        saveLibrary().catch(function () {});
      }
      var size = romSize = blob.size;
      var ptr = Module._prepareRomBuffer(size);
      var CH = 4 << 20, pos = 0;
      function next() {
        if (pos >= size) return Promise.resolve();
        return blob.slice(pos, pos + CH).arrayBuffer().then(function (ab) {
          Module.HEAPU8.set(new Uint8Array(ab), ptr + pos);
          pos += CH;
          loader(Math.min(100, Math.round(pos / size * 100)));
          return next();
        });
      }
      return next();
    }).then(function () { return KV.get('sav-' + gameID).catch(function () { return null; }); })
      .then(function (sav) {
        // Get the pointer first: making room for the save can grow the emulator's memory, which
        // replaces Module.HEAPU8 (writing to the old view throws "ArrayBuffer has been detached").
        if (sav && sav.length) { var sp = Module._savGetPointer(sav.length); Module.HEAPU8.set(sav, sp); }
        Module._savUpdateChangeFlag();
        // The DS's own language follows the game's region letter (last letter of the game code):
        // multi-language European games pick their language from it. Korean games ignore it.
        Module._emuSetOpt(0, FW_LANG[gameRegion] !== undefined ? FW_LANG[gameRegion] : 1);
        // The study overlay reads Japanese for Japanese games and Korean otherwise.
        if (window.KRSetLang) KRSetLang(gameRegion === 'J' ? 'ja' : 'ko');
        if (window.KRSetGame) KRSetGame(gameID, gameBanner || gameTitle);
        var ret = Module._loadROM(romSize);
        if (ret !== 0) {
          loader(false);
          alert(ret === -1001 ? 'This ROM is encrypted. Please use a decrypted (normal) dump.' : 'Could not load this ROM (error ' + ret + ').');
          return;
        }
        emuIsGameLoaded = true;
        return offerResume().then(function (how) {
          if (how === 'cancel') { emuIsGameLoaded = false; gameID = ''; loader(false); return; }
          showPlayer(); loader(false);
        });
      }).catch(function (e) {
        if (e === 'not a game') { loader(false); return; }
        lastLoadError = String(e && e.stack || e).split('\n').slice(0, 3).join(' | ');
        console.warn('load failed', e);
        // Safari sometimes fails the first load of a big game when the emulator's memory grows
        // ("ArrayBuffer has been detached"); a second attempt works, so retry once by itself.
        if (!retried && /detached|out-of-bounds/i.test(String(e))) { startGame(blob, name, libId, true); return; }
        loader(false);
        $('status').textContent = 'Failed: ' + e;
      });
  }
  var lastLoadError = '';

  // Floating loading card: loader(percent, title, icon) shows/updates it, loader(false) hides it.
  function loader(pct, title, icon) {
    var box = $('loader');
    if (pct === false) { box.hidden = true; return; }
    box.hidden = false;
    if (title !== undefined) $('loader-title').textContent = title || '';
    if (icon) $('loader-icon').innerHTML = '<img class="size-12 [image-rendering:pixelated]" alt="" src="' + icon + '">';
    else if (icon === null) $('loader-icon').textContent = 'DS';
    $('loader-pct').textContent = pct ? 'Loading… ' + pct + '%' : 'Loading…';
    $('loader-bar').style.width = (pct || 0) + '%';
  }

  function showPlayer() {
    $('home').hidden = true; $('player').hidden = false;
    document.body.classList.add('playing');
    uiCurrentMode = 'player';
    layout();
    emuIsRunning = true;
  }

  // ---------- main loop ----------
  function loop(t) {
    requestAnimationFrame(loop);
    if (!emuIsRunning) { lastT = t; acc = 0; return; }
    acc += Math.min(t - lastT, 100); lastT = t;
    var due = 0;
    while (acc >= FRAME_MS - 1 && due < 2) { acc -= FRAME_MS; due++; }
    if (acc > FRAME_MS * 3) acc = 0;
    if (fastForward) due *= 3;
    for (var i = 0; i < due && emuIsRunning; i++) runFrame(i === due - 1);
  }
  requestAnimationFrame(loop);

  function runFrame(draw) {
    var keys = touchKeys | keyboardKeys;
    Module._runFrame(draw ? 1 : 0, keys, touchDown, touchX, touchY);
    pumpAudio();
    if (window.krOnFrame) krOnFrame();
    if (draw) {
      var fb = Module._getSymbol(4), buf = Module.HEAPU8.buffer;
      for (var s = 0; s < 2; s++) {
        ctx2d[s].putImageData(new ImageData(new Uint8ClampedArray(buf, fb + s * 196608, 196608), 256, 192), 0, 0);
      }
    }
    if (++frameNo % 30 === 0) checkSave();
  }

  // ---------- saves ----------
  function copySave() {
    var n = Module._savGetSize();
    if (n <= 0) return null;
    var p = Module._savGetPointer(0);
    return Module.HEAPU8.slice(p, p + n);
  }
  function checkSave(force) {
    var flag = Module._savUpdateChangeFlag();
    if (flag) saveDirty = true;
    // Persist once the game has stopped writing (flag went 1 -> 0), or when forced.
    if (saveDirty && (force || (flag === 0 && prevSaveFlag === 1))) {
      var data = copySave();
      if (data) KV.set('sav-' + gameID, data).then(function () { KV.set('savt-' + gameID, Date.now()).catch(function () {}); }, function () { toast('Couldn\'t back up your in-game save', { icon: 'warn' }); });
      saveDirty = false;
    }
    prevSaveFlag = flag;
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && emuIsGameLoaded) { checkSave(true); takeSnapshot(); }
  });
  addEventListener('pagehide', function () { if (emuIsGameLoaded) takeSnapshot(); });

  // ---------- experimental: resume where you left off (save states) ----------
  // A snapshot is the emulator's complete state. With the setting on, one is taken every 2 minutes
  // while playing and whenever the app is left or the game is closed. Per game we keep the latest
  // ('snap:<id>') and the one before it ('snap-prev:<id>') as a spare.
  var SNAP_EVERY = 2 * 60 * 1000, lastSnap = null, lastSnapAt = 0;
  // force: always take one (closing the game). Otherwise skip if one was taken in the last 3 seconds
  // (leaving the app fires both visibilitychange and pagehide).
  function takeSnapshot(force) {
    if (!settings.resume || !emuIsGameLoaded || !gameID || (!force && Date.now() - lastSnapAt < 3000)) return Promise.resolve();
    var n;
    try { n = Module._stateSave(1); } catch (e) { n = -1; }
    if (!(n > 0)) return Promise.resolve();
    var p = Module._stateGetPointer();
    var snap = { t: Date.now(), app: APP_VERSION, data: Module.HEAPU8.slice(p, p + n) };
    var id = gameID, old = lastSnap;
    lastSnap = snap; lastSnapAt = snap.t;
    return KV.set('snap:' + id, snap)
      .then(function () { snapFlash(); return old ? KV.set('snap-prev:' + id, old) : null; })
      .then(function () { return remember(id); })
      .catch(function () { toast('Couldn\'t store a snapshot', { icon: 'warn' }); });
  }
  setInterval(function () { if (emuIsRunning) takeSnapshot(); }, SNAP_EVERY);
  // Games that have snapshots, so turning Resume off can delete them all.
  function remember(id) {
    return KV.get('snap-ids').then(function (ids) { ids = ids || []; if (ids.indexOf(id) < 0) { ids.push(id); return KV.set('snap-ids', ids); } });
  }
  // A small clock blinks at the top-right of the game screen once a snapshot is stored.
  var flashTimer = null;
  function snapFlash() {
    if (document.hidden || uiCurrentMode !== 'player') return;
    var f = $('snap-flash'), r = screenCanvas[0].getBoundingClientRect();
    f.style.left = (r.right - 34) + 'px'; f.style.top = (r.top + 6) + 'px';
    f.setAttribute('data-show', '');
    clearTimeout(flashTimer); flashTimer = setTimeout(function () { f.removeAttribute('data-show'); }, 1200);
  }
  function deleteSnapshots() {
    lastSnap = null;
    return KV.get('snap-ids').then(function (ids) {
      return Promise.all((ids || []).map(function (id) { return Promise.all([KV.del('snap:' + id), KV.del('snap-prev:' + id), KV.del('snap-kept:' + id)]); }));
    }).then(function () { return KV.del('snap-ids'); }).catch(function () {});
  }
  function whenText(t) {
    var d = new Date(t), now = new Date(), hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return 'today ' + hm;
    var y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'yesterday ' + hm;
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + hm;
  }
  // Called once the ROM and its in-game save are loaded. Resolves when the game may start running.
  // "Start normally" never throws a snapshot away: the one that was offered is kept aside
  // ('snap-kept:<id>') and offered again as "Earlier snapshot" until a newer one is skipped.
  function offerResume() {
    if (!settings.resume) return Promise.resolve();
    var id = gameID;
    return Promise.all([KV.get('snap:' + id), KV.get('savt-' + id), KV.get('snap-kept:' + id)]).catch(function () { return []; }).then(function (r) {
      var snap = r[0], savT = r[1] || 0, kept = r[2];
      if (kept && (!kept.data || (snap && kept.t === snap.t))) kept = null;
      if (!snap || !snap.data) { if (!kept) return; snap = kept; kept = null; }
      $('resume-icon').innerHTML = $('loader-icon').innerHTML;
      $('resume-title').textContent = $('loader-title').textContent;
      $('resume-when').textContent = 'Snapshot from ' + whenText(snap.t);
      $('resume-warn').hidden = !(savT > snap.t + 5000);
      $('resume-kept').hidden = !kept;
      if (kept) $('resume-kept-text').textContent = 'Earlier: ' + whenText(kept.t);
      loader(false);
      $('resume').hidden = false;
      return new Promise(function (done) {
        function resumeFrom(s) {
          $('resume').hidden = true;
          var ok = -1;
          try { var d = Module._statePrepare(s.data.length); Module.HEAPU8.set(s.data, d); ok = Module._stateLoad(); } catch (e) { ok = -1; }
          if (ok === 0) {
            lastSnap = s; lastSnapAt = Date.now();
            // The snapshot carries the in-game save as it was then; don't treat restoring it as a new save.
            Module._savUpdateChangeFlag(); saveDirty = false; prevSaveFlag = 0;
          } else {
            try { Module._reset(); } catch (e) {}
            toast('Couldn\'t resume this snapshot; started normally', { icon: 'warn' });
          }
          done();
        }
        $('resume-go').onclick = function () { resumeFrom(snap); };
        $('resume-kept').onclick = function () { resumeFrom(kept); };
        // Tapping outside the card cancels: the game isn't started and the start screen stays.
        $('resume').onclick = function (ev) {
          if (ev.target !== $('resume')) return;
          $('resume').hidden = true;
          done('cancel');
        };
        $('resume-skip').onclick = function () {
          $('resume').hidden = true;
          // Keep the skipped snapshot, so a mis-tap can be undone next time.
          KV.set('snap-kept:' + id, snap).then(function () { return remember(id); }).catch(function () {});
          toast('Snapshot kept: you can still resume it next time', { icon: 'clock', ms: 3500 });
          done();
        };
      });
    });
  }

  // ---------- audio ----------
  var actx = null, proc = null, FIFO = 16384, fifoL = new Float32Array(FIFO), fifoR = new Float32Array(FIFO), fHead = 0, fLen = 0;
  function unlockAudio() {
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        actx = new AC();
        proc = actx.createScriptProcessor(1024, 0, 2);
        proc.onaudioprocess = function (e) {
          var L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
          for (var i = 0; i < L.length; i++) {
            if (fLen > 0 && settings.sound) { L[i] = fifoL[fHead]; R[i] = fifoR[fHead]; fHead = (fHead + 1) % FIFO; fLen--; }
            else { L[i] = 0; R[i] = 0; }
          }
        };
        proc.connect(actx.destination);
        if (ready) Module._setSampleRate(Math.round(actx.sampleRate * 59.8261 / 60));
      }
      if (actx.state !== 'running') actx.resume();
    } catch (e) { console.warn('audio', e); }
  }
  function pumpAudio() {
    var n = Module._fillAudioBuffer(4096);
    if (!actx || fastForward) return;
    var p = Module._getSymbol(6) >> 1, s16 = new Int16Array(Module.HEAPU8.buffer);
    for (var i = 0; i < n; i++) {
      if (fLen >= FIFO) break;
      var w = (fHead + fLen) % FIFO;
      fifoL[w] = s16[p + i * 2] / 32768; fifoR[w] = s16[p + i * 2 + 1] / 32768; fLen++;
    }
    if (fLen > 6144) { fHead = (fHead + fLen - 3072) % FIFO; fLen = 3072; } // keep latency down
  }
  var _ready = window.wasmReady;
  window.wasmReady = function () { _ready(); if (actx) Module._setSampleRate(Math.round(actx.sampleRate * 59.8261 / 60)); else Module._setSampleRate(47856); };

  // ---------- layout ----------
  var btns = {}, dpadRect = null;
  Array.prototype.forEach.call(document.querySelectorAll('#controls [data-k]'), function (n) { btns[n.dataset.k] = n; });
  function place(n, x, y, w, h) { n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.width = w + 'px'; n.style.height = h + 'px'; }

  // The real size of the app's area. After rotating, iPhone home-screen apps can keep reporting the
  // old innerWidth / innerHeight for a while; the full-screen player element always has the true size.
  function viewSize() {
    var r = $('player').getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { w: r.width, h: r.height };
    var d = document.documentElement; return { w: d.clientWidth || innerWidth, h: d.clientHeight || innerHeight };
  }
  window.viewSize = viewSize;
  function layout() {
    // iPhone can leave the page scrolled a little after rotating; the player always sits at the top.
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    var vp = viewSize(), W = vp.w, H = vp.h, ctl = $('controls'), sw, sh, top;
    var floating = true;   // controls always float over the bottom screen (Below was removed)
    // Portrait: the controls area is as tall as the big D-pad and face buttons need (see layoutPortrait),
    // but never more than 36% of the screen.
    var ctrlH = Math.max(165, Math.min(PORTRAIT.need(W) + 16, H * 0.36));
    $('controls').classList.toggle('floating', floating);
    if (H >= W && floating) {
      // Screens as large as possible; semi-transparent controls float over the bottom screen.
      sh = Math.min(W * 0.75, H / 2); sw = sh * 4 / 3; top = 0;
      place(screenCanvas[0], (W - sw) / 2, top, sw, sh);
      place(screenCanvas[1], (W - sw) / 2, top + sh, sw, sh);
      ctl.style.top = (H - ctrlH) + 'px'; ctl.style.height = ctrlH + 'px';
      setControlsOpacity(settings.ctlOpacity);
    } else {
      // Landscape: screens side by side at the top; the space below is for the controls.
      sh = Math.min(H, (W / 2) * 0.75); sw = sh * 4 / 3; top = 0;
      place(screenCanvas[0], W / 2 - sw, top, sw, sh);
      place(screenCanvas[1], W / 2, top, sw, sh);
      ctl.style.top = '0px'; ctl.style.height = H + 'px';
      setControlsOpacity(Math.min(1, settings.ctlOpacity + 0.15));
    }
    var C = ctl.getBoundingClientRect(), cw = C.width, ch = C.height;
    // Portrait: keep the controls a bit further up from the bottom edge of the phone.
    if (H >= W) ch -= 16;
    if (H >= W) { setTouchMode(touchMode); layoutPortrait(C, cw, ch); return; }
    touchZones = null;
    // Touch mode is portrait only: landscape always shows the controls.
    $('btn-touch').hidden = true; document.body.classList.remove('touch-mode'); $('ctl-handle').hidden = true;
    var pad = 14, topRow = H >= W ? 52 : 40;           // L / R row (portrait: more room below it)
    var D = Math.min(ch - topRow - 10, cw * 0.34, 170);
    var land = W > H;
    // Landscape: the screens sit at the top and the controls keep their full size, low on the phone
    // near the bottom edge; they may overlap the screens a little (see-through there).
    var cy = land ? ch - D / 2 - 14 : topRow + (ch - topRow) / 2;
    dpadRect = { x: pad, y: cy - D / 2, w: D, h: D };
    place($('dpad'), dpadRect.x, dpadRect.y, D, D);
    var b = D * 0.37, ax = cw - pad - D / 2;
    place(btns.x, ax - b / 2, cy - D / 2, b, b);
    place(btns.b, ax - b / 2, cy + D / 2 - b, b, b);
    place(btns.y, ax - D / 2, cy - b / 2, b, b);
    place(btns.a, ax + D / 2 - b, cy - b / 2, b, b);
    var pw = Math.min(84, D * 0.75), ph = 30;
    // L / R and menu / fast forward sit just above the D-pad and face buttons. In portrait that is
    // the top of the controls; in landscape it keeps them away from the screen's top edge.
    var rowY = H >= W ? 4 : Math.max(4, dpadRect.y - ph - 12);
    place(btns.l, pad, rowY, pw, ph);
    place(btns.r, cw - pad - pw, rowY, pw, ph);
    // Centre column between the D-pad and the face buttons.
    var colW = Math.min(84, cw - 2 * (pad + D) - 12), mid = cw / 2, h = 26;
    place($('btn-menu'), mid - colW / 2, rowY + 2, colW / 2 - 3, h);
    place($('btn-ff'), mid + 3, rowY + 2, colW / 2 - 3, h);
    if (land) {
      // Landscape: SELECT and START side by side at the bottom centre.
      var sw2 = Math.min(84, colW);
      place(btns.select, mid - sw2 - 4, ch - h - 10, sw2, h);
      place(btns.start, mid + 4, ch - h - 10, sw2, h);
    } else {
      // Portrait: SELECT and START side by side at the bottom of the centre column, like menu / fast forward.
      place(btns.select, mid - colW / 2, ch - h - 10, colW / 2 - 3, h);
      place(btns.start, mid + 3, ch - h - 10, colW / 2 - 3, h);
    }
    // Menus and word sheets are always 80% of the screen height, in portrait and landscape.
    var sheetH = Math.round(H * 0.8) + 'px';
    document.documentElement.style.setProperty('--sheet-h', sheetH);
    document.documentElement.style.setProperty('--sheet-max', sheetH);
    // The translate button (the blob) goes in the middle of the controls: in portrait between
    // menu / fast forward and SELECT / START; in landscape in the black strip under the screens,
    // above SELECT / START.
    var spotTop = land ? Math.max(rowY + 2 + h, top + sh) : 6 + h;
    window.krPillSpot = { x: C.left + mid, y: C.top + (spotTop + ch - h - 10) / 2 };
    if (window.krLayout) krLayout();
  }
  // Portrait controls: a big D-pad and big face buttons for thumbs, low on the phone; the small buttons
  // keep their slim size.
  //   top row:    L | menu | translate button | fast forward | R
  //   bottom:     D-pad      SELECT / START      A B X Y      (SELECT / START stacked between them)
  var PORTRAIT = {
    pad: 12, top: 8, lrH: 30, smallH: 26, smallW: 39, gap: 10, bottom: 6, maxD: 156,
    // D-pad size that fits the width: two clusters with the SELECT / START column between them.
    widthD: function (cw) { return Math.min((cw - 2 * this.pad - this.smallW - 2 * 12) / 2, this.maxD); },
    // Height the controls need for that D-pad.
    need: function (cw) { return this.top + this.lrH + this.gap + this.widthD(cw) + this.bottom; }
  };
  function layoutPortrait(C, cw, ch) {
    var P = PORTRAIT, pad = P.pad;
    var D = Math.min(P.widthD(cw), ch - (P.top + P.lrH + P.gap + P.bottom));
    // The clusters sit at the bottom and the top row right above them; any spare height (Below mode
    // can have more room than needed) stays above the top row, so Below and Floating look the same.
    var cy = ch - P.bottom - D / 2;
    var rowY = Math.max(P.top, cy - D / 2 - P.gap - P.lrH);
    dpadRect = { x: pad, y: cy - D / 2, w: D, h: D };
    place($('dpad'), dpadRect.x, dpadRect.y, D, D);
    // Face buttons: neighbours (Y-X, X-A, ...) keep at least 14 px between them, so a thumb hits one
    // button at a time. They get as large as that spacing allows, up to 40% of the cluster.
    var GAP = 14, b = Math.min(D * 0.4, (D * Math.SQRT1_2 - GAP) / (1 + Math.SQRT1_2)), ax = cw - pad - D / 2;
    place(btns.x, ax - b / 2, cy - D / 2, b, b);
    place(btns.b, ax - b / 2, cy + D / 2 - b, b, b);
    place(btns.y, ax - D / 2, cy - b / 2, b, b);
    place(btns.a, ax + D / 2 - b, cy - b / 2, b, b);
    // Slim buttons, the same size as before: L / R 84 x 30, the others 39 x 26.
    var mid = cw / 2, sw = P.smallW, sh = P.smallH, pw = 84;
    place(btns.l, pad, rowY, pw, P.lrH);
    place(btns.r, cw - pad - pw, rowY, pw, P.lrH);
    var spot = 30, sy = rowY + (P.lrH - sh) / 2;   // room for the translate button between menu and fast forward
    place($('btn-menu'), mid - spot - 4 - sw, sy, sw, sh);
    place($('btn-ff'), mid + spot + 4, sy, sw, sh);
    // SELECT above START in the middle, level with the lower half of the clusters; the touch-mode
    // button above them.
    place(btns.select, mid - sw / 2, cy + D / 2 - 2 * sh - 8, sw, sh);
    place(btns.start, mid - sw / 2, cy + D / 2 - sh, sw, sh);
    place($('btn-touch'), mid - sw / 2, cy + D / 2 - 3 * sh - 26, sw, sh);
    $('btn-touch').hidden = false;
    var sheetH = Math.round(viewSize().h * 0.8) + 'px';
    document.documentElement.style.setProperty('--sheet-h', sheetH);
    document.documentElement.style.setProperty('--sheet-max', sheetH);
    window.krPillSpot = { x: C.left + mid, y: C.top + rowY + P.lrH / 2 };
    // Touch areas (screen coordinates): the whole left part of the controls is the D-pad, the whole right
    // part the face buttons. They start just under the top row and run to the bottom of the phone.
    var zt = C.top + rowY + P.lrH + 2, zb = C.top + C.height;
    touchZones = {
      pad: { left: C.left, right: C.left + mid - sw / 2 - 6, top: zt, bottom: zb, cx: C.left + pad + D / 2, cy: C.top + cy, D: D },
      face: { left: C.left + mid + sw / 2 + 6, right: C.left + cw, top: zt, bottom: zb, cx: C.left + ax, cy: C.top + cy, D: D }
    };
    if (window.krLayout) krLayout();
  }
  // iPhone reports the new size a little late after rotating, so lay out again a few times.
  function relayout() { if (uiCurrentMode !== 'player') return; [50, 250, 600, 1200].forEach(function (ms) { setTimeout(layout, ms); }); }
  addEventListener('resize', relayout);
  addEventListener('orientationchange', relayout);
  if (window.visualViewport) visualViewport.addEventListener('resize', relayout);

  // ---------- touch input ----------
  function hit(n, x, y, slop) {
    var r = n.getBoundingClientRect(); slop = slop || 6;
    return x >= r.left - slop && x <= r.right + slop && y >= r.top - slop && y <= r.bottom + slop;
  }
  var CONTROL_MARGIN = 15;
  // Touch mode (portrait): all controls and the translate button hidden, the whole touch screen is free.
  // Subtitle text stays and can still be tapped. The handle at the bottom brings the controls back;
  // nothing else does (manual only).
  var touchMode = false, ignoreTouches = {};
  function setTouchMode(on) {
    touchMode = !!on;
    var portrait = viewSize().h >= viewSize().w;
    document.body.classList.toggle('touch-mode', touchMode && portrait);
    $('ctl-handle').hidden = !(touchMode && portrait) || uiCurrentMode !== 'player';
    if (touchMode) { touchKeys = 0; padTouches = {}; for (var k in btns) btns[k].classList.remove('on'); $('dpad').className = ''; $('dpad').style.translate = ''; }
  }
  // Portrait touch areas, set by layoutPortrait (null in landscape).
  var touchZones = null;
  function inZone(z, x, y) { return z && x >= z.left && x <= z.right && y >= z.top && y <= z.bottom; }
  // Floating D-pad: each thumb on the D-pad area has its own centre. A thumb that lands on the D-pad
  // itself uses the D-pad's centre (so tapping an arm still works); a thumb that lands anywhere else
  // in the area becomes the centre, and the D-pad moves under it. Sliding further than the D-pad's
  // edge drags the centre along, like a joystick.
  var padTouches = {};
  function padKeys(z, id, x, y, start) {
    var o = padTouches[id];
    if (!o) {
      if (!start) return null;
      var onPad = Math.abs(x - z.cx) <= z.D / 2 && Math.abs(y - z.cy) <= z.D / 2;
      o = padTouches[id] = onPad ? { x: z.cx, y: z.cy, moved: false } : { x: x, y: y, moved: true };
    }
    var dx = x - o.x, dy = y - o.y, r = Math.hypot(dx, dy), max = z.D * 0.45;
    if (r > max) { o.x += dx * (1 - max / r); o.y += dy * (1 - max / r); o.moved = true; dx = x - o.x; dy = y - o.y; r = max; }
    var keys = 0, cls = '';
    if (r > z.D * 0.1) {
      var a = Math.atan2(dy, dx) * 180 / Math.PI;
      if (a > -67.5 && a < 67.5) { keys |= 1 << KEYS.right; cls += ' r'; }
      if (a > 112.5 || a < -112.5) { keys |= 1 << KEYS.left; cls += ' l'; }
      if (a > 22.5 && a < 157.5) { keys |= 1 << KEYS.down; cls += ' d'; }
      if (a < -22.5 && a > -157.5) { keys |= 1 << KEYS.up; cls += ' u'; }
    }
    return { keys: keys, cls: cls, o: o };
  }
  // Face buttons: the whole right area is split by angle around the cluster's centre: right = A,
  // bottom = B, left = Y, top = X. Close to the line between two buttons both are pressed, so sliding
  // a thumb from B to A goes B, A+B, A.
  var FACE = [['a', 0], ['b', 90], ['y', 180], ['x', -90]], BOTH = 14;
  function faceKeys(z, x, y) {
    var dx = x - z.cx, dy = y - z.cy;
    if (Math.hypot(dx, dy) < 6) return 0;
    var a = Math.atan2(dy, dx) * 180 / Math.PI, keys = 0;
    FACE.forEach(function (f) {
      var d = Math.abs(((a - f[1]) % 360 + 540) % 360 - 180);
      if (d <= 45 + BOTH) keys |= 1 << KEYS[f[0]];
    });
    return keys;
  }
  function nearControl(x, y) {
    for (var k in btns) if (hit(btns[k], x, y, CONTROL_MARGIN)) return true;
    return hit($('dpad'), x, y, CONTROL_MARGIN) || hit($('btn-menu'), x, y, CONTROL_MARGIN) || hit($('btn-ff'), x, y, CONTROL_MARGIN);
  }
  function onTouch(e) {
    if (uiCurrentMode !== 'player') return;
    if (e.target.closest && e.target.closest('#menu')) return;
    e.preventDefault();
    unlockAudio();
    var keys = 0, td = 0, bottom = screenCanvas[1].getBoundingClientRect();
    var dp = $('dpad').getBoundingClientRect(), dpCls = '';
    var menuDown = false, ffDown = false, live = {}, padAt = null;
    var started = {};
    if (e.type === 'touchstart') for (var c = 0; c < e.changedTouches.length; c++) started[e.changedTouches[c].identifier || 0] = 1;
    // Touch mode on / off. The finger that switched it is ignored until it lifts, so it doesn't press
    // whatever control appears (or disappears) under it.
    if (e.type === 'touchstart') {
      for (var c2 = 0; c2 < e.changedTouches.length; c2++) {
        var ct = e.changedTouches[c2], cid = ct.identifier || 0;
        if (touchMode && !$('ctl-handle').hidden && hit($('ctl-handle'), ct.clientX, ct.clientY, 10)) { setTouchMode(false); layout(); ignoreTouches[cid] = 1; }
        else if (!touchMode && !$('btn-touch').hidden && hit($('btn-touch'), ct.clientX, ct.clientY)) { setTouchMode(true); layout(); ignoreTouches[cid] = 1; }
      }
    }
    var hidden = document.body.classList.contains('touch-mode');
    for (var i = 0; i < e.touches.length; i++) {
      var t = e.touches[i], x = t.clientX, y = t.clientY, id = t.identifier || 0;
      live[id] = 1;
      if (ignoreTouches[id]) continue;
      var found = false;
      // Touch mode: no controls, every touch goes to the game's touch screen.
      if (hidden) {
        if (!td && x >= bottom.left && x <= bottom.right && y >= bottom.top && y <= bottom.bottom) {
          td = 1;
          touchX = Math.max(0, Math.min(255, Math.floor((x - bottom.left) / bottom.width * 256)));
          touchY = Math.max(0, Math.min(191, Math.floor((y - bottom.top) / bottom.height * 192)));
        }
        continue;
      }
      // A thumb that started on the D-pad area keeps steering it wherever it slides.
      if (touchZones && padTouches[id]) {
        var pk = padKeys(touchZones.pad, id, x, y, false);
        keys |= pk.keys; dpCls += pk.cls; padAt = pk.o; continue;
      }
      for (var k in btns) {
        if (touchZones && /^[abxy]$/.test(k)) continue;   // portrait: face buttons go by area, below
        if (hit(btns[k], x, y)) { keys |= 1 << KEYS[k]; found = true; }
      }
      if (hit($('btn-menu'), x, y)) { menuDown = true; continue; }
      if (hit($('btn-ff'), x, y)) { ffDown = true; continue; }
      if (found) continue;
      if (touchZones) {
        if (inZone(touchZones.face, x, y)) { keys |= faceKeys(touchZones.face, x, y); continue; }
        if (inZone(touchZones.pad, x, y) && started[id]) {
          var pk2 = padKeys(touchZones.pad, id, x, y, true);
          keys |= pk2.keys; dpCls += pk2.cls; padAt = pk2.o; continue;
        }
        if (inZone(touchZones.pad, x, y)) continue;   // a thumb slid in from elsewhere: not a game tap
      }
      // D-pad: 8-way by angle from centre, with a generous area.
      var dx = x - (dp.left + dp.width / 2), dy = y - (dp.top + dp.height / 2);
      var onBottom = x >= bottom.left && x <= bottom.right && y >= bottom.top && y <= bottom.bottom;
      var zone = settings.controls === 'floating' ? 0.56 : 0.7;   // floating: stay close to the pad so the touchscreen stays usable
      if ((!onBottom || settings.controls === 'floating') && Math.abs(dx) < dp.width * zone && Math.abs(dy) < dp.height * zone && Math.hypot(dx, dy) > dp.width * 0.08) {
        var a = Math.atan2(dy, dx) * 180 / Math.PI;
        if (a > -67.5 && a < 67.5) { keys |= 1 << KEYS.right; dpCls += ' r'; }
        if (a > 112.5 || a < -112.5) { keys |= 1 << KEYS.left; dpCls += ' l'; }
        if (a > 22.5 && a < 157.5) { keys |= 1 << KEYS.down; dpCls += ' d'; }
        if (a < -22.5 && a > -157.5) { keys |= 1 << KEYS.up; dpCls += ' u'; }
        continue;
      }
      // A touch just next to a button or the D-pad is a missed press, not a tap on the game:
      // ignore it within 15 px of any control. The open space between controls still works.
      if (nearControl(x, y)) continue;
      if (!td && x >= bottom.left && x <= bottom.right && y >= bottom.top && y <= bottom.bottom) {
        td = 1;
        touchX = Math.max(0, Math.min(255, Math.floor((x - bottom.left) / bottom.width * 256)));
        touchY = Math.max(0, Math.min(191, Math.floor((y - bottom.top) / bottom.height * 192)));
      }
    }
    touchKeys = keys; touchDown = td;
    for (var pid in padTouches) if (!live[pid]) delete padTouches[pid];
    for (var iid in ignoreTouches) if (!live[iid]) delete ignoreTouches[iid];
    $('dpad').className = dpCls;
    // The floating D-pad follows the thumb's centre, and goes home when the thumb lifts.
    if (touchZones) {
      var z = touchZones.pad, ox = padAt && padAt.moved ? padAt.x : z.cx, oy = padAt && padAt.moved ? padAt.y : z.cy;
      $('dpad').style.translate = (ox - z.cx) + 'px ' + (oy - z.cy) + 'px';
    } else $('dpad').style.translate = '';
    for (var k2 in btns) btns[k2].classList.toggle('on', !!(keys & (1 << KEYS[k2])));
    $('btn-menu').classList.toggle('on', menuDown);
    $('btn-ff').classList.toggle('on', ffDown);
    if (e.type === 'touchstart' && !hidden) {
      var t0 = e.changedTouches[0];
      if (hit($('btn-menu'), t0.clientX, t0.clientY)) openMenu();
      if (hit($('btn-ff'), t0.clientX, t0.clientY)) { fastForward = !fastForward; $('btn-ff').classList.toggle('active', fastForward); }
    }
  }
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (t) { addEventListener(t, onTouch, { passive: false }); });

  // Mouse (desktop testing): bottom screen + buttons.
  var mouseDown = false;
  function onMouse(e) {
    if (uiCurrentMode !== 'player' || (e.target.closest && e.target.closest('#menu,#kr-panel,#kr-pill,#kr-sheet'))) return;
    if (e.type === 'mousedown') { mouseDown = true; unlockAudio(); if (hit($('btn-menu'), e.clientX, e.clientY)) openMenu(); }
    if (e.type === 'mouseup') mouseDown = false;
    onTouch({ type: e.type === 'mousedown' ? 'touchstart' : 'touchmove', target: e.target, preventDefault: function () {},
      touches: mouseDown ? [{ clientX: e.clientX, clientY: e.clientY }] : [], changedTouches: [{ clientX: -999, clientY: -999 }] });
  }
  ['mousedown', 'mousemove', 'mouseup'].forEach(function (t) { addEventListener(t, onMouse); });

  // Keyboard (desktop / Bluetooth keyboard).
  var KB = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', Shift: 'select', Enter: 'start',
    z: 'b', x: 'a', a: 'y', s: 'x', q: 'l', w: 'r' };
  function onKey(e) {
    // Typing in a text field (the saved-words search) is typing, not game buttons.
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    var k = KB[e.key] || KB[e.key.toLowerCase && e.key.toLowerCase()];
    if (!k || uiCurrentMode !== 'player') return;
    e.preventDefault();
    if (e.type === 'keydown') keyboardKeys |= 1 << KEYS[k]; else keyboardKeys &= ~(1 << KEYS[k]);
  }
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);

  // ---------- menu ----------
  var wasRunning = false;
  function openMenu() {
    $('btn-menu').classList.add('active');
    wasRunning = emuIsRunning; emuIsRunning = false;
    touchKeys = 0; touchDown = 0;
    checkSave(true);
    $('menu-title').textContent = gameTitle || 'Menu';
    $('m-advanced').hidden = true; $('m-adv-chev').style.transform = '';
    menuLabels();
    $('menu').hidden = false;
  }
  // The controls' transparency (the translate button keeps its own 90%, see kr/ui.css).
  function setControlsOpacity(v) {
    $('controls').style.opacity = v;
    document.documentElement.style.setProperty('--ctl-opacity', String(v));
  }
  function menuLabels() {
    $('m-opacity').value = Math.round(settings.ctlOpacity * 100);
    $('m-opacity-val').textContent = Math.round(settings.ctlOpacity * 100) + '%';
    var snd = document.querySelector('[data-m=sound]');
    snd.innerHTML = HI(settings.sound ? 'speaker-wave' : 'speaker-x-mark', 'size-5'); snd.classList.toggle('opacity-60', !settings.sound);
    setSeg('subs', window.KRSettings ? KRSettings.getMode() : 'bar');
    $('m-resume').setAttribute('aria-checked', String(!!settings.resume));
    var study = !window.KRSettings || KRSettings.getStudy();
    $('m-study').setAttribute('aria-checked', String(study));
    // Study mode off: hide every study-related row.
    $('m-subs-row').hidden = !study; $('m-words-row').hidden = !study;
    $('m-reset-box').hidden = !study || !window.KRSettings || KRSettings.getMode() !== 'box';
    $('m-words').innerHTML = window.KRSettings ? HI('star', 'size-4 text-amber-500 relative -top-[1.25px]') + KRSettings.savedCount() : '';
    var st = window.KRReaderStats ? KRReaderStats() : null;
    $('m-info').innerHTML = 'Version ' + APP_VERSION + ' · ' + (gameID ? gameID.trim() : '') +
      (lastLoadError ? '<br>Last load problem (retried): ' + lastLoadError.replace(/</g, '&lt;') : '') +
      (st ? '<br>Reader: ' + st.strings + ' strings in memory, ' + st.korean + ' in the game’s language, ' + st.printers + ' being printed' : '') +
      '<br>The game saves automatically a few seconds after you save in‑game.' +
      '<br>Emulator: desmume‑wasm (GPL‑2.0). Character table and Pokémon names: PKHeX (GPL‑3.0). Dictionaries: kengdic (MPL‑2.0), JMdict by the EDRDG (CC BY‑SA 4.0). Icons: Heroicons (MIT).';
  }
  function setSeg(name, v) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-seg=' + name + '] button'), function (b) { b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false'); });
  }
  function saveSettings() { KV.set('settings', settings).catch(function () {}); }
  function closeMenu() { $('menu').hidden = true; $('btn-menu').classList.remove('active'); emuIsRunning = wasRunning || emuIsGameLoaded; }
  // Controls opacity slider: live while dragging; the menu fades meanwhile so the controls show through.
  $('m-opacity').addEventListener('input', function () {
    settings.ctlOpacity = Math.max(0.15, Math.min(1, this.value / 100));
    $('m-opacity-val').textContent = Math.round(settings.ctlOpacity * 100) + '%';
    layout();
  });
  $('m-opacity').addEventListener('change', function () { saveSettings(); });
  ['pointerdown', 'touchstart'].forEach(function (t) { $('m-opacity').addEventListener(t, function () { $('menu').classList.add('peek'); }, { passive: true }); });
  ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'change'].forEach(function (t) {
    $('m-opacity').addEventListener(t, function () { $('menu').classList.remove('peek'); }, { passive: true });
  });
  $('menu').addEventListener('click', function (e) {
    if (e.target === $('menu')) return closeMenu();
    var segBtn = e.target.closest('.seg button');
    if (segBtn) {
      var seg = segBtn.parentNode.dataset.seg, v = segBtn.dataset.v;
      if (seg === 'subs' && window.KRSettings) KRSettings.setMode(v);
      return menuLabels();
    }
    var el = e.target.closest('[data-m]'), m = el && el.dataset.m;
    if (m === 'resume') closeMenu();
    if (m === 'sound') { settings.sound = !settings.sound; saveSettings(); menuLabels(); }
    if (m === 'export') exportSave();
    if (m === 'import') $('file-save').click();
    if (m === 'words' && window.KRUI) { closeMenu(); KRUI.open('saved'); }
    if (m === 'advanced') {
      var open = $('m-advanced').hidden; $('m-advanced').hidden = !open;
      $('m-adv-chev').style.transform = open ? 'rotate(90deg)' : '';
      if (open) setTimeout(function () { $('m-advanced').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 0);
    }
    if (m === 'snapshot') exportSnapshot();
    if (m === 'study-toggle' && window.KRSettings) { KRSettings.setStudy(!KRSettings.getStudy()); menuLabels(); }
    if (m === 'resume-toggle') {
      settings.resume = !settings.resume; saveSettings(); menuLabels();
      if (settings.resume) { toast('Resume is on', { icon: 'ok' }); lastSnapAt = 0; takeSnapshot(); }
      else deleteSnapshots().then(function () { toast('Resume is off; snapshots deleted', { icon: 'trash' }); });
    }
    if (m === 'reset-box' && window.KRUI) { KRUI.resetBox(); closeMenu(); }
    if (m === 'home') {
      // Reload once the snapshot is stored (or after 1.5 s at most, if storage is slow).
      var left = false, leave = function () { if (!left) { left = true; location.reload(); } };
      checkSave(true); takeSnapshot(true).then(leave); setTimeout(leave, 1500);
    }
  });
  ['touchstart', 'touchmove', 'touchend'].forEach(function (t) {
    $('menu').addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
  });

  function gzip(u8) { return new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); }
  function gunzip(u8) { return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); }

  // Memory snapshot for adding support for more games: 4 MB main RAM + both screens.
  // Format (gzip): "DSKSNAP1", u32 JSON length, JSON info, RAM (4 MB), screens (2 x 256x192 RGBA).
  function exportSnapshot() {
    var mem = Module._getSymbol(7), fb = Module._getSymbol(4);
    var ram = Module.HEAPU8.slice(mem, mem + (4 << 20));
    var screens = Module.HEAPU8.slice(fb, fb + 2 * 196608);
    var info = new TextEncoder().encode(JSON.stringify({
      gameID: gameID, title: gameTitle, app: APP_VERSION, time: new Date().toISOString(),
      reader: window.KRReaderStats ? KRReaderStats() : null
    }));
    var head = new Uint8Array(12);
    head.set(new TextEncoder().encode('DSKSNAP1'));
    new DataView(head.buffer).setUint32(8, info.length, true);
    var all = new Uint8Array(head.length + info.length + ram.length + screens.length), o = 0;
    [head, info, ram, screens].forEach(function (part) { all.set(part, o); o += part.length; });
    gzip(all).then(function (ab) {
      var name = 'snapshot-' + gameID.trim().replace(/[^\w-]+/g, '_') + '-' + Date.now() + '.dsksnap';
      var file = new File([ab], name, { type: 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file] });
      var a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
    }).catch(function (e) { if (e && e.name !== 'AbortError') alert('Snapshot failed: ' + e); });
  }

  function exportSave() {
    var data = copySave();
    if (!data) return alert('No save data yet. Save in the game first.');
    gzip(data).then(function (ab) {
      var name = 'sav-' + gameID.trim().replace(/[^\w-]+/g, '_') + '.dsz';
      var file = new File([ab], name, { type: 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file] });
      var a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
    }).catch(function (e) { if (e && e.name !== 'AbortError') alert('Export failed: ' + e); });
  }

  $('file-save').onchange = function () {
    var f = this.files[0]; this.value = '';
    if (!f) return;
    var ext = f.name.split('.').pop().toLowerCase();
    f.arrayBuffer().then(function (ab) {
      var u8 = new Uint8Array(ab);
      if (ext === 'dsz') return gunzip(u8).then(function (x) { return new Uint8Array(x); });
      if (ext === 'dsv') return u8;
      if (ext === 'sav') {
        // Raw save: overwrite the start of the current save so the emulator's footer stays valid.
        var cur = copySave();
        if (!cur) throw new Error('Save once in the game first, then import the .sav file.');
        if (u8.length > cur.length) throw new Error('This .sav file is larger than the game\'s save.');
        cur.set(u8, 0); return cur;
      }
      throw new Error('Use a .dsz, .sav or .dsv file.');
    }).then(function (data) {
      if (!confirm('Replace the save for ' + (gameTitle || 'this game') + '? The game will restart.')) return;
      return KV.set('sav-' + gameID, data).then(function () { location.reload(); });
    }).catch(function (e) { alert(e.message || e); });
  };

  // ---------- status message ----------
  // ---------- toast: the one notification style for the whole app ----------
  // toast(text, { icon: 'ok' | 'star' | 'trash' | 'warn' | 'info', ms, action: 'Undo', onAction })
  var TOAST_ICON = { ok: 'text-emerald-400', star: 'text-amber-400', trash: 'text-zinc-400', warn: 'text-red-400', info: 'text-sky-400', clock: 'text-amber-400' };
  var toastTimer = null;
  function toast(text, o) {
    o = o || {};
    var t = $('toast'), btn = $('toast-action');
    $('toast-icon').innerHTML = o.icon ? HI(o.icon, 'size-5 ' + (TOAST_ICON[o.icon] || '')) : '';
    $('toast-text').textContent = text;
    btn.hidden = !o.action; btn.textContent = o.action || '';
    btn.onclick = function () { hide(); if (o.onAction) o.onAction(); };
    function hide() { clearTimeout(toastTimer); t.removeAttribute('data-show'); btn.onclick = null; }
    t.setAttribute('data-show', '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, o.ms || (o.icon === 'warn' ? 3500 : 2000));
  }
  window.toast = toast;
})();
