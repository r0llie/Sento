// ============================================
// Sento - Compliance Hook
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  checkWalletCompliance,
  storeComplianceProof,
  getStoredComplianceProof,
  clearComplianceProof,
  type ComplianceCheckResult,
  type ComplianceProof,
} from '../compliance/range-api';

interface UseComplianceReturn {
  isEnabled: boolean;
  isChecking: boolean;
  isCompliant: boolean | null;
  proof: ComplianceProof | null;
  lastCheck: ComplianceCheckResult | null;
  error: Error | null;
  enableCompliance: () => Promise<void>;
  disableCompliance: () => void;
  recheckCompliance: () => Promise<void>;
}

// Storage key for compliance mode preference
const COMPLIANCE_MODE_KEY = 'sento_compliance_mode';

/**
 * Hook to manage compliance mode
 * Uses Range API (simulated) for wallet screening
 */
export function useCompliance(): UseComplianceReturn {
  const { publicKey, connected } = useWallet();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);
  const [proof, setProof] = useState<ComplianceProof | null>(null);
  const [lastCheck, setLastCheck] = useState<ComplianceCheckResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Load compliance mode preference and existing proof
  useEffect(() => {
    if (!publicKey) {
      setIsEnabled(false);
      setProof(null);
      setIsCompliant(null);
      return;
    }

    const walletAddress = publicKey.toBase58();
    
    // Check if compliance mode was enabled
    const stored = localStorage.getItem(COMPLIANCE_MODE_KEY);
    const preferences: Record<string, boolean> = stored ? JSON.parse(stored) : {};
    const wasEnabled = preferences[walletAddress] ?? false;
    
    setIsEnabled(wasEnabled);

    // Load existing proof
    if (wasEnabled) {
      const existingProof = getStoredComplianceProof(walletAddress);
      if (existingProof) {
        setProof(existingProof);
        setIsCompliant(existingProof.result.isCompliant);
        setLastCheck(existingProof.result);
      }
    }
  }, [publicKey]);

  // Enable compliance mode and check wallet
  const enableCompliance = useCallback(async () => {
    if (!publicKey || !connected) {
      setError(new Error('Wallet not connected'));
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();
      
      // Check compliance via Range API
      const result = await checkWalletCompliance(walletAddress);
      setLastCheck(result);
      setIsCompliant(result.isCompliant);

      if (result.isCompliant) {
        // Store proof
        const newProof = storeComplianceProof(walletAddress, result);
        setProof(newProof);
      }

      // Save preference
      const stored = localStorage.getItem(COMPLIANCE_MODE_KEY);
      const preferences: Record<string, boolean> = stored ? JSON.parse(stored) : {};
      preferences[walletAddress] = true;
      localStorage.setItem(COMPLIANCE_MODE_KEY, JSON.stringify(preferences));

      setIsEnabled(true);
    } catch (err) {
      console.error('Compliance check failed:', err);
      setError(err instanceof Error ? err : new Error('Compliance check failed'));
    } finally {
      setIsChecking(false);
    }
  }, [publicKey, connected]);

  // Disable compliance mode
  const disableCompliance = useCallback(() => {
    if (!publicKey) return;

    const walletAddress = publicKey.toBase58();

    // Clear proof
    clearComplianceProof(walletAddress);
    setProof(null);
    setIsCompliant(null);

    // Save preference
    const stored = localStorage.getItem(COMPLIANCE_MODE_KEY);
    const preferences: Record<string, boolean> = stored ? JSON.parse(stored) : {};
    preferences[walletAddress] = false;
    localStorage.setItem(COMPLIANCE_MODE_KEY, JSON.stringify(preferences));

    setIsEnabled(false);
  }, [publicKey]);

  // Recheck compliance
  const recheckCompliance = useCallback(async () => {
    if (!publicKey || !connected || !isEnabled) return;

    setIsChecking(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();
      const result = await checkWalletCompliance(walletAddress);
      setLastCheck(result);
      setIsCompliant(result.isCompliant);

      if (result.isCompliant) {
        const newProof = storeComplianceProof(walletAddress, result);
        setProof(newProof);
      } else {
        clearComplianceProof(walletAddress);
        setProof(null);
      }
    } catch (err) {
      console.error('Compliance recheck failed:', err);
      setError(err instanceof Error ? err : new Error('Compliance recheck failed'));
    } finally {
      setIsChecking(false);
    }
  }, [publicKey, connected, isEnabled]);

  return {
    isEnabled,
    isChecking,
    isCompliant,
    proof,
    lastCheck,
    error,
    enableCompliance,
    disableCompliance,
    recheckCompliance,
  };
}

export default useCompliance;
