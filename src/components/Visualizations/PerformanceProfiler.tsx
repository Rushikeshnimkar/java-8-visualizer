// ============================================
// Performance Profiler Component
// Tracks execution performance metrics
// ============================================

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'

interface MethodProfile {
  methodName: string
  className: string
  callCount: number
  totalSteps: number
  avgStepsPerCall: number
  firstCallStep: number
  lastCallStep: number
}

interface InstructionProfile {
  opcode: string
  count: number
  percentage: number
  category: string
}

export function PerformanceProfiler() {
  const { jvmState, executionHistory } = useExecutionStore()
  const [activeTab, setActiveTab] = useState<'methods' | 'instructions' | 'timeline'>('methods')
  const [isExpanded, setIsExpanded] = useState(false)

  // Analyze method profiles
  const methodProfiles: MethodProfile[] = useMemo(() => {
    const methodMap = new Map<string, MethodProfile>()
    
    executionHistory.forEach((entry, idx) => {
      const key = `${entry.className}.${entry.methodName}`
      const existing = methodMap.get(key)
      
      if (existing) {
        existing.callCount++
        existing.totalSteps++
        existing.lastCallStep = idx
      } else {
        methodMap.set(key, {
          methodName: entry.methodName,
          className: entry.className,
          callCount: 1,
          totalSteps: 1,
          avgStepsPerCall: 0,
          firstCallStep: idx,
          lastCallStep: idx,
        })
      }
    })
    
    return Array.from(methodMap.values())
      .map(profile => ({
        ...profile,
        avgStepsPerCall: profile.totalSteps / profile.callCount,
      }))
      .sort((a, b) => b.totalSteps - a.totalSteps)
  }, [executionHistory])

  // Analyze instruction usage
  const instructionProfiles: InstructionProfile[] = useMemo(() => {
    const opcodeMap = new Map<string, number>()
    const totalInstructions = executionHistory.length
    
    executionHistory.forEach(entry => {
      const opcode = entry.instruction.opcode
      opcodeMap.set(opcode, (opcodeMap.get(opcode) || 0) + 1)
    })
    
    const categories: Record<string, string[]> = {
      'Load': ['LOAD_CONST', 'LOAD_LOCAL', 'LOAD_FIELD', 'BIPUSH', 'SIPUSH'],
      'Store': ['STORE_LOCAL', 'STORE_FIELD'],
      'Arithmetic': ['ADD', 'SUB', 'MUL', 'DIV', 'REM'],
      'Logical': ['AND', 'OR', 'XOR', 'NEG'],
      'Control': ['GOTO', 'IF', 'IF_ICMP', 'TABLESWITCH', 'LOOKUPSWITCH'],
      'Method': ['INVOKE_VIRTUAL', 'INVOKE_STATIC', 'INVOKE_SPECIAL', 'RETURN'],
      'Object': ['NEW', 'DUP', 'CHECKCAST'],
      'Array': ['ARRAYLENGTH', 'BALOAD', 'BASTORE', 'AALOAD', 'AASTORE'],
      'Other': [],
    }
    
    const getCategory = (opcode: string): string => {
      for (const [category, opcodes] of Object.entries(categories)) {
        if (opcodes.some(op => opcode.includes(op) || opcode === op)) {
          return category
        }
      }
      return 'Other'
    }
    
    return Array.from(opcodeMap.entries())
      .map(([opcode, count]) => ({
        opcode,
        count,
        percentage: totalInstructions > 0 ? (count / totalInstructions) * 100 : 0,
        category: getCategory(opcode),
      }))
      .sort((a, b) => b.count - a.count)
  }, [executionHistory])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSteps = executionHistory.length
    const uniqueMethods = methodProfiles.length
    const uniqueOpcodes = instructionProfiles.length
    const mostUsedOpcode = instructionProfiles[0]?.opcode || 'N/A'
    const mostCalledMethod = methodProfiles.find(m => m.methodName !== '<clinit>')?.methodName || 'N/A'
    
    return {
      totalSteps,
      uniqueMethods,
      uniqueOpcodes,
      mostUsedOpcode,
      mostCalledMethod,
      stepsPerSecond: totalSteps > 0 ? Math.round(1000 / (jvmState.stepNumber * 50)) : 0,
    }
  }, [executionHistory, methodProfiles, instructionProfiles, jvmState.stepNumber])

  const getOpcodeColor = (category: string) => {
    const colors: Record<string, string> = {
      Load: 'bg-blue-500',
      Store: 'bg-green-500',
      Arithmetic: 'bg-purple-500',
      Logical: 'bg-pink-500',
      Control: 'bg-yellow-500',
      Method: 'bg-red-500',
      Object: 'bg-indigo-500',
      Array: 'bg-orange-500',
      Other: 'bg-gray-500',
    }
    return colors[category] || 'bg-gray-500'
  }

  return (
    <div className="bg-dark-bg border-t border-dark-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-dark-card rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-dark-text">Performance Profiler</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-muted px-2 py-1 bg-dark-card rounded">
            {stats.totalSteps} steps
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Total Steps"
          value={stats.totalSteps.toLocaleString()}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          color="text-jvm-stack"
        />
        
        <StatCard
          label="Methods Called"
          value={stats.uniqueMethods}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          color="text-jvm-heap"
        />
        
        <StatCard
          label="Unique Opcodes"
          value={stats.uniqueOpcodes}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
          color="text-jvm-method"
        />
        
        <StatCard
          label="Most Used Opcode"
          value={stats.mostUsedOpcode}
          subValue={`${instructionProfiles[0]?.percentage.toFixed(1)}%`}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
          color="text-jvm-pc"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 border-b border-dark-border">
        <button
          onClick={() => setActiveTab('methods')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
            activeTab === 'methods'
              ? 'bg-dark-card text-dark-text border-b-2 border-jvm-stack'
              : 'text-dark-muted hover:text-dark-text'
          }`}
        >
          Methods
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
            activeTab === 'instructions'
              ? 'bg-dark-card text-dark-text border-b-2 border-jvm-stack'
              : 'text-dark-muted hover:text-dark-text'
          }`}
        >
          Instructions
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'methods' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar"
          >
            {methodProfiles.length === 0 ? (
              <div className="text-center text-dark-muted py-8 text-sm">
                No methods called yet. Run your program to see profiling data.
              </div>
            ) : (
              methodProfiles.map((profile, idx) => (
                <div
                  key={`${profile.className}.${profile.methodName}`}
                  className="flex items-center gap-3 p-2 bg-dark-card rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-jvm-heap/20 text-jvm-heap flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-dark-text truncate">
                      {profile.methodName}()
                    </div>
                    <div className="text-[10px] text-dark-muted">
                      {profile.className}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-dark-text font-semibold">
                      {profile.callCount} {profile.callCount === 1 ? 'call' : 'calls'}
                    </div>
                    <div className="text-[10px] text-dark-muted">
                      {profile.totalSteps} steps
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'instructions' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar"
          >
            {instructionProfiles.length === 0 ? (
              <div className="text-center text-dark-muted py-8 text-sm">
                No instructions executed yet. Run your program to see profiling data.
              </div>
            ) : (
              instructionProfiles.slice(0, 20).map((profile) => (
                <div
                  key={profile.opcode}
                  className="flex items-center gap-3 p-2 bg-dark-card rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full ${getOpcodeColor(profile.category)}`} />
                  <div className="flex-1">
                    <div className="text-xs font-mono text-dark-text">
                      {profile.opcode}
                    </div>
                    <div className="text-[10px] text-dark-muted">
                      {profile.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-dark-text font-semibold">
                      {profile.count}
                    </div>
                    <div className="text-[10px] text-dark-muted">
                      {profile.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Legend */}
      {instructionProfiles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-border">
          <div className="flex flex-wrap gap-2">
            {Object.entries({
              Load: 'blue',
              Store: 'green',
              Arithmetic: 'purple',
              Control: 'yellow',
              Method: 'red',
              Object: 'indigo',
              Array: 'orange',
            }).map(([category, color]) => {
              const count = instructionProfiles
                .filter(p => p.category === category)
                .reduce((sum, p) => sum + p.count, 0)
              
              if (count === 0) return null
              
              return (
                <div key={category} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
                  <span className="text-[10px] text-dark-muted">{category}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, subValue, icon, color }: StatCardProps) {
  return (
    <div className="bg-dark-card rounded-lg p-3 border border-dark-border">
      <div className="flex items-center gap-2 mb-2">
        <div className={color}>{icon}</div>
        <span className="text-[10px] text-dark-muted uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-lg font-bold text-dark-text">{value}</div>
      {subValue && <div className="text-[10px] text-dark-muted mt-0.5">{subValue}</div>}
    </div>
  )
}
