# Security & Fraud Proof System

This document describes the fraud proof system, safety measures for agents and users, and audit-oriented design.

## Fraud Proof System

AgentL2 uses an **optimistic** model: the sequencer processes deposits and finalizes withdrawals, and anyone can **challenge** invalid state during a defined window.

### Bridge (L2Bridge)

| Operation | Who | Fraud proof |
|-----------|-----|-------------|
| **processDeposit** | Sequencer only | Any party can call **challengeDeposit(depositId)** to revert an invalid L2 credit. The credited balance is debited from the recipient; the deposit is marked challenged. |
| **initiateWithdrawal** | User | User’s L2 balance is debited; withdrawal enters a 7-day delay. |
| **finalizeWithdrawal** | Sequencer only | Sequencer may finalize only after `WITHDRAWAL_DELAY` (7 days). |
| **challengeWithdrawal** | Any party | Any party can call **challengeWithdrawal(withdrawalId)** before finalization. The withdrawal is marked challenged and the L2 balance is refunded to the initiator. |

**Safety invariants**

- No double-processing: `processDeposit` reverts if `depositId` was already processed.
- No double-withdraw: `initiateWithdrawal` reverts if the same `withdrawalId` already exists (e.g. same block, same params).
- Challenges are irreversible: once a deposit or withdrawal is challenged, it cannot be finalized or re-processed.
- All external calls use custom errors and strict validation (non-zero addresses, positive amounts).

### Marketplace (AgentMarketplace)

| Operation | Who | Safety |
|-----------|-----|--------|
| **createOrder** | Buyer | Payment is held in contract until completion or refund. Excess payment is refunded immediately. |
| **completeOrder** | Seller | Payment (minus protocol fee) is sent to seller only when order is Pending and before deadline. CEI pattern: state updated before transfers. |
| **disputeOrder** | Buyer | Allowed only while order is **Pending** (before completion). Marks order Disputed. |
| **resolveDispute** | Fee collector | For disputed orders: either refund full amount to buyer (**Refunded**) or set back to **Pending** so seller can complete. Ensures buyers are not stuck. |
| **cancelOrder** | Buyer | Allowed only while **Pending** and **before deadline**; full refund to buyer. |

**CEI (Checks-Effects-Interactions)** is used throughout: state changes and balance updates are applied before any external calls (e.g. `transfer`, `recordEarnings`).

### Registry (AgentRegistry)

- **String length cap** (`STRING_MAX_LENGTH = 512`) on `did`, `metadataURI`, `serviceType` to prevent gas griefing.
- **Reputation** is bounded to `REPUTATION_BPS_MAX` (10000 basis points).
- All role checks use custom errors and explicit validation.

## Safety for Agents and Humans

1. **Access control**  
   - Bridge: only sequencer can `processDeposit` and `finalizeWithdrawal`; only current sequencer can `updateSequencer`.  
   - Registry: only owner can `recordEarnings` / `recordSpending` / `updateReputation`; only agent owner can update/deactivate agent and services.  
   - Marketplace: only fee collector can `resolveDispute` and `withdrawFees`; buyer/seller/payer/payee checks on all order and stream functions.

2. **Reentrancy**  
   - All state-changing external functions that perform transfers use OpenZeppelin’s `ReentrancyGuard` and the CEI pattern.

3. **Input validation**  
   - Zero addresses and zero amounts are rejected where applicable.  
   - Deadlines and numeric bounds (e.g. reputation, string length) are enforced.

4. **Refunds and disputes**  
   - Buyers can cancel before deadline (full refund) or dispute before completion; fee collector can resolve disputes with refund or reject.

## Audit-Oriented Conventions

- **Custom errors**  
  All `require`-style checks use Solidity custom errors (e.g. `InsufficientBalance`, `OnlySequencer`) for gas efficiency and clear revert reasons.

- **Constants**  
  Magic numbers are named constants (e.g. `WITHDRAWAL_DELAY`, `BPS_DENOMINATOR`, `STRING_MAX_LENGTH`, `REPUTATION_BPS_MAX`).

- **NatSpec**  
  All public and external functions have `@notice` and, where relevant, `@dev` and `@param`/`@return` for auditors and tooling.

- **No silent failures**  
  Validation failures always revert with a specific error; no silent skips or default values for security-critical paths.

- **Events**  
  Critical state changes (deposits, withdrawals, challenges, order lifecycle, dispute resolution) emit events for indexing and monitoring.

## Reporting Vulnerabilities

If you discover a vulnerability, please report it responsibly (e.g. via a private channel to the maintainers or a bug bounty program if one is announced). Do not open public issues for critical security issues.

## Checklist for Auditors

- [ ] Bridge: deposit/withdrawal lifecycle, challenge logic, balance invariants, access control.
- [ ] Registry: ownership, string length and reputation bounds, role checks.
- [ ] Marketplace: CEI in all order and stream flows, dispute resolution and refunds, fee handling.
- [ ] Reentrancy: every path that performs external calls after state changes.
- [ ] Integer overflow/underflow: Solidity 0.8+ default checks; no unchecked blocks in critical paths.
- [ ] Front-running: withdrawal/deposit IDs and ordering; marketplace order and dispute semantics.
