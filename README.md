
---

# Karibu Groceries LTD (Wholesale Internal Cereal Management System)

## Project Overview

**Karibu Groceries LTD (KGL)** is a wholesale cereal distributor operating in two branches: **Maganjo** and **Matugga**.

Previously, the business relied on manual black book records, which caused:

* Frequent errors
* Poor visibility of stock and sales
* Difficulty tracking credit/deferred payments
* Limited oversight for directors

This full-stack application replaces manual processes with a digital solution that:

* Enforces business rules via role-based access
* Tracks stock and sales in real-time
* Improves accountability and reporting
* Supports cash and credit/deferred sales

---

## Key Features

* **Role-based access control** (Director, Manager, Sales Agent)
* Procurement recording (incoming produce from dealers/farms)
* Cash and credit/deferred sales management
* Stock level tracking (automatic deduction after sales)
* Aggregated reporting for directors
* Secure user authentication (JWT-based)
* Interactive frontend dashboard with filters, pagination & CSV export
* API documentation via **Swagger**

---

## User Roles & Permissions

| Role            | Can View Totals | Can Record Procurement | Can Set Prices | Can Record Sales | Can View Credit Balances |
| --------------- | --------------- | ---------------------- | -------------- | ---------------- | ------------------------ |
| **Director**    | Yes             | No                     | No             | No               | Yes                      |
| **Manager**     | Yes             | Yes                    | Yes            | No               | Yes                      |
| **Sales Agent** | No              | No                     | No             | Yes              | Limited                  |



---


# Application Screenshots


## Login Page

Displays the secure authentication form where users enter their credentials to access the system.

![Login Page](./screenshots/login-page.png)

### Features:

* Email and password authentication

* JWT login handled through the backend API

* Role-based redirection after login



## Forgot Password Page

If users forget their password, they are instructed to contact the system administrator.

![Forgot Password](./screenshots/forgot-password.png)

### Features:

* Simple support message

* Directs users to contact admin for password reset

* Prevents unnecessary password reset complexity for internal system



## Manager Dashboard

Managers can view operational summaries and manage procurement records.

![Manager Dashboard](./screenshots/manager-dashboard.png)
![Manager Dashboard](./screenshots/procurement-page.png)
![Manager Dashboard](./screenshots/sales-dashboard.png)
![Manager Dashboard](./screenshots/sales-page.png)

### Features:

* View stock levels

* Record procurement

* Monitor sales summaries



## Director Dashboard

Directors can view high-level reports across all branches.

![Director Dashboard](./screenshots/directors-dashboard.png)
![Directors Dashboard](./screenshots/user-management.png)

### Features:

* Cross-branch overview

* Sales summaries

* Credit balances monitoring


## Technologies Used

### Frontend

* Vue 3 + Vite
* Pinia for state management
* Vue Router 4
* HTML5 & CSS3 (custom + Bootstrap 5)
* Font Awesome icons

### Backend

* Node.js + Express.js
* MongoDB (via Mongoose)
* JWT for authentication
* Swagger (swagger-jsdoc + swagger-ui-express)
* dotenv for environment variables
* Helmet, CORS, express-rate-limit for security

---

## Frontend Structure (Vue 3 + Vite)

```text
frontend/
├── public/                     # Static assets (favicon, images)
├── src/
│   ├── assets/                 # Images, SVGs, icons
│   │   └── images/
│   │       └── Karibu.svg
│   ├── components/             # Reusable Vue components
│   │   ├── layout/             # Layout components
│   │   │   └── MainLayout.vue
│   │   └── ui/                 # Buttons, cards, modals, etc.
│   ├── stores/                 # Pinia stores
│   │   └── authStore.js
│   ├── views/                  # Page views
│   │   ├── Login.vue
│   │   ├── ForgotPassword.vue
│   │   ├── Dashboard.vue
│   │   ├── DirectorDashboard.vue
│   │   ├── UserManagement.vue
│   │   ├── Procurement.vue
│   │   └── Sales.vue
│   ├── router/                 # Vue Router setup
│   │   └── index.js
│   ├── App.vue                 # Root component
│   └── main.js                 # App entry point
├── index.html                  # HTML entry point
├── package.json
└── vite.config.js
```
---

## API Architecture - Three Routers

1. **/api/procurement** - Records produce purchases (Managers only)
2. **/api/sales** - Handles cash & credit sales (Managers + Sales Agents)
3. **/api/users** - User registration, login, role management

**API docs:** `http://localhost:5000/api-docs`

---

## Business Rules

* Stock decreases automatically after each sale
* Cannot sell more than available stock
* Credit sales require buyer National ID, location, contact, due date
* Managers set prices and record procurement
* Directors view summaries only
* All monetary values in Ugandan Shillings (UGX)

---

## Setup Instructions

### Prerequisites

* Node.js ≥ 18
* MongoDB (local or Atlas)
* Git

### 1. Clone repo

```bash
git clone https://github.com/yourusername/karibu-groceries.git
cd karibu-groceries
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development

DATABASE_URI=mongodb://localhost:27017/karibu_groceries_db
# or Atlas: mongodb+srv://user:pass@cluster0.mongodb.net/karibu_groceries?retryWrites=true&w=majority

JWT_SECRET=your_very_long_random_secret_here
JWT_EXPIRES_IN=1d
```

### 4. Start MongoDB

```bash
mongod
```

### 5. Run Backend Server

```bash
npm start
# or
npm run dev
```

Backend runs at: `http://localhost:5000`

API docs: `http://localhost:5000/api-docs`

### 6. Run Frontend (Vue 3 + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173` (default Vite port)

---

## How to Use

1. Open frontend in browser (`http://localhost:5173`)
2. Login with valid credentials (created by Director)
3. Users are redirected based on role:

   * Directors - DirectorDashboard
   * Managers - Dashboard + Procurement
   * Sales Agents - Dashboard + Sales only
4. Forgot Password page displays message: **Contact Admin**

---

## Security & Best Practices

* JWT authentication
* Role-based authorization
* Helmet security headers
* CORS configured
* Rate limiting on sensitive endpoints
* Input validation
* `.env` secrets not committed

---

## License

MIT License - for learning purposes only

Made for **Karibu Groceries LTD**

---
