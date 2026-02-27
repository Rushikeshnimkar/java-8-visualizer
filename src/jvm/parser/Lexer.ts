// ============================================
// Java Lexer - Tokenizes Java source code
// ============================================

export enum TokenType {
  // Literals
  INTEGER = 'INTEGER',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  CHAR = 'CHAR',
  BOOLEAN = 'BOOLEAN',
  NULL = 'NULL',

  // Identifiers and Keywords
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  CLASS = 'CLASS',
  INTERFACE = 'INTERFACE',
  EXTENDS = 'EXTENDS',
  IMPLEMENTS = 'IMPLEMENTS',
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  PROTECTED = 'PROTECTED',
  STATIC = 'STATIC',
  FINAL = 'FINAL',
  ABSTRACT = 'ABSTRACT',
  DEFAULT = 'DEFAULT',
  VOID = 'VOID',
  NEW = 'NEW',
  THIS = 'THIS',
  SUPER = 'SUPER',
  RETURN = 'RETURN',
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  WHILE = 'WHILE',
  DO = 'DO',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  SWITCH = 'SWITCH',
  CASE = 'CASE',
  TRY = 'TRY',
  CATCH = 'CATCH',
  FINALLY = 'FINALLY',
  THROW = 'THROW',
  THROWS = 'THROWS',
  INSTANCEOF = 'INSTANCEOF',
  NATIVE = 'NATIVE',
  IMPORT = 'IMPORT',
  PACKAGE = 'PACKAGE',
  SYNCHRONIZED = 'SYNCHRONIZED',
  ENUM = 'ENUM',
  TRANSIENT = 'TRANSIENT',
  VOLATILE = 'VOLATILE',

  // Types
  INT = 'INT',
  LONG = 'LONG',
  SHORT = 'SHORT',
  BYTE = 'BYTE',
  DOUBLE = 'DOUBLE',
  FLOAT_TYPE = 'FLOAT_TYPE',
  BOOLEAN_TYPE = 'BOOLEAN_TYPE',
  CHAR_TYPE = 'CHAR_TYPE',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQUALS = 'EQUALS',
  PLUS_EQUALS = 'PLUS_EQUALS',
  MINUS_EQUALS = 'MINUS_EQUALS',
  STAR_EQUALS = 'STAR_EQUALS',
  SLASH_EQUALS = 'SLASH_EQUALS',
  EQUALS_EQUALS = 'EQUALS_EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  LESS = 'LESS',
  LESS_EQUALS = 'LESS_EQUALS',
  GREATER = 'GREATER',
  GREATER_EQUALS = 'GREATER_EQUALS',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  BITWISE_AND = 'BITWISE_AND',
  BITWISE_OR = 'BITWISE_OR',
  INCREMENT = 'INCREMENT',
  DECREMENT = 'DECREMENT',

  // Java 8 - Lambda
  ARROW = 'ARROW',
  DOUBLE_COLON = 'DOUBLE_COLON',

  // Punctuation
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  QUESTION = 'QUESTION',
  AT = 'AT',

  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  COMMENT = 'COMMENT',
}

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

