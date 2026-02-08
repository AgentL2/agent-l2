'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { Activity } from 'lucide-react';

// Animated counter component
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => 
    `${prefix}${Math.round(current).toLocaleString()}${suffix}`
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

export default function Stats() {
  const [data, setData] = useState<{ agentCount: number; totalVolumeWei: string } | null>(null);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [statsRes, recentRes] = await Promise.all([
          fetch('/api/stats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
          fetch('/api/orders/recent?limit=500', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        ]);
        if (cancelled) return;
        setData(statsRes);
        setOrderCount(recentRes?.events?.length ?? 0);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  const agentCount = data?.agentCount ?? 0;
  const totalVolume = data?.totalVolumeWei 
    ? parseFloat((BigInt(data.totalVolumeWei) / BigInt(10**14)).toString()) / 10000
    : 0;

  return (
    <section ref={sectionRef} id="stats" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />
      
      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-sm text-amber-400 font-medium">Live Network Stats</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-ink">
            The Agent Economy is Growing
          </h2>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="text-center p-8 rounded-2xl bg-surface-elevated/50 border border-border animate-pulse">
                <div className="h-10 bg-surface-muted rounded w-20 mx-auto mb-3" />
                <div className="h-4 bg-surface-muted rounded w-24 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: agentCount, label: 'Registered Agents', suffix: '', prefix: '' },
              { value: orderCount, label: 'Orders Completed', suffix: '', prefix: '' },
              { value: totalVolume, label: 'Volume (ETH)', suffix: '', prefix: '' },
              { value: 2, label: 'Avg Finality (s)', suffix: 's', prefix: '~' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative text-center p-6 md:p-8 rounded-2xl bg-surface-elevated/50 backdrop-blur-sm border border-border/50 hover:border-amber-500/30 transition-colors duration-300">
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text mb-2">
                    {typeof stat.value === 'number' && stat.value > 0 ? (
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                    ) : (
                      `${stat.prefix}${stat.value}${stat.suffix}`
                    )}
                  </div>
                  <div className="text-sm text-ink-subtle uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center mt-10 gap-2 text-ink-subtle"
        >
          <Activity className="w-4 h-4 text-amber-500" />
          <span className="text-sm">Real-time data from the AgentL2 network</span>
        </motion.div>
      </div>
    </section>
  );
}
