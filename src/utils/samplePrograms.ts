// ============================================
// Sample Java Programs
// ============================================

export interface SampleProgram {
    name: string
    description: string
    code: string
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
    {
        name: 'Hello World',
        description: 'Basic print statement',
        code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
    },
    {
        name: 'Variables & Arithmetic',
        description: 'Variable declaration and math operations',
        code: `public class Calculator {
    public static void main(String[] args) {
        int a = 10;
        int b = 5;
        int sum = a + b;
        int diff = a - b;
        int product = a * b;
        int quotient = a / b;
        
        System.out.println(sum);
        System.out.println(diff);
        System.out.println(product);
        System.out.println(quotient);
    }
}`,
    },
    {
        name: 'Method Calls',
        description: 'Static method invocation',
        code: `public class Methods {
    public static void main(String[] args) {
        int result = add(5, 3);
        System.out.println(result);
        
        int doubled = multiply(result, 2);
        System.out.println(doubled);
    }
    
    public static int add(int x, int y) {
        return x + y;
    }
    
    public static int multiply(int x, int y) {
        return x * y;
    }
}`,
    },
    {
        name: 'Control Flow',
        description: 'If-else and loops',
        code: `public class ControlFlow {
    public static void main(String[] args) {
        int x = 10;
        
        if (x > 5) {
            System.out.println("x is greater than 5");
        } else {
            System.out.println("x is not greater than 5");
        }
        
        int i = 0;
        while (i < 3) {
            System.out.println(i);
            i = i + 1;
        }
    }
}`,
    },
    {
        name: 'Objects & Classes',
        description: 'Object creation and field access',
        code: `public class Person {
    String name;
    int age;
    
    public static void main(String[] args) {
        Person p = new Person();
        p.name = "Alice";
        p.age = 25;
        
        System.out.println(p.name);
        System.out.println(p.age);
    }
}`,
    },
    {
        name: 'Arrays',
        description: 'Array creation and manipulation',
        code: `public class Arrays {
    public static void main(String[] args) {
        int[] numbers = new int[5];
        numbers[0] = 10;
        numbers[1] = 20;
        numbers[2] = 30;
        
        int sum = 0;
        int i = 0;
        while (i < 3) {
            sum = sum + numbers[i];
            i = i + 1;
        }
        
        System.out.println(sum);
    }
}`,
    },
    {
        name: 'Lambda Expression',
        description: 'Java 8 lambda syntax',
        code: `public class Lambda {
    public static void main(String[] args) {
        int x = 5;
        int y = 10;
        
        // Lambda will be created on heap
        int result = x + y;
        System.out.println(result);
        
        // Note: Full lambda execution is simplified
        // for educational visualization
    }
}`,
    },
    {
        name: 'Factorial (Recursion)',
        description: 'Recursive method calls',
        code: `public class Factorial {
    public static void main(String[] args) {
        int n = 5;
        int result = factorial(n);
        System.out.println(result);
    }
    
    public static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }
}`,
    },
    {
        name: 'For Loop',
        description: 'Standard for loop iteration',
        code: `public class ForLoop {
    public static void main(String[] args) {
        int sum = 0;
        
        for (int i = 1; i <= 5; i++) {
            sum = sum + i;
            System.out.println(i);
        }
        
        System.out.println(sum);
    }
}`,
    },
    {
        name: 'Fibonacci',
        description: 'Calculate Fibonacci numbers',
        code: `public class Fibonacci {
    public static void main(String[] args) {
        int n = 8;
        
        int a = 0;
        int b = 1;
        
        System.out.println(a);
        System.out.println(b);
        
        int i = 2;
        while (i < n) {
            int c = a + b;
            System.out.println(c);
            a = b;
            b = c;
            i = i + 1;
        }
    }
}`,
    },
    {
        name: 'Binary Search Tree',
        description: 'BST with tree node visualization',
        code: `public class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    public static void main(String[] args) {
        TreeNode root = new TreeNode();
        root.val = 10;

        TreeNode left = new TreeNode();
        left.val = 5;
        root.left = left;

        TreeNode right = new TreeNode();
        right.val = 15;
        root.right = right;

        TreeNode ll = new TreeNode();
        ll.val = 3;
        left.left = ll;

        TreeNode lr = new TreeNode();
        lr.val = 7;
        left.right = lr;

        TreeNode rl = new TreeNode();
        rl.val = 12;
        right.left = rl;

        TreeNode rr = new TreeNode();
        rr.val = 20;
        right.right = rr;

        System.out.println(root.val);
        System.out.println(left.val);
        System.out.println(right.val);
    }
}`,
    },
    {
        name: 'DFS Preorder Traversal',
        description: 'Visualize DFS traversal on a binary tree',
        code: `public class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    public static void dfs(TreeNode node) {
        if (node == null) {
            return;
        }
        System.out.println(node.val);
        dfs(node.left);
        dfs(node.right);
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode();
        root.val = 1;

        TreeNode n2 = new TreeNode();
        n2.val = 2;
        root.left = n2;

        TreeNode n3 = new TreeNode();
        n3.val = 3;
        root.right = n3;

        TreeNode n4 = new TreeNode();
        n4.val = 4;
        n2.left = n4;

        TreeNode n5 = new TreeNode();
        n5.val = 5;
        n2.right = n5;

        TreeNode n6 = new TreeNode();
        n6.val = 6;
        n3.right = n6;

        System.out.println("DFS Preorder:");
        dfs(root);
    }
}`,
    },
]
