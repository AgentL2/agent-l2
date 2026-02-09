'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Play, Pause, Square, Zap, Activity, CheckCircle2, XCircle,
  AlertTriangle, Clock, Settings, Terminal, Trash2, RefreshCw,
  ChevronRight, Loader2, DollarSign, Cpu
} from 'lucide-react';
import Link from 'next/link';
import {
  getHostedAgents,
  pauseHostedAgent,
  resumeHostedAgent,
  stopHostedAgent,
  getHostedAgentLogs,
  getTemplateById,
  type HostedAgent,
  type HostedAgentLog,
  EXECUTOR_TEMPLATES,
} from '@/lib/hosted';

interface HostedRuntimePanelProps {
  address: string;
}

// LocalStorage key for persisting hosted agents (MVP workaround)
const HOSTED_AGENTS_KEY = 'agentl2_hosted_agents';

function getLocalAgents(address: string): HostedAgent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HOSTED_AGENTS_KEY);
    if (!stored) return [];
    const all = JSON.parse(stored) as Record<string, HostedAgent[]>;
    return all[address.toLowerCase()] || [];
  } catch {
    return [];
  }
}

function saveLocalAgents(address: string, agents: HostedAgent[]) {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(HOSTED_AGENTS_KEY);
    const all = stored ? JSON.parse(stored) : {};
    all[address.toLowerCase()] = agents;
    localStorage.setItem(HOSTED_AGENTS_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors
  }
}

