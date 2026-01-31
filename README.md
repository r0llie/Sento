# Sento - Private Payments on Solana

> Get paid on Solana without revealing how much you earn.

Sento is a private invoicing and payment platform built on Solana using [Light Protocol](https://zkcompression.com) (ZK Compression). It allows users to create private invoices, receive confidential payments, and maintain hidden balances while still settling on-chain.

## Quick Links

- **Live Demo**: https://sento-six.vercel.app
- **Demo Video**: https://www.youtube.com/watch?v=cn7fym3abnc
- **GitHub**: https://github.com/r0llie/Sento

## Features

- 🔒 **Private Invoices** - Create invoices without revealing payment amounts on-chain
- 💸 **Confidential Payments** - Pay invoices using zero-knowledge proofs
- 👁️ **Hidden Balances** - Your balance is only visible to you
- ✅ **Compliance Ready** - Verify wallet compliance without revealing amounts
- 👥 **Teams** - Simple team context with view/create invoice permissions
- 📦 **Batch Payments** - One compliance proof, many payments

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Blockchain**: Solana (Devnet)
- **Privacy Layer**: Light Protocol (ZK Compression)
- **RPC**: Helius
- **Compliance**: Range Protocol
- **Storage**: Supabase
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare, etc.)

## Getting Started

See [app/README.md](app/README.md) for detailed setup instructions.

```bash
cd app
npm install
npm run dev
```

Open http://localhost:3000

## How It Works

1. **Create Invoice**: User enters recipient address, amount, and note
2. **Share Link**: Invoice link is shared with the payer
3. **Private Payment**: Payer sends funds using ZK compression
4. **Hidden Amount**: Only sender and recipient can see the actual amount

## Privacy Guarantees

- Payment amounts are NOT visible on-chain
- Balances are hidden from public explorers
- Only cryptographic commitments are stored publicly
- Zero-knowledge proofs verify transaction validity

## Hackathon Submission

Sento is built for the Solana Privacy Hackathon:

- 🏆 **Private Payments Track** ($15,000)
- 🏆 **Open Track - Light Protocol** ($18,000)
- 🏆 **Range Bounty** ($1,500+)
- 🏆 **Helius Bounty** ($5,000)
- 🏆 **Encrypt.trade Bounty** ($1,000)

## License

MIT

---

**Privacy by default. Disclosure when you choose.**
