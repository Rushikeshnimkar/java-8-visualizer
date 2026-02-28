// ============================================
// JVM State Types
// ============================================

export type PrimitiveType = 'int' | 'long' | 'float' | 'double' | 'boolean' | 'char' | 'byte' | 'short' | 'string' | 'void'

export interface PrimitiveValue {
  kind: 'primitive'
  type: PrimitiveType
  value: number | boolean | string | null
}

export interface ReferenceValue {
  kind: 'reference'
  objectId: string | null // null for null reference
}

export interface ArrayValue {
  kind: 'array'
  objectId: string
  elementType: PrimitiveType | string
}

export interface LambdaValue {
  kind: 'lambda'
  objectId: string
  capturedVars: Record<string, Value>
  targetMethod: string
}

export type Value = PrimitiveValue | ReferenceValue | ArrayValue | LambdaValue

// ============================================
// Stack Frame
// ============================================

export interface LocalVariable {
  name: string
  type: string
  value: Value
  slot: number
}

export interface StackFrame {
  id: string
  className: string
  methodName: string
  methodSignature: string
  localVariables: LocalVariable[]
  operandStack: Value[]
  pc: number // instruction pointer within this method
  lineNumber: number // source line number
  isNative: boolean
  capturedVariables?: LocalVariable[] // for lambda closures
}

// ============================================
// Heap Objects
// ============================================

export interface HeapField {
  name: string
  type: string
  value: Value
  isStatic: boolean
}

export interface HeapObject {
  id: string
  type: 'object' | 'array' | 'lambda' | 'string'
  className: string
  fields: HeapField[]
  arrayElements?: Value[]
  arrayLength?: number
  stringValue?: string // for string objects
  isReachable: boolean
  gcRoot: boolean
  createdAtStep: number
  references: string[] // IDs of objects this object references
}

// ============================================
// Method Area / Metaspace
// ============================================

export interface FieldInfo {
  name: string
  type: string
  accessModifiers: string[]
  isStatic: boolean
  initialValue?: Value
}

export interface ParameterInfo {
  name: string
  type: string
}

export interface MethodInfo {
  name: string
  returnType: string
  parameters: ParameterInfo[]
  accessModifiers: string[]
  isStatic: boolean
  isAbstract: boolean
  isDefault: boolean // Java 8 default methods
  isNative: boolean
  bytecodeStartIndex: number
  bytecodeEndIndex: number
  lineNumberTable: Map<number, number> // bytecode index -> source line
}

export interface ClassInfo {
  name: string
  superClass: string | null
  interfaces: string[]
  fields: FieldInfo[]
  methods: MethodInfo[]
  isInterface: boolean
  isAbstract: boolean
  accessModifiers: string[]
  sourceFile?: string
  loadedAtStep: number
}

export interface ConstantPoolEntry {
  index: number
  type: 'string' | 'integer' | 'float' | 'long' | 'double' | 'class' | 'methodref' | 'fieldref'
  value: string | number
}

export interface MethodArea {
  loadedClasses: Record<string, ClassInfo>
  staticFields: Record<string, Record<string, Value>> // className -> fieldName -> value
  constantPool: ConstantPoolEntry[]
}

// ============================================
// Program Counter
// ============================================

export interface ProgramCounter {
  currentInstruction: number // global instruction index
  currentLine: number // source code line
  currentMethod: string // fully qualified method name
  currentClass: string
}

// ============================================
// Complete JVM State
// ============================================

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

export type ThreadStatus = 'NEW' | 'RUNNABLE' | 'RUNNING' | 'BLOCKED' | 'WAITING' | 'TIMED_WAITING' | 'TERMINATED'

export interface ThreadState {
  id: string
  name: string
  stack: StackFrame[]
  status: ThreadStatus
  sleepUntilStep?: number       // wake from TIMED_WAITING after this step
  waitingOnMonitor?: string     // objectId of object whose monitor we are waiting for
  holdingMonitors: string[]     // objectIds of monitors this thread holds
  objectId?: string             // heap object id for this Thread instance
  priority: number              // 1-10, default 5
  isDaemon: boolean
  stepCount: number             // instructions executed by this thread
  interrupted: boolean
}

export interface JVMState {
  stack: StackFrame[]       // current thread's stack (primary thread, alias into threads[activeThread].stack)
  heap: HeapObject[]
  methodArea: MethodArea
  pc: ProgramCounter
  nativeStack: StackFrame[] // simplified native method stack
  status: ExecutionStatus
  stepNumber: number
  output: string[] // System.out.println output
  error?: string
  threads: ThreadState[]    // all threads
  activeThread: number      // index into threads array
  monitors: Record<string, string | null> // objectId → threadId holding it (null = free)
}


// ============================================
// Helpers
// ============================================

export function createPrimitiveValue(type: PrimitiveType, value: number | boolean | string | null): PrimitiveValue {
  return { kind: 'primitive', type, value }
}

export function createReferenceValue(objectId: string | null): ReferenceValue {
  return { kind: 'reference', objectId }
}

export function createNullValue(): ReferenceValue {
  return { kind: 'reference', objectId: null }
}

export function isNullValue(value: Value): boolean {
  return value.kind === 'reference' && value.objectId === null
}

export function valueToString(value: Value): string {
  switch (value.kind) {
    case 'primitive':
      if (value.value === null) return 'null'
      if (value.type === 'string') return `"${value.value}"`
      if (value.type === 'char') return `'${value.value}'`
      if (value.type === 'boolean') return value.value ? 'true' : 'false'
      return String(value.value)
    case 'reference':
      return value.objectId ? `@${value.objectId}` : 'null'
    case 'array':
      return `${value.elementType}[]@${value.objectId}`
    case 'lambda':
      return `Lambda@${value.objectId}`
  }
}

export function createInitialJVMState(): JVMState {
  return {
    stack: [],
    heap: [],
    methodArea: {
      loadedClasses: {},
      staticFields: {},
      constantPool: [],
    },
    pc: {
      currentInstruction: 0,
      currentLine: 0,
      currentMethod: '',
      currentClass: '',
    },
    nativeStack: [],
    status: 'idle',
    stepNumber: 0,
    output: [],
    threads: [],
    activeThread: 0,
    monitors: {},
  }
}
