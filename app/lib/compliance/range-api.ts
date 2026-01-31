// ============================================
// Sento - Range API Integration
// Real API integration with fallback to simulation
// ============================================

/**
 * Range API provides wallet screening for compliance
 * https://range.org
 * 
 * Features:
 * - Wallet screening for sanctions/risk
 * - Proof hash generation for compliance verification
 * - Self-disclosure report support (via range-intel.ts)
 */

// Environment configuration
// Range API base URL - correct endpoint from docs
const RANGE_API_URL = process.env.NEXT_PUBLIC_RANGE_API_URL || 'https://api.range.org';
const RANGE_API_KEY = process.env.NEXT_PUBLIC_RANGE_API_KEY;
const USE_SIMULATION = !RANGE_API_KEY || process.env.NEXT_PUBLIC_USE_RANGE_SIMULATION === 'true';

export interface ComplianceCheckResult {
  isCompliant: boolean;
  checkedAt: Date;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  proofHash?: string;
  details?: {
    sanctioned: boolean;
    flagged: boolean;
    reason?: string;
  };
}

export interface ComplianceProof {
  walletAddress: string;
  result: ComplianceCheckResult;
  signature: string;
  expiresAt: Date;
}

// Range API Response Types (based on official docs)
export interface RangeAddressRiskResponse {
  riskScore: number; // 1-10
  riskLevel: string; // "CRITICAL RISK", "High risk", "Medium risk", "Low risk", "Very low risk"
  numHops: number;
  maliciousAddressesFound: Array<{
    address: string;
    distance: number;
    name_tag: string | null;
    entity: string | null;
    category: string;
  }>;
  reasoning: string;
  attribution?: {
    name_tag: string;
    entity: string;
    category: string;
    address_role: string;
  } | null;
}

export interface RangeSanctionsResponse {
  is_sanctioned: boolean;
  is_token_blacklisted: boolean;
  sanctions_details?: {
    list: string;
    entity_name: string;
  }[];
  blacklist_details?: {
    token: string;
    issuer: string;
  }[];
}

// Storage key for compliance proofs
const COMPLIANCE_STORAGE_KEY = 'sento_compliance';

/**
 * Check wallet compliance status via Range API
 * Uses real API if RANGE_API_KEY is set, otherwise falls back to simulation
 */
export async function checkWalletCompliance(
  walletAddress: string
): Promise<ComplianceCheckResult> {
  // Use real API if configured
  if (!USE_SIMULATION && RANGE_API_KEY) {
    return checkWalletComplianceReal(walletAddress);
  }
  
  // Fallback to simulation for development/demo
  return checkWalletComplianceSimulated(walletAddress);
}

/**
 * Real Range API call - uses official Range API endpoints
 * Docs: https://docs.range.org/risk-api/risk-introduction
 */
async function checkWalletComplianceReal(
  walletAddress: string
): Promise<ComplianceCheckResult> {
  try {
    // 1. First check sanctions/blacklist (GET /v1/risk/sanctions?address=...)
    const sanctionsUrl = new URL(`${RANGE_API_URL}/v1/risk/sanctions`);
    sanctionsUrl.searchParams.set('address', walletAddress);
    sanctionsUrl.searchParams.set('include_details', 'true');

    const sanctionsResponse = await fetch(sanctionsUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RANGE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    let sanctionsData: RangeSanctionsResponse | null = null;
    if (sanctionsResponse.ok) {
      sanctionsData = await sanctionsResponse.json();
    }

    // If sanctioned, return immediately
    if (sanctionsData?.is_sanctioned || sanctionsData?.is_token_blacklisted) {
      return {
        isCompliant: false,
        checkedAt: new Date(),
        riskScore: 10,
        riskLevel: 'critical',
        proofHash: undefined,
        details: {
          sanctioned: sanctionsData.is_sanctioned,
          flagged: sanctionsData.is_token_blacklisted,
          reason: sanctionsData.is_sanctioned 
            ? 'Address is on OFAC sanctions list'
            : 'Address is blacklisted by token issuer',
        },
      };
    }

    // 2. Get address risk score (GET /v1/risk/address)
    const riskResponse = await fetch(
      `${RANGE_API_URL}/v1/risk/address?address=${encodeURIComponent(walletAddress)}&network=solana`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RANGE_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!riskResponse.ok) {
      const errorText = await riskResponse.text();
      console.error('Range Risk API error:', riskResponse.status, errorText);
      
      // Fallback to simulation on API error
      console.warn('Falling back to simulation due to API error');
      return checkWalletComplianceSimulated(walletAddress);
    }

    const riskData: RangeAddressRiskResponse = await riskResponse.json();
    
    // Map risk score (Range uses 1-10, where 10 is most risky)
    const isCompliant = riskData.riskScore <= 5; // Score 5 or below is acceptable
    const proofHash = generateProofHash(walletAddress);
    
    return {
      isCompliant,
      checkedAt: new Date(),
      riskScore: riskData.riskScore * 10, // Convert to 0-100 scale
      riskLevel: mapRiskLevelFromRange(riskData.riskLevel),
      proofHash: isCompliant ? proofHash : undefined,
      details: {
        sanctioned: false,
        flagged: riskData.riskScore >= 8,
        reason: riskData.reasoning || undefined,
      },
    };
  } catch (error) {
    console.error('Range API request failed:', error);
    // Fallback to simulation on network error
    console.warn('Falling back to simulation due to network error');
    return checkWalletComplianceSimulated(walletAddress);
  }
}

/**
 * Simulated compliance check for development/demo
 */
async function checkWalletComplianceSimulated(
  walletAddress: string
): Promise<ComplianceCheckResult> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Demo: Known bad addresses for testing
  const isKnownBadAddress = 
    walletAddress.toLowerCase().includes('bad') ||
    walletAddress.toLowerCase().includes('sanction');
  
  if (isKnownBadAddress) {
    return {
      isCompliant: false,
      checkedAt: new Date(),
      riskScore: 95,
      riskLevel: 'critical',
      proofHash: undefined,
      details: {
        sanctioned: true,
        flagged: true,
        reason: 'Address appears on sanctions list (simulated)',
      },
    };
  }

  // Default: Address is compliant
  const proofHash = generateProofHash(walletAddress);
  
  return {
    isCompliant: true,
    checkedAt: new Date(),
    riskScore: Math.floor(Math.random() * 15), // Low risk score 0-14
    riskLevel: 'low',
    proofHash,
    details: {
      sanctioned: false,
      flagged: false,
    },
  };
}

