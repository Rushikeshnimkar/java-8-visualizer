// ============================================
// Data Structures Tab – Arrays, Lists, Maps, Sets, Linked Lists
// ============================================

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'
import { HeapObject, valueToString, ReferenceValue, Value } from '../../jvm/types/JVMState'

// ─── Utility ────────────────────────────────────────────────────────────────

/** Java-style String.hashCode simulation */
function simpleHashCode(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
    }
    return h
}

function bucketIndex(key: string, capacity: number): number {
    return Math.abs(simpleHashCode(key)) % capacity
}

function displayValue(v: Value): string {
    if (v.kind === 'primitive') {
        if (v.value === null) return 'null'
        if (v.type === 'string') return `"${v.value}"`
        if (v.type === 'char') return `'${v.value}'`
        if (v.type === 'boolean') return v.value ? 'true' : 'false'
        return String(v.value)
    }
    if (v.kind === 'reference') return v.objectId ? `@${v.objectId}` : 'null'
    if (v.kind === 'array') return `${v.elementType}[]@${v.objectId}`
    return valueToString(v)
}

// ─── Main View ──────────────────────────────────────────────────────────────

export function DataStructuresView() {
    const { jvmState } = useExecutionStore()
    const { heap } = jvmState

    const hashMaps = useMemo(() =>
        heap.filter(o =>
            o.type === 'object' &&
            (o.className.includes('Map') || o.className === 'Hashtable') &&
            !o.className.includes('$') &&
            !o.className.includes('Entry')
        ), [heap])

    const hashSets = useMemo(() =>
        heap.filter(o =>
            o.type === 'object' &&
            (o.className.includes('Set')) &&
            !o.className.includes('$')
        ), [heap])

    const lists = useMemo(() =>
        heap.filter(o =>
            o.type === 'object' &&
            (o.className === 'ArrayList' || o.className === 'LinkedList' ||
                o.className === 'Stack' || o.className === 'Vector' ||
                o.className === 'ArrayDeque' || o.className === 'Deque' ||
                o.className === 'PriorityQueue')
        ), [heap])

    const arrays = useMemo(() =>
        heap.filter(o =>
            o.type === 'array' &&
            !o.className.toLowerCase().includes('string') &&
            !o.className.includes('$')
        ), [heap])

    // ── Binary Tree detection ──
    const binaryTrees = useMemo(() => {
        // Tree nodes have left AND right fields
        const treeNodes = heap.filter(o => {
            const hasLeft = o.fields.some(f => f.name === 'left')
            const hasRight = o.fields.some(f => f.name === 'right')
            return o.type === 'object' && hasLeft && hasRight
        })
        if (treeNodes.length === 0) return []

        // Build set of all child-referenced IDs
        const childIds = new Set<string>()
        treeNodes.forEach(node => {
            const leftField = node.fields.find(f => f.name === 'left')
            const rightField = node.fields.find(f => f.name === 'right')
            if (leftField && leftField.value.kind === 'reference') {
                const rv = leftField.value as ReferenceValue
                if (rv.objectId) childIds.add(rv.objectId)
            }
            if (rightField && rightField.value.kind === 'reference') {
                const rv = rightField.value as ReferenceValue
                if (rv.objectId) childIds.add(rv.objectId)
            }
        })

        // Roots are nodes not referenced as children
        const roots = treeNodes.filter(n => !childIds.has(n.id))
        return roots.map(root => ({ root, allNodes: treeNodes }))
    }, [heap])

    // Collect tree node IDs so linked-list detection can skip them
    const treeNodeIds = useMemo(() => {
        const ids = new Set<string>()
        binaryTrees.forEach(({ allNodes }) => allNodes.forEach(n => ids.add(n.id)))
        return ids
    }, [binaryTrees])

    const linkedListChains = useMemo(() => {
        const nodes = heap.filter(o => {
            if (treeNodeIds.has(o.id)) return false // skip tree nodes
            const hasNext = o.fields.some(f => f.name === 'next')
            const hasData = o.fields.some(f => ['val', 'data', 'value'].includes(f.name))
            return hasNext && hasData
        })
        const nextRefIds = new Set<string>()
        nodes.forEach(n => {
            const nf = n.fields.find(f => f.name === 'next')
            if (nf && nf.value.kind === 'reference') {
                const rv = nf.value as ReferenceValue
                if (rv.objectId) nextRefIds.add(rv.objectId)
            }
        })
        const roots = nodes.filter(n => !nextRefIds.has(n.id))
        return roots.map(root => {
            const chain: HeapObject[] = []
            let curr: HeapObject | undefined = root
            const visited = new Set<string>()
            while (curr && !visited.has(curr.id)) {
                chain.push(curr)
                visited.add(curr.id)
                const nf = curr.fields.find(f => f.name === 'next')
                if (nf && nf.value.kind === 'reference') {
                    const rv = nf.value as ReferenceValue
                    curr = rv.objectId ? nodes.find(n => n.id === rv.objectId) : undefined
                } else { curr = undefined }
            }
            return chain
        })
    }, [heap, treeNodeIds])

    const isEmpty =
        hashMaps.length === 0 && hashSets.length === 0 &&
        lists.length === 0 && arrays.length === 0 && linkedListChains.length === 0 &&
        binaryTrees.length === 0

    if (isEmpty) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-dark-muted p-8 text-center bg-dark-bg">
                <svg className="w-16 h-16 mb-4 text-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-medium text-dark-text mb-2">No Data Structures</h3>
                <p className="text-sm max-w-md">
                    HashMap, HashSet, ArrayList, arrays, stacks, and linked lists appear here with animated
                    bucket diagrams, hashcode display and load-factor meters as they are created.
                </p>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto p-4 space-y-10 bg-dark-bg jvm-scrollbar">

            {/* ── HashMaps ── */}
            {hashMaps.length > 0 && (
                <Section title="HashMap" color="text-purple-400" borderColor="border-purple-400/30"
                    icon={<HashIcon />}>
                    {hashMaps.map(m => <HashMapVisualization key={m.id} obj={m} />)}
                </Section>
            )}

            {/* ── HashSets ── */}
            {hashSets.length > 0 && (
                <Section title="HashSet" color="text-pink-400" borderColor="border-pink-400/30"
                    icon={<SetIcon />}>
                    {hashSets.map(s => <HashSetVisualization key={s.id} obj={s} />)}
                </Section>
            )}

            {/* ── Lists ── */}
            {lists.length > 0 && (
                <Section title="List" color="text-jvm-method" borderColor="border-jvm-method/30"
                    icon={<ListIcon />}>
                    {lists.map(l => <ListVisualization key={l.id} obj={l} />)}
                </Section>
            )}

            {/* ── Arrays ── */}
            {arrays.length > 0 && (
                <Section title="Arrays" color="text-jvm-method" borderColor="border-jvm-method/30"
                    icon={<ArrayIcon />}>
                    {arrays.map(a => <ArrayVisualization key={a.id} array={a} />)}
                </Section>
            )}

            {/* ── Linked Lists ── */}
            {linkedListChains.length > 0 && (
                <Section title="Linked Lists" color="text-jvm-pc" borderColor="border-jvm-pc/30"
                    icon={<LinkIcon />}>
                    {linkedListChains.map((chain, i) => <LinkedListVisualization key={i} chain={chain} />)}
                </Section>
            )}

            {/* ── Binary Trees ── */}
            {binaryTrees.length > 0 && (
                <Section title="Binary Trees" color="text-emerald-400" borderColor="border-emerald-400/30"
                    icon={<TreeIcon />}>
                    {binaryTrees.map(({ root, allNodes }) => (
                        <BinaryTreeVisualization key={root.id} root={root} allNodes={allNodes} />
                    ))}
                </Section>
            )}
        </div>
    )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, color, borderColor, icon, children }: {
    title: string; color: string; borderColor: string; icon: React.ReactNode; children: React.ReactNode
}) {
    return (
        <div className="space-y-4">
            <h3 className={`${color} font-bold flex items-center gap-2 border-b ${borderColor} pb-2 text-sm uppercase tracking-widest`}>
                {icon}{title}
            </h3>
            <div className="flex flex-col gap-6">{children}</div>
        </div>
    )
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const HashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
)
const SetIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
)
const ListIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
)
const ArrayIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
)
const LinkIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
)
const TreeIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="2" strokeWidth={2} />
        <circle cx="6" cy="13" r="2" strokeWidth={2} />
        <circle cx="18" cy="13" r="2" strokeWidth={2} />
        <line x1="12" y1="7" x2="6" y2="11" strokeWidth={2} />
        <line x1="12" y1="7" x2="18" y2="11" strokeWidth={2} />
    </svg>
)

