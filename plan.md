# Deploy Smart Fasal Kisan Alert to Vercel

## 1. Goal
Deploy the existing static Smart Fasal Kisan Alert prototype to Vercel production for hackathon submission.

## 2. Problem
The repo currently has static files in `public/`, but it needs minimal Vercel config and a build script so Vercel can publish a production deployment.

## 3. Proposed solution
Add a small npm build script that copies `public/` into `dist/`, configure Vercel to serve `dist/`, then commit, push, and deploy with the Vercel CLI.

## 4. Files to change
- `.gitignore`
- `package.json`
- `vercel.json`
- `plan.md`

## 5. Step by step tasks
1. Confirm required static files exist.
2. Remove `.DS_Store`.
3. Add deployment config files.
4. Run `npm run build`.
5. Commit and push to `origin/main`.
6. Deploy with `npx vercel --prod --yes`.

## 6. Acceptance criteria
- `npm run build` succeeds.
- `dist/index.html`, `dist/styles.css`, and `dist/app.js` exist.
- Changes are pushed to GitHub.
- Vercel returns a production URL.

## 7. Testing plan
Run the build command locally and confirm the copied static files exist in `dist/`.

## 8. Open questions
None for this deployment task.
