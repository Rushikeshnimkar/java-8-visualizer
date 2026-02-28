// ============================================
// Threads Visualization Panel
// ============================================

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '@/state/executionStore'
import type { ThreadState, ThreadStatus } from '@/jvm/types/JVMState'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ThreadStatus, { color: string; bg: string; border: string; dot: string; label: string; pulse: boolean }> = {
    NEW: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', dot: 'bg-gray-400', label: 'NEW', pulse: false },
    RUNNABLE: { color: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/30', dot: 'bg-green-400', label: 'RUNNABLE', pulse: false },
    RUNNING: { color: 'text-cyan-300', bg: 'bg-cyan-500/15', border: 'border-cyan-400/40', dot: 'bg-cyan-400', label: 'RUNNING ⚡', pulse: true },
    BLOCKED: { color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400', label: 'BLOCKED 🔒', pulse: false },
    WAITING: { color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400', label: 'WAITING ⏳', pulse: false },
    TIMED_WAITING: { color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', label: 'TIMED_WAIT ⏱', pulse: false },
    TERMINATED: { color: 'text-dark-muted', bg: 'bg-dark-bg/50', border: 'border-dark-border', dot: 'bg-dark-muted', label: 'TERMINATED ✓', pulse: false },
}

const LIFECYCLE: ThreadStatus[] = ['NEW', 'RUNNABLE', 'RUNNING', 'BLOCKED', 'WAITING', 'TIMED_WAITING', 'TERMINATED']

// ── Main component ─────────────────────────────────────────────────────────────
export default function ThreadsView() {
    const jvmState = useExecutionStore(s => s.jvmState)
    const { threads, monitors, activeThread } = jvmState

    const monitorEntries = useMemo(() =>
        Object.entries(monitors ?? {}).map(([objId, holder]) => ({
            objId,
            holder,
            waiters: threads.filter(t => t.status === 'BLOCKED' && t.waitingOnMonitor === objId),
        })),
        [monitors, threads]
    )

    if (threads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-dark-muted">
                <CpuIcon />
                <p className="text-sm text-center">
                    No threads yet — run a program that uses<br />
                    <code className="text-cyan-400">Thread.start()</code>
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-2">

            {/* ── Thread cards ── */}
            <div>
                <SectionLabel icon={<CpuIcon />} label="Thread States" />
                <div className="flex flex-col gap-3 mt-3">
                    <AnimatePresence>
                        {threads.map((thread, idx) => (
                            <ThreadCard
                                key={thread.id}
                                thread={thread}
                                isActive={idx === activeThread}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Monitor / Lock table ── */}
            {monitorEntries.length > 0 && (
                <div>
                    <SectionLabel icon={<span>🔒</span>} label="Monitor / Lock Table" />
                    <div className="flex flex-col gap-2 mt-3">
                        {monitorEntries.map(({ objId, holder, waiters }) => (
                            <motion.div
                                key={objId}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-dark-card border border-yellow-500/20 rounded-xl p-3 text-xs"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="text-yellow-300 font-mono font-bold">@{objId}</span>
                                    <span className="text-right">
                                        {holder
                                            ? <span className="text-green-400">held by <b className="text-green-300">{holder}</b></span>
                                            : <span className="text-dark-muted">free</span>
                                        }
                                    </span>
                                </div>
                                {waiters.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        <span className="text-dark-muted">Waiters:</span>
                                        {waiters.map(t => (
                                            <span key={t.id} className="text-red-300 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 font-mono text-[10px]">
                                                {t.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Lifecycle legend ── */}
            <div>
                <SectionLabel icon={null} label="Lifecycle" />
                <div className="flex flex-wrap gap-2 mt-3">
                    {LIFECYCLE.map(s => {
                        const cfg = STATUS_CONFIG[s]
                        const active = threads.some(t => t.status === s)
                        return (
                            <div
                                key={s}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono transition-opacity ${cfg.border} ${active ? cfg.bg : 'opacity-30'}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                <span className={cfg.color}>{s}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ── Thread card ───────────────────────────────────────────────────────────────
function ThreadCard({ thread, isActive }: { thread: ThreadState; isActive: boolean }) {
    const cfg = STATUS_CONFIG[thread.status]
    const stackDepth = thread.stack.length
    const topFrame = stackDepth > 0 ? thread.stack[stackDepth - 1] : null

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className={`relative rounded-xl border p-4 ${cfg.bg} ${cfg.border} ${isActive ? 'ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-900/20' : ''}`}
        >
            {/* Active thread side-bar */}
            {isActive && (
                <motion.div
                    className="absolute -left-0.5 top-3 bottom-3 w-1 rounded-full bg-cyan-400"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <motion.div
                        className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}
                        animate={cfg.pulse ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                    <span className="text-dark-muted font-mono text-xs">{thread.id}</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
                    {cfg.label}
                </span>
            </div>

            {/* Thread info grid */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                <Info label="name" value={thread.name} bold />
                <Info label="priority" value={String(thread.priority)} />
                <Info label="daemon" value={thread.isDaemon ? 'true' : 'false'} />
                <Info label="steps" value={String(thread.stepCount)} />
                {thread.interrupted && <Info label="interrupted" value="true" className="text-red-400" />}
            </div>

            {/* Call stack */}
            {stackDepth > 0 && topFrame && (
                <div className="mb-2">
                    <div className="text-[10px] text-dark-muted mb-1">Call stack ({stackDepth} frame{stackDepth !== 1 ? 's' : ''})</div>
                    <div className="font-mono text-[11px] text-cyan-300/80 bg-dark-bg/60 rounded px-2 py-1 border border-dark-border/50">
                        {topFrame.className}.<span className="text-cyan-300 font-bold">{topFrame.methodName}</span>()
                        <span className="text-dark-muted ml-2">line {topFrame.lineNumber || '?'}</span>
                    </div>
                </div>
            )}

            {/* Lock indicators */}
            {thread.holdingMonitors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] text-green-400/80">Holds lock:</span>
                    {thread.holdingMonitors.map(mid => (
                        <span key={mid} className="text-[10px] font-mono text-green-300 bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5">
                            @{mid}
                        </span>
                    ))}
                </div>
            )}
            {thread.waitingOnMonitor && (
                <div className="mt-1 text-[10px] text-yellow-300/80">
                    ⏳ Waiting on: <span className="font-mono text-yellow-300">{thread.waitingOnMonitor}</span>
                </div>
            )}
            {thread.sleepUntilStep !== undefined && (
                <div className="mt-1 text-[10px] text-orange-300/80">
                    ⏱ Sleeping until step {thread.sleepUntilStep}
                </div>
            )}

            {/* Progress bar */}
            <div className="mt-3 h-1 bg-dark-bg rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${cfg.dot}`}
                    animate={{ width: thread.status === 'TERMINATED' ? '100%' : `${Math.min((thread.stepCount / 100) * 100, 95)}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                />
            </div>
        </motion.div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Info({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
    return (
        <div className="text-[10px] flex gap-1">
            <span className="text-dark-muted">{label}:</span>
            <span className={`font-mono ${bold ? 'font-bold text-white' : 'font-semibold text-dark-text'} ${className ?? ''}`}>{value}</span>
        </div>
    )
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <h3 className="text-[11px] uppercase tracking-widest text-dark-muted flex items-center gap-2">
            {icon}
            {label}
        </h3>
    )
}

function CpuIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth={2} />
            <path strokeLinecap="round" strokeWidth={2}
                d="M9 4v3M12 4v3M15 4v3M9 17v3M12 17v3M15 17v3M4 9h3M4 12h3M4 15h3M17 9h3M17 12h3M17 15h3" />
        </svg>
    )
}

// Need React for JSX
import React from 'react'