// ─── HashMap Visualization ───────────────────────────────────────────────────
function HashMapVisualization({ obj }: { obj: HeapObject }) {
    const CAPACITY = 16
    const LOAD_FACTOR_THRESHOLD = 0.75 // default Java HashMap load factor
    const entries = obj.fields.filter(f => !f.isStatic)
    const fillRatio = entries.length / CAPACITY // current fill = size / capacity
    const [showAll, setShowAll] = useState(false)

    // Build bucket array
    const buckets: { idx: number; entries: typeof entries }[] = Array.from({ length: CAPACITY }, (_, i) => ({
        idx: i, entries: []
    }))
    entries.forEach(f => {
        const bi = bucketIndex(f.name, CAPACITY)
        buckets[bi].entries.push(f)
    })

    const filledBuckets = buckets.filter(b => b.entries.length > 0)
    const allBuckets = showAll ? buckets : buckets.filter(b => b.entries.length > 0)

    return (
        <div className="bg-dark-card border border-purple-500/20 rounded-xl p-4 shadow-lg shadow-purple-900/10">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-400/60">@{obj.id}</span>
                    <span className="font-bold text-purple-300">{obj.className}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <StatBadge label="size" value={entries.length} color="bg-purple-500/20 text-purple-300" />
                    <StatBadge label="capacity" value={CAPACITY} color="bg-dark-bg text-dark-muted" />
                    <StatBadge label="load factor" value={LOAD_FACTOR_THRESHOLD} color="bg-yellow-500/20 text-yellow-300"
                        tooltip="Fixed threshold: map resizes when fill ratio ≥ this" />
                    <StatBadge label="fill ratio" value={fillRatio.toFixed(3)} color="bg-purple-500/20 text-purple-300"
                        tooltip={`Current fill = ${entries.length} entries / ${CAPACITY} capacity`} />
                </div>
            </div>

            {/* Fill Ratio Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-dark-muted">
                        Fill Ratio = {entries.length} / {CAPACITY} = <span className="font-mono font-bold text-purple-300">{fillRatio.toFixed(3)}</span>
                    </span>
                    <span className={fillRatio >= LOAD_FACTOR_THRESHOLD ? 'text-red-400 font-bold' : 'text-yellow-400'}>
                        {fillRatio >= LOAD_FACTOR_THRESHOLD
                            ? '⚠ Resize triggered! (fill ratio ≥ load factor 0.75)'
                            : `Load factor threshold: ${LOAD_FACTOR_THRESHOLD} — resize when fill ratio reaches this`}
                    </span>
                </div>
                {/* Bar: fill ratio vs load factor threshold */}
                <div className="relative h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                    <motion.div
                        className={`h-full rounded-full ${fillRatio >= LOAD_FACTOR_THRESHOLD ? 'bg-red-500' : 'bg-purple-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(fillRatio / LOAD_FACTOR_THRESHOLD * 100, 100)}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                    {/* Load factor threshold marker (the yellow tick at 100% of bar = 0.75 fill) */}
                    <div className="absolute top-0 right-0 h-full w-px bg-yellow-400" title="Load factor threshold (0.75)" />
                </div>
                <div className="flex justify-between text-[10px] text-dark-muted mt-0.5">
                    <span>0</span>
                    <span className="text-yellow-400/80">← load factor threshold (0.75)</span>
                </div>
            </div>

            {/* Hashcode Calculation Info */}
            {entries.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-dark-bg border border-purple-500/10 text-xs">
                    <div className="text-purple-400 font-semibold mb-2 flex items-center gap-1">
                        <span>⚙</span> Hashcode Calculation (Java String.hashCode)
                    </div>
                    <code className="text-dark-muted font-mono text-[10px] block">
                        h = 0; for each char c: h = 31 * h + c; bucketIndex = |h| % {CAPACITY}
                    </code>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {entries.slice(0, 4).map(f => {
                            const hc = simpleHashCode(f.name)
                            const bi = Math.abs(hc) % CAPACITY
                            return (
                                <div key={f.name} className="flex items-center gap-1 text-[10px] bg-purple-900/20 border border-purple-500/20 rounded px-2 py-1">
                                    <span className="text-purple-300 font-mono">"{f.name}"</span>
                                    <span className="text-dark-muted">→ h={hc}</span>
                                    <span className="text-dark-muted">→ [{bi}]</span>
                                </div>
                            )
                        })}
                        {entries.length > 4 && <span className="text-dark-muted text-[10px] self-center">+{entries.length - 4} more</span>}
                    </div>
                </div>
            )}

            {/* Bucket Array */}
            <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-dark-muted uppercase tracking-wider">Bucket Array ({CAPACITY} slots)</span>
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        {showAll ? `Show only filled (${filledBuckets.length})` : `Show all ${CAPACITY} slots`}
                    </button>
                </div>
                <AnimatePresence>
                    {allBuckets.map(bucket => (
                        <BucketRow key={bucket.idx} bucketIndex={bucket.idx} entries={bucket.entries}
                            capacity={CAPACITY} accentColor="purple" />
                    ))}
                </AnimatePresence>
                {entries.length === 0 && (
                    <div className="text-sm text-dark-muted italic py-4 text-center">Map is empty</div>
                )}
            </div>
        </div>
    )
}

// ─── Bucket Row ───────────────────────────────────────────────────────────────
function BucketRow({ bucketIndex: idx, entries, capacity, accentColor }: {
    bucketIndex: number
    entries: { name: string; type: string; value: Value; isStatic: boolean }[]
    capacity: number
    accentColor: 'purple' | 'pink'
}) {
    const isEmpty = entries.length === 0
    const colors = {
        purple: {
            border: isEmpty ? 'border-dark-border/40' : 'border-purple-500/40',
            bg: isEmpty ? 'bg-dark-bg/30' : 'bg-purple-900/10',
            index: isEmpty ? 'text-dark-muted/40' : 'text-purple-400',
            null: 'text-dark-muted/30',
        },
        pink: {
            border: isEmpty ? 'border-dark-border/40' : 'border-pink-500/40',
            bg: isEmpty ? 'bg-dark-bg/30' : 'bg-pink-900/10',
            index: isEmpty ? 'text-dark-muted/40' : 'text-pink-400',
            null: 'text-dark-muted/30',
        },
    }[accentColor]

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`flex items-start gap-2 rounded-lg border ${colors.border} ${colors.bg} px-2 py-1.5`}
        >
            {/* Bucket index badge */}
            <div className={`min-w-[32px] text-center font-mono text-[10px] font-bold ${colors.index} pt-0.5`}>
                [{idx}]
            </div>

            {/* Divider */}
            <div className={`w-px self-stretch ${isEmpty ? 'bg-dark-border/20' : accentColor === 'purple' ? 'bg-purple-500/30' : 'bg-pink-500/30'}`} />

            {/* Entries chain */}
            <div className="flex flex-wrap gap-2 flex-1 min-h-[24px]">
                {isEmpty ? (
                    <span className={`text-[10px] font-mono ${colors.null} self-center`}>null</span>
                ) : (
                    entries.map((entry, ei) => (
                        <AnimatePresence key={entry.name} mode="popLayout">
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.8, y: -8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                className="flex flex-col"
                            >
                                {/* Key → Value pill */}
                                <div className={`flex items-stretch rounded-lg overflow-hidden border ${accentColor === 'purple' ? 'border-purple-500/40' : 'border-pink-500/40'} text-xs shadow-sm`}>
                                    <div className={`px-2 py-1 font-mono font-semibold ${accentColor === 'purple' ? 'bg-purple-800/40 text-purple-200' : 'bg-pink-800/40 text-pink-200'}`}>
                                        {entry.name}
                                    </div>
                                    <div className="px-2 py-1 font-mono bg-dark-bg text-dark-text border-l border-dark-border/40">
                                        {displayValue(entry.value)}
                                    </div>
                                </div>
                                {/* Hashcode badge */}
                                <div className="flex gap-1 mt-0.5 px-0.5">
                                    <span className="text-[9px] text-dark-muted font-mono">
                                        hash={simpleHashCode(entry.name)} idx={Math.abs(simpleHashCode(entry.name)) % capacity}
                                    </span>
                                </div>
                                {/* Chain arrow */}
                                {ei < entries.length - 1 && (
                                    <span className={`text-[10px] ml-1 ${accentColor === 'purple' ? 'text-purple-400' : 'text-pink-400'}`}>→</span>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    ))
                )}
            </div>
        </motion.div>
    )
}

// ─── HashSet Visualization ───────────────────────────────────────────────────
function HashSetVisualization({ obj }: { obj: HeapObject }) {
    const CAPACITY = 16
    const elements = obj.arrayElements || []
    const loadFactor = elements.length / CAPACITY
    const [showAll, setShowAll] = useState(false)

    // Build bucket array
    const buckets: { idx: number; elems: Value[] }[] = Array.from({ length: CAPACITY }, (_, i) => ({ idx: i, elems: [] }))
    elements.forEach(e => {
        const key = displayValue(e).replace(/^"|"$/g, '') // strip quotes for hash
        const bi = bucketIndex(key, CAPACITY)
        buckets[bi].elems.push(e)
    })

    const filledBuckets = buckets.filter(b => b.elems.length > 0)
    const shown = showAll ? buckets : filledBuckets

    return (
        <div className="bg-dark-card border border-pink-500/20 rounded-xl p-4 shadow-lg shadow-pink-900/10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-pink-400/60">@{obj.id}</span>
                    <span className="font-bold text-pink-300">{obj.className}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <StatBadge label="size" value={elements.length} color="bg-pink-500/20 text-pink-300" />
                    <StatBadge label="capacity" value={CAPACITY} color="bg-dark-bg text-dark-muted" />
                    <StatBadge label="load factor" value={loadFactor.toFixed(3)} color="bg-pink-500/20 text-pink-300" />
                </div>
            </div>

            {/* Load Factor Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px] text-dark-muted mb-1">
                    <span>Load Factor: {(loadFactor * 100).toFixed(1)}%</span>
                    <span className={loadFactor >= 0.75 ? 'text-red-400 font-bold' : 'text-green-400'}>
                        {loadFactor >= 0.75 ? '⚠ Resize threshold (0.75) reached' : 'Threshold: 75%'}
                    </span>
                </div>
                <div className="h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                    <motion.div
                        className={`h-full rounded-full ${loadFactor >= 0.75 ? 'bg-red-500' : 'bg-pink-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(loadFactor / 0.75 * 100, 100)}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                </div>
            </div>

            {/* Hashcode Info */}
            {elements.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-dark-bg border border-pink-500/10 text-xs">
                    <div className="text-pink-400 font-semibold mb-1 flex items-center gap-1">
                        <span>⚙</span> Hashcode → Bucket Mapping
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {elements.slice(0, 5).map((e, i) => {
                            const raw = displayValue(e).replace(/^"|"$/g, '')
                            const hc = simpleHashCode(raw)
                            const bi = Math.abs(hc) % CAPACITY
                            return (
                                <div key={i} className="flex items-center gap-1 text-[10px] bg-pink-900/20 border border-pink-500/20 rounded px-2 py-1">
                                    <span className="text-pink-300 font-mono">{displayValue(e)}</span>
                                    <span className="text-dark-muted">→ h={hc} → [{bi}]</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Bucket Array */}
            <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-dark-muted uppercase tracking-wider">Bucket Array ({CAPACITY} slots)</span>
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className="text-[10px] text-pink-400 hover:text-pink-300 transition-colors"
                    >
                        {showAll ? `Show only filled (${filledBuckets.length})` : `Show all ${CAPACITY} slots`}
                    </button>
                </div>
                <AnimatePresence>
                    {shown.map(bucket => (
                        <SetBucketRow key={bucket.idx} bucketIndex={bucket.idx} elems={bucket.elems} capacity={CAPACITY} />
                    ))}
                </AnimatePresence>
                {elements.length === 0 && (
                    <div className="text-sm text-dark-muted italic py-4 text-center">Set is empty</div>
                )}
            </div>
        </div>
    )
}

function SetBucketRow({ bucketIndex: idx, elems, capacity }: { bucketIndex: number; elems: Value[]; capacity: number }) {
    const isEmpty = elems.length === 0
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`flex items-start gap-2 rounded-lg border px-2 py-1.5
        ${isEmpty ? 'border-dark-border/40 bg-dark-bg/30' : 'border-pink-500/40 bg-pink-900/10'}`}
        >
            <div className={`min-w-[32px] text-center font-mono text-[10px] font-bold pt-0.5
        ${isEmpty ? 'text-dark-muted/40' : 'text-pink-400'}`}>
                [{idx}]
            </div>
            <div className={`w-px self-stretch ${isEmpty ? 'bg-dark-border/20' : 'bg-pink-500/30'}`} />
            <div className="flex flex-wrap gap-2 flex-1 min-h-[24px]">
                {isEmpty ? (
                    <span className="text-[10px] font-mono text-dark-muted/30 self-center">null</span>
                ) : (
                    elems.map((e, i) => {
                        const raw = displayValue(e).replace(/^"|"$/g, '')
                        const hc = simpleHashCode(raw)
                        return (
                            <AnimatePresence key={i} mode="popLayout">
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.8, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                    className="flex flex-col"
                                >
                                    <div className="px-3 py-1 rounded-lg border border-pink-500/40 bg-pink-800/30 text-pink-200 font-mono text-xs font-semibold">
                                        {displayValue(e)}
                                    </div>
                                    <div className="text-[9px] text-dark-muted font-mono mt-0.5 px-0.5">
                                        hash={hc} idx={Math.abs(hc) % capacity}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )
                    })
                )}
            </div>
        </motion.div>
    )
}

// ─── List Visualization ───────────────────────────────────────────────────────
function ListVisualization({ obj }: { obj: HeapObject }) {
    const elements = obj.arrayElements || []

    return (
        <div className="bg-dark-card border border-jvm-method/20 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-jvm-method/60">@{obj.id}</span>
                    <span className="font-bold text-jvm-method">{obj.className}</span>
                </div>
                <div className="flex gap-2 text-xs">
                    <StatBadge label="size" value={elements.length} color="bg-jvm-method/20 text-jvm-method" />
                </div>
            </div>

            <div className="overflow-x-auto pb-2 hide-scrollbar">
                <div className="flex items-end gap-1.5 min-w-max">
                    <AnimatePresence mode="popLayout">
                        {elements.map((elem, i) => (
                            <motion.div
                                key={i}
                                layout
                                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.02 }}
                                className="flex flex-col items-center"
                            >
                                {/* Index label */}
                                <div className="text-[10px] text-dark-muted mb-1 font-mono">{i}</div>
                                {/* Cell */}
                                <div className="min-w-[52px] min-h-[52px] flex items-center justify-center bg-dark-bg border-2 border-jvm-method/50 rounded-lg text-sm font-mono shadow-inner overflow-hidden relative group cursor-default">
                                    <div className="absolute inset-0 bg-jvm-method/5 group-hover:bg-jvm-method/15 transition-colors" />
                                    <span className="truncate px-2 z-10 w-full text-center text-dark-text" title={displayValue(elem)}>
                                        {displayValue(elem)}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {elements.length === 0 && (
                        <div className="text-sm text-dark-muted italic py-4">Empty list</div>
                    )}
                </div>
            </div>

            {/* Size meter */}
            {elements.length > 0 && (
                <div className="mt-3 text-[10px] text-dark-muted flex items-center gap-2">
                    <span className="font-mono">[0..{elements.length - 1}]</span>
                    <span>•</span>
                    <span>{elements.length} element{elements.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>Type: {obj.className}</span>
                </div>
            )}
        </div>
    )
}

// ─── Array Visualization ─────────────────────────────────────────────────────
function ArrayVisualization({ array }: { array: HeapObject }) {
    const elements = array.arrayElements || []
    return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 overflow-hidden shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-jvm-method">@{array.id}</span>
                    <span className="text-sm font-semibold">{array.className}</span>
                </div>
                <span className="text-xs text-dark-muted px-2 py-0.5 bg-dark-bg rounded border border-dark-border">
                    length: {elements.length}
                </span>
            </div>
            <div className="overflow-x-auto pb-4 pt-2 hide-scrollbar">
                <div className="flex gap-1.5 min-w-max">
                    <AnimatePresence mode="popLayout">
                        {elements.map((elem, i) => (
                            <motion.div key={i} layout
                                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                className="flex flex-col items-center"
                            >
                                <div className="text-[10px] text-dark-muted mb-1 font-mono">{i}</div>
                                <div className="w-14 h-14 flex items-center justify-center bg-dark-bg border-2 border-jvm-method/50 rounded-md text-sm font-mono shadow-inner overflow-hidden relative group">
                                    <div className="absolute inset-0 bg-jvm-method/5 group-hover:bg-jvm-method/10 transition-colors" />
                                    <span className="truncate px-1 z-10 w-full text-center" title={valueToString(elem)}>
                                        {valueToString(elem)}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {elements.length === 0 && (
                        <div className="text-sm text-dark-muted italic py-4">Empty array</div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Linked List Visualization ────────────────────────────────────────────────
function LinkedListVisualization({ chain }: { chain: HeapObject[] }) {
    return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 overflow-x-auto hide-scrollbar shadow-sm">
            <div className="text-xs text-dark-muted mb-3 font-mono flex items-center gap-2">
                <span className="px-2 py-0.5 bg-jvm-pc/10 text-jvm-pc border border-jvm-pc/30 rounded">
                    HEAD @{chain[0]?.id}
                </span>
                <span>Nodes: {chain.length}</span>
            </div>
            <div className="flex items-center min-w-max p-2 gap-0">
                {chain.map((node, i) => {
                    const dataField = node.fields.find(f => ['val', 'data', 'value'].includes(f.name))
                    const dataVal = dataField ? displayValue(dataField.value) : '?'
                    const isLast = i === chain.length - 1
                    return (
                        <React.Fragment key={node.id}>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
                                className="flex items-stretch bg-dark-bg border-2 border-jvm-pc/60 rounded-md shadow-md"
                                title={`Node @${node.id}`}
                            >
                                <div className="w-16 h-12 flex flex-col items-center justify-center border-r-[1.5px] border-dashed border-jvm-pc/40 px-2 relative group">
                                    <span className="text-[9px] text-dark-muted absolute top-0.5 left-1 font-mono opacity-60">
                                        {dataField?.name || 'val'}
                                    </span>
                                    <span className="font-mono text-base font-bold text-dark-text truncate w-full text-center pt-2">
                                        {dataVal}
                                    </span>
                                </div>
                                <div className="w-8 flex items-center justify-center bg-jvm-pc/5 group relative">
                                    <span className="text-[8px] text-jvm-pc/60 absolute bottom-0.5">next</span>
                                    <div className="w-2 h-2 rounded-full bg-jvm-pc/80" />
                                </div>
                            </motion.div>
                            {!isLast && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 + 0.1 }}
                                    className="w-10 h-6 flex items-center px-1 self-center"
                                >
                                    <svg className="w-full h-full text-jvm-pc" viewBox="0 0 50 20" preserveAspectRatio="none">
                                        <defs>
                                            <marker id={`ah-${i}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                <polygon points="0 0, 8 3, 0 6" fill="currentColor" />
                                            </marker>
                                        </defs>
                                        <line x1="0" y1="10" x2="48" y2="10" stroke="currentColor" strokeWidth="2" markerEnd={`url(#ah-${i})`} />
                                    </svg>
                                </motion.div>
                            )}
                            {isLast && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 + 0.1 }}
                                    className="w-14 h-6 flex justify-start items-center ml-1 self-center"
                                >
                                    <svg className="w-8 h-full text-dark-muted" viewBox="0 0 40 20" preserveAspectRatio="none">
                                        <line x1="0" y1="10" x2="35" y2="10" stroke="currentColor" strokeDasharray="4 2" strokeWidth="1.5" />
                                        <line x1="30" y1="4" x2="30" y2="16" stroke="currentColor" strokeWidth="2" />
                                        <line x1="35" y1="6" x2="35" y2="14" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                    <span className="text-xs font-mono text-dark-muted ml-1">null</span>
                                </motion.div>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Binary Tree Visualization ────────────────────────────────────────────────

interface TreeLayoutNode {
    obj: HeapObject
    x: number
    y: number
    left: TreeLayoutNode | null
    right: TreeLayoutNode | null
    depth: number
    value: string
}

function buildTreeLayout(
    node: HeapObject | undefined,
    allNodes: HeapObject[],
    depth: number,
    visited: Set<string>
): TreeLayoutNode | null {
    if (!node || visited.has(node.id)) return null
    visited.add(node.id)

    // Get display value
    const dataField = node.fields.find(f => ['val', 'data', 'value', 'key'].includes(f.name))
    const value = dataField ? displayValue(dataField.value) : `@${node.id}`

    // Find left and right children
    const leftField = node.fields.find(f => f.name === 'left')
    const rightField = node.fields.find(f => f.name === 'right')

    let leftChild: HeapObject | undefined
    let rightChild: HeapObject | undefined

    if (leftField && leftField.value.kind === 'reference') {
        const rv = leftField.value as ReferenceValue
        if (rv.objectId) leftChild = allNodes.find(n => n.id === rv.objectId)
    }
    if (rightField && rightField.value.kind === 'reference') {
        const rv = rightField.value as ReferenceValue
        if (rv.objectId) rightChild = allNodes.find(n => n.id === rv.objectId)
    }

    return {
        obj: node,
        x: 0, // computed later
        y: 0,
        left: buildTreeLayout(leftChild, allNodes, depth + 1, visited),
        right: buildTreeLayout(rightChild, allNodes, depth + 1, visited),
        depth,
        value,
    }
}

function getTreeDepth(node: TreeLayoutNode | null): number {
    if (!node) return 0
    return 1 + Math.max(getTreeDepth(node.left), getTreeDepth(node.right))
}

function assignPositions(
    node: TreeLayoutNode | null,
    counter: { val: number },
    verticalGap: number
): void {
    if (!node) return
    // In-order traversal assigns x positions
    assignPositions(node.left, counter, verticalGap)
    node.x = counter.val * 70 // horizontal spacing
    node.y = node.depth * verticalGap
    counter.val++
    assignPositions(node.right, counter, verticalGap)
}

function collectNodes(node: TreeLayoutNode | null, result: TreeLayoutNode[]): void {
    if (!node) return
    result.push(node)
    collectNodes(node.left, result)
    collectNodes(node.right, result)
}

interface TreeEdge {
    parent: TreeLayoutNode
    child: TreeLayoutNode
    direction: 'left' | 'right'
}

function collectEdges(node: TreeLayoutNode | null, result: TreeEdge[]): void {
    if (!node) return
    if (node.left) {
        result.push({ parent: node, child: node.left, direction: 'left' })
        collectEdges(node.left, result)
    }
    if (node.right) {
        result.push({ parent: node, child: node.right, direction: 'right' })
        collectEdges(node.right, result)
    }
}

interface NullEdge {
    parent: TreeLayoutNode
    direction: 'left' | 'right'
}

function collectNullEdges(node: TreeLayoutNode | null, result: NullEdge[]): void {
    if (!node) return
    if (!node.left) result.push({ parent: node, direction: 'left' })
    if (!node.right) result.push({ parent: node, direction: 'right' })
    collectNullEdges(node.left, result)
    collectNullEdges(node.right, result)
}

function BinaryTreeVisualization({ root, allNodes }: { root: HeapObject; allNodes: HeapObject[] }) {
    const { jvmState } = useExecutionStore()
    const treeLayout = useMemo(() => {
        const visited = new Set<string>()
        const tree = buildTreeLayout(root, allNodes, 0, visited)
        if (!tree) return null

        const depth = getTreeDepth(tree)
        const verticalGap = Math.max(70, 90 - depth * 5)
        const counter = { val: 0 }
        assignPositions(tree, counter, verticalGap)
        return tree
    }, [root, allNodes])

    // ── Traversal state detection ──
    const treeNodeIdSet = useMemo(() => new Set(allNodes.map(n => n.id)), [allNodes])

    // Scan stack frames for references to tree nodes
    // Skip 'main' and constructor frames — we only want traversal methods (dfs, bfs, etc.)
    const { activeNodeId, pathNodeIds } = useMemo(() => {
        const pathIds: string[] = []
        // Walk frames from bottom to top
        for (const frame of jvmState.stack) {
            // Skip main and constructors — they build the tree, not traverse it
            if (frame.methodName === 'main' || frame.methodName === '<init>') continue
            for (const local of frame.localVariables) {
                if (local.value.kind === 'reference') {
                    const rv = local.value as ReferenceValue
                    if (rv.objectId && treeNodeIdSet.has(rv.objectId) && !pathIds.includes(rv.objectId)) {
                        pathIds.push(rv.objectId)
                    }
                }
            }
        }
        const active = pathIds.length > 0 ? pathIds[pathIds.length - 1] : null
        const pathSet = new Set(pathIds.slice(0, -1))
        return { activeNodeId: active, pathNodeIds: pathSet }
    }, [jvmState.stack, treeNodeIdSet])

    // Track visited nodes persistently across steps
    const [visitedNodes, setVisitedNodes] = useState<Map<string, number>>(new Map())
    const prevActiveRef = useRef<string | null>(null)

    useEffect(() => {
        // Reset when execution restarts
        if (jvmState.stepNumber === 0) {
            setVisitedNodes(new Map())
            prevActiveRef.current = null
            return
        }
        // When a new node becomes active, record it
        if (activeNodeId && activeNodeId !== prevActiveRef.current) {
            setVisitedNodes(prev => {
                if (prev.has(activeNodeId)) return prev
                const next = new Map(prev)
                next.set(activeNodeId, next.size + 1)
                return next
            })
        }
        prevActiveRef.current = activeNodeId
    }, [activeNodeId, jvmState.stepNumber])

    // Mark nodes that left the stack as fully visited (green)
    // A node is "completed" if it was visited but is no longer active or on path
    const getNodeState = (nodeId: string): 'active' | 'path' | 'visited' | 'unvisited' => {
        if (nodeId === activeNodeId) return 'active'
        if (pathNodeIds.has(nodeId)) return 'path'
        if (visitedNodes.has(nodeId)) return 'visited'
        return 'unvisited'
    }

    const isTraversing = activeNodeId !== null || visitedNodes.size > 0

    if (!treeLayout) return null

    const nodes: TreeLayoutNode[] = []
    collectNodes(treeLayout, nodes)

    const edges: TreeEdge[] = []
    collectEdges(treeLayout, edges)

    const nullEdges: NullEdge[] = []
    collectNullEdges(treeLayout, nullEdges)

    const totalDepth = getTreeDepth(treeLayout)
    const nodeRadius = 22
    const padding = 40

    const minX = Math.min(...nodes.map(n => n.x)) - padding
    const maxX = Math.max(...nodes.map(n => n.x)) + padding
    const minY = -padding
    const maxY = Math.max(...nodes.map(n => n.y)) + padding + 30
    const svgWidth = maxX - minX + nodeRadius * 2
    const svgHeight = maxY - minY + nodeRadius * 2
    const offsetX = -minX + nodeRadius
    const offsetY = -minY + nodeRadius

    // Build visit order trail
    const visitTrail = Array.from(visitedNodes.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([id]) => {
            const n = nodes.find(nd => nd.obj.id === id)
            return n ? n.value : '?'
        })

    // Node style helper
    const nodeStyle = (state: 'active' | 'path' | 'visited' | 'unvisited', isRoot: boolean) => {
        switch (state) {
            case 'active': return {
                fill: 'rgba(245, 158, 11, 0.3)',
                stroke: '#f59e0b',
                strokeWidth: 3,
                textFill: '#fef3c7',
                glowColor: '#f59e0b',
            }
            case 'path': return {
                fill: 'rgba(34, 211, 238, 0.15)',
                stroke: '#22d3ee',
                strokeWidth: 2.5,
                textFill: '#cffafe',
                glowColor: '#22d3ee',
            }
            case 'visited': return {
                fill: 'rgba(16, 185, 129, 0.25)',
                stroke: '#10b981',
                strokeWidth: 2,
                textFill: '#a7f3d0',
                glowColor: null,
            }
            default: return {
                fill: isRoot ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 30, 46, 0.9)',
                stroke: isRoot ? '#34d399' : '#4b5563',
                strokeWidth: isRoot ? 2.5 : 2,
                textFill: isRoot ? '#a7f3d0' : '#e5e7eb',
                glowColor: isRoot ? '#34d399' : null,
            }
        }
    }

    return (
        <div className="bg-dark-card border border-emerald-500/20 rounded-xl p-4 shadow-lg shadow-emerald-900/10">
            {/* Pulse animation keyframes */}
            <style>{`
                @keyframes treePulse {
                    0%, 100% { opacity: 0.4; r: ${nodeRadius + 6}; }
                    50% { opacity: 0.8; r: ${nodeRadius + 10}; }
                }
                .tree-pulse { animation: treePulse 1.2s ease-in-out infinite; }
            `}</style>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400/60">@{root.id}</span>
                    <span className="font-bold text-emerald-300">{root.className}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <StatBadge label="nodes" value={nodes.length} color="bg-emerald-500/20 text-emerald-300" />
                    <StatBadge label="depth" value={totalDepth} color="bg-dark-bg text-dark-muted" />
                    {isTraversing && (
                        <StatBadge label="visited" value={visitedNodes.size} color="bg-amber-500/20 text-amber-300" />
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-dark-muted">
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-cyan-400 rounded" />
                    <span>Left</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-emerald-400 rounded" />
                    <span>Right</span>
                </div>
                {isTraversing && (
                    <>
                        <div className="w-px h-3 bg-dark-border" />
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-amber-500/30 border-2 border-amber-500" />
                            <span>Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-cyan-500/15 border-2 border-cyan-400" />
                            <span>In Stack</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500/25 border-2 border-emerald-500" />
                            <span>Visited</span>
                        </div>
                    </>
                )}
            </div>

            {/* Tree SVG */}
            <div className="overflow-x-auto pb-2 hide-scrollbar">
                <svg
                    width={svgWidth}
                    height={svgHeight}
                    className="mx-auto"
                    style={{ minWidth: svgWidth }}
                >
                    {/* Edges */}
                    {edges.map((edge, i) => {
                        const childState = getNodeState(edge.child.obj.id)
                        const isActiveEdge = childState === 'active' || childState === 'path'
                        const isVisitedEdge = childState === 'visited'
                        const baseColor = edge.direction === 'left' ? '#22d3ee' : '#34d399'
                        return (
                            <motion.line
                                key={`edge-${i}`}
                                x1={edge.parent.x + offsetX}
                                y1={edge.parent.y + offsetY + nodeRadius}
                                x2={edge.child.x + offsetX}
                                y2={edge.child.y + offsetY - nodeRadius}
                                stroke={isActiveEdge ? '#f59e0b' : baseColor}
                                strokeWidth={isActiveEdge ? 3 : 2}
                                strokeOpacity={isActiveEdge ? 0.9 : isVisitedEdge ? 0.7 : 0.4}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                            />
                        )
                    })}

                    {/* Null indicators */}
                    {nullEdges.map((ne, i) => {
                        const px = ne.parent.x + offsetX
                        const py = ne.parent.y + offsetY + nodeRadius
                        const nx = px + (ne.direction === 'left' ? -20 : 20)
                        const ny = py + 25
                        return (
                            <g key={`null-${i}`} opacity={0.35}>
                                <line x1={px} y1={py} x2={nx} y2={ny}
                                    stroke={ne.direction === 'left' ? '#22d3ee' : '#34d399'}
                                    strokeWidth={1.5} strokeDasharray="4 3" />
                                <line x1={nx - 6} y1={ny} x2={nx + 6} y2={ny} stroke="#6b7280" strokeWidth={1.5} />
                                <line x1={nx - 4} y1={ny + 3} x2={nx + 4} y2={ny + 3} stroke="#6b7280" strokeWidth={1.2} />
                                <line x1={nx - 2} y1={ny + 6} x2={nx + 2} y2={ny + 6} stroke="#6b7280" strokeWidth={1} />
                            </g>
                        )
                    })}

                    {/* Nodes */}
                    {nodes.map((node, i) => {
                        const cx = node.x + offsetX
                        const cy = node.y + offsetY
                        const isRoot = node.depth === 0
                        const state = getNodeState(node.obj.id)
                        const style = nodeStyle(state, isRoot)
                        const visitOrder = visitedNodes.get(node.obj.id)
                        return (
                            <motion.g
                                key={node.obj.id}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    type: 'spring', stiffness: 300, damping: 20,
                                    delay: node.depth * 0.1 + i * 0.03
                                }}
                                style={{ transformOrigin: `${cx}px ${cy}px` }}
                            >
                                {/* Pulsing glow for active node */}
                                {state === 'active' && (
                                    <circle
                                        cx={cx} cy={cy} r={nodeRadius + 6}
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        className="tree-pulse"
                                    />
                                )}
                                {/* Static glow for path/root */}
                                {style.glowColor && state !== 'active' && (
                                    <circle
                                        cx={cx} cy={cy} r={nodeRadius + 4}
                                        fill="none"
                                        stroke={style.glowColor}
                                        strokeWidth={1}
                                        opacity={0.4}
                                    />
                                )}
                                {/* Node circle */}
                                <circle
                                    cx={cx} cy={cy} r={nodeRadius}
                                    fill={style.fill}
                                    stroke={style.stroke}
                                    strokeWidth={style.strokeWidth}
                                    style={{ transition: 'fill 0.3s, stroke 0.3s' }}
                                />
                                {/* Value text */}
                                <text
                                    x={cx} y={cy}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill={style.textFill}
                                    fontSize={node.value.length > 3 ? 10 : 13}
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                >
                                    {node.value.length > 6 ? node.value.slice(0, 5) + '…' : node.value}
                                </text>
                                {/* Visit order badge */}
                                {visitOrder !== undefined && (
                                    <>
                                        <circle
                                            cx={cx + nodeRadius - 2}
                                            cy={cy - nodeRadius + 2}
                                            r={8}
                                            fill={state === 'active' ? '#f59e0b' : '#10b981'}
                                            stroke="#1e1e2e"
                                            strokeWidth={1.5}
                                        />
                                        <text
                                            x={cx + nodeRadius - 2}
                                            y={cy - nodeRadius + 2}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fill="#fff"
                                            fontSize={8}
                                            fontFamily="monospace"
                                            fontWeight="bold"
                                        >
                                            {visitOrder}
                                        </text>
                                    </>
                                )}
                                {/* Depth label (only when not traversing) */}
                                {!isTraversing && (
                                    <text
                                        x={cx + nodeRadius + 4}
                                        y={cy - nodeRadius + 4}
                                        fill="#6b7280"
                                        fontSize={9}
                                        fontFamily="monospace"
                                    >
                                        d{node.depth}
                                    </text>
                                )}
                            </motion.g>
                        )
                    })}
                </svg>
            </div>

            {/* Traversal trail */}
            {isTraversing && visitTrail.length > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-dark-bg border border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Traversal Order</span>
                        <span className="text-[10px] text-dark-muted">({visitedNodes.size} of {nodes.length})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        {visitTrail.map((val, i) => {
                            const isLast = i === visitTrail.length - 1 && activeNodeId !== null
                            return (
                                <React.Fragment key={i}>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${isLast
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                        }`}>
                                        {val}
                                    </span>
                                    {i < visitTrail.length - 1 && (
                                        <span className="text-dark-muted text-[10px]">→</span>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Stats footer */}
            <div className="mt-3 text-[10px] text-dark-muted flex items-center gap-3">
                <span>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>Depth: {totalDepth}</span>
                <span>•</span>
                <span>Type: {root.className}</span>
            </div>
        </div>
    )
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────
function StatBadge({ label, value, color, tooltip }: {
    label: string; value: string | number; color: string; tooltip?: string
}) {
    return (
        <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded border border-dark-border ${color} ${tooltip ? 'cursor-help' : ''}`}
            title={tooltip}
        >
            <span className="text-dark-muted">{label}:</span>
            <span className="font-bold font-mono">{value}</span>
        </div>
    )
}
