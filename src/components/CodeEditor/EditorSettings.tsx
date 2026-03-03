// ============================================
// Editor Settings Panel — Bottom Bar Style
// Compact bar at bottom with expandable panels
// ============================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    useEditorSettingsStore,
    BUILTIN_THEMES,
    CustomTheme,
    CustomThemeColors,
} from '../../state/editorSettingsStore'

const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    keyword: '#cba6f7',
    string: '#a6e3a1',
    number: '#fab387',
    comment: '#6c7086',
    type: '#89dceb',
    lineHighlight: '#313244',
    selection: '#45475a',
    cursor: '#f5e0dc',
}

type SettingsView = 'none' | 'themes' | 'custom'

export function EditorSettingsBar() {
    const {
        fontSize,
        theme,
        customThemes,
        increaseFontSize,
        decreaseFontSize,
        setTheme,
        addCustomTheme,
        deleteCustomTheme,
    } = useEditorSettingsStore()

    const [activeView, setActiveView] = useState<SettingsView>('none')
    const [newThemeName, setNewThemeName] = useState('')
    const [newThemeBase, setNewThemeBase] = useState<'vs-dark' | 'vs'>('vs-dark')
    const [newThemeColors, setNewThemeColors] = useState<CustomThemeColors>(DEFAULT_CUSTOM_COLORS)

    const activeTheme = BUILTIN_THEMES.find((t) => t.id === theme) ||
        customThemes.find((t) => t.id === theme)

    const toggleView = (view: SettingsView) => {
        setActiveView((prev) => (prev === view ? 'none' : view))
    }

    const handleSaveCustomTheme = () => {
        if (!newThemeName.trim()) return
        const id = `custom-${newThemeName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        const customTheme: CustomTheme = {
            id,
            name: newThemeName.trim(),
            base: newThemeBase,
            colors: { ...newThemeColors },
        }
        addCustomTheme(customTheme)
        setTheme(id)
        setNewThemeName('')
        setNewThemeColors(DEFAULT_CUSTOM_COLORS)
        setActiveView('themes')
    }

    const updateColor = (key: keyof CustomThemeColors, value: string) => {
        setNewThemeColors((prev) => ({ ...prev, [key]: value }))
    }

    return (
        <div className="flex-shrink-0 border-t border-dark-border">
            {/* ── Expandable Panels (slide up above the bar) ── */}
            <AnimatePresence>
                {activeView === 'themes' && (
                    <motion.div
                        key="themes-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden border-b border-dark-border bg-dark-bg/80 backdrop-blur-sm"
                    >
                        <div className="p-3 space-y-3 max-h-[280px] overflow-y-auto">
                            {/* Built-in Themes */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-dark-muted uppercase tracking-wider font-semibold">
                                        Built-in Themes
                                    </span>
                                    <button
                                        onClick={() => setActiveView('custom')}
                                        className="text-xs text-dark-accent hover:text-dark-accent/80 transition-colors flex items-center gap-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Create Custom
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {BUILTIN_THEMES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={`group relative flex items-center gap-2 px-2 py-2 rounded-md text-xs transition-all ${theme === t.id
                                                    ? 'bg-dark-accent/15 ring-1 ring-dark-accent text-dark-accent'
                                                    : 'bg-dark-card/60 hover:bg-dark-card text-dark-text hover:ring-1 hover:ring-dark-border'
                                                }`}
                                        >
                                            <div className="flex gap-0.5 flex-shrink-0">
                                                <div className="w-3 h-3 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: t.preview.bg }} />
                                                <div className="w-3 h-3 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: t.preview.accent }} />
                                                <div className="w-3 h-3 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: t.preview.fg }} />
                                            </div>
                                            <span className="truncate">{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Themes */}
                            {customThemes.length > 0 && (
                                <div>
                                    <span className="text-xs text-dark-muted uppercase tracking-wider font-semibold block mb-2">
                                        Custom Themes
                                    </span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {customThemes.map((t) => (
                                            <div
                                                key={t.id}
                                                className={`group relative flex items-center gap-2 px-2 py-2 rounded-md text-xs transition-all ${theme === t.id
                                                        ? 'bg-dark-accent/15 ring-1 ring-dark-accent text-dark-accent'
                                                        : 'bg-dark-card/60 hover:bg-dark-card text-dark-text hover:ring-1 hover:ring-dark-border'
                                                    }`}
                                            >
                                                <button
                                                    onClick={() => setTheme(t.id)}
                                                    className="flex items-center gap-2 flex-1 min-w-0"
                                                >
                                                    <div className="flex gap-0.5 flex-shrink-0">
                                                        <div className="w-3 h-3 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: t.colors.background }} />
                                                        <div className="w-3 h-3 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: t.colors.keyword }} />
                                                        <div className="w-3 h-3 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: t.colors.foreground }} />
                                                    </div>
                                                    <span className="truncate">{t.name}</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteCustomTheme(t.id)
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-dark-error hover:text-red-400 transition-all flex-shrink-0 p-0.5"
                                                    title="Delete theme"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeView === 'custom' && (
                    <motion.div
                        key="custom-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden border-b border-dark-border bg-dark-bg/80 backdrop-blur-sm"
                    >
                        <div className="p-4 max-h-[400px] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setActiveView('themes')}
                                        className="p-1 rounded hover:bg-dark-border/50 text-dark-muted hover:text-dark-text transition-colors"
                                        title="Back to themes"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h3 className="text-sm font-semibold text-dark-text">Create Custom Theme</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* ── Left: Color Pickers ── */}
                                <div className="space-y-3">
                                    {/* Theme Name & Base */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newThemeName}
                                            onChange={(e) => setNewThemeName(e.target.value)}
                                            placeholder="Theme name..."
                                            className="flex-1 px-2.5 py-1.5 bg-dark-card border border-dark-border rounded-md text-sm text-dark-text placeholder-dark-muted focus:border-dark-accent focus:outline-none focus:ring-1 focus:ring-dark-accent/30 transition-all"
                                        />
                                        <select
                                            value={newThemeBase}
                                            onChange={(e) => setNewThemeBase(e.target.value as 'vs-dark' | 'vs')}
                                            className="px-2 py-1.5 bg-dark-card border border-dark-border rounded-md text-sm text-dark-text focus:border-dark-accent focus:outline-none transition-all"
                                        >
                                            <option value="vs-dark">Dark</option>
                                            <option value="vs">Light</option>
                                        </select>
                                    </div>

                                    {/* Editor Colors Group */}
                                    <div className="bg-dark-card/50 rounded-lg p-3 space-y-2">
                                        <span className="text-xs text-dark-muted uppercase tracking-wider font-semibold block">
                                            Editor Colors
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            <ColorField label="Background" color={newThemeColors.background} onChange={(v) => updateColor('background', v)} />
                                            <ColorField label="Foreground" color={newThemeColors.foreground} onChange={(v) => updateColor('foreground', v)} />
                                            <ColorField label="Line Highlight" color={newThemeColors.lineHighlight} onChange={(v) => updateColor('lineHighlight', v)} />
                                            <ColorField label="Selection" color={newThemeColors.selection} onChange={(v) => updateColor('selection', v)} />
                                            <ColorField label="Cursor" color={newThemeColors.cursor} onChange={(v) => updateColor('cursor', v)} />
                                        </div>
                                    </div>

                                    {/* Syntax Colors Group */}
                                    <div className="bg-dark-card/50 rounded-lg p-3 space-y-2">
                                        <span className="text-xs text-dark-muted uppercase tracking-wider font-semibold block">
                                            Syntax Colors
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            <ColorField label="Keywords" color={newThemeColors.keyword} onChange={(v) => updateColor('keyword', v)} />
                                            <ColorField label="Strings" color={newThemeColors.string} onChange={(v) => updateColor('string', v)} />
                                            <ColorField label="Numbers" color={newThemeColors.number} onChange={(v) => updateColor('number', v)} />
                                            <ColorField label="Comments" color={newThemeColors.comment} onChange={(v) => updateColor('comment', v)} />
                                            <ColorField label="Types" color={newThemeColors.type} onChange={(v) => updateColor('type', v)} />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Right: Live Preview ── */}
                                <div className="space-y-3">
                                    <span className="text-xs text-dark-muted uppercase tracking-wider font-semibold block">
                                        Live Preview
                                    </span>
                                    <div
                                        className="rounded-lg overflow-hidden border border-dark-border font-mono text-sm leading-relaxed"
                                        style={{ backgroundColor: newThemeColors.background }}
                                    >
                                        {/* Fake title bar */}
                                        <div
                                            className="px-3 py-1.5 flex items-center gap-1.5 border-b"
                                            style={{
                                                borderColor: newThemeColors.selection,
                                                backgroundColor: newThemeColors.lineHighlight,
                                            }}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500/80" />
                                            <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
                                            <div className="w-2 h-2 rounded-full bg-green-500/80" />
                                            <span className="ml-2 text-xs" style={{ color: newThemeColors.comment }}>
                                                Demo.java
                                            </span>
                                        </div>

                                        {/* Code lines with line numbers */}
                                        <div className="p-3 space-y-0.5">
                                            <PreviewLine num={1} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span style={{ color: newThemeColors.comment }}>{'// Custom Theme Preview'}</span>
                                            </PreviewLine>
                                            <PreviewLine num={2} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span style={{ color: newThemeColors.keyword }}>public class </span>
                                                <span style={{ color: newThemeColors.type }}>Demo</span>
                                                <span style={{ color: newThemeColors.foreground }}>{' {'}</span>
                                            </PreviewLine>
                                            <PreviewLine num={3} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span>{'  '}</span>
                                                <span style={{ color: newThemeColors.keyword }}>private </span>
                                                <span style={{ color: newThemeColors.type }}>String</span>
                                                <span style={{ color: newThemeColors.foreground }}> name = </span>
                                                <span style={{ color: newThemeColors.string }}>"Hello World"</span>
                                                <span style={{ color: newThemeColors.foreground }}>;</span>
                                            </PreviewLine>
                                            <PreviewLine num={4} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span>{'  '}</span>
                                                <span style={{ color: newThemeColors.keyword }}>static </span>
                                                <span style={{ color: newThemeColors.type }}>int</span>
                                                <span style={{ color: newThemeColors.foreground }}> count = </span>
                                                <span style={{ color: newThemeColors.number }}>42</span>
                                                <span style={{ color: newThemeColors.foreground }}>;</span>
                                            </PreviewLine>
                                            <PreviewLine num={5} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span style={{ color: newThemeColors.foreground }}>{''}</span>
                                            </PreviewLine>
                                            <PreviewLine num={6} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment} highlight>
                                                <span>{'  '}</span>
                                                <span style={{ color: newThemeColors.keyword }}>public void </span>
                                                <span style={{ color: newThemeColors.foreground }}>greet</span>
                                                <span style={{ color: newThemeColors.foreground }}>(</span>
                                                <span style={{ color: newThemeColors.type }}>String</span>
                                                <span style={{ color: newThemeColors.foreground }}> user) {'{'}</span>
                                            </PreviewLine>
                                            <PreviewLine num={7} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span>{'    '}</span>
                                                <span style={{ color: newThemeColors.keyword }}>if </span>
                                                <span style={{ color: newThemeColors.foreground }}>(user != </span>
                                                <span style={{ color: newThemeColors.keyword }}>null</span>
                                                <span style={{ color: newThemeColors.foreground }}>) {'{'}</span>
                                            </PreviewLine>
                                            <PreviewLine num={8} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span>{'      '}</span>
                                                <span style={{ color: newThemeColors.foreground }}>System.out.println(</span>
                                                <span style={{ color: newThemeColors.string }}>"Hi, "</span>
                                                <span style={{ color: newThemeColors.foreground }}> + user);</span>
                                            </PreviewLine>
                                            <PreviewLine num={9} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span>{'    '}</span>
                                                <span style={{ color: newThemeColors.foreground }}>{'}'}</span>
                                            </PreviewLine>
                                            <PreviewLine num={10} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span>{'  '}</span>
                                                <span style={{ color: newThemeColors.foreground }}>{'}'}</span>
                                            </PreviewLine>
                                            <PreviewLine num={11} lineHighlight={newThemeColors.lineHighlight} commentColor={newThemeColors.comment}>
                                                <span style={{ color: newThemeColors.foreground }}>{'}'}</span>
                                            </PreviewLine>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button
                                            onClick={() => {
                                                setActiveView('themes')
                                                setNewThemeName('')
                                                setNewThemeColors(DEFAULT_CUSTOM_COLORS)
                                            }}
                                            className="px-4 py-1.5 text-xs rounded-md bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveCustomTheme}
                                            disabled={!newThemeName.trim()}
                                            className="px-4 py-1.5 text-xs rounded-md bg-dark-accent hover:bg-dark-accent/80 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                                        >
                                            Save Theme
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Bottom Bar (always visible) ── */}
            <div className="flex items-center justify-between px-3 py-1 bg-dark-card/80 backdrop-blur-sm">
                {/* Left: Zoom controls */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-dark-bg rounded-md border border-dark-border overflow-hidden">
                        <button
                            onClick={decreaseFontSize}
                            className="px-1.5 py-0.5 text-xs text-dark-muted hover:text-dark-text hover:bg-dark-border/50 transition-colors"
                            title="Decrease font size (Ctrl+Scroll down)"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <span className="px-1.5 text-xs font-mono text-dark-muted min-w-[28px] text-center border-x border-dark-border">
                            {fontSize}
                        </span>
                        <button
                            onClick={increaseFontSize}
                            className="px-1.5 py-0.5 text-xs text-dark-muted hover:text-dark-text hover:bg-dark-border/50 transition-colors"
                            title="Increase font size (Ctrl+Scroll up)"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                    <span className="text-xs text-dark-muted hidden sm:inline">Ctrl+Scroll to zoom</span>
                </div>

                {/* Right: Theme selector */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toggleView('themes')}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${activeView !== 'none'
                                ? 'bg-dark-accent/15 text-dark-accent ring-1 ring-dark-accent/30'
                                : 'text-dark-muted hover:text-dark-text hover:bg-dark-border/30'
                            }`}
                    >
                        {/* Current theme swatch */}
                        {activeTheme && (
                            <div className="flex gap-0.5">
                                {'preview' in activeTheme ? (
                                    <>
                                        <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: (activeTheme as any).preview.bg }} />
                                        <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: (activeTheme as any).preview.accent }} />
                                    </>
                                ) : (
                                    <>
                                        <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: (activeTheme as any).colors.background }} />
                                        <div className="w-2.5 h-2.5 rounded-sm ring-1 ring-white/10" style={{ backgroundColor: (activeTheme as any).colors.keyword }} />
                                    </>
                                )}
                            </div>
                        )}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        Theme
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Helpers ─────────────────────────────

function ColorField({
    label,
    color,
    onChange,
}: {
    label: string
    color: string
    onChange: (v: string) => void
}) {
    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-shrink-0">
                <input
                    type="color"
                    value={color}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className="w-6 h-6 rounded-md ring-1 ring-white/15 shadow-sm cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-xs text-dark-muted block truncate">{label}</span>
                <span className="text-[10px] text-dark-muted/60 font-mono">{color}</span>
            </div>
        </div>
    )
}

function PreviewLine({
    num,
    lineHighlight,
    commentColor,
    highlight,
    children,
}: {
    num: number
    lineHighlight: string
    commentColor: string
    highlight?: boolean
    children: React.ReactNode
}) {
    return (
        <div
            className="flex transition-colors rounded-sm px-1"
            style={highlight ? { backgroundColor: lineHighlight } : undefined}
        >
            <span
                className="w-6 text-right mr-3 flex-shrink-0 select-none text-xs"
                style={{ color: commentColor }}
            >
                {num}
            </span>
            <span className="text-xs whitespace-pre">{children}</span>
        </div>
    )
}
