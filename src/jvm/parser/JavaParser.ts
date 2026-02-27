// ============================================
// Java Parser - Converts tokens to AST
// ============================================

import { Token, TokenType, tokenize } from './Lexer'
import * as AST from './ASTNodes'

export class ParseError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`${message} at line ${line}, column ${column}`)
    this.name = 'ParseError'
  }
}

export class Parser {
  private tokens: Token[]
  private pos: number = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): AST.Program {
    const declarations: (AST.ClassDeclaration | AST.InterfaceDeclaration)[] = []

    while (!this.isAtEnd()) {
      // Skip package declarations
      if (this.check(TokenType.PACKAGE)) {
        while (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) this.advance()
        if (this.check(TokenType.SEMICOLON)) this.advance()
        continue
      }
      // Skip import declarations
      if (this.check(TokenType.IMPORT)) {
        while (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) this.advance()
        if (this.check(TokenType.SEMICOLON)) this.advance()
        continue
      }
      // Skip annotations like @SuppressWarnings(...) or @Override
      if (this.check(TokenType.AT)) {
        this.advance() // consume @
        if (this.check(TokenType.IDENTIFIER)) this.advance() // annotation name
        if (this.check(TokenType.LPAREN)) {
          let depth = 1
          this.advance()
          while (depth > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.LPAREN)) depth++
            else if (this.check(TokenType.RPAREN)) depth--
            this.advance()
          }
        }
        continue
      }
      const decl = this.parseDeclaration()
      if (decl) {
        declarations.push(decl)
      }
    }

    return {
      kind: 'Program',
      declarations,
      location: { line: 1, column: 1 },
    }
  }

  private parseDeclaration(): AST.ClassDeclaration | AST.InterfaceDeclaration | null {
    const modifiers = this.parseModifiers()

    if (this.check(TokenType.CLASS)) {
      return this.parseClassDeclaration(modifiers)
    }
    if (this.check(TokenType.INTERFACE)) {
      return this.parseInterfaceDeclaration(modifiers)
    }
    // Skip enum declarations by consuming their body
    if (this.check(TokenType.ENUM)) {
      this.advance() // 'enum'
      if (this.check(TokenType.IDENTIFIER)) this.advance() // name
      if (this.check(TokenType.LBRACE)) {
        let depth = 1
        this.advance()
        while (depth > 0 && !this.isAtEnd()) {
          if (this.check(TokenType.LBRACE)) depth++
          else if (this.check(TokenType.RBRACE)) depth--
          this.advance()
        }
      }
      return null
    }

    throw this.error('Expected class or interface declaration')
  }

  private parseModifiers(): string[] {
    const modifiers: string[] = []
    while (this.checkModifier()) {
      modifiers.push(this.advance().value)
    }
    return modifiers
  }

  private checkModifier(): boolean {
    return this.check(TokenType.PUBLIC) ||
      this.check(TokenType.PRIVATE) ||
      this.check(TokenType.PROTECTED) ||
      this.check(TokenType.STATIC) ||
      this.check(TokenType.FINAL) ||
      this.check(TokenType.ABSTRACT) ||
      this.check(TokenType.NATIVE) ||
      this.check(TokenType.SYNCHRONIZED) ||
      this.check(TokenType.TRANSIENT) ||
      this.check(TokenType.VOLATILE)
  }

  private parseClassDeclaration(modifiers: string[]): AST.ClassDeclaration {
    const location = this.currentLocation()
    this.consume(TokenType.CLASS, 'Expected "class"')
    const name = this.consume(TokenType.IDENTIFIER, 'Expected class name').value

    let superClass: string | null = null
    if (this.match(TokenType.EXTENDS)) {
      superClass = this.parseTypeName()
    }

    const interfaces: string[] = []
    if (this.match(TokenType.IMPLEMENTS)) {
      do {
        interfaces.push(this.parseTypeName())
      } while (this.match(TokenType.COMMA))
    }

    this.consume(TokenType.LBRACE, 'Expected "{"')
    const members = this.parseClassMembers(name)
    this.consume(TokenType.RBRACE, 'Expected "}"')

    return {
      kind: 'ClassDeclaration',
      name,
      modifiers,
      superClass,
      interfaces,
      members,
      location,
    }
  }

  private parseInterfaceDeclaration(modifiers: string[]): AST.InterfaceDeclaration {
    const location = this.currentLocation()
    this.consume(TokenType.INTERFACE, 'Expected "interface"')
    const name = this.consume(TokenType.IDENTIFIER, 'Expected interface name').value

    const extendsInterfaces: string[] = []
    if (this.match(TokenType.EXTENDS)) {
      do {
        extendsInterfaces.push(this.parseTypeName())
      } while (this.match(TokenType.COMMA))
    }

    this.consume(TokenType.LBRACE, 'Expected "{"')
    const members = this.parseInterfaceMembers()
    this.consume(TokenType.RBRACE, 'Expected "}"')

    return {
      kind: 'InterfaceDeclaration',
      name,
      modifiers,
      extends: extendsInterfaces,
      members,
      location,
    }
  }

  private parseClassMembers(className: string): AST.ClassMember[] {
    const members: AST.ClassMember[] = []
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      members.push(this.parseClassMember(className))
    }
    return members
  }

  private parseClassMember(className: string): AST.ClassMember {
    const modifiers = this.parseModifiers()
    const location = this.currentLocation()

    // Constructor
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === className && this.peekNext().type === TokenType.LPAREN) {
      return this.parseConstructor(modifiers, location)
    }

    // Method or Field
    const type = this.parseType()
    const name = this.consume(TokenType.IDENTIFIER, 'Expected member name').value

    if (this.check(TokenType.LPAREN)) {
      return this.parseMethod(modifiers, type, name, location)
    } else {
      return this.parseField(modifiers, type, name, location)
    }
  }

  private parseInterfaceMembers(): AST.InterfaceMember[] {
    const members: AST.InterfaceMember[] = []
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      members.push(this.parseInterfaceMember())
    }
    return members
  }

  private parseInterfaceMember(): AST.InterfaceMember {
    const modifiers = this.parseModifiers()
    const location = this.currentLocation()
    const isDefault = modifiers.includes('default')

    const type = this.parseType()
    const name = this.consume(TokenType.IDENTIFIER, 'Expected member name').value

    if (this.check(TokenType.LPAREN)) {
      if (isDefault) {
        return this.parseDefaultMethod(type, name, location)
      }
      return this.parseMethodSignature(type, name, location)
    } else {
      return this.parseField(modifiers, type, name, location)
    }
  }

  private parseConstructor(modifiers: string[], location: AST.SourceLocation): AST.ConstructorDeclaration {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected constructor name').value
    const parameters = this.parseParameters()
    const body = this.parseBlock()

    return {
      kind: 'ConstructorDeclaration',
      name,
      modifiers,
      parameters,
      body,
      location,
    }
  }

  private parseMethod(
    modifiers: string[],
    returnType: AST.TypeNode,
    name: string,
    location: AST.SourceLocation
  ): AST.MethodDeclaration {
    const parameters = this.parseParameters()

    const throwsList: string[] = []
    if (this.match(TokenType.THROWS)) {
      do {
        throwsList.push(this.parseTypeName())
      } while (this.match(TokenType.COMMA))
    }

    let body: AST.BlockStatement | null = null
    if (this.check(TokenType.LBRACE)) {
      body = this.parseBlock()
    } else {
      this.consume(TokenType.SEMICOLON, 'Expected ";" or method body')
    }

    return {
      kind: 'MethodDeclaration',
      name,
      modifiers,
      returnType,
      parameters,
      body,
      throws: throwsList,
      location,
    }
  }

  private parseDefaultMethod(
    returnType: AST.TypeNode,
    name: string,
    location: AST.SourceLocation
  ): AST.DefaultMethodDeclaration {
    const parameters = this.parseParameters()
    const body = this.parseBlock()

    return {
      kind: 'DefaultMethodDeclaration',
      name,
      returnType,
      parameters,
      body,
      location,
    }
  }

  private parseMethodSignature(
    returnType: AST.TypeNode,
    name: string,
    location: AST.SourceLocation
  ): AST.MethodSignature {
    const parameters = this.parseParameters()
    this.consume(TokenType.SEMICOLON, 'Expected ";"')

    return {
      kind: 'MethodSignature',
      name,
      returnType,
      parameters,
      location,
    }
  }

  private parseField(
    modifiers: string[],
    type: AST.TypeNode,
    name: string,
    location: AST.SourceLocation
  ): AST.FieldDeclaration {
    let initializer: AST.Expression | null = null
    if (this.match(TokenType.EQUALS)) {
      initializer = this.parseExpression()
    }
    this.consume(TokenType.SEMICOLON, 'Expected ";"')

    return {
      kind: 'FieldDeclaration',
      name,
      type,
      modifiers,
      initializer,
      location,
    }
  }

  private parseParameters(): AST.Parameter[] {
    this.consume(TokenType.LPAREN, 'Expected "("')
    const parameters: AST.Parameter[] = []

    if (!this.check(TokenType.RPAREN)) {
      do {
        parameters.push(this.parseParameter())
      } while (this.match(TokenType.COMMA))
    }

    this.consume(TokenType.RPAREN, 'Expected ")"')
    return parameters
  }

  private parseParameter(): AST.Parameter {
    const location = this.currentLocation()
    const isFinal = this.match(TokenType.FINAL)
    const type = this.parseType()
    const name = this.consume(TokenType.IDENTIFIER, 'Expected parameter name').value

    return {
      kind: 'Parameter',
      name,
      type,
      isFinal,
      location,
    }
  }

  private parseType(): AST.TypeNode {
    const location = this.currentLocation()
    let name = this.parseTypeName()

    // Handle generic type arguments
    const typeArguments: AST.TypeNode[] = []
    if (this.match(TokenType.LESS)) {
      if (!this.check(TokenType.GREATER)) {
        do {
          if (this.check(TokenType.QUESTION)) {
            this.advance()
            typeArguments.push(AST.createTypeNode('?', this.currentLocation()))
          } else {
            typeArguments.push(this.parseType())
          }
        } while (this.match(TokenType.COMMA))
      }
      this.consume(TokenType.GREATER, 'Expected ">"')
    }

    // Handle array dimensions (only empty brackets like `[]`)
    let arrayDimensions = 0
    let savedPos = this.pos
    while (this.check(TokenType.LBRACKET)) {
      this.advance() // consume [
      if (this.check(TokenType.RBRACKET)) {
        this.advance() // consume ]
        arrayDimensions++
        savedPos = this.pos
      } else {
        this.pos = savedPos // backtrack: not an empty bracket pair, so stop parsing array dimensions
        break
      }
    }

    return {
      kind: 'TypeNode',
      name,
      isArray: arrayDimensions > 0,
      arrayDimensions,
      typeArguments,
      location,
    }
  }

  private parseTypeName(): string {
    let name = ''
    if (this.checkPrimitiveType() || this.check(TokenType.VOID)) {
      name = this.advance().value
    } else {
      name = this.consume(TokenType.IDENTIFIER, 'Expected type name').value
      while (this.match(TokenType.DOT)) {
        name += '.' + this.consume(TokenType.IDENTIFIER, 'Expected identifier').value
      }
    }
    return name
  }

  private checkPrimitiveType(): boolean {
    return this.check(TokenType.INT) ||
      this.check(TokenType.LONG) ||
      this.check(TokenType.SHORT) ||
      this.check(TokenType.BYTE) ||
      this.check(TokenType.DOUBLE) ||
      this.check(TokenType.FLOAT_TYPE) ||
      this.check(TokenType.BOOLEAN_TYPE) ||
      this.check(TokenType.CHAR_TYPE)
  }

  // ============================================
  // Statements
  // ============================================

  private parseBlock(): AST.BlockStatement {
    const location = this.currentLocation()
    this.consume(TokenType.LBRACE, 'Expected "{"')

    const statements: AST.Statement[] = []
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement())
    }

    this.consume(TokenType.RBRACE, 'Expected "}"')

    return {
      kind: 'BlockStatement',
      statements,
      location,
    }
  }

  private parseStatement(): AST.Statement {
    if (this.check(TokenType.LBRACE)) {
      return this.parseBlock()
    }
    if (this.match(TokenType.IF)) {
      return this.parseIfStatement()
    }
    if (this.match(TokenType.WHILE)) {
      return this.parseWhileStatement()
    }
    if (this.match(TokenType.DO)) {
      return this.parseDoWhileStatement()
    }
    if (this.match(TokenType.FOR)) {
      return this.parseForStatement()
    }
    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStatement()
    }
    if (this.match(TokenType.BREAK)) {
      return this.parseBreakStatement()
    }
    if (this.match(TokenType.CONTINUE)) {
      return this.parseContinueStatement()
    }
    if (this.match(TokenType.THROW)) {
      return this.parseThrowStatement()
    }
    // synchronized(expr) { body } - treat body as a regular block
    if (this.match(TokenType.SYNCHRONIZED)) {
      if (this.check(TokenType.LPAREN)) {
        this.advance() // (
        let depth = 1
        while (depth > 0 && !this.isAtEnd()) {
          if (this.check(TokenType.LPAREN)) depth++
          else if (this.check(TokenType.RPAREN)) depth--
          this.advance()
        }
      }
      return this.parseBlock()
    }
    // @annotation before a statement — skip it
    if (this.check(TokenType.AT)) {
      this.advance()
      if (this.check(TokenType.IDENTIFIER)) this.advance()
      if (this.check(TokenType.LPAREN)) {
        let depth = 1; this.advance()
        while (depth > 0 && !this.isAtEnd()) {
          if (this.check(TokenType.LPAREN)) depth++
          else if (this.check(TokenType.RPAREN)) depth--
          this.advance()
        }
      }
      return this.parseStatement()
    }
    if (this.match(TokenType.TRY)) {
      return this.parseTryStatement()
    }
    if (this.match(TokenType.SEMICOLON)) {
      return { kind: 'EmptyStatement', location: this.currentLocation() }
    }

    // Variable declaration or expression statement
    if (this.isVariableDeclaration()) {
      return this.parseVariableDeclaration()
    }

    return this.parseExpressionStatement()
  }

  private isVariableDeclaration(): boolean {
    // Save position
    const savedPos = this.pos

    // Check for final keyword
    if (this.check(TokenType.FINAL)) {
      this.pos = savedPos
      return true
    }

    // Try to parse as type + identifier
    try {
      if (this.checkPrimitiveType() || this.check(TokenType.IDENTIFIER)) {
        this.parseType()
        if (this.check(TokenType.IDENTIFIER)) {
          this.pos = savedPos
          return true
        }
      }
    } catch {
      // Not a variable declaration
    }

    this.pos = savedPos
    return false
  }

  private parseVariableDeclaration(): AST.Statement {
    const location = this.currentLocation()
    const isFinal = this.match(TokenType.FINAL)
    const baseType = this.parseType()

    const parseVarDimensions = (type: AST.TypeNode): AST.TypeNode => {
      let dims = type.arrayDimensions || 0
      let saved = this.pos
      while (this.check(TokenType.LBRACKET)) {
        this.advance()
        if (this.check(TokenType.RBRACKET)) {
          this.advance()
          dims++
          saved = this.pos
        } else {
          this.pos = saved
          break
        }
      }
      return dims > (type.arrayDimensions || 0) ? { ...type, isArray: true, arrayDimensions: dims } : type
    }

    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value
    const varType = parseVarDimensions(baseType)

    let initializer: AST.Expression | null = null
    if (this.match(TokenType.EQUALS)) {
      initializer = this.parseExpression()
    }

    // Support: int a = 0, b = 0;  (multi-variable declaration)
    if (this.check(TokenType.COMMA)) {
      const declarations: AST.VariableDeclaration[] = [
        { kind: 'VariableDeclaration', name, type: varType, isFinal, initializer, location }
      ]
      while (this.match(TokenType.COMMA)) {
        const extraLoc = this.currentLocation()
        const extraName = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value
        const extraVarType = parseVarDimensions(baseType)
        let extraInit: AST.Expression | null = null
        if (this.match(TokenType.EQUALS)) {
          extraInit = this.parseExpression()
        }
        declarations.push({ kind: 'VariableDeclaration', name: extraName, type: extraVarType, isFinal, initializer: extraInit, location: extraLoc })
      }
      this.consume(TokenType.SEMICOLON, 'Expected ";"')
      return { kind: 'BlockStatement', statements: declarations, location } as AST.BlockStatement
    }

    this.consume(TokenType.SEMICOLON, 'Expected ";"')

    return {
      kind: 'VariableDeclaration',
      name,
      type: varType,
      isFinal,
      initializer,
      location,
    }
  }

  private parseExpressionStatement(): AST.ExpressionStatement {
    const location = this.currentLocation()
    const expression = this.parseExpression()
    this.consume(TokenType.SEMICOLON, 'Expected ";"')

    return {
      kind: 'ExpressionStatement',
      expression,
      location,
    }
  }

  private parseIfStatement(): AST.IfStatement {
    const location = this.currentLocation()
    this.consume(TokenType.LPAREN, 'Expected "("')
    const condition = this.parseExpression()
    this.consume(TokenType.RPAREN, 'Expected ")"')

    const thenBranch = this.parseStatement()
    let elseBranch: AST.Statement | null = null
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.parseStatement()
    }

    return {
      kind: 'IfStatement',
      condition,
      thenBranch,
      elseBranch,
      location,
    }
  }

  private parseWhileStatement(): AST.WhileStatement {
    const location = this.currentLocation()
    this.consume(TokenType.LPAREN, 'Expected "("')
    const condition = this.parseExpression()
    this.consume(TokenType.RPAREN, 'Expected ")"')
    const body = this.parseStatement()

    return {
      kind: 'WhileStatement',
      condition,
      body,
      location,
    }
  }

  private parseDoWhileStatement(): AST.WhileStatement {
    const location = this.currentLocation()
    const body = this.parseBlock()
    this.consume(TokenType.WHILE, 'Expected "while"')
    this.consume(TokenType.LPAREN, 'Expected "("')
    const condition = this.parseExpression()
    this.consume(TokenType.RPAREN, 'Expected ")"')
    this.consume(TokenType.SEMICOLON, 'Expected ";"')
    // Reuse WhileStatement AST node for simplicity
    return {
      kind: 'WhileStatement',
      condition,
      body,
      location,
    }
  }

  private parseForStatement(): AST.ForStatement | AST.ForEachStatement {
    const location = this.currentLocation()
    this.consume(TokenType.LPAREN, 'Expected "("')

    // Check for enhanced for loop (for-each)
    if (this.isForEachLoop()) {
      return this.parseForEachStatement(location)
    }

    // Regular for loop
    let init: AST.VariableDeclaration | AST.Expression | null = null
    if (!this.check(TokenType.SEMICOLON)) {
      if (this.isVariableDeclaration()) {
        const varDecl = this.parseVariableDeclarationNoSemicolon()
        init = varDecl
      } else {
        init = this.parseExpression()
      }
    }
    this.consume(TokenType.SEMICOLON, 'Expected ";"')

    let condition: AST.Expression | null = null
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.parseExpression()
    }
    this.consume(TokenType.SEMICOLON, 'Expected ";"')

    let update: AST.Expression | null = null
    if (!this.check(TokenType.RPAREN)) {
      update = this.parseExpression()
    }
    this.consume(TokenType.RPAREN, 'Expected ")"')

    const body = this.parseStatement()

    return {
      kind: 'ForStatement',
      init,
      condition,
      update,
      body,
      location,
    }
  }

  private isForEachLoop(): boolean {
    const savedPos = this.pos
    try {
      if (this.match(TokenType.FINAL)) { /* skip */ }
      this.parseType()
      if (this.check(TokenType.IDENTIFIER)) {
        this.advance()
        if (this.check(TokenType.COLON)) {
          this.pos = savedPos
          return true
        }
      }
    } catch {
      // Not a for-each loop
    }
    this.pos = savedPos
    return false
  }

  private parseForEachStatement(location: AST.SourceLocation): AST.ForEachStatement {
    const isFinal = this.match(TokenType.FINAL)
    const type = this.parseType()
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value
    this.consume(TokenType.COLON, 'Expected ":"')
    const iterable = this.parseExpression()
    this.consume(TokenType.RPAREN, 'Expected ")"')
    const body = this.parseStatement()

    return {
      kind: 'ForEachStatement',
      variable: {
        kind: 'VariableDeclaration',
        name,
        type,
        isFinal,
        initializer: null,
        location,
      },
      iterable,
      body,
      location,
    }
  }

  private parseVariableDeclarationNoSemicolon(): AST.VariableDeclaration {
    const location = this.currentLocation()
    const isFinal = this.match(TokenType.FINAL)
    const type = this.parseType()
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value

    let initializer: AST.Expression | null = null
    if (this.match(TokenType.EQUALS)) {
      initializer = this.parseExpression()
    }

    return {
      kind: 'VariableDeclaration',
      name,
      type,
      isFinal,
      initializer,
      location,
    }
  }

  private parseReturnStatement(): AST.ReturnStatement {
    const location = this.currentLocation()
    let value: AST.Expression | null = null
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.parseExpression()
    }
    this.consume(TokenType.SEMICOLON, 'Expected ";"')

    return {
      kind: 'ReturnStatement',
      value,
      location,
    }
  }

  private parseBreakStatement(): AST.BreakStatement {
    const location = this.currentLocation()
    this.consume(TokenType.SEMICOLON, 'Expected ";"')
    return { kind: 'BreakStatement', location }
  }

  private parseContinueStatement(): AST.ContinueStatement {
    const location = this.currentLocation()
    this.consume(TokenType.SEMICOLON, 'Expected ";"')
    return { kind: 'ContinueStatement', location }
  }

  private parseThrowStatement(): AST.ThrowStatement {
    const location = this.currentLocation()
    const expression = this.parseExpression()
    this.consume(TokenType.SEMICOLON, 'Expected ";"')
    return { kind: 'ThrowStatement', expression, location }
  }

  private parseTryStatement(): AST.TryStatement {
    const location = this.currentLocation()
    const tryBlock = this.parseBlock()

    const catchClauses: AST.CatchClause[] = []
    while (this.match(TokenType.CATCH)) {
      catchClauses.push(this.parseCatchClause())
    }

    let finallyBlock: AST.BlockStatement | null = null
    if (this.match(TokenType.FINALLY)) {
      finallyBlock = this.parseBlock()
    }

    return {
      kind: 'TryStatement',
      tryBlock,
      catchClauses,
      finallyBlock,
      location,
    }
  }

  private parseCatchClause(): AST.CatchClause {
    const location = this.currentLocation()
    this.consume(TokenType.LPAREN, 'Expected "("')
    const parameter = this.parseParameter()
    this.consume(TokenType.RPAREN, 'Expected ")"')
    const body = this.parseBlock()

    return {
      kind: 'CatchClause',
      parameter,
      body,
      location,
    }
  }

  // ============================================
  // Expressions (Precedence Climbing)
  // ============================================

  private parseExpression(): AST.Expression {
    return this.parseAssignment()
  }

  private parseAssignment(): AST.Expression {
    const expr = this.parseConditional()

    if (this.checkAssignmentOperator()) {
      const operator = this.advance().value
      const right = this.parseAssignment()
      return {
        kind: 'AssignmentExpression',
        operator,
        left: expr,
        right,
        location: expr.location,
      }
    }

    return expr
  }

  private checkAssignmentOperator(): boolean {
    return this.check(TokenType.EQUALS) ||
      this.check(TokenType.PLUS_EQUALS) ||
      this.check(TokenType.MINUS_EQUALS) ||
      this.check(TokenType.STAR_EQUALS) ||
      this.check(TokenType.SLASH_EQUALS)
  }

  private parseConditional(): AST.Expression {
    const expr = this.parseOr()

    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseExpression()
      this.consume(TokenType.COLON, 'Expected ":"')
      const alternate = this.parseConditional()
      return {
        kind: 'ConditionalExpression',
        condition: expr,
        consequent,
        alternate,
        location: expr.location,
      }
    }

    return expr
  }

  private parseOr(): AST.Expression {
    let expr = this.parseAnd()

    while (this.match(TokenType.OR)) {
      const right = this.parseAnd()
      expr = {
        kind: 'BinaryExpression',
        operator: '||',
        left: expr,
        right,
        location: expr.location,
      }
    }

    return expr
  }

  private parseAnd(): AST.Expression {
    let expr = this.parseEquality()

    while (this.match(TokenType.AND)) {
      const right = this.parseEquality()
      expr = {
        kind: 'BinaryExpression',
        operator: '&&',
        left: expr,
        right,
        location: expr.location,
      }
    }

    return expr
  }

  private parseEquality(): AST.Expression {
    let expr = this.parseComparison()

    while (this.check(TokenType.EQUALS_EQUALS) || this.check(TokenType.NOT_EQUALS)) {
      const operator = this.advance().value
      const right = this.parseComparison()
      expr = {
        kind: 'BinaryExpression',
        operator,
        left: expr,
        right,
        location: expr.location,
      }
    }

    return expr
  }

  private parseComparison(): AST.Expression {
    let expr = this.parseAdditive()

    while (
      this.check(TokenType.LESS) ||
      this.check(TokenType.LESS_EQUALS) ||
      this.check(TokenType.GREATER) ||
      this.check(TokenType.GREATER_EQUALS) ||
      this.check(TokenType.INSTANCEOF)
    ) {
      if (this.match(TokenType.INSTANCEOF)) {
        const type = this.parseType()
        expr = {
          kind: 'InstanceOfExpression',
          expression: expr,
          type,
          location: expr.location,
        }
      } else {
        const operator = this.advance().value
        const right = this.parseAdditive()
        expr = {
          kind: 'BinaryExpression',
          operator,
          left: expr,
          right,
          location: expr.location,
        }
      }
    }

    return expr
  }

  private parseAdditive(): AST.Expression {
    let expr = this.parseMultiplicative()

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const operator = this.advance().value
      const right = this.parseMultiplicative()
      expr = {
        kind: 'BinaryExpression',
        operator,
        left: expr,
        right,
        location: expr.location,
      }
    }

    return expr
  }

  private parseMultiplicative(): AST.Expression {
    let expr = this.parseUnary()

    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.PERCENT)) {
      const operator = this.advance().value
      const right = this.parseUnary()
      expr = {
        kind: 'BinaryExpression',
        operator,
        left: expr,
        right,
        location: expr.location,
      }
    }

    return expr
  }

  private parseUnary(): AST.Expression {
    if (this.check(TokenType.NOT) || this.check(TokenType.MINUS) || this.check(TokenType.INCREMENT) || this.check(TokenType.DECREMENT)) {
      const location = this.currentLocation()
      const operator = this.advance().value
      const operand = this.parseUnary()
      return {
        kind: 'UnaryExpression',
        operator,
        operand,
        prefix: true,
        location,
      }
    }

    // Cast expression: (Type) expression
    if (this.check(TokenType.LPAREN)) {
      const savedPos = this.pos
      try {
        this.advance() // consume (
        if (this.checkPrimitiveType() || this.check(TokenType.IDENTIFIER)) {
          const type = this.parseType()
          this.consume(TokenType.RPAREN, 'Expected ")"')
          if (!this.check(TokenType.DOT) && !this.check(TokenType.SEMICOLON) && !this.check(TokenType.RPAREN)) {
            const expression = this.parseUnary()
            return {
              kind: 'CastExpression',
              type,
              expression,
              location: type.location,
            }
          }
        }
      } catch {
        // Not a cast expression
      }
      this.pos = savedPos
    }

    return this.parsePostfix()
  }

  private parsePostfix(): AST.Expression {
    let expr = this.parsePrimary()

    while (true) {
      if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, 'Expected property name').value

        // Check for method reference
        if (this.check(TokenType.DOUBLE_COLON)) {
          this.pos-- // Back up to re-parse
          break
        }

        expr = {
          kind: 'MemberExpression',
          object: expr,
          property,
          location: expr.location,
        }
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression()
        this.consume(TokenType.RBRACKET, 'Expected "]"')
        expr = {
          kind: 'ArrayAccessExpression',
          array: expr,
          index,
          location: expr.location,
        }
      } else if (this.match(TokenType.LPAREN)) {
        const args = this.parseArguments()
        expr = {
          kind: 'CallExpression',
          callee: expr,
          arguments: args,
          typeArguments: [],
          location: expr.location,
        }
      } else if (this.match(TokenType.DOUBLE_COLON)) {
        // Method reference
        const methodName = this.check(TokenType.NEW)
          ? this.advance().value
          : this.consume(TokenType.IDENTIFIER, 'Expected method name').value
        expr = {
          kind: 'MethodReferenceExpression',
          object: expr,
          methodName,
          location: expr.location,
        }
      } else if (this.check(TokenType.INCREMENT) || this.check(TokenType.DECREMENT)) {
        const operator = this.advance().value
        expr = {
          kind: 'UnaryExpression',
          operator,
          operand: expr,
          prefix: false,
          location: expr.location,
        }
      } else {
        break
      }
    }

    return expr
  }

  private parsePrimary(): AST.Expression {
    const location = this.currentLocation()

    // Lambda expression: (params) -> body or identifier -> body
    if (this.isLambdaExpression()) {
      return this.parseLambdaExpression()
    }

    if (this.match(TokenType.INTEGER)) {
      return {
        kind: 'LiteralExpression',
        type: 'int',
        value: parseInt(this.previous().value, 10),
        location,
      }
    }

    if (this.match(TokenType.FLOAT)) {
      return {
        kind: 'LiteralExpression',
        type: 'double',
        value: parseFloat(this.previous().value),
        location,
      }
    }

    if (this.match(TokenType.STRING)) {
      return {
        kind: 'LiteralExpression',
        type: 'string',
        value: this.previous().value,
        location,
      }
    }

    if (this.match(TokenType.CHAR)) {
      return {
        kind: 'LiteralExpression',
        type: 'char',
        value: this.previous().value,
        location,
      }
    }

    if (this.match(TokenType.BOOLEAN)) {
      return {
        kind: 'LiteralExpression',
        type: 'boolean',
        value: this.previous().value === 'true',
        location,
      }
    }

    if (this.match(TokenType.NULL)) {
      return {
        kind: 'LiteralExpression',
        type: 'null',
        value: null,
        location,
      }
    }

    if (this.match(TokenType.THIS)) {
      return { kind: 'ThisExpression', location }
    }

    if (this.match(TokenType.SUPER)) {
      return { kind: 'SuperExpression', location }
    }

    if (this.match(TokenType.NEW)) {
      return this.parseNewExpression()
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression()
      this.consume(TokenType.RPAREN, 'Expected ")"')
      return {
        kind: 'ParenthesizedExpression',
        expression: expr,
        location,
      }
    }

    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value

      // Check for method reference on type: TypeName::method
      if (this.check(TokenType.DOUBLE_COLON)) {
        this.advance() // consume ::
        const methodName = this.check(TokenType.NEW)
          ? this.advance().value
          : this.consume(TokenType.IDENTIFIER, 'Expected method name').value
        return {
          kind: 'MethodReferenceExpression',
          object: AST.createTypeNode(name, location),
          methodName,
          location,
        }
      }

      return {
        kind: 'IdentifierExpression',
        name,
        location,
      }
    }

    throw this.error('Expected expression')
  }

  private isLambdaExpression(): boolean {
    const savedPos = this.pos

    try {
      // Single parameter without parens: x -> ...
      if (this.check(TokenType.IDENTIFIER) && this.peekNext().type === TokenType.ARROW) {
        this.pos = savedPos
        return true
      }

      // Parameters with parens: (x, y) -> ... or () -> ...
      if (this.check(TokenType.LPAREN)) {
        this.advance()
        let depth = 1
        while (depth > 0 && !this.isAtEnd()) {
          if (this.check(TokenType.LPAREN)) depth++
          if (this.check(TokenType.RPAREN)) depth--
          this.advance()
        }
        if (this.check(TokenType.ARROW)) {
          this.pos = savedPos
          return true
        }
      }
    } catch {
      // Not a lambda
    }

    this.pos = savedPos
    return false
  }

  private parseLambdaExpression(): AST.LambdaExpression {
    const location = this.currentLocation()
    const parameters: AST.LambdaParameter[] = []

    // Single parameter without parens
    if (this.check(TokenType.IDENTIFIER) && this.peekNext().type === TokenType.ARROW) {
      const name = this.advance().value
      parameters.push({
        kind: 'LambdaParameter',
        name,
        type: null,
        location,
      })
    } else {
      // Parameters with parens
      this.consume(TokenType.LPAREN, 'Expected "("')
      if (!this.check(TokenType.RPAREN)) {
        do {
          const paramLocation = this.currentLocation()
          // Check if type is specified
          let type: AST.TypeNode | null = null
          if (this.checkPrimitiveType() || (this.check(TokenType.IDENTIFIER) && this.peekNext().type === TokenType.IDENTIFIER)) {
            type = this.parseType()
          }
          const name = this.consume(TokenType.IDENTIFIER, 'Expected parameter name').value
          parameters.push({
            kind: 'LambdaParameter',
            name,
            type,
            location: paramLocation,
          })
        } while (this.match(TokenType.COMMA))
      }
      this.consume(TokenType.RPAREN, 'Expected ")"')
    }

    this.consume(TokenType.ARROW, 'Expected "->"')

    // Body can be expression or block
    let body: AST.Expression | AST.BlockStatement
    if (this.check(TokenType.LBRACE)) {
      body = this.parseBlock()
    } else {
      body = this.parseExpression()
    }

    return {
      kind: 'LambdaExpression',
      parameters,
      body,
      location,
    }
  }

  private parseNewExpression(): AST.NewExpression | AST.NewArrayExpression {
    const location = this.currentLocation()
    const type = this.parseType()

    // Array creation
    if (this.check(TokenType.LBRACKET) || type.isArray) {
      const dimensions: AST.Expression[] = []
      while (this.match(TokenType.LBRACKET)) {
        if (!this.check(TokenType.RBRACKET)) {
          dimensions.push(this.parseExpression())
        }
        this.consume(TokenType.RBRACKET, 'Expected "]"')
      }

      // Array initializer
      let initializer: AST.Expression[] | null = null
      if (this.check(TokenType.LBRACE)) {
        initializer = this.parseArrayInitializer()
      }

      return {
        kind: 'NewArrayExpression',
        elementType: type,
        dimensions,
        initializer,
        location,
      }
    }

    // Object creation
    const args = this.check(TokenType.LPAREN) ? (this.advance(), this.parseArguments()) : []

    return {
      kind: 'NewExpression',
      type,
      arguments: args,
      location,
    }
  }

  private parseArrayInitializer(): AST.Expression[] {
    this.consume(TokenType.LBRACE, 'Expected "{"')
    const elements: AST.Expression[] = []

    if (!this.check(TokenType.RBRACE)) {
      do {
        if (this.check(TokenType.LBRACE)) {
          // Nested array initializer - wrap in array expression
          const nested = this.parseArrayInitializer()
          elements.push({
            kind: 'NewArrayExpression',
            elementType: AST.createTypeNode('Object', this.currentLocation()),
            dimensions: [],
            initializer: nested,
            location: this.currentLocation(),
          })
        } else {
          elements.push(this.parseExpression())
        }
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RBRACE))
    }

    this.consume(TokenType.RBRACE, 'Expected "}"')
    return elements
  }

  private parseArguments(): AST.Expression[] {
    const args: AST.Expression[] = []

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression())
      } while (this.match(TokenType.COMMA))
    }

    this.consume(TokenType.RPAREN, 'Expected ")"')
    return args
  }

  // ============================================
  // Helper Methods
  // ============================================

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF
  }

  private peek(): Token {
    return this.tokens[this.pos]
  }

  private peekNext(): Token {
    if (this.pos + 1 >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]
    }
    return this.tokens[this.pos + 1]
  }

  private previous(): Token {
    return this.tokens[this.pos - 1]
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++
    return this.previous()
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type === type
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance()
      return true
    }
    return false
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance()
    throw this.error(message)
  }

  private error(message: string): ParseError {
    const token = this.peek()
    return new ParseError(message, token.line, token.column)
  }

  private currentLocation(): AST.SourceLocation {
    const token = this.peek()
    return { line: token.line, column: token.column }
  }
}

// ============================================
// Public API
// ============================================

export function parse(source: string): AST.Program {
  const tokens = tokenize(source)
  const parser = new Parser(tokens)
  return parser.parse()
}
