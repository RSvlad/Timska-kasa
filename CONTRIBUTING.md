# Допринос пројекту

Хвала што желите да допринесете Тимској каси! 🎉

## Покретање локално

```bash
git clone https://github.com/RSvlad/Timska-kasa.git
cd Timska-kasa
npm ci
cp .env.example .env   # попунити Firebase конфигурацију
npm run dev
```

Потребан је Node.js 22 (`nvm use` ће прочитати [`.nvmrc`](.nvmrc)). За тестирање препоручујемо **посебан Firebase пројекат**, а не продукцијски.

## Радни ток

1. Направите fork и грану из `main`: `feat/кратак-опис` или `fix/кратак-опис`.
2. Направите измене и проверите да пролази `npm run build` (укључује type-check).
3. Отворите Pull Request и попуните шаблон.
4. CI мора проћи пре спајања.

## Конвенције

- **Commit поруке:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- **Архитектура:** поштујте DDD слојеве (`domain/` → `application/` → `infrastructure/` → `ui/`). `domain/` не сме зависити од Firebase-а.
- **Безбедност:** права приступа спроводе се искључиво у `firestore.rules` и `storage.rules`. Клијентска провера је само UX.
- **Принцип транспарентности:** ништа се трајно не брише — користите меко брисање.
- **Терминологија:** користите појмове из [`docs/glossary.md`](docs/glossary.md).
- **Архитектонске одлуке:** значајне одлуке бележе се као ADR у [`docs/adr/`](docs/adr/README.md).
- Ако мењате понашање, ажурирајте [`CHANGELOG.md`](CHANGELOG.md) (секција `Unreleased`).

## Пријава грешака и предлози

Користите [шаблоне за issue-е](https://github.com/RSvlad/Timska-kasa/issues/new/choose). Безбедносне пропусте **не** пријављујте јавно — видети [`SECURITY.md`](SECURITY.md).
