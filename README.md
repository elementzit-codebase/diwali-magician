# Premium QR Code Voting Application

A secure, mobile-first, and luxury QR code-based voting web application designed for private events (~50 members) with two voting categories (**Best Dressing** and **Best Speech**).

## Architecture Highlights
- **Single-Port Architecture**: Express HTTP server on a single port (`PORT=5000`) serving both the RESTful API (`/api/*`) and the React SPA with Vite middleware mode in development, or compiled static assets in production.
- **Confidential Ballot Design**: Decoupled `ballots` and `voter_participation` tables with composite foreign keys and atomic PostgreSQL transactions.
- **Zero Seed Data**: Tables initialize completely empty; administrative access begins via a one-time setup mechanism.
- **Mobile-First Luxury Experience**: Styled with Tailwind CSS, custom luxury palette (#B32635 primary red, #F7F7F5 canvas, #B99A65 champagne gold accents), and touch-optimized candidate cards.

## Quick Start

### 1. Requirements
- Node.js >= 18
- PostgreSQL 14+ (Local port 5432 or configured via `.env`)

### 2. Setup
```bash
# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install
```

### 3. Running the Application
```bash
# Development (Express + Vite Middleware on Port 5000)
npm run dev

# Production Build & Start
npm run build
npm start

# Run Automated Tests
npm test
```

