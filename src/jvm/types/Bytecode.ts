// ============================================
// Bytecode Instruction Types
// ============================================

export enum OpCode {
  // No operation
  NOP = 'NOP',

  // Constants
  LOAD_CONST = 'LOAD_CONST',           // Push constant onto operand stack
  PUSH_NULL = 'PUSH_NULL',             // Push null reference

  // Local Variables
  LOAD_LOCAL = 'LOAD_LOCAL',           // Load local variable onto stack
  STORE_LOCAL = 'STORE_LOCAL',         // Store top of stack into local variable

  // Object Operations
  NEW = 'NEW',                         // Create new object instance
  NEWARRAY = 'NEWARRAY',               // Create new array
  ARRAYLENGTH = 'ARRAYLENGTH',         // Get array length
  ARRAYLOAD = 'ARRAYLOAD',             // Load from array
  ARRAYSTORE = 'ARRAYSTORE',           // Store into array

  // Field Operations
  GETFIELD = 'GETFIELD',               // Get instance field
  PUTFIELD = 'PUTFIELD',               // Set instance field
  GETSTATIC = 'GETSTATIC',             // Get static field
  PUTSTATIC = 'PUTSTATIC',             // Set static field

  // Method Invocation
  INVOKE_VIRTUAL = 'INVOKE_VIRTUAL',   // Invoke instance method
  INVOKE_STATIC = 'INVOKE_STATIC',     // Invoke static method
  INVOKE_SPECIAL = 'INVOKE_SPECIAL',   // Invoke constructor or super method
  INVOKE_INTERFACE = 'INVOKE_INTERFACE', // Invoke interface method
  RETURN = 'RETURN',                   // Return void
  RETURN_VALUE = 'RETURN_VALUE',       // Return with value

  // Stack Operations
  POP = 'POP',                         // Pop top of stack
  DUP = 'DUP',                         // Duplicate top of stack
  SWAP = 'SWAP',                       // Swap top two stack values

  // Arithmetic Operations
  ADD = 'ADD',
  SUB = 'SUB',
  MUL = 'MUL',
  DIV = 'DIV',
  MOD = 'MOD',
  NEG = 'NEG',                         // Negate

  // Comparison Operations
  CMP_EQ = 'CMP_EQ',                   // ==
  CMP_NE = 'CMP_NE',                   // !=
  CMP_LT = 'CMP_LT',                   // <
  CMP_LE = 'CMP_LE',                   // <=
  CMP_GT = 'CMP_GT',                   // >
  CMP_GE = 'CMP_GE',                   // >=

  // Logical Operations
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // Control Flow
  GOTO = 'GOTO',                       // Unconditional jump
  IF_TRUE = 'IF_TRUE',                 // Jump if true
  IF_FALSE = 'IF_FALSE',               // Jump if false

  // Type Operations
  CHECKCAST = 'CHECKCAST',             // Type check
  INSTANCEOF = 'INSTANCEOF',           // Instance check

  // Java 8 - Lambda Operations
  LAMBDA_CREATE = 'LAMBDA_CREATE',     // Create lambda/method reference
  LAMBDA_INVOKE = 'LAMBDA_INVOKE',     // Invoke functional interface

  // Java 8 - Stream Operations (Educational simplification)
  STREAM_SOURCE = 'STREAM_SOURCE',     // Create stream from collection
  STREAM_MAP = 'STREAM_MAP',           // Map operation
  STREAM_FILTER = 'STREAM_FILTER',     // Filter operation
  STREAM_FLATMAP = 'STREAM_FLATMAP',   // FlatMap operation
  STREAM_REDUCE = 'STREAM_REDUCE',     // Reduce operation
  STREAM_COLLECT = 'STREAM_COLLECT',   // Terminal collect operation
  STREAM_FOREACH = 'STREAM_FOREACH',   // Terminal forEach operation
  STREAM_COUNT = 'STREAM_COUNT',       // Terminal count operation

  // Special Operations
  PRINT = 'PRINT',                     // System.out.println (simplified)
  LINE = 'LINE',                       // Line number marker (for visualization)
  BREAKPOINT = 'BREAKPOINT',           // Debugger breakpoint
  THROW = 'THROW',                     // Throw exception

  // Class Operations
  LOAD_CLASS = 'LOAD_CLASS',           // Load class into method area
}

// ============================================
// Instruction Definition
// ============================================

export interface Instruction {
  opcode: OpCode
  operands: InstructionOperand[]
  sourceLine: number
  sourceColumn?: number
  comment?: string // For visualization tooltips
}

export type InstructionOperand =
  | { type: 'int'; value: number }
  | { type: 'float'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'class'; value: string }
  | { type: 'method'; value: string; descriptor: string }
  | { type: 'field'; value: string; owner: string }
  | { type: 'local'; index: number; name: string }
  | { type: 'label'; target: number }
  | { type: 'type'; value: string }

// ============================================
// Compiled Program
// ============================================

export interface CompiledMethod {
  className: string
  methodName: string
  signature: string
  instructions: Instruction[]
  localVariableTable: LocalVariableEntry[]
  maxStack: number
  maxLocals: number
}

export interface LocalVariableEntry {
  index: number
  name: string
  type: string
  startPc: number
  endPc: number
}

