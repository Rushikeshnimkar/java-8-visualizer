// ============================================
// Bytecode Compiler - AST to Bytecode
// ============================================

import * as AST from '../parser/ASTNodes'
import {
  OpCode,
  Instruction,
  CompiledProgram,
  CompiledClass,
  CompiledMethod,
  CompiledField,
  LocalVariableEntry,
  createInstruction,
  intOperand,
  stringOperand,
  localOperand,
  labelOperand,
  classOperand,
  methodOperand,
  fieldOperand,
  typeOperand,
} from '../types/Bytecode'

interface CompilerContext {
  className: string
  methodName: string
  localVariables: Map<string, { index: number; type: string }>
  nextLocalIndex: number
  instructions: Instruction[]
  loopStartLabels: number[]
  loopEndLabels: number[]
  labelCounter: number
  labelTargets: Map<number, number>
}

export class BytecodeCompiler {
  private classes: CompiledClass[] = []
  private allInstructions: Instruction[] = []
  private methodOffsets: Map<string, number> = new Map()
  private mainClass: string = ''
  private mainMethod: string = 'main'

  compile(program: AST.Program): CompiledProgram {
    // First pass: compile all classes
    for (const decl of program.declarations) {
      if (decl.kind === 'ClassDeclaration') {
        this.compileClass(decl)
      } else if (decl.kind === 'InterfaceDeclaration') {
        this.compileInterface(decl)
      }
    }

    // Find main class
    for (const cls of this.classes) {
      for (const method of cls.methods) {
        if (method.methodName === 'main' && method.signature.includes('String[]')) {
          this.mainClass = cls.name
          break
        }
      }
    }

    return {
      classes: this.classes,
      mainClass: this.mainClass,
      mainMethod: this.mainMethod,
      allInstructions: this.allInstructions,
      methodOffsets: this.methodOffsets,
    }
  }

  private compileClass(node: AST.ClassDeclaration): void {
    const fields: CompiledField[] = []
    const methods: CompiledMethod[] = []

    for (const member of node.members) {
      if (member.kind === 'FieldDeclaration') {
        fields.push(this.compileField(member))
      } else if (member.kind === 'MethodDeclaration') {
        methods.push(this.compileMethod(member, node.name))
      } else if (member.kind === 'ConstructorDeclaration') {
        methods.push(this.compileConstructor(member, node.name))
      }
    }

    this.classes.push({
      name: node.name,
      superClass: node.superClass || 'Object',
      interfaces: node.interfaces,
      fields,
      methods,
      isInterface: false,
      sourceFile: 'source.java',
    })
  }

  private compileInterface(node: AST.InterfaceDeclaration): void {
    const fields: CompiledField[] = []
    const methods: CompiledMethod[] = []

    for (const member of node.members) {
      if (member.kind === 'FieldDeclaration') {
        fields.push(this.compileField(member))
      } else if (member.kind === 'DefaultMethodDeclaration') {
        methods.push(this.compileDefaultMethod(member, node.name))
      }
    }

    this.classes.push({
      name: node.name,
      superClass: 'Object',
      interfaces: node.extends,
      fields,
      methods,
      isInterface: true,
      sourceFile: 'source.java',
    })
  }

  private compileField(node: AST.FieldDeclaration): CompiledField {
    return {
      name: node.name,
      type: AST.typeToString(node.type),
      isStatic: node.modifiers.includes('static'),
      initialValue: (node.initializer ? this.evalConstant(node.initializer) : undefined) as any,
    }
  }

  private evalConstant(expr: AST.Expression): { type: 'int' | 'string' | 'boolean' | 'float'; value: number | string | boolean } | undefined {
    if (expr.kind === 'LiteralExpression') {
      if (expr.type === 'int') return { type: 'int', value: expr.value as number }
      if (expr.type === 'string') return { type: 'string', value: expr.value as string }
      if (expr.type === 'boolean') return { type: 'boolean', value: expr.value as boolean }
      if (expr.type === 'double' || expr.type === 'float') return { type: 'float', value: expr.value as number }
    }
    return undefined
  }

  private createContext(className: string, methodName: string): CompilerContext {
    return {
      className,
      methodName,
      localVariables: new Map(),
      nextLocalIndex: 0,
      instructions: [],
      loopStartLabels: [],
      loopEndLabels: [],
      labelCounter: 0,
      labelTargets: new Map(),
    }
  }

