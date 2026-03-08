// ============================================
// Algorithm Step Annotations System
// Tracks execution phases and provides educational context
// ============================================

export interface AlgorithmPhase {
  id: string
  name: string
  description: string
  startStep: number
  endStep?: number
  complexity?: string
  invariant?: string
  tips?: string[]
  visualCues?: {
    highlightVariables?: string[]
    focusArea?: 'stack' | 'heap' | 'array'
    annotation?: string
  }
}

export interface AlgorithmAnnotation {
  algorithmName: string
  currentPhase: AlgorithmPhase
  progress: {
    current: number
    total: number
    percentage: number
  }
  allPhases: AlgorithmPhase[]
}

// Phase definitions for common algorithms
const ALGORITHM_PATTERNS: Record<string, {
  classPattern: RegExp
  phases: AlgorithmPhase[]
}> = {
  bubbleSort: {
    classPattern: /^(BubbleSort|SortingAlgorithm)$/,
    phases: [
      {
        id: 'init',
        name: 'Initialization',
        description: 'Setting up loop counters and array bounds',
        startStep: 0,
        complexity: 'O(1)',
        invariant: 'Array is unmodified',
        tips: ['n = array length', 'Outer loop runs n-1 times'],
        visualCues: {
          highlightVariables: ['n', 'i', 'j'],
          focusArea: 'array',
          annotation: 'Initializing sorting parameters'
        }
      },
      {
        id: 'outer-loop',
        name: 'Outer Loop - Passes',
        description: 'Each pass bubbles the largest element to the end',
        startStep: 1,
        complexity: 'O(n)',
        invariant: 'After pass i, last i elements are in final position',
        tips: ['Pass number determines sorted portion at end'],
        visualCues: {
          highlightVariables: ['i'],
          focusArea: 'array',
          annotation: 'Starting pass {i}'
        }
      },
      {
        id: 'comparison',
        name: 'Comparison Phase',
        description: 'Comparing adjacent elements',
        startStep: 2,
        complexity: 'O(n²)',
        invariant: 'Elements before j are unsorted',
        tips: ['Compare arr[j] with arr[j+1]'],
        visualCues: {
          highlightVariables: ['j', 'arr[j]', 'arr[j+1]'],
          focusArea: 'array',
          annotation: 'Comparing positions {j} and {j+1}'
        }
      },
      {
        id: 'swap',
        name: 'Swap Operation',
        description: 'Swapping elements if they are in wrong order',
        startStep: 3,
        complexity: 'O(1) per swap',
        invariant: 'Larger element moves right',
        tips: ['Only swap if arr[j] > arr[j+1]'],
        visualCues: {
          highlightVariables: ['temp', 'arr[j]', 'arr[j+1]'],
          focusArea: 'array',
          annotation: 'Swapping! Larger element bubbles right →'
        }
      },
      {
        id: 'complete',
        name: 'Sorting Complete',
        description: 'Array is fully sorted',
        startStep: -1, // Determined dynamically
        complexity: 'O(n²) total',
        invariant: 'All elements in sorted order',
        tips: ['Array is now sorted in ascending order'],
        visualCues: {
          highlightVariables: ['arr'],
          focusArea: 'array',
          annotation: '✓ Sorted!'
        }
      }
    ]
  },
  
  binarySearch: {
    classPattern: /^(BinarySearch|SearchAlgorithm)$/,
    phases: [
      {
        id: 'init',
        name: 'Initialize Bounds',
        description: 'Set search boundaries to full array',
        startStep: 0,
        complexity: 'O(1)',
        invariant: 'Target may be anywhere in [low, high]',
        tips: ['low = 0, high = n-1'],
        visualCues: {
          highlightVariables: ['low', 'high', 'target'],
          focusArea: 'array',
          annotation: 'Search range: [{low}, {high}]'
        }
      },
      {
        id: 'calculate-mid',
        name: 'Calculate Middle',
        description: 'Find middle index of current range',
        startStep: 1,
        complexity: 'O(1)',
        invariant: 'mid = ⌊(low + high) / 2⌋',
        tips: ['Avoid overflow: low + (high-low)/2'],
        visualCues: {
          highlightVariables: ['mid', 'low', 'high'],
          focusArea: 'array',
          annotation: 'Middle index: {mid}'
        }
      },
      {
        id: 'compare',
        name: 'Compare with Target',
        description: 'Check if middle element is the target',
        startStep: 2,
        complexity: 'O(1)',
        invariant: 'One comparison eliminates half the array',
        tips: ['Three cases: equal, less, or greater'],
        visualCues: {
          highlightVariables: ['arr[mid]', 'target'],
          focusArea: 'array',
          annotation: 'Compare {arr[mid]} with {target}'
        }
      },
      {
        id: 'narrow-left',
        name: 'Search Left Half',
        description: 'Target is smaller, search left subarray',
        startStep: 3,
        complexity: 'O(log n)',
        invariant: 'Target is in [low, mid-1] if present',
        tips: ['high = mid - 1'],
        visualCues: {
          highlightVariables: ['high', 'mid'],
          focusArea: 'array',
          annotation: '← Search left half'
        }
      },
      {
        id: 'narrow-right',
        name: 'Search Right Half',
        description: 'Target is larger, search right subarray',
        startStep: 4,
        complexity: 'O(log n)',
        invariant: 'Target is in [mid+1, high] if present',
        tips: ['low = mid + 1'],
        visualCues: {
          highlightVariables: ['low', 'mid'],
          focusArea: 'array',
          annotation: 'Search right half →'
        }
      },
      {
        id: 'found',
        name: 'Target Found',
        description: 'Element found at middle index',
        startStep: -1,
        complexity: 'O(1)',
        invariant: 'arr[mid] == target',
        tips: ['Return mid index'],
        visualCues: {
          highlightVariables: ['mid'],
          focusArea: 'array',
          annotation: '✓ Found at index {mid}!'
        }
      },
      {
        id: 'not-found',
        name: 'Target Not Found',
        description: 'Search space exhausted, target not present',
        startStep: -1,
        complexity: 'O(log n)',
        invariant: 'low > high means target not in array',
        tips: ['Return -1 to indicate not found'],
        visualCues: {
          highlightVariables: ['low', 'high'],
          focusArea: 'array',
          annotation: '✗ Not found'
        }
      }
    ]
  },
  
  linkedList: {
    classPattern: /^(LinkedList|Node)$/,
    phases: [
      {
        id: 'traversal',
        name: 'List Traversal',
        description: 'Moving through list nodes via next pointers',
        startStep: 0,
        complexity: 'O(n)',
        invariant: 'current points to node being visited',
        tips: ['Follow next pointers until null'],
        visualCues: {
          highlightVariables: ['head', 'current', 'next'],
          focusArea: 'heap',
          annotation: 'Traversing node {current}'
        }
      },
      {
        id: 'insert-head',
        name: 'Insert at Head',
        description: 'Add new node at beginning of list',
        startStep: 1,
        complexity: 'O(1)',
        invariant: 'newNode.next = old head',
        tips: ['Update head pointer to new node'],
        visualCues: {
          highlightVariables: ['newNode', 'head'],
          focusArea: 'heap',
          annotation: 'Insert at front'
        }
      },
      {
        id: 'insert-tail',
        name: 'Insert at Tail',
        description: 'Add new node at end of list',
        startStep: 2,
        complexity: 'O(n)',
        invariant: 'lastNode.next = newNode',
        tips: ['Traverse to find last node'],
        visualCues: {
          highlightVariables: ['tail', 'newNode'],
          focusArea: 'heap',
          annotation: 'Insert at end'
        }
      },
      {
        id: 'delete',
        name: 'Delete Node',
        description: 'Remove node from list by updating pointers',
        startStep: 3,
        complexity: 'O(n)',
        invariant: 'prev.next = current.next bypasses current',
        tips: ['Keep reference to previous node'],
        visualCues: {
          highlightVariables: ['prev', 'current', 'next'],
          focusArea: 'heap',
          annotation: 'Removing node'
        }
      }
    ]
  },
  
  trappingRainWater: {
    classPattern: /^TrappingRainWater$/,
    phases: [
      {
        id: 'two-pointer-init',
        name: 'Initialize Two Pointers',
        description: 'Set left at start, right at end',
        startStep: 0,
        complexity: 'O(1)',
        invariant: 'left=0, right=n-1',
        tips: ['Two pointers approach from both ends'],
        visualCues: {
          highlightVariables: ['left', 'right', 'leftMax', 'rightMax'],
          focusArea: 'array',
          annotation: 'Two pointers: L={left}, R={right}'
        }
      },
      {
        id: 'update-max',
        name: 'Update Maximum Heights',
        description: 'Track maximum height seen from each side',
        startStep: 1,
        complexity: 'O(1) per step',
        invariant: 'leftMax = max height in [0..left]',
        tips: ['Update max as you traverse'],
        visualCues: {
          highlightVariables: ['leftMax', 'rightMax', 'height[left]', 'height[right]'],
          focusArea: 'array',
          annotation: 'Max heights: L={leftMax}, R={rightMax}'
        }
      },
      {
        id: 'trap-water',
        name: 'Trap Water Calculation',
        description: 'Water trapped = min(leftMax, rightMax) - current height',
        startStep: 2,
        complexity: 'O(1) per step',
        invariant: 'Water level determined by shorter side',
        tips: ['Move the pointer with smaller max'],
        visualCues: {
          highlightVariables: ['water', 'leftMax', 'rightMax'],
          focusArea: 'array',
          annotation: 'Trapping water... 💧'
        }
      },
      {
        id: 'complete',
        name: 'Total Water Calculated',
        description: 'Sum of all trapped water units',
        startStep: -1,
        complexity: 'O(n) total',
        invariant: 'Total water correctly calculated',
        tips: ['Answer is sum of water at each position'],
        visualCues: {
          highlightVariables: ['totalWater'],
          focusArea: 'array',
          annotation: '💧 Total: {totalWater} units'
        }
      }
    ]
  }
}

