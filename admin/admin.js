(() => {
  const S = window.SITE, $ = (s) => document.querySelector(s);
  if (/^YOUR/.test(S.supabaseUrl)) {
    $('#login').innerHTML = '<p class="note">The backend isn’t connected yet. See README step 5.</p>';
    return;
  }
  const sb = supabase.createClient(S.supabaseUrl, S.supabaseKey);
  const bucket = () => sb.storage.from('updates');
  const pub = (p) => `${S.supabaseUrl}/storage/v1/object/public/updates/${p}`;
  const say = (t) => ($('#status').textContent = t);
  let shown = null, ready = null;

  // Show the login form or the dashboard depending on the session
  sb.auth.onAuthStateChange((_e, s) => setTimeout(() => {
    const on = !!s;
    if (on === shown) return;
    shown = on;
    $('#login').hidden = on; $('#dash').hidden = !on;
    if (on) list();
  }, 0));

  $('#login').onsubmit = async (e) => {
    e.preventDefault();

    const button = e.submitter;
    button.disabled = true;
    $('#lerr').textContent = 'Signing in…';

    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: $('#email').value.trim(),
        password: $('#pw').value
      });

      console.log('Supabase login result:', { data, error });

      if (error) {
        $('#lerr').textContent = `Login error: ${error.message}`;
      } else {
        $('#lerr').textContent = 'Login successful — loading journal…';
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      $('#lerr').textContent = `Unexpected error: ${err.message}`;
    } finally {
      button.disabled = false;
    }
};
  // Photos are shrunk in the browser before upload: one large and one small copy, JPEG
  const load = (file) => new Promise((ok, no) => {
    const i = new Image(), u = URL.createObjectURL(file);
    i.onload = () => { URL.revokeObjectURL(u); ok(i); };
    i.onerror = no; i.src = u;
  });
  const scale = (img, maxW) => {
    const r = Math.min(1, maxW / img.naturalWidth), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise((ok) => c.toBlob((b) => ok({ b, w: c.width, h: c.height }), 'image/jpeg', 0.86));
  };

  $('#file').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    say('Preparing your photo…'); $('#publish').disabled = true;
    try {
      const img = await load(f);
      ready = { l: await scale(img, 1600), s: await scale(img, 800) };
      $('#preview').src = URL.createObjectURL(ready.l.b);
      $('#preview').hidden = false; $('#publish').disabled = false; say('');
    } catch {
      ready = null; say('That photo couldn’t be opened. Please choose a different one.');
    }
  };

  $('#publish').onclick = async () => {
    const btn = $('#publish'), id = crypto.randomUUID();
    btn.disabled = true; say('Publishing…');
    try {
      for (const [n, v] of [['1600', ready.l], ['800', ready.s]]) {
        const { error } = await bucket().upload(`${id}-${n}.jpg`, v.b, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (error) throw error;
      }
      const { error } = await sb.from('updates').insert({
        image_path: id, caption: $('#cap').value.trim() || null, w: ready.l.w, h: ready.l.h });
      if (error) throw error;
      ready = null; $('#file').value = ''; $('#cap').value = ''; $('#preview').hidden = true;
      say('Published. It’s on your website now.'); list();
    } catch (err) {
      console.error(err);
      say('Something went wrong, so nothing was published. Check your connection and try again.');
      btn.disabled = false;
    }
  };

  async function list() {
    const box = $('#list');
    const { data, error } = await sb.from('updates').select('*').order('created_at', { ascending: false });
    box.textContent = '';
    if (error) return (box.textContent = 'Your updates couldn’t be loaded. Please refresh the page.');
    if (!data.length) return (box.textContent = 'Nothing posted yet.');
    data.forEach((u) => {
      const r = document.createElement('div');
      r.className = 'row';
      r.innerHTML = `<img alt="" loading="lazy"><div><time></time><p></p><div class="acts"><button class="link" type="button" data-a="e">Edit note</button><button class="link" type="button" data-a="d">Delete</button></div></div>`;
      r.querySelector('img').src = pub(`${u.image_path}-800.jpg`);
      r.querySelector('time').textContent = new Date(u.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
      r.querySelector('p').textContent = u.caption || '(no note)';
      r.onclick = async (e) => {
        const a = e.target.dataset.a;
        if (a === 'e') {
          const t = prompt('Edit your note', u.caption || '');
          if (t === null) return;
          const { error } = await sb.from('updates').update({ caption: t.trim() || null }).eq('id', u.id);
          error ? say('That change couldn’t be saved.') : list();
        }
        if (a === 'd' && confirm('Delete this update? This can’t be undone.')) {
          const { error } = await sb.from('updates').delete().eq('id', u.id);
          if (error) return say('That update couldn’t be deleted.');
          await bucket().remove([`${u.image_path}-1600.jpg`, `${u.image_path}-800.jpg`]);
          list();
        }
      };
      box.append(r);
    });
  }
})();
