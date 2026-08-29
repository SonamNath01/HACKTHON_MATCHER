# HackMatch Interview Guide

This document contains project-specific interview questions and model answers for the `hackathon-matcher` project. The questions are based on the current codebase: a TypeScript/Express/Prisma backend with a Next.js frontend for hackathon team formation and candidate matching.

## 1. Project Summary Questions

### Q1. What problem does this project solve?
**Answer:**  
This project helps hackathon participants find or build teams more effectively. It supports user registration and login, team creation, skill management, candidate matching, invite workflows, notification handling, and a frontend dashboard for interacting with these features.

### Q2. What is the overall architecture of this project?
**Answer:**  
The backend is built with Node.js, TypeScript, Express, Prisma, and PostgreSQL. Authentication is handled with JWT. The frontend is a separate Next.js application that consumes the backend APIs through Axios. Zustand is used on the frontend to manage client-side authentication state.

### Q3. What are the main modules in the backend?
**Answer:**  
The backend is organized into routes, controllers, middleware, and an algorithm layer. Routes define the API endpoints, controllers contain business logic, middleware handles authentication, and the matching module encapsulates the candidate scoring logic.

### Q4. What are the key entities in the database?
**Answer:**  
The key entities are `User`, `Skill`, `UserSkill`, `Hackathon`, `Team`, `TeamRequiredSkill`, `TeamMember`, `Match`, and `Notification`. These models support user profiles, many-to-many skill relationships, team membership, invite tracking, and notifications.

## 2. Backend Interview Questions

### Q5. How does authentication work in this project?
**Answer:**  
When a user registers or logs in, the backend generates a JWT containing the user ID. That token is returned to the frontend. On protected routes, the `protect` middleware reads the `Authorization` header, verifies the token using `JWT_SECRET`, and attaches the user ID to `req.user`.

### Q6. Why is bcrypt used here?
**Answer:**  
`bcryptjs` is used to hash passwords before storing them in the database. This prevents storing plain-text passwords and reduces the impact of a database leak. During login, the entered password is compared against the stored hash using `bcrypt.compare`.

### Q7. What is the role of Prisma in this project?
**Answer:**  
Prisma acts as the ORM between the application and PostgreSQL. It provides typed database access, schema-based modeling, migration support, and simplifies complex relational queries such as fetching teams with their skills, members, and hackathon details.

### Q8. How is team creation implemented?
**Answer:**  
The `createTeam` controller first verifies that the selected hackathon exists. It then creates the team with required skills and finally inserts the leader into the `TeamMember` table. This ensures the leader is both the logical owner and a member of the team.

### Q9. Why is `TeamMember` stored separately instead of directly keeping an array of user IDs in `Team`?
**Answer:**  
`TeamMember` is a join table that models a many-to-many relationship between teams and users. This is more normalized, supports metadata like `joinedAt`, enforces uniqueness, and scales better than storing arrays inside a relational record.

### Q10. How does the invite flow work?
**Answer:**  
A team leader invites a user by email. The backend validates that the team exists, the requester is the leader, the candidate exists, the candidate is not already a member, the team is not full, and a prior invite does not already exist. It then calculates a match score and creates both a `Match` record and a `Notification` record in a transaction.

### Q11. Why is a transaction used when sending an invite?
**Answer:**  
The transaction ensures that the invite and notification are created together. Without a transaction, it would be possible to create a `Match` but fail to create the notification, leaving the system in an inconsistent state.

### Q12. How are candidate matches calculated?
**Answer:**  
The match score is calculated out of 100 using four components: skill overlap worth 40 points, reliability worth 30 points, timezone compatibility worth 20 points, and availability compatibility worth 10 points. The backend fetches the team requirements and the candidate profile, computes the score, and sorts candidates from highest to lowest.

