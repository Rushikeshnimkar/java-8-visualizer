import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function DisclaimerModal() {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        // Check if user has already seen the disclaimer
        const hasSeen = localStorage.getItem('java8_visualizer_disclaimer_seen')
        if (!hasSeen) {
            setIsOpen(true)
        }
    }, [])

    const handleDismiss = () => {
        localStorage.setItem('java8_visualizer_disclaimer_seen', 'true')
        setIsOpen(false)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="w-full max-w-2xl bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 p-5 border-b border-dark-border bg-dark-bg/50">
                            <div className="w-12 h-12 bg-gradient-to-br from-jvm-stack via-jvm-heap to-jvm-method rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-white font-bold text-xl">JV</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-dark-text">Welcome to Java 8 Visualizer</h2>
                                <p className="text-sm text-dark-muted">An educational JVM execution engine</p>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <p className="text-dark-text text-base leading-relaxed">
                                This interactive tool is designed to help you visualize how the Java Virtual Machine (JVM) executes code under the hood. It compiles Java directly in your browser and simulates the JVM's memory architecture.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Supported Features */}
                                <div className="space-y-4">
                                    <h3 className="text-green-500 font-semibold flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Supported Features
                                    </h3>
                                    <ul className="space-y-3 text-sm text-dark-text/90">
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                                            <span><strong>Core Syntax:</strong> Loops, conditionals, arrays, primitive types, and Strings.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                                            <span><strong>OOP:</strong> Classes, interfaces, inheritance, polymorphism, and encapsulation.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                                            <span><strong>Collections:</strong> HashMap, HashSet, ArrayList, LinkedList, Stack, PriorityQueue, and ArrayDeque.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                                            <span><strong>Multithreading:</strong> Thread creation, `start()`, `sleep()`, `join()`, `wait()`, `notify()`, and monitors.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/50 flex-shrink-0" />
                                            <span><strong>Memory:</strong> Full Stack, Heap, and Method Area visualization.</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Unsupported Features */}
                                <div className="space-y-4">
                                    <h3 className="text-yellow-500 font-semibold flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Unsupported Features
                                    </h3>
                                    <ul className="space-y-3 text-sm text-dark-text/90">
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500/50 flex-shrink-0" />
                                            <span><strong>Standard Library:</strong> Only basic types and data structures are included. (No `java.io`, `java.nio`, or full `java.util`).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500/50 flex-shrink-0" />
                                            <span><strong>Generics:</strong> Type parameters are skipped during simulation (type erasure).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500/50 flex-shrink-0" />
                                            <span><strong>Streams & Advanced Lambdas:</strong> The Streams API and method references are not supported.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500/50 flex-shrink-0" />
                                            <span><strong>Exceptions:</strong> Limited `try/catch` support. Real stack traces are not generated.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500/50 flex-shrink-0" />
                                            <span><strong>External Dependencies:</strong> No Maven/Gradle support. Standard single-file Java only.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-dark-accent/10 border border-dark-accent/20 rounded-lg">
                                <p className="text-sm text-dark-accent text-center">
                                    <strong>Tip:</strong> You can browse pre-built examples showcasing what the engine can do by clicking the "Examples" button in the top menu.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-dark-border bg-dark-bg/50 flex justify-end">
                            <button
                                onClick={handleDismiss}
                                className="px-6 py-2 bg-dark-accent hover:bg-dark-accent/90 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                            >
                                I Understand, Let's Code
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