  private compileMethod(node: AST.MethodDeclaration, className: string): CompiledMethod {
    const ctx = this.createContext(className, node.name)
    const signature = this.buildMethodSignature(node.name, node.parameters, node.returnType)

    // Record method offset
    const startIndex = this.allInstructions.length
    this.methodOffsets.set(`${className}.${signature}`, startIndex)

    // Add 'this' for non-static methods
    if (!node.modifiers.includes('static')) {
      ctx.localVariables.set('this', { index: ctx.nextLocalIndex++, type: className })
    }

    // Add parameters to local variables
    for (const param of node.parameters) {
      ctx.localVariables.set(param.name, {
        index: ctx.nextLocalIndex++,
        type: AST.typeToString(param.type)
      })
    }

    // Compile method body
    if (node.body) {
      this.compileBlock(node.body, ctx)
    }

    // Add implicit return for void methods
    const returnType = AST.typeToString(node.returnType)
    if (returnType === 'void' && (ctx.instructions.length === 0 || ctx.instructions[ctx.instructions.length - 1].opcode !== OpCode.RETURN)) {
      ctx.instructions.push(createInstruction(OpCode.RETURN, [], node.location.line))
    }

    // Resolve local labels to local instruction indices
    this.resolveAllLabels(ctx)

    // Shift label targets to global offsets
    for (const instr of ctx.instructions) {
      for (const operand of instr.operands) {
        if (operand.type === 'label') {
          operand.target += startIndex
        }
      }
    }

    // Add instructions to global list
    this.allInstructions.push(...ctx.instructions)

    return {
      className,
      methodName: node.name,
      signature,
      instructions: ctx.instructions,
      localVariableTable: this.buildLocalVariableTable(ctx),
      maxStack: 16, // Simplified
      maxLocals: ctx.nextLocalIndex,
    }
  }

  private compileConstructor(node: AST.ConstructorDeclaration, className: string): CompiledMethod {
    const ctx = this.createContext(className, '<init>')
    const signature = this.buildMethodSignature('<init>', node.parameters, { kind: 'TypeNode', name: 'void', isArray: false, arrayDimensions: 0, typeArguments: [], location: node.location })

    // Record method offset
    const startIndex = this.allInstructions.length
    this.methodOffsets.set(`${className}.${signature}`, startIndex)

    // Add 'this' to local variables
    ctx.localVariables.set('this', { index: ctx.nextLocalIndex++, type: className })

    // Add parameters
    for (const param of node.parameters) {
      ctx.localVariables.set(param.name, {
        index: ctx.nextLocalIndex++,
        type: AST.typeToString(param.type)
      })
    }

    // Compile constructor body
    this.compileBlock(node.body, ctx)

    // Add return
    ctx.instructions.push(createInstruction(OpCode.RETURN, [], node.location.line))

    // Resolve local labels to local instruction indices
    this.resolveAllLabels(ctx)

    // Shift label targets to global offsets
    for (const instr of ctx.instructions) {
      for (const operand of instr.operands) {
        if (operand.type === 'label') {
          operand.target += startIndex
        }
      }
    }

    this.allInstructions.push(...ctx.instructions)

    return {
      className,
      methodName: '<init>',
      signature,
      instructions: ctx.instructions,
      localVariableTable: this.buildLocalVariableTable(ctx),
      maxStack: 16,
      maxLocals: ctx.nextLocalIndex,
    }
  }

  private compileDefaultMethod(node: AST.DefaultMethodDeclaration, className: string): CompiledMethod {
    const ctx = this.createContext(className, node.name)
    const signature = this.buildMethodSignature(node.name, node.parameters, node.returnType)

    const startIndex = this.allInstructions.length
    this.methodOffsets.set(`${className}.${signature}`, startIndex)

    // Add 'this'
    ctx.localVariables.set('this', { index: ctx.nextLocalIndex++, type: className })

    // Add parameters
    for (const param of node.parameters) {
      ctx.localVariables.set(param.name, {
        index: ctx.nextLocalIndex++,
        type: AST.typeToString(param.type)
      })
    }

    this.compileBlock(node.body, ctx)

    const returnType = AST.typeToString(node.returnType)
    if (returnType === 'void') {
      ctx.instructions.push(createInstruction(OpCode.RETURN, [], node.location.line))
    }

    // Resolve local labels to local instruction indices
    this.resolveAllLabels(ctx)

    // Shift label targets to global offsets
    for (const instr of ctx.instructions) {
      for (const operand of instr.operands) {
        if (operand.type === 'label') {
          operand.target += startIndex
        }
      }
    }

    this.allInstructions.push(...ctx.instructions)

    return {
      className,
      methodName: node.name,
      signature,
      instructions: ctx.instructions,
      localVariableTable: this.buildLocalVariableTable(ctx),
      maxStack: 16,
      maxLocals: ctx.nextLocalIndex,
    }
  }

