# DeliveryRoulette

A restaurant suggestion application built with Node.js, Express, TypeScript, and MariaDB. Manage restaurants with menus, diet tags and delivery-provider references, then let the app pick a random place for you.

## Tech Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MariaDB with TypeORM
- **Frontend**: Server-rendered Pug templates + Bootstrap (dark theme)
- **Authentication**: OIDC (OpenID Connect) + local login
- **Testing**: Jest + Playwright

## Getting Started

### Docker (recommended for production-like runs)

The fastest way to run a full stack locally is with Docker Compose:

```bash
# 1. Create an env file with your secrets (copy the example, then edit)
cp .env.e2e.example .env
#    At minimum set SESSION_SECRET, DB_PASSWORD, and DB_ROOT_PASSWORD

# 2. Build the image and start app + MariaDB
docker compose up --build

# 3. Run database migrations (first time only, from your dev machine)
#    Point the migration tool at the running database:
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=deliveryroulette \
  DB_PASSWORD=deliveryroulette DB_NAME=deliveryroulette \
  npm run typeorm:migrate
```

The app will be available at `http://localhost:3000` (or the `APP_PORT` you configured).

**Key environment variables** (see `docker-compose.yml` for the full list):

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_SECRET` | *(required)* | **Required** – long random string (`openssl rand -hex 32`) |
| `DB_PASSWORD` | `deliveryroulette` | MariaDB user password |
| `DB_ROOT_PASSWORD` | `rootpassword` | MariaDB root password |
| `DB_NAME` | `deliveryroulette` | Database name |
| `DB_USER` | `deliveryroulette` | Database user |
| `APP_PORT` | `3000` | Host port exposed by the app |
| `ROOT_URL` | `http://localhost:3000` | Public base URL |
| `LOCAL_LOGIN_ENABLED` | `1` | Enable local username/password login |
| `OIDC_ENABLED` | `0` | Enable OIDC authentication |

> **Tip:** Create a `.env` file next to `docker-compose.yml` – Docker Compose will pick it up automatically.

---

### Manual setup (development)

### Prerequisites

- Node.js >= 24
- MariaDB >= 10.4

### 1. Clone & install

```bash
git clone https://github.com/JulianiusM/DeliveryRoulette.git
cd DeliveryRoulette
npm install
```

### 2. Configure environment

Copy the example file and fill in your database credentials:

```bash
cp .env.e2e.example .env   # use as starting template
```

Key variables (see [Configuration](docs/CONFIGURATION.md) for the full list):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MariaDB host |
| `DB_PORT` | `3306` | MariaDB port |
| `DB_USER` | `user` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `DB_NAME` | `database` | Database name |
| `APP_PORT` | `3000` | HTTP listen port |
| `SESSION_SECRET` | *(auto)* | Express session secret |
| `LOCAL_LOGIN_ENABLED` | `1` | Enable local login |
| `OIDC_ENABLED` | `0` | Enable OIDC authentication |

### 3. Create the database

```bash
mysql -u root -p -e "CREATE DATABASE deliveryroulette;"
```

### 4. Build, migrate & seed

```bash
npm run build
npm run typeorm:migrate
npm run seed:diet-tags
```

### 5. Start the dev server

```bash
npm run server          # backend (nodemon) + client watcher (esbuild)
```

The app is now available at `http://localhost:3000` (or the port you configured).

## Developer Workflow

```bash
npm run server            # Start dev server with hot-reload
npm test                  # Run Jest tests (unit, controller, middleware, database)
npm run test:client       # Run frontend tests
npm run e2e               # Run Playwright E2E tests (requires build + e2e:prepare)
npm run test:all          # One-command full test suite
```

See [Development Guide](docs/DEVELOPMENT.md) for branch conventions, commit messages and more.

## Project Structure

```
src/
├── controller/          # Business logic controllers
├── middleware/           # Express middleware (auth, validation)
├── migrations/          # TypeORM migrations
├── modules/
│   ├── database/        # Entities and service layer
│   ├── import/          # JSON / CSV import validation
│   ├── providers/       # Provider fetch cache
│   └── sync/            # Scheduled provider sync
├── routes/              # Express route definitions
├── views/               # Pug templates
└── server.ts            # Application entry point

tests/
├── unit/                # Backend unit tests
├── controller/          # Controller tests (mocked services)
├── middleware/           # Middleware tests
├── database/            # Database integration tests (real DB)
├── client/              # Frontend tests (Jest + MSW)
├── e2e/                 # End-to-end tests (Playwright)
├── data/                # Test data (data-driven testing)
└── keywords/            # Test keywords (keyword-driven testing)
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, layers, and patterns |
| [Development Guide](docs/DEVELOPMENT.md) | Setup, workflow, code style |
| [Database Guide](docs/DATABASE.md) | Entities, migrations, and ER diagram |
| [Configuration](docs/CONFIGURATION.md) | Settings module and env vars |
| [Import Schema](docs/import-schema.md) | JSON / CSV bulk-import format |
| [Operations](docs/OPERATIONS.md) | Health checks, logging, backups |
| [Testing Guide](docs/TESTING_GUIDE.md) | Data-driven & keyword-driven testing |
| [Docs index](docs/README.md) | Full documentation directory |

## License

All rights reserved.
