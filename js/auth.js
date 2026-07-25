/* =========================================================================
   auth.js — Google Identity Services (GIS) + Drive REST v3 helper layer.

   Age-r version gapi.client library use korto, jeta load hote time nite
   pare ebong "gapi not ready" race condition toiri korto — eta-i ছিল
   "bar bar Saved failed" error-er sobcheye common karon. Ei version
   shudhu GIS (token) + plain fetch() use kore, kono gapi.client lagbe
   na. Simple, debug-joggo, r 401 hole nijei silently token refresh kore
   retry kore.
   ========================================================================= */

const Auth = (() => {
  let tokenClient = null;
  let accessToken = null;
  let tokenExpiresAt = 0;
  let currentUser = null;
  let onStatusChange = () => {};
  let signInResolvers = [];

  function init(statusCallback) {
    onStatusChange = statusCallback || (() => {});
    return new Promise((resolve, reject) => {
      function tryInit() {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
          return false;
        }
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
          scope: APP_CONFIG.GOOGLE_SCOPES,
          callback: async (resp) => {
            if (resp.error) {
              console.error('Token error:', resp);
              onStatusChange('error', resp.error);
              signInResolvers.forEach(r => r.reject(resp));
              signInResolvers = [];
              return;
            }
            accessToken = resp.access_token;
            tokenExpiresAt = Date.now() + (Number(resp.expires_in || 3500) * 1000);
            await fetchProfile();
            onStatusChange('signed-in', currentUser);
            signInResolvers.forEach(r => r.resolve(accessToken));
            signInResolvers = [];
          },
          error_callback: (err) => {
            console.error('GIS error_callback:', err);
            onStatusChange('error', err);
            signInResolvers.forEach(r => r.reject(err));
            signInResolvers = [];
          }
        });
        resolve();
        return true;
      }
      if (tryInit()) return;
      // gis script defer/async — wait for it
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (tryInit() || tries > 100) clearInterval(iv);
        if (tries > 100) reject(new Error('Google Identity Services load hoy ni. Internet check korun.'));
      }, 100);
    });
  }

  async function fetchProfile() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error('userinfo fetch failed');
      currentUser = await res.json();
    } catch (e) {
      console.warn('Profile fetch skip:', e);
      currentUser = { name: 'Google User', picture: '', email: '' };
    }
  }

  function signIn(interactive = true) {
    return new Promise((resolve, reject) => {
      if (!tokenClient) return reject(new Error('Auth not initialized'));
      signInResolvers.push({ resolve, reject });
      tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
    });
  }

  function signOut() {
    if (accessToken) {
      try { google.accounts.oauth2.revoke(accessToken, () => {}); } catch (e) {}
    }
    accessToken = null;
    tokenExpiresAt = 0;
    currentUser = null;
    onStatusChange('signed-out', null);
  }

  function isSignedIn() { return !!accessToken; }
  function getUser() { return currentUser; }

  // Token expire howar ~60s age thakteo refresh kore rakhi, jate mid-edit
  // save kokhono 401 e block na hoy.
  async function ensureFreshToken() {
    if (accessToken && Date.now() < tokenExpiresAt - 60000) return accessToken;
    if (!tokenClient) throw new Error('Auth not initialized');
    return signIn(false);
  }

  return { init, signIn, signOut, isSignedIn, getUser, ensureFreshToken, get accessToken() { return accessToken; } };
})();


/* =========================================================================
   DriveApi — sob Drive REST call ekhane. Every call auto-retry kore
   token refresh + exponential backoff diye (network hiccup / 401 / 429 /
   5xx sob handle kore).
   ========================================================================= */

