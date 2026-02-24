# Family Chores App ⭐

A family-focused chore management app that helps parents assign, track, and approve chores while motivating kids with coins, scores, and stars.

Parents configure chores and schedules.  
Kids complete chores, earn coins, build star progress, and exchange earned stars for real-world rewards.

---

## ✨ Features

### 👨‍👩‍👧‍👦 Family Roles

**Parents (Adults)**
- Create and manage chores
- Assign chores to kids
- Schedule chores weekly
- Approve or reject completed chores
- Add, edit, or remove parent comments inline in the approvals history log
- Manage family members (add / update / deactivate / hide)
- Upload optional member profile pictures
- Approve star exchanges
- View family-wide stats (scores, coins, stars, completion/consistency)

**Kids**
- View assigned chores by day
- Swipe between weeks on mobile day strip (with snap behavior)
- Mark chores as completed
- Undo a completion while it is still pending parent approval
- See contextual kid-friendly subheading messages for today vs past days
- See rejection reasons from parents
- View messages grouped into kid-friendly tabs (Recent / Older)
- Track leaderboard status and weekly progress
- Earn coins from approved chores
- Build progress toward ⭐ Stars over time
- Request star exchanges for real rewards

---

### ⭐ Scoring, Coins, and Stars

- Leaderboard ranking uses a normalized hybrid weekly score:
  - 70% completion rate
  - 20% consistency
  - 10% streak factor
- Coins are awarded from approved chores and are shown for motivation/reward tracking.
- Stars are derived from cumulative weekly score progress with carryover across weeks.
- Stars are:
  - Tracked by week
  - Added to a running balance
  - Deducted when parents approve exchanges

---

### 📊 Dashboards

- Today's Chores (Kids, with weekly day strip)
- Kids leaderboard modal (from Today's Chores)
- Parent Approvals (Parents, with Today/Past views and history modal)
- Chores Management (Parents)
- Family Management (Parents)
- Family Stats (Parents)
- Awards / Stars History
- Leaderboard (hidden members are excluded)

---

### 🔔 Notifications

- Notifications are persisted in the database (read/unread + dismiss).
- `REMINDER` notifications stay tied to current actionable state.
- Non-reminder update notifications are hard-deleted after 30 days.
- Unread count excludes stale unread non-reminder updates older than 30 days.
- Kid notification drawer uses simple tabs:
  - `Recent` (last 3 days)
  - `Older` (older than 3 days)

---

## 🛠 Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript
- **UI**: Material UI (MUI)
- **Auth**: NextAuth (Username + Password)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL
- Git

---

### Clone the repository

```bash
git clone https://github.com/igortsives/family-chores-app.git
cd family-chores-app
```

---

### Install dependencies

```bash
npm install
```

---

### Environment configuration

Create a `.env` file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/family_chores_app
NEXTAUTH_SECRET=your-secret
NEXTAUTH_TRUST_HOST=true
```

Optional (only when running behind a domain):

```env
PUBLIC_BASE_URL=https://yourdomain.com
```

---

### Database setup

```bash
npx prisma migrate dev
npx prisma generate
```

(Optional demo data)

```bash
npx prisma db seed
```

---

### Start the app

```bash
./start_local.sh
```

Visit:  
http://localhost:3000

---

## 🔐 Authentication

- Login uses **Username + Password**
- Email is collected but not used for authentication
- Roles:
  - `ADULT`
  - `KID`

---

## 🧭 Project Structure

```
src/
  app/                # Next.js routes & pages
  app/api/            # API routes
  components/         # UI shells and components
  lib/                # Auth, Prisma, helpers
prisma/
  schema.prisma       # Database schema
scripts/              # Install / update scripts
```

---

## 🧪 Development Notes

- `.env`, `.next`, and `node_modules` are gitignored
- Prisma client is generated locally
- Logout is handled client-side to avoid redirect issues
- Weekly star logic is Monday-based
- Star progress carries over across weeks
- Run unit tests with `npm run test:run`
- Run E2E UI tests with `npm run test:e2e`
- CI runs lint, unit tests, and Playwright E2E tests (with PostgreSQL + Prisma migrate/seed)
- Approvals history supports inline parent comment add/edit/remove
- Manage Member and Edit Chore modals include top-right close controls
- Product planning: see `ROADMAP.md`
- Completed change history: see `CHANGELOG.md`

---

## 📄 License

MIT

---

## ❤️ Why This Exists

Built for families who want structure, fairness, and motivation — without nagging.
