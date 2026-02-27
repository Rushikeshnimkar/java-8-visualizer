// ============================================
// Abstract Syntax Tree Node Types
// ============================================

export interface SourceLocation {
  line: number
  column: number
}

// Base AST Node
export interface ASTNode {
  kind: string
  location: SourceLocation
}

// ============================================
// Top Level Declarations
// ============================================

export interface Program extends ASTNode {
  kind: 'Program'
  declarations: (ClassDeclaration | InterfaceDeclaration)[]
}

export interface ClassDeclaration extends ASTNode {
  kind: 'ClassDeclaration'
  name: string
  modifiers: string[]
  superClass: string | null
  interfaces: string[]
  members: ClassMember[]
}

export interface InterfaceDeclaration extends ASTNode {
  kind: 'InterfaceDeclaration'
  name: string
  modifiers: string[]
  extends: string[]
  members: InterfaceMember[]
}

// ============================================
// Class Members
// ============================================

export type ClassMember = FieldDeclaration | MethodDeclaration | ConstructorDeclaration

export type InterfaceMember = MethodSignature | DefaultMethodDeclaration | FieldDeclaration

export interface FieldDeclaration extends ASTNode {
  kind: 'FieldDeclaration'
  name: string
  type: TypeNode
  modifiers: string[]
  initializer: Expression | null
}

export interface MethodDeclaration extends ASTNode {
  kind: 'MethodDeclaration'
  name: string
  modifiers: string[]
  returnType: TypeNode
  parameters: Parameter[]
  body: BlockStatement | null // null for abstract methods
  throws: string[]
}

export interface ConstructorDeclaration extends ASTNode {
  kind: 'ConstructorDeclaration'
  name: string
  modifiers: string[]
  parameters: Parameter[]
  body: BlockStatement
}

export interface MethodSignature extends ASTNode {
  kind: 'MethodSignature'
  name: string
  returnType: TypeNode
  parameters: Parameter[]
}

export interface DefaultMethodDeclaration extends ASTNode {
  kind: 'DefaultMethodDeclaration'
  name: string
  returnType: TypeNode
  parameters: Parameter[]
  body: BlockStatement
}

export interface Parameter extends ASTNode {
  kind: 'Parameter'
  name: string
  type: TypeNode
  isFinal: boolean
}

// ============================================
// Types
// ============================================

export interface TypeNode extends ASTNode {
  kind: 'TypeNode'
  name: string
  isArray: boolean
  arrayDimensions: number
  typeArguments: TypeNode[] // for generics like List<String>
}

// ============================================
// Statements
// ============================================

export type Statement = 
  | BlockStatement
  | VariableDeclaration
  | ExpressionStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | ForEachStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | ThrowStatement
  | TryStatement
  | EmptyStatement

export interface BlockStatement extends ASTNode {
  kind: 'BlockStatement'
  statements: Statement[]
}

export interface VariableDeclaration extends ASTNode {
  kind: 'VariableDeclaration'
  name: string
  type: TypeNode
  isFinal: boolean
  initializer: Expression | null
}

export interface ExpressionStatement extends ASTNode {
  kind: 'ExpressionStatement'
  expression: Expression
}

export interface IfStatement extends ASTNode {
  kind: 'IfStatement'
  condition: Expression
  thenBranch: Statement
  elseBranch: Statement | null
}

export interface WhileStatement extends ASTNode {
  kind: 'WhileStatement'
  condition: Expression
  body: Statement
}

export interface ForStatement extends ASTNode {
  kind: 'ForStatement'
  init: VariableDeclaration | Expression | null
  condition: Expression | null
  update: Expression | null
  body: Statement
}

export interface ForEachStatement extends ASTNode {
  kind: 'ForEachStatement'
  variable: VariableDeclaration
  iterable: Expression
  body: Statement
}

export interface ReturnStatement extends ASTNode {
  kind: 'ReturnStatement'
  value: Expression | null
}

export interface BreakStatement extends ASTNode {
  kind: 'BreakStatement'
}

export interface ContinueStatement extends ASTNode {
  kind: 'ContinueStatement'
}

export interface ThrowStatement extends ASTNode {
  kind: 'ThrowStatement'
  expression: Expression
}

export interface TryStatement extends ASTNode {
  kind: 'TryStatement'
  tryBlock: BlockStatement
  catchClauses: CatchClause[]
  finallyBlock: BlockStatement | null
}

