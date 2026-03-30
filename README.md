# Hackathon Matcher

A backend API for building and managing hackathon teams with authentication, team creation, invite flows, and a simple candidate matching algorithm.

## Overview

Hackathon Matcher helps users:

- register and log in securely
- create hackathon teams
- define required team skills
- invite users to teams
- view recommended candidates for a team
- track team membership and team status

The project is built with TypeScript, Express, Prisma, PostgreSQL, and JWT-based authentication.

## Features

- User registration and login
- Protected routes with JWT middleware
- Prisma schema for users, skills, teams, hackathons, matches, and notifications
- Team creation with required skills
- Invite workflow for adding users to teams
- Match scoring based on:
  - skill overlap
  - reliability score
  - timezone compatibility
  - availability compatibility
- Seed script for demo data generation

## Tech Stack

- TypeScript
- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT
- bcryptjs
- Faker

## Project Structure

```text
hackathon-matcher/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── algorithm/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── app.ts
│   └── server.ts
├── package.json
└── tsconfig.json
```

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_super_secret_key"
PORT=3000
```

## Installation

```bash
npm install
```

## Prisma Setup

Generate the Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Seed the database:

```bash
npx ts-node prisma/seed.ts
```

## Running the Server

If you run the app with `tsx`:

```bash
npx tsx src/server.ts
```

If you prefer `ts-node`:

```bash
npx ts-node src/server.ts
```

The server starts on:

```text
http://localhost:3000
```

## API Routes

### Auth

`POST /api/auth/register`

Register a new user.

Example body:

```json
{
  "name": "Sonam",
  "email": "sonam@example.com",
  "password": "123456"
}
```

`POST /api/auth/login`

Log in and receive a JWT token.

`GET /api/auth/me`

Get the current logged-in user profile.

Requires:

```text
Authorization: Bearer <token>
```

### Teams

All team routes are protected.

`POST /api/teams`

Create a new team.

`GET /api/teams`

Get all teams.

`GET /api/teams/my`

Get teams for the logged-in user.

`GET /api/teams/:id`

Get details for a single team.

`POST /api/teams/:id/invite`

Invite a user to a team by email.

`PATCH /api/teams/:id/status`

Update a team status such as `FORMING`, `ACTIVE`, or `SUBMITTED`.

`GET /api/teams/:id/matches`

Get recommended candidates for a team.

## Matching Logic

The matching system scores candidates out of 100 using:

- Skill match: 40 points
- Reliability score: 30 points
- Timezone compatibility: 20 points
- Availability compatibility: 10 points

This makes team suggestions more practical for real hackathon collaboration.

## Database Models

Main entities in the schema:

- User
- Skill
- UserSkill
- Hackathon
- Team
- TeamRequiredSkill
- TeamMember
- Match
- Notification

## Current Status

This project currently provides a working backend foundation for a hackathon team formation platform. It is a good starting point for adding:

- frontend integration
- invite acceptance and rejection routes
- notifications UI
- improved ranking logic
- test coverage
- deployment

## Future Improvements

- Add Swagger or Postman API documentation
- Add validation with Zod or Joi
- Add refresh token flow
- Add role-based permissions
- Add filtering and search for teams and candidates
- Add WebSocket or real-time notifications

## Author

Built by Sonam Nath.
