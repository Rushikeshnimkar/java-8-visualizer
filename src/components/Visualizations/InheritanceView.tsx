// ============================================
// Inheritance Flow Visualization
// Shows class hierarchy, call dispatch, and OOP concept labels
// ============================================

import { useMemo, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'

// ── OOP concept label detection ────────────────────────────────────────────

type OopConcept =
    | 'override'
    | 'overload'
    | 'constructor'
    | 'super-constructor'
    | 'super-call'
    | 'static'
    | 'data-hiding'
    | 'polymorphism'
    | 'abstract'
    | 'interface'
    | 'inheritance'
    | 'normal'

interface ConceptMeta {
    label: string
    color: string
    bg: string
    border: string
    description: string
    emoji: string
}

const CONCEPT_META: Record<OopConcept, ConceptMeta> = {
    'override': {
        label: 'Method Override',
        color: 'text-emerald-300',
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-400/40',
        description: 'Child class provides its own implementation of a parent method',
        emoji: '↺',
    },
    'overload': {
        label: 'Overloading',
        color: 'text-cyan-300',
        bg: 'bg-cyan-500/15',
        border: 'border-cyan-400/40',
        description: 'Same method name, different parameters',
        emoji: '⊕',
    },
    'constructor': {
        label: 'Constructor',
        color: 'text-amber-300',
        bg: 'bg-amber-500/15',
        border: 'border-amber-400/40',
        description: 'Object initialization code',
        emoji: '⬡',
    },
    'super-constructor': {
        label: 'super() Call',
        color: 'text-violet-300',
        bg: 'bg-violet-500/15',
        border: 'border-violet-400/40',
        description: 'Child constructor calls parent constructor first',
        emoji: '▲',
    },
    'super-call': {
        label: 'super.method()',
        color: 'text-purple-300',
        bg: 'bg-purple-500/15',
        border: 'border-purple-400/40',
        description: 'Explicitly calling parent class method',
        emoji: '↑',
    },
    'static': {
        label: 'Static Method',
        color: 'text-blue-300',
        bg: 'bg-blue-500/15',
        border: 'border-blue-400/40',
        description: 'Method belongs to the class, not to any object',
        emoji: '◈',
    },
    'data-hiding': {
        label: 'Data Hiding',
        color: 'text-rose-300',
        bg: 'bg-rose-500/15',
        border: 'border-rose-400/40',
        description: 'Private fields accessed only through getters/setters',
        emoji: '🔒',
    },
    'polymorphism': {
        label: 'Polymorphism',
        color: 'text-lime-300',
        bg: 'bg-lime-500/15',
        border: 'border-lime-400/40',
        description: 'Parent reference calls child class method at runtime',
        emoji: '⬡',
    },
    'abstract': {
        label: 'Abstract',
        color: 'text-orange-300',
        bg: 'bg-orange-500/15',
        border: 'border-orange-400/40',
        description: 'Abstract method implemented by concrete subclass',
        emoji: '◎',
    },
    'interface': {
        label: 'Interface',
        color: 'text-teal-300',
        bg: 'bg-teal-500/15',
        border: 'border-teal-400/40',
        description: 'Interface contract implemented by the class',
        emoji: '⬟',
    },
    'inheritance': {
        label: 'Inherited',
        color: 'text-indigo-300',
        bg: 'bg-indigo-500/15',
        border: 'border-indigo-400/40',
        description: 'Method inherited from parent class (not overridden)',
        emoji: '↓',
    },
    'normal': {
        label: 'Method Call',
        color: 'text-gray-300',
        bg: 'bg-gray-500/15',
        border: 'border-gray-400/40',
        description: 'Regular method call within the same class',
        emoji: '→',
    },
}

// ── Class node layout ──────────────────────────────────────────────────────

interface ClassNode {
    name: string
    superClass: string | null
    interfaces: string[]
    methods: string[]
    fields: string[]
    isInterface: boolean
    isAbstract: boolean
    x: number
    y: number
    width: number
    height: number
}

interface CallEvent {
    id: string
    fromClass: string | null
    toClass: string
    methodName: string
    concept: OopConcept
    step: number
}

// ── Main Component ─────────────────────────────────────────────────────────

export function InheritanceView() {
    const { jvmState, compiledProgram } = useExecutionStore()
    const svgRef = useRef<SVGSVGElement>(null)
    const [svgSize, setSvgSize] = useState({ w: 800, h: 500 })
    const [hoveredConcept, setHoveredConcept] = useState<OopConcept | null>(null)
    const [callHistory, setCallHistory] = useState<CallEvent[]>([])
    const prevStepRef = useRef<number>(-1)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [isPanning, setIsPanning] = useState(false)
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
    const [logCollapsed, setLogCollapsed] = useState(false)
    const [showLegend, setShowLegend] = useState(false)
    const canvasRef = useRef<HTMLDivElement>(null)

    // Current execution state
    const stack = jvmState.stack
    const topFrame = stack[stack.length - 1]
    const activeClass = topFrame?.className ?? null
    const activeMethod = topFrame?.methodName ?? null

    // Detect canvas container size
    useEffect(() => {
        const el = canvasRef.current
        if (!el) return
        const ro = new ResizeObserver(() => {
            setSvgSize({ w: el.clientWidth, h: el.clientHeight })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Mouse wheel zoom — zoom toward cursor position
    useEffect(() => {
        const el = canvasRef.current
        if (!el) return
        const handler = (e: WheelEvent) => {
            e.preventDefault()
            const rect = el.getBoundingClientRect()
            const mouseX = e.clientX - rect.left
            const mouseY = e.clientY - rect.top

            // Convert mouse position to world coordinates before zoom
            const worldX = pan.x + mouseX / zoom
            const worldY = pan.y + mouseY / zoom

            const delta = -e.deltaY * 0.001
            const newZoom = Math.max(0.1, Math.min(4, zoom * (1 + delta)))

            // After zoom, adjust pan so the world point under cursor stays fixed
            const newPanX = worldX - mouseX / newZoom
            const newPanY = worldY - mouseY / newZoom

            setZoom(newZoom)
            setPan({ x: newPanX, y: newPanY })
        }
        el.addEventListener('wheel', handler, { passive: false })
        return () => el.removeEventListener('wheel', handler)
    }, [zoom, pan])

    // Mouse drag to pan
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return // left click only
        setIsPanning(true)
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    }
    useEffect(() => {
        if (!isPanning) return
        const handleMove = (e: MouseEvent) => {
            const dx = e.clientX - panStartRef.current.x
            const dy = e.clientY - panStartRef.current.y
            setPan({
                x: panStartRef.current.panX - dx / zoom,
                y: panStartRef.current.panY - dy / zoom,
            })
        }
        const handleUp = () => setIsPanning(false)
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleUp)
        return () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleUp)
        }
    }, [isPanning, zoom])

    // Reset pan on compile
    useEffect(() => {
        if (jvmState.stepNumber === 0) {
            setPan({ x: 0, y: 0 })
            setZoom(1)
        }
    }, [jvmState.stepNumber])

    // Build class hierarchy nodes
    const { nodes, edges } = useMemo(() => {
        const loadedClasses = jvmState.methodArea.loadedClasses
        const classNames = Object.keys(loadedClasses)
        if (classNames.length === 0) return { nodes: [], edges: [] }

        // Assign levels: Object → parents → children
        const levels = new Map<string, number>()
        const assignLevel = (name: string, level: number) => {
            const existing = levels.get(name) ?? -1
            if (level <= existing) return
            levels.set(name, level)
            const cls = loadedClasses[name]
            if (!cls) return
            for (const cname of classNames) {
                const c = loadedClasses[cname]
                if (c?.superClass === name || c?.interfaces?.includes(name)) {
                    assignLevel(cname, level + 1)
                }
            }
        }
        // Find roots (no parent in our list)
        for (const name of classNames) {
            const cls = loadedClasses[name]
            const parentInList = cls?.superClass && classNames.includes(cls.superClass)
            const hasInterfaceParent = cls?.interfaces?.some(i => classNames.includes(i))
            if (!parentInList && !hasInterfaceParent) {
                assignLevel(name, 0)
            }
        }
        // Any unleveled gets level 0
        for (const name of classNames) {
            if (!levels.has(name)) levels.set(name, 0)
        }

        // Group by level
        const byLevel = new Map<number, string[]>()
        for (const [name, level] of levels) {
            const arr = byLevel.get(level) ?? []
            arr.push(name)
            byLevel.set(level, arr)
        }

        const NODE_W = 220
        const NODE_H = 130
        const H_GAP = 40
        const V_GAP = 100

        const maxInLevel = Math.max(...Array.from(byLevel.values()).map(a => a.length))
        const totalW = Math.max(svgSize.w - 40, (maxInLevel * (NODE_W + H_GAP)))

        const nodes: ClassNode[] = []
        const edges: Array<{ from: string; to: string; type: 'extends' | 'implements' }> = []

        let currentY = 40
        for (const [_, names] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
            const rowWidth = names.length * NODE_W + (names.length - 1) * H_GAP
            const startX = (totalW - rowWidth) / 2 + 20

            let maxRowHeight = NODE_H

            names.forEach((name, i) => {
                const cls = loadedClasses[name]
                const methodNames = cls?.methods?.map(m => m.name) ?? []
                const fieldNames = cls?.fields?.map(f => f.name) ?? []

                const headerH = 36
                const fieldSection = fieldNames.length > 0 ? Math.min(fieldNames.length, 4) * 18 + 12 : 0
                const methodSection = Math.min(methodNames.length, 5) * 18 + 8
                const nodeHeight = Math.max(NODE_H, headerH + fieldSection + methodSection + 12)
                maxRowHeight = Math.max(maxRowHeight, nodeHeight)

                nodes.push({
                    name,
                    superClass: cls?.superClass ?? null,
                    interfaces: cls?.interfaces ?? [],
                    methods: methodNames,
                    fields: fieldNames,
                    isInterface: cls?.isInterface ?? false,
                    isAbstract: false,
                    x: startX + i * (NODE_W + H_GAP),
                    y: currentY,
                    width: NODE_W,
                    height: nodeHeight,
                })
                // Build edges
                if (cls?.superClass && classNames.includes(cls.superClass)) {
                    edges.push({ from: name, to: cls.superClass, type: 'extends' })
                }
                for (const iface of (cls?.interfaces ?? [])) {
                    if (classNames.includes(iface)) {
                        edges.push({ from: name, to: iface, type: 'implements' })
                    }
                }
            })

            currentY += maxRowHeight + V_GAP
        }

        return { nodes, edges }
    }, [jvmState.methodArea.loadedClasses, compiledProgram, svgSize])

    // Detect OOP concept for the current frame transition
    const detectConcept = (frame: (typeof stack)[0] | undefined, prevFrame: (typeof stack)[0] | undefined, allLoadedClasses: typeof jvmState.methodArea.loadedClasses): OopConcept => {
        if (!frame) return 'normal'
        const { className, methodName } = frame

        if (methodName === '<init>') {
            if (prevFrame && prevFrame.className !== className) return 'super-constructor'
            return 'constructor'
        }
        if (methodName === 'main') return 'static'

        const cls = allLoadedClasses[className]
        if (!cls) return 'normal'

        // If called from a different class (which is a subclass)
        if (prevFrame && prevFrame.className !== className) {
            const prevCls = allLoadedClasses[prevFrame.className]
            // Child called a method on parent → inheritance / polymorphism
            const parentHierarchy = []
            let cur = prevCls?.superClass
            while (cur) {
                parentHierarchy.push(cur)
                cur = allLoadedClasses[cur]?.superClass
            }
            if (parentHierarchy.includes(className)) {
                // prevFrame is a child, now executing in parent — could be super() call  
                return 'super-call'
            }
            // Parent reference calling child method → polymorphism / override
            const childHierarchy = []
            let cur2 = cls?.superClass
            while (cur2) {
                childHierarchy.push(cur2)
                cur2 = allLoadedClasses[cur2]?.superClass
            }
            if (childHierarchy.includes(prevFrame.className)) {
                return 'polymorphism'
            }
            return 'override'
        }

        // Same class — check if method is getter/setter (data hiding)
        if ((methodName.startsWith('get') || methodName.startsWith('set')) && methodName.length > 3) {
            const fieldName = methodName[3].toLowerCase() + methodName.slice(4)
            if (cls.fields?.some(f => f.name === fieldName)) {
                return 'data-hiding'
            }
        }

        // Check if it overrides a parent
        let parentName = cls.superClass
        while (parentName && allLoadedClasses[parentName]) {
            const parentCls = allLoadedClasses[parentName]
            if (parentCls.methods?.some(m => m.name === methodName)) {
                return 'override'
            }
            parentName = parentCls.superClass
        }

        // Check if inherited (method not declared in current class but in parent)
        const ownMethods = cls.methods?.map(m => m.name) ?? []
        if (!ownMethods.includes(methodName)) {
            return 'inheritance'
        }

        return 'normal'
    }

    // Track call history per step
    useEffect(() => {
        const step = jvmState.stepNumber
        if (step === prevStepRef.current) return
        prevStepRef.current = step

        if (!topFrame) return

        const prevFrame = stack.length >= 2 ? stack[stack.length - 2] : undefined
        const concept = detectConcept(topFrame, prevFrame, jvmState.methodArea.loadedClasses)

        // Only add a call event when the top frame changes method
        setCallHistory(prev => {
            const last = prev[prev.length - 1]
            if (last?.toClass === topFrame.className && last?.methodName === topFrame.methodName) {
                return prev
            }
            const event: CallEvent = {
                id: `${step}-${topFrame.className}-${topFrame.methodName}`,
                fromClass: prevFrame?.className ?? null,
                toClass: topFrame.className,
                methodName: topFrame.methodName,
                concept,
                step,
            }
            return [...prev.slice(-19), event] // keep last 20
        })
    }, [jvmState.stepNumber, topFrame, stack, jvmState.methodArea.loadedClasses])

    // Reset on compile
    useEffect(() => {
        if (jvmState.stepNumber === 0) {
            setCallHistory([])
        }
    }, [jvmState.stepNumber])

    const handleZoomIn = () => {
        const cx = pan.x + svgSize.w / zoom / 2
        const cy = pan.y + svgSize.h / zoom / 2
        const newZoom = Math.min(zoom + 0.2, 4)
        setPan({ x: cx - svgSize.w / newZoom / 2, y: cy - svgSize.h / newZoom / 2 })
        setZoom(newZoom)
    }
    const handleZoomOut = () => {
        const cx = pan.x + svgSize.w / zoom / 2
        const cy = pan.y + svgSize.h / zoom / 2
        const newZoom = Math.max(zoom - 0.2, 0.1)
        setPan({ x: cx - svgSize.w / newZoom / 2, y: cy - svgSize.h / newZoom / 2 })
        setZoom(newZoom)
    }
    const handleZoomReset = () => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }

    if (nodes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-center">
                <div>
                    <div className="text-5xl mb-4">🏗️</div>
                    <h3 className="text-lg font-semibold text-dark-text mb-2">No Classes Loaded</h3>
                    <p className="text-sm text-dark-muted max-w-xs">
                        Compile a Java program with classes, inheritance, or interfaces to see the visualization here.
                    </p>
                    <div className="mt-4 text-xs text-dark-muted bg-dark-border/30 rounded-lg p-3 text-left font-mono">
                        {`class Animal {
  String speak() { return "..."; }
}
class Dog extends Animal {
  String speak() { return "Woof!"; }
}`}
                    </div>
                </div>
            </div>
        )
    }

    const latestConcept = callHistory.length > 0
        ? callHistory[callHistory.length - 1].concept
        : null

    return (
        <div className="h-full flex flex-col overflow-hidden select-none" style={{ background: 'transparent' }}>
            {/* Header row: current concept badge + zoom controls */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-dark-border/50">
                <span className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider">Inheritance Flow</span>
                <div className="flex-1" />
                {latestConcept && latestConcept !== 'normal' && (
                    <motion.div
                        key={latestConcept}
                        initial={{ opacity: 0, scale: 0.85, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CONCEPT_META[latestConcept].bg} ${CONCEPT_META[latestConcept].border} ${CONCEPT_META[latestConcept].color}`}
                    >
                        <span>{CONCEPT_META[latestConcept].emoji}</span>
                        <span>{CONCEPT_META[latestConcept].label}</span>
                    </motion.div>
                )}
                {activeClass && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-dark-accent/15 border border-dark-accent/40 rounded-full text-[10px] font-semibold text-dark-accent">
                        <span className="w-1.5 h-1.5 rounded-full bg-dark-accent animate-pulse inline-block" />
                        <span>{activeClass}.{activeMethod}()</span>
                    </div>
                )}
                {/* Zoom controls */}
                <div className="flex items-center gap-0.5 ml-1 bg-dark-bg/80 border border-dark-border/40 rounded-lg px-1 py-0.5">
                    <button onClick={handleZoomOut} className="p-0.5 rounded hover:bg-dark-border/40 text-dark-muted hover:text-dark-text transition-colors" title="Zoom out">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <button onClick={handleZoomReset} className="px-1 text-[9px] font-mono text-dark-muted hover:text-dark-text transition-colors" title="Reset zoom">
                        {Math.round(zoom * 100)}%
                    </button>
                    <button onClick={handleZoomIn} className="p-0.5 rounded hover:bg-dark-border/40 text-dark-muted hover:text-dark-text transition-colors" title="Zoom in">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
                {/* Legend toggle */}
                <button
                    onClick={() => setShowLegend(v => !v)}
                    className={`ml-1 flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors ${showLegend
                        ? 'bg-dark-accent/15 border-dark-accent/40 text-dark-accent'
                        : 'bg-dark-bg/80 border-dark-border/40 text-dark-muted hover:text-dark-text'
                        }`}
                    title="Toggle legend"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Legend
                </button>
            </div>

            {/* Main area: diagram (top) + call log (bottom) */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Infinite Canvas */}
                <div
                    ref={canvasRef}
                    className="flex-1 relative"
                    style={{
                        cursor: isPanning ? 'grabbing' : 'grab',
                        overflow: 'hidden',
                        minHeight: 120,
                    }}
                    onMouseDown={handleMouseDown}
                >
                    {/* Dot grid background */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                        <defs>
                            <pattern
                                id="dot-grid"
                                x={(-pan.x * zoom) % (20 * zoom)}
                                y={(-pan.y * zoom) % (20 * zoom)}
                                width={20 * zoom}
                                height={20 * zoom}
                                patternUnits="userSpaceOnUse"
                            >
                                <circle cx={1} cy={1} r={0.8} fill="#374151" opacity={0.5} />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dot-grid)" />
                    </svg>

                    {/* Main diagram SVG */}
                    <svg
                        ref={svgRef}
                        className="absolute inset-0 w-full h-full"
                        viewBox={`${pan.x} ${pan.y} ${svgSize.w / zoom} ${svgSize.h / zoom}`}
                        style={{ zIndex: 1 }}
                    >
                        <defs>
                            {/* Arrow markers */}
                            <marker id="arrow-extends" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" opacity="0.7" />
                            </marker>
                            <marker id="arrow-implements" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#14b8a6" opacity="0.7" />
                            </marker>
                            <marker id="arrow-call" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" opacity="0.9" />
                            </marker>
                            {/* Glow filter for active class */}
                            <filter id="glow-active">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Edges — thicker, clearer */}
                        {edges.map((e, idx) => {
                            const from = nodes.find(n => n.name === e.from)
                            const to = nodes.find(n => n.name === e.to)
                            if (!from || !to) return null

                            const x1 = to.x + to.width / 2
                            const y1 = to.y + to.height
                            const x2 = from.x + from.width / 2
                            const y2 = from.y
                            const midY = (y1 + y2) / 2

                            const color = e.type === 'extends' ? '#818cf8' : '#2dd4bf'
                            const dashArray = e.type === 'implements' ? '8 4' : undefined

                            return (
                                <g key={idx}>
                                    <path
                                        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="2.5"
                                        strokeDasharray={dashArray}
                                        opacity="0.7"
                                        markerEnd={`url(#arrow-${e.type})`}
                                    />
                                    {/* Edge label in a pill */}
                                    <rect
                                        x={(x1 + x2) / 2 - 32}
                                        y={midY - 10}
                                        width={64}
                                        height={16}
                                        rx={8}
                                        fill="#111827"
                                        stroke={color}
                                        strokeWidth="1"
                                        opacity="0.9"
                                    />
                                    <text
                                        x={(x1 + x2) / 2}
                                        y={midY + 1}
                                        fill={color}
                                        fontSize="9"
                                        textAnchor="middle"
                                        fontWeight="600"
                                        fontFamily="system-ui"
                                    >
                                        {e.type === 'extends' ? 'extends' : 'implements'}
                                    </text>
                                </g>
                            )
                        })}

                        {/* Active call flow arrow */}
                        {callHistory.length >= 2 && (() => {
                            const latest = callHistory[callHistory.length - 1]
                            const prev = callHistory[callHistory.length - 2]
                            if (latest.toClass === prev.toClass) return null
                            const fromNode = nodes.find(n => n.name === prev.toClass)
                            const toNode = nodes.find(n => n.name === latest.toClass)
                            if (!fromNode || !toNode) return null
                            const cx1 = fromNode.x + fromNode.width / 2
                            const cy1 = fromNode.y + fromNode.height / 2
                            const cx2 = toNode.x + toNode.width / 2
                            const cy2 = toNode.y + toNode.height / 2
                            return (
                                <motion.line
                                    key={latest.id}
                                    x1={cx1} y1={cy1} x2={cx2} y2={cy2}
                                    stroke="#f59e0b"
                                    strokeWidth="3"
                                    strokeDasharray="8 4"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 0.9 }}
                                    exit={{ opacity: 0 }}
                                    markerEnd="url(#arrow-call)"
                                />
                            )
                        })()}

                        {/* Class nodes — UML-style cards */}
                        {nodes.map((node) => {
                            const isActive = node.name === activeClass
                            const wasRecentlyCalled = callHistory.some(e => e.toClass === node.name)
                            const recentCall = [...callHistory].reverse().find(e => e.toClass === node.name)

                            let borderColor = '#4b5563'
                            let bgColor = '#1f2937'
                            let headerBg = '#111827'

                            if (node.isInterface) {
                                borderColor = '#2dd4bf'
                                bgColor = '#0f2925'
                                headerBg = '#0d3730'
                            } else if (isActive) {
                                borderColor = '#818cf8'
                                bgColor = '#1e1b4b'
                                headerBg = '#312e81'
                            } else if (wasRecentlyCalled) {
                                borderColor = '#6b7280'
                                bgColor = '#1a1f2e'
                                headerBg = '#161b27'
                            }

                            const headerH = 36
                            const fieldSectionStart = headerH + 4
                            const fieldCount = Math.min(node.fields.length, 4)
                            const methodSectionStart = fieldSectionStart + (fieldCount > 0 ? fieldCount * 18 + 8 : 0)


                            return (
                                <g
                                    key={node.name}
                                    style={{ cursor: 'default' }}
                                    filter={isActive ? 'url(#glow-active)' : undefined}
                                >
                                    {/* Drop shadow */}
                                    <rect
                                        x={node.x + 3}
                                        y={node.y + 3}
                                        width={node.width}
                                        height={node.height}
                                        rx={12}
                                        fill="black"
                                        opacity={isActive ? 0.4 : 0.15}
                                    />

                                    {/* Card background */}
                                    <rect
                                        x={node.x}
                                        y={node.y}
                                        width={node.width}
                                        height={node.height}
                                        rx={12}
                                        fill={bgColor}
                                        stroke={borderColor}
                                        strokeWidth={isActive ? 2.5 : 1.5}
                                    />

                                    {/* Active pulsing border */}
                                    {isActive && (
                                        <rect
                                            x={node.x - 2}
                                            y={node.y - 2}
                                            width={node.width + 4}
                                            height={node.height + 4}
                                            rx={14}
                                            fill="none"
                                            stroke="#818cf8"
                                            strokeWidth="1.5"
                                            opacity="0.4"
                                        >
                                            <animate
                                                attributeName="opacity"
                                                values="0.2;0.7;0.2"
                                                dur="2s"
                                                repeatCount="indefinite"
                                            />
                                        </rect>
                                    )}

                                    {/* Header background */}
                                    <rect
                                        x={node.x + 1}
                                        y={node.y + 1}
                                        width={node.width - 2}
                                        height={headerH}
                                        rx={11}
                                        fill={headerBg}
                                    />
                                    <rect
                                        x={node.x + 1}
                                        y={node.y + headerH - 8}
                                        width={node.width - 2}
                                        height={8}
                                        fill={headerBg}
                                    />

                                    {/* Stereotype badge */}
                                    <text
                                        x={node.x + node.width / 2}
                                        y={node.y + 13}
                                        fontSize="9"
                                        fill={node.isInterface ? '#5eead4' : '#9ca3af'}
                                        fontFamily="system-ui, sans-serif"
                                        textAnchor="middle"
                                        fontStyle="italic"
                                    >
                                        {node.isInterface ? '«interface»' : node.isAbstract ? '«abstract»' : '«class»'}
                                    </text>

                                    {/* Class name — large and bold */}
                                    <text
                                        x={node.x + node.width / 2}
                                        y={node.y + 28}
                                        fontSize="14"
                                        fontWeight="700"
                                        fill={isActive ? '#e0e7ff' : '#f3f4f6'}
                                        textAnchor="middle"
                                        fontFamily="system-ui, sans-serif"
                                    >
                                        {node.name}
                                    </text>

                                    {/* Header separator */}
                                    <line
                                        x1={node.x + 1}
                                        y1={node.y + headerH}
                                        x2={node.x + node.width - 1}
                                        y2={node.y + headerH}
                                        stroke={borderColor}
                                        strokeWidth="1"
                                        opacity="0.5"
                                    />

                                    {/* Fields section */}
                                    {node.fields.length > 0 && (
                                        <>
                                            {node.fields.slice(0, 4).map((f, i) => (
                                                <text
                                                    key={f}
                                                    x={node.x + 14}
                                                    y={node.y + fieldSectionStart + 14 + i * 18}
                                                    fontSize="11"
                                                    fill="#d1d5db"
                                                    fontFamily="'Courier New', monospace"
                                                >
                                                    – {f}
                                                </text>
                                            ))}
                                            {node.fields.length > 4 && (
                                                <text
                                                    x={node.x + 14}
                                                    y={node.y + fieldSectionStart + 14 + 4 * 18}
                                                    fontSize="10"
                                                    fill="#6b7280"
                                                    fontFamily="system-ui"
                                                    fontStyle="italic"
                                                >
                                                    +{node.fields.length - 4} more…
                                                </text>
                                            )}
                                            {/* Separator between fields and methods */}
                                            <line
                                                x1={node.x + 1}
                                                y1={node.y + methodSectionStart - 4}
                                                x2={node.x + node.width - 1}
                                                y2={node.y + methodSectionStart - 4}
                                                stroke={borderColor}
                                                strokeWidth="0.5"
                                                opacity="0.4"
                                            />
                                        </>
                                    )}

                                    {/* Methods section */}
                                    {node.methods.slice(0, 5).map((m, i) => {
                                        const isActiveMethod = isActive && m === activeMethod
                                        return (
                                            <text
                                                key={m}
                                                x={node.x + 14}
                                                y={node.y + methodSectionStart + 14 + i * 18}
                                                fontSize="11"
                                                fill={isActiveMethod ? '#a5b4fc' : '#86efac'}
                                                fontFamily="'Courier New', monospace"
                                                fontWeight={isActiveMethod ? 'bold' : 'normal'}
                                            >
                                                {isActiveMethod ? '▶' : '+'} {m}()
                                            </text>
                                        )
                                    })}
                                    {node.methods.length > 5 && (
                                        <text
                                            x={node.x + 14}
                                            y={node.y + methodSectionStart + 14 + 5 * 18}
                                            fontSize="10"
                                            fill="#6b7280"
                                            fontFamily="system-ui"
                                            fontStyle="italic"
                                        >
                                            +{node.methods.length - 5} more…
                                        </text>
                                    )}

                                    {/* Active concept badge */}
                                    {isActive && recentCall && recentCall.concept !== 'normal' && (() => {
                                        const meta = CONCEPT_META[recentCall.concept]
                                        return (
                                            <g>
                                                <rect
                                                    x={node.x + node.width - 80}
                                                    y={node.y - 12}
                                                    width={76}
                                                    height={20}
                                                    rx={10}
                                                    fill="#111827"
                                                    stroke={meta.border.includes('emerald') ? '#34d399' : meta.border.includes('amber') ? '#fbbf24' : meta.border.includes('violet') ? '#a78bfa' : '#818cf8'}
                                                    strokeWidth="1.5"
                                                />
                                                <text
                                                    x={node.x + node.width - 42}
                                                    y={node.y + 2}
                                                    fontSize="9"
                                                    textAnchor="middle"
                                                    fill="#e5e7eb"
                                                    fontFamily="system-ui"
                                                    fontWeight="600"
                                                >
                                                    {meta.emoji} {meta.label}
                                                </text>
                                            </g>
                                        )
                                    })()}
                                </g>
                            )
                        })}
                    </svg>

                    {/* Legend — HTML overlay, toggled by button */}
                    {showLegend && (
                        <div className="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur-sm border border-gray-700/60 rounded-xl px-4 py-3 pointer-events-auto" style={{ zIndex: 10 }}>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Legend</div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-0.5 bg-indigo-400 rounded" />
                                    <span className="text-[10px] text-indigo-300 font-medium">extends</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-0.5 border-t-2 border-dashed border-teal-400 rounded" />
                                    <span className="text-[10px] text-teal-300 font-medium">implements</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-0.5 border-t-2 border-dashed border-amber-400 rounded" />
                                    <span className="text-[10px] text-amber-300 font-medium">active call</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-sm bg-indigo-900 border-2 border-indigo-400" />
                                    <span className="text-[10px] text-gray-300 font-medium">active class</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-green-300 font-mono">+ method()</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-300 font-mono">– field</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Call Flow Log — collapsible bottom strip */}
                <div className="flex-shrink-0 border-t border-dark-border/50 bg-dark-card">
                    <button
                        onClick={() => setLogCollapsed(c => !c)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 border-b border-dark-border/30 hover:bg-dark-border/20 transition-colors cursor-pointer"
                    >
                        <svg className={`w-3 h-3 text-dark-muted transition-transform ${logCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="text-[10px] font-semibold text-dark-muted uppercase tracking-wider">📞 Call Flow Log</span>
                        {callHistory.length > 0 && (
                            <span className="text-[9px] bg-dark-border/40 text-dark-muted px-1.5 py-0.5 rounded-full">{callHistory.length}</span>
                        )}
                    </button>
                    {!logCollapsed && (
                        <div className="px-3 py-1 space-y-0.5 overflow-y-auto" style={{ maxHeight: 130 }}>
                            {callHistory.length === 0 && (
                                <div className="text-[10px] text-dark-muted italic py-1">
                                    Step through the code to see the call flow…
                                </div>
                            )}
                            {[...callHistory].reverse().map((event, idx) => {
                                const meta = CONCEPT_META[event.concept]
                                const isLatest = idx === 0
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: isLatest ? 1 : 0.6, x: 0 }}
                                        className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] sm:text-xs ${isLatest ? meta.bg + ' ' + meta.border + ' border' : ''}`}
                                    >
                                        {/* Step number */}
                                        <span className="text-dark-muted w-8 shrink-0 font-mono">#{event.step}</span>

                                        {/* From class */}
                                        {event.fromClass && event.fromClass !== event.toClass && (
                                            <>
                                                <span className="font-mono text-indigo-400 shrink-0 truncate max-w-[60px] sm:max-w-none">{event.fromClass}</span>
                                                <span className="text-dark-muted shrink-0">→</span>
                                            </>
                                        )}

                                        {/* To class.method */}
                                        <span className={`font-mono font-semibold shrink-0 truncate max-w-[80px] sm:max-w-none ${isLatest ? meta.color : 'text-dark-text'}`}>
                                            {event.toClass}
                                        </span>
                                        <span className="text-dark-muted shrink-0">·</span>
                                        <span className={`font-mono shrink-0 truncate max-w-[80px] sm:max-w-none ${isLatest ? meta.color : 'text-emerald-400/70'}`}>
                                            {event.methodName === '<init>' ? 'constructor' : event.methodName}()
                                        </span>

                                        <div className="flex-1 min-w-[4px]" />

                                        {/* Concept badge */}
                                        <span
                                            className={`shrink-0 px-1.5 py-0.5 rounded-full font-semibold text-[9px] border whitespace-nowrap ${meta.bg} ${meta.border} ${meta.color}`}
                                            title={meta.description}
                                            onMouseEnter={() => setHoveredConcept(event.concept)}
                                            onMouseLeave={() => setHoveredConcept(null)}
                                        >
                                            {meta.emoji} {meta.label}
                                        </span>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Tooltip for concept description */}
            <AnimatePresence>
                {hoveredConcept && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`fixed bottom-16 right-4 z-50 max-w-xs rounded-xl px-4 py-3 shadow-2xl text-sm border ${CONCEPT_META[hoveredConcept].bg} ${CONCEPT_META[hoveredConcept].border}`}
                    >
                        <div className={`font-bold mb-1 ${CONCEPT_META[hoveredConcept].color}`}>
                            {CONCEPT_META[hoveredConcept].emoji} {CONCEPT_META[hoveredConcept].label}
                        </div>
                        <div className="text-dark-muted text-xs leading-relaxed">
                            {CONCEPT_META[hoveredConcept].description}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
