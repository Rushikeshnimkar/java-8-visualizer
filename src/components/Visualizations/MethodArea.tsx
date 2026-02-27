// ============================================
// Method Area Visualization
// ============================================

import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'
import { valueToString } from '../../jvm/types/JVMState'

export function MethodArea() {
  const { jvmState } = useExecutionStore()
  const { methodArea } = jvmState
  const classes = Object.values(methodArea.loadedClasses)

  return (
    <div className="h-full flex flex-col jvm-panel overflow-hidden">
      <div className="jvm-panel-header text-jvm-method">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
        Method Area / Metaspace
        <span className="text-dark-muted font-normal ml-auto">{classes.length} classes</span>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="popLayout">
          {classes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-dark-muted text-sm text-center py-4"
            >
              No classes loaded
            </motion.div>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => (
                <motion.div
                  key={cls.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-2 bg-dark-bg rounded-lg border border-dark-border"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      cls.isInterface 
                        ? 'bg-jvm-pc/20 text-jvm-pc' 
                        : 'bg-jvm-method/20 text-jvm-method'
                    }`}>
                      {cls.isInterface ? 'interface' : 'class'}
                    </span>
                    <span className="font-medium text-sm">{cls.name}</span>
                    {cls.superClass && cls.superClass !== 'Object' && (
                      <span className="text-xs text-dark-muted">
                        extends {cls.superClass}
                      </span>
                    )}
                  </div>

                  {/* Static Fields */}
                  {methodArea.staticFields[cls.name] && Object.keys(methodArea.staticFields[cls.name]).length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-dark-muted mb-1">Static Fields</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(methodArea.staticFields[cls.name]).map(([name, value]) => (
                          <div key={name} className="flex items-center gap-1 text-xs">
                            <span className="text-jvm-method">{name}:</span>
                            <span className="jvm-value">{valueToString(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Methods */}
                  {cls.methods.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-dark-muted mb-1">Methods</div>
                      <div className="flex flex-wrap gap-1">
                        {cls.methods.map((method, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 bg-dark-border rounded">
                            {method.name}()
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
