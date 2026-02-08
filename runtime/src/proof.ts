/**
 * Proof of Work Generation & Verification
 * Creates verifiable evidence that AI work was actually performed
 */

import { createHash, randomBytes } from 'crypto';
import { Wallet } from 'ethers';
import type { ProofOfWork, ProofType, ProofEvidence, TaskInput } from './types.js';

// ============================================================================
// Proof Generation
// ============================================================================

export class ProofGenerator {
  private wallet: Wallet;

  constructor(privateKey: string) {
    this.wallet = new Wallet(privateKey);
  }

  /**
   * Generate proof for an LLM completion task
   */
  async generateLLMProof(
    task: TaskInput,
    apiRequest: object,
    apiResponse: object,
    output: unknown
  ): Promise<ProofOfWork> {
    const timestamp = Date.now();
    const inputHash = this.hashObject({ task, apiRequest });
    const outputHash = this.hashObject({ apiResponse, output });
    
    // Log the full API call for dispute resolution
    const rawLog = JSON.stringify({
      timestamp,
      request: apiRequest,
      response: apiResponse,
      taskId: task.orderId,
    });

    const evidence: ProofEvidence = {
      apiCallHash: this.hashObject(apiRequest),
      rawLog: Buffer.from(rawLog).toString('base64'),
    };

    const proofData = {
      type: 'llm-completion' as ProofType,
      timestamp,
      inputHash,
      outputHash,
      evidence,
    };

    const signature = await this.signProof(proofData);

    return {
      ...proofData,
      signature,
    };
  }

  /**
   * Generate proof for deterministic computation
   */
  async generateDeterministicProof(
    task: TaskInput,
    algorithm: string,
    seed: string,
    output: unknown
  ): Promise<ProofOfWork> {
    const timestamp = Date.now();
    const inputHash = this.hashObject({ task, seed });
    const outputHash = this.hashObject(output);

    const evidence: ProofEvidence = {
      seed,
      algorithm,
    };

    const proofData = {
      type: 'deterministic' as ProofType,
      timestamp,
      inputHash,
      outputHash,
      evidence,
    };

    const signature = await this.signProof(proofData);

    return {
      ...proofData,
      signature,
    };
  }

  /**
   * Generate proof with multiple verifiers
   */
  async generateMultiPartyProof(
    task: TaskInput,
    output: unknown,
    verifierSignatures: string[]
  ): Promise<ProofOfWork> {
    const timestamp = Date.now();
    const inputHash = this.hashObject(task);
    const outputHash = this.hashObject(output);

    const evidence: ProofEvidence = {
      verifierSignatures,
    };

    const proofData = {
      type: 'multi-party' as ProofType,
      timestamp,
      inputHash,
      outputHash,
      evidence,
    };

    const signature = await this.signProof(proofData);

    return {
      ...proofData,
      signature,
    };
  }

  /**
   * Generate a simple proof (for basic verification)
   */
  async generateSimpleProof(
    task: TaskInput,
    input: unknown,
    output: unknown,
    type: ProofType = 'llm-completion'
  ): Promise<ProofOfWork> {
    const timestamp = Date.now();
    const inputHash = this.hashObject(input);
    const outputHash = this.hashObject(output);

    const evidence: ProofEvidence = {
      rawLog: Buffer.from(JSON.stringify({ input, output, timestamp })).toString('base64'),
    };

    const proofData = {
      type,
      timestamp,
      inputHash,
      outputHash,
      evidence,
    };

    const signature = await this.signProof(proofData);

    return {
      ...proofData,
      signature,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private hashObject(obj: unknown): string {
    const json = JSON.stringify(obj, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
    return createHash('sha256').update(json).digest('hex');
  }

  private async signProof(proofData: Omit<ProofOfWork, 'signature'>): Promise<string> {
    const message = JSON.stringify(proofData);
    return this.wallet.signMessage(message);
  }

  /**
   * Generate result hash for on-chain submission
   */
  generateResultHash(result: unknown): Uint8Array {
    const hash = this.hashObject(result);
    return Uint8Array.from(Buffer.from(hash, 'hex'));
  }
}

// ============================================================================
// Proof Verification
// ============================================================================

export class ProofVerifier {
  /**
   * Verify a proof's signature
   */
  static verifySignature(proof: ProofOfWork, expectedSigner: string): boolean {
    try {
      const { signature, ...proofData } = proof;
      const message = JSON.stringify(proofData);
      const recovered = Wallet.verifyMessage(message, signature);
      return recovered.toLowerCase() === expectedSigner.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Verify proof input hash matches expected input
   */
  static verifyInputHash(proof: ProofOfWork, input: unknown): boolean {
    const json = JSON.stringify(input, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
    const expected = createHash('sha256').update(json).digest('hex');
    return proof.inputHash === expected;
  }

  /**
   * Verify proof output hash matches expected output
   */
  static verifyOutputHash(proof: ProofOfWork, output: unknown): boolean {
    const json = JSON.stringify(output, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
    const expected = createHash('sha256').update(json).digest('hex');
    return proof.outputHash === expected;
  }

  /**
   * Check if proof is within acceptable time window
   */
  static verifyTimestamp(proof: ProofOfWork, maxAgeMs: number = 3600000): boolean {
    const age = Date.now() - proof.timestamp;
    return age >= 0 && age <= maxAgeMs;
  }

  /**
   * Full verification of a proof
   */
  static verify(
    proof: ProofOfWork,
    expectedSigner: string,
    input?: unknown,
    output?: unknown
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.verifySignature(proof, expectedSigner)) {
      errors.push('Invalid signature');
    }

    if (!this.verifyTimestamp(proof)) {
      errors.push('Proof timestamp out of range');
    }

    if (input !== undefined && !this.verifyInputHash(proof, input)) {
      errors.push('Input hash mismatch');
    }

    if (output !== undefined && !this.verifyOutputHash(proof, output)) {
      errors.push('Output hash mismatch');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
