// ============================================
// Program Counter Visualization
// ============================================

import { motion } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'

export function ProgramCounter() {
  const { jvmState, currentInstruction, executionDescription } = useExecutionStore()
  const { pc, status } = jvmState

  const statusColors: Record<string, string> = {
    idle: 'bg-dark-muted',
    running: 'bg-dark-success',
    paused: 'bg-dark-warning',
    completed: 'bg-dark-accent',
    error: 'bg-dark-error',
  }

  return (
    <div className="h-full flex flex-col jvm-panel overflow-hidden">
      <div className="jvm-panel-header text-jvm-pc">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
        PC Register
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-3 h-3 rounded-full ${statusColors[status]}`}
            animate={{ scale: status === 'running' ? [1, 1.2, 1] : 1 }}
            transition={{ repeat: status === 'running' ? Infinity : 0, duration: 1 }}
          />
          <span className="text-sm capitalize">{status}</span>
        </div>

        {/* Current Position */}
        <div className="space-y-2">
          <div className="text-xs text-dark-muted">Current Position</div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-dark-muted text-xs">Class:</span>
              <div className="jvm-value truncate">{pc.currentClass || '-'}</div>
            </div>
            <div>
              <span className="text-dark-muted text-xs">Method:</span>
              <div className="jvm-value truncate">{pc.currentMethod || '-'}</div>
            </div>
            <div>
              <span className="text-dark-muted text-xs">Line:</span>
              <div className="jvm-value">{pc.currentLine || 0}</div>
            </div>
            <div>
              <span className="text-dark-muted text-xs">Instruction:</span>
              <div className="jvm-value">{pc.currentInstruction}</div>
            </div>
          </div>
        </div>

        {/* Current Instruction */}
        {currentInstruction && (
          <div className="space-y-1">
            <div className="text-xs text-dark-muted">Current Opcode</div>
            <motion.div
              key={pc.currentInstruction}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 bg-jvm-pc/10 border border-jvm-pc/30 rounded-lg"
            >
              <div className="font-mono text-sm text-jvm-pc">
                {currentInstruction.opcode}
              </div>
              {currentInstruction.comment && (
                <div className="text-xs text-dark-muted mt-1">
                  {currentInstruction.comment}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Last Action */}
        {executionDescription && (
          <div className="space-y-1">
            <div className="text-xs text-dark-muted">Last Action</div>
            <div className="text-xs text-dark-text bg-dark-bg p-2 rounded">
              {executionDescription}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
