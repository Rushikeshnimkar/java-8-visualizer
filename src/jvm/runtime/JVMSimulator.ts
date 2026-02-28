// ============================================
// JVM Simulator - Executes bytecode step by step
// ============================================

import {
  JVMState,
  StackFrame,
  HeapObject,
  Value,
  LocalVariable,
  createInitialJVMState,
  createPrimitiveValue,
  createReferenceValue,
  createNullValue,
  valueToString,
  ClassInfo,
  HeapField,
} from '../types/JVMState'
import {
  CompiledProgram,
  Instruction,
  OpCode,
  InstructionOperand,
} from '../types/Bytecode'

export interface ExecutionResult {
  state: JVMState
  instruction: Instruction | null
  description: string
}

export class JVMSimulator {
  private program: CompiledProgram
  private state: JVMState
  private history: JVMState[] = []
  private maxHistory: number = 500
  private nextObjectId: number = 1

  constructor(program: CompiledProgram) {
    this.program = program
    this.state = createInitialJVMState()
    this.initialize()
  }

  private initialize(): void {
    // Load all classes into method area
    for (const cls of this.program.classes) {
      const classInfo: ClassInfo = {
        name: cls.name,
        superClass: cls.superClass,
        interfaces: cls.interfaces,
        fields: cls.fields.map(f => ({
          name: f.name,
          type: f.type,
          accessModifiers: [],
          isStatic: f.isStatic,
          initialValue: f.initialValue ? this.operandToValue(f.initialValue) : undefined,
        })),
        methods: cls.methods.map(m => ({
          name: m.methodName,
          returnType: this.extractReturnType(m.signature),
          parameters: [],
          accessModifiers: [],
          isStatic: m.methodName === 'main' || m.methodName === '<clinit>',
          isAbstract: false,
          isDefault: false,
          isNative: false,
          bytecodeStartIndex: this.program.methodOffsets.get(`${cls.name}.${m.signature}`) || 0,
          bytecodeEndIndex: (this.program.methodOffsets.get(`${cls.name}.${m.signature}`) || 0) + m.instructions.length,
          lineNumberTable: new Map(),
        })),
        isInterface: cls.isInterface,
        isAbstract: false,
        accessModifiers: [],
        loadedAtStep: 0,
      }
      this.state.methodArea.loadedClasses[cls.name] = classInfo

      // Initialize static fields
      this.state.methodArea.staticFields[cls.name] = {}
      for (const field of cls.fields) {
        if (field.isStatic) {
          this.state.methodArea.staticFields[cls.name][field.name] = field.initialValue
            ? this.operandToValue(field.initialValue)
            : this.getDefaultValue(field.type)
        }
      }
    }

    // Create initial stack frame for main method
    if (this.program.mainClass) {
      const mainMethodSignature = `${this.program.mainClass}.main(String[])void`
      const startIndex = this.program.methodOffsets.get(mainMethodSignature) || 0

      // Create args array on heap
      const argsArrayId = this.allocateArray('String', [])

      const mainFrame: StackFrame = {
        id: this.generateFrameId(),
        className: this.program.mainClass,
        methodName: 'main',
        methodSignature: 'main(String[])void',
        localVariables: [{
          name: 'args',
          type: 'String[]',
          value: createReferenceValue(argsArrayId),
          slot: 0,
        }],
        operandStack: [],
        pc: startIndex,
        lineNumber: 1,
        isNative: false,
      }

      // Create main thread with its own stack
      const mainThread: import('../types/JVMState').ThreadState = {
        id: 'thread_main',
        name: 'main',
        stack: [mainFrame],
        status: 'RUNNABLE',
        holdingMonitors: [],
        priority: 5,
        isDaemon: false,
        stepCount: 0,
        interrupted: false,
      }
      this.state.threads = [mainThread]
      this.state.activeThread = 0
      this.state.stack = mainThread.stack // alias for legacy consumers

      this.state.pc = {
        currentInstruction: startIndex,
        currentLine: 1,
        currentMethod: 'main',
        currentClass: this.program.mainClass,
      }
      this.state.status = 'paused'
    }
  }

  // ── Thread scheduling helpers ──────────────────────────────────────────────

  /** Return current active ThreadState */
  private activeThreadState(): import('../types/JVMState').ThreadState | undefined {
    return this.state.threads[this.state.activeThread]
  }

  /** Rotate activeThread to the next RUNNABLE thread (round-robin) */
  private rotateThread(): void {
    const n = this.state.threads.length
    if (n <= 1) return
    const start = this.state.activeThread
    for (let i = 1; i < n; i++) {
      const idx = (start + i) % n
      const t = this.state.threads[idx]
      if (t.status === 'RUNNABLE' || t.status === 'RUNNING') {
        this.state.activeThread = idx
        return
      }
    }
    // If current thread is still runnable, keep it
  }

  /** Wake threads whose sleep timer has expired or whose join target finished */
  private tickThreads(): void {
    for (const t of this.state.threads) {
      if (t.status === 'TIMED_WAITING' && t.sleepUntilStep !== undefined && this.state.stepNumber >= t.sleepUntilStep) {
        t.status = 'RUNNABLE'
        t.sleepUntilStep = undefined
      }
      if (t.status === 'WAITING' && t.waitingOnMonitor) {
        // join() — waiting on another thread id to terminate
        const targetThread = this.state.threads.find(th => th.id === t.waitingOnMonitor)
        if (!targetThread || targetThread.status === 'TERMINATED') {
          t.status = 'RUNNABLE'
          t.waitingOnMonitor = undefined
        }
      }
    }
  }

  private operandToValue(operand: InstructionOperand | { type: string; value: number | string | boolean }): Value {
    switch (operand.type) {
      case 'int':
        return createPrimitiveValue('int', operand.value as number)
      case 'float':
        return createPrimitiveValue('double', operand.value as number)
      case 'string':
        return createPrimitiveValue('string', operand.value as string)
      case 'boolean':
        return createPrimitiveValue('boolean', operand.value as boolean)
      default:
        return createNullValue()
    }
  }

  private getDefaultValue(type: string): Value {
    switch (type) {
      case 'int':
      case 'long':
      case 'short':
      case 'byte':
        return createPrimitiveValue('int', 0)
      case 'float':
      case 'double':
        return createPrimitiveValue('double', 0.0)
      case 'boolean':
        return createPrimitiveValue('boolean', false)
      case 'char':
        return createPrimitiveValue('char', '\0')
      default:
        return createNullValue()
    }
  }