export default function HostedRuntimePanel({ address }: HostedRuntimePanelProps) {
  const [agents, setAgents] = useState<HostedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<HostedAgent | null>(null);
  const [logs, setLogs] = useState<HostedAgentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      // Try API first
      const data = await getHostedAgents(address);
      if (data.length > 0) {
        setAgents(data);
        saveLocalAgents(address, data); // Cache for persistence
      } else {
        // Fall back to localStorage if API returns empty
        const local = getLocalAgents(address);
        setAgents(local);
      }
      setError(null);
    } catch (err) {
      // On error, try localStorage
      const local = getLocalAgents(address);
      setAgents(local);
      if (local.length === 0) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      }
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  const fetchLogs = useCallback(async (agentId: string) => {
    setLoadingLogs(true);
    try {
      const data = await getHostedAgentLogs(agentId);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      fetchLogs(selectedAgent.id);
      const interval = setInterval(() => fetchLogs(selectedAgent.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedAgent, fetchLogs]);

  const handlePause = async (agent: HostedAgent) => {
    try {
      await pauseHostedAgent(agent.id);
      fetchAgents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const handleResume = async (agent: HostedAgent) => {
    try {
      await resumeHostedAgent(agent.id);
      fetchAgents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  const handleStop = async (agent: HostedAgent) => {
    if (!confirm(`Stop agent "${agent.name}"? This will stop processing orders.`)) return;
    try {
      await stopHostedAgent(agent.id);
      fetchAgents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to stop');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Hosted Agents</h2>
          <p className="text-ink-muted">Deploy and manage agents on AgentL2 infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAgents} className="btn-ghost p-2" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <Link href="/dashboard/create-agent" className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Agent
          </Link>
        </div>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* Agents List */}
      {agents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent?.id === agent.id}
              onSelect={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
              onPause={() => handlePause(agent)}
              onResume={() => handleResume(agent)}
              onStop={() => handleStop(agent)}
            />
          ))}
        </div>
      )}

      {/* Selected Agent Details */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <AgentDetails agent={selectedAgent} logs={logs} loadingLogs={loadingLogs} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function EmptyState() {
  return (
    <div className="card text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center">
        <Cpu className="w-10 h-10 text-accent opacity-50" />
      </div>
      <h3 className="text-2xl font-bold mb-2 text-ink">No AI Agents Yet</h3>
      <p className="text-ink-muted max-w-md mx-auto mb-6">
        Create your first AI agent with custom prompts, tools, and guardrails. 
        Agents run 24/7 and process orders automatically.
      </p>
      <Link href="/dashboard/create-agent" className="btn-primary inline-flex items-center gap-2 mb-4">
        <Plus className="w-4 h-4" />
        Create Agent
      </Link>
      <p className="text-xs text-ink-subtle max-w-sm mx-auto">
        Agents are stored in the AgentL2 Runtime database and execute real AI workloads.
      </p>

      {/* Use Cases */}
      <div className="mt-12 pt-8 border-t border-border">
        <h4 className="text-lg font-semibold mb-4 text-ink">What You Can Build</h4>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <div className="card text-left">
            <div className="text-3xl mb-2">🤖</div>
            <h5 className="font-semibold text-ink">Customer Support</h5>
            <p className="text-xs text-ink-muted">Answer questions, resolve issues, escalate when needed</p>
          </div>
          <div className="card text-left">
            <div className="text-3xl mb-2">💻</div>
            <h5 className="font-semibold text-ink">Code Assistant</h5>
            <p className="text-xs text-ink-muted">Review code, suggest improvements, find bugs</p>
          </div>
          <div className="card text-left">
            <div className="text-3xl mb-2">📊</div>
            <h5 className="font-semibold text-ink">Data Analyst</h5>
            <p className="text-xs text-ink-muted">Extract insights, generate reports, analyze trends</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onSelect,
  onPause,
  onResume,
  onStop,
}: {
  agent: HostedAgent;
  isSelected: boolean;
  onSelect: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const template = getTemplateById(agent.templateId);
  const statusConfig = getStatusConfig(agent.status);

  return (
    <motion.div
      layout
      className={`card cursor-pointer transition-all ${
        isSelected ? 'border-accent/50 bg-accent/5' : 'hover:border-border-light'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{template?.icon || '🤖'}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-ink">{agent.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.classes}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-ink-muted">{template?.name || agent.templateId}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-ink-muted">Orders</p>
              <p className="font-semibold text-ink">{agent.stats.completedOrders}</p>
            </div>
            <div className="text-center">
              <p className="text-ink-muted">Earned</p>
              <p className="font-semibold text-green-400">
                {formatEarnings(agent.stats.totalEarnings)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {agent.status === 'running' && (
              <button onClick={onPause} className="btn-ghost p-2" title="Pause">
                <Pause className="w-4 h-4" />
              </button>
            )}
            {agent.status === 'paused' && (
              <button onClick={onResume} className="btn-ghost p-2 text-green-400" title="Resume">
                <Play className="w-4 h-4" />
              </button>
            )}
            {(agent.status === 'running' || agent.status === 'paused') && (
              <button onClick={onStop} className="btn-ghost p-2 text-red-400" title="Stop">
                <Square className="w-4 h-4" />
              </button>
            )}
            <ChevronRight className={`w-5 h-5 text-ink-muted transition-transform ${isSelected ? 'rotate-90' : ''}`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AgentDetails({
  agent,
  logs,
  loadingLogs,
}: {
  agent: HostedAgent;
  logs: HostedAgentLog[];
  loadingLogs: boolean;
}) {
  const template = getTemplateById(agent.templateId);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Stats */}
      <div className="card">
        <h4 className="text-lg font-semibold mb-4 text-ink flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          Statistics
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Total Orders" value={agent.stats.totalOrders} />
          <StatItem label="Completed" value={agent.stats.completedOrders} color="green" />
          <StatItem label="Failed" value={agent.stats.failedOrders} color="red" />
          <StatItem 
            label="Total Earned" 
            value={formatEarnings(agent.stats.totalEarnings)} 
            color="green" 
          />
        </div>
      </div>

      {/* Config */}
      <div className="card">
        <h4 className="text-lg font-semibold mb-4 text-ink flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent" />
          Configuration
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Template</span>
            <span className="text-ink">{template?.name || agent.templateId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Poll Interval</span>
            <span className="text-ink">{agent.config.pollInterval}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Max Concurrent</span>
            <span className="text-ink">{agent.config.maxConcurrent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Auto Complete</span>
            <span className="text-ink">{agent.config.autoComplete ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Secrets Configured</span>
            <span className="text-ink">{agent.config.secretsConfigured.length} keys</span>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="card lg:col-span-2">
        <h4 className="text-lg font-semibold mb-4 text-ink flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent" />
          Recent Logs
        </h4>
        {loadingLogs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-ink-muted">
            No logs yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: 'green' | 'red';
}) {
  const colorClass = color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-ink';
  return (
    <div className="p-3 rounded-lg bg-surface-muted">
      <p className="text-xs text-ink-muted mb-1">{label}</p>
      <p className={`text-xl font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

function LogEntry({ log }: { log: HostedAgentLog }) {
  const levelConfig = {
    info: { icon: <Activity className="w-3 h-3" />, class: 'text-blue-400' },
    warn: { icon: <AlertTriangle className="w-3 h-3" />, class: 'text-yellow-400' },
    error: { icon: <XCircle className="w-3 h-3" />, class: 'text-red-400' },
  };
  const config = levelConfig[log.level];

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={config.class}>{config.icon}</span>
      <span className="text-ink-muted shrink-0">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className="text-ink">{log.message}</span>
      {log.orderId && (
        <span className="text-ink-subtle font-mono text-xs">
          [{log.orderId.slice(0, 8)}...]
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getStatusConfig(status: HostedAgent['status']) {
  const configs = {
    pending: { 
      label: 'Pending', 
      classes: 'bg-gray-500/20 text-gray-400',
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    starting: { 
      label: 'Starting', 
      classes: 'bg-yellow-500/20 text-yellow-400',
      icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
    },
    running: { 
      label: 'Running', 
      classes: 'bg-green-500/20 text-green-400',
      icon: <span className="w-2 h-2 mr-1 rounded-full bg-green-400 animate-pulse" />,
    },
    paused: { 
      label: 'Paused', 
      classes: 'bg-yellow-500/20 text-yellow-400',
      icon: <Pause className="w-3 h-3 mr-1" />,
    },
    error: { 
      label: 'Error', 
      classes: 'bg-red-500/20 text-red-400',
      icon: <XCircle className="w-3 h-3 mr-1" />,
    },
    stopped: { 
      label: 'Stopped', 
      classes: 'bg-gray-500/20 text-gray-400',
      icon: <Square className="w-3 h-3 mr-1" />,
    },
  };
  return configs[status];
}

function formatEarnings(wei: string): string {
  const value = BigInt(wei || '0');
  const eth = Number(value) / 1e18;
  if (eth === 0) return '0 ETH';
  if (eth < 0.001) return '<0.001 ETH';
  return `${eth.toFixed(3)} ETH`;
}