  private buildMethodSignature(name: string, params: AST.Parameter[], returnType: AST.TypeNode): string {
    const paramTypes = params.map(p => AST.typeToString(p.type)).join(',')
    return `${name}(${paramTypes})${AST.typeToString(returnType)}`
  }

  private buildLocalVariableTable(ctx: CompilerContext): LocalVariableEntry[] {
    const entries: LocalVariableEntry[] = []
    for (const [name, info] of ctx.localVariables) {
      entries.push({
        index: info.index,
        name,
        type: info.type,
        startPc: 0,
        endPc: ctx.instructions.length,
      })
    }
    return entries
  }

  // ============================================
  // Statement Compilation
  // ============================================

  private compileBlock(block: AST.BlockStatement, ctx: CompilerContext): void {
    for (const stmt of block.statements) {
      this.compileStatement(stmt, ctx)
    }
  }

  private compileStatement(stmt: AST.Statement, ctx: CompilerContext): void {
    // Add line marker for visualization
    ctx.instructions.push(createInstruction(OpCode.LINE, [intOperand(stmt.location.line)], stmt.location.line))

    switch (stmt.kind) {
      case 'BlockStatement':
        this.compileBlock(stmt, ctx)
        break
      case 'VariableDeclaration':
        this.compileVariableDeclaration(stmt, ctx)
        break
      case 'ExpressionStatement':
        this.compileExpression(stmt.expression, ctx)
        // Pop result if expression leaves value on stack
        if (this.expressionLeavesValue(stmt.expression)) {
          ctx.instructions.push(createInstruction(OpCode.POP, [], stmt.location.line))
        }
        break
      case 'IfStatement':
        this.compileIfStatement(stmt, ctx)
        break
      case 'WhileStatement':
        this.compileWhileStatement(stmt, ctx)
        break
      case 'ForStatement':
        this.compileForStatement(stmt, ctx)
        break
      case 'ForEachStatement':
        this.compileForEachStatement(stmt, ctx)
        break
      case 'ReturnStatement':
        this.compileReturnStatement(stmt, ctx)
        break
      case 'BreakStatement':
        this.compileBreakStatement(stmt, ctx)
        break
      case 'ContinueStatement':
        this.compileContinueStatement(stmt, ctx)
        break
      case 'ThrowStatement':
        this.compileExpression(stmt.expression, ctx)
        ctx.instructions.push(createInstruction(OpCode.THROW, [], stmt.location.line, 'throw'))
        break
      case 'TryStatement':
        // Compile the try body; catch/finally are simplified for educational purposes
        this.compileBlock(stmt.tryBlock, ctx)
        if (stmt.finallyBlock) {
          this.compileBlock(stmt.finallyBlock, ctx)
        }
        break
      case 'EmptyStatement':
        // No-op
        break
    }
  }

  private compileVariableDeclaration(stmt: AST.VariableDeclaration, ctx: CompilerContext): void {
    const index = ctx.nextLocalIndex++
    ctx.localVariables.set(stmt.name, { index, type: AST.typeToString(stmt.type) })

    if (stmt.initializer) {
      this.compileExpression(stmt.initializer, ctx)
      ctx.instructions.push(createInstruction(
        OpCode.STORE_LOCAL,
        [localOperand(index, stmt.name)],
        stmt.location.line,
        `Store ${stmt.name}`
      ))
    }
  }

  private compileIfStatement(stmt: AST.IfStatement, ctx: CompilerContext): void {
    this.compileExpression(stmt.condition, ctx)

    const elseLabel = ctx.labelCounter++
    const endLabel = ctx.labelCounter++

    ctx.instructions.push(createInstruction(OpCode.IF_FALSE, [labelOperand(elseLabel)], stmt.location.line))

    this.compileStatement(stmt.thenBranch, ctx)

    if (stmt.elseBranch) {
      ctx.instructions.push(createInstruction(OpCode.GOTO, [labelOperand(endLabel)], stmt.location.line))
    }

    // Mark else label position
    this.resolveLabel(ctx, elseLabel)

    if (stmt.elseBranch) {
      this.compileStatement(stmt.elseBranch, ctx)
      this.resolveLabel(ctx, endLabel)
    }
  }

