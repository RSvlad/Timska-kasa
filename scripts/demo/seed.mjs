// Демо подаци: измишљени IT стартап (12 људи, коворкинг у Новом Саду, клијенти у RSD и EUR).
// Пуни Firebase емулаторе (Auth + Firestore) да покаже све функције апликације:
// више валута, категорије (и деактивирана + системска), фондове са алокацијама,
// записе терећене на фондове, Admin и Viewer налог.
//
//   npx firebase emulators:start --only auth,firestore --project demo-timska-kasa
//   node scripts/demo/seed.mjs [sr|en]
//
// Датуми су релативни у односу на тренутак покретања (последњих 12 месеци).

import { pathToFileURL } from "node:url";

const PROJECT = "demo-timska-kasa";
const AUTH_URL = "http://127.0.0.1:9099";
const FIRESTORE_URL = "http://127.0.0.1:8080";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

export const ADMIN = { email: "admin@example.com", password: "demo-password-1" };
export const VIEWER = { email: "viewer@example.com", password: "demo-password-2" };

const INCOME = "Приход";
const EXPENSE = "Расход";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Двојезични текст: податке (називе, описе) чувамо на језику у ком се приказују. */
const tr = (sr, en) => ({ sr, en });
const pick = (value, lang) => (typeof value === "string" ? value : value[lang]);
const round2 = (n) => Math.round(n * 100) / 100;

// ── Категорије ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "system-unknown-income", name: "Непознато", type: INCOME, system: true },
  { id: "system-unknown-expense", name: "Непознато", type: EXPENSE, system: true },
  { id: "c-dues", type: INCOME, name: tr("Чланарина тима", "Team contributions") },
  { id: "c-clients", type: INCOME, name: tr("Клијентски пројекти", "Client projects") },
  { id: "c-grants", type: INCOME, name: tr("Грантови и награде", "Grants & prizes") },
  { id: "c-sponsors", type: INCOME, name: tr("Спонзорства", "Sponsorships") },
  { id: "c-cloud", type: EXPENSE, name: tr("Cloud и хостинг", "Cloud & hosting") },
  { id: "c-software", type: EXPENSE, name: tr("Софтверске лиценце", "Software licences") },
  { id: "c-hardware", type: EXPENSE, name: tr("Опрема", "Equipment") },
  { id: "c-office", type: EXPENSE, name: tr("Канцеларија и коворкинг", "Office & coworking") },
  { id: "c-events", type: EXPENSE, name: tr("Догађаји и конференције", "Events & conferences") },
  { id: "c-team", type: EXPENSE, name: tr("Тим билдинг и храна", "Team building & food") },
  { id: "c-accounting", type: EXPENSE, name: tr("Књиговодство", "Accounting") },
  {
    id: "c-marketing",
    type: EXPENSE,
    name: tr("Маркетинг (стара кампања)", "Marketing (old campaign)"),
    active: false,
  },
];

// ── Фондови (`allocated` = колико је икад алоцирано; `reserved` се рачуна након терећења) ──

const FUNDS = [
  {
    id: "f1-hardware",
    name: tr("Опрема и хардвер", "Hardware & equipment"),
    description: tr("Монитори и периферија за нове чланове", "Monitors and peripherals for hires"),
    capacity: 600000,
    currency: "RSD",
    allocated: 600000,
    ageDays: 300,
  },
  {
    id: "f2-conference",
    name: tr("EU конференција 2027", "EU conference 2027"),
    description: tr("Улазнице и путовање за тим", "Tickets and travel for the team"),
    capacity: 6000,
    currency: "EUR",
    allocated: 6000,
    ageDays: 120,
  },
  {
    id: "f3-offsite",
    name: tr("Годишњи тим билдинг", "Annual team offsite"),
    description: tr(
      "Викенд на планини за цео тим",
      "A weekend in the mountains for the whole team",
    ),
    capacity: 250000,
    currency: "RSD",
    allocated: 210000,
    ageDays: 150,
  },
  {
    id: "f4-infra",
    name: tr("Резерва за инфраструктуру", "Infrastructure reserve"),
    description: tr("Покрива скокове у cloud трошковима", "Covers spikes in cloud costs"),
    capacity: 3000,
    currency: "EUR",
    allocated: 3000,
    ageDays: 200,
  },
  {
    id: "f5-runway",
    name: tr("Сигурносна резерва", "Safety runway"),
    description: tr("Резерва за 6 месеци рада", "A reserve for 6 months of operation"),
    capacity: 1500000,
    currency: "RSD",
    allocated: 800000,
    ageDays: 330,
  },
];

// ── Записи ──────────────────────────────────────────────────────────────────