### Q13. What is good about the current matching algorithm?
**Answer:**  
It is easy to understand, deterministic, and fast enough for a small to medium candidate pool. It also combines both hard-fit signals like skills and softer collaboration signals like timezone and availability, which makes it more practical than skill-only matching.

### Q14. What are the limitations of the current matching algorithm?
**Answer:**  
It is rule-based and uses fixed weights, so it may not reflect real-world team success over time. It also does not account for skill proficiency in the score, does not penalize over-invited or inactive users, and calculates matches in application memory rather than in a precomputed or indexed way for scale.

### Q15. How would you improve the matching algorithm?
**Answer:**  
I would include proficiency weighting, recent activity, invite acceptance rate, and maybe hackathon domain preferences. Over time, I would make the weights configurable and eventually move toward a feedback-driven ranking model based on actual team outcomes, while still keeping an explainable score breakdown.

### Q16. How does invite acceptance work?
**Answer:**  
The invited user can respond with `ACCEPTED` or `REJECTED`. If accepted, the backend validates that the team still exists and is not full, then updates the match status, creates the `TeamMember` record, and notifies the sender, all inside a transaction. If rejected, it updates the match status.

### Q17. What authorization checks are implemented in this project?
**Answer:**  
Protected routes require a valid JWT. In addition, some controllers apply ownership checks, for example only the team leader can update a team’s status, invite members, or view candidate matches. Notification updates also verify that the notification belongs to the logged-in user.

### Q18. What important backend concerns are missing or incomplete?
**Answer:**  
The biggest gaps are request validation, stronger error handling, rate limiting, refresh tokens, centralized Prisma client usage, test coverage, and stricter authorization on all flows. There is also no audit trail, no pagination on list endpoints, and no production-grade observability.

### Q19. Why could repeated `new PrismaClient()` in multiple files be a problem?
**Answer:**  
Creating multiple Prisma client instances can increase connection usage and may cause problems in development or serverless environments. A common best practice is to create a shared Prisma client module and reuse a single instance across controllers.

### Q20. What bug or inconsistency would you call out in this codebase during an interview?
**Answer:**  
The frontend calls `PATCH /api/matches/:id/respond`, and the backend has a `respondToInvite` controller, but there is no visible match route file registered in `app.ts`. That suggests the invite response flow may be incomplete or not wired up. Also, the team detail query does not include `matches`, yet the frontend expects `team.matches` to detect a pending invite.

### Q21. How would you improve input validation in this codebase?
**Answer:**  
I would add schema validation using Zod or Joi at the API boundary for payloads like registration, login, team creation, skill updates, and invite responses. That would catch malformed input early, produce consistent error messages, and reduce invalid database writes.

### Q22. How would you test the backend?
**Answer:**  
I would write unit tests for the matching algorithm and integration tests for auth, team creation, invites, notification reads, and invite acceptance. For integration testing, I would use a test database and seed known fixtures so the API behavior can be verified end to end.

## 3. Frontend Interview Questions

### Q23. How does the frontend manage authentication?
**Answer:**  
The frontend stores the JWT and user object in `localStorage` through a Zustand store. On app initialization, it reloads those values into memory. The Axios instance reads the token from `localStorage` and automatically attaches it as a Bearer token on each request.

### Q24. What are the benefits of using Zustand here?
**Answer:**  
Zustand is lightweight, simple to set up, and works well for small shared state like authentication. It avoids the boilerplate of larger state solutions and fits this project because only a few global pieces of state need to be shared.

### Q25. What are the downsides of the current frontend auth approach?
**Answer:**  
Storing JWTs in `localStorage` exposes them to XSS risk. The app also relies on client-side redirects, which means protected UI can briefly render during initialization. A more secure production setup would usually move toward HTTP-only cookies and stronger session handling.

### Q26. How does the dashboard page optimize network calls?
**Answer:**  
It uses `Promise.all` to fetch teams and notifications in parallel. That reduces total loading time compared to running those requests sequentially.