  private compileWhileStatement(stmt: AST.WhileStatement, ctx: CompilerContext): void {
    const startLabel = ctx.labelCounter++
    const endLabel = ctx.labelCounter++

    ctx.loopStartLabels.push(startLabel)
    ctx.loopEndLabels.push(endLabel)

    this.resolveLabel(ctx, startLabel)
    this.compileExpression(stmt.condition, ctx)
    ctx.instructions.push(createInstruction(OpCode.IF_FALSE, [labelOperand(endLabel)], stmt.location.line))

    this.compileStatement(stmt.body, ctx)
    ctx.instructions.push(createInstruction(OpCode.GOTO, [labelOperand(startLabel)], stmt.location.line))

    this.resolveLabel(ctx, endLabel)

    ctx.loopStartLabels.pop()
    ctx.loopEndLabels.pop()
  }

  private compileForStatement(stmt: AST.ForStatement, ctx: CompilerContext): void {
    // Compile initializer
    if (stmt.init) {
      if (stmt.init.kind === 'VariableDeclaration') {
        this.compileVariableDeclaration(stmt.init, ctx)
      } else {
        this.compileExpression(stmt.init, ctx)
        if (this.expressionLeavesValue(stmt.init)) {
          ctx.instructions.push(createInstruction(OpCode.POP, [], stmt.location.line))
        }
      }
    }

    const startLabel = ctx.labelCounter++
    const endLabel = ctx.labelCounter++
    const updateLabel = ctx.labelCounter++

    ctx.loopStartLabels.push(updateLabel)
    ctx.loopEndLabels.push(endLabel)

    this.resolveLabel(ctx, startLabel)

    // Condition
    if (stmt.condition) {
      this.compileExpression(stmt.condition, ctx)
      ctx.instructions.push(createInstruction(OpCode.IF_FALSE, [labelOperand(endLabel)], stmt.location.line))
    }

    // Body
    this.compileStatement(stmt.body, ctx)

    // Update
    this.resolveLabel(ctx, updateLabel)
    if (stmt.update) {
      this.compileExpression(stmt.update, ctx)
      if (this.expressionLeavesValue(stmt.update)) {
        ctx.instructions.push(createInstruction(OpCode.POP, [], stmt.location.line))
      }
    }

    ctx.instructions.push(createInstruction(OpCode.GOTO, [labelOperand(startLabel)], stmt.location.line))
    this.resolveLabel(ctx, endLabel)

    ctx.loopStartLabels.pop()
    ctx.loopEndLabels.pop()
  }

  private compileForEachStatement(stmt: AST.ForEachStatement, ctx: CompilerContext): void {
    // Simplified: compile as iterator-based loop
    // For educational purposes, we treat it similar to a while loop
    const varIndex = ctx.nextLocalIndex++
    ctx.localVariables.set(stmt.variable.name, { index: varIndex, type: AST.typeToString(stmt.variable.type) })

    // Get iterator
    this.compileExpression(stmt.iterable, ctx)
    const iteratorIndex = ctx.nextLocalIndex++
    ctx.instructions.push(createInstruction(
      OpCode.INVOKE_INTERFACE,
      [methodOperand('iterator', '()Ljava/util/Iterator;')],
      stmt.location.line
    ))
    ctx.instructions.push(createInstruction(OpCode.STORE_LOCAL, [localOperand(iteratorIndex, '$iterator')], stmt.location.line))

    const startLabel = ctx.labelCounter++
    const endLabel = ctx.labelCounter++

    ctx.loopStartLabels.push(startLabel)
    ctx.loopEndLabels.push(endLabel)

    this.resolveLabel(ctx, startLabel)

    // Check hasNext
    ctx.instructions.push(createInstruction(OpCode.LOAD_LOCAL, [localOperand(iteratorIndex, '$iterator')], stmt.location.line))
    ctx.instructions.push(createInstruction(
      OpCode.INVOKE_INTERFACE,
      [methodOperand('hasNext', '()Z')],
      stmt.location.line
    ))
    ctx.instructions.push(createInstruction(OpCode.IF_FALSE, [labelOperand(endLabel)], stmt.location.line))

    // Get next element
    ctx.instructions.push(createInstruction(OpCode.LOAD_LOCAL, [localOperand(iteratorIndex, '$iterator')], stmt.location.line))
    ctx.instructions.push(createInstruction(
      OpCode.INVOKE_INTERFACE,
      [methodOperand('next', '()Ljava/lang/Object;')],
      stmt.location.line
    ))
    ctx.instructions.push(createInstruction(OpCode.STORE_LOCAL, [localOperand(varIndex, stmt.variable.name)], stmt.location.line))

    // Body
    this.compileStatement(stmt.body, ctx)

    ctx.instructions.push(createInstruction(OpCode.GOTO, [labelOperand(startLabel)], stmt.location.line))
    this.resolveLabel(ctx, endLabel)

    ctx.loopStartLabels.pop()
    ctx.loopEndLabels.pop()
  }