const KEYWORDS: Record<string, TokenType> = {
  'class': TokenType.CLASS,
  'interface': TokenType.INTERFACE,
  'extends': TokenType.EXTENDS,
  'implements': TokenType.IMPLEMENTS,
  'public': TokenType.PUBLIC,
  'private': TokenType.PRIVATE,
  'protected': TokenType.PROTECTED,
  'static': TokenType.STATIC,
  'final': TokenType.FINAL,
  'abstract': TokenType.ABSTRACT,
  'default': TokenType.DEFAULT,
  'void': TokenType.VOID,
  'new': TokenType.NEW,
  'this': TokenType.THIS,
  'super': TokenType.SUPER,
  'return': TokenType.RETURN,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'for': TokenType.FOR,
  'while': TokenType.WHILE,
  'do': TokenType.DO,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'switch': TokenType.SWITCH,
  'case': TokenType.CASE,
  'try': TokenType.TRY,
  'catch': TokenType.CATCH,
  'finally': TokenType.FINALLY,
  'throw': TokenType.THROW,
  'throws': TokenType.THROWS,
  'instanceof': TokenType.INSTANCEOF,
  'native': TokenType.NATIVE,
  'import': TokenType.IMPORT,
  'package': TokenType.PACKAGE,
  'synchronized': TokenType.SYNCHRONIZED,
  'enum': TokenType.ENUM,
  'transient': TokenType.TRANSIENT,
  'volatile': TokenType.VOLATILE,
  'int': TokenType.INT,
  'long': TokenType.LONG,
  'short': TokenType.SHORT,
  'byte': TokenType.BYTE,
  'double': TokenType.DOUBLE,
  'float': TokenType.FLOAT_TYPE,
  'boolean': TokenType.BOOLEAN_TYPE,
  'char': TokenType.CHAR_TYPE,
  'true': TokenType.BOOLEAN,
  'false': TokenType.BOOLEAN,
  'null': TokenType.NULL,
}

export class Lexer {
  private source: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private tokens: Token[] = []

