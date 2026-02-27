// ============================================
// Code Editor Component with Monaco
// ============================================

import Editor from '@monaco-editor/react'
import { useExecutionStore } from '../../state/executionStore'
import { useCallback, useRef } from 'react'

export function CodeInput() {
  const { sourceCode, setSourceCode, highlightedLine, jvmState } = useExecutionStore()
  const editorRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor

    // Define custom theme
    monaco.editor.defineTheme('jvm-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'comment', foreground: '6272a4' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'identifier', foreground: 'f8f8f2' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#8b949e',
        'editorCursor.foreground': '#58a6ff',
      },
    })
    monaco.editor.setTheme('jvm-dark')
  }, [])

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
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="java"
        value={sourceCode}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderLineHighlight: 'line',
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          contextmenu: true,
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