/**
 * Detect current algorithm phase based on execution state
 */
export function detectAlgorithmPhase(
  className: string,
  methodName: string,
  stepNumber: number,
  variables: Record<string, any>,
  maxSteps: number
): AlgorithmAnnotation | null {
  // Find matching algorithm pattern
  for (const [algoName, config] of Object.entries(ALGORITHM_PATTERNS)) {
    if (config.classPattern.test(className)) {
      const phases = config.phases
      
      // Determine current phase based on step number and method name
      let currentPhaseIndex = 0
      
      // Simple heuristic: map step ranges to phases
      const stepsPerPhase = Math.ceil(maxSteps / phases.length)
      currentPhaseIndex = Math.min(
        Math.floor(stepNumber / stepsPerPhase),
        phases.length - 1
      )
      
      // Override based on method name patterns
      if (methodName.includes('sort') || methodName.includes('swap')) {
        currentPhaseIndex = Math.max(currentPhaseIndex, 2) // At least comparison phase
      }
      if (methodName.includes('search') || methodName.includes('find')) {
        currentPhaseIndex = Math.max(currentPhaseIndex, 1) // At least calculate-mid
      }
      
      const currentPhase = phases[currentPhaseIndex]
      
      // Calculate progress
      const totalPhases = phases.length
      const progressPercentage = ((currentPhaseIndex + 1) / totalPhases) * 100
      
      // Interpolate variable annotations
      let annotation = currentPhase.visualCues?.annotation || ''
      Object.entries(variables).forEach(([key, value]) => {
        annotation = annotation.replace(`{${key}}`, String(value ?? 'null'))
      })
      
      return {
        algorithmName: algoName,
        currentPhase: {
          ...currentPhase,
          visualCues: currentPhase.visualCues ? {
            ...currentPhase.visualCues,
            annotation
          } : undefined
        },
        progress: {
          current: currentPhaseIndex + 1,
          total: totalPhases,
          percentage: Math.round(progressPercentage)
        },
        allPhases: phases
      }
    }
  }
  
  return null // No matching algorithm found
}