  private compileReturnStatement(stmt: AST.ReturnStatement, ctx: CompilerContext): void {
    if (stmt.value) {
      this.compileExpression(stmt.value, ctx)
      ctx.instructions.push(createInstruction(OpCode.RETURN_VALUE, [], stmt.location.line))
    } else {
      ctx.instructions.push(createInstruction(OpCode.RETURN, [], stmt.location.line))
    }
  }

  private compileBreakStatement(stmt: AST.BreakStatement, ctx: CompilerContext): void {
    const endLabel = ctx.loopEndLabels[ctx.loopEndLabels.length - 1]
    ctx.instructions.push(createInstruction(OpCode.GOTO, [labelOperand(endLabel)], stmt.location.line))
  }

  private compileContinueStatement(stmt: AST.ContinueStatement, ctx: CompilerContext): void {
    const startLabel = ctx.loopStartLabels[ctx.loopStartLabels.length - 1]
    ctx.instructions.push(createInstruction(OpCode.GOTO, [labelOperand(startLabel)], stmt.location.line))
  }

  // ============================================
  // Expression Compilation
  // ============================================

  private compileExpression(expr: AST.Expression, ctx: CompilerContext): void {
    switch (expr.kind) {
      case 'LiteralExpression':
        this.compileLiteral(expr, ctx)
        break
      case 'IdentifierExpression':
        this.compileIdentifier(expr, ctx)
        break
      case 'BinaryExpression':
        this.compileBinaryExpression(expr, ctx)
        break
      case 'UnaryExpression':
        this.compileUnaryExpression(expr, ctx)
        break
      case 'AssignmentExpression':
        this.compileAssignment(expr, ctx)
        break
      case 'CallExpression':
        this.compileCallExpression(expr, ctx)
        break
      case 'MemberExpression':
        this.compileMemberExpression(expr, ctx)
        break
      case 'NewExpression':
        this.compileNewExpression(expr, ctx)
        break
      case 'NewArrayExpression':
        this.compileNewArrayExpression(expr, ctx)
        break
      case 'ArrayAccessExpression':
        this.compileArrayAccess(expr, ctx)
        break
      case 'ThisExpression':
        ctx.instructions.push(createInstruction(OpCode.LOAD_LOCAL, [localOperand(0, 'this')], expr.location.line))
        break
      case 'LambdaExpression':
        this.compileLambdaExpression(expr, ctx)
        break
      case 'MethodReferenceExpression':
        this.compileMethodReference(expr, ctx)
        break
      case 'ConditionalExpression':
        this.compileConditionalExpression(expr, ctx)
        break
      case 'ParenthesizedExpression':
        this.compileExpression(expr.expression, ctx)
        break
      case 'CastExpression':
        this.compileExpression(expr.expression, ctx)
        ctx.instructions.push(createInstruction(OpCode.CHECKCAST, [typeOperand(AST.typeToString(expr.type))], expr.location.line))
        break
      case 'InstanceOfExpression':
        this.compileExpression(expr.expression, ctx)
        ctx.instructions.push(createInstruction(OpCode.INSTANCEOF, [typeOperand(AST.typeToString(expr.type))], expr.location.line))
        break
    }
  }

