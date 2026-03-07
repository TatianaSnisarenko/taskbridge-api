# TeamUp IT Backend

A RESTful API backend for a freelance collaboration platform that connects software developers with companies for short-term tasks and projects.

---

## Documentation

- **[Getting Started](#quick-start)** - Set up and run locally in 5 minutes
- **[API Documentation](docs/API.md)** - Complete endpoint reference with examples
- **[Architecture](docs/ARCHITECTURE.md)** - System design and key decisions
- **[Development Guide](docs/DEVELOPMENT.md)** - Detailed development workflows
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Project Standards](docs/PROJECT_STANDARDS.md)** - Public engineering standards
- **[Contributing](docs/CONTRIBUTING.md)** - How to contribute to the project

---

## Overview

TeamUp IT enables developers to showcase their skills, apply for tasks, and collaborate with companies through a structured workflow. Companies can post tasks, review applications, invite specific developers, and manage projects with integrated chat and review systems.

**Core Capabilities:**

- Dual user personas (developers and companies)
- Full task lifecycle management with state transitions
- Real-time chat for active tasks
- Technology-based skill matching
- Bidirectional review and rating system
- Comprehensive notification engine

## Key Features

### Authentication & Security

- JWT access tokens with refresh token rotation
- Email verification and password reset
- Role-based access control (developer/company personas)

### User Profiles

- **Developers:** Skills, experience level, availability, portfolio links, avatar uploads
- **Companies:** Company info, team size, logo uploads, verification status
- Aggregate ratings calculated from reviews

### Task Management

- Create tasks (paid, unpaid, volunteer, experience)
- Difficulty levels and technology requirements
- Draft/publish workflow with visibility controls
- Application system with acceptance/rejection
- Task invitations from companies to developers
- Completion workflow with review requests

### Collaboration

- Real-time chat threads for active tasks
- Notification system (applications, acceptances, messages, reviews)
- Email notifications (configurable)

### Technology Catalog

- Curated list of technologies by category
- Community suggestion workflow
- Search and filtering capabilities

### Reviews & Ratings

- Bidirectional reviews (developer ↔ company)
- 1-5 star ratings with optional feedback
- Automatic profile rating recalculation

**[→ See complete API reference](docs/API.md)**

## Tech Stack

| Category           | Technologies                             |
| ------------------ | ---------------------------------------- |
| **Runtime**        | Node.js 20+, Express.js 4                |
| **Database**       | PostgreSQL 16, Prisma 7 (ORM)            |
| **Authentication** | JWT, bcryptjs, HTTP-only cookies         |
| **Validation**     | Joi schemas                              |
| **Documentation**  | Swagger UI (OpenAPI 3.0)                 |
| **File Storage**   | Cloudinary, Multer, Sharp                |
| **Email**          | Nodemailer (SMTP)                        |
| **Testing**        | Jest 29, Supertest, Testcontainers       |
| **Code Quality**   | ESLint 9, Prettier 3, Husky              |
| **DevOps**         | Docker, Docker Compose, node-cron        |
| **CI/CD**          | GitHub Actions with coverage enforcement |

**[→ Learn about architecture decisions](docs/ARCHITECTURE.md)**

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Installation

```bash
# 1. Clone and install
git clone <repository-url>
cd diploma-project-backend
npm install

# 2. Set up environment
cp .env.example .env

# 3. Start database
docker compose up -d db

# 4. Run migrations
npm run prisma:generate
npm run prisma:migrate:dev

# 5. Seed database (optional)
npm run db:seed

# 6. Start server
npm run dev
```

**Server runs at:** `http://localhost:3000`
**API docs:** `http://localhost:3000/api/v1/docs`
**Health check:** `http://localhost:3000/api/v1/health`

**[→ Detailed setup instructions](docs/DEVELOPMENT.md)**

---

## Project Structure

```
src/
	controllers/    # HTTP request handlers
	services/       # Business logic
	routes/         # API routes
	middleware/     # Auth, validation, errors
	schemas/        # Joi validation schemas
	utils/          # Helpers (JWT, email, cloudinary)
	config/         # Environment & CORS config
prisma/
	schema.prisma   # Database schema
	migrations/     # Migration history
	seed.js         # Database seeding
tests/
	unit/           # Service unit tests
	integration/    # API integration tests
docs/             # Project documentation
docker/           # Docker configuration
```

**[→ Architecture details](docs/ARCHITECTURE.md)**

---

## API Overview

The API follows REST conventions with JSON request/response bodies.

### Authentication

```bash
# Sign up
POST /api/v1/auth/signup

# Login (returns access_token + refresh_token cookie)
POST /api/v1/auth/login

# Refresh access token
POST /api/v1/auth/refresh

# Logout
POST /api/v1/auth/logout
```

### Main Resources

- **`/api/v1/profiles`** - Developer and company profiles
- **`/api/v1/projects`** - Project management
- **`/api/v1/tasks`** - Task CRUD and lifecycle
- **`/api/v1/applications`** - Task applications
- **`/api/v1/invites`** - Task invitations
- **`/api/v1/technologies`** - Technology catalog
- **`/api/v1/users/notifications`** - Notifications
- **`/api/v1/users/chat-threads`** - Chat messaging
- **`/api/v1/users/reviews`** - Reviews and ratings

**Protected routes** require `Authorization: Bearer <token>` header.
**Persona routes** also require `X-Persona: developer` or `X-Persona: company` header.

**[→ Complete API reference](docs/API.md)**

---

## Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage
```

**Coverage Thresholds (CI enforced):**

- Statements: 85%
- Branches: 70%
- Functions: 90%
- Lines: 85%

**[→ Testing guide](docs/DEVELOPMENT.md#testing)**

---

## Development

```bash
# Start dev server (auto-reload)
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Prisma Studio (database GUI)
npm run prisma:studio

# Create migration
npm run prisma:migrate:dev -- --name migration_name
```

**Pre-commit hooks** automatically format staged files.

**[→ Development guide](docs/DEVELOPMENT.md)**

---

## Deployment

### Docker

```bash
# Build production image
docker build -t teamup-backend:latest .

# Run container
docker run -p 3000:3000 --env-file .env teamup-backend:latest
```

### Platforms

Deployment guides for:

- Render (free tier available)
- Railway
- Fly.io
- Vercel (serverless)

**[→ Deployment guide](docs/DEPLOYMENT.md)**

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Follow [project standards](docs/PROJECT_STANDARDS.md)
4. Write tests for new features
5. Ensure tests and linting pass
6. Submit a pull request

**[→ Contributing guide](docs/CONTRIBUTING.md)**

---

## License

<!-- TODO: Add license information -->

---

## Author

Developed as a diploma project demonstrating backend engineering skills:

- RESTful API design
- Authentication and authorization
- Database modeling and migrations
- Test-driven development
- CI/CD pipelines
- Containerization
- Code quality automation

---

**Questions?** Open an issue on GitHub.