/**
 * Get educational tip for current operation
 */
export function getEducationalTip(
  opcode: string,
  context?: {
    variableName?: string
    objectType?: string
    operation?: string
  }
): string {
  const tips: Record<string, string | ((ctx: any) => string)> = {
    'LOAD_LOCAL': (ctx) => `Loading variable '${ctx.variableName}' onto operand stack`,
    'STORE_LOCAL': (ctx) => `Storing value from stack into variable '${ctx.variableName}'`,
    'GETFIELD': (ctx) => `Accessing field '${ctx.variableName}' of ${ctx.objectType} object`,
    'PUTFIELD': (ctx) => `Modifying field '${ctx.variableName}' of ${ctx.objectType} object`,
    'INVOKE_VIRTUAL': (ctx) => `Calling method '${ctx.operation}' - pushing new stack frame`,
    'RETURN': 'Returning from method - popping stack frame',
    'IF_ICMPGE': 'Conditional jump: if first >= second',
    'IF_ICMPLE': 'Conditional jump: if first <= second',
    'IF_ICMPEQ': 'Conditional jump: if first == second',
    'GOTO': 'Unconditional jump to instruction',
    'ARRAYLENGTH': 'Getting array length property',
    'BALOAD': 'Loading element from array',
    'BASTORE': 'Storing element into array',
    'NEW': `Creating new ${context?.objectType || 'object'} instance on heap`,
    'DUP': 'Duplicating top of stack (for object creation)',
  }
  
  const tip = tips[opcode]
  if (typeof tip === 'function') {
    return tip(context || {})
  }
  return tip || `Executing ${opcode} instruction`
}
