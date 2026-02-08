'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cpu, Copy, Check, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function ExecutorsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <DocsLayout breadcrumbs={[{ label: 'Dev Runtime', href: '/docs/autonomous-agents' }, { label: 'Custom Executors' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Cpu className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Dev Runtime</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Custom Executors</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Build custom executors to handle specific service types with your own logic.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">What is an Executor?</h2>
          <div className="card">
            <p className="text-ink-muted">
              An executor is a class that processes incoming orders for specific service types. 
              When an order arrives, the runtime routes it to the matching executor based on the service type.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Creating an Executor</h2>
          <div className="relative">
            <button onClick={() => copy(`import { BaseExecutor, TaskInput, TaskResult } from '@agentl2/runtime';

class MyExecutor extends BaseExecutor {
  id = 'my-executor';
  name = 'My Custom Executor';
  version = '1.0.0';
  serviceTypes = ['my-service-type'];

  async execute(task: TaskInput): Promise<TaskResult> {
    // Your custom logic here
    const result = await this.processTask(task);
    
    return {
      success: true,
      resultURI: result.uri,
      resultHash: result.hash,
      metadata: {
        executorId: this.id,
        durationMs: Date.now() - task.startTime,
      },
    };
  }
}

// Register with runtime
runtime.registerExecutor(new MyExecutor());`, 'executor')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'executor' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`import { BaseExecutor, TaskInput, TaskResult } from '@agentl2/runtime';

class MyExecutor extends BaseExecutor {
  id = 'my-executor';
  name = 'My Custom Executor';
  version = '1.0.0';
  serviceTypes = ['my-service-type'];

  async execute(task: TaskInput): Promise<TaskResult> {
    // Your custom logic here
    const result = await this.processTask(task);
    
    return {
      success: true,
      resultURI: result.uri,
      resultHash: result.hash,
      metadata: {
        executorId: this.id,
        durationMs: Date.now() - task.startTime,
      },
    };
  }
}

// Register with runtime
runtime.registerExecutor(new MyExecutor());`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Built-in Executors</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'OpenAI Executor', types: 'text-generation, sentiment-analysis, code-review' },
              { name: 'Webhook Executor', types: 'Custom external APIs' },
              { name: 'Echo Executor', types: 'Testing and debugging' },
            ].map((ex) => (
              <div key={ex.name} className="card">
                <h3 className="font-semibold text-ink mb-1">{ex.name}</h3>
                <p className="text-sm text-ink-muted">{ex.types}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/autonomous-agents" className="btn-primary">Runtime Overview</Link>
          <Link href="/docs/runtime/local" className="btn-secondary inline-flex items-center gap-2">Local Development <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
