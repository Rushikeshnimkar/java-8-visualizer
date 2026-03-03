// ============================================
// Zustand Store for Execution State
// ============================================

import { create } from 'zustand'
import { JVMState, createInitialJVMState } from '../jvm/types/JVMState'
import { CompiledProgram, Instruction } from '../jvm/types/Bytecode'
import { parse } from '../jvm/parser'
import { compile } from '../jvm/compiler'
import { JVMSimulator, ExecutionResult } from '../jvm/runtime'

export interface ExecutionStore {
  // Source code
  sourceCode: string
  setSourceCode: (code: string) => void

  // Compilation
  compiledProgram: CompiledProgram | null
  compilationError: string | null

  // Execution
  simulator: JVMSimulator | null
  jvmState: JVMState
  currentInstruction: Instruction | null
  executionDescription: string

  // Execution controls
  isRunning: boolean
  executionSpeed: number // ms between steps
  setExecutionSpeed: (speed: number) => void

  // Actions
  compile: () => boolean
  step: () => ExecutionResult | null
  stepBack: () => ExecutionResult | null
  reset: () => void
  run: () => void
  runAll: () => void
  pause: () => void

  // Helpers
  canStepForward: () => boolean
  canStepBack: () => boolean

  // Highlighted line for code editor
  highlightedLine: number
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  // Initial state
  sourceCode: `public class HelloWorld {
    public static void main(String[] args) {
        int a = 5;
        int b = 10;
        int sum = a + b;
        System.out.println(sum);
    }
}`,
  compiledProgram: null,
  compilationError: null,
  simulator: null,
  jvmState: createInitialJVMState(),
  currentInstruction: null,
  executionDescription: '',
  isRunning: false,
  executionSpeed: 500,
  highlightedLine: 0,

  setSourceCode: (code) => {
    set({ sourceCode: code, compilationError: null })
  },

  setExecutionSpeed: (speed) => {
    set({ executionSpeed: speed })
  },

  compile: () => {
    const { sourceCode } = get()
    try {
      const ast = parse(sourceCode)
      const program = compile(ast)
      const simulator = new JVMSimulator(program)
      const state = simulator.getState()

      set({
        compiledProgram: program,
        compilationError: null,
        simulator,
        jvmState: state,
        currentInstruction: null,
        executionDescription: 'Ready to execute',
        highlightedLine: state.pc.currentLine,
      })
      return true
    } catch (error) {
      set({
        compilationError: error instanceof Error ? error.message : 'Compilation failed',
        compiledProgram: null,
        simulator: null,
      })
      return false
    }
  },

  step: () => {
    const { simulator } = get()
    if (!simulator) return null

    const result = simulator.step()
    set({
      jvmState: result.state,
      currentInstruction: result.instruction,
      executionDescription: result.description,
      highlightedLine: result.state.pc.currentLine,
    })
    return result
  },

  stepBack: () => {
    const { simulator } = get()
    if (!simulator) return null

    const result = simulator.stepBack()
    set({
      jvmState: result.state,
      currentInstruction: result.instruction,
      executionDescription: result.description,
      highlightedLine: result.state.pc.currentLine,
    })
    return result
  },

  reset: () => {
    const { simulator, compiledProgram } = get()
    if (simulator) {
      simulator.reset()
      const state = simulator.getState()
      set({
        jvmState: state,
        currentInstruction: null,
        executionDescription: 'Reset to beginning',
        isRunning: false,
        highlightedLine: state.pc.currentLine,
      })
    } else if (compiledProgram) {
      get().compile()
    }
  },

  run: () => {
    set({ isRunning: true })
    const runStep = () => {
      const { isRunning, simulator, executionSpeed, jvmState } = get()
      if (!isRunning || !simulator || !simulator.canStepForward()) {
        set({ isRunning: false })
        return
      }

      // Safety limit to prevent absolute freezes if the compiler bugs out again
      if (jvmState.stepNumber > 50000) {
        set({
          isRunning: false,
          executionDescription: 'Execution paused: Exceeded 50,000 steps (Runaway loop guard)'
        })
        return
      }

      get().step()
      setTimeout(runStep, executionSpeed)
    }
    runStep()
  },

  runAll: () => {
    // Compile first if not already compiled
    const { compiledProgram } = get()
    let compiled = !!compiledProgram
    if (!compiled) {
      compiled = get().compile()
    }
    if (!compiled) return

    const { simulator } = get()
    if (!simulator) return

    // Run all steps synchronously with safety limit
    let lastResult: ExecutionResult | null = null
    let steps = 0
    const MAX_STEPS = 50000

    while (simulator.canStepForward() && steps < MAX_STEPS) {
      lastResult = simulator.step()
      steps++
    }

    if (lastResult) {
      set({
        jvmState: lastResult.state,
        currentInstruction: lastResult.instruction,
        executionDescription: steps >= MAX_STEPS
          ? `Execution stopped: Exceeded ${MAX_STEPS} steps (possible infinite loop)`
          : `Execution complete (${steps} steps)`,
        highlightedLine: lastResult.state.pc.currentLine,
        isRunning: false,
      })
    }
  },

  pause: () => {
    set({ isRunning: false })
  },

  canStepForward: () => {
    const { simulator } = get()
    return simulator?.canStepForward() ?? false
  },

  canStepBack: () => {
    const { simulator } = get()
    return simulator?.canStepBack() ?? false
  },
}))
