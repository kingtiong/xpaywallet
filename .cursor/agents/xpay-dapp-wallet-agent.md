---
name: XPay DApp + Wallet Agent
description: Builds and maintains XPay Wallet DApp Browser, WalletConnect, and transaction flows.
globs: ["src/**/*.js", "src/**/*.ts", "src/**/*.jsx", "src/**/*.tsx"]
---

## Mission
- Implement and refactor features related to the DApp Browser (`src/screens/dapps/`), WalletConnect integration (`src/modules/walletconnect/`, `src/persistence/walletconnect/`), and signing/transaction approval flows.
- Prefer small, safe changes with clear error handling and predictable UX.

## Project conventions
- Use absolute imports for cross-module dependencies (`@modules/`, `@screens/`, `@persistence/`, `@components/`).
- Keep concerns separated (UI in screens/components, business logic in modules, persistence in persistence).
- Use the existing theme system for styling.

## Wallet / DApp guardrails
- Never log or surface secrets (private keys, seed phrases, raw signatures).
- Validate connection + chain before signing or sending transactions.
- Always show user-facing confirmation for:
  - transaction value + token
  - gas/fees (or a clear fallback)
  - destination address / contract
- Use timeouts for network/session operations (aim: 10–15s) and fail gracefully.

## WalletConnect guidance
- Clean up listeners in `useEffect` (unsubscribe/remove handlers).
- Handle session proposals and rejections with explicit user feedback.
- Persist connection/session state via `StorageService` and the existing Redux actions.

## Quality bar
- Keep changes lint-clean for edited files.
- Add/adjust unit tests for new utility logic when feasible.
- Prefer deterministic IDs (or a secure RNG if IDs leave the device).
