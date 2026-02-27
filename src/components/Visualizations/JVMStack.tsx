// ============================================
// Enhanced JVM Stack Visualization with History
// ============================================

import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'
import { valueToString, Value, StackFrame } from '../../jvm/types/JVMState'
import { useState } from 'react'

export function JVMStack() {
  const { jvmState } = useExecutionStore()
  const { stack } = jvmState
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set())

  const toggleFrame = (id: string) => {
    const newExpanded = new Set(expandedFrames)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedFrames(newExpanded)
  }

  return (
    <div className="h-full flex flex-col jvm-panel overflow-hidden">
      <div className="jvm-panel-header text-jvm-stack">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h16v4H4v-4z" />
        </svg>
        JVM Stack
        <span className="text-dark-muted font-normal ml-auto">{stack.length} frames</span>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="popLayout">
          {stack.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-dark-muted text-sm text-center py-8"
            >
              <div className="mb-2">
                <svg className="w-12 h-12 mx-auto text-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              No stack frames - execution not started or completed
            </motion.div>
          ) : (
            <div className="space-y-2">
              {[...stack].reverse().map((frame, index) => (
                <StackFrameCard 
                  key={frame.id} 
                  frame={frame} 
                  index={index}
                  isTop={index === 0}
                  isExpanded={expandedFrames.has(frame.id)}
                  onToggle={() => toggleFrame(frame.id)}
                  totalFrames={stack.length}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Stack Legend */}
      <div className="mt-2 pt-2 border-t border-dark-border text-xs text-dark-muted flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-jvm-stack/30 border border-jvm-stack" />
          <span>Current Frame</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-dark-bg border border-dark-border" />
          <span>Previous Frames</span>
        </div>
      </div>
    </div>
  )
}

interface StackFrameCardProps {
  frame: StackFrame
  index: number
  isTop: boolean
  isExpanded: boolean
  onToggle: () => void
  totalFrames: number
}

function StackFrameCard({ frame, index, isTop, isExpanded, onToggle, totalFrames }: StackFrameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`rounded-lg border-2 overflow-hidden ${
        isTop 
          ? 'bg-jvm-stack/10 border-jvm-stack/50 shadow-lg shadow-jvm-stack/20' 
          : 'bg-dark-bg border-dark-border'
      }`}
    >
      {/* Frame Header */}
      <div 
        className={`p-3 cursor-pointer hover:bg-dark-border/30 transition-colors ${isTop ? 'bg-jvm-stack/20' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            className="text-dark-muted"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.div>
          
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            isTop ? 'bg-jvm-stack text-white' : 'bg-dark-border text-dark-muted'
          }`}>
            #{totalFrames - index - 1}
          </span>
          
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm truncate block">
              {frame.className}.<span className={isTop ? 'text-jvm-stack' : 'text-dark-accent'}>{frame.methodName}</span>()
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded ${isTop ? 'bg-jvm-stack/30 text-jvm-stack' : 'bg-dark-border text-dark-muted'}`}>
              Line {frame.lineNumber}
            </span>
            <span className="text-dark-muted">PC: {frame.pc}</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3">
              {/* Local Variables Section */}
              <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-dark-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span className="text-sm font-medium text-dark-text">Local Variables</span>
                  <span className="text-xs text-dark-muted">({frame.localVariables.length} vars)</span>
                </div>
                
                {frame.localVariables.length === 0 ? (
                  <div className="text-xs text-dark-muted italic">No local variables</div>
                ) : (
                  <div className="space-y-1">
                    {frame.localVariables.map((local, i) => (
                      <motion.div
                        key={`${local.name}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-2 p-2 rounded bg-dark-card border border-dark-border hover:border-dark-accent/50 transition-colors"
                      >
                        <span className="text-xs text-dark-muted w-6">#{local.slot}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-dark-border text-dark-muted font-mono">
                          {local.type}
                        </span>
                        <span className="font-medium text-dark-accent text-sm">{local.name}</span>
                        <span className="text-dark-muted">=</span>
                        <ValueDisplay value={local.value} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Operand Stack Section */}
              <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-jvm-pc" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-sm font-medium text-dark-text">Operand Stack</span>
                  <span className="text-xs text-dark-muted">({frame.operandStack.length} values)</span>
                </div>
                
                {frame.operandStack.length === 0 ? (
                  <div className="text-xs text-dark-muted italic">Empty stack</div>
                ) : (
                  <div className="flex flex-col-reverse gap-1">
                    {frame.operandStack.map((value, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-2 p-2 rounded border ${
                          i === frame.operandStack.length - 1 
                            ? 'bg-jvm-pc/10 border-jvm-pc/50' 
                            : 'bg-dark-card border-dark-border'
                        }`}
                      >
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          i === frame.operandStack.length - 1 
                            ? 'bg-jvm-pc/30 text-jvm-pc' 
                            : 'bg-dark-border text-dark-muted'
                        }`}>
                          {i === frame.operandStack.length - 1 ? 'TOP' : i}
                        </span>
                        <ValueDisplay value={value} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Captured Variables (for lambdas) */}
              {frame.capturedVariables && frame.capturedVariables.length > 0 && (
                <div className="bg-dark-bg rounded-lg p-3 border border-jvm-pc/30">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-jvm-pc" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm font-medium text-jvm-pc">Captured Variables (Closure)</span>
                  </div>
                  <div className="space-y-1">
                    {frame.capturedVariables.map((local, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-dark-accent">{local.name}:</span>
                        <ValueDisplay value={local.value} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ValueDisplay({ value }: { value: Value }) {
  const getValueColor = () => {
    switch (value.kind) {
      case 'primitive':
        if (value.type === 'string') return 'text-yellow-400'
        if (value.type === 'boolean') return 'text-purple-400'
        if (value.type === 'char') return 'text-green-400'
        return 'text-blue-400'
      case 'reference':
        return value.objectId ? 'text-jvm-heap' : 'text-dark-muted'
      case 'array':
        return 'text-jvm-method'
      case 'lambda':
        return 'text-jvm-pc'
      default:
        return 'text-dark-text'
    }
  }

  const getIcon = () => {
    switch (value.kind) {
      case 'primitive':
        if (value.type === 'string') return '"'
        if (value.type === 'boolean') return value.value ? '✓' : '✗'
        return '#'
      case 'reference':
        return value.objectId ? '@' : '∅'
      case 'array':
        return '[]'
      case 'lambda':
        return 'λ'
      default:
        return '?'
    }
  }

  return (
    <span className={`font-mono text-sm px-2 py-0.5 rounded bg-dark-bg ${getValueColor()}`}>
      <span className="opacity-50 mr-1">{getIcon()}</span>
      {valueToString(value)}
    </span>
  )
}
