import { Lexer } from './src/jvm/parser/Lexer'
import { Parser as JavaParser } from './src/jvm/parser/JavaParser'
import { AST } from './src/jvm/types/ASTNodes.ts'
import { BytecodeCompiler } from './src/jvm/compiler/BytecodeCompiler'
import { JVMSimulator } from './src/jvm/runtime/JVMSimulator'

const code = `
public class ClassName {
    public static void main(String[] args) {
        String str = "Hello meow i want to eat chicken meow";
        StringBuilder word = new StringBuilder();
        java.util.HashMap<String, Integer> map = new java.util.HashMap<>();

        for(int i = 0; i < str.length(); i++){
            if(str.charAt(i) != ' '){
                word.append(str.charAt(i));
            } 
            else{
                String w = word.toString();
                map.put(w, map.getOrDefault(w, 0) + 1);
                word.setLength(0);
            }
        }

        // add last word
        String w = word.toString();
        map.put(w, map.getOrDefault(w, 0) + 1);

        System.out.println(map);
    }
}
`

try {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();

  const parser = new JavaParser(tokens);
  const ast = parser.parse();
  console.log("Parsing successful!");

  const compiler = new BytecodeCompiler();
  const compiledProgram = compiler.compile(ast);
  console.log("Compilation successful!");

  const simulator = new JVMSimulator(compiledProgram);
  
  let steps = 0;
  while (simulator.canStepForward() && steps < 2000) {
    simulator.step();
    steps++;
  }

  if (simulator.getState().status === 'error') {
     console.error("Execution failed:", simulator.getState().error);
  } else {
     console.log("Execution successful!");
  }
  
  console.log("Steps taken:", steps);
  console.log("Output:", simulator.getState().output);

} catch (error) {
  console.error("Error:", error);
}