export interface CompiledClass {
  name: string
  superClass: string
  interfaces: string[]
  fields: CompiledField[]
  methods: CompiledMethod[]
  isInterface: boolean
  sourceFile: string
}

export interface CompiledField {
  name: string
  type: string
  isStatic: boolean
  initialValue?: InstructionOperand
}

export interface CompiledProgram {
  classes: CompiledClass[]
  mainClass: string
  mainMethod: string
  allInstructions: Instruction[] // Flattened for global PC
  methodOffsets: Map<string, number> // method signature -> start index
}

// ============================================
// Helper Functions
// ============================================

export function createInstruction(
  opcode: OpCode,
  operands: InstructionOperand[] = [],
  sourceLine: number = 0,
  comment?: string
): Instruction {
  return { opcode, operands, sourceLine, comment }
}

export function intOperand(value: number): InstructionOperand {
  return { type: 'int', value }
}

export function stringOperand(value: string): InstructionOperand {
  return { type: 'string', value }
}

export function localOperand(index: number, name: string): InstructionOperand {
  return { type: 'local', index, name }
}

export function labelOperand(target: number): InstructionOperand {
  return { type: 'label', target }
}

export function classOperand(value: string): InstructionOperand {
  return { type: 'class', value }
}

export function methodOperand(value: string, descriptor: string): InstructionOperand {
  return { type: 'method', value, descriptor }
}

export function fieldOperand(value: string, owner: string): InstructionOperand {
  return { type: 'field', value, owner }
}

export function typeOperand(value: string): InstructionOperand {
  return { type: 'type', value }
}

export function getOpcodeDescription(opcode: OpCode): string {
  const descriptions: Record<OpCode, string> = {
    [OpCode.NOP]: 'No operation',
    [OpCode.LOAD_CONST]: 'Push constant onto stack',
    [OpCode.PUSH_NULL]: 'Push null reference',
    [OpCode.LOAD_LOCAL]: 'Load local variable',
    [OpCode.STORE_LOCAL]: 'Store into local variable',
    [OpCode.NEW]: 'Create new object',
    [OpCode.NEWARRAY]: 'Create new array',
    [OpCode.ARRAYLENGTH]: 'Get array length',
    [OpCode.ARRAYLOAD]: 'Load from array',
    [OpCode.ARRAYSTORE]: 'Store into array',
    [OpCode.GETFIELD]: 'Get instance field',
    [OpCode.PUTFIELD]: 'Set instance field',
    [OpCode.GETSTATIC]: 'Get static field',
    [OpCode.PUTSTATIC]: 'Set static field',
    [OpCode.INVOKE_VIRTUAL]: 'Invoke instance method',
    [OpCode.INVOKE_STATIC]: 'Invoke static method',
    [OpCode.INVOKE_SPECIAL]: 'Invoke constructor/super',
    [OpCode.INVOKE_INTERFACE]: 'Invoke interface method',
    [OpCode.RETURN]: 'Return void',
    [OpCode.RETURN_VALUE]: 'Return with value',
    [OpCode.POP]: 'Pop top of stack',
    [OpCode.DUP]: 'Duplicate top of stack',
    [OpCode.SWAP]: 'Swap top two values',
    [OpCode.ADD]: 'Add two values',
    [OpCode.SUB]: 'Subtract two values',
    [OpCode.MUL]: 'Multiply two values',
    [OpCode.DIV]: 'Divide two values',
    [OpCode.MOD]: 'Modulo operation',
    [OpCode.NEG]: 'Negate value',
    [OpCode.CMP_EQ]: 'Compare equal',
    [OpCode.CMP_NE]: 'Compare not equal',
    [OpCode.CMP_LT]: 'Compare less than',
    [OpCode.CMP_LE]: 'Compare less or equal',
    [OpCode.CMP_GT]: 'Compare greater than',
    [OpCode.CMP_GE]: 'Compare greater or equal',
    [OpCode.AND]: 'Logical AND',
    [OpCode.OR]: 'Logical OR',
    [OpCode.NOT]: 'Logical NOT',
    [OpCode.GOTO]: 'Jump to label',
    [OpCode.IF_TRUE]: 'Jump if true',
    [OpCode.IF_FALSE]: 'Jump if false',
    [OpCode.CHECKCAST]: 'Check type cast',
    [OpCode.INSTANCEOF]: 'Check instance type',
    [OpCode.LAMBDA_CREATE]: 'Create lambda expression',
    [OpCode.LAMBDA_INVOKE]: 'Invoke lambda',
    [OpCode.STREAM_SOURCE]: 'Create stream',
    [OpCode.STREAM_MAP]: 'Stream map operation',
    [OpCode.STREAM_FILTER]: 'Stream filter operation',
    [OpCode.STREAM_FLATMAP]: 'Stream flatMap operation',
    [OpCode.STREAM_REDUCE]: 'Stream reduce operation',
    [OpCode.STREAM_COLLECT]: 'Stream collect operation',
    [OpCode.STREAM_FOREACH]: 'Stream forEach operation',
    [OpCode.STREAM_COUNT]: 'Stream count operation',
    [OpCode.PRINT]: 'Print to console',
    [OpCode.LINE]: 'Source line marker',
    [OpCode.BREAKPOINT]: 'Breakpoint',
    [OpCode.THROW]: 'Throw exception',
    [OpCode.LOAD_CLASS]: 'Load class definition',
  }
  return descriptions[opcode] || opcode
}
