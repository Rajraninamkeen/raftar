# Raftaar — typing training for Indian competitive exams

Free typing trainer for SSC, UPSSSC, RRB NTPC, Delhi Police, CAPF, DSSSB, KVS, EPFO, courts and more.
User apna exam aur din (3–60) chunta hai, aur Raftaar day-by-day plan banata hai: drills, timed tasks aur
exam-mode tests (English + Hindi Inscript). Koi payment, login ya server nahi hai. Saara data user ke browser
(localStorage) mein save hota hai.

---

## GitHub Pages par host kaise karein

Build ke baad poori site **ek hi file** (`dist/index.html`) ban jaati hai. CSS aur JS usi file ke andar
hote hain, isliye ye kisi bhi repo naam ke saath chalti hai (`https://username.github.io/repo-name/`).

### Option A: Automatic deploy (recommended)

1. GitHub par ek naya repository banayein, jaise `raftaar`.
2. Is project ki saari files push karein (`node_modules` aur `dist` push na karein, `.gitignore` ye khud
   rok deta hai):

   ```bash
   git init
   git add .
   git commit -m "Raftaar typing trainer"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

3. Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions** select karein.
4. **Actions** tab mein "Deploy to GitHub Pages" workflow chalega (1–2 minute).
   Site live ho jaayegi: `https://<username>.github.io/<repo>/`

Iske baad har `git push` par site apne aap update hogi. Workflow file: `.github/workflows/deploy.yml`.

### Option B: Sirf ek file upload (koi build GitHub par nahi)

1. Apne computer par: `npm install` phir `npm run build`.
2. `dist/index.html` naam ki ek file banegi. Wahi poori website hai.
3. GitHub par naya repo banayein → **Add file → Upload files** → `index.html` upload karein.
4. **Settings → Pages → Source: Deploy from a branch → Branch: `main`, Folder: `/ (root)`** → Save.

### Custom domain (optional)

Settings → Pages → Custom domain mein apna domain daalein aur apne DNS mein GitHub ke bataye records add karein.

---

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/index.html banata hai
```

## Exam data kaise update karein

Saare exam rules `src/data/exams.ts` mein hain. Har exam ke saath source (`ref`), official website (`site`)
aur `CHECKED_ON` date hai. Nayi notification aaye to speed, time ya rules wahin badlein aur `CHECKED_ON`
update kar dein. Practice passages `src/data/passages.ts` mein hain.
Zero se sikhane wala course (26 English + 23 Hindi Inscript lessons) `src/data/lessons.ts` mein hai.

## Data aur privacy

- Plan, test history aur weak-key data sirf browser ke `localStorage` mein (`raftaar:v1:*` keys) save hota hai.
- Koi server, analytics ya cookie nahi hai. User "Your progress" section se CSV export ya data clear kar sakta hai.

## Disclaimer

Raftaar ek independent practice tool hai. Ye SSC, UPSSSC, RRB ya kisi government body se juda hua nahi hai.
Exam ki requirement hamesha latest official notification mein confirm karein.
