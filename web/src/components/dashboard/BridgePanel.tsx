'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, Copy, ExternalLink, Shield, Wallet } from 'lucide-react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { challengeDeposit, challengeWithdrawal, depositToL1, getBridgeBalance, initiateWithdrawal, isBridgeConfigured, isL1BridgeConfigured } from '@/lib/bridge';

type Toast = { message: string; type: 'success' | 'error' };

function shortError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rejected') || m.includes('denied')) return 'Transaction rejected';
  if (message.length > 80) return 'Something went wrong';
  return message;
}

export default function BridgePanel() {
  const { address, isConnecting, connect, getSigner } = useWallet();
  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [intentAmount, setIntentAmount] = useState('');
  const [intentId, setIntentId] = useState<string | null>(null);
  const [intentCreatedAt, setIntentCreatedAt] = useState<string | null>(null);
  const [submitIntentLoading, setSubmitIntentLoading] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [withdrawTx, setWithdrawTx] = useState<string | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [challengeWithdrawalId, setChallengeWithdrawalId] = useState('');
  const [challengeDepositId, setChallengeDepositId] = useState('');
  const [challengeLoading, setChallengeLoading] = useState<'withdrawal' | 'deposit' | null>(null);
  const [challengeTx, setChallengeTx] = useState<string | null>(null);

  const [l1DepositAmount, setL1DepositAmount] = useState('');
  const [l1DepositL2Address, setL1DepositL2Address] = useState('');
  const [l1DepositLoading, setL1DepositLoading] = useState(false);
  const [l1DepositTx, setL1DepositTx] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const provider = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
    return new ethers.JsonRpcProvider(rpcUrl);
  }, []);

  useEffect(() => {
    if (!address || !isBridgeConfigured()) {
      setBalanceWei(null);
      return;
    }
    let cancelled = false;
    setBalanceLoading(true);
    setBalanceError(null);
    getBridgeBalance(provider, address)
      .then((bal) => {
        if (!cancelled) setBalanceWei(bal);
      })
      .catch((e) => {
        if (!cancelled) setBalanceError(e instanceof Error ? e.message : 'Failed to load balance');
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => { cancelled = true; };
  }, [address, provider]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const formattedBalance = balanceWei !== null ? ethers.formatEther(balanceWei) : '0.0';

  const sequencerUrl = typeof process.env.NEXT_PUBLIC_SEQUENCER_URL === 'string'
    ? process.env.NEXT_PUBLIC_SEQUENCER_URL.replace(/\/$/, '')
    : '';

  const l1BridgeConfigured = isL1BridgeConfigured();

  const handleL1Deposit = async () => {
    const amount = l1DepositAmount.trim();
    if (!amount || Number(amount) <= 0) {
      setToast({ type: 'error', message: 'Enter a deposit amount' });
      return;
    }
    const l2Addr = (l1DepositL2Address?.trim() || address) || '';
    if (!ethers.isAddress(l2Addr)) {
      setToast({ type: 'error', message: 'Enter a valid L2 recipient address' });
      return;
    }
    const signer = await getSigner();
    if (!signer) {
      setToast({ type: 'error', message: 'Connect your wallet first' });
      return;
    }
    setL1DepositLoading(true);
    setL1DepositTx(null);
    setToast(null);
    try {
      const amountWei = ethers.parseEther(amount);
      const txHash = await depositToL1(signer, l2Addr, amountWei);
      setL1DepositTx(txHash);
      setToast({ type: 'success', message: 'L1 deposit submitted; sequencer will credit L2' });
      setL1DepositAmount('');
      getBridgeBalance(provider, address!).then(setBalanceWei).catch(() => {});
    } catch (e) {
      setToast({ type: 'error', message: shortError(e instanceof Error ? e.message : 'L1 deposit failed') });
    } finally {
      setL1DepositLoading(false);
    }
  };

  const createIntent = () => {
    const amount = intentAmount.trim();
    if (!amount || Number(amount) <= 0) {
      setToast({ type: 'error', message: 'Enter a deposit amount' });
      return;
    }
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `intent-${Date.now()}`;
    setIntentId(id);
    setIntentCreatedAt(new Date().toISOString());
    setToast({ type: 'success', message: 'Deposit intent created' });
  };

  const submitIntentToSequencer = async () => {
    if (!sequencerUrl || !address || !intentId || !intentAmount.trim()) return;
    const amount = intentAmount.trim();
    if (Number(amount) <= 0) {
      setToast({ type: 'error', message: 'Enter a deposit amount' });
      return;
    }
    setSubmitIntentLoading(true);
    setToast(null);
    try {
      const res = await fetch(`${sequencerUrl}/deposit-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId,
          l2Address: address,
          amountEth: amount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || `Request failed (${res.status})` });
        return;
      }
      setToast({ type: 'success', message: 'Deposit processed by sequencer' });
      setIntentId(null);
      setIntentAmount('');
      setIntentCreatedAt(null);
      getBridgeBalance(provider, address).then(setBalanceWei).catch(() => {});
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Submit failed' });
    } finally {
      setSubmitIntentLoading(false);
    }
  };

  const copyIntent = async () => {
    if (!address || !intentId) return;
    const payload = {
      intentId,
      l2Address: address,
      amountEth: intentAmount,
      createdAt: intentCreatedAt,
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setToast({ type: 'success', message: 'Intent copied' });
  };

  const handleWithdraw = async () => {
    if (!address) {
      connect();
      return;
    }
    if (!ethers.isAddress(withdrawTo)) {
      setToast({ type: 'error', message: 'Enter a valid L1 address' });
      return;
    }
    const amount = withdrawAmount.trim();
    if (!amount || Number(amount) <= 0) {
      setToast({ type: 'error', message: 'Enter a withdrawal amount' });
      return;
    }
    const signer = await getSigner();
    if (!signer) {
      setToast({ type: 'error', message: 'Connect your wallet first' });
      return;
    }
    setWithdrawLoading(true);
    setWithdrawTx(null);
    try {
      const amountWei = ethers.parseEther(amount);
      const { txHash } = await initiateWithdrawal(signer, withdrawTo, amountWei);
      setWithdrawTx(txHash);
      setToast({ type: 'success', message: 'Withdrawal initiated' });
    } catch (e) {
      setToast({ type: 'error', message: shortError(e instanceof Error ? e.message : 'Transaction failed') });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleChallengeWithdrawal = async () => {
    const id = challengeWithdrawalId.trim();
    if (!id || id.length !== 66 || !id.startsWith('0x')) {
      setToast({ type: 'error', message: 'Enter a valid withdrawal ID (0x + 64 hex chars)' });
      return;
    }
    const signer = await getSigner();
    if (!signer) {
      setToast({ type: 'error', message: 'Connect your wallet first' });
      return;
    }
    setChallengeLoading('withdrawal');
    setChallengeTx(null);
    setToast(null);
    try {
      const txHash = await challengeWithdrawal(signer, id);
      setChallengeTx(txHash);
      setToast({ type: 'success', message: 'Withdrawal challenged; L2 balance refunded' });
      setChallengeWithdrawalId('');
    } catch (e) {
      setToast({ type: 'error', message: shortError(e instanceof Error ? e.message : 'Challenge failed') });
    } finally {
      setChallengeLoading(null);
    }
  };

  const handleChallengeDeposit = async () => {
    const id = challengeDepositId.trim();
    if (!id || id.length !== 66 || !id.startsWith('0x')) {
      setToast({ type: 'error', message: 'Enter a valid deposit ID (0x + 64 hex chars)' });
      return;
    }
    const signer = await getSigner();
    if (!signer) {
      setToast({ type: 'error', message: 'Connect your wallet first' });
      return;
    }
    setChallengeLoading('deposit');
    setChallengeTx(null);
    setToast(null);
    try {
      const txHash = await challengeDeposit(signer, id);
      setChallengeTx(txHash);
      setToast({ type: 'success', message: 'Deposit challenged; L2 credit reverted' });
      setChallengeDepositId('');
    } catch (e) {
      setToast({ type: 'error', message: shortError(e instanceof Error ? e.message : 'Challenge failed') });
    } finally {
      setChallengeLoading(null);
    }
  };

  if (!isBridgeConfigured()) {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h2 className="text-xl font-semibold text-ink mb-1">Bridge not configured</h2>
            <p className="text-ink-muted text-sm mb-4">
              Set <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono text-sm">NEXT_PUBLIC_BRIDGE_ADDRESS</code> to enable bridge actions.
            </p>
            <Link href="/docs/quickstart" className="btn-secondary inline-flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span>Quick start</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-1 text-ink">Bridge</h2>
          <p className="text-ink-muted text-sm">
            Local devnet bridge. Deposits are intent-only until L1 bridge is wired.
          </p>
        </div>
        {!address ? (
          <button onClick={() => connect()} disabled={isConnecting} className="btn-primary inline-flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        ) : (
          <span className="text-sm text-ink-subtle font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 text-ink">L2 Balance</h3>
          {balanceLoading ? (
            <div className="text-ink-subtle text-sm">Loading…</div>
          ) : balanceError ? (
            <div className="text-red-400 text-sm">{balanceError}</div>
          ) : (
            <div className="text-3xl font-bold text-accent">{formattedBalance} ETH</div>
          )}
          <p className="text-xs text-ink-subtle mt-2">
            L2 bridge balance is tracked separately from your wallet ETH.
          </p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-3 text-ink">Deposit intent</h3>
          <p className="text-sm text-ink-muted mb-4">
            For now, create a deposit intent and have the sequencer process it on local devnet.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              type="number"
              value={intentAmount}
              onChange={(e) => setIntentAmount(e.target.value)}
              placeholder="Amount (ETH)"
              className="input-field flex-1 min-w-[120px]"
              min="0"
              step="0.001"
            />
            <button onClick={createIntent} className="btn-secondary" disabled={submitIntentLoading}>
              Create
            </button>
            {sequencerUrl && (
              <button
                onClick={submitIntentToSequencer}
                disabled={submitIntentLoading || !address || !intentId || !intentAmount.trim() || Number(intentAmount) <= 0}
                className="btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {submitIntentLoading ? 'Submitting…' : 'Submit to sequencer'}
              </button>
            )}
          </div>
          {intentId && (
            <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-ink-subtle">Intent ID</span>
                <button onClick={copyIntent} className="btn-ghost p-2">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="font-mono text-xs text-ink break-all">{intentId}</div>
              <div className="text-xs text-ink-subtle mt-2">Amount: {intentAmount} ETH</div>
            </div>
          )}
        </div>
      </div>

      {l1BridgeConfigured && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownToLine className="w-4 h-4 text-accent" />
            <h3 className="text-lg font-semibold text-ink">Deposit from L1</h3>
          </div>
          <p className="text-sm text-ink-muted mb-4">
            Send ETH from L1 (e.g. Sepolia) to L1 Bridge. Sequencer will credit your L2 balance. Switch your wallet to L1 first.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="number"
              value={l1DepositAmount}
              onChange={(e) => setL1DepositAmount(e.target.value)}
              placeholder="Amount (ETH)"
              className="input-field"
              min="0"
              step="0.001"
            />
            <input
              type="text"
              value={l1DepositL2Address || address || ''}
              onChange={(e) => setL1DepositL2Address(e.target.value)}
              placeholder="L2 recipient (default: connected wallet)"
              className="input-field font-mono text-sm"
            />
            <button
              onClick={handleL1Deposit}
              disabled={l1DepositLoading || !address}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {l1DepositLoading ? 'Submitting…' : 'Deposit to L2'}
            </button>
          </div>
          {l1DepositTx && (
            <div className="mt-3 text-sm text-ink-subtle">
              L1 Tx: <span className="font-mono">{l1DepositTx.slice(0, 10)}…</span>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpFromLine className="w-4 h-4 text-accent" />
          <h3 className="text-lg font-semibold text-ink">Withdraw to L1</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <input
            type="text"
            value={withdrawTo}
            onChange={(e) => setWithdrawTo(e.target.value)}
            placeholder="L1 address"
            className="input-field md:col-span-2 font-mono text-sm"
          />
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Amount (ETH)"
            className="input-field"
            min="0"
            step="0.001"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-ink-subtle">
            Withdrawals finalize after the delay period on local devnet. Sequencer finalizes when ready.
          </p>
          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading || !address}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowDownToLine className="w-4 h-4" />
            {withdrawLoading ? 'Submitting…' : 'Initiate withdrawal'}
          </button>
        </div>
        {withdrawTx && (
          <div className="mt-3 text-sm text-ink-subtle">
            Tx: <span className="font-mono">{withdrawTx.slice(0, 10)}…</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-accent" />
          <h3 className="text-lg font-semibold text-ink">Fraud proof</h3>
        </div>
        <p className="text-sm text-ink-muted mb-4">
          Anyone can challenge an invalid deposit or withdrawal to protect agents and users. Challenging a withdrawal refunds the L2 address; challenging a deposit reverts the L2 credit.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink-subtle mb-1">Withdrawal ID (challenge → refund L2)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={challengeWithdrawalId}
                onChange={(e) => setChallengeWithdrawalId(e.target.value)}
                placeholder="0x..."
                className="input-field flex-1 font-mono text-sm"
              />
              <button
                onClick={handleChallengeWithdrawal}
                disabled={challengeLoading !== null || !address}
                className="btn-secondary whitespace-nowrap disabled:opacity-50"
              >
                {challengeLoading === 'withdrawal' ? '…' : 'Challenge'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-ink-subtle mb-1">Deposit ID (challenge → revert credit)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={challengeDepositId}
                onChange={(e) => setChallengeDepositId(e.target.value)}
                placeholder="0x..."
                className="input-field flex-1 font-mono text-sm"
              />
              <button
                onClick={handleChallengeDeposit}
                disabled={challengeLoading !== null || !address}
                className="btn-secondary whitespace-nowrap disabled:opacity-50"
              >
                {challengeLoading === 'deposit' ? '…' : 'Challenge'}
              </button>
            </div>
          </div>
        </div>
        {challengeTx && (
          <div className="mt-3 text-sm text-ink-subtle">
            Tx: <span className="font-mono">{challengeTx.slice(0, 10)}…</span>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 shadow-lg ${
          toast.type === 'success' ? 'bg-surface-elevated border-green-500/40' : 'bg-surface-elevated border-red-500/40'
        }`}>
          <div className="text-sm text-ink">{toast.message}</div>
        </div>
      )}
    </div>
  );
}
