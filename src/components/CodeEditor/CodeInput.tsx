// ============================================
// Code Editor Component with Monaco
// Supports Ctrl+Wheel zoom + Java snippet completions
// ============================================

import Editor from '@monaco-editor/react'
import { useExecutionStore } from '../../state/executionStore'
import {
  useEditorSettingsStore,
  BUILTIN_THEMES,
} from '../../state/editorSettingsStore'
import { useCallback, useRef, useEffect, MutableRefObject } from 'react'

// ── Snippet definitions ────────────────────────────────────────────────────
const JAVA_SNIPPETS = [
  {
    trigger: 'sout',
    label: 'sout → System.out.println',
    detail: 'Print line to console',
    insert: 'System.out.println(${1});',
  },
  {
    trigger: 'souf',
    label: 'souf → System.out.printf',
    detail: 'Formatted print to console',
    insert: 'System.out.printf("${1}", ${2});',
  },
  {
    trigger: 'main',
    label: 'main → public static void main',
    detail: 'Main method entry point',
    insert: 'public static void main(String[] args) {\n\t${1}\n}',
  },
  {
    trigger: 'psvm',
    label: 'psvm → public static void main',
    detail: 'Main method (IntelliJ style)',
    insert: 'public static void main(String[] args) {\n\t${1}\n}',
  },
  {
    trigger: 'fori',
    label: 'fori → for index loop',
    detail: 'Indexed for loop',
    insert: 'for (int i = 0; i < ${1:n}; i++) {\n\t${2}\n}',
  },
  {
    trigger: 'foreach',
    label: 'foreach → enhanced for loop',
    detail: 'For-each loop',
    insert: 'for (${1:Object} ${2:item} : ${3:collection}) {\n\t${4}\n}',
  },
  {
    trigger: 'while',
    label: 'while → while loop',
    detail: 'While loop',
    insert: 'while (${1:condition}) {\n\t${2}\n}',
  },
  {
    trigger: 'if',
    label: 'if → if statement',
    detail: 'If condition block',
    insert: 'if (${1:condition}) {\n\t${2}\n}',
  },
  {
    trigger: 'ifelse',
    label: 'ifelse → if-else',
    detail: 'If-else branches',
    insert: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',
  },
  {
    trigger: 'switch',
    label: 'switch → switch statement',
    detail: 'Switch / case block',
    insert:
      'switch (${1:variable}) {\n\tcase ${2:VALUE}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}',
  },
  {
    trigger: 'try',
    label: 'try → try-catch',
    detail: 'Try-catch block',
    insert: 'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${3}.printStackTrace();\n}',
  },
  {
    trigger: 'trycf',
    label: 'trycf → try-catch-finally',
    detail: 'Try-catch-finally block',
    insert:
      'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${3}.printStackTrace();\n} finally {\n\t${4}\n}',
  },
  {
    trigger: 'class',
    label: 'class → class declaration',
    detail: 'Public class skeleton',
    insert: 'public class ${1:ClassName} {\n\t${2}\n}',
  },
  {
    trigger: 'interface',
    label: 'interface → interface declaration',
    detail: 'Public interface skeleton',
    insert: 'public interface ${1:InterfaceName} {\n\t${2}\n}',
  },
]

interface CodeInputProps {
  snippetsEnabled?: boolean
  externalEditorRef?: MutableRefObject<any>
}

