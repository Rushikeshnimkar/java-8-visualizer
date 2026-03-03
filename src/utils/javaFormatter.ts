// ============================================
// Simple Java Code Formatter / Prettier
// Handles indentation, spacing, and brace style
// ============================================

export function formatJavaCode(code: string): string {
    const lines = code.split('\n')
    const result: string[] = []
    let indentLevel = 0
    const INDENT = '    ' // 4 spaces

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim()

        // Skip empty lines but preserve a single blank line
        if (line === '') {
            if (result.length > 0 && result[result.length - 1].trim() !== '') {
                result.push('')
            }
            continue
        }

        // Decrease indent before closing braces
        if (line.startsWith('}') || line.startsWith(')')) {
            indentLevel = Math.max(0, indentLevel - 1)
        }

        // Format the line with proper spacing
        line = formatLineSpacing(line)

        // Add indented line
        result.push(INDENT.repeat(indentLevel) + line)

        // Increase indent after opening braces
        const openBraces = (line.match(/\{/g) || []).length
        const closeBraces = (line.match(/\}/g) || []).length
        indentLevel += openBraces - closeBraces

        // Handle case where closing brace was already accounted for above
        if (line.startsWith('}') && openBraces > closeBraces) {
            // e.g. "} else {" — we already decremented, then net +1 from braces
        }

        indentLevel = Math.max(0, indentLevel)
    }

    // Remove trailing empty lines
    while (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop()
    }

    return result.join('\n') + '\n'
}

function formatLineSpacing(line: string): string {
    // Don't format string literals or comments
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        return line
    }

    // Ensure space after keywords
    const keywords = ['if', 'else', 'for', 'while', 'switch', 'catch', 'return', 'throw']
    for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\(`, 'g')
        line = line.replace(regex, `${kw} (`)
    }

    // Ensure space before opening brace
    line = line.replace(/\)\{/g, ') {')
    line = line.replace(/([^\s])\{$/g, '$1 {')

    // Ensure spaces around operators (careful not to break strings)
    // Only apply to simple cases outside of string literals
    line = formatOperators(line)

    return line
}

function formatOperators(line: string): string {
    // Split line into string and non-string parts
    const parts: { text: string; isString: boolean }[] = []
    let current = ''
    let inString = false
    let stringChar = ''

    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (!inString && (ch === '"' || ch === '\'')) {
            if (current) parts.push({ text: current, isString: false })
            current = ch
            inString = true
            stringChar = ch
        } else if (inString && ch === stringChar && line[i - 1] !== '\\') {
            current += ch
            parts.push({ text: current, isString: true })
            current = ''
            inString = false
        } else {
            current += ch
        }
    }
    if (current) parts.push({ text: current, isString: inString })

    // Apply operator spacing only to non-string parts
    return parts.map(p => {
        if (p.isString) return p.text
        let t = p.text
        // Space around = but not ==, !=, <=, >=, +=, -=, *=, /=
        t = t.replace(/(?<![=!<>+\-*/])=(?!=)/g, ' = ')
        // Clean up double spaces
        t = t.replace(/  +/g, ' ')
        return t
    }).join('')
}
