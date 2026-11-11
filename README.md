# Doctor Tracker API

Standalone Express service for the Doctor Tracker portal. Accounts, doctors, and patients live in MongoDB. Passwords are hashed. Every route except health, login, and signup requires a live session.

## Setup

Requirements: Node.js 20.9 or newer, and MongoDB 7.

```bash
docker compose up -d
copy .env.example .env
npm install
npm run dev
```

Set `JWT_SECRET` in `.env` to a random string of at least 32 characters before starting. The API listens on `http://localhost:4000`.

On startup it creates the demo account when that email is not already registered:

| Email | Password |
| --- | --- |
| sajibcse28@gmail.com | Admin@123 |

If the doctor collection is empty, startup also loads the sample network of 6 doctors and 33 patients.

## Auth contract

Paths stay unversioned because the Next.js client already calls them.

| Method | Path | Auth | Result |
| --- | --- | --- | --- |
| GET | `/health` | Public | `{ status: "ok" }` |
| POST | `/auth/signup` | Public | `201` `{ token, user: { id, name, email } }` |
| POST | `/auth/login` | Public | `200` same session shape |
| GET | `/auth/me` | Bearer | `{ user }` |
| POST | `/auth/logout` | Bearer | `204` and the token stops working |
| GET | `/doctors` | Bearer | Page of doctors. Query: `search`, `specialization`, `range`, `page`, `limit` |
| POST | `/doctors` | Bearer | `201` doctor. Joined date is today |
| GET | `/doctors/:id` | Bearer | Doctor plus `patientCount` |
| GET | `/patients` | Bearer | Page of patients. Query: `search`, `condition`, `doctorId`, `range`, `page`, `limit` |
| POST | `/patients` | Bearer | `201` patient. Admission date is today |
| PATCH | `/patients/:id` | Bearer | Same body as create. Admission date stays put |
| DELETE | `/patients/:id` | Bearer | `204` |
| GET | `/dashboard` | Bearer | Totals, conditions, patients per doctor, 30-day series |

Any other path without a bearer token returns `401`. With a valid token and no matching resource, it returns `404`.

Errors use `{ message, code }`. Validation errors add `fields`. The portal displays `message`. Login uses one message for an unknown email and a wrong password. Signup of an existing email returns `409`. Login and signup are limited to 20 attempts per 15 minutes per client.

A session lasts 7 days. Logout revokes that session in MongoDB, so a copied token cannot keep calling the API. Every authenticated account can use the portal. There is no second role in the product yet.

`Authorization` and `Content-Type` are allowed from `CLIENT_ORIGIN`. In development, other `localhost` ports are allowed as well, because Next.js moves off port 3000 when it is busy.

The OpenAPI description is `openapi.yaml`. Runnable requests are in `postman/collections/Doctor Tracker API`.

## Scripts

```bash
npm run dev    # restart on file changes
npm start      # run once
npm test       # auth contract tests against an in-memory MongoDB
npm run seed   # create the demo account if it is missing
```
