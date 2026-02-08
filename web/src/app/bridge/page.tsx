'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowDown, Zap, Trophy, Star, Gift, Users, TrendingUp,
  ChevronDown, ExternalLink, Sparkles, Award, Clock
} from 'lucide-react';
import AppNav from '@/components/AppNav';

interface Chain {
  id: string;
  name: string;
  icon: string;
  color: string;
  tokens: Token[];
}

interface Token {
  symbol: string;
  name: string;
  icon: string;
  balance?: string;
  multiplier: number; // Points multiplier
}

const chains: Chain[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    icon: '⟠',
    color: 'from-blue-500 to-indigo-600',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', icon: '⟠', multiplier: 1.0 },
      { symbol: 'USDC', name: 'USD Coin', icon: '💵', multiplier: 0.9 },
      { symbol: 'USDT', name: 'Tether', icon: '💵', multiplier: 0.9 },
      { symbol: 'WETH', name: 'Wrapped ETH', icon: '⟠', multiplier: 1.0 },
    ],
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    icon: '🔵',
    color: 'from-blue-400 to-cyan-500',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', icon: '⟠', multiplier: 1.1 },
      { symbol: 'ARB', name: 'Arbitrum', icon: '🔵', multiplier: 1.2 },
      { symbol: 'USDC', name: 'USD Coin', icon: '💵', multiplier: 0.9 },
    ],
  },
  {
    id: 'optimism',
    name: 'Optimism',
    icon: '🔴',
    color: 'from-red-500 to-pink-500',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', icon: '⟠', multiplier: 1.1 },
      { symbol: 'OP', name: 'Optimism', icon: '🔴', multiplier: 1.2 },
      { symbol: 'USDC', name: 'USD Coin', icon: '💵', multiplier: 0.9 },
    ],
  },
  {
    id: 'base',
    name: 'Base',
    icon: '🔷',
    color: 'from-blue-600 to-blue-800',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', icon: '⟠', multiplier: 1.15 },
      { symbol: 'USDC', name: 'USD Coin', icon: '💵', multiplier: 0.9 },
    ],
  },
  {
    id: 'polygon',
    name: 'Polygon',
    icon: '💜',
    color: 'from-purple-500 to-violet-600',
    tokens: [
      { symbol: 'MATIC', name: 'Polygon', icon: '💜', multiplier: 1.0 },
      { symbol: 'ETH', name: 'Ethereum', icon: '⟠', multiplier: 1.0 },
      { symbol: 'USDC', name: 'USD Coin', icon: '💵', multiplier: 0.9 },
    ],
  },
  {
    id: 'bsc',
    name: 'BNB Chain',
    icon: '🟡',
    color: 'from-yellow-500 to-orange-500',
    tokens: [
      { symbol: 'BNB', name: 'BNB', icon: '🟡', multiplier: 1.0 },
      { symbol: 'ETH', name: 'Ethereum', icon: '⟠', multiplier: 1.0 },
      { symbol: 'USDT', name: 'Tether', icon: '💵', multiplier: 0.9 },
    ],
  },
];

const tiers = [
  { name: 'Starter', points: 0, color: 'text-gray-400', bonus: '0%' },
  { name: 'Bronze', points: 10000, color: 'text-amber-600', bonus: '+2.5%' },
  { name: 'Silver', points: 50000, color: 'text-gray-300', bonus: '+5%' },
  { name: 'Gold', points: 200000, color: 'text-yellow-400', bonus: '+7.5%' },
  { name: 'Platinum', points: 1000000, color: 'text-cyan-300', bonus: '+10%' },
];

