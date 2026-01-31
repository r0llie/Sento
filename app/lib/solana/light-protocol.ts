// ============================================
// Sento - Light Protocol Integration
// Complete ZK Compression setup for private payments
// ============================================

import { 
  PublicKey, 
  Keypair,
  Transaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { 
  createRpc,
  Rpc,
  LightSystemProgram,
  buildAndSignTx,
  sendAndConfirmTx,
  defaultTestStateTreeAccounts,
  bn,
  selectStateTreeInfo,
} from '@lightprotocol/stateless.js';
import {
  CompressedTokenProgram,
  createMint as createCompressedMint,
  mintTo as compressedMintTo,
  transfer as compressedTransfer,
  compress,
  decompress,
  getTokenPoolInfos,
  selectTokenPoolInfo,
  selectMinCompressedTokenAccountsForTransfer,
  selectTokenPoolInfosForDecompression,
} from '@lightprotocol/compressed-token';
import { 
  RPC_ENDPOINT, 
  COMPRESSION_ENDPOINT, 
  PROVER_ENDPOINT,
  CURRENT_NETWORK,
} from './constants';

// ============================================
// RPC Connection
// ============================================

let rpcInstance: Rpc | null = null;

/**
 * Get or create Light Protocol RPC connection
 */
export function getRpc(): Rpc {
  if (!rpcInstance) {
    if (CURRENT_NETWORK === 'local') {
      // Local: separate endpoints for validator, indexer, and prover
      rpcInstance = createRpc(RPC_ENDPOINT, COMPRESSION_ENDPOINT, PROVER_ENDPOINT);
    } else {
      // Devnet/Mainnet: Helius provides all endpoints via single URL
      rpcInstance = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);
    }
  }
  return rpcInstance;
}

// ============================================
// Compressed SOL Operations
// ============================================

/**
 * Compress SOL - Move regular SOL to private balance
 * This hides your balance from public explorers
 * @param payer - The wallet public key
 * @param amountSOL - Amount in SOL (not lamports)
 * @param signTransaction - Wallet sign function
 */
export async function compressSOL(
  payer: PublicKey,
  amountSOL: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
): Promise<string> {
  const rpc = getRpc();
  
  // Convert SOL to lamports
  const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
  
  console.log(`Compressing ${amountSOL} SOL (${lamports} lamports)...`);
  
  // Get state tree info
  const stateTreeInfos = await rpc.getStateTreeInfos();
  const stateTreeInfo = selectStateTreeInfo(stateTreeInfos);

  // Create compress instruction
  const compressIx = await LightSystemProgram.compress({
    payer,
    toAddress: payer,
    lamports,
    outputStateTreeInfo: stateTreeInfo,
  });

  // Build transaction
  const { blockhash } = await rpc.getLatestBlockhash();
  const transaction = new Transaction();
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));
  transaction.add(compressIx);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  // Sign with wallet
  const signedTx = await signTransaction(transaction);
  
  // Send and confirm
  const signature = await rpc.sendRawTransaction(signedTx.serialize());
  await rpc.confirmTransaction(signature, 'confirmed');

  return signature;
}

/**
 * Decompress SOL - Claim private SOL back to regular wallet
 * Supports using multiple compressed accounts if needed
 * @param payer - The wallet public key
 * @param amountSOL - Amount in SOL (not lamports)
 * @param signTransaction - Wallet sign function
 */
