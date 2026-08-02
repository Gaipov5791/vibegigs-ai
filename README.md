<div align="center">

# VibeGigs AI

### ИИ-ассистент для поиска фриланс-заказов  
### AI assistant for freelance lead discovery

<br />

[![Demo](https://img.shields.io/badge/🚀_Live_Demo-vibegigs--ai.vercel.app-00C853?style=for-the-badge)](https://vibegigs-ai.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Gaipov5791%2Fvibegigs--ai-181717?style=for-the-badge&logo=github)](https://github.com/Gaipov5791/vibegigs-ai)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br />

**[🌐 Live Demo](https://vibegigs-ai.vercel.app)** ·
**[📦 Repository](https://github.com/Gaipov5791/vibegigs-ai)** ·
**[⚙️ Setup](#-быстрый-старт--quick-start)**

<br />

<img src="https://img.shields.io/badge/Platforms-We_Work_Remotely_|_Contra_|_Freelancehub-7C3AED?style=flat-square" alt="Platforms" />
<img src="https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=flat-square&logo=google" alt="AI" />
<img src="https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=flat-square&logo=supabase" alt="Auth" />

</div>

---

## 🇷🇺 О проекте

**VibeGigs AI** — платформа, которая собирает заказы с фриланс-бирж, анализирует их с помощью ИИ и показывает только релевантные лиды под ваш стек и профиль.

Меньше шума. Больше подходящих заказов. Быстрее решение — откликаться или нет.

### Как это работает

```text
Биржи (RSS / парсинг)  →  Сырые заказы  →  ИИ-анализ  →  Лиды с match %
                              ↓                              ↓
                         PostgreSQL                    Дашборд + отклики
```

1. **Парсер** регулярно забирает заказы с выбранных платформ  
2. **ИИ-агент** сравнивает каждый заказ с вашим tech stack, bio и stop-words  
3. **Дашборд** показывает match %, риски, оценку цены/сроков и черновик cover letter  

---

## 🇬🇧 About

**VibeGigs AI** is a platform that scrapes freelance marketplaces, analyzes jobs with AI, and surfaces only the leads that match your stack and profile.

Less noise. More relevant gigs. Faster go / no-go decisions.

### How it works

```text
Marketplaces (RSS / parsers)  →  Raw jobs  →  AI analysis  →  Leads with match %
                                    ↓                              ↓
                               PostgreSQL                    Dashboard + applications
```

1. **Parser** regularly pulls jobs from selected platforms  
2. **AI agent** scores each job against your tech stack, bio, and stop-words  
3. **Dashboard** shows match %, red flags, price/timeline estimates, and a cover letter draft  

---

## ✨ Возможности / Features

| | RU | EN |
|---|---|---|
| 🔍 | Сбор заказов с **We Work Remotely**, **Contra**, **Freelancehub** | Job ingestion from **We Work Remotely**, **Contra**, **Freelancehub** |
| 🤖 | ИИ-скоринг релевантности (1–100%) | AI relevance scoring (1–100%) |
| 🚩 | Red flags и краткое саммари по заказу | Red flags and concise job summary |
| ✉️ | Черновик экспертного cover letter | Expert cover letter draft |
| 💰 | Оценка бюджета и сроков | Budget & timeline estimates |
| 📊 | Дашборд: статистика, тренды, статусы откликов | Dashboard: stats, trends, application statuses |
| 👤 | Профиль: tech stack, stop-words, выбор платформы | Profile: tech stack, stop-words, platform preference |
| 🔐 | Авторизация через Supabase Auth | Auth via Supabase Auth |

---

## 🛠 Стек / Tech Stack

| Слой / Layer | Технологии / Technologies |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | Express 5, TypeScript, AI worker + parser scheduler |
| **AI** | Google Gemini |
| **Database** | PostgreSQL + Prisma |
| **Auth** | Supabase Auth |
| **Deploy** | Vercel (client) |

---

## 🏗 Архитектура / Architecture

```text
vibegigs-ai/
├── client/          # Next.js UI + API routes (dashboard, jobs, settings)
│   ├── src/app/     # Pages & App Router API
│   ├── src/components/
│   └── src/lib/     # parsers, AI, auth, Prisma
│
└── backend/         # Express API, parsers, AI worker
    ├── src/ai/      # Gemini analyzer + background worker
    ├── src/parser/  # Platform parsers (WWR, Contra, Freelancehub)
    └── src/routes/  # /api/jobs, /api/stats, /api/profile
```

| Компонент / Component | RU | EN |
|---|---|---|
| **Parser** | Собирает title, description, budget, skills, URL | Collects title, description, budget, skills, URL |
| **AI Worker** | Анализирует pending-заказы в фоне | Analyzes pending jobs in the background |
| **Client** | Дашборд, лиды, профиль, статусы откликов | Dashboard, leads, profile, application statuses |
| **Backend API** | REST + CORS для локальной/прод связки | REST + CORS for local/prod wiring |

---

## 🚀 Быстрый старт / Quick Start

### Требования / Requirements

- Node.js 20+
- PostgreSQL (рекомендуется Supabase)
- Ключи: Supabase + Gemini

### 1. Клонирование / Clone

```bash
git clone https://github.com/Gaipov5791/vibegigs-ai.git
cd vibegigs-ai
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # или создайте .env вручную
npm install
npx prisma migrate deploy
npm run dev
```

Сервер поднимется на [http://localhost:5000](http://localhost:5000).

### 3. Client

```bash
cd client
cp .env.local.example .env.local
npm install
npx prisma migrate deploy
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

### Переменные окружения / Environment

**Client** (`client/.env.local`) — см. [`client/.env.local.example`](client/.env.local.example):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL (`http://localhost:5000`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only) |
| `DATABASE_URL` | Postgres (pooled) |
| `DIRECT_URL` | Postgres (direct, for migrations) |
| `GEMINI_API_KEY` | Google Gemini API key |

**Backend** — аналогично: `DATABASE_URL`, `DIRECT_URL`, Supabase keys, `GEMINI_API_KEY`, `PORT`.

---

## 🖥 Экраны / Screens

| Экран / Screen | Описание / Description |
|---|---|
| **Дашборд / Dashboard** | Статистика лидов, средний match %, динамика по дням |
| **Лиды / Jobs** | Карточки заказов, red flags, cover letter, apply / archive |
| **Профиль / Settings** | Tech stack, stop-words, bio, выбор биржи |
| **Login** | Вход через Supabase Auth |

> 💡 Добавьте скриншоты в `docs/screenshots/` и вставьте их сюда для ещё более сильной презентации.

---

## 📡 API (backend)

| Method | Endpoint | Описание / Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `*` | `/api/jobs` | Лиды / jobs |
| `*` | `/api/stats` | Статистика дашборда / dashboard stats |
| `*` | `/api/profile` | Профиль пользователя / user profile |

Парсеры запускаются при старте backend и затем каждые **10 минут**.

---

## 🗺 Roadmap

- [ ] Больше бирж / More marketplaces  
- [ ] Уведомления о high-match лидах / High-match notifications  
- [ ] Экспорт откликов / Application export  
- [ ] Мультиязычный UI / Multilingual UI  

---

## 📄 Лицензия / License

MIT — свободное использование для обучения и портфолио.  
MIT — free to use for learning and portfolio projects.

---

<div align="center">

**VibeGigs AI** — find gigs that match your vibe.

[Live Demo](https://vibegigs-ai.vercel.app) · [GitHub](https://github.com/Gaipov5791/vibegigs-ai)

Made with ❤️ for freelancers

</div>
