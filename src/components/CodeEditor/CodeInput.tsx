// ============================================
// Code Editor Component with Monaco
// Supports Ctrl+Wheel zoom
// ============================================

import Editor from '@monaco-editor/react'
import { useExecutionStore } from '../../state/executionStore'
import {
  useEditorSettingsStore,
  BUILTIN_THEMES,
} from '../../state/editorSettingsStore'
import { useCallback, useRef, useEffect } from 'react'

export function CodeInput() {
  const { sourceCode, setSourceCode, highlightedLine, jvmState } = useExecutionStore()
  const { fontSize, theme, customThemes, increaseFontSize, decreaseFontSize } =
    useEditorSettingsStore()
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco

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
          mouseWheelZoom: false, // We handle zoom ourselves for better control
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
