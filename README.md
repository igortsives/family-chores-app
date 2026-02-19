# Family Chores App ⭐

A family-focused chore management app that helps parents assign, track, and approve chores while motivating kids with a **weekly star reward system**.

Parents configure chores and schedules.  
Kids complete chores, earn ⭐ **Stars**, and exchange them for real-world rewards.

---

## ✨ Features

### 👨‍👩‍👧‍👦 Family Roles

**Parents (Adults)**
- Create and manage chores
- Assign chores to kids
- Schedule chores weekly
- Approve or reject completed chores
- Manage family members (add / update / deactivate / hide)
- Approve star exchanges

**Kids**
- View assigned chores
- Mark chores as completed
- Undo a completion while it is still pending parent approval
- Track weekly progress
- Earn ⭐ Stars for completing all assigned chores in a week
- Request star exchanges for real rewards

---

### ⭐ Weekly Star Awards

- Each week, a kid earns **1 Star** if:
  - All assigned chores for the week are completed
  - All completions are approved by a parent
- Stars are:
  - Tracked by week
  - Added to a running balance
  - Deducted when parents approve exchanges

---

### 📊 Dashboards

- My Chores (Kids)
- Parent Approvals (Parents)
- Admin Chores Management (Parents)
- Family Members Management
- Awards / Stars History
- Leaderboard (hidden members are excluded)

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
- Run unit tests with `npm run test:run`
- Run E2E UI tests with `npm run test:e2e`
- CI runs lint, unit tests, and Playwright E2E tests (with PostgreSQL + Prisma migrate/seed)
- Product roadmap: see `ROADMAP.md`

---

## 📄 License

MIT

---

## ❤️ Why This Exists

Built for families who want structure, fairness, and motivation — without nagging.
