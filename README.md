<div align="center">

# 💰 Тимска каса

**Најбоља бесплатна опција за вођење касе тима или организације.**

[![CI](https://github.com/RSvlad/Timska-kasa/actions/workflows/ci.yml/badge.svg)](https://github.com/RSvlad/Timska-kasa/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/RSvlad/Timska-kasa)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/RSvlad/Timska-kasa)](https://github.com/RSvlad/Timska-kasa/commits/main)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025e8c?logo=dependabot)](.github/dependabot.yml)

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-ffca28?logo=firebase&logoColor=black)

[**🚀 Демо**](https://rsvlad.github.io/Timska-kasa/) · [Речник домена](docs/glossary.md) · [Пријава грешке](https://github.com/RSvlad/Timska-kasa/issues/new?template=bug_report.yml) · [Предлог функције](https://github.com/RSvlad/Timska-kasa/issues/new?template=feature_request.yml)

</div>

Апликација за праћење финансија малог тима или организације — једна заједничка каса, потпуна историја промета и алокација средстава у наменске фондове за планиране трошкове. Без бекенда, без сервера — искључиво Google/Firebase инфраструктура иза статичког React фронтенда.

## ПТСД принципи

Четири стуба на којима је апликација заснована:

|     | Принцип             | Шта то значи                                                                                             |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| 👁️  | **Прегледност**     | Лак приступ информацијама — дашборд, филтери и историја промета на једном месту                          |
| 🔍  | **Транспарентност** | Свака промена у каси остаје трајно евидентирана; ништа се тихо не брише (меко брисање, потпуна историја) |
| 🔒  | **Сигурност**       | Google/Firebase инфраструктура и строго раздвојене улоге приступа (Admin / Viewer)                       |
| 🆓  | **Доступност**      | Бесплатан хостинг (GitHub Pages) и бесплатна Firebase инфраструктура — нула трошкова покретања           |

---

## Садржај

- [Шта апликација ради](#шта-апликација-ради)
- [Архитектура](#архитектура)
- [Домен](#домен)
- [Tech stack](#tech-stack)
- [Структура пројекта](#структура-пројекта)
- [Брзи почетак](#брзи-почетак)
- [Firebase подешавање](#firebase-подешавање)
- [Деплој](#деплој)
- [Допринос](#допринос)
- [Безбедност](#безбедност)
- [Лиценца](#лиценца)

---

## Шта апликација ради

Систем прати **Тимску касу** — јединствени финансијски фонд тима или организације који сви корисници виде идентично. Нема личних новчаника нити изолације по кориснику; ово није лична финансијска апликација, већ алат за евиденцију заједничких средстава.

**Кључне могућности:**

- 📥 Евиденција прихода и расхода, сваки са износом, валутом, категоријом, контрагентом и опционом сликом рачуна
- 🌍 Подршка за више валута истовремено — без конверзије; свака валута прати сопствени салдо
- 🏷️ Категоризација записа са могућношћу измене и меког брисања (историја се не губи)
- 📊 Дашборд са агрегираним стањем касе, филтрирањем по периоду, категорији, типу и валути
- 🎯 **Фондови** — именоване алокације новца из касе за одређену намену (нпр. "Фонд за опрему"), без двоструке евиденције баланса
- 👥 Две улоге приступа: **Admin** (пуна контрола) и **Viewer** (само читање)

---

## Архитектура

Пројекат је организован по принципима **Domain-Driven Design**, подељен у два bounded context-а:

```
┌──────────────────────────────┐        ┌────────────────────────────────────┐
│        Identity BC           │        │            Finance BC              │
│                              │        │                                    │
│  Firebase Auth (external)    │──U/D──▶│  Тимска каса                       │
│  Firestore: allowedUsers     │        │  Финансијски запис                 │
│                              │        │  Категорија · Фонд                 │
│  Улоге:                      │        │                                    │
│    Admin  → CRUD записа      │        │  Read Model: Стање касе             │
│    Viewer → само читање      │        │  (агрегација на клијенту)          │
└──────────────────────────────┘        └────────────────────────────────────┘
              │                                          │
              └──────────────── React UI ────────────────┘
                             (GitHub Pages)
```

**Identity** је upstream context: Finance при свакој операцији чита улогу корисника из Firebase custom claims, а стварно спровођење права приступа дешава се на нивоу Firestore security rules — не у клијентском коду.

Сваки bounded context у коду прати исти слојевити распоред:

| Слој              | Одговорност                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `domain/`         | Ентитети, агрегати, вредносни објекти — чиста бизнис логика, без зависности од Firebase-а |
| `application/`    | React хукови који оркестрирају domain и infrastructure слој (use case-ови)                |
| `infrastructure/` | Repository имплементације — комуникација са Firestore/Storage                             |
| `ui/`             | React компоненте — презентациони слој                                                     |

Домен нема сопствени бекенд сервер: безбедност и интегритет података ослањају се искључиво на Firestore security rules, чиме је фронтенд-само приступ безбедан и без додатне инфраструктуре.

---

## Домен

### Тимска каса и Финансијски запис

Сваки унос новца (приход или расход) чува тачан износ (са валутом), датум, категорију, контрагента, аутора записа и опционо слику рачуна. Салдо касе рачуна се на клијенту агрегацијом свих записа, одвојено по свакој валути — нема аутоматске конверзије курса.

### Категорије

Записи се класификују категоријама које Admin може додавати, мењати и меко брисати (деактивирати). Свака деактивирана категорија и даље се исправно приказује на старим записима, само означена као `(деактивирана)`. Постоји по једна заштићена системска категорија **„Непознато"** за приходе и расходе — гарантује да сваки запис увек има валидну категорију, чак и ако је оригинална избрисана.

### Фондови

Фонд је **алокација** дела касе за одређену намену (нпр. "Фонд за путовање") — не одвојени финансијски рачун. Алоцирани износ не сме прећи капацитет фонда, а свако повећање алокације ограничено је тренутно слободним делом касе у датој валути. На овај начин се избегава двострука евиденција новца.

### Приступ

Систем нема јавну регистрацију. Приступ имају искључиво корисници на **whitelist-и** (Firestore колекција `allowedUsers`), коју управља Admin директно кроз Firebase конзолу. Пријава се врши преко Google Sign-In.

Потпун речник домена налази се у [`docs/glossary.md`](docs/glossary.md), а архитектонске одлуке у [`docs/adr/`](docs/adr/README.md).

---

## Tech stack

| Слој                 | Технологија                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| Frontend             | React 18 + TypeScript, Vite                                            |
| Аутентификација      | Firebase Authentication (Google Sign-In)                               |
| База података        | Cloud Firestore                                                        |
| Складиштење фајлова  | Firebase Storage (слике рачуна)                                        |
| Хостовање            | GitHub Pages (статички build)                                          |
| CI                   | GitHub Actions (type-check + build)                                    |
| Одржавање зависности | Dependabot                                                             |
| Бекенд сервер        | — нема; сва логика извршава се на клијенту уз Firestore security rules |

---

## Структура пројекта

```
src/
├── finance/                    # Finance bounded context
│   ├── domain/                 # FinanceRecord, Category, Fund (Фонд), Amount
│   ├── application/            # useRecordList, useCategoryList, useFundList,
│   │                           # fundService, useReceiptUpload
│   ├── infrastructure/         # FinanceRecordRepository, CategoryRepository,
│   │                           # FundRepository, ReceiptStorage
│   └── ui/                     # Dashboard, RecordList, CategoryList, FundsPage
│
├── identity/                   # Identity bounded context
│   ├── domain/                 # User
│   ├── application/            # AuthContext
│   └── infrastructure/         # UserRepository
│
├── shared/
│   └── infrastructure/         # firebase.ts (заједничка Firebase конфигурација)
│
├── App.tsx
└── main.tsx

.github/                        # CI, Dependabot, шаблони за issue-е и PR-ове
firestore.rules · storage.rules # Правила приступа (извор истине за безбедност)
```

Путање `@finance`, `@identity` и `@shared` су алијаси подешени у `vite.config.ts` и `tsconfig.json`.

---

## Брзи почетак

### Предуслови

- Node.js 22 (видети [`.nvmrc`](.nvmrc))
- Firebase пројекат са омогућеним Authentication (Google Sign-In), Firestore и Storage

### Кораци

```bash
# инсталација зависности
npm ci

# копирање .env шаблона и попуњавање Firebase конфигурације
cp .env.example .env

# development сервер
npm run dev
```

### Доступне скрипте

| Скрипта           | Опис                                     |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Development сервер са hot reload-ом      |
| `npm run build`   | Type-check (`tsc -b`) и production build |
| `npm run preview` | Локални преглед production build-а       |
| `npm run deploy`  | Build и објава на GitHub Pages           |

### Променљиве окружења

Све променљиве су Firebase Web SDK конфигурација (види [`.env.example`](.env.example)). Ово **нису тајне** — Web API кључ је јаван по дизајну, а заштиту података обезбеђују [Firestore](firestore.rules) и [Storage](storage.rules) правила.

---

## Firebase подешавање

1. Направити Firebase пројекат и укључити **Google Sign-In** као auth провајдера.
2. У Firestore-у ручно креирати колекцију `allowedUsers` са бар једним документом чији је **ID email адреса Admin корисника**, и пољем које означава улогу.
3. Применити правила из [`firestore.rules`](firestore.rules) и [`storage.rules`](storage.rules) — кроз конзолу или Firebase CLI-јем:
   ```bash
   npx firebase-tools deploy --only firestore,storage
   ```
4. Попунити `.env` фајл на основу [`.env.example`](.env.example) Firebase Web SDK конфигурацијом.

Пошто нема Admin UI-а за whitelist, додавање и уклањање корисника ради се искључиво директно кроз Firebase конзолу.

---

## Деплој

```bash
npm run deploy
```

Скрипта покреће production build и објављује садржај `dist/` фолдера на GitHub Pages (`gh-pages` пакет). Базна путања апликације подешена је за project page хостовање (`/Timska-kasa/`).

---

## Допринос

Доприноси су добродошли! Погледајте [`CONTRIBUTING.md`](CONTRIBUTING.md) за упутства и [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) за правила понашања. Измене се бележе у [`CHANGELOG.md`](CHANGELOG.md).

## Безбедност

Уочену рањивост молимо пријавите приватно, према упутству у [`SECURITY.md`](SECURITY.md) — не кроз јавне issue-е.

## Лиценца

Дистрибуира се под [MIT лиценцом](LICENSE).
