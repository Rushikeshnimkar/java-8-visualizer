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

  // Scanner input
  waitingForInput: boolean
  inputPromptMessage: string
  submitInput: (value: string) => void

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
  waitingForInput: false,
  inputPromptMessage: '',

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
        waitingForInput: false,
        inputPromptMessage: '',
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
    const { simulator, waitingForInput } = get()
    if (!simulator || waitingForInput) return null

    const result = simulator.step()

    // Check if simulator needs input after this step
    if (simulator.getNeedsInput()) {
      set({
        jvmState: result.state,
        currentInstruction: result.instruction,
        executionDescription: result.description,
        highlightedLine: result.state.pc.currentLine,
        waitingForInput: true,
        inputPromptMessage: simulator.getInputPrompt(),
      })
      return result
    }

    set({
      jvmState: result.state,
      currentInstruction: result.instruction,
      executionDescription: result.description,
      highlightedLine: result.state.pc.currentLine,
    })
    return result
  },

  submitInput: (value: string) => {
    const { simulator, isRunning } = get()
    if (!simulator) return

    // Feed the input into the simulator's queue
    simulator.submitInput(value)
    set({ waitingForInput: false, inputPromptMessage: '' })

    // If we were in auto-run mode, resume running
    if (isRunning) {
      // Continue the run loop after a short delay
      setTimeout(() => get().run(), 10)
    }
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
      waitingForInput: false,
      inputPromptMessage: '',
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
        waitingForInput: false,
        inputPromptMessage: '',
      })
    } else if (compiledProgram) {
      get().compile()
    }
  },

  run: () => {
    set({ isRunning: true })
    const runStep = () => {
      const { isRunning, simulator, executionSpeed, jvmState, waitingForInput } = get()
      if (!isRunning || !simulator || !simulator.canStepForward()) {
        set({ isRunning: false })
        return
      }

      // If waiting for input, pause the auto-run — it will resume when input is submitted
      if (waitingForInput) {
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

      // Check if we're now waiting for input after the step
      if (get().waitingForInput) {
        return // pause — will resume when submitInput is called
      }

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
    // If Scanner input is needed, the loop pauses and waits for user input
    let lastResult: ExecutionResult | null = null
    let steps = 0
    const MAX_STEPS = 50000

    while (simulator.canStepForward() && steps < MAX_STEPS) {
      lastResult = simulator.step()
      steps++

      // Check if simulator needs input
      if (simulator.getNeedsInput()) {
        // Pause and show the input prompt — update state so UI reflects current progress
        set({
          jvmState: lastResult!.state,
          currentInstruction: lastResult!.instruction,
          executionDescription: 'Waiting for input...',
          highlightedLine: lastResult!.state.pc.currentLine,
          isRunning: true, // mark as running so submitInput will resume
          waitingForInput: true,
          inputPromptMessage: simulator.getInputPrompt(),
        })
        return // Exit the loop — submitInput will call run() to resume
      }
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
