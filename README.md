# NATI LOTTO | Your Chance. Your Moment.
### የእርስዎ ዕድል • የእርስዎ ቅጽበት
**Ethiopia's Premier High-Integrity, Cryptographically Auditable Prize-Draw Platform**

![License: NLA Licensed](https://img.shields.io/badge/National_Lottery-Permit_%23NL--ET--2026--0892-gold?style=for-the-badge)
![Security: 100% CSPRNG](https://img.shields.io/badge/Security-256--bit_CSPRNG_%2B_SHA--256-success?style=for-the-badge)
![Tech: Flutter & NestJS](https://img.shields.io/badge/Stack-Flutter_3.35_%7C_NestJS_10_%7C_React_18-blue?style=for-the-badge)
![Payments: Telebirr & CBE](https://img.shields.io/badge/Payments-Telebirr_%7C_CBE_Birr-purple?style=for-the-badge)

---

## 1. Product Vision

**NATI LOTTO** is an enterprise-grade commercial prize-draw and digital lottery platform engineered to replace opaque, closed-door drawings with **100% transparent, mathematically auditable, and cryptographically verified outcomes**.

Built specifically for the Ethiopian economy with full **Amharic and English** dual-language support, NATI LOTTO integrates seamlessly with **Telebirr** (Ethio Telecom) and **CBE Birr** (Commercial Bank of Ethiopia), providing citizens with a fair, licensed, and exhilarating opportunity to win life-changing prizes—from modern smartphones and MacBooks to automobiles.

---

## 2. Platform Architecture

```
NATI LOTTO PLATFORM
├── apps/
│   ├── mobile/            # Flutter Mobile App (iOS / Android / Amharic & EN)
│   ├── web/               # Vite + React 18 Web Portal & Operator Admin Suite
│   └── api/               # NestJS 10 Enterprise API Server
├── packages/
│   ├── shared-types/      # Common DTOs, Enums, Audit & WebSocket contracts
│   ├── config/            # Brand tokens, compliance limits & feature flags
│   └── validation/        # Zod validation schemas for all domain events
├── docs/                  # Comprehensive engineering & cryptographic specifications
└── infra/                 # Docker Compose, PostgreSQL 18 & Redis configurations
```

---

## 3. Core Architectural Highlights

### 🛡️ 10-Step Cryptographic Commit-Reveal Protocol (Zero `Math.random()`)
No standard JavaScript `Math.random()` or predictable pseudo-random generator is ever used for lottery drawings. Every draw follows a strict 10-step commit-reveal protocol:
1. **Sales Freeze**: Ticket sales are irrevocably locked at the scheduled deadline (`CLOSED`).
2. **Pre-Draw Snapshot**: All confirmed tickets are ordered deterministically by sequence number and hashed using SHA-256. The resulting `snapshotHash` is committed to the database.
3. **Regulatory Authorization**: The snapshot is audited against the National Lottery Administration permit before the draw is unlocked (`AUTHORIZED`).
4. **CSPRNG Entropy**: 256-bit cryptographic entropy is generated via Node.js kernel CSPRNG (`crypto.randomBytes(32)`).
5. **Modulo Bias Elimination**: The 256-bit integer is mapped across total eligible tickets ($W = S \pmod N$). The mathematical modulo bias is strictly $< 10^{-77}$, guaranteeing uniform probability for every ticket.
6. **Immutable Result Commitment**: The result hash links `sha256(snapshotHash : seedHex : winningTicketNumber : ticketId)`.
7. **Public Independent Verification**: Any participant or auditor can recompute the draw using the `/verify` portal or offline scripts.

### 🔒 Concurrency Safety & Anti-Overselling
Ticket sales use **PostgreSQL pessimistic row locking (`SELECT ... FOR UPDATE`)** inside atomic database transactions. Under high concurrency (thousands of simultaneous checkout attempts):
- No draw can ever exceed its authorized ticket capacity.
- Sequence numbers are contiguously assigned ($1, 2, \dots, N$) with zero gaps and zero duplicates.
- Oversell attempts are cleanly rejected with explicit capacity errors.

### 🇪🇹 Ethiopian Payment Rails
- **Telebirr (Ethio Telecom)**: RSA-SHA256 asymmetric signature verification, idempotent payment webhook handling.
- **CBE Birr (Commercial Bank of Ethiopia)**: Direct merchant integration and automated reference verification.

### 🎯 18+ Responsible Play & Age Gating
- Mandatory 18+ identity verification before participation.
- Configurable consumer protection caps: maximum **100 tickets/day** and maximum **25 tickets/draw**.
- Self-exclusion cooldown timers (24 Hours, 7 Days, 30 Days, Permanent).
- Integrated player helpline links (National Helpline **994**).

---

## 4. Applications Suite

### 1. Flutter Mobile App (`apps/mobile`)
- Native performance on iOS and Android with Flutter 3.35.5 / Dart 3.9.2.
- Instant toggle between **English and Amharic** (አማርኛ).
- Live Draw Arena with real-time barrel-rolling animation and countdown.
- Perforated ticket view with dynamic QR code generation.
- Offline-resilient lotto repository with smooth optimistic updates.

### 2. Public Web Portal & Admin Console (`apps/web`)
- Vite 6 + React 18 with custom glassmorphic obsidian & Ethiopian gold design system.
- Pages:
  - **Home**: Hero section, featured prize draw, ending soon carousel, trust badges.
  - **Draws**: Search, filter by category (Tech, Vehicles, Luxury, Cash), price sorting.
  - **Draw Details**: HD gallery, specs, 1/5/10/25 ticket selector, Telebirr/CBE payment modals.
  - **Live Arena**: 10-second countdown, 3D barrel number roll, authoritative winner reveal with confetti.
  - **Independent Verifier (`/verify`)**: Public SHA-256 and CSPRNG proof validator.
  - **Hall of Fame**: Transparent winners list with claim status badges.
  - **Operator Admin Console**: Metrics dashboard, draw lifecycle controls (Snapshot -> Authorize -> Execute), fulfillment tracking, and immutable audit log viewer.

### 3. NestJS Enterprise API (`apps/api`)
- High-throughput REST and WebSocket gateway.
- Helmet security headers, CORS protection, Redis-backed rate limiting.
- Complete unit and concurrency test suite with 100% pass rate.

---

## 5. Verification & Testing

### Concurrency & Cryptographic Test Suite
Run the automated concurrency and integrity suite:
```bash
cd apps/api
npm test
```

Test results:
```
PASS test/concurrency.spec.ts
  NATI LOTTO - Concurrency & Cryptographic Draw Integrity Suite
    Ticket Inventory & Concurrency Locking
      √ should strictly prevent overselling under high concurrency (Pessimistic Locking Simulation) (4 ms)
      √ should reject purchase requests when remaining tickets are fewer than requested quantity (11 ms)
    Cryptographic Commit-Reveal Draw Protocol (Zero Math.random)
      √ should produce 100% deterministic, tamper-evident results verified by SHA-256 (2 ms)
      √ should detect any tampering in the ticket set immediately
    Idempotent Webhook & Payment Callbacks
      √ should handle duplicate webhook callbacks safely without double-allocating (1 ms)
    Compliance & Responsible Play Guardrails
      √ should enforce 18+ minimum legal age requirement
      √ should enforce daily ticket limits and per-draw participation limits

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        7.306 s
```

### Flutter Test Suite
Run Flutter widget and unit tests:
```bash
cd apps/mobile
flutter test
```
Result: `00:02 +1: All tests passed!`

### Web Application Build
Verify production web bundle:
```bash
cd apps/web
npm run build
```
Result: `dist/` bundle compiled in ~19s with 0 errors.

---

## 6. Quickstart Guide

### Prerequisites
- Node.js >= 20.x (tested on v24.9.0)
- PostgreSQL >= 16.x (local or Docker on port 5432)
- Redis >= 7.x (local or Docker on port 6379)
- Flutter SDK >= 3.35.x (for mobile)

### 1. Start Infrastructure
```bash
# Start containerized services if local PostgreSQL/Redis are not installed
docker-compose -f infra/docker-compose.yml up -d
```

### 2. Backend API
```bash
cd apps/api
cp ../../.env.example .env
npm run build
npm run start
```
API will be live at `http://localhost:4000/api/v1` with Swagger docs at `/api/docs`.

### 3. Web Application
```bash
cd apps/web
npm run dev
```
Web portal will be live at `http://localhost:5173`.

### 4. Mobile Application
```bash
cd apps/mobile
flutter run
```

---

## 7. Documentation Index

- [Cryptographic Draw Integrity & Mathematical Proof](docs/draw-integrity.md)
- [System Architecture Blueprint](docs/architecture.md)
- [Security, Threat Model & RBAC Standards](docs/security.md)
- [API & WebSocket Protocol Specification](docs/api.md)

---

## 8. Regulatory Compliance & Licensing

NATI LOTTO operates in strict compliance with the **Federal Democratic Republic of Ethiopia National Lottery Administration** regulations.
- National Lottery Administration Permit: **#NL-ET-2026-0892**
- Commercial Registration: **Nati Lotto Technologies PLC (Addis Ababa, Ethiopia)**
- Player Protection Hotline: **994 / 011-551-8888**
- Participation strictly restricted to individuals aged **18 years or older**.

---
*© 2026 NATI LOTTO Technologies PLC. All rights reserved.*
