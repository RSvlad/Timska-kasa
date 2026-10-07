<div align="center">

# 💰 Team Fund (Тимска каса)

**The best free way to manage a team's or organization's shared fund.**

[![CI](https://github.com/RSvlad/Timska-kasa/actions/workflows/ci.yml/badge.svg)](https://github.com/RSvlad/Timska-kasa/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/RSvlad/Timska-kasa)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/RSvlad/Timska-kasa)](https://github.com/RSvlad/Timska-kasa/commits/main)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025e8c?logo=dependabot)](.github/dependabot.yml)

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-ffca28?logo=firebase&logoColor=black)

🌐 [Српски](README.md) · **English**

[**🚀 Demo**](https://rsvlad.github.io/Timska-kasa/) · [Domain glossary](docs/glossary.md) · [Report a bug](https://github.com/RSvlad/Timska-kasa/issues/new?template=bug_report.yml) · [Suggest a feature](https://github.com/RSvlad/Timska-kasa/issues/new?template=feature_request.yml)

</div>

An app for tracking the finances of a small team or organization — one shared fund, a complete transaction history, and allocation of money into dedicated funds for planned expenses. No backend, no server — only Google/Firebase infrastructure behind a static React frontend.

> 📋 **This is a template repository.** To run your own version for your team or organization, just click **[Use this template](https://github.com/RSvlad/Timska-kasa/generate)** — more details in the [Your own version](#your-own-version-template) section.

## PTSD principles

(In Serbian: _Прегледност, Транспарентност, Сигурност, Доступност_ — Clarity, Transparency, Security, Accessibility.) The four pillars the app is built on:

|     | Principle         | What it means                                                                                             |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| 👁️  | **Clarity**       | Easy access to information — dashboard, filters, and transaction history in one place                     |
| 🔍  | **Transparency**  | Every change to the fund is permanently recorded; nothing is silently deleted (soft delete, full history) |
| 🔒  | **Security**      | Google/Firebase infrastructure and strictly separated access roles (Admin / Viewer)                       |
| 🆓  | **Accessibility** | Free hosting (GitHub Pages) and free Firebase infrastructure — zero running costs                         |

---

## Contents

- [What the app does](#what-the-app-does)
- [Architecture](#architecture)
- [Domain](#domain)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Firebase setup](#firebase-setup)
- [Your own version (template)](#your-own-version-template)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## What the app does

The system tracks the **Team Fund** — a single financial pool of a team or organization that all users see identically. There are no personal wallets or per-user isolation; this is not a personal finance app but a tool for recording shared money.

**Key features:**

- 📥 Income and expense records, each with an amount, currency, category, counterparty, and an optional receipt image
- 🌍 Multiple currencies at once — no conversion; each currency tracks its own balance
- 🏷️ Record categorization with editing and soft deletion (history is never lost)
- 📊 Dashboard with the aggregated fund balance, filterable by period, category, type, and currency
- 🎯 **Funds** — named allocations of money from the fund for a specific purpose (e.g. "Equipment fund"), without double-counting the balance
- 👥 Two access roles: **Admin** (full control) and **Viewer** (read-only)
- 🌐 **Two languages** — Serbian (Cyrillic) and English, switchable in the app at any time
- 📱 **PWA** — installable on a phone or computer and runnable as a standalone app

---

## Architecture

The project follows **Domain-Driven Design** principles and is split into two bounded contexts:

```
┌──────────────────────────────┐        ┌────────────────────────────────────┐
│        Identity BC           │        │            Finance BC              │
│                              │        │                                    │
│  Firebase Auth (external)    │──U/D──▶│  Team Fund                         │
│  Firestore: allowedUsers     │        │  Finance Record                    │
│                              │        │  Category · Fund                   │
│  Roles:                      │        │                                    │
│    Admin  → CRUD on records  │        │  Read Model: Fund Balance          │
│    Viewer → read-only        │        │  (aggregated on the client)        │
└──────────────────────────────┘        └────────────────────────────────────┘
              │                                          │
              └──────────────── React UI ────────────────┘
                             (GitHub Pages)
```

**Identity** is the upstream context: on every operation Finance reads the user's role from Firebase custom claims, while access rights are actually enforced at the Firestore security rules level — not in client code.

Each bounded context in the code follows the same layered layout:

| Layer             | Responsibility                                                                    |
| ----------------- | --------------------------------------------------------------------------------- |
| `domain/`         | Entities, aggregates, value objects — pure business logic, no Firebase dependency |
| `application/`    | React hooks that orchestrate the domain and infrastructure layers (use cases)     |
| `infrastructure/` | Repository implementations — communication with Firestore/Storage                 |
| `ui/`             | React components — the presentation layer                                         |

The domain has no backend server of its own: security and data integrity rely solely on Firestore security rules, which keeps the frontend-only approach safe without extra infrastructure.

---

## Domain

### Team Fund and Finance Record

Every money entry (income or expense) stores the exact amount (with currency), date, category, counterparty, the record's author, and optionally a receipt image. The fund balance is computed on the client by aggregating all records, separately for each currency — there is no automatic exchange-rate conversion.

### Categories

Records are classified by categories that an Admin can add, edit, and soft-delete (deactivate). A deactivated category still displays correctly on old records, just marked as `(deactivated)`. There is one protected system category **"Unknown"** each for income and expenses — it guarantees that every record always has a valid category, even if the original one was deleted.

### Funds

A Fund is an **allocation** of part of the team fund for a specific purpose (e.g. "Trip fund") — not a separate financial account. The allocated amount cannot exceed the fund's capacity, and any increase of an allocation is limited by the currently free part of the fund in that currency. This avoids double-counting money.

### Access

The system has no public registration. Only users on the **whitelist** (the Firestore collection `allowedUsers`), managed by an Admin directly through the Firebase console, have access. Sign-in is done via Google Sign-In.

The full domain glossary is in [`docs/glossary.md`](docs/glossary.md), and architectural decisions are in [`docs/adr/`](docs/adr/README.md).

---

## Tech stack

| Layer             | Technology                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Frontend          | React 19 + TypeScript, Vite 8                                       |
| PWA               | vite-plugin-pwa (Workbox, offline cache of static assets)           |
| Authentication    | Firebase Authentication (Google Sign-In)                            |
| Database          | Cloud Firestore                                                     |
| File storage      | Firebase Storage (receipt images)                                   |
| Localization      | Built-in lightweight i18n (`src/shared/i18n`), Serbian + English    |
| Testing           | Vitest (unit), Playwright (e2e), Firebase Emulator (security rules) |
| Code quality      | ESLint, Prettier, Husky + lint-staged, commitlint (Conventional)    |
| Hosting           | GitHub Pages (static build)                                         |
| CI/CD             | GitHub Actions (lint, tests, build, e2e, CodeQL, automatic deploy)  |
| Versioning        | release-please (automatic CHANGELOG and releases)                   |
| Dependency upkeep | Dependabot                                                          |
| Backend server    | — none; all logic runs on the client with Firestore security rules  |

---

## Project structure

```
src/
├── finance/                    # Finance bounded context
│   ├── domain/                 # FinanceRecord, Category, Fund, Amount
│   ├── application/            # FinanceDataProvider, recordService, categoryService,
│   │                           # fundService, receiptAccess, useRecordList,
│   │                           # useCategoryList, useFundList, useReceiptUpload
│   ├── infrastructure/         # FinanceRecordRepository, CategoryRepository,
│   │                           # FundRepository, ReceiptStorage, seedSystemCategories
│   └── ui/                     # Dashboard, RecordList, CategoryList, FundsPage
│
├── identity/                   # Identity bounded context
│   ├── domain/                 # User
│   ├── application/            # AuthContext
│   └── infrastructure/         # UserRepository
│
├── shared/
│   ├── i18n/                   # Locale, I18nProvider, useT, defineMessages
│   ├── infrastructure/         # firebase.ts, omitUndefined
│   └── ui/                     # ConfirmDialog, ErrorBoundary, LanguageSwitcher
│
├── App.tsx
└── main.tsx

e2e/                            # Playwright e2e tests (sign-in, PWA)
rules-tests/                    # Firestore/Storage rules tests (Firebase Emulator)
docs/                           # Domain glossary and ADRs
public/                         # Static assets and PWA icons
.github/                        # CI, CodeQL, deploy, release-please, templates
firestore.rules · storage.rules # Access rules (the source of truth for security)
```

The `@finance`, `@identity`, and `@shared` paths are aliases configured in `vite.config.ts` and `tsconfig.json`.

### Localization

The app supports **Serbian (Cyrillic)** and **English**. On first visit the language is detected from the browser (Serbian → Serbian, anything else → English); the choice made with the **СР / EN** button (top bar and sign-in screen) is stored in `localStorage`.

Each module keeps its own typed message catalog next to its code (e.g. `src/App.messages.ts`, `src/shared/ui/messages.ts`), created with `defineMessages({ sr: {...}, en: {...} })` — TypeScript fails the build if a key is missing in either language. Components read texts through `useT(messages)`.

---

## Quick start

### Prerequisites

- Node.js 22 (see [`.nvmrc`](.nvmrc))
- A Firebase project with Authentication (Google Sign-In), Firestore, and Storage enabled

### Steps

```bash
# install dependencies
npm ci

# copy the .env template and fill in the Firebase configuration
cp .env.example .env

# development server
npm run dev
```

### Available scripts

| Script               | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Development server with hot reload                             |
| `npm run build`      | Type-check (`tsc -b`) and production build                     |
| `npm run preview`    | Local preview of the production build                          |
| `npm run lint`       | ESLint check                                                   |
| `npm run format`     | Code formatting (Prettier); `format:check` only checks         |
| `npm test`           | Unit tests (Vitest); `test:coverage` adds a coverage report    |
| `npm run test:e2e`   | Playwright e2e tests                                           |
| `npm run test:rules` | Security rules tests with the Firebase Emulator                |
| `npm run deploy`     | Manual deploy: lint, tests, build, and publish to GitHub Pages |

### Environment variables

All variables are Firebase Web SDK configuration (see [`.env.example`](.env.example)). These are **not secrets** — the Web API key is public by design, and data is protected by the [Firestore](firestore.rules) and [Storage](storage.rules) rules.

---

## Firebase setup

1. Create a Firebase project and enable **Google Sign-In** as an auth provider.
2. In Firestore, manually create the `allowedUsers` collection with at least one document whose **ID is the Admin user's email address**, and a field indicating the role.
3. Apply the rules from [`firestore.rules`](firestore.rules) and [`storage.rules`](storage.rules) — through the console or with the Firebase CLI:
   ```bash
   npx firebase-tools deploy --only firestore,storage
   ```
4. Fill in the `.env` file from [`.env.example`](.env.example) with the Firebase Web SDK configuration.

Since there is no Admin UI for the whitelist, users are added and removed exclusively through the Firebase console.

---

## Your own version (template)

The repository is marked as a **template repo**, so anyone can create an independent copy without forking and without commit history:

1. Click **Use this template → Create a new repository** (or open [this link](https://github.com/RSvlad/Timska-kasa/generate)).
2. Create your own Firebase project and follow the [Firebase setup](#firebase-setup) instructions.
3. In the new repository's settings (**Settings → Secrets and variables → Actions**) add the `VITE_FIREBASE_*` secrets and enable **GitHub Pages** (source: GitHub Actions).
4. If the new repository is not named `Timska-kasa`, replace the path `/Timska-kasa/` in [`vite.config.ts`](vite.config.ts) (`base`, `start_url`, `scope`, `navigateFallback`) and in `.firebaserc` if needed.
5. Update the demo links and badges in this README to your own repository.

After that, every push to `main` automatically deploys your version.

---

## Deployment

Deployment is automatic: every push to `main` triggers the [`deploy.yml`](.github/workflows/deploy.yml) workflow (lint → tests → build → GitHub Pages). Firebase configuration is read from GitHub Secrets (`VITE_FIREBASE_*`). The app's base path is set up for project-page hosting (`/Timska-kasa/`).

Manual deploy (from a local machine, requires a filled-in `.env`):

```bash
npm run deploy
```

---

## Contributing

Contributions are welcome! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for instructions and [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for the code of conduct. Changes are logged in [`CHANGELOG.md`](CHANGELOG.md).

## Security

Please report any vulnerability privately, following the instructions in [`SECURITY.md`](SECURITY.md) — not through public issues.

## License

Distributed under the [MIT license](LICENSE).
