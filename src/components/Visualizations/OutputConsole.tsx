// ============================================
// Output Console
// ============================================

import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'

export function OutputConsole() {
  const { jvmState } = useExecutionStore()
  const { output } = jvmState

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <div className="px-3 py-2 bg-dark-card border-b border-dark-border flex items-center gap-2">
        <svg className="w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-dark-muted">Output Console</span>
        <span className="text-xs text-dark-muted ml-auto">{output.length} lines</span>
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono text-sm">
        <AnimatePresence>
          {output.length === 0 ? (
            <span className="text-dark-muted text-xs">No output yet</span>
          ) : (
            output.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-dark-success whitespace-pre-wrap font-mono"
              >
                <span className="text-dark-muted mr-2 select-none">&gt;</span>
                {line}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
