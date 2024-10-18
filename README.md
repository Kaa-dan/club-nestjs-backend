# ClubWize Backend

## Overview

This repository contains the backend code for ClubWize, a professional social platform designed for structured communication and collaboration. The backend handles the core functionality of Clubs, Nodes, Chapters, Teams, and Modules, as well as user management and content approval processes.

## Table of Contents

1. [Technologies](#technologies)
2. [Project Structure](#project-structure)
3. [Setup](#setup)
4. [Running the App](#running-the-app)
5. [Testing](#testing)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Authentication](#authentication)
9. [Deployment](#deployment)
10. [Resources](#resources)
11. [Contributing](#contributing)

## Technologies

- [NestJS](https://nestjs.com/) (Node.js framework)
- TypeScript
- MongoDB
- Redis (for caching)
- Socket.io (for real-time features)
- JSON Web Tokens (JWT) for authentication

## Project Structure

```
clubwize-backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── modules/
│   ├── services/
│   ├── utils/
│   └── main.ts
├── test/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Setup

1. Clone the repository:

   ```
   git clone https://github.com/clubwize/backend.git
   cd clubwize-backend
   ```

2. Install dependencies:

   ```
   pnpm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration details.

## Running the App

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Testing

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## API Documentation

API documentation is available at `/api-docs` when running the server. It's generated using Swagger.

## Database Schema

The main entities in the database are:

- Users
- Clubs
- Nodes
- Chapters
- Teams
- Modules
- Posts
- Comments

Refer to the `src/models` directory for detailed schema definitions.

## Authentication

Authentication is handled using JSON Web Tokens (JWT). Protected routes require a valid token in the Authorization header.

## Deployment

When you're ready to deploy your ClubWize NestJS application to production, follow these steps:

1. Build the project:

   ```bash
   $ pnpm run build
   ```

2. Start the production server:
   ```bash
   $ pnpm run start:prod
   ```

For cloud-based deployment, consider using [Mau](https://mau.nestjs.com), the official platform for deploying NestJS applications on AWS:

```bash
$ pnpm install -g mau
$ mau deploy
```

For more information on deployment options, check out the [NestJS deployment documentation](https://docs.nestjs.com/deployment).

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [NestJS Discord Channel](https://discord.gg/G7Qnnhy)
- [NestJS Video Courses](https://courses.nestjs.com/)
- [NestJS Mau](https://mau.nestjs.com)
- [NestJS Devtools](https://devtools.nestjs.com)
- [NestJS Enterprise Support](https://enterprise.nestjs.com)
- [NestJS Jobs Board](https://jobs.nestjs.com)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

For major changes, please open an issue first to discuss what you would like to change.

---

For more information about ClubWize, visit our [official website](https://clubwize.com).

## Support

ClubWize is an open-source project. If you'd like to support the project, please consider [becoming a sponsor](https://opencollective.com/clubwize).

## Stay in touch

- Website - [https://clubwize.com](https://clubwize.com/)
- Twitter - [@clubwize](https://twitter.com/clubwize)

## License

ClubWize is [MIT licensed](LICENSE).
