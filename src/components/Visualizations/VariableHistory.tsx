// ============================================
// Variable History Panel - Track Value Changes
// ============================================

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useExecutionStore } from '../../state/executionStore'
import { valueToString, Value } from '../../jvm/types/JVMState'

interface VariableChange {
  step: number
  name: string
  oldValue: Value | null
  newValue: Value
  type: string
  scope: string // method name or 'static'
  line: number
}

export function VariableHistory() {
  const { jvmState, compiledProgram } = useExecutionStore()
  const [history, setHistory] = useState<VariableChange[]>([])
  const [previousState, setPreviousState] = useState<Map<string, Value>>(new Map())
  const [filter, setFilter] = useState<'all' | 'locals' | 'static'>('all')

  // Track variable changes
  useEffect(() => {
    if (!compiledProgram) return

    const currentVars = new Map<string, Value>()
    const newChanges: VariableChange[] = []

    // Collect current local variables from all frames
    jvmState.stack.forEach(frame => {
      frame.localVariables.forEach(local => {
        const key = `${frame.methodName}:${local.name}`
        currentVars.set(key, local.value)

        const oldValue = previousState.get(key)
        if (!oldValue || valueToString(oldValue) !== valueToString(local.value)) {
          newChanges.push({
            step: jvmState.stepNumber,
            name: local.name,
            oldValue: oldValue || null,
            newValue: local.value,
            type: local.type,
            scope: `${frame.className}.${frame.methodName}`,
            line: frame.lineNumber,
          })
        }
      })
    })

    // Collect static fields
    Object.entries(jvmState.methodArea.staticFields).forEach(([className, fields]) => {
      Object.entries(fields).forEach(([fieldName, value]) => {
        const key = `static:${className}.${fieldName}`
        currentVars.set(key, value)

        const oldValue = previousState.get(key)
        if (!oldValue || valueToString(oldValue) !== valueToString(value)) {
          newChanges.push({
            step: jvmState.stepNumber,
            name: fieldName,
            oldValue: oldValue || null,
            newValue: value,
            type: 'static',
            scope: className,
            line: jvmState.pc.currentLine,
          })
        }
      })
    })

    if (newChanges.length > 0) {
      setHistory(prev => [...prev, ...newChanges].slice(-100)) // Keep last 100 changes
    }
    setPreviousState(currentVars)
  }, [jvmState.stepNumber])

  // Reset history when program is reset
  useEffect(() => {
    if (jvmState.stepNumber === 0) {
      setHistory([])
      setPreviousState(new Map())
    }
  }, [jvmState.stepNumber])

  const filteredHistory = history.filter(change => {
    if (filter === 'all') return true
    if (filter === 'locals') return change.type !== 'static'
    if (filter === 'static') return change.type === 'static'
    return true
  })

  return (
    <div className="h-full flex flex-col jvm-panel overflow-hidden">
      <div className="jvm-panel-header text-dark-warning">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Variable History
        <span className="text-dark-muted font-normal ml-2">{history.length} changes</span>
        
        {/* Filter */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded text-xs ${filter === 'all' ? 'bg-dark-warning/30 text-dark-warning' : 'text-dark-muted hover:text-dark-text'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('locals')}
            className={`px-2 py-0.5 rounded text-xs ${filter === 'locals' ? 'bg-dark-warning/30 text-dark-warning' : 'text-dark-muted hover:text-dark-text'}`}
          >
            Locals
          </button>
          <button
            onClick={() => setFilter('static')}
            className={`px-2 py-0.5 rounded text-xs ${filter === 'static' ? 'bg-dark-warning/30 text-dark-warning' : 'text-dark-muted hover:text-dark-text'}`}
          >
            Static
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="popLayout">
          {filteredHistory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-dark-muted text-sm text-center py-8"
            >
              <div className="mb-2">
                <svg className="w-12 h-12 mx-auto text-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              No variable changes recorded yet
            </motion.div>
          ) : (
            <div className="space-y-1">
              {[...filteredHistory].reverse().map((change, index) => (
                <VariableChangeCard key={`${change.step}-${change.name}-${index}`} change={change} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function VariableChangeCard({ change }: { change: VariableChange }) {
  const isNew = change.oldValue === null

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-2 rounded border ${
        isNew 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-dark-bg border-dark-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs px-1.5 py-0.5 bg-dark-border text-dark-muted rounded">
          Step {change.step}
        </span>
        <span className="text-xs text-dark-muted">Line {change.line}</span>
        <span className="text-xs text-dark-muted ml-auto truncate max-w-[150px]" title={change.scope}>
          {change.scope}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="font-medium text-dark-accent">{change.name}</span>
        
        {change.oldValue && (
          <>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 line-through">
              {valueToString(change.oldValue)}
            </span>
            <svg className="w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
        
        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
          isNew ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {valueToString(change.newValue)}
        </span>
        
        {isNew && (
          <span className="text-xs text-green-400 ml-1">NEW</span>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// All Variables Panel - Current State
// ============================================

export function AllVariablesPanel() {
  const { jvmState } = useExecutionStore()
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set(['locals']))

  const toggleScope = (scope: string) => {
    const newExpanded = new Set(expandedScopes)
    if (newExpanded.has(scope)) {
      newExpanded.delete(scope)
    } else {
      newExpanded.add(scope)
    }
    setExpandedScopes(newExpanded)
  }

  // Collect all variables
  const localVariables: Array<{ name: string; value: Value; type: string; frame: string }> = []
  jvmState.stack.forEach(frame => {
    frame.localVariables.forEach(local => {
      localVariables.push({
        name: local.name,
        value: local.value,
        type: local.type,
        frame: `${frame.className}.${frame.methodName}`,
      })
    })
  })

  const staticFields: Array<{ name: string; value: Value; className: string }> = []
  Object.entries(jvmState.methodArea.staticFields).forEach(([className, fields]) => {
    Object.entries(fields).forEach(([fieldName, value]) => {
      staticFields.push({ name: fieldName, value, className })
    })
  })

  return (
    <div className="h-full flex flex-col jvm-panel overflow-hidden">
      <div className="jvm-panel-header text-dark-success">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
        All Variables
        <span className="text-dark-muted font-normal ml-2">
          {localVariables.length + staticFields.length} total
        </span>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {/* Local Variables Section */}
        <div className="rounded-lg border border-dark-border overflow-hidden">
          <div 
            className="p-2 bg-dark-card flex items-center gap-2 cursor-pointer hover:bg-dark-border/50"
            onClick={() => toggleScope('locals')}
          >
            <motion.div animate={{ rotate: expandedScopes.has('locals') ? 90 : 0 }}>
              <svg className="w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
            <span className="font-medium text-sm">Local Variables</span>
            <span className="text-xs text-dark-muted">({localVariables.length})</span>
          </div>
          
          <AnimatePresence>
            {expandedScopes.has('locals') && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-2 space-y-1">
                  {localVariables.length === 0 ? (
                    <div className="text-xs text-dark-muted italic">No local variables</div>
                  ) : (
                    localVariables.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-dark-bg rounded text-sm">
                        <span className="text-xs text-dark-muted truncate max-w-[80px]" title={v.frame}>
                          {v.frame.split('.').pop()}
                        </span>
                        <span className="text-xs px-1 py-0.5 bg-dark-border text-dark-muted rounded">
                          {v.type}
                        </span>
                        <span className="font-medium text-dark-accent">{v.name}</span>
                        <span className="text-dark-muted">=</span>
                        <span className="font-mono text-blue-400 bg-dark-card px-1.5 py-0.5 rounded">
                          {valueToString(v.value)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Static Fields Section */}
        <div className="rounded-lg border border-dark-border overflow-hidden">
          <div 
            className="p-2 bg-dark-card flex items-center gap-2 cursor-pointer hover:bg-dark-border/50"
            onClick={() => toggleScope('static')}
          >
            <motion.div animate={{ rotate: expandedScopes.has('static') ? 90 : 0 }}>
              <svg className="w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
            <span className="font-medium text-sm">Static Fields</span>
            <span className="text-xs text-dark-muted">({staticFields.length})</span>
          </div>
          
          <AnimatePresence>
            {expandedScopes.has('static') && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-2 space-y-1">
                  {staticFields.length === 0 ? (
                    <div className="text-xs text-dark-muted italic">No static fields</div>
                  ) : (
                    staticFields.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-dark-bg rounded text-sm">
                        <span className="text-xs text-jvm-method">{v.className}</span>
                        <span className="font-medium text-dark-accent">{v.name}</span>
                        <span className="text-dark-muted">=</span>
                        <span className="font-mono text-purple-400 bg-dark-card px-1.5 py-0.5 rounded">
                          {valueToString(v.value)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Operand Stack from current frame */}
        {jvmState.stack.length > 0 && (
          <div className="rounded-lg border border-dark-border overflow-hidden">
            <div 
              className="p-2 bg-dark-card flex items-center gap-2 cursor-pointer hover:bg-dark-border/50"
              onClick={() => toggleScope('operand')}
            >
              <motion.div animate={{ rotate: expandedScopes.has('operand') ? 90 : 0 }}>
                <svg className="w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
              <span className="font-medium text-sm">Operand Stack</span>
              <span className="text-xs text-dark-muted">
                ({jvmState.stack[jvmState.stack.length - 1]?.operandStack.length || 0})
              </span>
            </div>
            
            <AnimatePresence>
              {expandedScopes.has('operand') && jvmState.stack.length > 0 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-2">
                    {jvmState.stack[jvmState.stack.length - 1].operandStack.length === 0 ? (
                      <div className="text-xs text-dark-muted italic">Empty stack</div>
                    ) : (
                      <div className="flex flex-col-reverse gap-1">
                        {jvmState.stack[jvmState.stack.length - 1].operandStack.map((v, i, arr) => (
                          <div 
                            key={i} 
                            className={`flex items-center gap-2 p-2 rounded text-sm ${
                              i === arr.length - 1 
                                ? 'bg-jvm-pc/10 border border-jvm-pc/30' 
                                : 'bg-dark-bg'
                            }`}
                          >
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              i === arr.length - 1 
                                ? 'bg-jvm-pc/30 text-jvm-pc' 
                                : 'bg-dark-border text-dark-muted'
                            }`}>
                              {i === arr.length - 1 ? 'TOP' : i}
                            </span>
                            <span className="font-mono text-jvm-pc">
                              {valueToString(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