export default function BridgePage() {
  const [fromChain, setFromChain] = useState(chains[0]);
  const [fromToken, setFromToken] = useState(chains[0].tokens[0]);
  const [amount, setAmount] = useState('');
  const [showChainSelect, setShowChainSelect] = useState(false);
  const [showTokenSelect, setShowTokenSelect] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  
  // Mock user data
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState(0);
  const [userRank, setUserRank] = useState(0);
  const [isEarlyBird, setIsEarlyBird] = useState(true);
  const [streakDays, setStreakDays] = useState(0);

  // Calculate points preview
  const calculatePoints = () => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    
    const ethValue = parseFloat(amount); // Simplified
    let points = Math.floor(ethValue * 1000); // Base: 1000 per ETH
    
    // Multipliers
    points = Math.floor(points * fromToken.multiplier);
    
    // Early bird +20%
    if (isEarlyBird) points = Math.floor(points * 1.2);
    
    // Streak bonus (up to +35%)
    if (streakDays > 0) {
      const streakBonus = Math.min(streakDays * 0.05, 0.35);
      points = Math.floor(points * (1 + streakBonus));
    }
    
    // Tier bonus
    points = Math.floor(points * (1 + userTier * 0.025));
    
    return points;
  };

  const pointsPreview = calculatePoints();
  const fee = amount ? (parseFloat(amount) * 0.001).toFixed(6) : '0'; // 0.1% fee
  const receiveAmount = amount ? (parseFloat(amount) * 0.999).toFixed(6) : '0';

  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppNav />

      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-6xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent/20 to-purple-500/20 border border-accent/30 mb-4">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Instant Bridge • Earn Points • Future Airdrop</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-accent via-purple-400 to-pink-400 bg-clip-text text-transparent">
              FastBridge
            </span>
          </h1>
          <p className="text-lg text-ink-muted max-w-xl mx-auto">
            Bridge from any chain instantly. Earn points with every transaction. Qualify for the token airdrop.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Bridge Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="card">
              <h2 className="text-xl font-bold mb-6">Bridge to AgentL2</h2>

              {/* From Chain/Token */}
              <div className="mb-4">
                <label className="text-sm text-ink-muted mb-2 block">From</label>
                <div className="flex gap-2">
                  {/* Chain Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowChainSelect(!showChainSelect)}
                      className="flex items-center gap-2 px-4 py-3 bg-surface-elevated border border-border rounded-xl hover:border-accent/50 transition-colors"
                    >
                      <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${fromChain.color} flex items-center justify-center text-white`}>
                        {fromChain.icon}
                      </span>
                      <span className="font-medium">{fromChain.name}</span>
                      <ChevronDown className="w-4 h-4 text-ink-subtle" />
                    </button>
                    
                    {showChainSelect && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-surface-elevated border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                        {chains.map((chain) => (
                          <button
                            key={chain.id}
                            onClick={() => {
                              setFromChain(chain);
                              setFromToken(chain.tokens[0]);
                              setShowChainSelect(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors"
                          >
                            <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center text-white text-sm`}>
                              {chain.icon}
                            </span>
                            <span>{chain.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Token Selector */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowTokenSelect(!showTokenSelect)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-surface-elevated border border-border rounded-xl hover:border-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{fromToken.icon}</span>
                        <span className="font-medium">{fromToken.symbol}</span>
                        {fromToken.multiplier > 1 && (
                          <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                            +{((fromToken.multiplier - 1) * 100).toFixed(0)}% pts
                          </span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-ink-subtle" />
                    </button>
                    
                    {showTokenSelect && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-surface-elevated border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                        {fromChain.tokens.map((token) => (
                          <button
                            key={token.symbol}
                            onClick={() => {
                              setFromToken(token);
                              setShowTokenSelect(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-muted transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{token.icon}</span>
                              <span>{token.symbol}</span>
                            </div>
                            {token.multiplier !== 1 && (
                              <span className={`text-xs ${token.multiplier > 1 ? 'text-green-400' : 'text-ink-subtle'}`}>
                                {token.multiplier > 1 ? '+' : ''}{((token.multiplier - 1) * 100).toFixed(0)}% pts
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-4 bg-surface-elevated border border-border rounded-xl text-2xl font-medium focus:border-accent focus:outline-none transition-colors"
                  />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-accent/20 text-accent rounded-lg text-sm font-medium hover:bg-accent/30 transition-colors">
                    MAX
                  </button>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-4">
                <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-accent" />
                </div>
              </div>

              {/* To (AgentL2) */}
              <div className="mb-6">
                <label className="text-sm text-ink-muted mb-2 block">To</label>
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent/10 to-purple-500/10 border border-accent/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      L2
                    </div>
                    <span className="font-medium">AgentL2</span>
                  </div>
                  <span className="text-xl font-bold">{receiveAmount} {fromToken.symbol}</span>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="p-4 bg-surface-muted rounded-xl mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Bridge Fee (0.1%)</span>
                  <span className="text-ink">{fee} {fromToken.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Estimated Time</span>
                  <span className="text-green-400 flex items-center gap-1">
                    <Zap className="w-4 h-4" /> ~30 seconds
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Points Earned</span>
                  <span className="text-accent font-bold flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> +{pointsPreview.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Referral Code */}
              <div className="mb-6">
                <label className="text-sm text-ink-muted mb-2 block">Referral Code (Optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code for +5% bonus points"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-xl text-sm focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              {/* Bridge Button */}
              <button className="w-full py-4 bg-gradient-to-r from-accent to-purple-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Bridge & Earn {pointsPreview.toLocaleString()} Points
              </button>
            </div>
          </motion.div>

          {/* Points & Rewards Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Points Overview */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Your Points</h3>
                <span className="text-xs text-ink-subtle">Rank #{userRank || '—'}</span>
              </div>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-accent mb-1">
                  {userPoints.toLocaleString()}
                </div>
                <div className={`text-sm font-medium ${tiers[userTier].color}`}>
                  {tiers[userTier].name} Tier
                </div>
              </div>
              
              {/* Progress to next tier */}
              {userTier < 4 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-ink-muted mb-1">
                    <span>{tiers[userTier].name}</span>
                    <span>{tiers[userTier + 1].name}</span>
                  </div>
                  <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-accent to-purple-500"
                      style={{ 
                        width: `${Math.min(100, (userPoints / tiers[userTier + 1].points) * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs text-ink-subtle mt-1 text-right">
                    {(tiers[userTier + 1].points - userPoints).toLocaleString()} pts to next tier
                  </div>
                </div>
              )}

              <Link href="/dashboard?tab=points" className="btn-secondary w-full text-center text-sm">
                View Details
              </Link>
            </div>

            {/* Active Bonuses */}
            <div className="card">
              <h3 className="font-bold mb-4">Active Bonuses</h3>
              <div className="space-y-3">
                {isEarlyBird && (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-green-400" />
                      <span className="text-sm">Early Bird</span>
                    </div>
                    <span className="text-green-400 font-bold">+20%</span>
                  </div>
                )}
                
                {streakDays > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                      <span className="text-sm">{streakDays} Day Streak</span>
                    </div>
                    <span className="text-orange-400 font-bold">+{Math.min(streakDays * 5, 35)}%</span>
                  </div>
                )}
                
                {userTier > 0 && (
                  <div className="flex items-center justify-between p-3 bg-accent/10 border border-accent/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-accent" />
                      <span className="text-sm">{tiers[userTier].name} Tier</span>
                    </div>
                    <span className="text-accent font-bold">{tiers[userTier].bonus}</span>
                  </div>
                )}
                
                {referralCode && (
                  <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      <span className="text-sm">Referral Bonus</span>
                    </div>
                    <span className="text-purple-400 font-bold">+5%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tiers Info */}
            <div className="card">
              <h3 className="font-bold mb-4">Point Tiers</h3>
              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div 
                    key={tier.name}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      i === userTier ? 'bg-surface-muted border border-accent/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Star className={`w-4 h-4 ${tier.color}`} />
                      <span className={`text-sm ${tier.color}`}>{tier.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-ink-subtle">{tier.points.toLocaleString()}+ pts</div>
                      <div className={`text-xs font-bold ${tier.color}`}>{tier.bonus}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Leaderboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Leaderboard
              </h3>
              <Link href="/leaderboard" className="text-accent text-sm hover:underline">
                View Full Leaderboard →
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-ink-muted">
                    <th className="pb-3 font-medium">Rank</th>
                    <th className="pb-3 font-medium">Address</th>
                    <th className="pb-3 font-medium">Points</th>
                    <th className="pb-3 font-medium">Tier</th>
                    <th className="pb-3 font-medium">Bridges</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { rank: 1, address: '0x1234...5678', points: 1250000, tier: 4, bridges: 156 },
                    { rank: 2, address: '0xabcd...efgh', points: 890000, tier: 3, bridges: 98 },
                    { rank: 3, address: '0x9876...5432', points: 654000, tier: 3, bridges: 72 },
                    { rank: 4, address: '0xfedc...ba98', points: 432000, tier: 3, bridges: 61 },
                    { rank: 5, address: '0x5555...1111', points: 321000, tier: 3, bridges: 54 },
                  ].map((user, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-3">
                        {user.rank <= 3 ? (
                          <span className={`${
                            user.rank === 1 ? 'text-yellow-400' :
                            user.rank === 2 ? 'text-gray-300' :
                            'text-amber-600'
                          }`}>
                            {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-ink-muted">#{user.rank}</span>
                        )}
                      </td>
                      <td className="py-3 font-mono">{user.address}</td>
                      <td className="py-3 font-bold text-accent">{user.points.toLocaleString()}</td>
                      <td className={`py-3 ${tiers[user.tier].color}`}>{tiers[user.tier].name}</td>
                      <td className="py-3 text-ink-muted">{user.bridges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="card bg-gradient-to-r from-accent/10 to-purple-500/10 border-accent/30">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white">
                <Gift className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Bridge Points = Future Airdrop</h3>
                <p className="text-ink-muted">
                  Every bridge earns points. Points determine your allocation in the upcoming $AGENT token airdrop.
                  Early users get 20% bonus. Keep bridging to maintain your streak for up to 35% extra!
                </p>
              </div>
              <Link href="/docs/bridge" className="btn-primary whitespace-nowrap">
                Learn More
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
