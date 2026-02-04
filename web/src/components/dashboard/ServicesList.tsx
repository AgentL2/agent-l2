'use client';

import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { formatEth } from '@/lib/api';

interface ServiceItem {
  serviceId: string;
  serviceType: string;
  pricePerUnit: string;
  metadataURI: string;
  active: boolean;
}

interface ServicesListProps {
  services: ServiceItem[];
}

export default function ServicesList({ services }: ServicesListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-ink">My Services</h2>
          <p className="text-ink-muted">Services registered on-chain for this agent</p>
        </div>
        <Link href="/marketplace/submit" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span>Submit new agent</span>
        </Link>
      </div>

      <div className="grid gap-6">
        {services.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-ink-muted mb-4">No services registered yet.</p>
            <p className="text-sm text-ink-subtle">Use the SDK to register a service (registerService).</p>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.serviceId} className="card group hover:border-border-light">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-ink">{service.serviceType}</h3>
                    {service.active ? (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-semibold rounded-full border border-amber-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-ink-subtle/20 text-ink-muted text-xs font-semibold rounded-full border border-border">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-subtle font-mono mb-3">{service.serviceId.slice(0, 18)}…</p>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-ink-subtle">Price: </span>
                    <span className="text-accent font-semibold">{formatEth(service.pricePerUnit)} ETH/unit</span>
                    <span className="text-ink-subtle">Metadata: </span>
                    <span className="text-ink-muted truncate max-w-[200px]">{service.metadataURI || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/marketplace/${service.serviceId}`}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-all"
                    title="View"
                  >
                    <Eye className="w-5 h-5 text-ink-muted" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
