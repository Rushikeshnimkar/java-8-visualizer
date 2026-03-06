// ============================================
// Java Language Configuration & Providers
// Registers auto-close, indentation, completions,
// signature help, and hover providers for Monaco
// ============================================

import {
    JAVA_KEYWORDS,
    JAVA_ANNOTATIONS,
    ALL_JAVA_CLASSES,
    resolveType,
    type JavaClassInfo,
    type JavaMethodInfo,
} from './javaCompletions'

/**
 * Call this once in handleEditorDidMount to register
 * all Java language features with Monaco.
 */
export function registerJavaLanguage(monaco: any) {
    registerLanguageConfiguration(monaco)
    registerCompletionProvider(monaco)
    registerSignatureHelpProvider(monaco)
    registerHoverProvider(monaco)
}

// ── Language Configuration ──────────────────────────────────────────────────

function registerLanguageConfiguration(monaco: any) {
    monaco.languages.setLanguageConfiguration('java', {
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/'],
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"', notIn: ['string'] },
            { open: "'", close: "'", notIn: ['string', 'comment'] },
            { open: '<', close: '>', notIn: ['string', 'comment'] },
            { open: '/**', close: ' */', notIn: ['string'] },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '<', close: '>' },
        ],
        indentationRules: {
            increaseIndentPattern: /^.*\{[^}"']*$|^.*\([^)"']*$/,
            decreaseIndentPattern: /^\s*[}\])].*$/,
        },
        onEnterRules: [
            {
                // Auto-indent after opening brace
                beforeText: /^\s*.*\{\s*$/,
                afterText: /^\s*\}/,
                action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
            },
            {
                // Auto-indent after opening brace (no closing on same line)
                beforeText: /^\s*.*\{\s*$/,
                action: { indentAction: monaco.languages.IndentAction.Indent },
            },
            {
                // Continue Javadoc comment
                beforeText: /^\s*\*\s.*$/,
                action: { indentAction: monaco.languages.IndentAction.None, appendText: '* ' },
            },
            {
                // Start Javadoc comment
                beforeText: /^\s*\/\*\*(?!\/).*$/,
                action: { indentAction: monaco.languages.IndentAction.None, appendText: ' * ' },
            },
        ],
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        folding: {
            markers: {
                start: /^\s*\/\/\s*#?region\b/,
                end: /^\s*\/\/\s*#?endregion\b/,
            },
        },
    })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Scan the editor text to find declared variable types for dot-completion.
 * Returns a map of variableName → typeName
 */
function parseVariableTypes(text: string): Map<string, string> {
    const vars = new Map<string, string>()

    // Match: Type varName =    or    Type varName;    or    Type<Generic> varName
    // Also matches: final Type varName, Type[] varName
    const declRegex = /(?:final\s+)?([A-Z]\w*(?:<[^>]*>)?(?:\[\])?)\s+(\w+)\s*[=;,)]/g
    let match
    while ((match = declRegex.exec(text)) !== null) {
        vars.set(match[2], match[1])
    }

    // Match: for (Type item : collection)
    const forEachRegex = /for\s*\(\s*(?:final\s+)?([A-Z]\w*(?:<[^>]*>)?)\s+(\w+)\s*:/g
    while ((match = forEachRegex.exec(text)) !== null) {
        vars.set(match[2], match[1])
    }

    return vars
}

/**
 * Determine what type is before the dot, given the text before cursor.
 */
