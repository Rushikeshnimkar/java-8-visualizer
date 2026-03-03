// ============================================
// Output Console with Inline Scanner Input
// ============================================

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'

export function OutputConsole() {
  const { jvmState, waitingForInput, inputPromptMessage, submitInput } = useExecutionStore()
  const { output } = jvmState
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-focus input when waiting for input
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [waitingForInput])

  // Auto-scroll to bottom when new output arrives or when waiting for input
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [output, waitingForInput])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!waitingForInput) return
    submitInput(inputValue)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <div className="px-3 py-2 bg-dark-card border-b border-dark-border flex items-center gap-2">
        <svg className="w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-dark-muted">Output Console</span>
        {waitingForInput && (
          <span className="text-xs text-dark-warning ml-2 animate-pulse">⏳ Waiting for input...</span>
        )}
        <span className="text-xs text-dark-muted ml-auto">{output.length} lines</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 font-mono text-sm">
        <AnimatePresence>
          {output.length === 0 && !waitingForInput ? (
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

        {/* Inline Scanner Input */}
        {waitingForInput && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2"
          >
            <div className="text-dark-accent text-xs mb-1">{inputPromptMessage}</div>
            <form onSubmit={handleSubmit} className="flex items-center gap-0">
              <span className="text-dark-accent mr-2 select-none font-bold">&lt;</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-b border-dark-accent text-dark-text font-mono text-sm outline-none placeholder-dark-muted caret-dark-accent py-1"
                placeholder="Type your input and press Enter..."
                autoFocus
              />
              <button
                type="submit"
                className="ml-2 px-2 py-1 bg-dark-accent text-white text-xs rounded hover:bg-dark-accent/80 transition-colors"
              >
                ↵
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  )
}
