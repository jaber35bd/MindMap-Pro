# MindMap Pro

EdrawMind-style mind mapping app: multi-diagram dashboard, rich node
editor, Google Drive sync (used as your database), GitHub Pages hosting.

## 1. Google Cloud Console setup (এইটাই আগের "Saved failed" সমস্যার আসল কারণ ছিল)

Age-r version e save fail howar sobcheye common karon: **OAuth Client ID
er "Authorized JavaScript origins" e apnar actual domain add kora chilo
na**, othoba purono `gapi.client` library load hote deri korto. Ei
notun version shudhu Google Identity Services (GIS) + shohoj `fetch()`
use kore Drive REST API call korte, tai eta onek beshi reliable — kintu
Console e correct configuration must:

1. https://console.cloud.google.com/apis/credentials e jan.
2. Apnar OAuth 2.0 Client ID (already in `js/config.js`) select korun.
3. **Authorized JavaScript origins** e add korun:
   - `http://localhost:PORT` (local test korar jonno, jekono port)
   - `https://<your-username>.github.io` (GitHub Pages er jonno)
4. Save korun — change effect hote 5-10 minute lagte pare.
5. OAuth consent screen e apnar Google account "Test user" hisebe add
   kora ache kina check korun (jodi app "Testing" mode e thake).
6. APIs & Services > Library e **Google Drive API** enabled ache kina
   check korun — na thakle enable korun.

`js/config.js` e already apnar Client ID r API key bosano ache — notun
kore kisu korte hobe na, khali Console e origin gulo add korle-i hobe.

## 2. Local test

Kono build step lagbe na — plain HTML/JS. Shudhu ekta local server
lagbe (file:// theke sorasori khule GIS kaj korbe na):

```bash
cd mindmap-pro
python3 -m http.server 8080
```

Tarpor browser e `http://localhost:8080` open korun. (Console e
`http://localhost:8080` origin hisebe add kora ache tar upor depend
kore.)

## 3. GitHub Pages e deploy

```bash
git init
git add .
git commit -m "MindMap Pro"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

Tarpor GitHub repo > Settings > Pages > Source: `main` branch, `/root`
folder select korun. Kisu minute por `https://<username>.github.io/<repo>/`
e live hoye jabe. **Mone rekhe:** ei URL Google Cloud Console e
authorized origin hisebe add korte hobe (step 1.3 dekhun) — nahole
sign-in fail korbe.

## What changed from the old version

- **`gapi.client` bad die dewa hoyeche** — shudhu GIS token + plain
  `fetch()` diye Drive REST v3 call kora hoy. Kom moving parts, kom
  race condition.
- **Retry + token refresh built in** — kono save 401/429/5xx e fail
  korle nijei backoff diye retry kore; token expire howar age-i silently
  refresh hoye jay.
- **localStorage safety net** — protyek change instant locally save
  hoy, tai Drive slow/down thakleo kaj kokhono hariye jay na. Status bar
  e dekha jabe "Saved locally, retrying cloud sync".
- **Visible Drive folder** — files ekhon "appDataFolder" (hidden) er
  bodole apnar normal Drive e ekta visible `MindMapPro` folder e thake,
  tai apni Drive.google.com theke o dekhte/backup nite parben.
- **Dashboard (index.html)** notun add kora hoyeche — EdrawMind-er moto
  card-grid e sob diagram, search, create/rename/duplicate/delete.

## Feature list

**Dashboard:** Google sign-in, diagram grid, search, create/rename/
duplicate/delete, import JSON, dark mode, storage usage indicator.

**Editor:**
- 4 layout: Radial, Tree (L→R), Tree (top→down), Fishbone
- Shapes: rounded, rectangle, ellipse, diamond, pill/cloud
- Per-node: fill/border/text color, bold/italic, font size, emoji icon,
  image thumbnail, link, note (hover tooltip), tag chip, progress bar
- Multi-select (Shift+drag rubber-band, Shift+click), drag to
  reposition, collapse/expand branches
- Undo/redo (Ctrl+Z / Ctrl+Y), autosave (local instant + Drive
  debounced), manual save (Ctrl+S)
- Copy/paste node (Ctrl+C / Ctrl+V), right-click context menu
- Keyboard shortcuts: Tab = add child, Enter = add sibling, Delete =
  remove, Ctrl+F = search
- Zoom/pan, fit-to-view, search-and-jump
- Export: PNG, SVG, JSON, Markdown outline. Import: JSON
- Presentation mode (step through nodes fullscreen)
- Share: generates a public **view-only** link (no sign-in needed to
  view) via Drive "anyone with the link" permission

## Notes / limits

- Uses Drive scope `drive.file`, so the app can only see files *it*
  created — it will never touch your other Drive files.
- The API key in `config.js` is only used for the read-only public
  share links (`?id=...&view=1`); consider restricting it to your
  domain in Console (APIs & Services > Credentials > API key >
  Application restrictions > HTTP referrers) since it's visible in the
  page source.
- Real-time multi-user co-editing isn't included (Drive REST here is
  single-writer, last-save-wins) — that would need a different backend
  (e.g. Firebase) if you need it later.
