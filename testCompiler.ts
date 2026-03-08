import { Lexer } from './src/jvm/parser/Lexer.ts'
import { Parser as JavaParser } from './src/jvm/parser/JavaParser.ts'
import { BytecodeCompiler } from './src/jvm/compiler/BytecodeCompiler.ts'
import { JVMSimulator } from './src/jvm/runtime/JVMSimulator.ts'

const code = `
public class KnapsackDP {
    public static void main(String[] args) {
        int[] weight = {1,3,4,5};
        int[] value = {10,40,50,70};
        int W = 8;
        int n = weight.length;
        int[][] dp = new int[n+1][W+1];

        for(int i = 1; i <= n; i++){
            for(int w = 1; w <= W; w++){
                if(weight[i-1] <= w){
                    dp[i][w] = Math.max(
                        value[i-1] + dp[i-1][w-weight[i-1]],
                        dp[i-1][w]
                    );
                } else{
                    dp[i][w] = dp[i-1][w];
                }
            }
        }
        System.out.println(dp[n][W]);
    }
}
`

try {
  const lexer = new Lexer(code);
  const parser = new JavaParser(lexer.tokenize());
  const ast = parser.parse();
  const compiler = new BytecodeCompiler();
  const compiledProgram = compiler.compile(ast);
  
  const simulator = new JVMSimulator(compiledProgram);
  
  let steps = 0;
  while (simulator.canStepForward() && steps < 10000) {
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
