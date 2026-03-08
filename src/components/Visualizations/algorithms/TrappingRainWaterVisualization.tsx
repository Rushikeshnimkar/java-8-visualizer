import React from 'react'
import { motion } from 'framer-motion'
import { AlgorithmVisualizerProps } from './AlgorithmRegistry'

export const TrappingRainWaterVisualization: React.FC<AlgorithmVisualizerProps> = ({ jvmState, onClose }) => {
    // Current frame local variables
    const activeFrame = jvmState.stack[jvmState.stack.length - 1]
    const vars = activeFrame?.localVariables || []

    const getVarNumber = (name: string): number | null => {
        const v = vars.find(v => v.name === name)
        return v?.value?.kind === 'primitive' && typeof v.value.value === 'number' ? v.value.value : null
    }

    const left = getVarNumber('left') ?? 0
    const right = getVarNumber('right') ?? 0
    const leftMax = getVarNumber('leftMax') ?? 0
    const rightMax = getVarNumber('rightMax') ?? 0
    const water = getVarNumber('water') ?? 0

    // Get the array
    const heightVar = vars.find(v => v.name === 'height' || v.name === 'arr')
    let heights: number[] = []
    
    if (heightVar?.value?.kind === 'reference' && heightVar.value.objectId) {
        const obj = jvmState.heap.find(o => o.id === (heightVar.value as any).objectId)
        if (obj?.arrayElements) {
            heights = obj.arrayElements.map(e => e.kind === 'primitive' && typeof e.value === 'number' ? e.value : 0)
        }
    }

    if (heights.length === 0) {
        // Fallback default for demo if not yet initialized
        heights = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
    }

    const maxHeight = Math.max(...heights, 1)

    // Calculate historical water levels up to the current pointers to match original logic
    // We only accurately know the trapped water up to `left` and `right` indices
    const waterLevels = new Array(heights.length).fill(0)
    let tempLeftMax = 0
    let tempRightMax = 0
    
    // Simulate what the algorithm has filled so far based on pointers
    for(let i = 0; i < left; i++) {
        tempLeftMax = Math.max(tempLeftMax, heights[i])
        waterLevels[i] = Math.max(0, tempLeftMax - heights[i])
    }
    for(let j = heights.length - 1; j > right; j--) {
        tempRightMax = Math.max(tempRightMax, heights[j])
        waterLevels[j] = Math.max(0, tempRightMax - heights[j])
    }

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5 w-full mt-4 text-slate-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                        <span className="text-2xl">💧</span> Trapping Rain Water
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Live Memory Visualization</p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        ✕
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Visualization Canvas */}
                <div className="lg:col-span-2 relative bg-slate-800/50 rounded-xl p-4 min-h-[300px] border border-slate-700/30 shadow-inner flex flex-col justify-end pb-10">
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-20 overflow-hidden rounded-xl">
                        {/* Fake Rain Animation overlay */}
                        {Array.from({ length: 20 }).map((_, i) => (
                            <motion.div 
                                key={i}
                                className="absolute w-[2px] h-[15px] bg-gradient-to-b from-transparent to-blue-400"
                                style={{ left: `${Math.random() * 100}%` }}
                                animate={{ y: [0, 300], opacity: [0, 0.6, 0] }}
                                transition={{ repeat: Infinity, duration: 0.5 + Math.random(), delay: Math.random() * 2 }}
                            />
                        ))}
                    </div>

                    <div className="relative z-10 flex items-end justify-center gap-[2px] sm:gap-1 w-full h-full min-h-[220px] px-2 overflow-x-auto jvm-scrollbar">
                        {heights.map((h, i) => {
                            const isLeft = i === left
                            const isRight = i === right
                            const isActive = isLeft || isRight
                            
                            const htPct = (h / maxHeight) * 100
                            const waterHtPct = (waterLevels[i] / maxHeight) * 100

                            return (
                                <div key={i} className="flex flex-col items-center group flex-1 max-w-[48px] min-w-[16px]">
                                    {/* Value floating above */}
                                    <div className="text-[10px] sm:text-xs font-bold text-slate-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {h}
                                    </div>
                                    
                                    {/* The Bar Stack */}
                                    <div className="relative w-full rounded-t-md overflow-hidden bg-slate-700/30 flex items-end justify-center transition-all duration-300"
                                        style={{ height: '200px' }}
                                    >
                                        {/* Physical Bar */}
                                        <motion.div 
                                            className={`absolute bottom-0 w-full rounded-t-md transition-colors z-20 ${isActive ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-600'}`}
                                            animate={{ height: `${htPct}%` }}
                                            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                                        />

                                        {/* Trapped Water overlay (Rendered above bar) */}
                                        <motion.div
                                            className="absolute w-full bg-blue-500/70 z-10 backdrop-blur-[2px]"
                                            animate={{ bottom: `${htPct}%`, height: `${waterHtPct}%` }}
                                            transition={{ type: 'spring', damping: 20 }}
                                        />
                                    </div>

                                    {/* Index */}
                                    <div className="mt-2 text-[10px] text-slate-500 font-mono">
                                        {i}
                                    </div>

                                    {/* Pointers mapping exactly to JVM bounds */}
                                    <div className="h-6 mt-1 flex flex-col items-center justify-start">
                                        {isLeft && <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] animate-pulse">L</span>}
                                        {isRight && <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] animate-pulse">R</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Live Output Stats mapping state */}
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                        <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">Algorithm State</div>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="bg-slate-900 rounded p-2 text-center">
                                <div className="text-[10px] text-slate-500 mb-1">Total Water</div>
                                <div className="text-xl font-black text-blue-400 font-mono">{water}</div>
                            </div>
                            <div className="bg-slate-900 rounded p-2 text-center">
                                <div className="text-[10px] text-slate-500 mb-1">Max Height</div>
                                <div className="text-xl font-black text-slate-300 font-mono">{maxHeight}</div>
                            </div>
                        </div>

                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-1">
                                <span className="text-slate-400">Left Pointer (i)</span>
                                <span className="text-indigo-400 font-mono bg-indigo-500/10 px-2 rounded">{left}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-1">
                                <span className="text-slate-400">Right Pointer (j)</span>
                                <span className="text-emerald-400 font-mono bg-emerald-500/10 px-2 rounded">{right}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-700 pb-1">
                                <span className="text-slate-400">Left Max</span>
                                <span className="text-slate-300 font-mono">{leftMax}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Right Max</span>
                                <span className="text-slate-300 font-mono">{rightMax}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                        <div className="text-xs font-semibold text-indigo-400 mb-1">Formula Tracking</div>
                        <div className="text-xs text-slate-400 leading-relaxed font-mono">
                            water = min(leftMax, rightMax) - height[i]
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
