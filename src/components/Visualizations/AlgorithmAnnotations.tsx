// ============================================
// Algorithm Step Annotations Component
// Displays current algorithm phase and educational context
// ============================================

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'
import { detectAlgorithmPhase, getEducationalTip } from '../../jvm/runtime/AlgorithmAnnotations'

export function AlgorithmAnnotations() {
  const { jvmState, currentInstruction, isRunning } = useExecutionStore()
  
  // Detect current algorithm and phase
  const annotation = useMemo(() => {
    if (!jvmState.pc.currentClass || !jvmState.pc.currentMethod) {
      return null
    }
    
    // Gather current variable values
    const variables: Record<string, any> = {}
    const topFrame = jvmState.stack[jvmState.stack.length - 1]
    if (topFrame) {
      topFrame.localVariables.forEach(lv => {
        if (lv.value) {
          variables[lv.name] = lv.value.kind === 'primitive' ? lv.value.value : `@${lv.value.objectId || 'ref'}`
        }
      })
    }
    
    return detectAlgorithmPhase(
      jvmState.pc.currentClass,
      jvmState.pc.currentMethod,
      jvmState.stepNumber,
      variables,
      100 // estimated max steps
    )
  }, [jvmState])
  
  // Get educational tip for current instruction
  const educationalTip = useMemo(() => {
    if (!currentInstruction) return null
    
    const context: any = {}
    const topFrame = jvmState.stack[jvmState.stack.length - 1]
    
    if (currentInstruction.opcode.includes('LOAD_LOCAL') || currentInstruction.opcode.includes('STORE_LOCAL')) {
      const operand = currentInstruction.operands[0]
      context.variableName = operand && 'name' in operand ? operand.name : 'unknown'
    }
    
    if (currentInstruction.opcode.includes('GETFIELD') || currentInstruction.opcode.includes('PUTFIELD')) {
      const operand = currentInstruction.operands[0]
      context.variableName = operand && 'value' in operand ? String(operand.value) : 'field'
      context.objectType = topFrame?.className || 'Object'
    }
    
    if (currentInstruction.opcode.includes('INVOKE')) {
      const operand = currentInstruction.operands[0]
      context.operation = operand && 'value' in operand ? String(operand.value) : 'method'
    }
    
    return getEducationalTip(currentInstruction.opcode, context)
  }, [currentInstruction, jvmState])

  if (!annotation && !educationalTip) {
    return null
  }

  return (
    <div className="bg-dark-bg border-t border-dark-border p-4">
      <AnimatePresence>
        {/* Algorithm Phase Banner */}
        {annotation && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4"
          >
            {/* Header with algorithm name and progress */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-jvm-pc" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-sm font-semibold text-dark-text">
                  {annotation.algorithmName}
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-muted px-2 py-1 bg-dark-card rounded">
                  Phase {annotation.progress.current} / {annotation.progress.total}
                </span>
                <span className="text-xs text-jvm-pc font-mono">
                  {annotation.progress.percentage}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${annotation.progress.percentage}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-jvm-pc to-jvm-stack"
              />
            </div>

            {/* Current phase card */}
            <div className="bg-gradient-to-r from-jvm-pc/10 to-jvm-stack/10 border border-jvm-pc/30 rounded-lg p-4 mb-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-jvm-pc uppercase tracking-wide">
                      Current Phase
                    </span>
                    <span className="text-xs text-dark-muted">•</span>
                    <span className="text-xs text-dark-muted">{annotation.currentPhase.name}</span>
                  </div>
                  
                  <p className="text-sm text-dark-text mb-2">
                    {annotation.currentPhase.description}
                  </p>
                  
                  {annotation.currentPhase.invariant && (
                    <div className="text-xs text-jvm-method bg-dark-card rounded px-2 py-1 inline-block mb-2">
                      <span className="font-semibold">Invariant:</span> {annotation.currentPhase.invariant}
                    </div>
                  )}
                  
                  {annotation.currentPhase.visualCues?.annotation && (
                    <div className="text-sm font-mono text-jvm-stack bg-jvm-stack/10 rounded px-2 py-1 mt-2">
                      💡 {annotation.currentPhase.visualCues.annotation}
                    </div>
                  )}
                </div>
                
                {annotation.currentPhase.complexity && (
                  <div className="text-right">
                    <div className="text-[10px] text-dark-muted uppercase">Complexity</div>
                    <div className="text-sm font-mono text-jvm-heap">{annotation.currentPhase.complexity}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Phase list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {annotation.allPhases.map((phase, idx) => {
                const isCompleted = idx < annotation.progress.current - 1
                const isCurrent = idx === annotation.progress.current - 1
                
                return (
                  <div
                    key={phase.id}
                    className={`p-2 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-jvm-pc/10 border-jvm-pc/50 shadow-md shadow-jvm-pc/20'
                        : isCompleted
                          ? 'bg-jvm-stack/10 border-jvm-stack/30 opacity-60'
                          : 'bg-dark-card border-dark-border opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-jvm-pc text-white'
                          : isCompleted
                            ? 'bg-jvm-stack text-white'
                            : 'bg-dark-muted text-dark-bg'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className={`text-xs font-medium ${
                        isCurrent ? 'text-jvm-pc' : isCompleted ? 'text-jvm-stack' : 'text-dark-muted'
                      }`}>
                        {phase.name}
                      </span>
                    </div>
                    {isCurrent && phase.tips && (
                      <div className="text-[10px] text-dark-muted mt-1 pl-6">
                        {phase.tips[0]}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Educational Tip Toast */}
        {educationalTip && !isRunning && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-jvm-method/10 border border-jvm-method/30 rounded-lg p-3"
          >
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-jvm-method mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-dark-text">
                  {educationalTip}
                </p>
                {currentInstruction && (
                  <p className="text-[10px] text-dark-muted mt-1 font-mono">
                    Current: {currentInstruction.opcode}
                    {currentInstruction.operands.length > 0 && (() => {
                      const operand = currentInstruction.operands[0]
                      const displayValue = 'value' in operand ? String(operand.value) : 
                                          'name' in operand ? operand.name : ''
                      return displayValue ? ` ${displayValue}` : ''
                    })()}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
