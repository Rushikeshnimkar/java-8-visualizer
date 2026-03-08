import { AlgorithmRegistry } from './AlgorithmRegistry'
import { TrappingRainWaterVisualization } from './TrappingRainWaterVisualization'

// Pre-register algorithms
AlgorithmRegistry.register({
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    description: 'Calculates the volume of water trapped between elevation bars.',
    icon: '💧',
    matchPatterns: ['TrappingRainWater', 'RainWater'],
    matchHeuristics: (jvmState, compiledProgram) => {
        // Pattern Recognition: Scan the compiled program's AST/bytecode structures BEFORE execution!
        // We look for ANY method in ANY loaded class that declares the characteristic Two-Pointer variables.
        if (compiledProgram) {
            for (const cls of compiledProgram.classes) {
                for (const method of cls.methods) {
                    const varNames = method.localVariableTable.map(v => v.name)
                    const hasArray = varNames.includes('height') || varNames.includes('arr')
                    const hasPointers = varNames.includes('left') && varNames.includes('right')
                    const hasWater = varNames.includes('water') || varNames.includes('trappedWater')
                    
                    if (hasArray && hasPointers && hasWater) return true
                }
            }
        }

        // Fallback to dynamic runtime frame checking just in case
        const activeFrame = jvmState.stack[jvmState.stack.length - 1]
        if (!activeFrame) return false
        
        const varNames = activeFrame.localVariables.map(v => v.name)
        const hasArray = varNames.includes('height') || varNames.includes('arr')
        const hasPointers = varNames.includes('left') && varNames.includes('right')
        const hasWater = varNames.includes('water') || varNames.includes('trappedWater')
        
        return hasArray && hasPointers && hasWater
    },
    component: TrappingRainWaterVisualization
})

export { AlgorithmRegistry }
export type { AlgorithmVisualizerProps,    AlgorithmRegistration } from './AlgorithmRegistry'
