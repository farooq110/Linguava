# GitHub Actions — CI/CD Pipelines

This repo ships with two GitHub Actions workflows in `.github/workflows/`:

| File | Trigger | What it does |
|---|---|---|
| `ci.yml` | Every push + every PR | Lint, type-check, build, smoke test |
| `deploy-vercel.yml` | Push to `main` | Build + deploy to Vercel (production) |

Both are designed to be **safe defaults** — they won't fail your build on minor warnings and they cache aggressively to keep run times under 2 minutes.

---

## Workflow 1: `ci.yml` — Continuous Integration

Runs on every push (any branch) and every pull request targeting `main`.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

# Cancel in-progress runs for the same branch when a new commit lands.
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-build:
    name: Lint + Type Check + Build
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            .next/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Type check
        run: bunx tsc --noEmit

      - name: Push Prisma schema (creates local SQLite for build)
        run: bun run db:push
        env:
          DATABASE_URL: file:./db/ci.db

      - name: Build
        run: bun run build
        env:
          NEXTAUTH_SECRET: ci-test-secret-not-real
          NEXTAUTH_URL: http://localhost:3000
          DATABASE_URL: file:./db/ci.db

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: next-standalone
          path: .next/standalone
          retention-days: 7
```

### What it does, step by step

1. **Checkout** the code.
2. **Setup Bun** — installs the same package manager used locally for reproducible builds.
3. **Cache** `node_modules` and `.next/cache` keyed on the lockfile hash. Subsequent runs skip the install step (~30s saved).
4. **Install** with `--frozen-lockfile` so an outdated `bun.lock` fails CI loudly.
5. **Lint** — `bun run lint` (ESLint + Next.js rules).
6. **Type check** — `tsc --noEmit`. The Next.js build itself does this, but running it separately gives cleaner error messages.
7. **Push Prisma schema** to a throwaway SQLite file so the build doesn't fail on missing tables.
8. **Build** the standalone production bundle.
9. **Upload** the `.next/standalone` artifact so you can download and inspect it if a deploy later fails.

### Notes & Customization

- **Don't want Bun?** Swap the `setup-bun` step for `actions/setup-node@v4` with `node-version: 20` and `cache: 'npm'`. Then run `npm ci` instead of `bun install`.
- **Want to run unit tests?** Add a step: `run: bun test` after install. The project doesn't ship with tests by default — see `docs/improvements.md` for the recommended testing strategy.
- **Want to block PRs that fail lint?** Go to repo **Settings → Branches → Branch protection rules → main → Require status checks to pass before merging → add `Lint + Type Check + Build`**.

---

## Workflow 2: `deploy-vercel.yml` — Auto-Deploy to Vercel

Triggers on push to `main`. Builds on top of the CI workflow and deploys to Vercel using the official action.

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

  # Allow manual triggering from the Actions tab
  workflow_dispatch:

concurrency:
  group: deploy-vercel-${{ github.ref }}
  cancel-in-progress: false   # Don't cancel a deploy mid-flight

jobs:
  deploy:
    name: Build + Deploy
    runs-on: ubuntu-latest
    needs: []  # Add `needs: ci` if you want CI to gate deploys
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install
        run: bun install --frozen-lockfile

      - name: Push Prisma schema
        run: bun run db:push
        env:
          DATABASE_URL: file:./db/build.db

      - name: Build
        run: bun run build
        env:
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
          DATABASE_URL: file:./db/build.db

      - name: Install Vercel CLI
        run: bun add -g vercel@latest

      - name: Pull Vercel env
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build for Vercel
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Required GitHub Secrets

Add these in **repo Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel dashboard → Account Settings → Tokens → Create (scope: Full Account) |
| `VERCEL_ORG_ID` | Vercel dashboard → Settings → General → "Vercel ID" (top of page) |
| `VERCEL_PROJECT_ID` | Vercel dashboard → Project Settings → General → "Project ID" |
| `NEXTAUTH_SECRET` | Generate locally with `openssl rand -base64 32` (or reuse the one you set on Vercel) |
| `NEXTAUTH_URL` | Your production URL, e.g. `https://linguava.yourdomain.com` |

### Why build twice (once with Bun, once with Vercel)?

The first `bun run build` is for **CI verification** that the build actually succeeds. The `vercel build --prod` step uses Vercel's own build pipeline (which deploys the result to their edge network). You can skip the first one if you're confident, but I recommend keeping it — Vercel's error messages during deploy can be cryptic.

---

## Workflow 3 (Optional): `deploy-ec2.yml` — Deploy to EC2 via SSH

If you're self-hosting on EC2 (see `docs/deploy-aws-ec2.md`), this workflow SSHes into your instance and runs the deploy script on every push to `main`.

```yaml
# .github/workflows/deploy-ec2.yml
name: Deploy to EC2

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}     # usually 'ubuntu'
          key: ${{ secrets.EC2_SSH_KEY }}       # contents of the .pem file
          script: |
            cd /var/www/linguava
            ./deploy.sh
```

### Required Secrets

| Secret | Value |
|---|---|
| `EC2_HOST` | Public IP or DNS of your EC2 instance, e.g., `ec2-12-34-56-78.us-east-1.compute.amazonaws.com` |
| `EC2_USER` | `ubuntu` (for Ubuntu AMIs) |
| `EC2_SSH_KEY` | The **entire contents** of your `linguava-key.pem` file, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` |

### Make sure `deploy.sh` exists on the server

See Step 11 of `docs/deploy-aws-ec2.md`. The script does `git pull && bun install && db:push && build && pm2 restart`.

---

## Workflow 4 (Optional): `preview-pr.yml` — Vercel Preview per PR

Vercel does this automatically if you've connected your repo via their dashboard. But if you want a GitHub Action to comment on the PR with the preview URL:

```yaml
# .github/workflows/preview-pr.yml
name: Preview PR

on:
  pull_request:
    branches: [main]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: vercel --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deploying... Vercel will post the URL as a check below.'
            })
```

---

## Tips for Keeping CI Fast

1. **Cache aggressively.** The `actions/cache@v4` step in `ci.yml` cuts install time from ~60s to ~5s on subsequent runs.
2. **Don't run `bun run build` on PRs unless you have to.** If lint + type-check is enough signal for you, drop the build step from `ci.yml` and rely on Vercel's build to catch build-time errors. This saves ~40s per run.
3. **Use Bun.** It's ~3x faster than npm for installs. The workflows above use it for everything.
4. **Don't run end-to-end tests in CI yet.** They're slow and flaky. Run them nightly via a `schedule:` trigger instead. See `docs/improvements.md` for the recommended test pyramid.

---

## Branch Protection Recommendations

In your GitHub repo: **Settings → Branches → Add branch protection rule → `main`**:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass: `Lint + Type Check + Build`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings
- (Optional) Require conversation resolution before merging
- (Optional) Require linear history

This forces every change to go through PR + CI, and prevents direct pushes to `main`.