### Q27. What frontend data consistency issues do you see?
**Answer:**  
The frontend types expect `NotificationsResponse` to include `unreadCount`, but the backend only returns `notifications`. There is also a mismatch around team matches in the detail page, where the UI expects pending invite data from the team endpoint although the backend does not include `matches` in that response.

### Q28. How would you improve the frontend architecture?
**Answer:**  
I would introduce a data-fetching layer such as React Query for caching, invalidation, and mutation handling. I would also centralize API response typing, improve loading and error states, and protect routes using server-aware auth patterns if the app evolves toward a more production-grade Next.js setup.

## 4. System Design Questions

### Q29. How would you scale this system if it grew to millions of users?
**Answer:**  
I would separate responsibilities into clearer services or modules such as auth, teams, matching, notifications, and profile management. I would add caching for frequently read data, queue-based asynchronous processing for expensive match generation and notifications, database indexing and read optimization, and observability for performance bottlenecks.

### Q30. Would you calculate matches on demand or precompute them?
**Answer:**  
For a small system, on-demand calculation is simpler and acceptable. At larger scale, I would precompute or incrementally refresh candidate scores when team requirements or user profiles change. That reduces latency for the team leader and avoids recalculating the full candidate set for every request.

### Q31. How would you design a real-time notification system for this project?
**Answer:**  
I would keep the database as the source of truth, publish notification events to a message broker, and push them to connected clients through WebSockets or server-sent events. If the user is offline, the notification remains stored in the database and is shown on the next dashboard load.

### Q32. How would you handle race conditions when multiple users accept invites to a nearly full team?
**Answer:**  
I would enforce the team size constraint inside a transaction, ideally with row-level locking or a safe conditional update strategy. The current code checks team size before insertion, but at high concurrency that can still race. The database should be the final authority on capacity enforcement.

### Q33. How would you redesign this app for microservices?
**Answer:**  
I would split it into services such as Authentication Service, Team Service, Matching Service, Notification Service, and User Profile Service. Services would communicate through APIs and event messages. That said, I would only adopt microservices if the scale and team size justified the operational complexity.

### Q34. How would you improve API design for production use?
**Answer:**  
I would add versioning, request validation, pagination, filtering, rate limiting, standardized error responses, idempotency for sensitive mutations, and OpenAPI documentation. I would also define clearer resource boundaries for invites, team members, and notifications.

### Q35. How would you make the matching system explainable to users?
**Answer:**  
I would expose the score breakdown already present in the backend, such as skill, reliability, timezone, and commitment subscores. That makes recommendations more transparent and helps users trust the system instead of seeing it as a black box.

### Q36. What monitoring would you add in production?
**Answer:**  
I would add structured logging, request tracing, database query monitoring, API latency dashboards, error-rate alerts, and business metrics like invite acceptance rate, team completion rate, and match conversion rate. These metrics would help measure both technical health and product success.

## 5. Database Interview Questions

### Q37. Why are composite keys used in `UserSkill`, `TeamRequiredSkill`, and some unique constraints?
**Answer:**  
Composite keys are used to enforce relationship uniqueness. For example, a user should not have the same skill twice and a team should not require the same skill twice. Similarly, the unique constraint on `(teamId, receiverId)` prevents duplicate invites to the same user for the same team.

### Q38. Why is `UserSkill` a separate table instead of storing skills directly on the `User` model?
**Answer:**  
Because users can have many skills and each skill can belong to many users. A join table is the correct normalized design, and it also allows extra attributes like `proficiency`.

### Q39. What indexes would you add to this database?
**Answer:**  
I would add indexes on frequently filtered or joined columns such as `TeamMember.teamId`, `TeamMember.userId`, `Match.teamId`, `Match.receiverId`, `Notification.userId`, `Team.hackathonId`, and possibly `User.email` is already unique so it is indexed. If candidate search grows, additional composite indexes should be added based on actual query patterns.

