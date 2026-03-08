// ============================================
// Execution Timeline & History Component
// Allows scrubbing through execution history
// ============================================

import { motion } from 'framer-motion'
import { useMemo, useState, useCallback } from 'react'
import { useExecutionStore } from '../../state/executionStore'

export function ExecutionTimeline() {
  const { jvmState, executionHistory, goToStep, isRunning } = useExecutionStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  // Convert execution history to snapshots
  const snapshots = useMemo(() => {
    return executionHistory.map((entry) => ({
      stepNumber: entry.stepNumber,
      timestamp: entry.timestamp,
      instruction: entry.instruction.opcode,
      methodName: entry.methodName,
      className: entry.className,
      changedVariables: entry.changedVariables || [],
      stackDepth: entry.state.stack.length,
      heapSize: entry.state.heap.length
    }))
  }, [executionHistory])

  const currentStep = jvmState.stepNumber
  const totalSteps = snapshots.length

  const handleScrub = useCallback((stepIndex: number) => {
    if (isRunning) return
    goToStep(stepIndex)
  }, [isRunning, goToStep])

  const getInstructionColor = (opcode: string) => {
    if (opcode.includes('LOAD')) return 'text-blue-400 bg-blue-500/20'
    if (opcode.includes('STORE')) return 'text-green-400 bg-green-500/20'
    if (opcode.includes('INVOKE')) return 'text-purple-400 bg-purple-500/20'
    if (opcode.includes('RETURN')) return 'text-red-400 bg-red-500/20'
    if (opcode.includes('IF')) return 'text-yellow-400 bg-yellow-500/20'
    if (opcode.includes('GOTO')) return 'text-orange-400 bg-orange-500/20'
    return 'text-gray-400 bg-gray-500/20'
  }

  return (
    <div className="bg-dark-bg border-t border-dark-border p-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-dark-card rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-dark-text">
            Execution Timeline
          </h3>
          <span className="text-xs text-dark-muted px-2 py-1 bg-dark-card rounded">
            Step {currentStep} / {totalSteps}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-dark-muted">
          <span>Steps: {executionHistory.length}</span>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="relative h-16 bg-dark-card rounded-lg overflow-hidden mb-3">
        {/* Progress bar background */}
        <div className="absolute inset-0 flex items-center px-2">
          <div className="w-full h-2 bg-dark-bg rounded-full" />
        </div>

        {/* Completed steps */}
        <div className="absolute inset-0 flex items-center px-2">
          <div 
            className="h-2 bg-gradient-to-r from-jvm-stack to-jvm-heap rounded-full transition-all duration-200"
            style={{ width: `${totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0}%` }}
          />
        </div>

        {/* Step markers */}
        {snapshots.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-between px-2">
            {snapshots.map((snapshot, idx) => (
              <button
                key={snapshot.stepNumber}
                onClick={() => handleScrub(idx)}
                onMouseEnter={() => setHoveredStep(idx)}
                onMouseLeave={() => setHoveredStep(null)}
                disabled={isRunning}
                className={`relative w-3 h-3 rounded-full border-2 transition-all duration-150 ${
                  idx === currentStep
                    ? 'border-jvm-stack bg-jvm-stack scale-125 shadow-lg shadow-jvm-stack/50'
                    : idx < currentStep
                      ? 'border-jvm-heap bg-jvm-heap hover:scale-110'
                      : 'border-dark-muted bg-dark-bg hover:border-jvm-method'
                } ${isRunning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                style={{
                  marginLeft: idx === 0 ? '0' : undefined,
                  marginRight: idx === snapshots.length - 1 ? '0' : undefined
                }}
              />
            ))}
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredStep !== null && snapshots[hoveredStep] && (
          <div 
            className="absolute top-8 z-10 bg-dark-bg border border-dark-border rounded-lg p-2 shadow-xl min-w-[200px]"
            style={{
              left: `${(hoveredStep / (snapshots.length - 1)) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-xs">
              <div className="font-semibold text-dark-text mb-1">
                Step {snapshots[hoveredStep].stepNumber}
              </div>
              <div className="text-dark-muted mb-1">
                {snapshots[hoveredStep].instruction}
              </div>
              <div className="text-dark-muted text-[10px]">
                {snapshots[hoveredStep].methodName}() in {snapshots[hoveredStep].className}
              </div>
              {snapshots[hoveredStep].changedVariables.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {snapshots[hoveredStep].changedVariables.slice(0, 3).map(varName => (
                    <span key={varName} className="text-[9px] px-1 py-0.5 bg-jvm-method/20 text-jvm-method rounded">
                      {varName}
                    </span>
                  ))}
                  {snapshots[hoveredStep].changedVariables.length > 3 && (
                    <span className="text-[9px] text-dark-muted">
                      +{snapshots[hoveredStep].changedVariables.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          <div className="max-h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {snapshots.map((snapshot, idx) => (
              <div
                key={snapshot.stepNumber}
                onClick={() => handleScrub(idx)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  idx === currentStep
                    ? 'bg-jvm-stack/20 border border-jvm-stack/50'
                    : 'hover:bg-dark-card border border-transparent'
                }`}
              >
                {/* Step indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === currentStep
                    ? 'bg-jvm-stack text-white'
                    : idx < currentStep
                      ? 'bg-jvm-heap text-white'
                      : 'bg-dark-bg text-dark-muted border border-dark-border'
                }`}>
                  {snapshot.stepNumber}
                </div>

                {/* Instruction info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${getInstructionColor(snapshot.instruction)}`}>
                      {snapshot.instruction}
                    </span>
                    <span className="text-xs text-dark-muted truncate">
                      {snapshot.methodName}()
                    </span>
                  </div>
                  <div className="text-xs text-dark-muted mt-0.5">
                    {snapshot.className}
                  </div>
                </div>

                {/* Changed variables */}
                {snapshot.changedVariables.length > 0 && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-jvm-method" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-xs text-jvm-method">
                      {snapshot.changedVariables.length}
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-dark-muted">
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {snapshot.stackDepth}
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {snapshot.heapSize}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={() => handleScrub(0)}
          disabled={isRunning || currentStep === 0}
          className="p-2 hover:bg-dark-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Go to start"
        >
          <svg className="w-4 h-4 text-dark-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 19V5l-9 7 9 7zm9 0V5l-9 7 9 7z"/>
          </svg>
        </button>
        
        <button
          onClick={() => handleScrub(Math.max(0, currentStep - 1))}
          disabled={isRunning || currentStep === 0}
          className="p-2 hover:bg-dark-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous step"
        >
          <svg className="w-4 h-4 text-dark-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 19V5l-9 7 9 7zm11 0V5l-9 7 9 7z"/>
          </svg>
        </button>

        <button
          onClick={() => handleScrub(Math.min(totalSteps - 1, currentStep + 1))}
          disabled={isRunning || currentStep >= totalSteps - 1}
          className="p-2 hover:bg-dark-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next step"
        >
          <svg className="w-4 h-4 text-dark-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 5v14l9-7-9-7zm-11 0v14l9-7-9-7z"/>
          </svg>
        </button>

        <button
          onClick={() => handleScrub(totalSteps - 1)}
          disabled={isRunning || currentStep >= totalSteps - 1}
          className="p-2 hover:bg-dark-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Go to end"
        >
          <svg className="w-4 h-4 text-dark-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 5v14l9-7-9-7zm11 0v14l9-7-9-7z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
