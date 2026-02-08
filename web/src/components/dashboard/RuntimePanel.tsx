'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Activity, Zap, CheckCircle2, XCircle, AlertTriangle,
  Cpu, RefreshCw, Terminal, Settings, ArrowRight, Copy,
  Loader2, Radio
} from 'lucide-react';
import Link from 'next/link';
import {
  getRuntimeStatus,
  formatEventType,
  formatEventTime,
  getEventColor,
  type RuntimeStatus,
  type RuntimeEvent,
} from '@/lib/runtime';

interface RuntimePanelProps {
  address: string;
}

export default function RuntimePanel({ address }: RuntimePanelProps) {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<RuntimeEvent[]>([]);

  // Fetch initial status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await getRuntimeStatus(address);
      setStatus(data);
      if (data.recentEvents) {
        setEvents(data.recentEvents);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchStatus();

    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Events are updated via polling in fetchStatus

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!status?.connected) {
    return <RuntimeNotConnected address={address} message={status?.message} />;
  }

  const isRunning = status.running && !status.stale;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Agent Runtime</h2>
          <p className="text-ink-muted">Autonomous execution engine status</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStatus} className="btn-ghost p-2" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            isRunning 
              ? 'bg-green-500/20 text-green-400' 
              : status.stale 
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          }`}>
            {isRunning ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Running
              </>
            ) : status.stale ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                Stale
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Stopped
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Processing"
          value={status.processingOrders ?? 0}
          color="yellow"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Completed"
          value={status.processedOrders ?? 0}
          color="green"
        />
        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          label="Executors"
          value={status.executors?.filter(e => e.healthy).length ?? 0}
          suffix={`/ ${status.executors?.length ?? 0}`}
          color="blue"
        />
        <StatCard
          icon={<RefreshCw className="w-5 h-5" />}
          label="Last Update"
          value={status.lastHeartbeat ? formatEventTime(status.lastHeartbeat) : 'Never'}
          isText
          color={status.lastHeartbeat ? 'green' : 'gray'}
        />
      </div>

      {/* Executors */}
      {status.executors && status.executors.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-ink flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent" />
            Registered Executors
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {status.executors.map((executor) => (
              <div
                key={executor.id}
                className={`p-4 rounded-xl border ${
                  executor.healthy
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-ink">{executor.name}</span>
                  {executor.healthy ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <p className="text-xs text-ink-muted font-mono">{executor.id}</p>
                {executor.serviceTypes && executor.serviceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {executor.serviceTypes.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 text-xs rounded-full bg-surface-muted text-ink-subtle"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Log */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-ink flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent" />
          Event Log
          {events.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-ink-muted">
              {events.length} events
            </span>
          )}
        </h3>
        {events.length === 0 ? (
          <div className="text-center py-8 text-ink-muted">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent events</p>
            <p className="text-sm text-ink-subtle">Events will appear here as orders are processed</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {events.map((event, index) => (
                <EventRow key={`${event.timestamp}-${index}`} event={event} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Config Summary */}
      {status.config && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-ink flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            Runtime Configuration
          </h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-ink-muted mb-1">Poll Interval</p>
              <p className="font-medium text-ink">{status.config.pollInterval}ms</p>
            </div>
            <div>
              <p className="text-ink-muted mb-1">Max Concurrent</p>
              <p className="font-medium text-ink">{status.config.maxConcurrent}</p>
            </div>
            <div>
              <p className="text-ink-muted mb-1">Auto Complete</p>
              <p className="font-medium text-ink">{status.config.autoComplete ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-ink-muted mb-1">OpenAI</p>
              <p className="font-medium text-ink">{status.config.hasOpenAI ? 'Configured' : 'Not set'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
  isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  isText?: boolean;
}) {
  const colorClasses = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-accent',
    gray: 'text-ink-muted',
  };

  return (
    <div className="card p-4">
      <div className={`mb-2 ${colorClasses[color]}`}>{icon}</div>
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <p className={`font-semibold ${isText ? 'text-sm' : 'text-2xl'} text-ink`}>
        {value}
        {suffix && <span className="text-sm text-ink-muted ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function EventRow({ event }: { event: RuntimeEvent }) {
  const color = getEventColor(event.type);
  const colorClasses = {
    green: 'border-green-500/30 bg-green-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    gray: 'border-border bg-surface-muted',
  };
  const dotColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`p-3 rounded-lg border ${colorClasses[color]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
          <span className="font-medium text-sm text-ink">{formatEventType(event.type)}</span>
        </div>
        <span className="text-xs text-ink-muted">{formatEventTime(event.timestamp)}</span>
      </div>
      {(event.orderId || event.executorId || event.error || event.txHash) && (
        <div className="mt-2 pl-4 space-y-1">
          {event.orderId && (
            <p className="text-xs text-ink-subtle">
              <span className="text-ink-muted">Order:</span>{' '}
              <span className="font-mono">{event.orderId.slice(0, 16)}...</span>
            </p>
          )}
          {event.executorId && (
            <p className="text-xs text-ink-subtle">
              <span className="text-ink-muted">Executor:</span> {event.executorId}
            </p>
          )}
          {event.durationMs && (
            <p className="text-xs text-ink-subtle">
              <span className="text-ink-muted">Duration:</span> {event.durationMs}ms
            </p>
          )}
          {event.txHash && (
            <p className="text-xs text-ink-subtle flex items-center gap-1">
              <span className="text-ink-muted">TX:</span>{' '}
              <span className="font-mono">{event.txHash.slice(0, 16)}...</span>
              <button
                onClick={() => navigator.clipboard.writeText(event.txHash!)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <Copy className="w-3 h-3" />
              </button>
            </p>
          )}
          {event.error && (
            <p className="text-xs text-red-400">
              <span className="text-ink-muted">Error:</span> {event.error}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function RuntimeNotConnected({ address, message }: { address: string; message?: string }) {
  const [copied, setCopied] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/runtime/status`
    : '/api/runtime/status';

  const configExample = `{
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: 'http://127.0.0.1:8545',
  contracts: {
    registry: '<REGISTRY_ADDRESS>',
    marketplace: '<MARKETPLACE_ADDRESS>',
  },
  openaiApiKey: process.env.OPENAI_API_KEY,
  webhookUrl: '${webhookUrl}',
}`;

  return (
    <div className="space-y-6">
      <div className="card text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center">
          <Zap className="w-10 h-10 text-accent opacity-50" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-ink">Runtime Not Connected</h2>
        <p className="text-ink-muted max-w-md mx-auto mb-6">
          {message || 'Start the AgentL2 runtime with webhook configured to enable real-time monitoring and autonomous order execution.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/docs/autonomous-agents" className="btn-primary inline-flex items-center gap-2">
            <Play className="w-4 h-4" />
            Setup Guide
          </Link>
          <Link href="/docs/sdk" className="btn-secondary inline-flex items-center gap-2">
            SDK Docs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-ink">Quick Start</h3>
        <ol className="space-y-4 text-sm text-ink-muted">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="text-ink font-medium mb-1">Install the runtime</p>
              <code className="block p-3 rounded-lg bg-surface-muted text-ink-subtle font-mono text-xs">
                cd runtime && npm install && cp .env.example .env
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="text-ink font-medium mb-1">Configure webhook URL for dashboard monitoring</p>
              <div className="relative">
                <code className="block p-3 rounded-lg bg-surface-muted text-ink-subtle font-mono text-xs pr-10 overflow-x-auto whitespace-pre">
                  {configExample}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(configExample);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-lg hover:bg-white/10"
                  title="Copy"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-ink-muted" />
                  )}
                </button>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p className="text-ink font-medium mb-1">Run the runtime</p>
              <code className="block p-3 rounded-lg bg-surface-muted text-ink-subtle font-mono text-xs">
                npm run demo:sentiment
              </code>
            </div>
          </li>
        </ol>
      </div>

      <div className="card bg-accent/5 border-accent/30">
        <div className="flex items-start gap-4">
          <div className="shrink-0 p-2 rounded-lg bg-accent/20">
            <Terminal className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h4 className="font-semibold text-ink mb-1">What the runtime does</h4>
            <ul className="text-sm text-ink-muted space-y-1">
              <li>• Polls the marketplace for new orders assigned to your agent</li>
              <li>• Executes tasks using registered executors (OpenAI, webhooks, custom)</li>
              <li>• Generates cryptographic proofs of work completion</li>
              <li>• Submits results and completes orders on-chain</li>
              <li>• Sends status updates to this dashboard in real-time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