export async function decompressSOL(
  payer: PublicKey,
  amountSOL: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
): Promise<string> {
  const rpc = getRpc();
  
  // Convert SOL to lamports
  const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
  
  console.log(`Decompressing ${amountSOL} SOL (${lamports} lamports)...`);

  // Get compressed accounts
  const compressedAccounts = await rpc.getCompressedAccountsByOwner(payer);
  
  if (!compressedAccounts.items || compressedAccounts.items.length === 0) {
    throw new Error('No compressed SOL to claim');
  }

  // Calculate total compressed balance
  let totalCompressedBalance = BigInt(0);
  for (const account of compressedAccounts.items) {
    totalCompressedBalance += BigInt(account.lamports.toString());
  }

  if (totalCompressedBalance < BigInt(lamports)) {
    throw new Error(`Insufficient compressed balance. Have: ${Number(totalCompressedBalance) / LAMPORTS_PER_SOL} SOL, Need: ${amountSOL} SOL`);
  }

  // Select accounts to cover the amount (greedy selection)
  const sortedAccounts = [...compressedAccounts.items].sort(
    (a, b) => Number(BigInt(b.lamports.toString()) - BigInt(a.lamports.toString()))
  );

  const selectedAccounts = [];
  let selectedTotal = BigInt(0);

  for (const account of sortedAccounts) {
    selectedAccounts.push(account);
    selectedTotal += BigInt(account.lamports.toString());
    if (selectedTotal >= BigInt(lamports)) {
      break;
    }
    // Limit to 4 accounts per transaction (Light Protocol constraint)
    if (selectedAccounts.length >= 4) {
      break;
    }
  }

  if (selectedTotal < BigInt(lamports)) {
    throw new Error(`Cannot decompress ${amountSOL} SOL. Max available in 4 accounts: ${Number(selectedTotal) / LAMPORTS_PER_SOL} SOL`);
  }

  // Get validity proof for all selected accounts
  const hashes = selectedAccounts.map(acc => acc.hash);
  const proof = await rpc.getValidityProof(hashes);

  // Create decompress instruction with multiple inputs
  const decompressIx = await LightSystemProgram.decompress({
    payer,
    inputCompressedAccounts: selectedAccounts,
    toAddress: payer,
    lamports,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
  });

  // Build transaction
  const { blockhash } = await rpc.getLatestBlockhash();
  const transaction = new Transaction();
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }));
  transaction.add(decompressIx);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  // Sign with wallet
  const signedTx = await signTransaction(transaction);
  
  // Send and confirm
  const signature = await rpc.sendRawTransaction(signedTx.serialize());
  await rpc.confirmTransaction(signature, 'confirmed');

  return signature;
}

/**
 * Transfer compressed SOL privately
 * Supports using multiple compressed accounts if needed
 * @param payer - The sender wallet public key
 * @param recipient - The recipient wallet public key
 * @param lamportsAmount - Amount in LAMPORTS (not SOL) - used for invoice payments
 * @param signTransaction - Wallet sign function
 */
export async function transferCompressedSOL(
  payer: PublicKey,
  recipient: PublicKey,
  lamportsAmount: number,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
): Promise<string> {
  const rpc = getRpc();
  
  console.log(`Transferring ${lamportsAmount / LAMPORTS_PER_SOL} SOL (${lamportsAmount} lamports) privately...`);

  // Get sender's compressed accounts
  const compressedAccounts = await rpc.getCompressedAccountsByOwner(payer);
  
  if (!compressedAccounts.items || compressedAccounts.items.length === 0) {
    throw new Error('No compressed SOL available for transfer');
  }

  // Calculate total compressed balance
  let totalCompressedBalance = BigInt(0);
  for (const account of compressedAccounts.items) {
    totalCompressedBalance += BigInt(account.lamports.toString());
  }

  if (totalCompressedBalance < BigInt(lamportsAmount)) {
    throw new Error(`Insufficient compressed balance. Have: ${Number(totalCompressedBalance) / LAMPORTS_PER_SOL} SOL, Need: ${lamportsAmount / LAMPORTS_PER_SOL} SOL`);
  }

  // Select accounts to cover the amount (greedy selection)
  const sortedAccounts = [...compressedAccounts.items].sort(
    (a, b) => Number(BigInt(b.lamports.toString()) - BigInt(a.lamports.toString()))
  );

  const selectedAccounts = [];
  let selectedTotal = BigInt(0);

  for (const account of sortedAccounts) {
    selectedAccounts.push(account);
    selectedTotal += BigInt(account.lamports.toString());
    if (selectedTotal >= BigInt(lamportsAmount)) {
      break;
    }
    // Limit to 4 accounts per transaction
    if (selectedAccounts.length >= 4) {
      break;
    }
  }

  if (selectedTotal < BigInt(lamportsAmount)) {
    throw new Error(`Cannot transfer ${lamportsAmount / LAMPORTS_PER_SOL} SOL. Max available in 4 accounts: ${Number(selectedTotal) / LAMPORTS_PER_SOL} SOL`);
  }

  // Get validity proof for all selected accounts
  const hashes = selectedAccounts.map(acc => acc.hash);
  const proof = await rpc.getValidityProof(hashes);

  // Create transfer instruction with multiple inputs
  const transferIx = await LightSystemProgram.transfer({
    payer,
    inputCompressedAccounts: selectedAccounts,
    toAddress: recipient,
    lamports: lamportsAmount,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
  });

  // Build transaction
  const { blockhash } = await rpc.getLatestBlockhash();
  const transaction = new Transaction();
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }));
  transaction.add(transferIx);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  // Sign with wallet
  const signedTx = await signTransaction(transaction);
  
  // Send and confirm
  const signature = await rpc.sendRawTransaction(signedTx.serialize());
  await rpc.confirmTransaction(signature, 'confirmed');

  return signature;
}