const DriveApi = (() => {
  const BASE = 'https://www.googleapis.com/drive/v3';
  const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
  let cachedFolderId = null;

  async function request(url, options = {}, attempt = 1) {
    const token = await Auth.ensureFreshToken();
    const headers = Object.assign({}, options.headers, { Authorization: `Bearer ${token}` });
    let res;
    try {
      res = await fetch(url, Object.assign({}, options, { headers }));
    } catch (networkErr) {
      if (attempt <= 4) {
        await sleep(400 * attempt);
        return request(url, options, attempt + 1);
      }
      throw new Error('Network error — internet সংযোগ check করুন।');
    }
    if (res.status === 401 && attempt <= 2) {
      // token expired mid-flight — force one re-auth then retry
      await Auth.signIn(false);
      return request(url, options, attempt + 1);
    }
    if ((res.status === 429 || res.status >= 500) && attempt <= 5) {
      await sleep(500 * Math.pow(2, attempt));
      return request(url, options, attempt + 1);
    }
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (e) {}
      throw new Error(`Drive API error ${res.status}${detail ? ': ' + detail : ''}`);
    }
    return res;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function ensureAppFolder() {
    if (cachedFolderId) return cachedFolderId;
    const q = encodeURIComponent(
      `name='${APP_CONFIG.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`
    );
    const res = await request(`${BASE}/files?q=${q}&fields=files(id,name)&spaces=drive`);
    const data = await res.json();
    if (data.files && data.files.length) {
      cachedFolderId = data.files[0].id;
      return cachedFolderId;
    }
    const createRes = await request(`${BASE}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: APP_CONFIG.DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
    });
    const created = await createRes.json();
    cachedFolderId = created.id;
    return cachedFolderId;
  }

  async function listDiagrams() {
    const folderId = await ensureAppFolder();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const res = await request(
      `${BASE}/files?q=${q}&fields=files(id,name,modifiedTime,description,starred)&orderBy=modifiedTime desc&pageSize=200`
    );
    const data = await res.json();
    return data.files || [];
  }

  async function createDiagram(name, jsonContent) {
    const folderId = await ensureAppFolder();
    const metadata = { name, parents: [folderId], mimeType: 'application/json' };
    const boundary = 'mmpro_boundary_' + Math.random().toString(36).slice(2);
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonContent}\r\n--${boundary}--`;
    const res = await request(`${UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,modifiedTime`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body
    });
    return res.json();
  }

  async function updateDiagramContent(fileId, jsonContent) {
    const res = await request(`${UPLOAD_BASE}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: jsonContent
    });
    return res.json();
  }

  async function renameDiagram(fileId, newName) {
    const res = await request(`${BASE}/files/${fileId}?fields=id,name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    return res.json();
  }

  async function deleteDiagram(fileId) {
    await request(`${BASE}/files/${fileId}`, { method: 'DELETE' });
  }

  async function getDiagramContent(fileId) {
    const res = await request(`${BASE}/files/${fileId}?alt=media`);
    return res.text();
  }

  async function duplicateDiagram(fileId, newName) {
    const folderId = await ensureAppFolder();
    const res = await request(`${BASE}/files/${fileId}/copy?fields=id,name,modifiedTime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, parents: [folderId] })
    });
    return res.json();
  }

  async function setPublicReadable(fileId, makePublic) {
    if (makePublic) {
      await request(`${BASE}/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      });
    } else {
      const res = await request(`${BASE}/files/${fileId}/permissions?fields=permissions(id,type)`);
      const data = await res.json();
      const anyonePerm = (data.permissions || []).find(p => p.type === 'anyone');
      if (anyonePerm) {
        await request(`${BASE}/files/${fileId}/permissions/${anyonePerm.id}`, { method: 'DELETE' });
      }
    }
  }

  return {
    ensureAppFolder, listDiagrams, createDiagram, updateDiagramContent,
    renameDiagram, deleteDiagram, getDiagramContent, duplicateDiagram, setPublicReadable
  };
})();


/* =========================================================================
   LocalCache — Drive e save howar age/fail korle o kaj hariye jabe na.
   Prottek diagram er jonno localStorage e ekta copy thake, ei ta "offline
   safety net" hisebe kaj kore.
   ========================================================================= */

const LocalCache = (() => {
  function key(id) { return APP_CONFIG.LOCAL_CACHE_PREFIX + id; }

  function save(id, jsonContent) {
    try { localStorage.setItem(key(id), jsonContent); } catch (e) { console.warn('LocalCache save failed', e); }
  }
  function load(id) {
    try { return localStorage.getItem(key(id)); } catch (e) { return null; }
  }
  function remove(id) {
    try { localStorage.removeItem(key(id)); } catch (e) {}
  }
  return { save, load, remove };
})();
