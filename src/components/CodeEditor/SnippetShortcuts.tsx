// ============================================
// Code Snippet Shortcuts Panel
// Floating panel with common Java snippets
// ============================================

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface SnippetShortcutsProps {
    isOpen: boolean
    onClose: () => void
    editorRef: React.MutableRefObject<any>
}

interface Snippet {
    trigger: string
    label: string
    description: string
    code: string
}

const SNIPPETS: { category: string; items: Snippet[] }[] = [
    {
        category: 'Basics',
        items: [
            {
                trigger: 'sout',
                label: 'System.out.println',
                description: 'Print line to console',
                code: 'System.out.println();',
            },
            {
                trigger: 'souf',
                label: 'System.out.printf',
                description: 'Formatted print to console',
                code: 'System.out.printf("%s%n", );',
            },
            {
                trigger: 'main',
                label: 'main method',
                description: 'Public static void main',
                code: 'public static void main(String[] args) {\n    \n}',
            },
        ],
    },
    {
        category: 'Control Flow',
        items: [
            {
                trigger: 'fori',
                label: 'for loop (index)',
                description: 'Indexed for loop',
                code: 'for (int i = 0; i < n; i++) {\n    \n}',
            },
            {
                trigger: 'foreach',
                label: 'for-each loop',
                description: 'Enhanced for loop',
                code: 'for (Object item : collection) {\n    \n}',
            },
            {
                trigger: 'while',
                label: 'while loop',
                description: 'While loop',
                code: 'while (condition) {\n    \n}',
            },
            {
                trigger: 'if',
                label: 'if statement',
                description: 'If condition block',
                code: 'if (condition) {\n    \n}',
            },
            {
                trigger: 'ifelse',
                label: 'if-else',
                description: 'If-else branches',
                code: 'if (condition) {\n    \n} else {\n    \n}',
            },
            {
                trigger: 'switch',
                label: 'switch statement',
                description: 'Switch / case block',
                code: 'switch (variable) {\n    case VALUE:\n        break;\n    default:\n        break;\n}',
            },
        ],
    },
    {
        category: 'OOP',
        items: [
            {
                trigger: 'class',
                label: 'class declaration',
                description: 'Public class skeleton',
                code: 'public class ClassName {\n    \n}',
            },
            {
                trigger: 'interface',
                label: 'interface declaration',
                description: 'Public interface skeleton',
                code: 'public interface InterfaceName {\n    \n}',
            },
            {
                trigger: 'try',
                label: 'try-catch',
                description: 'Try-catch block',
                code: 'try {\n    \n} catch (Exception e) {\n    e.printStackTrace();\n}',
            },
            {
                trigger: 'trycf',
                label: 'try-catch-finally',
                description: 'Try-catch-finally block',
                code: 'try {\n    \n} catch (Exception e) {\n    e.printStackTrace();\n} finally {\n    \n}',
            },
        ],
    },
]

function CopyIcon() {
    return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
            />
        </svg>
    )
}

export function SnippetShortcuts({ isOpen, onClose, editorRef }: SnippetShortcutsProps) {
    const [inserted, setInserted] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const insertSnippet = (code: string, trigger: string) => {
        const editor = editorRef.current
        if (!editor) return

        const selection = editor.getSelection()
        const id = { major: 1, minor: 1 }
        const op = {
            identifier: id,
            range: selection,
            text: code,
            forceMoveMarkers: true,
        }
        editor.executeEdits('snippet-insert', [op])
        editor.focus()

        setInserted(trigger)
        setTimeout(() => setInserted(null), 1200)
    }

    const filtered = search.trim()
        ? SNIPPETS.map(cat => ({
            ...cat,
            items: cat.items.filter(
                s =>
                    s.trigger.includes(search.toLowerCase()) ||
                    s.label.toLowerCase().includes(search.toLowerCase())
            ),
        })).filter(cat => cat.items.length > 0)
        : SNIPPETS

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className="fixed bottom-8 right-4 z-50 w-80 bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
                        style={{ maxHeight: '480px' }}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-dark-border bg-dark-card flex-shrink-0">
                            <svg className="w-4 h-4 text-dark-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <span className="text-sm font-semibold text-dark-text flex-1">Snippets</span>
                            <button
                                onClick={onClose}
                                className="text-dark-muted hover:text-dark-text transition-colors p-0.5 rounded"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-3 py-2 border-b border-dark-border flex-shrink-0">
                            <input
                                type="text"
                                placeholder="Search snippets…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-dark-text placeholder-dark-muted outline-none focus:border-dark-accent transition-colors"
                            />
                        </div>

                        {/* Snippet List */}
                        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
                            {filtered.length === 0 && (
                                <p className="text-center text-dark-muted text-xs py-8">No snippets found</p>
                            )}
                            {filtered.map(cat => (
                                <div key={cat.category}>
                                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-dark-muted bg-dark-bg/40 sticky top-0">
                                        {cat.category}
                                    </div>
                                    {cat.items.map(snippet => (
                                        <div
                                            key={snippet.trigger}
                                            className="flex items-center gap-2 px-3 py-2 hover:bg-dark-border/20 transition-colors group border-b border-dark-border/30"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <code className="text-[10px] bg-dark-bg border border-dark-border px-1.5 py-0.5 rounded text-dark-accent font-mono flex-shrink-0">
                                                        {snippet.trigger}
                                                    </code>
                                                    <span className="text-xs text-dark-text truncate">{snippet.label}</span>
                                                </div>
                                                <p className="text-[10px] text-dark-muted mt-0.5 truncate">{snippet.description}</p>
                                            </div>
                                            <button
                                                onClick={() => insertSnippet(snippet.code, snippet.trigger)}
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all flex-shrink-0 ${inserted === snippet.trigger
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : 'bg-dark-accent/10 hover:bg-dark-accent/20 text-dark-accent border border-dark-accent/20'
                                                    }`}
                                            >
                                                {inserted === snippet.trigger ? (
                                                    <>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Done
                                                    </>
                                                ) : (
                                                    <>
                                                        <CopyIcon />
                                                        Insert
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Footer hint */}
                        <div className="px-3 py-1.5 border-t border-dark-border bg-dark-bg/40 flex-shrink-0">
                            <p className="text-[10px] text-dark-muted text-center">Click Insert to paste at cursor position</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
