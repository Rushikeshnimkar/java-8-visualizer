// ============================================
// Control Panel - Execution Controls
// ============================================

import { motion } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'
import { SAMPLE_PROGRAMS } from '../../utils/samplePrograms'
import { useState } from 'react'

export function ControlPanel() {
  const {
    compile,
    step,
    stepBack,
    reset,
    run,
    pause,
    isRunning,
    canStepForward,
    canStepBack,
    compiledProgram,
    executionSpeed,
    setExecutionSpeed,
    setSourceCode,
    executionDescription,
  } = useExecutionStore()

  const [showSamples, setShowSamples] = useState(false)

  const buttonClass = "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
  const primaryButton = `${buttonClass} bg-dark-accent hover:bg-dark-accent/80 text-white`
  const secondaryButton = `${buttonClass} bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text`

  return (
    <div className="flex items-center gap-2">
      {executionDescription && (
        <div className="ml-4 px-2 py-1 bg-dark-bg rounded text-xs text-dark-muted max-w-xs truncate">
          {executionDescription}
        </div>
      )}
      {/* Sample Programs Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSamples(!showSamples)}
          className={secondaryButton}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Examples
        </button>

        {showSamples && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-1 left-0 w-64 bg-dark-card border border-dark-border rounded-lg shadow-xl z-50"
          >
            {SAMPLE_PROGRAMS.map((sample, index) => (
              <button
                key={index}
                onClick={() => {
                  setSourceCode(sample.code)
                  setShowSamples(false)
                }}
                className="w-full px-3 py-2 text-left hover:bg-dark-border transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="font-medium text-sm">{sample.name}</div>
                <div className="text-xs text-dark-muted">{sample.description}</div>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      <div className="w-px h-6 bg-dark-border" />

      {/* Compile Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => compile()}
        className={primaryButton}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Compile
      </motion.button>

      <div className="w-px h-6 bg-dark-border" />

      {/* Step Back */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => stepBack()}
        disabled={!compiledProgram || !canStepBack()}
        className={secondaryButton}
        title="Step Back"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        Prev
      </motion.button>

      {/* Step Forward */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => step()}
        disabled={!compiledProgram || !canStepForward()}
        className={secondaryButton}
        title="Step Forward"
      >
        Next
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </motion.button>

      <div className="w-px h-6 bg-dark-border" />

      {/* Run/Pause Button */}
      {isRunning ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => pause()}
          className={`${buttonClass} bg-dark-warning hover:bg-dark-warning/80 text-black`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          Pause
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => run()}
          disabled={!compiledProgram || !canStepForward()}
          className={`${buttonClass} bg-dark-success hover:bg-dark-success/80 text-black disabled:opacity-40`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Run
        </motion.button>
      )}

      {/* Reset Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => reset()}
        disabled={!compiledProgram}
        className={secondaryButton}
        title="Reset"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </motion.button>

      <div className="w-px h-6 bg-dark-border" />

      {/* Speed Control */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-dark-muted">Speed:</span>
        <input
          type="range"
          min="50"
          max="2000"
          step="50"
          value={executionSpeed}
          onChange={(e) => setExecutionSpeed(Number(e.target.value))}
          className="w-20 h-1 bg-dark-border rounded-lg appearance-none cursor-pointer accent-dark-accent"
        />
        <span className="text-dark-muted w-12">{executionSpeed}ms</span>
      </div>

      {/* Status */}

    </div>
  )
}
