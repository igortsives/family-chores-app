# Contributing to Family Chores App

Thanks for contributing! 🎉  
This project is a family-focused chore and rewards system built with **Next.js, Prisma, and Material UI**. Contributions should prioritize **clarity, safety, and maintainability**.

---

## 🧭 Project Principles

- **Role-aware**: Parents (Adults) and Kids have different permissions
- **Safety first**: No secrets or credentials committed
- **Incremental changes**: Small, focused commits
- **Mobile-friendly**: All UI must work on mobile
- **Consistency**: Follow existing patterns and naming

---

## 🌱 Branching Workflow

Always create a feature branch off `main`:

```bash
git checkout -b feature/your-feature-name
```

Examples:
- `feature/star-awards-ui`
- `feature/family-member-management`
- `fix/logout-redirect`
- `fix/mobile-nav-overflow`

Do **not** commit directly to `main`.

---

## 💡 Commit Message Guidelines

Use clear, descriptive commit messages:

```
Add weekly star award calculation
Fix logout redirect on custom domains
Improve mobile layout for admin actions
```

Avoid vague messages like:
```
fix stuff
updates
wip
```

---

## 🔐 Security Rules (Important)

Never commit:
- `.env` files
- Secrets or tokens
- Database credentials
- `.next/`, `node_modules/`

Check before committing:
```bash
git status
```

---

## 🧪 Testing Checklist

Before pushing your branch:

- App starts locally
- Login works for:
  - Parent (ADULT)
  - Kid (KID)
- Parent-only routes are protected
- Weekly star logic still works
- No console or Prisma errors
- Mobile layout is usable

---

## 🗄 Database / Prisma Changes

If you modify `prisma/schema.prisma`:

```bash
npx prisma migrate dev
npx prisma generate
```

- Commit the migration files
- Do **not** commit generated Prisma client
- Ensure existing data is handled safely (or document resets)

---

## 🎨 UI Guidelines

- Use **Material UI (MUI)** components
- Keep layouts responsive
- Avoid duplicating navigation (hamburger menu is the source of truth)
- Top nav should stay minimal (branding + menu)
- Admin pages must work on mobile

---

## ⭐ Stars & Awards Rules

When modifying the rewards system:

- Stars are earned **weekly**
- A star is earned only if **all assigned chores are completed and approved**
- Stars are tracked by week
- Parents approve star exchanges
- Stars are deducted only on approved exchanges

Do not break these invariants without discussion.

---

## 🔄 Authentication Rules

- Login uses **Username + Password**
- Email is stored but **not used for login**
- Logout must not hardcode redirects (no localhost assumptions)
- Client-side logout should use `redirect: false`

---

## 📦 Pull Requests

When ready:

```bash
git push origin feature/your-feature-name
```

Open a Pull Request against `main` with:
- What changed
- Why it changed
- Screenshots (for UI changes)
- Any migration notes

---

## 🤝 Code of Conduct

- Be respectful and constructive
- Assume good intent
- Prefer clarity over cleverness
- Ask before large refactors

---

Thanks for helping make Family Chores better ❤️

