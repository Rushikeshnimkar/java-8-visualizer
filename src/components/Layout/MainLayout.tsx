// ============================================
// Enhanced Main Layout with Better Visualization
// ============================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CodeInput } from '../CodeEditor/CodeInput'
import { ControlPanel } from '../CodeEditor/ControlPanel'
import { JVMStack } from '../Visualizations/JVMStack'
import { HeapView } from '../Visualizations/HeapView'
import { MethodArea } from '../Visualizations/MethodArea'
import { ProgramCounter } from '../Visualizations/ProgramCounter'
import { OutputConsole } from '../Visualizations/OutputConsole'
import { VariableHistory, AllVariablesPanel } from '../Visualizations/VariableHistory'
import { useExecutionStore } from '../../state/executionStore'

type VisualizationTab = 'stack' | 'heap' | 'variables' | 'history'
type BottomTab = 'output' | 'method-area' | 'pc'

export function MainLayout() {
  const [leftPanelWidth, setLeftPanelWidth] = useState(40)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250)
  const [activeTab, setActiveTab] = useState<VisualizationTab>('stack')
  const [bottomTab, setBottomTab] = useState<BottomTab>('output')
  const { compilationError, jvmState } = useExecutionStore()

  const tabs: { id: VisualizationTab; label: string; icon: JSX.Element; badge?: number }[] = [
    {
      id: 'stack',
      label: 'Stack',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
      badge: jvmState.stack.length,
    },
    {
      id: 'heap',
      label: 'Heap',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      badge: jvmState.heap.length,
    },
    {
      id: 'variables',
      label: 'Variables',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>,
    },
    {
      id: 'history',
      label: 'History',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
  ]

  const bottomTabs: { id: BottomTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'output',
      label: 'Output',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    {
      id: 'method-area',
      label: 'Method Area',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
      id: 'pc',
      label: 'PC Register',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
  ]

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-bg text-dark-text overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-14 bg-dark-card border-b border-dark-border flex items-center px-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-jvm-stack via-jvm-heap to-jvm-method rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">JV</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Java 8 Visualizer</h1>
            <p className="text-xs text-dark-muted">JVM Internals Explorer</p>
          </div>
        </div>
        <div className="flex-1" />
        <ControlPanel />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Code Editor */}
        <motion.div
          className="flex-shrink-0 border-r border-dark-border flex flex-col bg-dark-card"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="flex-1 overflow-hidden">
            <CodeInput />
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {compilationError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-red-900/30 border-t border-red-500/50 text-red-400 text-sm font-mono"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <span>{compilationError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Resize Handle */}
        <div
          className="w-1.5 bg-dark-border hover:bg-dark-accent cursor-col-resize flex-shrink-0 transition-colors relative group"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = leftPanelWidth
            const handleMouseMove = (e: MouseEvent) => {
              const delta = e.clientX - startX
              const newWidth = startWidth + (delta / window.innerWidth) * 100
              setLeftPanelWidth(Math.max(25, Math.min(60, newWidth)))
            }
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 group-hover:bg-dark-accent/20 transition-colors" />
        </div>

        {/* Right Panel - Visualizations */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Visualization Tabs */}
          <div className="flex-shrink-0 bg-dark-card border-b border-dark-border">
            <div className="flex items-center px-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                      ? 'text-dark-accent border-dark-accent bg-dark-accent/5'
                      : 'text-dark-muted border-transparent hover:text-dark-text hover:bg-dark-border/30'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-dark-accent text-white' : 'bg-dark-border text-dark-muted'
                      }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Visualization Area */}
          <div className="flex-1 overflow-hidden p-4">
            <AnimatePresence mode="wait">
              {activeTab === 'stack' && (
                <motion.div
                  key="stack"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full"
                >
                  <JVMStack />
                </motion.div>
              )}
              {activeTab === 'heap' && (
                <motion.div
                  key="heap"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full"
                >
                  <HeapView />
                </motion.div>
              )}
              {activeTab === 'variables' && (
                <motion.div
                  key="variables"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full"
                >
                  <AllVariablesPanel />
                </motion.div>
              )}
              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full"
                >
                  <VariableHistory />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Horizontal Resize Handle */}
          <div
            className="h-1.5 w-full bg-dark-border hover:bg-dark-accent cursor-row-resize flex-shrink-0 transition-colors relative group z-10"
            onMouseDown={(e) => {
              const startY = e.clientY
              const startHeight = bottomPanelHeight
              const handleMouseMove = (e: MouseEvent) => {
                const delta = startY - e.clientY // dragging up increases height of bottom panel
                const newHeight = Math.max(100, Math.min(window.innerHeight - 200, startHeight + delta))
                setBottomPanelHeight(newHeight)
              }
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }
              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 group-hover:bg-dark-accent/20 transition-colors" />
          </div>

          {/* Bottom Panel */}
          <div
            className="flex-shrink-0 flex flex-col bg-dark-card overflow-hidden"
            style={{ height: `${bottomPanelHeight}px` }}
          >
            {/* Bottom Tabs */}
            <div className="flex items-center border-b border-dark-border px-2 flex-shrink-0">
              {bottomTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBottomTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-all border-b-2 ${bottomTab === tab.id
                      ? 'text-dark-accent border-dark-accent'
                      : 'text-dark-muted border-transparent hover:text-dark-text'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}

              {/* Status indicator */}
              <div className="ml-auto flex items-center gap-3 pr-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${jvmState.status === 'running' ? 'bg-green-500 animate-pulse' :
                      jvmState.status === 'paused' ? 'bg-yellow-500' :
                        jvmState.status === 'completed' ? 'bg-blue-500' :
                          jvmState.status === 'error' ? 'bg-red-500' :
                            'bg-gray-500'
                    }`} />
                  <span className="text-xs text-dark-muted capitalize">{jvmState.status}</span>
                </div>
                <span className="text-xs text-dark-muted">Step {jvmState.stepNumber}</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {bottomTab === 'output' && (
                  <motion.div
                    key="output"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <OutputConsole />
                  </motion.div>
                )}
                {bottomTab === 'method-area' && (
                  <motion.div
                    key="method-area"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full p-2"
                  >
                    <MethodArea />
                  </motion.div>
                )}
                {bottomTab === 'pc' && (
                  <motion.div
                    key="pc"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full p-2"
                  >
                    <ProgramCounter />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Enhanced Status Bar */}
      <footer className="flex-shrink-0 h-7 bg-dark-card border-t border-dark-border flex items-center px-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${jvmState.status === 'running' ? 'bg-green-500 animate-pulse' :
                jvmState.status === 'paused' ? 'bg-yellow-500' :
                  jvmState.status === 'completed' ? 'bg-blue-500' :
                    jvmState.status === 'error' ? 'bg-red-500' :
                      'bg-gray-500'
              }`} />
            <span className="text-dark-muted capitalize">{jvmState.status}</span>
          </div>

          <span className="text-dark-border">|</span>

          <span className="text-dark-muted">
            <span className="text-jvm-stack">Stack:</span> {jvmState.stack.length}
          </span>

          <span className="text-dark-muted">
            <span className="text-jvm-heap">Heap:</span> {jvmState.heap.length}
          </span>

          <span className="text-dark-muted">
            <span className="text-jvm-method">Classes:</span> {Object.keys(jvmState.methodArea.loadedClasses).length}
          </span>

          <span className="text-dark-muted">
            <span className="text-jvm-pc">Line:</span> {jvmState.pc.currentLine}
          </span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-dark-muted">
          <span>Java 8 Visualizer v1.0</span>
          <span className="text-dark-border">|</span>
          <span>Step #{jvmState.stepNumber}</span>
        </div>
      </footer>
    </div>
  )
}