### Q40. What normalization principles are reflected in this schema?
**Answer:**  
The schema is mostly normalized. Core entities are separated by concern, many-to-many relationships are modeled with join tables, and repeated data such as skill names and hackathon definitions are not duplicated across users or teams.

### Q41. What denormalization might help performance later?
**Answer:**  
If matching becomes expensive, we could store derived aggregates such as user skill vectors, precomputed candidate scores, unread notification counts, or team member counts. Denormalization should only be added after identifying real performance bottlenecks.

### Q42. How would you model soft deletes in this project?
**Answer:**  
I would add fields like `deletedAt` or `isDeleted` to entities such as teams, matches, or notifications where historical visibility matters. Queries would then exclude soft-deleted records by default, while still preserving auditability and recovery options.

### Q43. Why is `reliabilityScore` stored on the `User` table?
**Answer:**  
It is a user-level attribute that influences matching across all teams. Storing it on the `User` model makes reads simpler during score calculation. It also reflects that reliability is intended as a reusable reputation signal rather than a team-specific metric.

### Q44. What database constraints help protect data integrity in this schema?
**Answer:**  
Examples include unique emails on `User`, unique skill names on `Skill`, unique hackathon names on `Hackathon`, unique `(teamId, userId)` on `TeamMember`, and unique `(teamId, receiverId)` on `Match`. Foreign key relations also ensure records cannot point to nonexistent parent entities.

### Q45. How would you design a query to fetch a team with its members, skills, and hackathon efficiently?
**Answer:**  
In Prisma, I would use `findUnique` with `include` for `members.user`, `requiredSkills.skill`, and `hackathon`, which is already close to the current implementation. In SQL terms, this maps to joining related tables or running optimized relational fetches while avoiding N+1 query patterns.

## 6. Scenario-Based Questions

### Q46. A team leader says recommendations are poor. How would you debug that?
**Answer:**  
I would inspect the team’s required skills, the leader’s timezone and availability, and the candidate profiles being scored. Then I would verify the score breakdown returned by the algorithm and compare it against expected outcomes. If needed, I would add logs or a debug endpoint to inspect how each subscore is computed.

### Q47. Users complain they are getting duplicate invites. Where would you investigate first?
**Answer:**  
I would first verify the unique constraint on `(teamId, receiverId)` in `Match` and check whether the API endpoint creating invites is always using that lookup correctly. Then I would inspect whether multiple teams are inviting the same user, which is valid, versus the same team inviting the same user twice, which should be blocked.

### Q48. What would you say if an interviewer asks whether this project is production-ready?
**Answer:**  
I would say it is a strong MVP and a good full-stack foundation, but not yet production-ready. It needs stronger validation, tests, security hardening, observability, centralized Prisma management, better auth handling, and cleanup of some frontend-backend contract mismatches.

## 7. Strong Follow-Up Answers

### Q49. What is the best part of this project from an interview perspective?
**Answer:**  
The best part is that it combines full-stack CRUD, authentication, relational data modeling, algorithmic scoring, and product tradeoffs in one project. It gives plenty of room to discuss implementation details as well as how the system could evolve.

### Q50. What is the best way to present this project in an interview?
**Answer:**  
Present it as a team formation platform with an explainable recommendation engine. Start with the user problem, explain the architecture, walk through one core flow such as invite creation, then highlight tradeoffs, known gaps, and how you would scale or harden the system next.

## 8. Short Interview Pitch

You can describe the project like this:

> HackMatch is a full-stack platform that helps hackathon participants form better teams. I built a TypeScript and Express backend with Prisma and PostgreSQL, added JWT-based authentication, modeled team and skill relationships, and implemented a weighted matching algorithm based on skills, reliability, timezone, and availability. I also built a Next.js frontend for registration, profile management, team creation, invite handling, and dashboards. One of the key things I learned was how to combine product requirements, relational data modeling, and algorithm design in a single system.

