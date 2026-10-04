(() => {
  const S = window.SITE, P = window.PHOTOS, $ = (s, r = document) => r.querySelector(s);
  const all = (s) => document.querySelectorAll(s);

  // Text and links from config.js
  all('[data-site]').forEach((e) => (e.textContent = S[e.dataset.site]));
  all('[data-href]').forEach((e) => (e.href = S[e.dataset.href]));
  $('.year').textContent = new Date().getFullYear();
  if (S.email) {
    $('#email').href = 'mailto:' + S.email;
    $('#email').textContent = S.email;
    $('#email-row').hidden = false;
  }

  // Mobile menu
  const bar = $('.bar'), btn = $('.menu-btn');
  const setMenu = (open) => {
    bar.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? 'Close' : 'Menu';
  };
  btn.onclick = () => setMenu(!bar.classList.contains('open'));
  $('#nav').onclick = (e) => e.target.matches('a') && setMenu(false);

  // Gentle fade-in as photographs scroll into view
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }), { rootMargin: '0px 0px -6% 0px' })
    : null;
  const watch = (el) => (io ? io.observe(el) : el.classList.add('in'));

  // Lightbox (native <dialog>: focus trap and Esc come for free)
  const lb = $('#lb'), lbImg = $('img', lb), lbCap = $('figcaption', lb);
  let items = [], idx = 0, opener = null;
  const show = (i) => {
    idx = (i + items.length) % items.length;
    lbImg.src = items[idx].src;
    lbImg.alt = items[idx].alt;
    lbCap.textContent = items[idx].cap || '';
  };
  const openLb = (list, i) => {
    items = list; opener = document.activeElement;
    lb.classList.toggle('single', list.length < 2);
    show(i); lb.showModal();
  };
  lb.addEventListener('close', () => opener && opener.focus());
  $('.lb-close').onclick = () => lb.close();
  $('.lb-prev').onclick = () => show(idx - 1);
  $('.lb-next').onclick = () => show(idx + 1);
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  lb.addEventListener('click', (e) => e.target === lb && lb.close());
  let x0 = 0;
  lb.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', (e) => {
    const d = e.changedTouches[0].clientX - x0;
    if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1));
  });

  const tile = (img, onOpen) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile reveal';
    b.append(img); b.onclick = onOpen; watch(b);
    return b;
  };
  const picture = (srcset, src, sizes, w, h, alt, eager) => {
    const i = new Image();
    i.srcset = srcset; i.src = src; i.sizes = sizes; i.width = w; i.height = h; i.alt = alt;
    i.loading = eager ? 'eager' : 'lazy'; i.decoding = 'async';
    return i;
  };

  // Portfolio: balanced masonry that keeps each photograph's own proportions
  const dir = 'assets/images/', file = (p, w) => `${dir}${p.n}-${w}.webp`;
  const list = P.map((p) => ({ src: file(p, p.ws[p.ws.length - 1]), alt: p.alt }));
  const tiles = P.map((p, i) => ({
    r: p.h / p.w,
    el: tile(
      picture(p.ws.map((w) => `${file(p, w)} ${w}w`).join(','), file(p, p.ws[0]), '(min-width:760px) 33vw, 50vw', p.w, p.h, p.alt, i < 4),
      () => openLb(list, i)
    ),
  }));
  const gal = $('#gallery');
  let cols = 0;
  const layout = () => {
    const n = innerWidth < 760 ? 2 : 3;
    if (n === cols) return;
    cols = n; gal.textContent = '';
    const cs = Array.from({ length: n }, () => {
      const d = document.createElement('div'); d.className = 'col'; gal.append(d);
      return { d, h: 0 };
    });
    tiles.forEach((t) => {
      const c = cs.reduce((a, b) => (b.h < a.h ? b : a));
      c.d.append(t.el); c.h += t.r;
    });
  };
  layout();
  addEventListener('resize', layout);

  // Recent updates, read from Supabase's public REST endpoint (no library needed)
  const feed = $('#feed');
  const say = (t) => { feed.innerHTML = ''; const p = document.createElement('p'); p.className = 'note'; p.textContent = t; feed.append(p); };
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

  (async () => {
    if (/^YOUR/.test(S.supabaseUrl)) return say('New updates will appear here soon.');
    try {
      const r = await fetch(`${S.supabaseUrl}/rest/v1/updates?select=id,created_at,image_path,caption,w,h&order=created_at.desc&limit=40`,
        { headers: { apikey: S.supabaseKey } });
      if (!r.ok) throw new Error(r.status);
      const rows = await r.json();
      if (!rows.length) return say('Nothing here yet. The first update is on its way.');
      const base = `${S.supabaseUrl}/storage/v1/object/public/updates/`;
      const alt = (u) => u.caption || 'Photograph shared on ' + new Date(u.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' });
      const lbList = rows.map((u) => ({ src: `${base}${u.image_path}-1600.jpg`, alt: alt(u), cap: u.caption }));
      feed.innerHTML = '';
      rows.forEach((u, i) => {
        const a = document.createElement('article'), d = new Date(u.created_at);
        const img = picture(`${base}${u.image_path}-800.jpg 800w,${base}${u.image_path}-1600.jpg 1600w`,
          `${base}${u.image_path}-800.jpg`, '(min-width:700px) 640px, 100vw', u.w || 1600, u.h || 1200, alt(u), i < 1);
        const meta = document.createElement('div'), t = document.createElement('time');
        meta.className = 'meta'; t.dateTime = u.created_at; t.textContent = fmt(d); meta.append(t);
        if (u.caption) { const p = document.createElement('p'); p.textContent = u.caption; meta.append(p); }
        a.append(tile(img, () => openLb(lbList, i)), meta);
        feed.append(a);
      });
    } catch (e) {
      say('The latest updates can’t be loaded right now. Please try again in a little while.');
    }
  })();
})();