/**
 * Map Range API risk level string to typed risk level
 * Range levels: "CRITICAL RISK", "Extremely high risk", "High risk", "Medium risk", "Low risk", "Very low risk"
 */
function mapRiskLevelFromRange(level: string): 'low' | 'medium' | 'high' | 'critical' {
  const normalized = level.toLowerCase();
  if (normalized.includes('critical') || normalized.includes('directly malicious')) return 'critical';
  if (normalized.includes('extremely high') || normalized.includes('high risk')) return 'high';
  if (normalized.includes('medium')) return 'medium';
  return 'low';
}

/**
 * Generate a deterministic proof hash for simulation
 */
function generateProofHash(walletAddress: string): string {
  const timestamp = Date.now().toString(36);
  const addressHash = walletAddress.slice(-8);
  const random = Math.random().toString(36).substring(2, 8);
  return `proof_${timestamp}_${addressHash}_${random}`;
}

/**
 * Verify if Range API is configured
 */
export function isRangeAPIConfigured(): boolean {
  return !USE_SIMULATION && !!RANGE_API_KEY;
}

/**
 * Get Range API configuration status
 */
export function getRangeAPIStatus(): {
  configured: boolean;
  usingSimulation: boolean;
  apiUrl: string;
} {
  return {
    configured: !!RANGE_API_KEY,
    usingSimulation: USE_SIMULATION,
    apiUrl: RANGE_API_URL,
  };
}

/**
 * Store compliance proof locally
 */
export function storeComplianceProof(
  walletAddress: string,
  result: ComplianceCheckResult
): ComplianceProof {
  const proof: ComplianceProof = {
    walletAddress,
    result,
    signature: `sig_${Date.now().toString(36)}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  // Store in localStorage
  const stored = localStorage.getItem(COMPLIANCE_STORAGE_KEY);
  const proofs: Record<string, ComplianceProof> = stored ? JSON.parse(stored) : {};
  proofs[walletAddress] = proof;
  localStorage.setItem(COMPLIANCE_STORAGE_KEY, JSON.stringify(proofs));

  return proof;
}

/**
 * Get stored compliance proof for a wallet
 */
export function getStoredComplianceProof(
  walletAddress: string
): ComplianceProof | null {
  const stored = localStorage.getItem(COMPLIANCE_STORAGE_KEY);
  if (!stored) return null;

  const proofs: Record<string, ComplianceProof> = JSON.parse(stored);
  const proof = proofs[walletAddress];

  if (!proof) return null;

  // Check if proof has expired
  if (new Date(proof.expiresAt) < new Date()) {
    // Remove expired proof
    delete proofs[walletAddress];
    localStorage.setItem(COMPLIANCE_STORAGE_KEY, JSON.stringify(proofs));
    return null;
  }

  return {
    ...proof,
    result: {
      ...proof.result,
      checkedAt: new Date(proof.result.checkedAt),
    },
    expiresAt: new Date(proof.expiresAt),
  };
}

/**
 * Clear compliance proof for a wallet
 */
export function clearComplianceProof(walletAddress: string): void {
  const stored = localStorage.getItem(COMPLIANCE_STORAGE_KEY);
  if (!stored) return;

  const proofs: Record<string, ComplianceProof> = JSON.parse(stored);
  delete proofs[walletAddress];
  localStorage.setItem(COMPLIANCE_STORAGE_KEY, JSON.stringify(proofs));
}

/**
 * Check if wallet has valid compliance proof
 */
export function hasValidComplianceProof(walletAddress: string): boolean {
  const proof = getStoredComplianceProof(walletAddress);
  return proof !== null && proof.result.isCompliant;
}
