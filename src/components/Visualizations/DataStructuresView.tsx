// ============================================
// Data Structures Tab - Dedicated visualization for structures
// ============================================

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'
import { HeapObject, valueToString, ReferenceValue } from '../../jvm/types/JVMState'

export function DataStructuresView() {
    const { jvmState } = useExecutionStore()
    const { heap } = jvmState

    // 1. Find Arrays
    const arrays = useMemo(() => {
        return heap.filter(
            (obj) => obj.type === 'array' && !obj.className.toLowerCase().includes('string') // skip string char[]
        )
    }, [heap])

    // 2. Find Stacks
    const stacks = useMemo(() => {
        return heap.filter(
            (obj) => obj.className === 'java.util.Stack' && obj.arrayElements
        )
    }, [heap]) // java.util.Stack is implemented over arrayElements backing

    // 3. Find Linked Lists (nodes)
    // Group them by connectivity. We look for head nodes (nodes not referenced by 'next' of another node)
    const linkedLists = useMemo(() => {
        const nodes = heap.filter((obj) => {
            const hasNext = obj.fields.some((f) => f.name === 'next')
            const hasData = obj.fields.some((f) => f.name === 'val' || f.name === 'data' || f.name === 'value')
            // Custom LinkedList nodes or java.util.LinkedList$Node
            return hasNext && hasData
        })

        // Find all nodes that are referenced as 'next'
        const nextReferencedIds = new Set<string>()
        nodes.forEach((node) => {
            const nextField = node.fields.find((f) => f.name === 'next')
            if (nextField && nextField.value.kind === 'reference') {
                const refVal = nextField.value as ReferenceValue
                if (refVal.objectId) {
                    nextReferencedIds.add(refVal.objectId)
                }
            }
        })

        // Roots are nodes that are NOT in nextReferencedIds
        const roots = nodes.filter((node) => !nextReferencedIds.has(node.id))

        // For each root, build the chain
        const chains: HeapObject[][] = []

        roots.forEach((root) => {
            const chain: HeapObject[] = []
            let curr: HeapObject | undefined = root
            const visited = new Set<string>()

            while (curr && !visited.has(curr.id)) {
                chain.push(curr)
                visited.add(curr.id)

                const nextField = curr.fields.find((f) => f.name === 'next')
                if (nextField && nextField.value.kind === 'reference') {
                    const refVal = nextField.value as ReferenceValue
                    if (refVal.objectId) {
                        const nextRefId = refVal.objectId
                        curr = nodes.find((n) => n.id === nextRefId)
                    } else {
                        curr = undefined
                    }
                } else {
                    curr = undefined
                }
            }
            chains.push(chain)
        })

        return chains
    }, [heap])

    if (arrays.length === 0 && stacks.length === 0 && linkedLists.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-dark-muted p-8 text-center bg-dark-bg">
                <svg className="w-16 h-16 mb-4 text-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-medium text-dark-text mb-2">No Built Data Structures</h3>
                <p className="text-sm max-w-md">
                    Arrays, Stacks, and Linked Lists will appear here with animated visual representations as they are instantiated and modified during execution.
                </p>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto p-4 space-y-8 bg-dark-bg jvm-scrollbar">

            {/* 1. Stacks */}
            {stacks.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-jvm-stack font-bold flex items-center gap-2 border-b border-jvm-stack/30 pb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        Stacks
                    </h3>
                    <div className="flex flex-wrap gap-8">
                        {stacks.map((stack) => (
                            <StackVisualization key={stack.id} stack={stack} />
                        ))}
                    </div>
                </div>
            )}

            {/* 2. Arrays */}
            {arrays.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-jvm-method font-bold flex items-center gap-2 border-b border-jvm-method/30 pb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Arrays
                    </h3>
                    <div className="flex flex-col gap-6">
                        {arrays.map((arr) => (
                            <ArrayVisualization key={arr.id} array={arr} />
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Linked Lists */}
            {linkedLists.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-jvm-pc font-bold flex items-center gap-2 border-b border-jvm-pc/30 pb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Linked Lists
                    </h3>
                    <div className="flex flex-col gap-8">
                        {linkedLists.map((chain, idx) => (
                            <LinkedListVisualization key={idx} chain={chain} />
                        ))}
                    </div>
                </div>
            )}

        </div>
    )
}

// ==========================================
// Array Visualization
// ==========================================
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
                            <motion.div
                                key={i} // Using index as layout key assuming mutable array cells
                                layout
                                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
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


// ==========================================
// Stack Visualization
// ==========================================
function StackVisualization({ stack }: { stack: HeapObject }) {
    const elements = stack.arrayElements || []

    return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 flex flex-col items-center shadow-sm min-w-[140px]">
            <div className="flex flex-col items-center mb-4">
                <span className="text-xs font-mono font-bold text-jvm-stack mb-1">@{stack.id}</span>
                <span className="text-sm font-semibold text-center">{stack.className}</span>
            </div>

            <div className="relative w-24 border-b-4 border-l-4 border-r-4 border-jvm-stack/50 rounded-b-lg p-2 min-h-[120px] flex flex-col-reverse justify-start">
                <AnimatePresence mode="popLayout">
                    {elements.map((elem, i) => (
                        <motion.div
                            layout
                            key={`${i}-${valueToString(elem)}`} // Combined key limits re-animating identical static elements, but pops unique ones
                            initial={{ opacity: 0, y: -40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -40 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="w-full h-10 bg-dark-bg border-2 border-jvm-stack mb-1 rounded flex items-center justify-center relative shadow-sm"
                            title={`Index ${i}: ${valueToString(elem)}`}
                        >
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                            <span className="text-sm font-mono truncate px-2 font-medium z-10">{valueToString(elem)}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {elements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-dark-muted">
                        Empty
                    </div>
                )}
            </div>

            {elements.length > 0 && (
                <div className="mt-2 text-[10px] text-dark-muted uppercase font-bold tracking-wider">
                    Top: {elements.length - 1}
                </div>
            )}
        </div>
    )
}


// ==========================================
// Linked List Visualization
// ==========================================
function LinkedListVisualization({ chain }: { chain: HeapObject[] }) {
    return (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 overflow-x-auto hide-scrollbar shadow-sm">
            <div className="text-xs text-dark-muted mb-2 font-mono flex items-center gap-2">
                <span className="px-2 py-0.5 bg-jvm-pc/10 text-jvm-pc border border-jvm-pc/30 rounded">HEAD @{chain[0]?.id}</span>
                <span>Nodes: {chain.length}</span>
            </div>

            <div className="flex items-center min-w-max p-4">
                {chain.map((node, i) => {
                    // Extract value field ('val' or 'data' or 'value')
                    const dataField = node.fields.find(f => ['val', 'data', 'value'].includes(f.name))
                    const dataVal = dataField ? valueToString(dataField.value) : '?'
                    const isLast = i === chain.length - 1

                    return (
                        <React.Fragment key={node.id}>
                            {/* Node Box */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.05 }}
                                className="flex items-stretch bg-dark-bg border-2 border-jvm-pc/60 rounded-md shadow-md"
                            >
                                <div className="w-16 h-12 flex flex-col items-center justify-center border-r-[1.5px] border-dashed border-jvm-pc/40 px-2 relative group">
                                    <span className="text-xs text-dark-muted absolute top-0.5 left-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                                        {dataField?.name || 'val'}
                                    </span>
                                    <span className="font-mono text-base font-bold text-dark-text truncate w-full text-center pt-2">
                                        {dataVal}
                                    </span>
                                </div>
                                <div className="w-8 flex items-center justify-center bg-jvm-pc/5 group relative">
                                    <span className="text-[9px] text-jvm-pc/70 absolute bottom-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        next
                                    </span>
                                    <div className="w-2 h-2 rounded-full bg-jvm-pc/80"></div>
                                </div>
                            </motion.div>

                            {/* Arrow */}
                            {!isLast && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: (i * 0.05) + 0.1 }}
                                    className="w-12 h-6 flex items-center px-1"
                                >
                                    <svg className="w-full h-full text-jvm-pc" viewBox="0 0 50 20" preserveAspectRatio="none">
                                        <defs>
                                            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                                <polygon points="0 0, 8 3, 0 6" fill="currentColor" />
                                            </marker>
                                        </defs>
                                        <line x1="0" y1="10" x2="48" y2="10" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" />
                                    </svg>
                                </motion.div>
                            )}

                            {/* Null terminator */}
                            {isLast && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: (i * 0.05) + 0.1 }}
                                    className="w-16 h-6 flex justify-start items-center ml-2"
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
