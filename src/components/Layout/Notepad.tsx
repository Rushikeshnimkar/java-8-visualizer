// ============================================
// Notepad & Checklist Popup Component
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChecklistItem {
    id: string
    text: string
    checked: boolean
}

type NotepadTab = 'notes' | 'checklist'

const STORAGE_KEY_NOTES = 'jvm-visualizer-notepad-notes'
const STORAGE_KEY_CHECKLIST = 'jvm-visualizer-notepad-checklist'

function loadNotes(): string {
    try {
        return localStorage.getItem(STORAGE_KEY_NOTES) || ''
    } catch {
        return ''
    }
}

function loadChecklist(): ChecklistItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CHECKLIST)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export function Notepad({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<NotepadTab>('notes')
    const [notes, setNotes] = useState(loadNotes)
    const [checklist, setChecklist] = useState<ChecklistItem[]>(loadChecklist)
    const [newItemText, setNewItemText] = useState('')
    const [isPinned, setIsPinned] = useState(false)
    const newItemRef = useRef<HTMLInputElement>(null)
    const popupRef = useRef<HTMLDivElement>(null)

    // Persist notes
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY_NOTES, notes) } catch { /* noop */ }
    }, [notes])

    // Persist checklist
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(checklist)) } catch { /* noop */ }
    }, [checklist])

    // Close on outside click
    useEffect(() => {
        if (!isOpen || isPinned) return
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        // Delay to avoid the opening click from immediately closing
        const timer = setTimeout(() => document.addEventListener('mousedown', handler), 50)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('mousedown', handler)
        }
    }, [isOpen, onClose, isPinned])

    const addItem = useCallback(() => {
        const text = newItemText.trim()
        if (!text) return
        setChecklist(prev => [...prev, { id: Date.now().toString(), text, checked: false }])
        setNewItemText('')
        newItemRef.current?.focus()
    }, [newItemText])

    const toggleItem = useCallback((id: string) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item))
    }, [])

    const deleteItem = useCallback((id: string) => {
        setChecklist(prev => prev.filter(item => item.id !== id))
    }, [])

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text')
        if (!pastedText) return

        // If text contains newlines, treat it as a bulk paste
        if (pastedText.includes('\n')) {
            e.preventDefault()

            // Split by newlines, trim, and remove empty lines
            const lines = pastedText
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line.length > 0)

            if (lines.length > 0) {
                const timestamp = Date.now()
                setChecklist(prev => [
                    ...prev,
                    ...lines.map((text, i) => ({ id: `${timestamp}-${i}`, text, checked: false }))
                ])
                setNewItemText('')
                // Optionally scroll to bottom after state update
                setTimeout(() => {
                    if (newItemRef.current) newItemRef.current.scrollIntoView({ behavior: 'smooth' })
                }, 50)
            }
        }
    }, [])

    const completedCount = checklist.filter(i => i.checked).length

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={popupRef}
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.96 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                    className="notepad-popup"
                >
                    {/* Header */}
                    <div className="notepad-header">
                        <div className="notepad-tabs">
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={`notepad-tab ${activeTab === 'notes' ? 'notepad-tab-active' : ''}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Notes
                            </button>
                            <button
                                onClick={() => setActiveTab('checklist')}
                                className={`notepad-tab ${activeTab === 'checklist' ? 'notepad-tab-active' : ''}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Checklist
                                {checklist.length > 0 && (
                                    <span className="notepad-badge">
                                        {completedCount}/{checklist.length}
                                    </span>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsPinned(!isPinned)}
                                className={`notepad-close ${isPinned ? '!text-[#58a6ff] !bg-[rgba(88,166,255,.15)] ring-1 ring-[rgba(88,166,255,.3)] ring-inset' : 'opacity-70 hover:opacity-100'}`}
                                title={isPinned ? "Unpin notepad (currently pinned)" : "Pin notepad to keep it open"}
                            >
                                <svg className="w-4 h-4" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 17v5"/>
                                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                                </svg>
                            </button>
                            <button onClick={onClose} className="notepad-close opacity-70 hover:opacity-100" title="Close notepad">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="notepad-body">
                        {activeTab === 'notes' ? (
                            <textarea
                                className="notepad-textarea"
                                placeholder="Write your notes here..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                spellCheck={false}
                            />
                        ) : (
                            <div className="notepad-checklist">
                                {/* Checklist items */}
                                <div className="notepad-checklist-items">
                                    {checklist.length === 0 && (
                                        <div className="notepad-empty">
                                            <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            No items yet. Add one below!
                                        </div>
                                    )}
                                    {checklist.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className={`notepad-checklist-item ${item.checked ? 'notepad-checklist-item-done' : ''}`}
                                        >
                                            <button
                                                onClick={() => toggleItem(item.id)}
                                                className={`notepad-checkbox ${item.checked ? 'notepad-checkbox-checked' : ''}`}
                                            >
                                                {item.checked && (
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                            <span className={`notepad-item-text ${item.checked ? 'notepad-item-text-done' : ''}`}>
                                                {item.text}
                                            </span>
                                            <button onClick={() => deleteItem(item.id)} className="notepad-delete" title="Delete item">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Add new item */}
                                <div className="notepad-add-item">
                                    <input
                                        ref={newItemRef}
                                        type="text"
                                        className="notepad-add-input"
                                        placeholder="Add a new item..."
                                        value={newItemText}
                                        onChange={e => setNewItemText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') addItem() }}
                                        onPaste={handlePaste}
                                    />
                                    <button
                                        onClick={addItem}
                                        disabled={!newItemText.trim()}
                                        className="notepad-add-btn"
                                        title="Add item"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