// ============================================
// Balance Queries
// ============================================

/**
 * Get compressed SOL balance for a wallet
 */
export async function getCompressedBalance(owner: PublicKey): Promise<bigint> {
  const rpc = getRpc();

  try {
    const compressedAccounts = await rpc.getCompressedAccountsByOwner(owner);
    
    if (!compressedAccounts.items || compressedAccounts.items.length === 0) {
      return BigInt(0);
    }

    let totalBalance = BigInt(0);
    for (const account of compressedAccounts.items) {
      totalBalance += BigInt(account.lamports.toString());
    }

    return totalBalance;
  } catch (error) {
    console.error('Error fetching compressed balance:', error);
    return BigInt(0);
  }
}

/**
 * Get compressed account count
 */
export async function getCompressedAccountCount(owner: PublicKey): Promise<number> {
  const rpc = getRpc();

  try {
    const compressedAccounts = await rpc.getCompressedAccountsByOwner(owner);
    return compressedAccounts.items?.length || 0;
  } catch (error) {
    console.error('Error fetching compressed accounts:', error);
    return 0;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if Light Protocol services are available
 */
export async function checkLightProtocolHealth(): Promise<{
  rpc: boolean;
  indexer: boolean;
  prover: boolean;
}> {
  const results = {
    rpc: false,
    indexer: false,
    prover: false,
  };

  // Check RPC
  try {
    const rpc = getRpc();
    const slot = await rpc.getSlot();
    results.rpc = slot > 0;
  } catch (error) {
    console.error('RPC health check failed:', error);
  }

  if (CURRENT_NETWORK === 'local') {
    // Local: check Photon Indexer directly
    try {
      const response = await fetch(COMPRESSION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getIndexerHealth',
        }),
      });
      const data = await response.json();
      results.indexer = data.result?.toLowerCase() === 'ok' || data.result === 'ok';
    } catch (error) {
      console.error('Indexer health check failed:', error);
    }

    // Local: check Prover directly
    try {
      const response = await fetch(`${PROVER_ENDPOINT}/health`);
      const data = await response.json();
      results.prover = data.status === 'ok';
    } catch (error) {
      console.error('Prover health check failed:', error);
    }
  } else {
    // Devnet/Mainnet: Helius provides indexer/prover behind RPC
    results.indexer = results.rpc;
    results.prover = results.rpc;
  }

  return results;
}

/**
 * Format compressed balance for display
 */
export function formatCompressedBalance(lamports: bigint): string {
  const sol = Number(lamports) / 1_000_000_000;
  return sol.toFixed(2);
}

// ============================================
// Exports
// ============================================

export {
  createRpc,
  LightSystemProgram,
  CompressedTokenProgram,
  buildAndSignTx,
  sendAndConfirmTx,
  bn,
  selectStateTreeInfo,
  createCompressedMint,
  compressedMintTo,
  compressedTransfer,
  compress,
  decompress,
};