export function CodeInput({ snippetsEnabled = true, externalEditorRef }: CodeInputProps) {
  const { sourceCode, setSourceCode, highlightedLine, jvmState } = useExecutionStore()
  const { fontSize, theme, customThemes, increaseFontSize, decreaseFontSize } =
    useEditorSettingsStore()
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Use a ref so the completion provider always reads the latest value
  const snippetsEnabledRef = useRef(snippetsEnabled)
  useEffect(() => {
    snippetsEnabledRef.current = snippetsEnabled
    // Also update Monaco editor options so the suggest widget respects the toggle
    if (editorRef.current) {
      editorRef.current.updateOptions({
        quickSuggestions: snippetsEnabled
          ? { other: true, comments: false, strings: false }
          : false,
        suggestOnTriggerCharacters: snippetsEnabled,
      })
    }
  }, [snippetsEnabled])

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco
    if (externalEditorRef) externalEditorRef.current = editor

    // Register all built-in themes
    BUILTIN_THEMES.forEach((t) => {
      monaco.editor.defineTheme(t.id, {
        base: t.base,
        inherit: true,
        rules: t.rules,
        colors: t.colors,
      })
    })

    // Register all custom themes
    customThemes.forEach((t) => {
      monaco.editor.defineTheme(t.id, {
        base: t.base,
        inherit: true,
        rules: [
          { token: 'keyword', foreground: t.colors.keyword.replace('#', '') },
          { token: 'string', foreground: t.colors.string.replace('#', '') },
          { token: 'number', foreground: t.colors.number.replace('#', '') },
          { token: 'comment', foreground: t.colors.comment.replace('#', ''), fontStyle: 'italic' },
          { token: 'type', foreground: t.colors.type.replace('#', '') },
          { token: 'identifier', foreground: t.colors.foreground.replace('#', '') },
        ],
        colors: {
          'editor.background': t.colors.background,
          'editor.foreground': t.colors.foreground,
          'editor.lineHighlightBackground': t.colors.lineHighlight,
          'editor.selectionBackground': t.colors.selection,
          'editorLineNumber.foreground': t.colors.comment,
          'editorCursor.foreground': t.colors.cursor,
        },
      })
    })

    monaco.editor.setTheme(theme)

    // ── Register Java snippet completion provider ──────────────────────────
    monaco.languages.registerCompletionItemProvider('java', {
      triggerCharacters: [],
      provideCompletionItems: (model: any, position: any) => {
        // Bail early if snippets are disabled
        if (!snippetsEnabledRef.current) return { suggestions: [] }

        // Get the word at the cursor to build the replace range
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions = JAVA_SNIPPETS.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: s.detail,
          documentation: s.insert,
          insertText: s.insert,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          // Boost snippets that match the typed word exactly
          sortText: s.trigger,
          filterText: s.trigger,
        }))

        return { suggestions }
      },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+Wheel zoom support
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        if (e.deltaY < 0) {
          increaseFontSize()
        } else if (e.deltaY > 0) {
          decreaseFontSize()
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [increaseFontSize, decreaseFontSize])

  // React to theme changes
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return

    // Re-register custom themes (in case new ones were added)
    customThemes.forEach((t) => {
      monaco.editor.defineTheme(t.id, {
        base: t.base,
        inherit: true,
        rules: [
          { token: 'keyword', foreground: t.colors.keyword.replace('#', '') },
          { token: 'string', foreground: t.colors.string.replace('#', '') },
          { token: 'number', foreground: t.colors.number.replace('#', '') },
          { token: 'comment', foreground: t.colors.comment.replace('#', ''), fontStyle: 'italic' },
          { token: 'type', foreground: t.colors.type.replace('#', '') },
          { token: 'identifier', foreground: t.colors.foreground.replace('#', '') },
        ],
        colors: {
          'editor.background': t.colors.background,
          'editor.foreground': t.colors.foreground,
          'editor.lineHighlightBackground': t.colors.lineHighlight,
          'editor.selectionBackground': t.colors.selection,
          'editorLineNumber.foreground': t.colors.comment,
          'editorCursor.foreground': t.colors.cursor,
        },
      })
    })

    monaco.editor.setTheme(theme)
  }, [theme, customThemes])

  // React to font size changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize })
    }
  }, [fontSize])

  // Update line highlight when execution position changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setSourceCode(value)
    }
  }, [setSourceCode])

  // Highlight current execution line
  if (editorRef.current && highlightedLine > 0 && jvmState.status !== 'idle') {
    const monaco = (window as any).monaco
    if (monaco) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [{
          range: new monaco.Range(highlightedLine, 1, highlightedLine, 1),
          options: {
            isWholeLine: true,
            className: 'bg-jvm-stack/20',
            glyphMarginClassName: 'bg-jvm-stack',
          },
        }]
      )
    }
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="java"
        value={sourceCode}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize,
          fontFamily: "'JetBrains Mono', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 2,
          renderLineHighlight: 'line',
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          contextmenu: true,
          mouseWheelZoom: false,
          snippetSuggestions: 'top', // our snippets appear at the top
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  )
}
