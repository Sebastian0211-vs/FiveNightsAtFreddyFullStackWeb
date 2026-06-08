// ============================================================
//  preload.js, gameplay asset preloader + loading screen
//
//  Warms the browser's HTTP cache for the gameplay assets BEFORE the night
//  starts, so camera views / sprites / sounds never pop in mid-game. Uses
//  fetch() (cache-warm only) rather than holding decoded images, so memory
//  stays low, the game decodes them lazily from cache as it already does.
//
//  Exposes window.__preloadThenStart(startFn):
//    shows a loading overlay, fetches every URL in
//    /assets/preload-manifest.json with a progress bar, then runs startFn().
//
//  Fails open: if the manifest is missing or the network hiccups, it starts
//  the game anyway (never blocks behind a broken preload). After the first
//  visit everything is HTTP-cached, so the bar zips straight through.
// ============================================================
(function () {
    const MANIFEST_URL    = '/assets/preload-manifest.json';
    const CONCURRENCY     = 8;
    const HARD_TIMEOUT_MS = 60000; // safety: never block the game forever

    function makeOverlay() {
        const o = document.createElement('div');
        o.id = '__preload-overlay';
        o.style.cssText =
            'position:fixed;inset:0;z-index:99999;background:#000;display:flex;' +
            'flex-direction:column;align-items:center;justify-content:center;' +
            'font-family:"Courier New",Courier,monospace;color:#c9c9c9;';
        o.innerHTML =
            '<div style="letter-spacing:.3em;font-size:clamp(14px,2vw,22px);' +
            'text-transform:uppercase;margin-bottom:18px;opacity:.85;">Loading…</div>' +
            '<div style="width:min(60vw,420px);height:6px;background:rgba(255,255,255,.12);' +
            'border-radius:3px;overflow:hidden;"><div id="__preload-bar" style="height:100%;' +
            'width:0%;background:#c9c9c9;transition:width .15s linear;"></div></div>' +
            '<div id="__preload-pct" style="margin-top:10px;font-size:12px;opacity:.6;">0%</div>';
        document.body.appendChild(o);
        return o;
    }

    function setProgress(done, total) {
        const pct = total ? Math.round((done / total) * 100) : 100;
        const bar = document.getElementById('__preload-bar');
        const txt = document.getElementById('__preload-pct');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = pct + '%';
    }

    async function warm(urls, onTick) {
        let next = 0, done = 0;
        async function worker() {
            while (next < urls.length) {
                const url = urls[next++];
                try { await fetch(encodeURI(url), { cache: 'force-cache' }); }
                catch (e) { /* ignore individual failures */ }
                onTick(++done);
            }
        }
        const pool = [];
        for (let k = 0; k < CONCURRENCY; k++) pool.push(worker());
        await Promise.all(pool);
    }

    window.__preloadThenStart = async function (startFn) {
        const overlay = makeOverlay();
        let started = false;
        const start = () => {
            if (started) return;
            started = true;
            overlay.remove();
            try { startFn(); } catch (e) { console.error('start failed', e); }
        };
        const safety = setTimeout(start, HARD_TIMEOUT_MS);

        try {
            const res  = await fetch(MANIFEST_URL, { cache: 'no-cache' });
            const list = res.ok ? await res.json() : [];
            if (Array.isArray(list) && list.length) {
                setProgress(0, list.length);
                await warm(list, (done) => setProgress(done, list.length));
            }
        } catch (e) {
            /* no manifest / offline, start anyway */
        }

        clearTimeout(safety);
        start();
    };
})();
