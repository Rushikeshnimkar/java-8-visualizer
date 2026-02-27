import { parse } from './src/jvm/parser/Parser'
import { compile } from './src/jvm/compiler/BytecodeCompiler'
import { JVMSimulator } from './src/jvm/runtime/JVMSimulator'
import { SAMPLE_PROGRAMS } from './src/utils/samplePrograms'

const facProg = SAMPLE_PROGRAMS.find(p => p.name === 'Factorial (Recursion)')
if (!facProg) throw new Error('Not found')
const ast = parse(facProg.code)
const compiled = compile(ast)
const simulator = new JVMSimulator(compiled)

while (simulator.canStepForward()) {
    const res = simulator.step()
    if (res.instruction) {
        console.log(`[${res.state.stack.length}] PC:${res.instruction.line} | OpCode:${res.instruction.opcode} | ${res.description}`)
    }
}

const state = simulator.getState()
console.log('Output:', state.output)