function getTypeBeforeDot(textBeforeCursor: string, variableTypes: Map<string, string>): JavaClassInfo | undefined {
    // Get the word/expression right before the last dot
    const beforeDot = textBeforeCursor.replace(/\.\s*$/, '')
    const parts = beforeDot.split(/[\s(,;=!&|+\-*/<>?:~^%]+/)
    const lastToken = parts[parts.length - 1]?.trim()

    if (!lastToken) return undefined

    // Check for method chain - if token ends with ), look up return type from known methods
    // For simplicity, try direct type lookup first

    // Check if it's a class name (for static methods) - uppercase first letter
    if (lastToken[0] === lastToken[0].toUpperCase() && /^[A-Z]/.test(lastToken)) {
        const classInfo = resolveType(lastToken)
        if (classInfo) return classInfo
    }

    // Check if it's a variable name
    const varType = variableTypes.get(lastToken)
    if (varType) {
        return resolveType(varType)
    }

    // String literal detection: ends with a quote
    if (/"$/.test(beforeDot.trim())) {
        return resolveType('String')
    }

    return undefined
}

function makeMethodSuggestion(monaco: any, method: JavaMethodInfo, range: any, isStatic: boolean) {
    const hasParams = method.params.length > 0
    return {
        label: {
            label: method.name,
            detail: `(${method.params})`,
            description: method.returnType,
        },
        kind: monaco.languages.CompletionItemKind.Method,
        detail: `${method.returnType} ${method.name}(${method.params})`,
        documentation: { value: `**${method.returnType}** \`${method.name}(${method.params})\`\n\n${method.doc}${isStatic ? '\n\n*(static)*' : ''}` },
        insertText: hasParams ? `${method.name}(\${1})` : `${method.name}()`,
        insertTextRules: hasParams
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
        range,
        sortText: `0_${method.name}`,
    }
}

function makeFieldSuggestion(monaco: any, field: { name: string; type: string; doc: string }, range: any) {
    return {
        label: { label: field.name, description: field.type },
        kind: monaco.languages.CompletionItemKind.Field,
        detail: `${field.type} ${field.name}`,
        documentation: { value: field.doc },
        insertText: field.name,
        range,
        sortText: `0_${field.name}`,
    }
}

// ── Completion Provider ─────────────────────────────────────────────────────

function registerCompletionProvider(monaco: any) {
    monaco.languages.registerCompletionItemProvider('java', {
        triggerCharacters: ['.', '@'],
        provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position)
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            }

            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            })

            const lineContent = model.getLineContent(position.lineNumber)
            const charBeforeWord = lineContent[word.startColumn - 2]

            const suggestions: any[] = []

            // ── DOT completion (e.g. str. or System.) ──
            if (charBeforeWord === '.') {
                const fullText = model.getValue()
                const variableTypes = parseVariableTypes(fullText)
                const textBeforeDot = lineContent.substring(0, word.startColumn - 1)
                const classInfo = getTypeBeforeDot(textBeforeDot, variableTypes)

                if (classInfo) {
                    // Instance methods
                    classInfo.methods.forEach(method => {
                        suggestions.push(makeMethodSuggestion(monaco, method, range, false))
                    })
                    // Static methods (when accessing via class name like Math.abs)
                    if (classInfo.staticMethods) {
                        classInfo.staticMethods.forEach(method => {
                            suggestions.push(makeMethodSuggestion(monaco, method, range, true))
                        })
                    }
                    // Fields
                    if (classInfo.fields) {
                        classInfo.fields.forEach(field => {
                            suggestions.push(makeFieldSuggestion(monaco, field, range))
                        })
                    }
                }

                // System.out. special case
                if (/System\s*\.\s*out\s*\.\s*$/.test(textBeforeDot)) {
                    const ps = resolveType('PrintStream')
                    if (ps) {
                        ps.methods.forEach(method => {
                            suggestions.push(makeMethodSuggestion(monaco, method, range, false))
                        })
                    }
                    return { suggestions }
                }

                return { suggestions }
            }

            // ── @ annotation completion ──
            if (charBeforeWord === '@' || textUntilPosition.trimEnd().endsWith('@')) {
                JAVA_ANNOTATIONS.forEach(ann => {
                    suggestions.push({
                        label: ann.name,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        detail: 'Annotation',
                        documentation: { value: ann.doc },
                        insertText: ann.name.substring(1), // remove @ since user already typed it
                        range,
                        sortText: `0_${ann.name}`,
                    })
                })
                return { suggestions }
            }

            // ── General completions (keywords, types, classes) ──

            // Check if after 'new' keyword → suggest constructors
            const textBefore = lineContent.substring(0, word.startColumn - 1).trimEnd()
            const isAfterNew = /\bnew\s*$/.test(textBefore)

            // Keywords
            if (!isAfterNew) {
                JAVA_KEYWORDS.forEach(kw => {
                    suggestions.push({
                        label: kw,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        detail: 'keyword',
                        insertText: kw,
                        range,
                        sortText: `2_${kw}`,
                    })
                })
            }

            // Classes
            ALL_JAVA_CLASSES.forEach(cls => {
                if (isAfterNew) {
                    // After 'new', suggest constructor
                    suggestions.push({
                        label: { label: cls.name, description: cls.kind },
                        kind: cls.kind === 'interface'
                            ? monaco.languages.CompletionItemKind.Interface
                            : monaco.languages.CompletionItemKind.Class,
                        detail: `${cls.kind} ${cls.name}`,
                        documentation: { value: cls.doc },
                        insertText: `${cls.name}(\${1})`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        sortText: `0_${cls.name}`,
                    })
                } else {
                    suggestions.push({
                        label: { label: cls.name, description: cls.kind },
                        kind: cls.kind === 'interface'
                            ? monaco.languages.CompletionItemKind.Interface
                            : monaco.languages.CompletionItemKind.Class,
                        detail: `${cls.kind} ${cls.name}`,
                        documentation: { value: cls.doc },
                        insertText: cls.name,
                        range,
                        sortText: `1_${cls.name}`,
                    })
                }
            })

            // Word-based suggestions from current document (local variables/methods)
            const fullText = model.getValue()
            const variableTypes = parseVariableTypes(fullText)
            variableTypes.forEach((type, varName) => {
                suggestions.push({
                    label: { label: varName, description: type },
                    kind: monaco.languages.CompletionItemKind.Variable,
                    detail: type,
                    insertText: varName,
                    range,
                    sortText: `0_${varName}`,
                })
            })

            return { suggestions }
        },
    })
}