  constructor(source: string) {
    this.source = source
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken()
    }
    this.tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column })
    return this.tokens
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0'
    return this.source[this.pos]
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '\0'
    return this.source[this.pos + 1]
  }

  private advance(): string {
    const char = this.source[this.pos++]
    if (char === '\n') {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
    return char
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({ type, value, line: this.line, column: this.column - value.length })
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false
    if (this.source[this.pos] !== expected) return false
    this.advance()
    return true
  }

  private scanToken(): void {
    const char = this.advance()

    switch (char) {
      case ' ':
      case '\r':
      case '\t':
        // Skip whitespace
        break
      case '\n':
        // Skip newlines
        break
      case '(':
        this.addToken(TokenType.LPAREN, char)
        break
      case ')':
        this.addToken(TokenType.RPAREN, char)
        break
      case '{':
        this.addToken(TokenType.LBRACE, char)
        break
      case '}':
        this.addToken(TokenType.RBRACE, char)
        break
      case '[':
        this.addToken(TokenType.LBRACKET, char)
        break
      case ']':
        this.addToken(TokenType.RBRACKET, char)
        break
      case ';':
        this.addToken(TokenType.SEMICOLON, char)
        break
      case ',':
        this.addToken(TokenType.COMMA, char)
        break
      case '.':
        this.addToken(TokenType.DOT, char)
        break
      case ':':
        if (this.match(':')) {
          this.addToken(TokenType.DOUBLE_COLON, '::')
        } else {
          this.addToken(TokenType.COLON, char)
        }
        break
      case '?':
        this.addToken(TokenType.QUESTION, char)
        break
      case '@':
        this.addToken(TokenType.AT, char)
        break
      case '+':
        if (this.match('+')) {
          this.addToken(TokenType.INCREMENT, '++')
        } else if (this.match('=')) {
          this.addToken(TokenType.PLUS_EQUALS, '+=')
        } else {
          this.addToken(TokenType.PLUS, char)
        }
        break
      case '-':
        if (this.match('-')) {
          this.addToken(TokenType.DECREMENT, '--')
        } else if (this.match('=')) {
          this.addToken(TokenType.MINUS_EQUALS, '-=')
        } else if (this.match('>')) {
          this.addToken(TokenType.ARROW, '->')
        } else {
          this.addToken(TokenType.MINUS, char)
        }
        break
      case '*':
        if (this.match('=')) {
          this.addToken(TokenType.STAR_EQUALS, '*=')
        } else {
          this.addToken(TokenType.STAR, char)
        }
        break
      case '/':
        if (this.match('/')) {
          // Single line comment
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance()
          }
        } else if (this.match('*')) {
          // Multi-line comment
          while (!this.isAtEnd()) {
            if (this.peek() === '*' && this.peekNext() === '/') {
              this.advance() // consume *
              this.advance() // consume /
              break
            }
            this.advance()
          }
        } else if (this.match('=')) {
          this.addToken(TokenType.SLASH_EQUALS, '/=')
        } else {
          this.addToken(TokenType.SLASH, char)
        }
        break
      case '%':
        this.addToken(TokenType.PERCENT, char)
        break
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQUALS_EQUALS, '==')
        } else {
          this.addToken(TokenType.EQUALS, char)
        }
        break
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NOT_EQUALS, '!=')
        } else {
          this.addToken(TokenType.NOT, char)
        }
        break
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LESS_EQUALS, '<=')
        } else {
          this.addToken(TokenType.LESS, char)
        }
        break
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GREATER_EQUALS, '>=')
        } else {
          this.addToken(TokenType.GREATER, char)
        }
        break
      case '&':
        if (this.match('&')) {
          this.addToken(TokenType.AND, '&&')
        } else {
          this.addToken(TokenType.BITWISE_AND, char)
        }
        break
      case '|':
        if (this.match('|')) {
          this.addToken(TokenType.OR, '||')
        } else {
          this.addToken(TokenType.BITWISE_OR, char)
        }
        break
      case '"':
        this.scanString()
        break
      case "'":
        this.scanChar()
        break
      default:
        if (this.isDigit(char)) {
          this.scanNumber(char)
        } else if (this.isAlpha(char)) {
          this.scanIdentifier(char)
        } else {
          throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${this.column}`)
        }
    }
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9'
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_'
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char)
  }

  private scanString(): void {
    const startColumn = this.column - 1
    let value = ''
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\\') {
        this.advance() // consume backslash
        const escaped = this.advance()
        switch (escaped) {
          case 'n': value += '\n'; break
          case 't': value += '\t'; break
          case 'r': value += '\r'; break
          case '"': value += '"'; break
          case '\\': value += '\\'; break
          default: value += escaped
        }
      } else {
        value += this.advance()
      }
    }
    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.line}`)
    }
    this.advance() // closing quote
    this.tokens.push({ type: TokenType.STRING, value, line: this.line, column: startColumn })
  }

  private scanChar(): void {
    const startColumn = this.column - 1
    let value = ''
    if (this.peek() === '\\') {
      this.advance()
      const escaped = this.advance()
      switch (escaped) {
        case 'n': value = '\n'; break
        case 't': value = '\t'; break
        case 'r': value = '\r'; break
        case "'": value = "'"; break
        case '\\': value = '\\'; break
        default: value = escaped
      }
    } else {
      value = this.advance()
    }
    if (this.peek() !== "'") {
      throw new Error(`Unterminated character literal at line ${this.line}`)
    }
    this.advance() // closing quote
    this.tokens.push({ type: TokenType.CHAR, value, line: this.line, column: startColumn })
  }

  private scanNumber(firstDigit: string): void {
    const startColumn = this.column - 1
    let value = firstDigit
    while (this.isDigit(this.peek())) {
      value += this.advance()
    }
    // Check for floating point
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance() // consume '.'
      while (this.isDigit(this.peek())) {
        value += this.advance()
      }
      // Check for float suffix
      if (this.peek() === 'f' || this.peek() === 'F') {
        this.advance()
      }
      this.tokens.push({ type: TokenType.FLOAT, value, line: this.line, column: startColumn })
    } else {
      // Check for long suffix
      if (this.peek() === 'L' || this.peek() === 'l') {
        this.advance()
      }
      this.tokens.push({ type: TokenType.INTEGER, value, line: this.line, column: startColumn })
    }
  }

  private scanIdentifier(firstChar: string): void {
    const startColumn = this.column - 1
    let value = firstChar
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance()
    }
    // Check if it's a keyword
    const isKeyword = Object.prototype.hasOwnProperty.call(KEYWORDS, value)
    if (isKeyword) {
      this.tokens.push({ type: KEYWORDS[value], value, line: this.line, column: startColumn })
    } else {
      this.tokens.push({ type: TokenType.IDENTIFIER, value, line: this.line, column: startColumn })
    }
  }
}

export function tokenize(source: string): Token[] {
  const lexer = new Lexer(source)
  return lexer.tokenize()
}