const HETZNER = [138, 142, 141, 147, 139, 142, 150, 143, 141, 146, 144, 148];
const LUNCHES = [
  [11, 21400, "Melisa Bistro"],
  [9, 28900, "Pizza Lab"],
  [7, 17600, "Wok House"],
  [6, 33200, "Melisa Bistro"],
  [4, 24300, "Pizza Lab"],
  [2, 19800, "Wok House"],
  [1, 26500, "Melisa Bistro"],
];

/** Враћа записе у облику { date, type, value, currency, categoryId, counterparty, description, fundId }. */
export function buildRecords(now = new Date()) {
  const list = [];
  // k месеци уназад од текућег; записи у будућности (текући месец) се прескачу.
  const at = (k, day, hour = 10, minute = 0) =>
    new Date(now.getFullYear(), now.getMonth() - k, day, hour, minute);
  const ago = (ms) => new Date(Math.floor((now.getTime() - ms) / MINUTE) * MINUTE);
  const add = (date, type, value, currency, categoryId, counterparty, description, fundId) => {
    if (date <= now) {
      list.push({ date, type, value, currency, categoryId, counterparty, description, fundId });
    }
  };
  const expense = (date, value, currency, categoryId, who, what, fundId) =>
    add(date, EXPENSE, value, currency, categoryId, who, what, fundId);
  const income = (date, value, currency, categoryId, who, what) =>
    add(date, INCOME, value, currency, categoryId, who, what);

  // Месечно понављајуће
  for (let k = 11; k >= 0; k--) {
    const brojka = tr("Рачуноводствена агенција Бројка", "Brojka Accounting");
    expense(
      at(k, 2, 9, 30),
      28000,
      "RSD",
      "c-accounting",
      brojka,
      tr("Месечни књиговодствени пакет", "Monthly bookkeeping package"),
    );
    expense(
      at(k, 3, 11),
      95000,
      "RSD",
      "c-office",
      "CoWork Hub Novi Sad",
      tr("Закуп 8 места у коворкингу", "Rent for 8 coworking desks"),
    );
    income(
      at(k, 5, 10, 15),
      120000,
      "RSD",
      "c-dues",
      tr("Чланови тима (12)", "Team members (12)"),
      tr("Месечна уплата — 12 × 10.000 РСД", "Monthly contribution — 12 × 10,000 RSD"),
    );
    expense(
      at(k, 7, 8, 45),
      HETZNER[11 - k],
      "EUR",
      "c-cloud",
      "Hetzner Online",
      tr("Cloud сервери и бекапи", "Cloud servers and backups"),
    );
    expense(
      at(k, 9, 14, 20),
      52,
      "EUR",
      "c-software",
      "GitHub",
      tr("Team plan — 13 места", "Team plan — 13 seats"),
    );
    expense(
      at(k, 12, 16, 5),
      45,
      "EUR",
      "c-software",
      "Figma",
      tr("Professional — 3 места", "Professional — 3 seats"),
    );
  }

  // Клијентски пројекти
  const web = tr(
    "Одржавање веб-шопа — квартална фактура",
    "Web shop maintenance — quarterly invoice",
  );
  income(
    at(11, 18, 15),
    4800,
    "EUR",
    "c-clients",
    "Brightwave GmbH",
    tr("Фаза 1 — мобилна апликација", "Phase 1 — mobile app"),
  );
  income(at(10, 14, 12), 450000, "RSD", "c-clients", "Lumen Retail d.o.o.", web);
  income(
    at(8, 20, 11),
    6200,
    "EUR",
    "c-clients",
    "Brightwave GmbH",
    tr("Фаза 2 — API и админ панел", "Phase 2 — API and admin panel"),
  );
  income(
    at(7, 11, 13),
    5100,
    "EUR",
    "c-clients",
    "Orbit Fintech",
    tr("Интеграција платног модула", "Payment module integration"),
  );
  income(at(6, 16, 12), 450000, "RSD", "c-clients", "Lumen Retail d.o.o.", web);
  income(
    at(5, 19, 10),
    3400,
    "EUR",
    "c-clients",
    "Brightwave GmbH",
    tr("Фаза 3 — тестирање и испорука", "Phase 3 — testing and delivery"),
  );
  income(
    at(3, 17, 14),
    8400,
    "EUR",
    "c-clients",
    "Orbit Fintech",
    tr("Мобилни банкинг — MVP", "Mobile banking — MVP"),
  );
  income(at(2, 15, 12), 450000, "RSD", "c-clients", "Lumen Retail d.o.o.", web);
  income(
    at(1, 21, 9, 30),
    7000,
    "EUR",
    "c-clients",
    "Brightwave GmbH",
    tr("Одржавање и подршка — 6 месеци", "Maintenance and support — 6 months"),
  );

  // Грантови, награде, спонзорства
  income(
    at(9, 6, 11),
    1200000,
    "RSD",
    "c-grants",
    tr("Програм подршке стартапима", "Startup Support Programme"),
    tr("Иновациони ваучер — прва транша", "Innovation voucher — first tranche"),
  );
  income(
    at(6, 22, 18),
    250000,
    "RSD",
    "c-grants",
    "CodeJam Beograd",
    tr("1. место на тимском хакатону", "1st place at the team hackathon"),
  );
  const meetup = tr("Спонзорство митапа", "Meetup sponsorship");
  income(at(8, 10, 10), 150000, "RSD", "c-sponsors", "DataForge", meetup);
  income(at(4, 8, 10), 150000, "RSD", "c-sponsors", "Nordic Cloud Partners", meetup);

  // Опрема (монитори и периферија терете фонд „Опрема и хардвер“)
  const monitor = tr('4K монитор 27" за новог колегу', '27" 4K monitor for a new teammate');
  expense(
    at(10, 8, 12),
    430000,
    "RSD",
    "c-hardware",
    "TechMarket Novi Sad",
    tr("2 лаптопа за нове чланове тима", "2 laptops for new team members"),
  );
  expense(at(9, 14, 13), 37500, "RSD", "c-hardware", "TechMarket Novi Sad", monitor, "f1-hardware");
  expense(at(7, 4, 15), 37500, "RSD", "c-hardware", "TechMarket Novi Sad", monitor, "f1-hardware");
  expense(
    at(5, 16, 11),
    38000,
    "RSD",
    "c-hardware",
    "TechMarket Novi Sad",
    tr("Тастатуре, мишеви и docking станице", "Keyboards, mice and docking stations"),
    "f1-hardware",
  );
  expense(at(4, 12, 14), 37500, "RSD", "c-hardware", "TechMarket Novi Sad", monitor, "f1-hardware");

  // Догађаји, конференција (терети фонд „EU конференција 2027“), тим билдинг
  const venue = tr("Закуп сале и кетеринг за митап", "Venue rental and catering for the meetup");
  expense(at(8, 25, 17), 62000, "RSD", "c-events", "Dev Space Novi Sad", venue);
  expense(at(4, 25, 17), 58000, "RSD", "c-events", "Dev Space Novi Sad", venue);
  expense(
    at(2, 6, 10),
    1260,
    "EUR",
    "c-events",
    "DevSummit Europe",
    tr("3 early-bird улазнице", "3 early-bird tickets"),
    "f2-conference",
  );
  expense(
    at(2, 9, 10, 30),
    1240,
    "EUR",
    "c-events",
    "Skyline Air",
    tr("Авио карте за конференцију (3 особе)", "Flights for the conference (3 people)"),
    "f2-conference",
  );
  expense(
    at(3, 13, 12),
    60000,
    "RSD",
    "c-team",
    tr("Планинска кућа Златибор", "Zlatibor Mountain Lodge"),
    tr("Депозит за годишњи тим билдинг", "Deposit for the annual team offsite"),
    "f3-offsite",
  );
  for (const [k, value, place] of LUNCHES) {
    expense(
      at(k, 24, 13, 10),
      value,
      "RSD",
      "c-team",
      place,
      tr("Тимски ручак после спринт ревјуа", "Team lunch after sprint review"),
    );
  }

  // Остало
  expense(
    at(9, 20, 15),
    85000,
    "RSD",
    "c-marketing",
    "Digitalna agencija Piksel",
    tr("Кампања за запошљавање девелопера", "Developer recruitment campaign"),
  );
  expense(
    at(6, 9, 10),
    2150,
    "EUR",
    "c-software",
    "JetBrains",
    tr("All Products Pack — 12 лиценци, годишње", "All Products Pack — 12 licences, annual"),
  );
  expense(at(4, 3, 9), 38, "EUR", "c-cloud", "Cloudflare", tr("Домени и DNS", "Domains and DNS"));
  expense(
    at(3, 20, 16),
    8200,
    "RSD",
    "system-unknown-expense",
    tr("Непознат добављач", "Unknown vendor"),
    tr("Неразврстан трошак — чека класификацију", "Unclassified expense — awaiting review"),
  );

  // Свеже активности (да су „Данас“ и „Месец“ увек попуњени)
  expense(
    ago(35 * MINUTE),
    6400,
    "RSD",
    "c-team",
    "Melisa Bistro",
    tr("Ручак — спринт ревју", "Sprint review lunch"),
  );
  income(
    ago(2 * HOUR + 7 * MINUTE),
    5200,
    "EUR",
    "c-clients",
    "Brightwave GmbH",
    tr("Милестоун — нови модули", "Milestone — new modules"),
  );
  expense(
    ago(26 * HOUR + 22 * MINUTE),
    37500,
    "RSD",
    "c-hardware",
    "TechMarket Novi Sad",
    monitor,
    "f1-hardware",
  );
  expense(
    ago(50 * HOUR + 41 * MINUTE),
    420,
    "EUR",
    "c-events",
    "DevSummit Europe",
    tr("Додатна улазница", "Additional ticket"),
    "f2-conference",
  );
  income(
    ago(74 * HOUR + 13 * MINUTE),
    150000,
    "RSD",
    "c-sponsors",
    "DataForge",
    tr("Спонзорство предстојећег митапа", "Sponsorship of the upcoming meetup"),
  );

  return list.sort((a, b) => a.date - b.date);
}