  private compileLiteral(expr: AST.LiteralExpression, ctx: CompilerContext): void {
    switch (expr.type) {
      case 'int':
      case 'long':
        ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [intOperand(expr.value as number)], expr.location.line))
        break
      case 'float':
      case 'double':
        ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [{ type: 'float', value: expr.value as number }], expr.location.line))
        break
      case 'boolean':
        ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [{ type: 'boolean', value: expr.value as boolean }], expr.location.line))
        break
      case 'string':
        ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [stringOperand(expr.value as string)], expr.location.line))
        break
      case 'char':
        ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [stringOperand(expr.value as string)], expr.location.line))
        break
      case 'null':
        ctx.instructions.push(createInstruction(OpCode.PUSH_NULL, [], expr.location.line))
        break
    }
  }

  private compileIdentifier(expr: AST.IdentifierExpression, ctx: CompilerContext): void {
    const local = ctx.localVariables.get(expr.name)
    if (local) {
      ctx.instructions.push(createInstruction(OpCode.LOAD_LOCAL, [localOperand(local.index, expr.name)], expr.location.line))
    } else {
      // Assume it's a static field or class reference
      ctx.instructions.push(createInstruction(OpCode.GETSTATIC, [fieldOperand(expr.name, ctx.className)], expr.location.line))
    }
  }

  private compileBinaryExpression(expr: AST.BinaryExpression, ctx: CompilerContext): void {
    this.compileExpression(expr.left, ctx)
    this.compileExpression(expr.right, ctx)

    const opMap: Record<string, OpCode> = {
      '+': OpCode.ADD,
      '-': OpCode.SUB,
      '*': OpCode.MUL,
      '/': OpCode.DIV,
      '%': OpCode.MOD,
      '==': OpCode.CMP_EQ,
      '!=': OpCode.CMP_NE,
      '<': OpCode.CMP_LT,
      '<=': OpCode.CMP_LE,
      '>': OpCode.CMP_GT,
      '>=': OpCode.CMP_GE,
      '&&': OpCode.AND,
      '||': OpCode.OR,
    }

    const opcode = opMap[expr.operator]
    if (opcode) {
      ctx.instructions.push(createInstruction(opcode, [], expr.location.line))
    }
  }

  private compileUnaryExpression(expr: AST.UnaryExpression, ctx: CompilerContext): void {
    if (expr.operator === '++' || expr.operator === '--') {
      // Handle increment/decrement
      if (expr.operand.kind === 'IdentifierExpression') {
        const local = ctx.localVariables.get(expr.operand.name)
        if (local) {
          if (expr.prefix) {
            // ++x: increment first, then load
            ctx.instructions.push(createInstruction(OpCode.LOAD_LOCAL, [localOperand(local.index, expr.operand.name)], expr.location.line))
            ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [intOperand(1)], expr.location.line))
            ctx.instructions.push(createInstruction(expr.operator === '++' ? OpCode.ADD : OpCode.SUB, [], expr.location.line))
            ctx.instructions.push(createInstruction(OpCode.DUP, [], expr.location.line))
            ctx.instructions.push(createInstruction(OpCode.STORE_LOCAL, [localOperand(local.index, expr.operand.name)], expr.location.line))
          } else {
            // x++: load first, then increment
            ctx.instructions.push(createInstruction(OpCode.LOAD_LOCAL, [localOperand(local.index, expr.operand.name)], expr.location.line))
            ctx.instructions.push(createInstruction(OpCode.DUP, [], expr.location.line))
            ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [intOperand(1)], expr.location.line))
            ctx.instructions.push(createInstruction(expr.operator === '++' ? OpCode.ADD : OpCode.SUB, [], expr.location.line))
            ctx.instructions.push(createInstruction(OpCode.STORE_LOCAL, [localOperand(local.index, expr.operand.name)], expr.location.line))
          }
        }
      }
    } else {
      this.compileExpression(expr.operand, ctx)
      if (expr.operator === '-') {
        ctx.instructions.push(createInstruction(OpCode.NEG, [], expr.location.line))
      } else if (expr.operator === '!') {
        ctx.instructions.push(createInstruction(OpCode.NOT, [], expr.location.line))
      }
    }
  }

  private compileAssignment(expr: AST.AssignmentExpression, ctx: CompilerContext): void {
    if (expr.left.kind === 'IdentifierExpression') {
      const local = ctx.localVariables.get(expr.left.name)
      if (local) {
        if (expr.operator === '=') {
          this.compileExpression(expr.right, ctx)
        } else {
          // Compound assignment
          ctx.instructions.push(createInstruction(OpCode.LOAD_LOCAL, [localOperand(local.index, expr.left.name)], expr.location.line))
          this.compileExpression(expr.right, ctx)
          const op = expr.operator.slice(0, -1) // Remove '='
          const opMap: Record<string, OpCode> = { '+': OpCode.ADD, '-': OpCode.SUB, '*': OpCode.MUL, '/': OpCode.DIV }
          ctx.instructions.push(createInstruction(opMap[op], [], expr.location.line))
        }
        ctx.instructions.push(createInstruction(OpCode.DUP, [], expr.location.line))
        ctx.instructions.push(createInstruction(OpCode.STORE_LOCAL, [localOperand(local.index, expr.left.name)], expr.location.line))
      }
    } else if (expr.left.kind === 'MemberExpression') {
      // Field assignment
      this.compileExpression(expr.left.object, ctx)
      this.compileExpression(expr.right, ctx)
      ctx.instructions.push(createInstruction(OpCode.PUTFIELD, [fieldOperand(expr.left.property, '')], expr.location.line))
    } else if (expr.left.kind === 'ArrayAccessExpression') {
      // Array assignment
      this.compileExpression(expr.left.array, ctx)
      this.compileExpression(expr.left.index, ctx)
      this.compileExpression(expr.right, ctx)
      ctx.instructions.push(createInstruction(OpCode.ARRAYSTORE, [], expr.location.line))
    }
  }

  private compileCallExpression(expr: AST.CallExpression, ctx: CompilerContext): void {
    // Handle System.out.println specially
    if (expr.callee.kind === 'MemberExpression') {
      const member = expr.callee
      if (member.property === 'println' || member.property === 'print') {
        if (member.object.kind === 'MemberExpression') {
          const outer = member.object
          if (outer.object.kind === 'IdentifierExpression' && outer.object.name === 'System' && outer.property === 'out') {
            // System.out.println or System.out.print
            const isPrintln = member.property === 'println'
            if (expr.arguments.length > 0) {
              for (const arg of expr.arguments) {
                this.compileExpression(arg, ctx)
              }
            } else {
              // No arguments (e.g., System.out.println())
              // Push an empty string to print nothing but trigger a newline if isPrintln
              ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [stringOperand('')], expr.location.line))
            }

            ctx.instructions.push(createInstruction(
              OpCode.PRINT,
              [{ type: 'boolean', value: isPrintln }],
              expr.location.line,
              `System.out.${member.property}`
            ))
            return
          }
        }
      }

      // Detect static utility class calls: Math.max, Integer.parseInt, etc.
      const STATIC_CLASSES = new Set(['Math', 'Integer', 'Long', 'Double', 'Float', 'Character', 'String', 'Collections', 'Arrays', 'System', 'Objects', 'Boolean', 'Byte', 'Short'])
      if (member.object.kind === 'IdentifierExpression' && STATIC_CLASSES.has(member.object.name)) {
        // Static utility class: emit INVOKE_STATIC with the class name
        for (const arg of expr.arguments) {
          this.compileExpression(arg, ctx)
        }
        ctx.instructions.push(createInstruction(
          OpCode.INVOKE_STATIC,
          [methodOperand(member.property, `(${expr.arguments.length})`), classOperand(member.object.name)],
          expr.location.line
        ))
        return
      }

      // Method call on object
      this.compileExpression(member.object, ctx)
      for (const arg of expr.arguments) {
        this.compileExpression(arg, ctx)
      }
      ctx.instructions.push(createInstruction(
        OpCode.INVOKE_VIRTUAL,
        [methodOperand(member.property, `(${expr.arguments.length})`)],
        expr.location.line
      ))
    } else if (expr.callee.kind === 'IdentifierExpression') {
      // Static method call or local method
      for (const arg of expr.arguments) {
        this.compileExpression(arg, ctx)
      }
      ctx.instructions.push(createInstruction(
        OpCode.INVOKE_STATIC,
        [methodOperand(expr.callee.name, `(${expr.arguments.length})`), classOperand(ctx.className)],
        expr.location.line
      ))
    }
  }

  private compileMemberExpression(expr: AST.MemberExpression, ctx: CompilerContext): void {
    this.compileExpression(expr.object, ctx)
    ctx.instructions.push(createInstruction(OpCode.GETFIELD, [fieldOperand(expr.property, '')], expr.location.line))
  }

  private compileNewExpression(expr: AST.NewExpression, ctx: CompilerContext): void {
    const typeName = AST.typeToString(expr.type)
    ctx.instructions.push(createInstruction(OpCode.NEW, [classOperand(typeName)], expr.location.line))
    ctx.instructions.push(createInstruction(OpCode.DUP, [], expr.location.line))
    for (const arg of expr.arguments) {
      this.compileExpression(arg, ctx)
    }
    ctx.instructions.push(createInstruction(
      OpCode.INVOKE_SPECIAL,
      [methodOperand('<init>', `(${expr.arguments.length})`)],
      expr.location.line
    ))
  }

  private compileNewArrayExpression(expr: AST.NewArrayExpression, ctx: CompilerContext): void {
    if (expr.initializer) {
      ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [intOperand(expr.initializer.length)], expr.location.line))
    } else {
      for (const dim of expr.dimensions) {
        this.compileExpression(dim, ctx)
      }
    }

    const elementType = AST.typeToString(expr.elementType)
    ctx.instructions.push(createInstruction(OpCode.NEWARRAY, [typeOperand(elementType), intOperand(expr.dimensions.length)], expr.location.line))

    if (expr.initializer) {
      for (let i = 0; i < expr.initializer.length; i++) {
        ctx.instructions.push(createInstruction(OpCode.DUP, [], expr.location.line))
        ctx.instructions.push(createInstruction(OpCode.LOAD_CONST, [intOperand(i)], expr.location.line))
        this.compileExpression(expr.initializer[i], ctx)
        ctx.instructions.push(createInstruction(OpCode.ARRAYSTORE, [], expr.location.line))
      }
    }
  }

  private compileArrayAccess(expr: AST.ArrayAccessExpression, ctx: CompilerContext): void {
    this.compileExpression(expr.array, ctx)
    this.compileExpression(expr.index, ctx)
    ctx.instructions.push(createInstruction(OpCode.ARRAYLOAD, [], expr.location.line))
  }

  private compileLambdaExpression(expr: AST.LambdaExpression, ctx: CompilerContext): void {
    // Capture variables from enclosing scope - simplified: just create lambda instruction
    ctx.instructions.push(createInstruction(
      OpCode.LAMBDA_CREATE,
      [stringOperand(JSON.stringify({ params: expr.parameters.map(p => p.name), body: 'lambda' }))],
      expr.location.line,
      'Create lambda expression'
    ))
  }

  private compileMethodReference(expr: AST.MethodReferenceExpression, ctx: CompilerContext): void {
    // Method reference like String::valueOf or obj::method
    if (expr.object.kind === 'TypeNode') {
      ctx.instructions.push(createInstruction(
        OpCode.LAMBDA_CREATE,
        [stringOperand(`${expr.object.name}::${expr.methodName}`)],
        expr.location.line,
        `Method reference ${expr.object.name}::${expr.methodName}`
      ))
    } else {
      this.compileExpression(expr.object as AST.Expression, ctx)
      ctx.instructions.push(createInstruction(
        OpCode.LAMBDA_CREATE,
        [stringOperand(`::${expr.methodName}`)],
        expr.location.line,
        `Method reference ::${expr.methodName}`
      ))
    }
  }

  private compileConditionalExpression(expr: AST.ConditionalExpression, ctx: CompilerContext): void {
    this.compileExpression(expr.condition, ctx)
    const elseLabel = ctx.labelCounter++
    const endLabel = ctx.labelCounter++

    ctx.instructions.push(createInstruction(OpCode.IF_FALSE, [labelOperand(elseLabel)], expr.location.line))
    this.compileExpression(expr.consequent, ctx)
    ctx.instructions.push(createInstruction(OpCode.GOTO, [labelOperand(endLabel)], expr.location.line))
    this.resolveLabel(ctx, elseLabel)
    this.compileExpression(expr.alternate, ctx)
    this.resolveLabel(ctx, endLabel)
  }

  // ============================================
  // Helper Methods
  // ============================================

  private resolveLabel(ctx: CompilerContext, label: number): void {
    ctx.labelTargets.set(label, ctx.instructions.length)
  }

  private resolveAllLabels(ctx: CompilerContext): void {
    for (const instr of ctx.instructions) {
      for (const operand of instr.operands) {
        if (operand.type === 'label') {
          const target = ctx.labelTargets.get(operand.target)
          if (target !== undefined) {
            operand.target = target
          }
        }
      }
    }
  }

  private expressionLeavesValue(expr: AST.Expression): boolean {
    switch (expr.kind) {
      case 'AssignmentExpression':
        return true
      case 'CallExpression':
        return true // Assume methods return something
      case 'UnaryExpression':
        return expr.operator === '++' || expr.operator === '--'
      default:
        return true
    }
  }
}

export function compile(program: AST.Program): CompiledProgram {
  const compiler = new BytecodeCompiler()
  return compiler.compile(program)
}
