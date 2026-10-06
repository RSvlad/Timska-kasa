# Дневник измена

Формат прати [Keep a Changelog](https://keepachangelog.com/sr/1.1.0/), а верзионисање [Semantic Versioning](https://semver.org/lang/sr/).

## [0.0.4](https://github.com/RSvlad/Timska-kasa/compare/timska-kasa-v0.0.3...timska-kasa-v0.0.4) (2026-10-06)


### Features

* **report:** add PDF report with period selection ([24de032](https://github.com/RSvlad/Timska-kasa/commit/24de0320030f74821ed3438e62592b14ddc94c1a))
* **report:** add PDF report with period selection ([b9d8194](https://github.com/RSvlad/Timska-kasa/commit/b9d8194b405bf8998a5a804355a2c01ac0f35198))


### Bug Fixes

* **test:** exclude e2e-emulator from vitest ([a59907e](https://github.com/RSvlad/Timska-kasa/commit/a59907e0343241677ef9cde4cbe0ea260984208b))

## [0.0.3](https://github.com/RSvlad/Timska-kasa/compare/timska-kasa-v0.0.2...timska-kasa-v0.0.3) (2026-10-06)


### Features

* **firebase:** add optional Analytics via VITE_FIREBASE_MEASUREMENT_ID ([5aad1d9](https://github.com/RSvlad/Timska-kasa/commit/5aad1d968b6c98a85afbf5b1565ad61dc5d1a36b))
* **firebase:** add optional Analytics via VITE_FIREBASE_MEASUREMENT_ID ([dcb1733](https://github.com/RSvlad/Timska-kasa/commit/dcb1733988efbbe60f3cbb4f83ec640fc36c51f4))

## [0.0.2](https://github.com/RSvlad/Timska-kasa/compare/timska-kasa-v0.0.1...timska-kasa-v0.0.2) (2026-10-06)


### Features

* add pwa support with offline caching ([b01b275](https://github.com/RSvlad/Timska-kasa/commit/b01b275ace37fbc64144e3f71598dab4e0c461db))


### Bug Fixes

* **deps:** override gaxios uuid to 11.1.1 (GHSA uuid buffer bounds) ([05bc134](https://github.com/RSvlad/Timska-kasa/commit/05bc134d96c338055f0ce9eef4a1bbddac4209c7))
* **e2e:** provide dummy Firebase env so login screen renders in CI ([dfae88d](https://github.com/RSvlad/Timska-kasa/commit/dfae88d779f33bafe9c54ec8594cc2dad567f3b6))
* show config error instead of blank page and correct 404 redirect base ([c497eb8](https://github.com/RSvlad/Timska-kasa/commit/c497eb87e1a5fb02fcffc61c8c84f023199058cd))

## [Unreleased]

### Додато

- Модернизован README (бејџеви, демо линк, скрипте, променљиве окружења)
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`
- Шаблони за issue-е и Pull Request-ове, `CODEOWNERS`
- Dependabot за npm и GitHub Actions
- `.editorconfig` и `.nvmrc`

### Промењено

- `package.json`: метаподаци (опис, лиценца, repository, engines)
- `.gitignore`: Firebase и OS артефакти

## [0.0.1]

- Почетна верзија: каса, записи, категорије, фондови, улоге Admin/Viewer
