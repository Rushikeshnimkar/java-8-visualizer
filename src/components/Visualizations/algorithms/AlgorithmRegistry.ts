import React from 'react'
import { JVMState } from '../../../jvm/types/JVMState'

export interface AlgorithmVisualizerProps {
    jvmState: JVMState
    onClose: () => void
}

import { CompiledProgram } from '../../../jvm/types/Bytecode'

export interface AlgorithmRegistration {
    id: string
    title: string
    description: string
    icon: string
    matchPatterns: string[] // E.g., class names ['TrappingRainWater', 'RainWater']
    
    // An optional function that scans the active jvmState or AST for variable shapes/values
    // If it returns true, we assume the algorithm is active regardless of class name.
    matchHeuristics?: (jvmState: JVMState, compiledProgram?: CompiledProgram) => boolean

    component: React.ComponentType<AlgorithmVisualizerProps>
}

class VisualizationRegistry {
    private visualizations: AlgorithmRegistration[] = []

    register(viz: AlgorithmRegistration) {
        this.visualizations.push(viz)
    }

    getAll(): AlgorithmRegistration[] {
        return this.visualizations
    }

    findMatch(jvmState: JVMState, compiledProgram?: CompiledProgram): AlgorithmRegistration | undefined {
        const className = jvmState.pc.currentClass || ''
        
        return this.visualizations.find(v => {
            // First try strict class name pattern matching
            if (v.matchPatterns.some(pattern => className.includes(pattern))) {
                return true
            }

            // Fallback to evaluating heuristics statically or dynamically
            if (v.matchHeuristics && v.matchHeuristics(jvmState, compiledProgram)) {
                return true
            }

            return false
        })
    }
}

export const AlgorithmRegistry = new VisualizationRegistry()
