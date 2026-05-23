# Deployment Guide

This file documents the commands to deploy the BobTester backend and frontend without testing each command manually.

## 1. Install dependencies

Run this from the workspace root:

```bash
npm --prefix api install
npm --prefix web install
```

## 2. Build both projects

```bash
npm --prefix api run build
npm --prefix web run build
```

If both builds succeed, the code is ready for deployment.

## 3. Deploy the backend (`/api`)

```bash
npx vercel deploy --prod --cwd api --yes
```

## 4. Deploy the frontend (`/web`)

```bash
npx vercel deploy --prod --cwd web --yes
```

## 5. One-line deployment

If you want to deploy both after a successful build in one command:

```bash
npx vercel deploy --prod --cwd api --yes && npx vercel deploy --prod --cwd web --yes
```

## 6. Quick verification

- Backend production URL: `https://bobtester-u9xe.vercel.app`
- Frontend production URL: `https://bobtester.vercel.app`

Use the Vercel dashboard or browser to confirm the site is live after the deploy.

## 7. Notes

- Use `--yes` to skip interactive prompts.
- `--cwd` makes sure the correct subproject is deployed.
- Always build first so deployment fails early on compile issues.
