# Deployment Guide

[← Back to README](../README.md)

This guide covers production deployment of the TeamUp IT Backend.

## Quick Deploy Checklist

- [ ] Set strong `JWT_ACCESS_SECRET`
- [ ] Configure production `DATABASE_URL`
- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_SECURE=true`
- [ ] Set `COOKIE_SAMESITE=none` (if cross-origin)
- [ ] Configure production SMTP credentials
- [ ] Set `EMAIL_NOTIFICATIONS_ENABLED=true`
- [ ] Configure Cloudinary credentials
- [ ] Set correct `APP_BASE_URL` and `FRONTEND_BASE_URL`
- [ ] Configure `CLIENT_ORIGIN` with production domains
- [ ] Run database migrations
- [ ] Test all critical endpoints

---

## Docker Deployment

### Building the Production Image

The project includes a multi-stage Dockerfile for optimal production builds.

**Build the image:**

```bash
docker build -t teamup-backend:latest .
```

**Build stages:**

1. `deps` – Install production dependencies only
2. `build` – Generate Prisma Client
3. `runtime` – Minimal runtime image (~200MB)

### Running with Docker

**Run the container:**

```bash
docker run -d \
  --name teamup-api \
  -p 3000:3000 \
  --env-file .env.production \
  teamup-backend:latest
```

**With PostgreSQL link:**

```bash
docker run -d \
  --name teamup-api \
  -p 3000:3000 \
  --link teamup-postgres:db \
  --env-file .env.production \
  teamup-backend:latest
```

### Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: teamup-postgres
    restart: always
    environment:
      POSTGRES_DB: teamup
      POSTGRES_USER: teamup
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - teamup-network

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: teamup-api
    restart: always
    ports:
      - '3000:3000'
    env_file:
      - .env.production
    depends_on:
      - db
    networks:
      - teamup-network

volumes:
  postgres_data:

networks:
  teamup-network:
    driver: bridge
```

**Deploy:**

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Platform-Specific Deployment

### Render

