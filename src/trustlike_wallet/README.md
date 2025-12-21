## TrustLike Wallet (new module)

This folder contains a **fresh, standalone wallet implementation** (no code copied from other modules in this repo).

### MVP scope implemented here
- **Non-custodial vault**: create / restore mnemonic stored in device secure storage (Keychain/Keystore).
- **Address derivation** (single account, index 0):
  - **Bitcoin** (BIP84 bech32): `m/84'/0'/0'/0/0`
  - **EVM** (Ethereum/BSC for ERC20/BEP20): `m/44'/60'/0'/0/0`
  - **Tron** (TRX / TRC20): `m/44'/195'/0'/0/0`
  - **Solana** (SOL): `m/44'/501'/0'/0'`
- **dApp browser**: in-app WebView + a minimal WalletConnect v2 scaffolding (requires a WalletConnect Project ID).

### Notes / next steps
- Token balances, transaction building/signing, and full WalletConnect request handling are **scaffolded** but not yet feature-complete.
- Before enabling WalletConnect: set a real project id in `core/walletconnect/wcConfig.js`.

