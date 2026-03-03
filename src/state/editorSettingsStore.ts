// ============================================
// Zustand Store for Editor Settings
// Persisted to localStorage
// ============================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Custom Theme Shape ──────────────────────
export interface CustomThemeColors {
    background: string
    foreground: string
    keyword: string
    string: string
    number: string
    comment: string
    type: string
    lineHighlight: string
    selection: string
    cursor: string
}

export interface CustomTheme {
    id: string
    name: string
    base: 'vs-dark' | 'vs'
    colors: CustomThemeColors
}

// ── Built-in Theme Definitions ─────────────
export interface BuiltinTheme {
    id: string
    name: string
    base: 'vs-dark' | 'vs'
    preview: { bg: string; fg: string; accent: string }
    rules: { token: string; foreground: string; fontStyle?: string }[]
    colors: Record<string, string>
}

export const BUILTIN_THEMES: BuiltinTheme[] = [
    {
        id: 'jvm-dark',
        name: 'JVM Dark',
        base: 'vs-dark',
        preview: { bg: '#0d1117', fg: '#c9d1d9', accent: '#ff79c6' },
        rules: [
            { token: 'keyword', foreground: 'ff79c6' },
            { token: 'string', foreground: 'f1fa8c' },
            { token: 'number', foreground: 'bd93f9' },
            { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
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
    },
    {
        id: 'monokai',
        name: 'Monokai',
        base: 'vs-dark',
        preview: { bg: '#272822', fg: '#f8f8f2', accent: '#f92672' },
        rules: [
            { token: 'keyword', foreground: 'f92672' },
            { token: 'string', foreground: 'e6db74' },
            { token: 'number', foreground: 'ae81ff' },
            { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
            { token: 'type', foreground: '66d9ef' },
            { token: 'identifier', foreground: 'f8f8f2' },
        ],
        colors: {
            'editor.background': '#272822',
            'editor.foreground': '#f8f8f2',
            'editor.lineHighlightBackground': '#3e3d32',
            'editor.selectionBackground': '#49483e',
            'editorLineNumber.foreground': '#90908a',
            'editorCursor.foreground': '#f8f8f0',
        },
    },
    {
        id: 'github-dark',
        name: 'GitHub Dark',
        base: 'vs-dark',
        preview: { bg: '#0d1117', fg: '#c9d1d9', accent: '#79c0ff' },
        rules: [
            { token: 'keyword', foreground: 'ff7b72' },
            { token: 'string', foreground: 'a5d6ff' },
            { token: 'number', foreground: '79c0ff' },
            { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
            { token: 'type', foreground: 'ffa657' },
            { token: 'identifier', foreground: 'c9d1d9' },
        ],
        colors: {
            'editor.background': '#0d1117',
            'editor.foreground': '#c9d1d9',
            'editor.lineHighlightBackground': '#161b22',
            'editor.selectionBackground': '#1f6feb44',
            'editorLineNumber.foreground': '#6e7681',
            'editorCursor.foreground': '#58a6ff',
        },
    },
    {
        id: 'solarized-dark',
        name: 'Solarized Dark',
        base: 'vs-dark',
        preview: { bg: '#002b36', fg: '#839496', accent: '#b58900' },
        rules: [
            { token: 'keyword', foreground: '859900' },
            { token: 'string', foreground: '2aa198' },
            { token: 'number', foreground: 'd33682' },
            { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
            { token: 'type', foreground: 'b58900' },
            { token: 'identifier', foreground: '839496' },
        ],
        colors: {
            'editor.background': '#002b36',
            'editor.foreground': '#839496',
            'editor.lineHighlightBackground': '#073642',
            'editor.selectionBackground': '#274642',
            'editorLineNumber.foreground': '#586e75',
            'editorCursor.foreground': '#d30102',
        },
    },
    {
        id: 'nord',
        name: 'Nord',
        base: 'vs-dark',
        preview: { bg: '#2e3440', fg: '#d8dee9', accent: '#81a1c1' },
        rules: [
            { token: 'keyword', foreground: '81a1c1' },
            { token: 'string', foreground: 'a3be8c' },
            { token: 'number', foreground: 'b48ead' },
            { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
            { token: 'type', foreground: '8fbcbb' },
            { token: 'identifier', foreground: 'd8dee9' },
        ],
        colors: {
            'editor.background': '#2e3440',
            'editor.foreground': '#d8dee9',
            'editor.lineHighlightBackground': '#3b4252',
            'editor.selectionBackground': '#434c5e',
            'editorLineNumber.foreground': '#4c566a',
            'editorCursor.foreground': '#d8dee9',
        },
    },
    {
        id: 'dracula',
        name: 'Dracula',
        base: 'vs-dark',
        preview: { bg: '#282a36', fg: '#f8f8f2', accent: '#bd93f9' },
        rules: [
            { token: 'keyword', foreground: 'ff79c6' },
            { token: 'string', foreground: 'f1fa8c' },
            { token: 'number', foreground: 'bd93f9' },
            { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
            { token: 'type', foreground: '8be9fd' },
            { token: 'identifier', foreground: 'f8f8f2' },
        ],
        colors: {
            'editor.background': '#282a36',
            'editor.foreground': '#f8f8f2',
            'editor.lineHighlightBackground': '#44475a',
            'editor.selectionBackground': '#44475a',
            'editorLineNumber.foreground': '#6272a4',
            'editorCursor.foreground': '#f8f8f2',
        },
    },
    {
        id: 'one-dark-pro',
        name: 'One Dark Pro',
        base: 'vs-dark',
        preview: { bg: '#282c34', fg: '#abb2bf', accent: '#c678dd' },
        rules: [
            { token: 'keyword', foreground: 'c678dd' },
            { token: 'string', foreground: '98c379' },
            { token: 'number', foreground: 'd19a66' },
            { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
            { token: 'type', foreground: 'e5c07b' },
            { token: 'identifier', foreground: 'abb2bf' },
        ],
        colors: {
            'editor.background': '#282c34',
            'editor.foreground': '#abb2bf',
            'editor.lineHighlightBackground': '#2c313c',
            'editor.selectionBackground': '#3e4451',
            'editorLineNumber.foreground': '#495162',
            'editorCursor.foreground': '#528bff',
        },
    },
    {
        id: 'vs-light',
        name: 'Light',
        base: 'vs',
        preview: { bg: '#ffffff', fg: '#000000', accent: '#0000ff' },
        rules: [
            { token: 'keyword', foreground: '0000ff' },
            { token: 'string', foreground: 'a31515' },
            { token: 'number', foreground: '098658' },
            { token: 'comment', foreground: '008000', fontStyle: 'italic' },
            { token: 'type', foreground: '267f99' },
            { token: 'identifier', foreground: '001080' },
        ],
        colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#000000',
            'editor.lineHighlightBackground': '#f3f3f3',
            'editor.selectionBackground': '#add6ff',
            'editorLineNumber.foreground': '#237893',
            'editorCursor.foreground': '#000000',
        },
    },
]

// ── Store Interface ────────────────────────
interface EditorSettingsStore {
    fontSize: number
    theme: string
    customThemes: CustomTheme[]

    increaseFontSize: () => void
    decreaseFontSize: () => void
    setFontSize: (size: number) => void
    setTheme: (themeId: string) => void
    addCustomTheme: (theme: CustomTheme) => void
    deleteCustomTheme: (themeId: string) => void
}

const MIN_FONT = 10
const MAX_FONT = 24

export const useEditorSettingsStore = create<EditorSettingsStore>()(
    persist(
        (set, get) => ({
            fontSize: 14,
            theme: 'jvm-dark',
            customThemes: [],

            increaseFontSize: () => {
                const { fontSize } = get()
                if (fontSize < MAX_FONT) set({ fontSize: fontSize + 1 })
            },

            decreaseFontSize: () => {
                const { fontSize } = get()
                if (fontSize > MIN_FONT) set({ fontSize: fontSize - 1 })
            },

            setFontSize: (size: number) => {
                set({ fontSize: Math.max(MIN_FONT, Math.min(MAX_FONT, size)) })
            },

            setTheme: (themeId: string) => {
                set({ theme: themeId })
            },

            addCustomTheme: (theme: CustomTheme) => {
                const { customThemes } = get()
                // Replace if same id exists
                const filtered = customThemes.filter((t) => t.id !== theme.id)
                set({ customThemes: [...filtered, theme] })
            },

            deleteCustomTheme: (themeId: string) => {
                const { customThemes, theme } = get()
                set({
                    customThemes: customThemes.filter((t) => t.id !== themeId),
                    // If the deleted theme was active, fall back to default
                    theme: theme === themeId ? 'jvm-dark' : theme,
                })
            },
        }),
        {
            name: 'editor-settings',
        }
    )
)
