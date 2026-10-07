# NATI LOTTO - Security & Compliance Architecture
**"Your Chance. Your Moment."**
*Document Version: 1.0.0 | Security Classification: Strict Compliance Standard*

---

## 1. Security Philosophy

NATI LOTTO is architected under the principle of **Zero Implicit Trust**. In conventional lottery systems, participants must trust the integrity of the operators, database administrators, and software developers. NATI LOTTO replaces human trust with **cryptographic enforcement, immutable audit logging, and strict legal gating**.

---

## 2. Threat Modeling & Defense Vectors

| Threat Vector | Attack Scenario | NATI LOTTO Defense Mechanism |
| :--- | :--- | :--- |
| **Operator Collusion** | An insider attempts to insert an unauthorized ticket right before the draw to win the prize. | **Pre-Draw SHA-256 Snapshot**: Sales are frozen, all eligible tickets are concatenated deterministically and hashed. Any post-freeze insertion produces an invalid snapshot hash. |
| **Randomness Manipulation** | An attacker predicts or influences the winning ticket index. | **Zero Math.random() + CSPRNG**: 256-bit OS-level cryptographic entropy (`crypto.randomBytes(32)`). Modulo bias bounded below $10^{-77}$. |
| **Race Conditions / Overselling** | Concurrent buyers purchase the last remaining ticket simultaneously. | **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**: Transactions serialize ticket reservations atomically; excess attempts receive explicit rejection. |
| **Duplicate Payment Webhooks** | Payment network timeout causes duplicate webhook callback delivery. | **Idempotent Webhook Guard**: Payments are tracked by unique external transaction IDs with database unique constraints; retries return existing confirmation without double allocation. |
| **Underage Gambling (Minors)** | Under-18 individual registers and participates. | **Strict Age Verification**: Date of birth validation, national ID KYC checks, and legal liability gating before first purchase. |
| **Excessive Gambling / Addiction** | Problem gambler purchases excessive tickets. | **Responsible Play Limits**: Enforced hard caps (max 100 tickets/day, max 25 tickets/draw) and self-exclusion cooldown locks. |
| **MITM & Eavesdropping** | Interception of ticket verification codes or payment tokens. | **TLS 1.3 Transport Encryption**: HTTPS/WSS required with HSTS headers, secure cookies, and Helmet defense. |

---

## 3. Role-Based Access Control (RBAC)

The administrative layer enforces strict separation of duties:

```
                  +--------------------------+
                  |       SUPER_ADMIN        |
                  +-------------+------------+
                                |
        +-----------------------+-----------------------+
        |                       |                       |
+-------v------+        +-------v------+        +-------v------+
|  OPERATIONS  |        |   FINANCE    |        |  COMPLIANCE  |
+--------------+        +--------------+        +--------------+
  - Draw Setup            - Payouts               - Permit Audits
  - Sales Freeze          - Settlements           - Age Verification
  - Trigger Draw          - Refunds               - Self-Exclusion
```

| Role | Permissions |
| :--- | :--- |
| `SUPER_ADMIN` | Full platform administration, system configuration, role assignments. |
| `OPERATIONS` | Create draws, schedule draws, freeze ticket sales, initiate CSPRNG draw execution. |
| `FINANCE` | View payment transactions, reconcile Telebirr / CBE Birr accounts, approve prize claim settlements. |
| `COMPLIANCE` | Verify National Lottery Administration permits, audit responsible play thresholds, enforce self-exclusion orders. |
| `AUDITOR` | Read-only access to all cryptographic proofs, pre-draw snapshots, randomness records, and append-only audit logs. |
| `USER` | Standard player: purchase tickets, view own wallet/tickets, participate in live draws, verify outcomes. |

---

## 4. Responsible Gaming & Player Protection

In accordance with Ethiopian National Lottery Administration guidelines:

1. **18+ Age Gating**: All users must declare birth date and undergo identity verification. Underage accounts are immediately suspended and barred from prize disbursement.
2. **Hard Purchase Quotas**:
   - Maximum daily ticket purchase: **100 tickets per user per calendar day**.
   - Maximum per-draw ticket limit: **25 tickets per user per draw** (prevents wealth-based draw monopolization).
3. **Self-Exclusion Cooldown**:
   - Players can self-exclude for **24 Hours (Take a Break)**, **7 Days**, **30 Days**, or **Permanent Exclusion**.
   - During self-exclusion, all purchase endpoints return `HTTP 403 Forbidden` with active cooldown timer.
4. **Helpline & Support Links**:
   - Prominent links to the National Player Helpline: **994** / **011-551-8888**.