  private extractReturnType(signature: string): string {
    const match = signature.match(/\)(.+)$/)
    return match ? match[1] : 'void'
  }

  private generateFrameId(): string {
    return `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateObjectId(): string {
    return `obj_${this.nextObjectId++}`
  }

  step(): ExecutionResult {
    if (this.state.status === 'completed' || this.state.status === 'error') {
      return { state: this.cloneState(), instruction: null, description: 'Execution finished' }
    }

    // Save state to history
    this.saveHistory()

    // Wake sleeping/joining threads
    this.tickThreads()

    // Find a runnable thread (may skip BLOCKED/WAITING/TIMED_WAITING ones)
    const activeT = this.activeThreadState()
    if (!activeT || (activeT.status !== 'RUNNABLE' && activeT.status !== 'RUNNING')) {
      // Try to find another runnable thread
      this.rotateThread()
      const next = this.activeThreadState()
      if (!next || (next.status !== 'RUNNABLE' && next.status !== 'RUNNING')) {
        // All threads blocked — check if all terminated
        const allDone = this.state.threads.every(t => t.status === 'TERMINATED')
        if (allDone || this.state.threads.length === 0) {
          this.state.status = 'completed'
          return { state: this.cloneState(), instruction: null, description: 'All threads completed' }
        }
        // Deadlock or all waiting — advance step to allow sleep wakeup
        this.state.stepNumber++
        this.tickThreads()
        return { state: this.cloneState(), instruction: null, description: 'Waiting for threads...' }
      }
    }

    const thread = this.activeThreadState()!
    thread.status = 'RUNNING'
    this.state.stack = thread.stack // keep alias in sync

    const frame = thread.stack[thread.stack.length - 1]
    if (!frame) {
      // Thread finished
      thread.status = 'TERMINATED'
      // Release any monitors held by this thread
      for (const monId of thread.holdingMonitors) {
        this.releaseMonitor(monId, thread.id)
      }
      thread.holdingMonitors = []
      this.rotateThread()
      this.state.stack = this.activeThreadState()?.stack ?? []
      this.state.stepNumber++
      this.state.status = this.state.threads.every(t => t.status === 'TERMINATED') ? 'completed' : 'paused'
      return { state: this.cloneState(), instruction: null, description: `Thread '${thread.name}' terminated` }
    }

    const instruction = this.program.allInstructions[frame.pc]
    if (!instruction) {
      thread.status = 'TERMINATED'
      for (const monId of thread.holdingMonitors) {
        this.releaseMonitor(monId, thread.id)
      }
      thread.holdingMonitors = []
      this.rotateThread()
      this.state.stack = this.activeThreadState()?.stack ?? []
      this.state.stepNumber++
      this.state.status = this.state.threads.every(t => t.status === 'TERMINATED') ? 'completed' : 'paused'
      return { state: this.cloneState(), instruction: null, description: `Thread '${thread.name}' finished` }
    }

    this.state.status = 'running'
    const description = this.executeInstruction(instruction, frame)
    this.state.stepNumber++
    thread.stepCount++

    // If frame stack is now empty → thread is done
    if (thread.stack.length === 0) {
      thread.status = 'TERMINATED'
      for (const monId of thread.holdingMonitors) {
        this.releaseMonitor(monId, thread.id)
      }
      thread.holdingMonitors = []
    } else if (thread.status === 'RUNNING') {
      thread.status = 'RUNNABLE'
    }

    // Rotate to next runnable thread
    this.rotateThread()
    this.state.stack = this.activeThreadState()?.stack ?? []

    this.state.status = this.state.threads.every(t => t.status === 'TERMINATED') ? 'completed' : 'paused'

    // Update PC display from active thread's top frame
    const atStack = this.activeThreadState()?.stack
    const activeFrame = atStack && atStack.length > 0 ? atStack[atStack.length - 1] : undefined
    if (activeFrame) {
      this.state.pc = {
        currentInstruction: activeFrame.pc,
        currentLine: activeFrame.lineNumber,
        currentMethod: activeFrame.methodName,
        currentClass: activeFrame.className,
      }
    }

    return { state: this.cloneState(), instruction, description }
  }

  /** Acquire a monitor for a thread. Returns true if acquired, false if blocked. */
  private acquireMonitor(objectId: string, threadId: string): boolean {
    const holder = this.state.monitors[objectId]
    if (holder === undefined || holder === null || holder === threadId) {
      // Free or already held by same thread (reentrant)
      this.state.monitors[objectId] = threadId
      const thread = this.state.threads.find(t => t.id === threadId)
      if (thread && !thread.holdingMonitors.includes(objectId)) {
        thread.holdingMonitors.push(objectId)
      }
      return true
    }
    return false // Someone else holds it → BLOCKED
  }

  /** Release a monitor and wake one BLOCKED thread waiting for it */
  private releaseMonitor(objectId: string, threadId: string): void {
    if (this.state.monitors[objectId] === threadId) {
      this.state.monitors[objectId] = null
      const thread = this.state.threads.find(t => t.id === threadId)
      if (thread) {
        thread.holdingMonitors = thread.holdingMonitors.filter(m => m !== objectId)
      }
      // Wake one BLOCKED thread waiting for this monitor
      const waiter = this.state.threads.find(t => t.status === 'BLOCKED' && t.waitingOnMonitor === objectId)
      if (waiter) {
        waiter.status = 'RUNNABLE'
        waiter.waitingOnMonitor = undefined
      }
    }
  }

  stepBack(): ExecutionResult {
    if (this.history.length === 0) {
      return { state: this.cloneState(), instruction: null, description: 'No previous state' }
    }

    this.state = this.history.pop()!
    return { state: this.cloneState(), instruction: null, description: 'Stepped back' }
  }

  reset(): void {
    this.history = []
    this.state = createInitialJVMState()
    this.nextObjectId = 1
    this.initialize()
  }

  canStepForward(): boolean {
    if (this.state.status === 'completed' || this.state.status === 'error') return false
    return this.state.threads.some(t => t.status !== 'TERMINATED') ||
      this.state.threads.length === 0
  }

  getState(): JVMState {
    return this.cloneState()
  }

  canStepBack(): boolean {
    return this.history.length > 0
  }


  private saveHistory(): void {
    if (this.history.length >= this.maxHistory) {
      this.history.shift()
    }
    this.history.push(this.cloneState())
  }

  private cloneState(): JVMState {
    return JSON.parse(JSON.stringify(this.state))
  }

  private currentFrame(): StackFrame | undefined {
    const t = this.activeThreadState()
    return t?.stack[t.stack.length - 1]
  }

  private executeInstruction(instr: Instruction, frame: StackFrame): string {
    let description = ''

    switch (instr.opcode) {
      case OpCode.NOP:
        description = 'No operation'
        frame.pc++
        break

      case OpCode.LINE:
        frame.lineNumber = (instr.operands[0] as { type: 'int'; value: number }).value
        this.state.pc.currentLine = frame.lineNumber
        description = `Line ${frame.lineNumber}`
        frame.pc++
        break

      case OpCode.LOAD_CONST: {
        const operand = instr.operands[0]
        const value = this.operandToValue(operand)
        frame.operandStack.push(value)
        description = `Push constant ${valueToString(value)}`
        frame.pc++
        break
      }

      case OpCode.PUSH_NULL:
        frame.operandStack.push(createNullValue())
        description = 'Push null'
        frame.pc++
        break

      case OpCode.LOAD_LOCAL: {
        const operand = instr.operands[0] as { type: 'local'; index: number; name: string }
        const localVar = frame.localVariables.find(v => v.slot === operand.index)
        if (localVar) {
          frame.operandStack.push({ ...localVar.value })
          description = `Load local ${operand.name} = ${valueToString(localVar.value)}`
        } else {
          frame.operandStack.push(createNullValue())
          description = `Load local ${operand.name} (not found)`
        }
        frame.pc++
        break
      }

      case OpCode.STORE_LOCAL: {
        const operand = instr.operands[0] as { type: 'local'; index: number; name: string }
        const value = frame.operandStack.pop() || createNullValue()
        let localVar = frame.localVariables.find(v => v.slot === operand.index)
        if (localVar) {
          localVar.value = value
        } else {
          frame.localVariables.push({
            name: operand.name,
            type: 'Object',
            value,
            slot: operand.index,
          })
        }
        description = `Store ${operand.name} = ${valueToString(value)}`
        frame.pc++
        break
      }

      case OpCode.NEW: {
        const className = (instr.operands[0] as { type: 'class'; value: string }).value
        const objectId = this.allocateObject(className)
        frame.operandStack.push(createReferenceValue(objectId))
        description = `New ${className} -> @${objectId}`
        frame.pc++
        break
      }

      case OpCode.NEWARRAY: {
        const elementType = (instr.operands[0] as { type: 'type'; value: string }).value
        const length = frame.operandStack.pop()
        const len = length?.kind === 'primitive' ? (length.value as number) : 0
        const arrayId = this.allocateArray(elementType, new Array(len).fill(this.getDefaultValue(elementType)))
        frame.operandStack.push(createReferenceValue(arrayId))
        description = `New ${elementType}[${len}] -> @${arrayId}`
        frame.pc++
        break
      }

      case OpCode.ARRAYLENGTH: {
        const ref = frame.operandStack.pop()
        if (ref?.kind === 'reference' && ref.objectId) {
          const obj = this.state.heap.find(o => o.id === ref.objectId)
          if (obj && obj.arrayLength !== undefined) {
            frame.operandStack.push(createPrimitiveValue('int', obj.arrayLength))
            description = `Array length = ${obj.arrayLength}`
          } else {
            frame.operandStack.push(createPrimitiveValue('int', 0))
          }
        }
        frame.pc++
        break
      }

      case OpCode.ARRAYLOAD: {
        const index = frame.operandStack.pop()
        const arrayRef = frame.operandStack.pop()
        if (arrayRef?.kind === 'reference' && arrayRef.objectId && index?.kind === 'primitive') {
          const obj = this.state.heap.find(o => o.id === arrayRef.objectId)
          if (obj?.arrayElements) {
            const idx = index.value as number
            const value = obj.arrayElements[idx] || createNullValue()
            frame.operandStack.push(value)
            description = `Load array[${idx}] = ${valueToString(value)}`
          }
        }
        frame.pc++
        break
      }

      case OpCode.ARRAYSTORE: {
        const value = frame.operandStack.pop()
        const index = frame.operandStack.pop()
        const arrayRef = frame.operandStack.pop()
        if (arrayRef?.kind === 'reference' && arrayRef.objectId && index?.kind === 'primitive' && value) {
          const obj = this.state.heap.find(o => o.id === arrayRef.objectId)
          if (obj?.arrayElements) {
            const idx = index.value as number
            obj.arrayElements[idx] = value
            description = `Store array[${idx}] = ${valueToString(value)}`
          }
        }
        frame.pc++
        break
      }

      case OpCode.GETFIELD: {
        const fieldOp = instr.operands[0] as { type: 'field'; value: string; owner: string }
        const objRef = frame.operandStack.pop()
        if (objRef?.kind === 'reference' && objRef.objectId) {
          const obj = this.state.heap.find(o => o.id === objRef.objectId)
          if (obj) {
            // Support .length field on arrays
            if (fieldOp.value === 'length' && obj.type === 'array') {
              frame.operandStack.push(createPrimitiveValue('int', obj.arrayLength ?? obj.arrayElements?.length ?? 0))
              description = `Get array.length = ${obj.arrayLength}`
            } else {
              const field = obj.fields.find(f => f.name === fieldOp.value)
              frame.operandStack.push(field?.value || createNullValue())
              description = `Get field ${fieldOp.value} = ${field ? valueToString(field.value) : 'null'}`
            }
          } else {
            frame.operandStack.push(createNullValue())
          }
        } else {
          frame.operandStack.push(createNullValue())
        }
        frame.pc++
        break
      }

      case OpCode.PUTFIELD: {
        const fieldOp = instr.operands[0] as { type: 'field'; value: string; owner: string }
        const value = frame.operandStack.pop() || createNullValue()
        const objRef = frame.operandStack.pop()
        if (objRef?.kind === 'reference' && objRef.objectId) {
          const obj = this.state.heap.find(o => o.id === objRef.objectId)
          if (obj) {
            const field = obj.fields.find(f => f.name === fieldOp.value)
            if (field) {
              field.value = value
            } else {
              obj.fields.push({ name: fieldOp.value, type: 'Object', value, isStatic: false })
            }
            description = `Set field ${fieldOp.value} = ${valueToString(value)}`
          }
        }
        frame.pc++
        break
      }

      case OpCode.GETSTATIC: {
        const fieldOp = instr.operands[0] as { type: 'field'; value: string; owner: string }
        const className = fieldOp.owner || frame.className
        const staticFields = this.state.methodArea.staticFields[className]
        if (staticFields && staticFields[fieldOp.value]) {
          frame.operandStack.push(staticFields[fieldOp.value])
          description = `Get static ${className}.${fieldOp.value}`
        } else {
          frame.operandStack.push(createNullValue())
        }
        frame.pc++
        break
      }

      case OpCode.PUTSTATIC: {
        const fieldOp = instr.operands[0] as { type: 'field'; value: string; owner: string }
        const value = frame.operandStack.pop() || createNullValue()
        const className = fieldOp.owner || frame.className
        if (!this.state.methodArea.staticFields[className]) {
          this.state.methodArea.staticFields[className] = {}
        }
        this.state.methodArea.staticFields[className][fieldOp.value] = value
        description = `Set static ${className}.${fieldOp.value} = ${valueToString(value)}`
        frame.pc++
        break
      }

      case OpCode.DUP: {
        const top = frame.operandStack[frame.operandStack.length - 1]
        if (top) {
          frame.operandStack.push({ ...top })
        }
        description = 'Duplicate top of stack'
        frame.pc++
        break
      }

      case OpCode.DUP_X1: {
        const value1 = frame.operandStack.pop()
        const value2 = frame.operandStack.pop()
        if (value1 && value2) {
          frame.operandStack.push({ ...value1 })
          frame.operandStack.push(value2)
          frame.operandStack.push(value1)
        }
        description = 'Duplicate top of stack and insert two values down'
        frame.pc++
        break
      }

      case OpCode.POP:
        frame.operandStack.pop()
        description = 'Pop top of stack'
        frame.pc++
        break

      case OpCode.SWAP: {
        const a = frame.operandStack.pop()
        const b = frame.operandStack.pop()
        if (a) frame.operandStack.push(a)
        if (b) frame.operandStack.push(b)
        description = 'Swap top two values'
        frame.pc++
        break
      }

      case OpCode.ADD:
      case OpCode.SUB:
      case OpCode.MUL:
      case OpCode.DIV:
      case OpCode.MOD: {
        const b = frame.operandStack.pop()
        const a = frame.operandStack.pop()
        // String concatenation
        if (instr.opcode === OpCode.ADD && (
          (a?.kind === 'primitive' && a.type === 'string') ||
          (b?.kind === 'primitive' && b.type === 'string')
        )) {
          const aStr = a ? (a.kind === 'primitive' ? String(a.value ?? 'null') : (a.kind === 'reference' ? (a.objectId ? ('ref@' + a.objectId) : 'null') : valueToString(a))) : 'null'
          const bStr = b ? (b.kind === 'primitive' ? String(b.value ?? 'null') : (b.kind === 'reference' ? (b.objectId ? ('ref@' + b.objectId) : 'null') : valueToString(b))) : 'null'
          frame.operandStack.push(createPrimitiveValue('string', aStr + bStr))
          description = `String concat: "${aStr + bStr}"`
          frame.pc++
          break
        }
        if (a?.kind === 'primitive' && b?.kind === 'primitive') {
          const av = a.value as number
          const bv = b.value as number
          let result: number
          switch (instr.opcode) {
            case OpCode.ADD: result = av + bv; break
            case OpCode.SUB: result = av - bv; break
            case OpCode.MUL: result = av * bv; break
            case OpCode.DIV:
              result = bv !== 0 ? av / bv : 0;
              if (a.type === 'int' && b.type === 'int') result = Math.trunc(result);
              break
            case OpCode.MOD: result = bv !== 0 ? av % bv : 0; break
            default: result = 0
          }
          frame.operandStack.push(createPrimitiveValue(a.type, result))
          description = `${av} ${instr.opcode} ${bv} = ${result}`
        } else {
          // Fallback: push null
          frame.operandStack.push(createNullValue())
          description = `${instr.opcode} on incompatible types`
        }
        frame.pc++
        break
      }

      case OpCode.NEG: {
        const a = frame.operandStack.pop()
        if (a?.kind === 'primitive') {
          frame.operandStack.push(createPrimitiveValue(a.type, -(a.value as number)))
          description = `Negate ${a.value}`
        }
        frame.pc++
        break
      }

      case OpCode.CMP_EQ:
      case OpCode.CMP_NE:
      case OpCode.CMP_LT:
      case OpCode.CMP_LE:
      case OpCode.CMP_GT:
      case OpCode.CMP_GE: {
        const b = frame.operandStack.pop()
        const a = frame.operandStack.pop()
        let result = false
        if (a?.kind === 'primitive' && b?.kind === 'primitive') {
          const av = a.value as number
          const bv = b.value as number
          switch (instr.opcode) {
            case OpCode.CMP_EQ: result = av === bv; break
            case OpCode.CMP_NE: result = av !== bv; break
            case OpCode.CMP_LT: result = av < bv; break
            case OpCode.CMP_LE: result = av <= bv; break
            case OpCode.CMP_GT: result = av > bv; break
            case OpCode.CMP_GE: result = av >= bv; break
          }
        } else if (a?.kind === 'reference' && b?.kind === 'reference') {
          switch (instr.opcode) {
            case OpCode.CMP_EQ: result = a.objectId === b.objectId; break
            case OpCode.CMP_NE: result = a.objectId !== b.objectId; break
          }
        }
        frame.operandStack.push(createPrimitiveValue('boolean', result))
        description = `Compare: ${result}`
        frame.pc++
        break
      }

      case OpCode.AND: {
        const b = frame.operandStack.pop()
        const a = frame.operandStack.pop()
        const result = (a?.kind === 'primitive' && a.value) && (b?.kind === 'primitive' && b.value)
        frame.operandStack.push(createPrimitiveValue('boolean', !!result))
        description = `AND: ${!!result}`
        frame.pc++
        break
      }

      case OpCode.OR: {
        const b = frame.operandStack.pop()
        const a = frame.operandStack.pop()
        const result = (a?.kind === 'primitive' && a.value) || (b?.kind === 'primitive' && b.value)
        frame.operandStack.push(createPrimitiveValue('boolean', !!result))
        description = `OR: ${!!result}`
        frame.pc++
        break
      }

      case OpCode.NOT: {
        const a = frame.operandStack.pop()
        const result = !(a?.kind === 'primitive' && a.value)
        frame.operandStack.push(createPrimitiveValue('boolean', result))
        description = `NOT: ${result}`
        frame.pc++
        break
      }

      case OpCode.GOTO: {
        const target = (instr.operands[0] as { type: 'label'; target: number }).target
        frame.pc = target
        description = `Jump to instruction ${target}`
        break
      }

      case OpCode.IF_TRUE: {
        const condition = frame.operandStack.pop()
        const target = (instr.operands[0] as { type: 'label'; target: number }).target
        if (condition?.kind === 'primitive' && condition.value) {
          frame.pc = target
          description = `Condition true, jump to ${target}`
        } else {
          frame.pc++
          description = 'Condition false, continue'
        }
        break
      }

      case OpCode.IF_FALSE: {
        const condition = frame.operandStack.pop()
        const target = (instr.operands[0] as { type: 'label'; target: number }).target
        if (condition?.kind === 'primitive' && !condition.value) {
          frame.pc = target
          description = `Condition false, jump to ${target}`
        } else {
          frame.pc++
          description = 'Condition true, continue'
        }
        break
      }

      case OpCode.INVOKE_VIRTUAL:
      case OpCode.INVOKE_INTERFACE:
      case OpCode.INVOKE_SPECIAL: {
        description = this.invokeMethod(frame, instr, false)
        break
      }

      case OpCode.INVOKE_STATIC: {
        description = this.invokeMethod(frame, instr, true)
        break
      }

      case OpCode.RETURN:
        this.state.stack.pop()
        description = 'Return void'
        break

      case OpCode.RETURN_VALUE: {
        const returnValue = frame.operandStack.pop()
        this.state.stack.pop()
        const caller = this.currentFrame()
        if (caller && returnValue) {
          caller.operandStack.push(returnValue)
        }
        description = `Return ${returnValue ? valueToString(returnValue) : 'void'}`
        break
      }

      case OpCode.PRINT: {
        const isPrintln = (instr.operands[0] as { type: 'boolean'; value: boolean })?.value ?? true
        const value = frame.operandStack.pop()

        // If it's an empty print/println (like System.out.println()), the compiler pushed an empty string.
        let outputStr = value ? valueToString(value).replace(/^"|"$/g, '') : 'null'

        if (this.state.output.length === 0) {
          this.state.output.push('')
        }

        // Append to current line
        this.state.output[this.state.output.length - 1] += outputStr

        if (isPrintln) {
          this.state.output.push('') // Start a new line
        }

        description = `Print: ${outputStr}`
        frame.pc++
        break
      }

      case OpCode.MONITORENTER: {
        // Acquire object monitor for synchronized block
        const lockRef = frame.operandStack.pop()
        const objectId = lockRef?.kind === 'reference' ? lockRef.objectId : null
        const activeT = this.activeThreadState()
        if (objectId && activeT) {
          const acquired = this.acquireMonitor(objectId, activeT.id)
          if (!acquired) {
            // Thread must block — set BLOCKED state, do NOT advance PC so we retry
            activeT.status = 'BLOCKED'
            activeT.waitingOnMonitor = objectId
            // Put the ref back so retry works
            frame.operandStack.push(lockRef!)
            description = `MONITORENTER: Thread '${activeT.name}' BLOCKED waiting for monitor @${objectId}`
            break // don't pc++
          }
          description = `MONITORENTER: Thread '${activeT.name}' acquired monitor @${objectId}`
        }
        frame.pc++
        break
      }

      case OpCode.MONITOREXIT: {
        const lockRef = frame.operandStack.pop()
        const objectId = lockRef?.kind === 'reference' ? lockRef.objectId : null
        const activeT = this.activeThreadState()
        if (objectId && activeT) {
          this.releaseMonitor(objectId, activeT.id)
          description = `MONITOREXIT: Thread '${activeT.name}' released monitor @${objectId}`
        }
        frame.pc++
        break
      }

      case OpCode.LAMBDA_CREATE: {
        const lambdaInfo = (instr.operands[0] as { type: 'string'; value: string }).value
        const lambdaId = this.allocateLambda(lambdaInfo)
        frame.operandStack.push(createReferenceValue(lambdaId))
        description = `Create lambda -> @${lambdaId}`
        frame.pc++
        break
      }

      case OpCode.LAMBDA_INVOKE: {
        description = 'Invoke lambda'
        frame.pc++
        break
      }

      case OpCode.STREAM_SOURCE:
      case OpCode.STREAM_MAP:
      case OpCode.STREAM_FILTER:
      case OpCode.STREAM_COLLECT:
      case OpCode.STREAM_FOREACH: {
        description = `Stream operation: ${instr.opcode}`
        frame.pc++
        break
      }

      case OpCode.INSTANCEOF: {
        const typeOp = instr.operands[0] as { type: 'type'; value: string }
        const ref = frame.operandStack.pop()
        if (ref?.kind === 'reference' && ref.objectId) {
          const obj = this.state.heap.find(o => o.id === ref.objectId)
          const result = obj ? (obj.className === typeOp.value || typeOp.value === 'Object') : false
          frame.operandStack.push(createPrimitiveValue('boolean', result))
        } else {
          frame.operandStack.push(createPrimitiveValue('boolean', false))
        }
        description = `instanceof ${typeOp.value}`
        frame.pc++
        break
      }

      case OpCode.CHECKCAST:
        // No-op for educational purposes – just leave value on stack
        description = `checkcast`
        frame.pc++
        break

      case OpCode.THROW: {
        const exRef = frame.operandStack.pop()
        const exObj = exRef?.kind === 'reference' && exRef.objectId
          ? this.state.heap.find(o => o.id === exRef.objectId)
          : null
        const exType = exObj?.className || 'RuntimeException'
        const msgField = exObj?.fields.find(f => f.name === 'message' || f.name === 'detailMessage')
        const exMsg = msgField?.value.kind === 'primitive' ? String(msgField.value.value) : exType
        this.state.error = `${exType}: ${exMsg}`
        this.state.status = 'error'
        description = `throw ${exType}: ${exMsg}`
        break
      }

      default:
        description = `Unknown opcode: ${instr.opcode}`
        frame.pc++
    }

    return description
  }

  private invokeMethod(frame: StackFrame, instr: Instruction, isStatic: boolean): string {
    const methodOp = instr.operands[0] as { type: 'method'; value: string; descriptor: string }
    const methodName = methodOp.value
    const numArgsMatch = methodOp.descriptor.match(/\((\d+)\)/)
    const numArgs = numArgsMatch ? parseInt(numArgsMatch[1], 10) : 0

    // --- Universal built-ins (before arg popping) ---
    if (methodName === 'toString' && numArgs === 0 && !isStatic) {
      const obj = frame.operandStack.pop()
      frame.operandStack.push(createPrimitiveValue('string', obj ? valueToString(obj) : 'null'))
      frame.pc++; return `toString()`
    }
    if (methodName === 'hashCode' && numArgs === 0 && !isStatic) {
      frame.operandStack.pop()
      frame.operandStack.push(createPrimitiveValue('int', Math.floor(Math.random() * 100000)))
      frame.pc++; return `hashCode()`
    }

    // --- Pop args ---
    const args: Value[] = []
    for (let i = 0; i < numArgs; i++) {
      const val = frame.operandStack.pop()
      args.unshift(val || createNullValue())
    }

    let targetClassName = ''
    let objRef: Value | undefined = undefined

    if (isStatic) {
      const classOp = instr.operands[1] as { type: 'class'; value: string }
      targetClassName = classOp ? classOp.value : frame.className
    } else {
      objRef = frame.operandStack.pop()
      if (objRef?.kind === 'reference') {
        const refObjId = (objRef as import('../types/JVMState').ReferenceValue).objectId
        const obj = this.state.heap.find(o => o.id === refObjId)
        if (obj) targetClassName = obj.className
      }
      if (!targetClassName && objRef?.kind === 'primitive') {
        targetClassName = objRef.type === 'string' ? 'String' : 'Object'
      }
    }

    // --- Try stdlib ---
    const stdlibResult = this.invokeStdlib(frame, methodName, args, isStatic, targetClassName, objRef)
    if (stdlibResult !== null) {
      frame.pc++
      return stdlibResult
    }

    // --- User-defined method ---
    if (!targetClassName) { frame.pc++; return `Null pointer calling ${methodName}()` }

    let targetClass = this.program.classes.find(c => c.name === targetClassName)
    let methodNode = targetClass?.methods.find(m => m.methodName === methodName)

    let currentClassStr = targetClass?.superClass
    while (!methodNode && currentClassStr && currentClassStr !== 'Object') {
      targetClass = this.program.classes.find(c => c.name === currentClassStr)
      if (!targetClass) break
      methodNode = targetClass.methods.find(m => m.methodName === methodName)
      currentClassStr = targetClass.superClass
    }

    if (!methodNode) { frame.pc++; return `Invoke ${methodName}() [stdlib no-op]` }

    frame.pc++
    const signature = methodNode.signature
    const startIndex = this.program.methodOffsets.get(`${targetClass!.name}.${signature}`) || 0
    const newLocalVariables: LocalVariable[] = []
    let localSlotIndex = 0
    if (!isStatic && objRef) {
      newLocalVariables.push({ name: 'this', type: targetClassName, value: objRef, slot: localSlotIndex++ })
    }
    for (let i = 0; i < args.length; i++) {
      const expectedSlot = isStatic ? i : i + 1
      const locVar = methodNode.localVariableTable.find(v => v.index === expectedSlot)
      newLocalVariables.push({ name: locVar?.name || `arg${i}`, type: locVar?.type || 'Object', value: args[i], slot: expectedSlot })
      localSlotIndex = expectedSlot + 1
    }

    const newFrame: StackFrame = {
      id: this.generateFrameId(), className: targetClass!.name, methodName,
      methodSignature: signature, localVariables: newLocalVariables,
      operandStack: [], pc: startIndex, lineNumber: frame.lineNumber, isNative: false,
    }

    // Push frame to the CURRENT THREAD's own stack
    const currentThread = this.activeThreadState()
    if (currentThread) {
      currentThread.stack.push(newFrame)
    } else {
      this.state.stack.push(newFrame)
    }

    return `Invoke ${methodName}(...)`
  }



  // ============================================
  // Standard Library Emulation
  // ============================================

  private valToString(v: Value): string {
    if (v.kind === 'primitive') return v.value === null ? 'null' : String(v.value)
    if (v.kind === 'reference') return v.objectId ? `@${v.objectId}` : 'null'
    return valueToString(v)
  }

  private getHeapObj(v: Value) {
    if (v.kind === 'reference' && v.objectId) return this.state.heap.find(o => o.id === v.objectId)
    return null
  }

  /** Returns null if not a stdlib call (caller will try user-defined). Returns description string if handled. */
  private invokeStdlib(
    frame: StackFrame, methodName: string, args: Value[],
    _isStatic: boolean, className: string, objRef: Value | undefined
  ): string | null {
    // Helper: safely get objectId from a Value
    const getRefId = (v: Value | undefined): string | null => {
      if (!v) return null
      if (v.kind === 'reference') return (v as import('../types/JVMState').ReferenceValue).objectId
      if (v.kind === 'array') return (v as import('../types/JVMState').ArrayValue).objectId
      if (v.kind === 'lambda') return (v as import('../types/JVMState').LambdaValue).objectId
      return null
    }
    // Helper: get heap obj for a Value
    const heapOf = (v: Value | undefined) => { const id = getRefId(v); return id ? this.state.heap.find(o => o.id === id) : null }

    const obj = objRef ? this.getHeapObj(objRef) : null

    // ---- java.util.Arrays ----
    if (className === 'java/util/Arrays' || className === 'Arrays') {
      if (methodName === 'toString' && args.length === 1 && args[0].kind === 'reference') {
        const arrRef = args[0] as import('../types/JVMState').ReferenceValue
        const arrObj = this.getHeapObj(arrRef)
        let str = 'null'
        if (arrObj && arrObj.className.startsWith('[')) {
          str = '[' + (arrObj.arrayElements || []).map(e => this.valToString(e)).join(', ') + ']'
        }
        frame.operandStack.push(createPrimitiveValue('string', str))
        return `Arrays.toString(...)`
      }
    }

    // ---- String (primitive or heap) ----
    const strVal = objRef?.kind === 'primitive' && objRef.type === 'string' ? String(objRef.value ?? '') : null

    if (className === 'String' || strVal !== null) {
      const s = strVal ?? (obj?.stringValue ?? (obj?.fields.find(f => f.name === '$value')?.value.kind === 'primitive' ? String((obj!.fields.find(f => f.name === '$value')!.value as import('../types/JVMState').PrimitiveValue).value) : ''))
      const prim = (i: number) => args[i]?.kind === 'primitive' ? args[i] : null
      const num = (i: number) => prim(i) ? (prim(i)!.value as number) : 0
      const str = (i: number) => prim(i) ? String(prim(i)!.value) : ''
      switch (methodName) {
        case 'length': frame.operandStack.push(createPrimitiveValue('int', s.length)); return `String.length = ${s.length}`
        case 'charAt': frame.operandStack.push(createPrimitiveValue('char', s.charAt(num(0)))); return `String.charAt(${num(0)})`
        case 'codePointAt': frame.operandStack.push(createPrimitiveValue('int', s.codePointAt(num(0)) ?? 0)); return `String.codePointAt`
        case 'substring': { const a = num(0); const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : s.length; frame.operandStack.push(createPrimitiveValue('string', s.substring(a, b))); return `String.substring(${a},${b})` }
        case 'indexOf': { const q = str(0); const from = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('int', from ? s.indexOf(q, from) : s.indexOf(q))); return `String.indexOf` }
        case 'lastIndexOf': { const q = str(0); const from = args[1]?.kind === 'primitive' ? (args[1].value as number) : undefined; frame.operandStack.push(createPrimitiveValue('int', from !== undefined ? s.lastIndexOf(q, from) : s.lastIndexOf(q))); return `String.lastIndexOf` }
        case 'contains': frame.operandStack.push(createPrimitiveValue('boolean', s.includes(str(0)))); return `String.contains`
        case 'startsWith': { const prefix = str(0); const off = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('boolean', s.startsWith(prefix, off))); return `String.startsWith` }
        case 'endsWith': frame.operandStack.push(createPrimitiveValue('boolean', s.endsWith(str(0)))); return `String.endsWith`
        case 'toLowerCase': frame.operandStack.push(createPrimitiveValue('string', s.toLowerCase())); return `String.toLowerCase`
        case 'toUpperCase': frame.operandStack.push(createPrimitiveValue('string', s.toUpperCase())); return `String.toUpperCase`
        case 'trim': frame.operandStack.push(createPrimitiveValue('string', s.trim())); return `String.trim`
        case 'strip': frame.operandStack.push(createPrimitiveValue('string', s.trim())); return `String.strip`
        case 'stripLeading': frame.operandStack.push(createPrimitiveValue('string', s.replace(/^\s+/, ''))); return `String.stripLeading`
        case 'stripTrailing': frame.operandStack.push(createPrimitiveValue('string', s.replace(/\s+$/, ''))); return `String.stripTrailing`
        case 'isBlank': frame.operandStack.push(createPrimitiveValue('boolean', s.trim().length === 0)); return `String.isBlank`
        case 'isEmpty': frame.operandStack.push(createPrimitiveValue('boolean', s.length === 0)); return `String.isEmpty`
        case 'repeat': { const n = num(0); frame.operandStack.push(createPrimitiveValue('string', n > 0 ? s.repeat(n) : '')); return `String.repeat(${n})` }
        case 'concat': frame.operandStack.push(createPrimitiveValue('string', s + str(0))); return `String.concat`
        case 'replace': {
          const from = str(0); const to = str(1)
          frame.operandStack.push(createPrimitiveValue('string', s.split(from).join(to))); return `String.replace`
        }
        case 'replaceAll': { try { frame.operandStack.push(createPrimitiveValue('string', s.replace(new RegExp(str(0), 'g'), str(1)))) } catch { frame.operandStack.push(createPrimitiveValue('string', s)) } return `String.replaceAll` }
        case 'replaceFirst': { try { frame.operandStack.push(createPrimitiveValue('string', s.replace(new RegExp(str(0)), str(1)))) } catch { frame.operandStack.push(createPrimitiveValue('string', s)) } return `String.replaceFirst` }
        case 'matches': { let m = false; try { m = new RegExp('^' + str(0) + '$').test(s) } catch { m = false } frame.operandStack.push(createPrimitiveValue('boolean', m)); return `String.matches` }
        case 'equals': frame.operandStack.push(createPrimitiveValue('boolean', s === str(0))); return `String.equals`
        case 'equalsIgnoreCase': frame.operandStack.push(createPrimitiveValue('boolean', s.toLowerCase() === str(0).toLowerCase())); return `String.equalsIgnoreCase`
        case 'compareTo': frame.operandStack.push(createPrimitiveValue('int', s < str(0) ? -1 : s > str(0) ? 1 : 0)); return `String.compareTo`
        case 'compareToIgnoreCase': { const a2 = s.toLowerCase(), b2 = str(0).toLowerCase(); frame.operandStack.push(createPrimitiveValue('int', a2 < b2 ? -1 : a2 > b2 ? 1 : 0)); return `String.compareToIgnoreCase` }
        case 'hashCode': { let h = 0; for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0 } frame.operandStack.push(createPrimitiveValue('int', h)); return `String.hashCode` }
        case 'toString': case 'intern': frame.operandStack.push(createPrimitiveValue('string', s)); return `String.${methodName}`
        case 'toCharArray': {
          const chars = s.split('').map(c => createPrimitiveValue('char', c) as Value)
          const arrId = this.allocateArray('char', chars)
          frame.operandStack.push(createReferenceValue(arrId)); return `String.toCharArray [len=${s.length}]`
        }
        case 'split': {
          const delim = str(0)
          let parts: Value[]
          try { parts = s.split(new RegExp(delim)).map(p => createPrimitiveValue('string', p) as Value) }
          catch { parts = s.split(delim).map(p => createPrimitiveValue('string', p) as Value) }
          if (args[1]?.kind === 'primitive') { const lim = args[1].value as number; parts = parts.slice(0, lim) }
          const arrId = this.allocateArray('String', parts)
          frame.operandStack.push(createReferenceValue(arrId)); return `String.split`
        }
        case 'valueOf': { const v = args[0]; frame.operandStack.push(createPrimitiveValue('string', v?.kind === 'primitive' ? String(v.value) : 'null')); return `String.valueOf` }
        case 'format': {
          let fmt = str(0)
          let ai = 1
          fmt = fmt.replace(/%[diouxX]/g, () => { const a = args[ai++]; return a?.kind === 'primitive' ? String(Math.trunc(a.value as number)) : '?' })
          fmt = fmt.replace(/%[eEfgG]/g, () => { const a = args[ai++]; return a?.kind === 'primitive' ? Number(a.value).toFixed(2) : '?' })
          fmt = fmt.replace(/%s/g, () => { const a = args[ai++]; return a?.kind === 'primitive' ? String(a.value) : 'null' })
          fmt = fmt.replace(/%c/g, () => { const a = args[ai++]; return a?.kind === 'primitive' ? String(a.value) : '?' })
          fmt = fmt.replace(/%b/g, () => { const a = args[ai++]; return a?.kind === 'primitive' ? (a.value ? 'true' : 'false') : 'false' })
          fmt = fmt.replace(/%n/g, '\n')
          frame.operandStack.push(createPrimitiveValue('string', fmt)); return `String.format`
        }
        case 'join': {
          const delim = str(0)
          const arrObj = heapOf(args[1])
          const parts2 = arrObj?.arrayElements?.map(e => e.kind === 'primitive' ? String(e.value) : '') ?? []
          frame.operandStack.push(createPrimitiveValue('string', parts2.join(delim))); return `String.join`
        }
        case 'copyValueOf': {
          const arrObj = heapOf(args[0])
          const chars2 = arrObj?.arrayElements?.map(e => e.kind === 'primitive' ? String(e.value) : '').join('') ?? ''
          frame.operandStack.push(createPrimitiveValue('string', chars2)); return `String.copyValueOf`
        }
        case 'getBytes': { const arrId = this.allocateArray('byte', s.split('').map(c => createPrimitiveValue('int', c.charCodeAt(0)) as Value)); frame.operandStack.push(createReferenceValue(arrId)); return `String.getBytes` }
      }
    }

    // ---- Character ----
    if (className === 'Character') {
      const c = args[0]?.kind === 'primitive' ? String(args[0].value) : ''
      switch (methodName) {
        case 'isLetter': frame.operandStack.push(createPrimitiveValue('boolean', /[a-zA-Z]/.test(c))); return `Character.isLetter`
        case 'isDigit': frame.operandStack.push(createPrimitiveValue('boolean', /[0-9]/.test(c))); return `Character.isDigit`
        case 'isWhitespace': case 'isSpaceChar': frame.operandStack.push(createPrimitiveValue('boolean', /\s/.test(c))); return `Character.isWhitespace`
        case 'isUpperCase': frame.operandStack.push(createPrimitiveValue('boolean', c === c.toUpperCase() && c !== c.toLowerCase())); return `Character.isUpperCase`
        case 'isLowerCase': frame.operandStack.push(createPrimitiveValue('boolean', c === c.toLowerCase() && c !== c.toUpperCase())); return `Character.isLowerCase`
        case 'isLetterOrDigit': case 'isAlphabetic': frame.operandStack.push(createPrimitiveValue('boolean', /[a-zA-Z0-9]/.test(c))); return `Character.isLetterOrDigit`
        case 'toLowerCase': frame.operandStack.push(createPrimitiveValue('char', c.toLowerCase())); return `Character.toLowerCase`
        case 'toUpperCase': frame.operandStack.push(createPrimitiveValue('char', c.toUpperCase())); return `Character.toUpperCase`
        case 'toString': frame.operandStack.push(createPrimitiveValue('string', c)); return `Character.toString`
        case 'getNumericValue': frame.operandStack.push(createPrimitiveValue('int', parseInt(c) || -1)); return `Character.getNumericValue`
      }
    }

    // ---- Integer / Long / Double / Float ----
    if (className === 'Integer' || className === 'Long' || className === 'Double' || className === 'Float' || className === 'Number') {
      switch (methodName) {
        case 'parseInt': case 'parseLong': { const s = args[0]?.kind === 'primitive' ? String(args[0].value) : '0'; frame.operandStack.push(createPrimitiveValue('int', parseInt(s) || 0)); return `${className}.${methodName}` }
        case 'parseDouble': case 'parseFloat': { const s = args[0]?.kind === 'primitive' ? String(args[0].value) : '0'; frame.operandStack.push(createPrimitiveValue('double', parseFloat(s) || 0)); return `${className}.${methodName}` }
        case 'valueOf': { frame.operandStack.push(args[0] || createNullValue()); return `${className}.valueOf` }
        case 'toString': { const v = args[0]?.kind === 'primitive' ? String(args[0].value) : '0'; frame.operandStack.push(createPrimitiveValue('string', v)); return `${className}.toString` }
        case 'intValue': case 'longValue': { if (obj) { const v = obj.fields.find(f => f.name === '$value'); frame.operandStack.push(v?.value || args[0] || createPrimitiveValue('int', 0)) } else { frame.operandStack.push(args[0] || createPrimitiveValue('int', 0)) } return `${className}.intValue` }
        case 'compareTo': { const a = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('int', a < b ? -1 : a > b ? 1 : 0)); return `${className}.compareTo` }
        case 'max': { const a = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('int', Math.max(a, b))); return `Integer.max` }
        case 'min': { const a = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('int', Math.min(a, b))); return `Integer.min` }
      }
    }

    // ---- Math ----
    if (className === 'Math') {
      switch (methodName) {
        case 'abs': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.abs(v))); return `Math.abs` }
        case 'max': { const a = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.max(a, b))); return `Math.max` }
        case 'min': { const a = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.min(a, b))); return `Math.min` }
        case 'sqrt': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.sqrt(v))); return `Math.sqrt` }
        case 'pow': { const a = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.pow(a, b))); return `Math.pow` }
        case 'floor': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.floor(v))); return `Math.floor` }
        case 'ceil': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.ceil(v))); return `Math.ceil` }
        case 'round': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('long', Math.round(v))); return `Math.round` }
        case 'random': frame.operandStack.push(createPrimitiveValue('double', Math.random())); return `Math.random`
        case 'log': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.log(v))); return `Math.log` }
        case 'sin': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.sin(v))); return `Math.sin` }
        case 'cos': { const v = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('double', Math.cos(v))); return `Math.cos` }
        case 'PI': frame.operandStack.push(createPrimitiveValue('double', Math.PI)); return `Math.PI`
      }
    }

    // ---- HashMap / LinkedHashMap / TreeMap / Hashtable ----
    const isMap = obj && (obj.className === 'HashMap' || obj.className === 'LinkedHashMap' || obj.className === 'TreeMap' || obj.className === 'Hashtable' || obj.className === 'Map' || obj.className.includes('Map'))
    if (isMap) {
      switch (methodName) {
        case '<init>': obj!.arrayElements = obj!.type === 'array' ? [] : obj!.arrayElements; return `${obj!.className}.<init>`
        case 'put': {
          const key = this.valToString(args[0]); const val = args[1]
          const existing = obj!.fields.find(f => f.name === key)
          const oldVal = existing ? { ...existing.value } : null
          if (existing) existing.value = val; else obj!.fields.push({ name: key, type: 'Object', value: val, isStatic: false })
          frame.operandStack.push(oldVal || createNullValue()); return `HashMap.put(${key})`
        }
        case 'get': {
          const key = this.valToString(args[0])
          const field = obj!.fields.find(f => f.name === key)
          frame.operandStack.push(field ? { ...field.value } : createNullValue()); return `HashMap.get(${key}) = ${field ? this.valToString(field.value) : 'null'}`
        }
        case 'containsKey': { const key = this.valToString(args[0]); frame.operandStack.push(createPrimitiveValue('boolean', obj!.fields.some(f => f.name === key))); return `HashMap.containsKey` }
        case 'containsValue': { const val = this.valToString(args[0]); frame.operandStack.push(createPrimitiveValue('boolean', obj!.fields.some(f => this.valToString(f.value) === val))); return `HashMap.containsValue` }
        case 'size': frame.operandStack.push(createPrimitiveValue('int', obj!.fields.length)); return `HashMap.size = ${obj!.fields.length}`
        case 'isEmpty': frame.operandStack.push(createPrimitiveValue('boolean', obj!.fields.length === 0)); return `HashMap.isEmpty`
        case 'remove': { const key = this.valToString(args[0]); const idx = obj!.fields.findIndex(f => f.name === key); if (idx >= 0) { const removed = obj!.fields.splice(idx, 1)[0]; frame.operandStack.push({ ...removed.value }) } else { frame.operandStack.push(createNullValue()) } return `HashMap.remove(${key})` }
        case 'clear': obj!.fields = []; frame.operandStack.push(createNullValue()); return `HashMap.clear`
        case 'getOrDefault': { const key = this.valToString(args[0]); const field = obj!.fields.find(f => f.name === key); frame.operandStack.push(field ? { ...field.value } : (args[1] || createNullValue())); return `HashMap.getOrDefault` }
        case 'putIfAbsent': { const key = this.valToString(args[0]); if (!obj!.fields.some(f => f.name === key)) { obj!.fields.push({ name: key, type: 'Object', value: args[1], isStatic: false }) } frame.operandStack.push(createNullValue()); return `HashMap.putIfAbsent` }
        case 'entrySet': {
          // Create MapEntry objects for each field
          const entries: Value[] = obj!.fields.map(f => {
            const entryId = this.generateObjectId()
            const keyVal = createPrimitiveValue('string', f.name) as Value
            const entryObj: HeapObject = { id: entryId, type: 'object', className: '$MapEntry', fields: [{ name: 'key', type: 'Object', value: keyVal, isStatic: false }, { name: 'value', type: 'Object', value: { ...f.value }, isStatic: false }], isReachable: true, gcRoot: false, createdAtStep: this.state.stepNumber, references: [] }
            this.state.heap.push(entryObj)
            return createReferenceValue(entryId) as Value
          })
          const arrId = this.allocateArray('$MapEntry', entries)
          frame.operandStack.push(createReferenceValue(arrId)); return `HashMap.entrySet (${entries.length} entries)`
        }
        case 'keySet': {
          const keys: Value[] = obj!.fields.map(f => createPrimitiveValue('string', f.name) as Value)
          const arrId = this.allocateArray('String', keys)
          frame.operandStack.push(createReferenceValue(arrId)); return `HashMap.keySet`
        }
        case 'values': {
          const vals: Value[] = obj!.fields.map(f => ({ ...f.value } as Value))
          const arrId = this.allocateArray('Object', vals)
          frame.operandStack.push(createReferenceValue(arrId)); return `HashMap.values`
        }
        case 'forEach': frame.operandStack.push(createNullValue()); return `HashMap.forEach [simplified]`
      }
    }

    // ---- MapEntry ----
    if (obj && obj.className === '$MapEntry') {
      switch (methodName) {
        case 'getKey': { const kf = obj.fields.find(f => f.name === 'key'); frame.operandStack.push(kf ? { ...kf.value } : createNullValue()); return `MapEntry.getKey` }
        case 'getValue': { const vf = obj.fields.find(f => f.name === 'value'); frame.operandStack.push(vf ? { ...vf.value } : createNullValue()); return `MapEntry.getValue` }
        case 'setValue': { const vf = obj.fields.find(f => f.name === 'value'); if (vf) vf.value = args[0]; frame.operandStack.push(createNullValue()); return `MapEntry.setValue` }
      }
    }

    // ---- HashSet / LinkedHashSet / TreeSet ----
    const isSet = obj && (obj.className === 'HashSet' || obj.className === 'LinkedHashSet' || obj.className === 'TreeSet' || obj.className === 'Set')
    if (isSet) {
      const elems = obj!.arrayElements || []
      switch (methodName) {
        case '<init>': obj!.arrayElements = obj!.arrayElements || []; obj!.arrayLength = 0; return `${obj!.className}.<init>`
        case 'add': { const vs = this.valToString(args[0]); const dup = elems.some(e => this.valToString(e) === vs); if (!dup) { elems.push(args[0]); obj!.arrayLength = elems.length } frame.operandStack.push(createPrimitiveValue('boolean', !dup)); return `Set.add(${vs})` }
        case 'contains': { const vs = this.valToString(args[0]); frame.operandStack.push(createPrimitiveValue('boolean', elems.some(e => this.valToString(e) === vs))); return `Set.contains` }
        case 'remove': { const vs = this.valToString(args[0]); const idx = elems.findIndex(e => this.valToString(e) === vs); if (idx >= 0) { elems.splice(idx, 1); obj!.arrayLength = elems.length } frame.operandStack.push(createPrimitiveValue('boolean', idx >= 0)); return `Set.remove` }
        case 'size': frame.operandStack.push(createPrimitiveValue('int', elems.length)); return `Set.size = ${elems.length}`
        case 'isEmpty': frame.operandStack.push(createPrimitiveValue('boolean', elems.length === 0)); return `Set.isEmpty`
        case 'clear': elems.splice(0); obj!.arrayLength = 0; frame.operandStack.push(createNullValue()); return `Set.clear`
        case 'iterator': { const itId = this.createIterator(obj!); frame.operandStack.push(createReferenceValue(itId)); return `Set.iterator` }
        case 'toArray': { const arrId = this.allocateArray('Object', [...elems]); frame.operandStack.push(createReferenceValue(arrId)); return `Set.toArray` }
        case 'forEach': frame.operandStack.push(createNullValue()); return `Set.forEach [simplified]`
      }
    }

    // ---- ArrayList / LinkedList / Stack / Vector / Deque / ArrayDeque ----
    const isList = obj && (obj.className === 'ArrayList' || obj.className === 'LinkedList' ||
      obj.className === 'Stack' || obj.className === 'Vector' || obj.className === 'List' ||
      obj.className === 'ArrayDeque' || obj.className === 'Deque' || obj.className === 'PriorityQueue')
    if (isList) {
      const elems = obj!.arrayElements || (obj!.arrayElements = [])
      const n = (i: number) => args[i]?.kind === 'primitive' ? (args[i].value as number) : 0
      const sync = () => { obj!.arrayLength = elems.length }
      switch (methodName) {
        case '<init>': obj!.arrayElements = []; obj!.arrayLength = 0; return `${obj!.className}.<init>`
        // --- Basic List ops ---
        case 'add': {
          if (args.length === 2 && args[0]?.kind === 'primitive' && typeof args[0].value === 'number') {
            elems.splice(n(0), 0, args[1])
          } else { elems.push(args[0]) }
          sync(); frame.operandStack.push(createPrimitiveValue('boolean', true)); return `List.add`
        }
        case 'addAll': {
          const other = heapOf(args[0]) || heapOf(args[1])
          if (other?.arrayElements) { elems.push(...other.arrayElements); sync() }
          frame.operandStack.push(createPrimitiveValue('boolean', true)); return `List.addAll`
        }
        case 'get': { const idx = n(0); frame.operandStack.push(idx < elems.length ? { ...elems[idx] } : createNullValue()); return `List.get(${idx})` }
        case 'set': { const idx = n(0); const old = elems[idx] ? { ...elems[idx] } : createNullValue(); if (idx < elems.length) elems[idx] = args[1]; sync(); frame.operandStack.push(old); return `List.set` }
        case 'remove': {
          const a = args[0]
          if (a?.kind === 'primitive' && typeof a.value === 'number') {
            const r = elems.splice(a.value as number, 1); sync(); frame.operandStack.push(r[0] || createNullValue())
          } else {
            const vs = this.valToString(a); const i = elems.findIndex(e => this.valToString(e) === vs)
            if (i >= 0) elems.splice(i, 1); sync(); frame.operandStack.push(createPrimitiveValue('boolean', i >= 0))
          }
          return `List.remove`
        }
        case 'removeAll': {
          const other = heapOf(args[0])
          const toRemove = new Set(other?.arrayElements?.map(e => this.valToString(e)) ?? [])
          const before = elems.length; elems.splice(0, elems.length, ...elems.filter(e => !toRemove.has(this.valToString(e)))); sync()
          frame.operandStack.push(createPrimitiveValue('boolean', elems.length !== before)); return `List.removeAll`
        }
        case 'retainAll': {
          const other2 = heapOf(args[0])
          const toKeep = new Set(other2?.arrayElements?.map(e => this.valToString(e)) ?? [])
          const before2 = elems.length; elems.splice(0, elems.length, ...elems.filter(e => toKeep.has(this.valToString(e)))); sync()
          frame.operandStack.push(createPrimitiveValue('boolean', elems.length !== before2)); return `List.retainAll`
        }
        case 'size': frame.operandStack.push(createPrimitiveValue('int', elems.length)); return `List.size = ${elems.length}`
        case 'isEmpty': frame.operandStack.push(createPrimitiveValue('boolean', elems.length === 0)); return `List.isEmpty`
        case 'contains': { const vs = this.valToString(args[0]); frame.operandStack.push(createPrimitiveValue('boolean', elems.some(e => this.valToString(e) === vs))); return `List.contains` }
        case 'containsAll': {
          const other3 = heapOf(args[0])
          const allIn = other3?.arrayElements?.every(e => elems.some(e2 => this.valToString(e2) === this.valToString(e))) ?? true
          frame.operandStack.push(createPrimitiveValue('boolean', allIn)); return `List.containsAll`
        }
        case 'indexOf': { const vs = this.valToString(args[0]); frame.operandStack.push(createPrimitiveValue('int', elems.findIndex(e => this.valToString(e) === vs))); return `List.indexOf` }
        case 'lastIndexOf': { const vs = this.valToString(args[0]); let li = -1; for (let i = elems.length - 1; i >= 0; i--) { if (this.valToString(elems[i]) === vs) { li = i; break } } frame.operandStack.push(createPrimitiveValue('int', li)); return `List.lastIndexOf` }
        case 'clear': elems.splice(0); sync(); frame.operandStack.push(createNullValue()); return `List.clear`
        case 'subList': { const from = n(0), to = n(1); const subId = this.allocateArray('Object', elems.slice(from, to)); frame.operandStack.push(createReferenceValue(subId)); return `List.subList(${from},${to})` }
        case 'iterator': case 'listIterator': case 'descendingIterator': { const itId = this.createIterator(obj!); frame.operandStack.push(createReferenceValue(itId)); return `List.iterator` }
        case 'toArray': { const arrId = this.allocateArray('Object', [...elems]); frame.operandStack.push(createReferenceValue(arrId)); return `List.toArray` }
        case 'sort': {
          elems.sort((a, b) => { const as2 = a.kind === 'primitive' ? String(a.value) : ''; const bs2 = b.kind === 'primitive' ? String(b.value) : ''; return as2 < bs2 ? -1 : as2 > bs2 ? 1 : 0 })
          sync(); frame.operandStack.push(createNullValue()); return `List.sort`
        }
        case 'reverse': { elems.reverse(); sync(); frame.operandStack.push(createNullValue()); return `List.reverse` }
        case 'forEach': frame.operandStack.push(createNullValue()); return `List.forEach [simplified]`
        case 'stream': { const arrId = this.allocateArray('Object', [...elems]); frame.operandStack.push(createReferenceValue(arrId)); return `List.stream` }
        case 'toString': {
          const str = '[' + elems.map(e => e.kind === 'primitive' ? String(e.value) : 'null').join(', ') + ']'
          frame.operandStack.push(createPrimitiveValue('string', str)); return `List.toString`
        }
        case 'hashCode': frame.operandStack.push(createPrimitiveValue('int', elems.length)); return `List.hashCode`
        case 'equals': {
          const other4 = heapOf(args[0])
          const eq = other4?.arrayElements?.length === elems.length && elems.every((e, i) => this.valToString(e) === this.valToString(other4.arrayElements![i]))
          frame.operandStack.push(createPrimitiveValue('boolean', eq ?? false)); return `List.equals`
        }
        // --- Deque / Queue / Stack ops ---
        case 'addFirst': case 'offerFirst': case 'push': { elems.unshift(args[0]); sync(); frame.operandStack.push(createPrimitiveValue('boolean', true)); return `Deque.addFirst` }
        case 'addLast': case 'offerLast': case 'offer': case 'enqueue': { elems.push(args[0]); sync(); frame.operandStack.push(createPrimitiveValue('boolean', true)); return `Deque.addLast` }
        case 'removeFirst': case 'poll': case 'pop': case 'dequeue': { const v = elems.shift(); sync(); frame.operandStack.push(v || createNullValue()); return `Deque.removeFirst` }
        case 'removeLast': case 'pollLast': { const v = elems.pop(); sync(); frame.operandStack.push(v || createNullValue()); return `Deque.removeLast` }
        case 'peekFirst': case 'peek': case 'element': case 'getFirst': frame.operandStack.push(elems.length > 0 ? { ...elems[0] } : createNullValue()); return `Deque.peekFirst`
        case 'peekLast': case 'getLast': frame.operandStack.push(elems.length > 0 ? { ...elems[elems.length - 1] } : createNullValue()); return `Deque.peekLast`
        case 'pollFirst': { const v = elems.shift(); sync(); frame.operandStack.push(v || createNullValue()); return `Deque.pollFirst` }
      }
    }

    // ---- Iterator ($Iterator or array-backed) ----
    if (obj && (obj.className === '$Iterator' || obj.className === '$SetIterator')) {
      const idxField = obj.fields.find(f => f.name === '$index')
      const arrField = obj.fields.find(f => f.name === '$array')
      const arrObj = arrField ? this.getHeapObj(arrField.value) : null
      const elems = arrObj?.arrayElements || []
      const idx = idxField?.value.kind === 'primitive' ? (idxField.value.value as number) : 0
      switch (methodName) {
        case 'hasNext': frame.operandStack.push(createPrimitiveValue('boolean', idx < elems.length)); return `Iterator.hasNext = ${idx < elems.length}`
        case 'next': {
          if (idx < elems.length) {
            frame.operandStack.push({ ...elems[idx] })
            if (idxField) idxField.value = createPrimitiveValue('int', idx + 1)
          } else { frame.operandStack.push(createNullValue()) }
          return `Iterator.next[${idx}]`
        }
        case 'remove': frame.operandStack.push(createNullValue()); return `Iterator.remove [no-op]`
      }
    }

    // ---- Collections utility ----
    if (className === 'Collections') {
      switch (methodName) {
        case 'sort': {
          const listObj = heapOf(args[0])
          if (listObj?.arrayElements) {
            listObj.arrayElements.sort((a, b) => {
              const as2 = a.kind === 'primitive' ? String(a.value) : ''
              const bs2 = b.kind === 'primitive' ? String(b.value) : ''
              return as2 < bs2 ? -1 : as2 > bs2 ? 1 : 0
            })
          }
          frame.operandStack.push(createNullValue()); return `Collections.sort`
        }
        case 'reverse': { const lo = heapOf(args[0]); if (lo?.arrayElements) lo.arrayElements.reverse(); frame.operandStack.push(createNullValue()); return `Collections.reverse` }
        case 'shuffle': {
          const lo = heapOf(args[0])
          if (lo?.arrayElements) { const a = lo.arrayElements; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } }
          frame.operandStack.push(createNullValue()); return `Collections.shuffle`
        }
        case 'min': {
          const lo = heapOf(args[0])
          const elems = lo?.arrayElements ?? []
          const minVal = elems.reduce((best, e) => {
            const es = e.kind === 'primitive' ? String(e.value) : ''
            const bs = best?.kind === 'primitive' ? String(best.value) : ''
            return !best || es < bs ? e : best
          }, elems[0] || null)
          frame.operandStack.push(minVal || createNullValue()); return `Collections.min`
        }
        case 'max': {
          const lo = heapOf(args[0])
          const elems = lo?.arrayElements ?? []
          const maxVal = elems.reduce((best, e) => {
            const es = e.kind === 'primitive' ? String(e.value) : ''
            const bs = best?.kind === 'primitive' ? String(best.value) : ''
            return !best || es > bs ? e : best
          }, elems[0] || null)
          frame.operandStack.push(maxVal || createNullValue()); return `Collections.max`
        }
        case 'frequency': {
          const lo = heapOf(args[0])
          const vs = this.valToString(args[1])
          const count = lo?.arrayElements?.filter(e => this.valToString(e) === vs).length ?? 0
          frame.operandStack.push(createPrimitiveValue('int', count)); return `Collections.frequency`
        }
        case 'fill': {
          const lo = heapOf(args[0])
          if (lo?.arrayElements) { for (let i = 0; i < lo.arrayElements.length; i++) lo.arrayElements[i] = args[1] }
          frame.operandStack.push(createNullValue()); return `Collections.fill`
        }
        case 'copy': {
          const dest = heapOf(args[0]), src = heapOf(args[1])
          if (dest?.arrayElements && src?.arrayElements) {
            for (let i = 0; i < src.arrayElements.length; i++) dest.arrayElements[i] = { ...src.arrayElements[i] }
          }
          frame.operandStack.push(createNullValue()); return `Collections.copy`
        }
        case 'swap': {
          const lo = heapOf(args[0])
          if (lo?.arrayElements) { const i = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0; const j = args[2]?.kind === 'primitive' ? (args[2].value as number) : 0;[lo.arrayElements[i], lo.arrayElements[j]] = [lo.arrayElements[j], lo.arrayElements[i]] }
          frame.operandStack.push(createNullValue()); return `Collections.swap`
        }
        case 'nCopies': {
          const count2 = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0
          const elems2: Value[] = Array.from({ length: count2 }, () => args[1] ? { ...args[1] } : createNullValue())
          const arrId = this.allocateArray('Object', elems2)
          frame.operandStack.push(createReferenceValue(arrId)); return `Collections.nCopies(${count2})`
        }
        case 'singleton': case 'singletonList': {
          const arrId = this.allocateArray('Object', [args[0] || createNullValue()])
          frame.operandStack.push(createReferenceValue(arrId)); return `Collections.singletonList`
        }
        case 'emptyList': case 'emptySet': case 'emptyMap': {
          const arrId = this.allocateArray('Object', [])
          frame.operandStack.push(createReferenceValue(arrId)); return `Collections.empty`
        }
        case 'unmodifiableList': case 'unmodifiableSortedList': case 'unmodifiableSet': case 'unmodifiableMap': {
          frame.operandStack.push(args[0] || createNullValue()); return `Collections.unmodifiable`
        }
        case 'binarySearch': {
          const lo = heapOf(args[0])
          const vs = this.valToString(args[1])
          const idx = lo?.arrayElements?.findIndex(e => this.valToString(e) === vs) ?? -1
          frame.operandStack.push(createPrimitiveValue('int', idx >= 0 ? idx : -(idx + 1))); return `Collections.binarySearch`
        }
        case 'disjoint': {
          const a = heapOf(args[0]), b = heapOf(args[1])
          const setA = new Set(a?.arrayElements?.map(e => this.valToString(e)) ?? [])
          const ok = b?.arrayElements?.every(e => !setA.has(this.valToString(e))) ?? true
          frame.operandStack.push(createPrimitiveValue('boolean', ok)); return `Collections.disjoint`
        }
      }
    }

    // ---- Arrays utility ----
    if (className === 'Arrays') {
      switch (methodName) {
        case 'sort': {
          const arrObj = heapOf(args[0])
          if (arrObj?.arrayElements) {
            arrObj.arrayElements.sort((a, b) => {
              const av = a.kind === 'primitive' ? (a.value as number) : 0
              const bv = b.kind === 'primitive' ? (b.value as number) : 0
              return av < bv ? -1 : av > bv ? 1 : 0
            })
          }
          frame.operandStack.push(createNullValue()); return `Arrays.sort`
        }
        case 'fill': {
          const arrObj = heapOf(args[0])
          if (arrObj?.arrayElements) { for (let i = 0; i < arrObj.arrayElements.length; i++) arrObj.arrayElements[i] = args[1] }
          frame.operandStack.push(createNullValue()); return `Arrays.fill`
        }
        case 'copyOf': {
          const arrObj = heapOf(args[0])
          const newLen = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0
          const orig = arrObj?.arrayElements ?? []
          const newElems: Value[] = Array.from({ length: newLen }, (_, i) => i < orig.length ? { ...orig[i] } : createPrimitiveValue('int', 0))
          const arrId = this.allocateArray(arrObj?.className?.replace('[]', '') ?? 'Object', newElems)
          frame.operandStack.push(createReferenceValue(arrId)); return `Arrays.copyOf(len=${newLen})`
        }
        case 'copyOfRange': {
          const arrObj = heapOf(args[0])
          const from2 = args[1]?.kind === 'primitive' ? (args[1].value as number) : 0
          const to2 = args[2]?.kind === 'primitive' ? (args[2].value as number) : 0
          const slice = (arrObj?.arrayElements ?? []).slice(from2, to2).map(e => ({ ...e } as Value))
          const arrId = this.allocateArray('Object', slice)
          frame.operandStack.push(createReferenceValue(arrId)); return `Arrays.copyOfRange`
        }
        case 'equals': {
          const a = heapOf(args[0]), b = heapOf(args[1])
          const eq = a?.arrayElements?.length === b?.arrayElements?.length &&
            (a?.arrayElements ?? []).every((e, i) => this.valToString(e) === this.valToString(b!.arrayElements![i]))
          frame.operandStack.push(createPrimitiveValue('boolean', eq ?? false)); return `Arrays.equals`
        }
        case 'deepEquals': {
          frame.operandStack.push(createPrimitiveValue('boolean', false)); return `Arrays.deepEquals [simplified]`
        }
        case 'toString': {
          const arrObj = heapOf(args[0])
          const s = '[' + (arrObj?.arrayElements ?? []).map(e => e.kind === 'primitive' ? String(e.value) : 'null').join(', ') + ']'
          frame.operandStack.push(createPrimitiveValue('string', s)); return `Arrays.toString`
        }
        case 'deepToString': {
          const arrObj = heapOf(args[0])
          const s = '[' + (arrObj?.arrayElements ?? []).map(e => e.kind === 'primitive' ? String(e.value) : 'null').join(', ') + ']'
          frame.operandStack.push(createPrimitiveValue('string', s)); return `Arrays.deepToString`
        }
        case 'asList': {
          const elems: Value[] = [...args]
          const arrId = this.allocateArray('Object', elems)
          frame.operandStack.push(createReferenceValue(arrId)); return `Arrays.asList`
        }
        case 'binarySearch': {
          const arrObj = heapOf(args[0])
          const target = this.valToString(args[1])
          const elems = arrObj?.arrayElements ?? []
          let lo = 0, hi = elems.length - 1, found = -1
          while (lo <= hi) {
            const mid = (lo + hi) >> 1; const mv = this.valToString(elems[mid])
            if (mv === target) { found = mid; break } else if (mv < target) lo = mid + 1; else hi = mid - 1
          }
          frame.operandStack.push(createPrimitiveValue('int', found >= 0 ? found : -(lo + 1))); return `Arrays.binarySearch`
        }
        case 'stream': {
          const arrObj = heapOf(args[0])
          const arrId = this.allocateArray('Object', arrObj?.arrayElements ? [...arrObj.arrayElements] : [])
          frame.operandStack.push(createReferenceValue(arrId)); return `Arrays.stream`
        }
      }
    }

    // ---- Thread ----
    const isThreadClass = className === 'Thread'
      || this.isSubclassOf(className, 'Thread')
      || (obj && (obj.className === 'Thread' || this.isSubclassOf(obj.className, 'Thread')))
    if (isThreadClass) {
      const activeT = this.activeThreadState()

      switch (methodName) {
        case '<init>': {
          if (obj) {
            // Only set fields if not already set (subclass may call super() multiple times)
            if (!obj.fields.find(f => f.name === '$threadId')) {
              const threadName = args[0]?.kind === 'primitive' ? String(args[0].value) : `Thread-${this.state.threads.length}`
              obj.fields.push({ name: '$threadId', type: 'String', value: createPrimitiveValue('string', `thread_${this.state.threads.length}`), isStatic: false })
              obj.fields.push({ name: 'name', type: 'String', value: createPrimitiveValue('string', threadName), isStatic: false })
              obj.fields.push({ name: 'priority', type: 'int', value: createPrimitiveValue('int', 5), isStatic: false })
              obj.fields.push({ name: 'daemon', type: 'boolean', value: createPrimitiveValue('boolean', false), isStatic: false })
              obj.fields.push({ name: '$status', type: 'String', value: createPrimitiveValue('string', 'NEW'), isStatic: false })
            }
          }
          return `Thread.<init>`
        }
        case 'start': {
          // Get the heap object robustly — obj might be null if getHeapObj failed on the ref type
          let threadObj = obj
          if (!threadObj && objRef) {
            const refId = (objRef as any).objectId as string | null | undefined
            if (refId) threadObj = this.state.heap.find(o => o.id === refId) ?? null
          }
          // The class to look for run() — use className from the instruction if obj is null
          const runClassName = threadObj?.className ?? className

          if (threadObj || runClassName !== 'Thread') {
            // Ensure required fields exist
            if (threadObj && !threadObj.fields.find(f => f.name === '$threadId')) {
              const uniqueIdx = this.state.threads.length
              threadObj.fields.push({ name: '$threadId', type: 'String', value: createPrimitiveValue('string', `thread_${uniqueIdx}`), isStatic: false })
              threadObj.fields.push({ name: 'name', type: 'String', value: createPrimitiveValue('string', `Thread-${uniqueIdx}`), isStatic: false })
              threadObj.fields.push({ name: 'priority', type: 'int', value: createPrimitiveValue('int', 5), isStatic: false })
              threadObj.fields.push({ name: 'daemon', type: 'boolean', value: createPrimitiveValue('boolean', false), isStatic: false })
              threadObj.fields.push({ name: '$status', type: 'String', value: createPrimitiveValue('string', 'NEW'), isStatic: false })
            }
            const uniqueIdx = this.state.threads.length
            const nameF = threadObj?.fields.find(f => f.name === 'name')
            const idF = threadObj?.fields.find(f => f.name === '$threadId')
            const name = nameF?.value.kind === 'primitive' ? String(nameF.value.value) : `Thread-${uniqueIdx}`
            const threadId = idF?.value.kind === 'primitive' ? String(idF.value.value) : `thread_${uniqueIdx}`

            // Find run() method – walk class hierarchy
            console.log('[Thread.start] runClassName=', runClassName, 'classes=', this.program.classes.map(c => c.name), 'threadObj=', threadObj?.className, 'threadObj.id=', threadObj?.id)
            let runMethodNode = this.program.classes.find(c => c.name === runClassName)?.methods.find(m => m.methodName === 'run')
            console.log('[Thread.start] runMethodNode=', runMethodNode?.methodName, 'sig=', runMethodNode?.signature)

            let resolvedClass = runClassName
            if (!runMethodNode) {
              let sc = this.program.classes.find(c => c.name === runClassName)?.superClass
              while (sc && sc !== 'Object' && sc !== 'Thread') {
                const cls = this.program.classes.find(c => c.name === sc)
                runMethodNode = cls?.methods.find(m => m.methodName === 'run')
                if (runMethodNode) { resolvedClass = sc; break }
                sc = cls?.superClass
              }
            }

            if (runMethodNode) {
              const sig = runMethodNode.signature
              const startIdx = this.program.methodOffsets.get(`${resolvedClass}.${sig}`) ?? 0
              const thisValue = objRef ?? (threadObj ? createReferenceValue(threadObj.id) : createNullValue())
              const runFrame: StackFrame = {
                id: this.generateFrameId(),
                className: resolvedClass,
                methodName: 'run',
                methodSignature: sig,
                localVariables: [{ name: 'this', type: runClassName, value: thisValue, slot: 0 }],
                operandStack: [],
                pc: startIdx,
                lineNumber: 0,
                isNative: false,
              }
              const newThread: import('../types/JVMState').ThreadState = {
                id: threadId,
                name,
                stack: [runFrame],
                status: 'RUNNABLE',
                holdingMonitors: [],
                objectId: threadObj?.id,
                priority: 5,
                isDaemon: false,
                stepCount: 0,
                interrupted: false,
              }
              this.state.threads.push(newThread)
              if (threadObj) {
                const statusF = threadObj.fields.find(f => f.name === '$status')
                if (statusF) statusF.value = createPrimitiveValue('string', 'RUNNABLE')
              }
              return `Thread.start() → spawned '${name}' (${threadId}) running ${resolvedClass}.run()`
            }
          }
          return `Thread.start [run() not found in ${runClassName}]`
        }
        case 'sleep': {
          const ms = args[0]?.kind === 'primitive' ? (args[0].value as number) : 100
          const steps = Math.max(1, Math.round(ms / 50)) // ~50ms per step for visualization
          if (activeT) {
            activeT.status = 'TIMED_WAITING'
            activeT.sleepUntilStep = this.state.stepNumber + steps
          }
          return `Thread.sleep(${ms}ms) → TIMED_WAITING for ${steps} steps`
        }
        case 'join': {
          // Caller waits for the target thread to terminate
          if (obj && activeT) {
            const idF = obj.fields.find(f => f.name === '$threadId')
            const targetId = idF?.value.kind === 'primitive' ? String(idF.value.value) : null
            if (targetId) {
              const targetThread = this.state.threads.find(t => t.id === targetId)
              if (targetThread && targetThread.status !== 'TERMINATED') {
                activeT.status = 'WAITING'
                activeT.waitingOnMonitor = targetId // reuse field for join target
              }
            }
          }
          return `Thread.join()`
        }
        case 'wait': {
          if (objRef?.kind === 'reference' && objRef.objectId && activeT) {
            activeT.status = 'WAITING'
            activeT.waitingOnMonitor = objRef.objectId
            this.releaseMonitor(objRef.objectId, activeT.id)
          }
          return `Object.wait() → WAITING`
        }
        case 'notify': {
          if (objRef?.kind === 'reference' && objRef.objectId) {
            const waiter = this.state.threads.find(t => t.status === 'WAITING' && t.waitingOnMonitor === objRef.objectId)
            if (waiter) {
              waiter.status = 'RUNNABLE'
              waiter.waitingOnMonitor = undefined
            }
          }
          return `Object.notify()`
        }
        case 'notifyAll': {
          if (objRef?.kind === 'reference' && objRef.objectId) {
            for (const t of this.state.threads) {
              if (t.status === 'WAITING' && t.waitingOnMonitor === objRef.objectId) {
                t.status = 'RUNNABLE'
                t.waitingOnMonitor = undefined
              }
            }
          }
          return `Object.notifyAll()`
        }
        case 'getName': {
          let n = 'main'
          if (obj) {
            const nameF = obj.fields.find(f => f.name === 'name')
            if (nameF && nameF.value.kind === 'primitive') n = String(nameF.value.value)
          } else if (activeT) {
            n = activeT.name
          }
          frame.operandStack.push(createPrimitiveValue('string', n))
          return `Thread.getName()`
        }
        case 'getId': {
          let currentId = 'main'
          if (obj) {
            const idF = obj.fields.find(f => f.name === '$threadId')
            if (idF && idF.value.kind === 'primitive') currentId = String(idF.value.value)
          } else if (activeT) {
            currentId = activeT.id
          }
          frame.operandStack.push(createPrimitiveValue('string', currentId))
          return `Thread.getId()`
        }
        case 'getState': {
          let tId = null
          if (obj) {
            const idF = obj.fields.find(f => f.name === '$threadId')
            if (idF && idF.value.kind === 'primitive') tId = String(idF.value.value)
          } else if (activeT) {
            tId = activeT.id
          }
          const t = tId ? this.state.threads.find(th => th.id === tId) : null
          frame.operandStack.push(createPrimitiveValue('string', t?.status ?? 'TERMINATED'))
          return `Thread.getState()`
        }
        case 'isAlive': {
          const idF = obj?.fields.find(f => f.name === '$threadId')
          const tId = idF?.value.kind === 'primitive' ? String(idF.value.value) : null
          const t = tId ? this.state.threads.find(th => th.id === tId) : null
          frame.operandStack.push(createPrimitiveValue('boolean', t ? t.status !== 'TERMINATED' && t.status !== 'NEW' : false))
          return `Thread.isAlive()`
        }
        case 'setPriority': {
          const p = args[0]?.kind === 'primitive' ? (args[0].value as number) : 5
          if (obj) { const pf = obj.fields.find(f => f.name === 'priority'); if (pf) pf.value = createPrimitiveValue('int', p) }
          return `Thread.setPriority(${p})`
        }
        case 'setDaemon': {
          const d = args[0]?.kind === 'primitive' ? Boolean(args[0].value) : false
          if (obj) { const df = obj.fields.find(f => f.name === 'daemon'); if (df) df.value = createPrimitiveValue('boolean', d) }
          return `Thread.setDaemon(${d})`
        }
        case 'currentThread': {
          const refId = activeT?.objectId ?? null
          frame.operandStack.push(createReferenceValue(refId)); return `Thread.currentThread()`
        }
        case 'interrupt': {
          if (activeT) activeT.interrupted = true
          return `Thread.interrupt()`
        }
        case 'isInterrupted': {
          const idF = obj?.fields.find(f => f.name === '$threadId')
          const tId = idF?.value.kind === 'primitive' ? String(idF.value.value) : null
          const t = tId ? this.state.threads.find(th => th.id === tId) : activeT
          frame.operandStack.push(createPrimitiveValue('boolean', t?.interrupted ?? false)); return `Thread.isInterrupted()`
        }
        case 'interrupted': {
          const wasInterrupted = activeT?.interrupted ?? false
          if (activeT) activeT.interrupted = false // clears flag
          frame.operandStack.push(createPrimitiveValue('boolean', wasInterrupted)); return `Thread.interrupted()`
        }
        case 'yield': frame.operandStack.push(createNullValue()); this.rotateThread(); return `Thread.yield()`
      }
    }

    // ---- Exception constructors ----
    const EXCEPTION_TYPES = ['Exception', 'RuntimeException', 'NullPointerException', 'IllegalArgumentException', 'IllegalStateException', 'IndexOutOfBoundsException', 'ArrayIndexOutOfBoundsException', 'ClassCastException', 'UnsupportedOperationException', 'StackOverflowError', 'ArithmeticException', 'NumberFormatException', 'IOException', 'FileNotFoundException']
    if (EXCEPTION_TYPES.includes(className)) {
      if (methodName === '<init>') {
        if (obj && args[0]?.kind === 'primitive') {
          obj.fields.push({ name: 'message', type: 'String', value: args[0], isStatic: false })
        }
        return `${className}.<init>`
      }
      if (methodName === 'getMessage') {
        const msgF = obj?.fields.find(f => f.name === 'message')
        frame.operandStack.push(msgF ? { ...msgF.value } : createNullValue()); return `${className}.getMessage`
      }
      if (methodName === 'toString') {
        const msgF = obj?.fields.find(f => f.name === 'message')
        const msg = msgF?.value.kind === 'primitive' ? String(msgF.value.value) : className
        frame.operandStack.push(createPrimitiveValue('string', `${className}: ${msg}`)); return `${className}.toString`
      }
    }

    // ---- StringBuilder / StringBuffer ----
    if (obj && (obj.className === 'StringBuilder' || obj.className === 'StringBuffer')) {
      const sbField = () => obj!.fields.find(f => f.name === '$sb')
      switch (methodName) {
        case '<init>': { const init = args[0]?.kind === 'primitive' ? String(args[0].value) : ''; obj.fields.push({ name: '$sb', type: 'String', value: createPrimitiveValue('string', init), isStatic: false }); return `StringBuilder.<init>` }
        case 'append': { const f = sbField(); const s = args[0]?.kind === 'primitive' ? String(args[0].value) : (args[0]?.kind === 'reference' ? 'null' : ''); if (f) f.value = createPrimitiveValue('string', String((f.value as any).value || '') + s); frame.operandStack.push(objRef || createNullValue()); return `StringBuilder.append` }
        case 'toString': { const f = sbField(); frame.operandStack.push(f ? { ...f.value } : createPrimitiveValue('string', '')); return `StringBuilder.toString` }
        case 'length': { const f = sbField(); const s = f?.value.kind === 'primitive' ? String(f.value.value) : ''; frame.operandStack.push(createPrimitiveValue('int', s.length)); return `StringBuilder.length` }
        case 'reverse': { const f = sbField(); if (f && f.value.kind === 'primitive') f.value = createPrimitiveValue('string', String(f.value.value).split('').reverse().join('')); frame.operandStack.push(objRef || createNullValue()); return `StringBuilder.reverse` }
        case 'delete': { const f = sbField(); if (f && f.value.kind === 'primitive') { const s = String(f.value.value); const a = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const b = args[1]?.kind === 'primitive' ? (args[1].value as number) : s.length; f.value = createPrimitiveValue('string', s.slice(0, a) + s.slice(b)) } frame.operandStack.push(objRef || createNullValue()); return `StringBuilder.delete` }
        case 'insert': { const f = sbField(); if (f && f.value.kind === 'primitive') { const s = String(f.value.value); const pos = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; const ins = args[1]?.kind === 'primitive' ? String(args[1].value) : ''; f.value = createPrimitiveValue('string', s.slice(0, pos) + ins + s.slice(pos)) } frame.operandStack.push(objRef || createNullValue()); return `StringBuilder.insert` }
        case 'charAt': { const f = sbField(); const s = f?.value.kind === 'primitive' ? String(f.value.value) : ''; const i = args[0]?.kind === 'primitive' ? (args[0].value as number) : 0; frame.operandStack.push(createPrimitiveValue('char', s.charAt(i))); return `StringBuilder.charAt` }
      }
    }

    // ---- Scanner ----
    if (obj && obj.className === 'Scanner') {
      switch (methodName) {
        case '<init>': frame.operandStack.push(createNullValue()); return `Scanner.<init>`
        case 'nextInt': frame.operandStack.push(createPrimitiveValue('int', 0)); return `Scanner.nextInt [returns 0 in simulation]`
        case 'nextLine': case 'next': frame.operandStack.push(createPrimitiveValue('string', '')); return `Scanner.nextLine [returns "" in simulation]`
        case 'nextDouble': frame.operandStack.push(createPrimitiveValue('double', 0.0)); return `Scanner.nextDouble`
        case 'hasNextLine': case 'hasNext': case 'hasNextInt': frame.operandStack.push(createPrimitiveValue('boolean', false)); return `Scanner.hasNext`
        case 'close': frame.operandStack.push(createNullValue()); return `Scanner.close`
      }
    }

    // ---- Array (heap-backed) iterator support ----
    if (obj && (obj.type === 'array') && methodName === 'iterator') {
      const itId = this.createIterator(obj)
      frame.operandStack.push(createReferenceValue(itId)); return `array.iterator`
    }

    return null // not handled
  }

  private createIterator(sourceObj: HeapObject): string {
    const arrId = sourceObj.id
    const itId = this.generateObjectId()
    const itObj: HeapObject = {
      id: itId, type: 'object', className: '$Iterator',
      fields: [
        { name: '$array', type: 'Object', value: createReferenceValue(arrId), isStatic: false },
        { name: '$index', type: 'int', value: createPrimitiveValue('int', 0), isStatic: false },
      ],
      isReachable: true, gcRoot: false, createdAtStep: this.state.stepNumber, references: [arrId],
    }
    this.state.heap.push(itObj)
    return itId
  }

  private allocateObject(className: string): string {
    const id = this.generateObjectId()
    const classInfo = this.state.methodArea.loadedClasses[className]

    const fields: HeapField[] = []
    if (classInfo) {
      for (const field of classInfo.fields) {
        if (!field.isStatic) {
          fields.push({
            name: field.name,
            type: field.type,
            value: field.initialValue || this.getDefaultValue(field.type),
            isStatic: false,
          })
        }
      }
    }

    const obj: HeapObject = {
      id,
      type: 'object',
      className,
      fields,
      isReachable: true,
      gcRoot: false,
      createdAtStep: this.state.stepNumber,
      references: [],
    }

    this.state.heap.push(obj)
    return id
  }

  private allocateArray(elementType: string, elements: Value[]): string {
    const id = this.generateObjectId()

    const obj: HeapObject = {
      id,
      type: 'array',
      className: `${elementType}[]`,
      fields: [],
      arrayElements: elements,
      arrayLength: elements.length,
      isReachable: true,
      gcRoot: false,
      createdAtStep: this.state.stepNumber,
      references: [],
    }

    this.state.heap.push(obj)
    return id
  }

  private allocateLambda(lambdaInfo: string): string {
    const id = this.generateObjectId()

    const obj: HeapObject = {
      id,
      type: 'lambda',
      className: 'Lambda',
      fields: [{
        name: 'info',
        type: 'String',
        value: createPrimitiveValue('string', lambdaInfo),
        isStatic: false,
      }],
      isReachable: true,
      gcRoot: false,
      createdAtStep: this.state.stepNumber,
      references: [],
    }

    this.state.heap.push(obj)
    return id
  }

  /** Walk the class hierarchy to check if childClass extends parentClass */
  private isSubclassOf(childClass: string, parentClass: string): boolean {
    if (!childClass || childClass === parentClass) return true
    let current = childClass
    while (current && current !== 'Object') {
      const cls = this.program.classes.find(c => c.name === current)
      if (!cls) break
      if (cls.superClass === parentClass) return true
      current = cls.superClass
    }
    return false
  }
}