// ── Signature Help Provider ─────────────────────────────────────────────────

function registerSignatureHelpProvider(monaco: any) {
    monaco.languages.registerSignatureHelpProvider('java', {
        signatureHelpTriggerCharacters: ['(', ','],
        provideSignatureHelp: (model: any, position: any) => {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            })

            // Find the method name before the opening paren
            // e.g. "  System.out.println(" → extract "println"
            // e.g. "  list.add(" → extract "add"
            const methodMatch = textUntilPosition.match(/(\w+)\s*\([^)]*$/)
            if (!methodMatch) return null

            const methodName = methodMatch[1]

            // Count commas to determine active parameter
            const afterParen = textUntilPosition.substring(textUntilPosition.lastIndexOf('(') + 1)
            const activeParameter = (afterParen.match(/,/g) || []).length

            // Search all classes for this method
            const signatures: any[] = []
            for (const cls of ALL_JAVA_CLASSES) {
                const allMethods = [...cls.methods, ...(cls.staticMethods || [])]
                for (const method of allMethods) {
                    if (method.name === methodName) {
                        const params = method.params
                            ? method.params.split(',').map((p: string) => ({
                                label: p.trim(),
                                documentation: '',
                            }))
                            : []

                        signatures.push({
                            label: `${method.returnType} ${cls.name}.${method.name}(${method.params})`,
                            documentation: { value: method.doc },
                            parameters: params,
                        })
                    }
                }
            }

            if (signatures.length === 0) return null

            return {
                value: {
                    signatures,
                    activeSignature: 0,
                    activeParameter,
                },
                dispose: () => { },
            }
        },
    })
}

// ── Hover Provider ──────────────────────────────────────────────────────────

function registerHoverProvider(monaco: any) {
    monaco.languages.registerHoverProvider('java', {
        provideHover: (model: any, position: any) => {
            const word = model.getWordAtPosition(position)
            if (!word) return null

            const hoveredWord = word.word
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            }

            // Check if it's a class name
            const classInfo = resolveType(hoveredWord)
            if (classInfo) {
                const methodCount = classInfo.methods.length + (classInfo.staticMethods?.length || 0)
                return {
                    range,
                    contents: [
                        { value: `**${classInfo.kind}** \`${classInfo.name}\`` },
                        { value: classInfo.doc },
                        { value: `*${methodCount} methods available*` },
                    ],
                }
            }

            // Check keywords
            if (JAVA_KEYWORDS.includes(hoveredWord)) {
                return {
                    range,
                    contents: [
                        { value: `**keyword** \`${hoveredWord}\`` },
                    ],
                }
            }

            // Check if it's a method name — look at context (is there a dot before?)
            const lineContent = model.getLineContent(position.lineNumber)
            const textBefore = lineContent.substring(0, word.startColumn - 1)

            if (textBefore.trimEnd().endsWith('.')) {
                // Try to resolve the type before the dot
                const fullText = model.getValue()
                const variableTypes = parseVariableTypes(fullText)
                const cls = getTypeBeforeDot(textBefore, variableTypes)

                if (cls) {
                    const allMethods = [...cls.methods, ...(cls.staticMethods || [])]
                    const method = allMethods.find(m => m.name === hoveredWord)
                    if (method) {
                        return {
                            range,
                            contents: [
                                { value: `**${cls.name}**.${method.name}` },
                                { value: `\`${method.returnType} ${method.name}(${method.params})\`` },
                                { value: method.doc },
                            ],
                        }
                    }
                }

                // Search all classes for this method name
                for (const c of ALL_JAVA_CLASSES) {
                    const allMethods = [...c.methods, ...(c.staticMethods || [])]
                    const method = allMethods.find(m => m.name === hoveredWord)
                    if (method) {
                        return {
                            range,
                            contents: [
                                { value: `**${c.name}**.${method.name}` },
                                { value: `\`${method.returnType} ${method.name}(${method.params})\`` },
                                { value: method.doc },
                            ],
                        }
                    }
                }
            }

            return null
        },
    })
}
