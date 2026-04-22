import React from 'react'
import { motion } from 'framer-motion'
import { AlgorithmVisualizerProps } from './AlgorithmRegistry'

export const JumpGameVisualization: React.FC<AlgorithmVisualizerProps> = ({ jvmState, onClose }) => {
    // Current frame local variables
    const activeFrame = jvmState.stack[jvmState.stack.length - 1]
    const vars = activeFrame?.localVariables || []

    const getVarNumber = (name: string): number | null => {
        const v = vars.find(v => v.name === name)
        return v?.value?.kind === 'primitive' && typeof v.value.value === 'number' ? v.value.value : null
    }

    // Read key algorithm variables from JVM state
    const currentIndex = getVarNumber('i') ?? getVarNumber('pos') ?? getVarNumber('current') ?? getVarNumber('idx') ?? 0
    const maxReach = getVarNumber('maxReach') ?? getVarNumber('farthest') ?? getVarNumber('reach') ?? getVarNumber('maxPos') ?? getVarNumber('max') ?? 0

    // Get the array
    const numsVar = vars.find(v => v.name === 'nums' || v.name === 'arr' || v.name === 'jumps')
    let nums: number[] = []
    
    if (numsVar?.value?.kind === 'reference' && numsVar.value.objectId) {
        const obj = jvmState.heap.find(o => o.id === (numsVar.value as any).objectId)
        if (obj?.arrayElements) {
            nums = obj.arrayElements.map(e => e.kind === 'primitive' && typeof e.value === 'number' ? e.value : 0)
        }
    }

    if (nums.length === 0) {
        // Fallback default for demo if not yet initialized
        nums = [2, 3, 1, 1, 4]
    }

    const maxVal = Math.max(...nums, 1)
    const canReachEnd = maxReach >= nums.length - 1
    const isStuck = currentIndex > maxReach

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5 w-full mt-4 text-slate-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
                        <span className="text-2xl">🦘</span> Jump Game
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Live Memory Visualization</p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        ✕
                    </button>
                )}
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Position</span>
                    <span className="text-sm font-bold font-mono text-cyan-400">{currentIndex}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Max Reach</span>
                    <span className="text-sm font-bold font-mono text-amber-400">{maxReach}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Target</span>
                    <span className="text-sm font-bold font-mono text-slate-300">{nums.length - 1}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                    isStuck
                        ? 'bg-red-900/30 border-red-500/50 text-red-400'
                        : canReachEnd
                        ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-800/80 border-slate-700/50 text-slate-400'
                }`}>
                    <span className="text-[10px] uppercase tracking-wider">Status</span>
                    <span className="text-sm font-bold">
                        {isStuck ? '✗ Stuck' : canReachEnd ? '✓ Can Reach!' : 'In Progress...'}
                    </span>
                </div>
            </div>

            {/* Max Reach Progress Bar */}
            <div className="mb-5">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Reach Progress</span>
                    <span className="font-mono">{maxReach} / {nums.length - 1}</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                    <motion.div
                        className={`h-full rounded-full ${canReachEnd ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        animate={{ width: `${Math.min((maxReach / Math.max(nums.length - 1, 1)) * 100, 100)}%` }}
                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    />
                </div>
            </div>

            {/* Main Visualization Canvas */}
            <div className="relative bg-slate-800/50 rounded-xl p-4 min-h-[300px] border border-slate-700/30 shadow-inner flex flex-col justify-end pb-10">
                
                {/* Jump arc animations */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                        {/* Draw arc from current position showing jump range */}
                        {nums[currentIndex] > 0 && (
                            <>
                                {Array.from({ length: Math.min(nums[currentIndex], nums.length - 1 - currentIndex) }).map((_, jumpDist) => {
                                    const barWidth = 100 / nums.length
                                    const fromX = (currentIndex + 0.5) * barWidth
                                    const toX = (currentIndex + jumpDist + 1 + 0.5) * barWidth
                                    const midX = (fromX + toX) / 2
                                    const arcHeight = 15 + jumpDist * 8

                                    return (
                                        <motion.path
                                            key={jumpDist}
                                            d={`M ${fromX}% 85% Q ${midX}% ${85 - arcHeight}% ${toX}% 85%`}
                                            fill="none"
                                            stroke={jumpDist + 1 === nums[currentIndex] ? '#22d3ee' : 'rgba(34,211,238,0.2)'}
                                            strokeWidth={jumpDist + 1 === nums[currentIndex] ? 2 : 1}
                                            strokeDasharray={jumpDist + 1 === nums[currentIndex] ? 'none' : '4 4'}
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.4, delay: jumpDist * 0.05 }}
                                        />
                                    )
                                })}
                            </>
                        )}
                    </svg>
                </div>

                <div className="relative z-10 flex items-end justify-center gap-[2px] sm:gap-1 w-full h-full min-h-[220px] px-2 overflow-x-auto jvm-scrollbar">
                    {nums.map((val, i) => {
                        const isCurrent = i === currentIndex
                        const isReachable = i <= maxReach
                        const isMaxReachIdx = i === maxReach && maxReach > 0
                        const htPct = (val / maxVal) * 100
                        
                        // Determine bar color
                        let barColorClass = 'bg-slate-700' // default unreachable
                        if (isCurrent) {
                            barColorClass = 'bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                        } else if (isReachable) {
                            barColorClass = 'bg-emerald-500/70'
                        }

                        return (
                            <div key={i} className="flex flex-col items-center group flex-1 max-w-[56px] min-w-[20px]">
                                {/* Value floating above */}
                                <div className={`text-[11px] sm:text-xs font-bold mb-1 transition-all ${
                                    isCurrent ? 'text-cyan-300 scale-110' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                                }`}>
                                    {val}
                                </div>
                                
                                {/* The Bar */}
                                <div className="relative w-full rounded-t-md overflow-visible bg-slate-700/30 flex items-end justify-center transition-all duration-300"
                                    style={{ height: '200px' }}
                                >
                                    {/* Physical Bar */}
                                    <motion.div 
                                        className={`absolute bottom-0 w-full rounded-t-md transition-colors z-20 ${barColorClass}`}
                                        animate={{ height: `${htPct}%` }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                    />

                                    {/* Max reach marker overlay */}
                                    {isMaxReachIdx && !isCurrent && (
                                        <motion.div
                                            className="absolute top-0 left-0 right-0 bottom-0 border-2 border-amber-400/60 rounded-t-md z-30 pointer-events-none"
                                            animate={{ opacity: [0.4, 1, 0.4] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        />
                                    )}

                                    {/* Reachable overlay glow */}
                                    {isReachable && !isCurrent && (
                                        <div className="absolute bottom-0 w-full h-1 bg-emerald-400/40 z-25 rounded-b-md" />
                                    )}
                                </div>

                                {/* Index */}
                                <div className={`mt-2 text-[10px] font-mono ${isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                                    {i}
                                </div>

                                {/* Pointer labels */}
                                <div className="h-6 mt-1 flex flex-col items-center justify-start gap-0.5">
                                    {isCurrent && (
                                        <motion.span 
                                            className="text-[8px] bg-cyan-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ repeat: Infinity, duration: 1 }}
                                        >
                                            i
                                        </motion.span>
                                    )}
                                    {isMaxReachIdx && (
                                        <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                                            MAX
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                    <span>Current Position (i)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />
                    <span>Reachable</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-slate-700" />
                    <span>Unreachable</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border-2 border-amber-400/60" />
                    <span>Max Reach Boundary</span>
                </div>
            </div>
        </div>
    )
}