export interface CatchClause extends ASTNode {
  kind: 'CatchClause'
  parameter: Parameter
  body: BlockStatement
}

export interface EmptyStatement extends ASTNode {
  kind: 'EmptyStatement'
}

// ============================================
// Expressions
// ============================================

export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryExpression
  | UnaryExpression
  | AssignmentExpression
  | CallExpression
  | MemberExpression
  | NewExpression
  | NewArrayExpression
  | ArrayAccessExpression
  | ThisExpression
  | SuperExpression
  | LambdaExpression
  | MethodReferenceExpression
  | ConditionalExpression
  | CastExpression
  | InstanceOfExpression
  | ParenthesizedExpression

export interface LiteralExpression extends ASTNode {
  kind: 'LiteralExpression'
  type: 'int' | 'long' | 'float' | 'double' | 'boolean' | 'char' | 'string' | 'null'
  value: number | boolean | string | null
}

export interface IdentifierExpression extends ASTNode {
  kind: 'IdentifierExpression'
  name: string
}

export interface BinaryExpression extends ASTNode {
  kind: 'BinaryExpression'
  operator: string
  left: Expression
  right: Expression
}

export interface UnaryExpression extends ASTNode {
  kind: 'UnaryExpression'
  operator: string
  operand: Expression
  prefix: boolean
}

export interface AssignmentExpression extends ASTNode {
  kind: 'AssignmentExpression'
  operator: string // =, +=, -=, etc.
  left: Expression
  right: Expression
}

export interface CallExpression extends ASTNode {
  kind: 'CallExpression'
  callee: Expression
  arguments: Expression[]
  typeArguments: TypeNode[]
}

export interface MemberExpression extends ASTNode {
  kind: 'MemberExpression'
  object: Expression
  property: string
}

export interface NewExpression extends ASTNode {
  kind: 'NewExpression'
  type: TypeNode
  arguments: Expression[]
}

export interface NewArrayExpression extends ASTNode {
  kind: 'NewArrayExpression'
  elementType: TypeNode
  dimensions: Expression[]
  initializer: Expression[] | null
}

export interface ArrayAccessExpression extends ASTNode {
  kind: 'ArrayAccessExpression'
  array: Expression
  index: Expression
}

export interface ThisExpression extends ASTNode {
  kind: 'ThisExpression'
}

export interface SuperExpression extends ASTNode {
  kind: 'SuperExpression'
}

// Java 8 - Lambda Expression
export interface LambdaExpression extends ASTNode {
  kind: 'LambdaExpression'
  parameters: LambdaParameter[]
  body: Expression | BlockStatement
}

export interface LambdaParameter extends ASTNode {
  kind: 'LambdaParameter'
  name: string
  type: TypeNode | null // null when type is inferred
}

// Java 8 - Method Reference
export interface MethodReferenceExpression extends ASTNode {
  kind: 'MethodReferenceExpression'
  object: Expression | TypeNode // Class::method or object::method
  methodName: string // method name or 'new' for constructor reference
}

export interface ConditionalExpression extends ASTNode {
  kind: 'ConditionalExpression'
  condition: Expression
  consequent: Expression
  alternate: Expression
}

export interface CastExpression extends ASTNode {
  kind: 'CastExpression'
  type: TypeNode
  expression: Expression
}

export interface InstanceOfExpression extends ASTNode {
  kind: 'InstanceOfExpression'
  expression: Expression
  type: TypeNode
}

export interface ParenthesizedExpression extends ASTNode {
  kind: 'ParenthesizedExpression'
  expression: Expression
}

// ============================================
// Helper Functions
// ============================================

export function createLocation(line: number, column: number): SourceLocation {
  return { line, column }
}

export function createTypeNode(
  name: string,
  location: SourceLocation,
  isArray: boolean = false,
  arrayDimensions: number = 0,
  typeArguments: TypeNode[] = []
): TypeNode {
  return {
    kind: 'TypeNode',
    name,
    isArray,
    arrayDimensions,
    typeArguments,
    location,
  }
}

export function isPrimitiveType(typeName: string): boolean {
  return ['int', 'long', 'short', 'byte', 'float', 'double', 'boolean', 'char', 'void'].includes(typeName)
}

export function typeToString(type: TypeNode): string {
  let result = type.name
  if (type.typeArguments.length > 0) {
    result += '<' + type.typeArguments.map(typeToString).join(', ') + '>'
  }
  for (let i = 0; i < type.arrayDimensions; i++) {
    result += '[]'
  }
  return result
}