[Render](https://render.com) offers free PostgreSQL and web service hosting.

**Steps:**

1. **Create PostgreSQL Database:**
   - Go to Render Dashboard → New → PostgreSQL
   - Copy the "Internal Database URL"

2. **Create Web Service:**
   - New → Web Service
   - Connect your GitHub repository
   - Configure:
     - **Environment:** `Node`
     - **Build Command:** `npm install && npx prisma generate`
     - **Start Command:** `npm start`
     - **Environment Variables:** Add all from `.env.example`

3. **Set Environment Variables:**

   ```
   NODE_ENV=production
   DATABASE_URL=<your-internal-database-url>
   JWT_ACCESS_SECRET=<generate-strong-secret>
   COOKIE_SECURE=true
   CLIENT_ORIGIN=https://your-frontend.com
   APP_BASE_URL=https://your-api.onrender.com
   ...
   ```

4. **Deploy:**
   - Push to main branch
   - Render auto-deploys

**Post-Deploy:**

- Run migrations: `npx prisma migrate deploy` (via Render shell)
- Seed database: `npm run db:seed`

### Railway

[Railway](https://railway.app) provides easy deployment with PostgreSQL.

**Steps:**

1. **Install Railway CLI:**

   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Project:**

   ```bash
   railway init
   ```

3. **Add PostgreSQL:**

   ```bash
   railway add postgresql
   ```

   Railway automatically sets `DATABASE_URL`.

4. **Set Environment Variables:**

   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_ACCESS_SECRET=<your-secret>
   railway variables set COOKIE_SECURE=true
   # ... add all required variables
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

**Custom Start Command:**
In `railway.toml`:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run prisma:migrate:deploy && npm start"
```

### Fly.io

[Fly.io](https://fly.io) offers global deployment.

**Steps:**

1. **Install flyctl:**

   ```bash
   curl -L https://fly.io/install.sh | sh
   flyctl auth login
   ```

2. **Launch App:**

   ```bash
   flyctl launch
   ```

   Follow prompts to configure.

3. **Add PostgreSQL:**

   ```bash
   flyctl postgres create
   flyctl postgres attach <postgres-app-name>
   ```

4. **Configure Secrets:**

   ```bash
   flyctl secrets set JWT_ACCESS_SECRET=<your-secret>
   flyctl secrets set COOKIE_SECURE=true
   flyctl secrets set NODE_ENV=production
   # ... add all required secrets
   ```

5. **Deploy:**
   ```bash
   flyctl deploy
   ```

**`fly.toml` example:**

```toml
app = "teamup-backend"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### Vercel (Serverless)

Note: Vercel uses serverless functions. Not ideal for WebSocket/long-running tasks, but works for REST API.

**Steps:**

1. **Install Vercel CLI:**

   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Create `vercel.json`:**

   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/server.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Set Environment Variables:**

   ```bash
   vercel env add DATABASE_URL production
   vercel env add JWT_ACCESS_SECRET production
   # ... add all variables
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

**Limitations:**

- No cron jobs (use Vercel Cron or external service)
- Cold starts for infrequent requests
- Connection pooling considerations

---

## Environment Configuration

### Production `.env` Template

```bash
# Server
PORT=3000
NODE_ENV=production

# Database (use production URL)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT (GENERATE STRONG RANDOM SECRET!)
JWT_ACCESS_SECRET="<use-openssl-rand-base64-32>"
ACCESS_TOKEN_TTL_SECONDS=900

# Refresh Token
REFRESH_TOKEN_TTL_DAYS=30
COOKIE_SECURE=true
COOKIE_SAMESITE=none  # or 'strict' if same-origin

# CORS (production frontend URLs)
CLIENT_ORIGIN=https://app.teamup.com,https://www.teamup.com

# Email (production SMTP)
EMAIL_ADDRESS=noreply@teamup.com
EMAIL_PASSWORD=<smtp-password>
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_NOTIFICATIONS_ENABLED=true

# Application URLs
APP_BASE_URL=https://api.teamup.com
FRONTEND_BASE_URL=https://app.teamup.com

# Email Verification
EMAIL_VERIFICATION_TTL_HOURS=24
VERIFICATION_TOKEN_RETENTION_DAYS=7

# Password Reset
PASSWORD_RESET_TOKEN_TTL_MINUTES=30

# Cloudinary (production credentials)
CLOUDINARY_CLOUD_NAME=<your-production-cloud>
CLOUDINARY_API_KEY=<production-key>
CLOUDINARY_API_SECRET=<production-secret>
```

### Generate Strong Secrets

```bash
# JWT_ACCESS_SECRET (32 bytes, base64)
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Migration

### Apply Migrations in Production

**Before deploying new code:**

```bash
npx prisma migrate deploy
```

This applies all pending migrations without prompts (safe for CI/CD).

### Migration Strategy

1. **Test locally first:**

   ```bash
   npm run prisma:migrate:dev -- --name add_feature
   ```

2. **Commit migration files:**

   ```bash
   git add prisma/migrations/
   git commit -m "feat: add feature migration"
   ```

3. **Deploy:**
   - Platform auto-runs migrations (if configured)
   - Or manually: `npx prisma migrate deploy`

### Rollback Strategy

Prisma doesn't support automatic rollbacks. For critical migrations:

1. **Backup database** before migration
2. **Test migration** on staging environment
3. **Plan manual rollback SQL** if needed

---

## CI/CD Pipeline

### GitHub Actions Deployment

Example workflow for automatic deployment:

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Build Docker image
        run: docker build -t teamup-backend:${{ github.sha }} .

      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          curl -X POST https://api.render.com/deploy/srv-xxx \
            -H "Authorization: Bearer $RENDER_API_KEY"
```

---

## Monitoring & Logging

### Structured Logging

Add a logger in production (e.g., Winston):

```bash
npm install winston
```

### Error Tracking

Integrate Sentry for error tracking:

```bash
npm install @sentry/node
```

**Initialize in `server.js`:**

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Health Checks

Use the existing health endpoint:

```http
GET /api/v1/health
```

Configure platform to ping this endpoint periodically.

---

## Performance Optimization

### Production Recommendations

1. **Enable compression:**

   ```bash
   npm install compression
   ```

   ```javascript
   import compression from 'compression';
   app.use(compression());
   ```

2. **Rate limiting:**

   ```bash
   npm install express-rate-limit
   ```

3. **Helmet for security:**

   ```bash
   npm install helmet
   ```

4. **Connection pooling:**
   Already configured in Prisma.

5. **Caching:**
   Consider Redis for frequently accessed data.

---

## Security Checklist

- [ ] Strong JWT secrets (32+ bytes)
- [ ] HTTPS enforced (`COOKIE_SECURE=true`)
- [ ] CORS configured with specific origins
- [ ] Rate limiting on auth endpoints
- [ ] Helmet middleware enabled
- [ ] Database credentials secured (not in code)
- [ ] Environment variables not committed
- [ ] SQL injection prevention (Prisma handles this)
- [ ] Input validation (Joi schemas)
- [ ] Dependency scanning (npm audit)

---

## Backup Strategy

### Database Backups

**Automated backups:**
Most platforms (Render, Railway) offer automatic daily backups.

**Manual backup:**

```bash
pg_dump $DATABASE_URL > backup.sql
```

**Restore:**

```bash
psql $DATABASE_URL < backup.sql
```

### Backup Schedule Recommendation

- Daily automated backups (retain 7 days)
- Weekly snapshots (retain 4 weeks)
- Monthly archives (retain 1 year)

---

## Troubleshooting Production Issues

### Application Not Starting

1. **Check logs:**

   ```bash
   # Render
   render logs <service-name>

   # Railway
   railway logs

   # Docker
   docker logs teamup-api
   ```

2. **Verify environment variables:**
   - All required variables set?
   - DATABASE_URL accessible?

3. **Test database connection:**
   ```bash
   npx prisma db pull
   ```

### Database Connection Issues

1. **Check connection pooling limits**
2. **Verify DATABASE_URL format**
3. **Ensure IP whitelisting** (if applicable)

### 502/504 Errors

- Check if app crashed (view logs)
- Increase memory limits
- Check database availability

---

## Cost Optimization

### Free Tier Options

- **Render:** Free PostgreSQL (90 days), Free web service (750 hours/month)
- **Railway:** $5 free credit/month
- **Fly.io:** Free allowance for small apps
- **Vercel:** Free for personal projects

### Paid Recommendations

- **Database:** $7-15/month (256MB-1GB)
- **API Server:** $7-25/month (512MB-1GB RAM)
- **Total:** ~$15-40/month for small-medium traffic

---

## Next Steps After Deployment

1. **Set up monitoring** (errors, performance)
2. **Configure alerts** (downtime, errors)
3. **Implement analytics** (usage metrics)
4. **Add rate limiting**
5. **Set up staging environment**
6. **Document runbook** (incident response)

---

[← Back to README](../README.md)
