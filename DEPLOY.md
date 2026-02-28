# Deployment Guide — Render + Neon

## 1. Create a Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and sign up / log in.
2. Click **New Project** → give it a name (e.g. `blueprint`).
3. Once created, copy the **connection string** from the dashboard.
   It looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

## 2. Push the Schema to Neon

On your local machine, set the connection string and push:

```bash
# Set the env variable
export DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Push schema to Neon (creates all tables)
npx prisma db push

# Seed the database with sample data
npm run seed
```

## 3. Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/blueprint4.git
git push -u origin main
```

> Make sure `.env` is in `.gitignore` (it already is by default with Next.js).

## 4. Deploy to Render

1. Go to [render.com](https://render.com) and sign up / log in.
2. Click **New** → **Web Service**.
3. Connect your GitHub repo (`blueprint4`).
4. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `blueprint` (or any name) |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Node Version** | 20+ (set via Environment → `NODE_VERSION` = `20`) |

5. Add **Environment Variables**:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | A long random string (e.g. `openssl rand -hex 32`) |
| `NODE_VERSION` | `20` |

6. Click **Deploy**.

Render will run `npm install` (which triggers `postinstall` → `prisma generate`), then `npm run build` (which also generates Prisma client + builds Next.js), then starts with `npm start`.

## 5. Run Database Migrations (First Deploy)

After the first deploy, you need to push the schema to Neon if you haven't already:

```bash
# Locally, with DATABASE_URL pointing to Neon:
npx prisma db push
npm run seed
```

Or use Render's **Shell** tab to run these commands directly on the server.

## 6. Access Your App

- **Public pages**: `https://your-app.onrender.com/` — landing page, blueprint builder
- **Admin panel**: `https://your-app.onrender.com/admin/login`
- **Default admin**: `admin@blueprint.edu` / `admin123` (change this after first login!)

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for admin JWT tokens |
| `NODE_VERSION` | Recommended | Set to `20` for Render |

## Troubleshooting

- **Build fails on Prisma**: Ensure `postinstall` script runs `npx prisma generate`
- **Database connection errors**: Check that `DATABASE_URL` includes `?sslmode=require` for Neon
- **Blank pages**: Check Render logs for runtime errors. Ensure all env vars are set.
- **Seed fails**: Run `npx prisma db push` before `npm run seed` to create tables first
