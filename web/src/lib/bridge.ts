import { Contract, Interface, type Signer, type Provider } from 'ethers';

const L2_BRIDGE_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function initiateWithdrawal(address l1Address, uint256 amount) returns (bytes32)',
  'function challengeWithdrawal(bytes32 withdrawalId)',
  'function challengeDeposit(bytes32 depositId)',
  'event WithdrawalInitiated(bytes32 indexed withdrawalId, address indexed l2Address, address indexed l1Address, uint256 amount)',
];

const L1_BRIDGE_ABI = [
  'function depositToL2(address l2Address) payable',
];

export interface BridgeConfig {
  bridgeAddress: string;
}

export interface L1BridgeConfig {
  l1BridgeAddress: string;
  l1RpcUrl: string;
  l1ChainId: number;
}

function getBridgeConfig(): BridgeConfig {
  const bridgeAddress = process.env.NEXT_PUBLIC_BRIDGE_ADDRESS || '';
  return { bridgeAddress };
}

export function getL1BridgeConfig(): L1BridgeConfig | null {
  const l1BridgeAddress = process.env.NEXT_PUBLIC_L1_BRIDGE_ADDRESS || '';
  const l1RpcUrl = process.env.NEXT_PUBLIC_L1_RPC_URL || '';
  const l1ChainId = Number(process.env.NEXT_PUBLIC_L1_CHAIN_ID);
  if (!l1BridgeAddress || !l1RpcUrl || !l1ChainId) return null;
  return { l1BridgeAddress, l1RpcUrl, l1ChainId };
}

export function isL1BridgeConfigured(): boolean {
  return !!getL1BridgeConfig();
}

/** On local devnet (chainId 1337) use 0 confirmations for faster UX. */
function getConfirmations(): number {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
  return chainId === 1337 ? 0 : 1;
}

export function isBridgeConfigured(): boolean {
  return !!getBridgeConfig().bridgeAddress;
}

export async function getBridgeBalance(provider: Provider, account: string): Promise<bigint> {
  const { bridgeAddress } = getBridgeConfig();
  if (!bridgeAddress) throw new Error('Bridge address not configured');
  const bridge = new Contract(bridgeAddress, L2_BRIDGE_ABI, provider);
  return bridge.balanceOf(account);
}

export async function initiateWithdrawal(
  signer: Signer,
  l1Address: string,
  amountWei: bigint
): Promise<{ withdrawalId: string; txHash: string }> {
  const { bridgeAddress } = getBridgeConfig();
  if (!bridgeAddress) throw new Error('Bridge address not configured');
  const bridge = new Contract(bridgeAddress, L2_BRIDGE_ABI, signer);
  const tx = await bridge.initiateWithdrawal(l1Address, amountWei);
  const receipt = await tx.wait(getConfirmations());
  const iface = new Interface(L2_BRIDGE_ABI);
  let withdrawalId = '0x';
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === 'WithdrawalInitiated') {
        withdrawalId = parsed.args.withdrawalId;
        break;
      }
    } catch {
      // skip unrelated logs
    }
  }
  return { withdrawalId, txHash: receipt!.hash };
}

/**
 * Challenge a fraudulent withdrawal (fraud proof). Refunds the L2 address.
 */
export async function challengeWithdrawal(
  signer: Signer,
  withdrawalId: string
): Promise<string> {
  const { bridgeAddress } = getBridgeConfig();
  if (!bridgeAddress) throw new Error('Bridge address not configured');
  const bridge = new Contract(bridgeAddress, L2_BRIDGE_ABI, signer);
  const tx = await bridge.challengeWithdrawal(withdrawalId);
  const receipt = await tx.wait(getConfirmations());
  return receipt!.hash;
}

/**
 * Challenge a fraudulent deposit (fraud proof). Reverts the L2 credit.
 */
export async function challengeDeposit(
  signer: Signer,
  depositId: string
): Promise<string> {
  const { bridgeAddress } = getBridgeConfig();
  if (!bridgeAddress) throw new Error('Bridge address not configured');
  const bridge = new Contract(bridgeAddress, L2_BRIDGE_ABI, signer);
  const tx = await bridge.challengeDeposit(depositId);
  const receipt = await tx.wait(getConfirmations());
  return receipt!.hash;
}

/**
 * Deposit ETH from L1 to L2. User must be on L1 network (e.g. Sepolia).
 * Sends ETH to L1Bridge.depositToL2(l2Address); sequencer will relay to L2.
 */
export async function depositToL1(
  signer: Signer,
  l2Address: string,
  amountWei: bigint
): Promise<string> {
  const cfg = getL1BridgeConfig();
  if (!cfg) throw new Error('L1 bridge not configured');
  const l1Bridge = new Contract(cfg.l1BridgeAddress, L1_BRIDGE_ABI, signer);
  const tx = await l1Bridge.depositToL2(l2Address, { value: amountWei });
  const receipt = await tx.wait(cfg.l1ChainId === 11155111 ? 1 : 0);
  return receipt!.hash;
}