// ── Firestore / Auth емулатор (REST) ────────────────────────────────────────

const str = (stringValue) => ({ stringValue });
const bool = (booleanValue) => ({ booleanValue });
const num = (doubleValue) => ({ doubleValue });
const ts = (date) => ({ timestampValue: date.toISOString() });
const amount = (value, currency) => ({
  mapValue: { fields: { value: num(value), currency: str(currency) } },
});

async function send(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${init.method} ${url} → ${response.status}`);
  return response;
}

function putDocument(collection, id, fields) {
  return send(
    `${FIRESTORE_URL}/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${id}`,
    { method: "PATCH", headers: OWNER, body: JSON.stringify({ fields }) },
  );
}

async function resetEmulators() {
  await send(`${AUTH_URL}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await send(`${FIRESTORE_URL}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
    method: "DELETE",
  });
}

async function createVerifiedUser(account, role) {
  const signUp = await send(
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: OWNER,
      body: JSON.stringify({ ...account, returnSecureToken: true }),
    },
  );
  const { localId } = await signUp.json();
  await send(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: "POST",
    headers: OWNER,
    body: JSON.stringify({ localId, emailVerified: true }),
  });
  await putDocument("allowedUsers", account.email, { role: str(role) });
  return localId;
}

async function inChunks(items, size, task) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(task));
  }
}

/**
 * Брише емулаторе и уписује демо податке на траженом језику ("sr" | "en").
 * Враћа сажетак (стање по валутама, алоцирано) за проверу.
 */
export async function seedDemo(lang = "sr", now = new Date()) {
  const records = buildRecords(now);

  // Резервисано у фонду = алоцирано − оно што је већ потрошено терећењем фонда.
  const funds = FUNDS.map((fund) => {
    const charged = records
      .filter((r) => r.fundId === fund.id)
      .reduce((sum, r) => {
        if (r.currency !== fund.currency) throw new Error(`${r.fundId}: погрешна валута`);
        return sum + r.value;
      }, 0);
    const reserved = round2(fund.allocated - charged);
    if (reserved < 0 || reserved > fund.capacity) throw new Error(`${fund.id}: неисправно стање`);
    return { ...fund, reserved };
  });

  await resetEmulators();
  const adminId = await createVerifiedUser(ADMIN, "Admin");
  await createVerifiedUser(VIEWER, "Viewer");

  await inChunks(CATEGORIES, 10, (c) =>
    putDocument("categories", c.id, {
      name: str(pick(c.name, lang)),
      type: str(c.type),
      active: bool(c.active ?? true),
      system: bool(c.system ?? false),
    }),
  );

  await inChunks(funds, 10, (f) =>
    putDocument("funds", f.id, {
      name: str(pick(f.name, lang)),
      description: str(pick(f.description, lang)),
      capacity: amount(f.capacity, f.currency),
      reserved: num(f.reserved),
      createdAt: ts(new Date(now.getTime() - f.ageDays * 24 * HOUR)),
    }),
  );

  await inChunks(
    records.map((r, i) => ({ ...r, id: `r${String(i + 1).padStart(3, "0")}` })),
    20,
    (r) =>
      putDocument("transactions", r.id, {
        type: str(r.type),
        amount: amount(r.value, r.currency),
        dateTime: ts(r.date),
        categoryId: str(r.categoryId),
        counterparty: str(pick(r.counterparty, lang)),
        ...(r.description ? { description: str(pick(r.description, lang)) } : {}),
        ...(r.fundId ? { fundId: str(r.fundId) } : {}),
        authorId: str(adminId),
        createdAt: ts(r.date),
      }),
  );

  const balance = {};
  for (const r of records) {
    const b = (balance[r.currency] ??= { income: 0, expense: 0, allocated: 0 });
    b[r.type === INCOME ? "income" : "expense"] += r.value;
  }
  for (const f of funds) balance[f.currency].allocated += f.reserved;
  for (const b of Object.values(balance)) {
    b.balance = round2(b.income - b.expense);
    b.free = round2(b.balance - b.allocated);
  }
  return { lang, records: records.length, funds: funds.length, balance };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lang = process.argv[2] === "en" ? "en" : "sr";
  console.log(JSON.stringify(await seedDemo(lang), null, 2));
}
