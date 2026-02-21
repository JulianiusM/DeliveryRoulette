# DeliveryRoulette

A restaurant suggestion application built with Node.js, Express, TypeScript, and MariaDB.

## Tech Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MariaDB with TypeORM
- **Frontend**: Server-rendered Pug templates + Bootstrap (dark theme)
- **Authentication**: OIDC (OpenID Connect) + local login
- **Testing**: Jest + Playwright

## Getting Started

### Prerequisites

- Node.js >= 24
- MariaDB >= 10.4

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure your database (see `docs/DEVELOPMENT.md`)
4. Build: `npm run build`
5. Run migrations: `npm run typeorm:migrate`
6. Seed diet tags: `npm run seed:diet-tags`

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Testing Guide](docs/TESTING_GUIDE.md)
- [Configuration](docs/CONFIGURATION.md)

## License

All rights reserved.
