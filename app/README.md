# Sento

> Get paid on Solana without revealing how much you earn.

Sento is a private invoicing and payment platform built on Solana using [Light Protocol](https://zkcompression.com) (ZK Compression). It allows users to create private invoices, receive confidential payments, and maintain hidden balances while still settling on-chain.

## Features

- 🔒 **Private Invoices** - Create invoices without revealing payment amounts on-chain
- 💸 **Confidential Payments** - Pay invoices using zero-knowledge proofs
- 👁️ **Hidden Balances** - Your balance is only visible to you
- ✅ **Compliance Ready** - Verify wallet compliance without revealing amounts
- 👥 **Teams (Lite)** - Simple team context with view/create invoice permissions
- 📦 **Batch Payments** - One compliance proof, many payments

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Blockchain**: Solana (Devnet)
- **Privacy Layer**: Light Protocol (ZK Compression)
- **RPC**: Helius
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare, etc.)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Solana wallet (Phantom, Solflare, etc.)
- [Helius API Key](https://www.helius.dev/zk-compression) (for devnet/mainnet)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/r0llie/StealthPay.git
cd StealthPay/app
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Add your Helius API key to `.env.local`:
```
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

### Local Development with Light Protocol

For local development without Helius:

1. Install Light Protocol CLI:
```bash
npm install -g @lightprotocol/zk-compression-cli
```

2. Start local test validator:
```bash
light test-validator
```

3. Set network to local in `.env.local`:
```
NEXT_PUBLIC_NETWORK=local
```

## Project Structure

```
app/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── invoice/           # Invoice pages
│   │   ├── create/        # Create invoice
│   │   └── [id]/          # Invoice detail
│   └── balance/           # Balance page
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   ├── wallet/           # Wallet components
│   └── compliance/       # Compliance components
├── lib/                   # Core logic
│   ├── solana/           # Solana/Light Protocol
│   ├── hooks/            # React hooks
│   ├── compliance/       # Range API
│   └── utils/            # Utilities
├── types/                 # TypeScript types
└── config/               # Configuration
```

## How It Works

1. **Create Invoice**: User enters recipient address, amount, and note
2. **Share Link**: Invoice link is shared with the payer
3. **Private Payment**: Payer sends funds using ZK compression
4. **Hidden Amount**: Only sender and recipient can see the actual amount

### Privacy Guarantees

- Payment amounts are NOT visible on-chain
- Balances are hidden from public explorers
- Only cryptographic commitments are stored publicly
- Zero-knowledge proofs verify transaction validity

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_NETWORK` | Network to use: `local`, `devnet`, `mainnet` | No (default: `devnet`) |
| `NEXT_PUBLIC_HELIUS_API_KEY` | Helius API key for RPC | Yes (for devnet/mainnet) |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test-validator  # Start Light Protocol test validator
```

## Demo

**Live App**: https://sento-six.vercel.app
**Video Demo**: https://www.youtube.com/watch?v=cn7fym3abnc

### Test Wallets

For demo purposes, you can use two test wallets:
1. **Employer Wallet**: Creates and pays invoices
2. **Freelancer Wallet**: Receives payments

### Demo Flow

1. Connect Employer wallet
2. Create invoice for Freelancer address
3. Copy invoice link
4. Switch to Freelancer wallet
5. Open invoice link
6. Pay invoice privately
7. Check balance - amount is hidden from public explorers!

## Hackathon Submission

Sento is built for the Privacy Hackathon and targets:

- 🏆 Private Payments Track
- 🏆 Open Track (Light Protocol)
- 🏆 Range Bounty
- 🏆 Helius Bounty
- 🏆 Encrypt.trade Bounty

## License

MIT

## Links

- [Light Protocol Documentation](https://zkcompression.com)
- [Helius ZK Compression](https://www.helius.dev/zk-compression)
- [Solana Documentation](https://solana.com/docs)
