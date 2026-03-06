// ============================================
// Java Built-in Completions Data
// Comprehensive autocompletion for Java keywords,
// classes, methods, and APIs
// ============================================

// --------------- Types ---------------
export interface JavaMethodInfo {
  name: string
  returnType: string
  params: string
  doc: string
}

export interface JavaClassInfo {
  name: string
  kind: 'class' | 'interface' | 'enum'
  doc: string
  methods: JavaMethodInfo[]
  staticMethods?: JavaMethodInfo[]
  fields?: { name: string; type: string; doc: string }[]
}

// --------------- Keywords ---------------
export const JAVA_KEYWORDS = [
  'abstract','assert','boolean','break','byte','case','catch','char',
  'class','const','continue','default','do','double','else','enum',
  'extends','final','finally','float','for','goto','if','implements',
  'import','instanceof','int','interface','long','native','new',
  'package','private','protected','public','return','short','static',
  'strictfp','super','switch','synchronized','this','throw','throws',
  'transient','try','void','volatile','while',
]

// --------------- Annotations ---------------
export const JAVA_ANNOTATIONS = [
  { name: '@Override', doc: 'Indicates a method overrides a superclass method' },
  { name: '@Deprecated', doc: 'Marks an element as deprecated' },
  { name: '@SuppressWarnings', doc: 'Suppresses compiler warnings' },
  { name: '@FunctionalInterface', doc: 'Indicates a functional interface (single abstract method)' },
  { name: '@SafeVarargs', doc: 'Suppresses unchecked warnings for varargs' },
]

// --------------- Helper to define classes concisely ---------------
function cls(name: string, doc: string, methods: JavaMethodInfo[], staticMethods?: JavaMethodInfo[], fields?: JavaClassInfo['fields']): JavaClassInfo {
  return { name, kind: 'class', doc, methods, staticMethods: staticMethods || [], fields: fields || [] }
}
function iface(name: string, doc: string, methods: JavaMethodInfo[]): JavaClassInfo {
  return { name, kind: 'interface', doc, methods }
}
function m(name: string, returnType: string, params: string, doc: string): JavaMethodInfo {
  return { name, returnType, params, doc }
}

// --------------- Core Classes ---------------
export const JAVA_CLASSES: JavaClassInfo[] = [
  // ── String ──
  cls('String', 'Immutable sequence of characters', [
    m('length', 'int', '', 'Returns the length of this string'),
    m('charAt', 'char', 'int index', 'Returns char at the specified index'),
    m('substring', 'String', 'int beginIndex, int endIndex', 'Returns a substring'),
    m('contains', 'boolean', 'CharSequence s', 'Returns true if this string contains the specified sequence'),
    m('equals', 'boolean', 'Object obj', 'Compares this string to the specified object'),
    m('equalsIgnoreCase', 'boolean', 'String other', 'Case-insensitive string comparison'),
    m('indexOf', 'int', 'String str', 'Returns the index of the first occurrence of str'),
    m('lastIndexOf', 'int', 'String str', 'Returns the index of the last occurrence'),
    m('toUpperCase', 'String', '', 'Converts all characters to upper case'),
    m('toLowerCase', 'String', '', 'Converts all characters to lower case'),
    m('trim', 'String', '', 'Removes leading and trailing whitespace'),
    m('split', 'String[]', 'String regex', 'Splits this string around matches of the given regex'),
    m('replace', 'String', 'CharSequence target, CharSequence replacement', 'Replaces each occurrence of target'),
    m('replaceAll', 'String', 'String regex, String replacement', 'Replaces each match of regex'),
    m('startsWith', 'boolean', 'String prefix', 'Tests if this string starts with the specified prefix'),
    m('endsWith', 'boolean', 'String suffix', 'Tests if this string ends with the specified suffix'),
    m('isEmpty', 'boolean', '', 'Returns true if length() is 0'),
    m('toCharArray', 'char[]', '', 'Converts this string to a char array'),
    m('matches', 'boolean', 'String regex', 'Tests whether this string matches the given regex'),
    m('compareTo', 'int', 'String other', 'Compares two strings lexicographically'),
    m('concat', 'String', 'String str', 'Concatenates the specified string'),
    m('intern', 'String', '', 'Returns a canonical representation'),
    m('hashCode', 'int', '', 'Returns a hash code for this string'),
    m('toString', 'String', '', 'Returns the string itself'),
  ], [
    m('valueOf', 'String', 'Object obj', 'Returns the string representation of the argument'),
    m('format', 'String', 'String format, Object... args', 'Returns a formatted string'),
    m('join', 'String', 'CharSequence delimiter, CharSequence... elements', 'Joins elements with a delimiter'),
  ]),

  // ── Integer ──
  cls('Integer', 'Wrapper class for int primitive', [
    m('intValue', 'int', '', 'Returns the value as an int'),
    m('compareTo', 'int', 'Integer other', 'Compares two Integer objects'),
    m('equals', 'boolean', 'Object obj', 'Compares this object to the specified object'),
    m('toString', 'String', '', 'Returns a String representation'),
  ], [
    m('parseInt', 'int', 'String s', 'Parses the string as a signed decimal integer'),
    m('valueOf', 'Integer', 'int i', 'Returns an Integer instance representing the specified int'),
    m('toString', 'String', 'int i', 'Returns a String for the specified integer'),
    m('compare', 'int', 'int x, int y', 'Compares two int values numerically'),
    m('max', 'int', 'int a, int b', 'Returns the greater of two int values'),
    m('min', 'int', 'int a, int b', 'Returns the smaller of two int values'),
    m('toBinaryString', 'String', 'int i', 'Returns a binary string representation'),
    m('toHexString', 'String', 'int i', 'Returns a hex string representation'),
  ], [
    { name: 'MAX_VALUE', type: 'int', doc: 'Maximum value an int can have (2^31 - 1)' },
    { name: 'MIN_VALUE', type: 'int', doc: 'Minimum value an int can have (-2^31)' },
  ]),

  // ── Double ──
  cls('Double', 'Wrapper class for double primitive', [
    m('doubleValue', 'double', '', 'Returns the value as a double'),
    m('compareTo', 'int', 'Double other', 'Compares two Double objects'),
    m('toString', 'String', '', 'Returns a String representation'),
    m('isNaN', 'boolean', '', 'Returns true if this value is NaN'),
    m('isInfinite', 'boolean', '', 'Returns true if this value is infinite'),
  ], [
    m('parseDouble', 'double', 'String s', 'Parses the string as a double'),
    m('valueOf', 'Double', 'double d', 'Returns a Double instance'),
    m('compare', 'int', 'double d1, double d2', 'Compares two double values'),
    m('isNaN', 'boolean', 'double v', 'Returns true if the specified value is NaN'),
  ], [
    { name: 'MAX_VALUE', type: 'double', doc: 'Largest positive finite value of type double' },
    { name: 'MIN_VALUE', type: 'double', doc: 'Smallest positive nonzero value of type double' },
    { name: 'NaN', type: 'double', doc: 'Not-a-Number value' },
    { name: 'POSITIVE_INFINITY', type: 'double', doc: 'Positive infinity' },
    { name: 'NEGATIVE_INFINITY', type: 'double', doc: 'Negative infinity' },
  ]),

  // ── Long ──
  cls('Long', 'Wrapper class for long primitive', [
    m('longValue', 'long', '', 'Returns the value as a long'),
    m('compareTo', 'int', 'Long other', 'Compares two Long objects'),
    m('toString', 'String', '', 'Returns a String representation'),
  ], [
    m('parseLong', 'long', 'String s', 'Parses the string as a signed long'),
    m('valueOf', 'Long', 'long l', 'Returns a Long instance'),
    m('compare', 'int', 'long x, long y', 'Compares two long values'),
  ]),

  // ── Boolean ──
  cls('Boolean', 'Wrapper class for boolean primitive', [
    m('booleanValue', 'boolean', '', 'Returns the value as a boolean'),
    m('toString', 'String', '', 'Returns a String representation'),
  ], [
    m('parseBoolean', 'boolean', 'String s', 'Parses the string as a boolean'),
    m('valueOf', 'Boolean', 'boolean b', 'Returns a Boolean instance'),
  ], [
    { name: 'TRUE', type: 'Boolean', doc: 'The Boolean object corresponding to true' },
    { name: 'FALSE', type: 'Boolean', doc: 'The Boolean object corresponding to false' },
  ]),

  // ── Character ──
  cls('Character', 'Wrapper class for char primitive', [
    m('charValue', 'char', '', 'Returns the value as a char'),
  ], [
    m('isDigit', 'boolean', 'char ch', 'Determines if the character is a digit'),
    m('isLetter', 'boolean', 'char ch', 'Determines if the character is a letter'),
    m('isLetterOrDigit', 'boolean', 'char ch', 'Determines if the character is a letter or digit'),
    m('isUpperCase', 'boolean', 'char ch', 'Determines if the character is uppercase'),
    m('isLowerCase', 'boolean', 'char ch', 'Determines if the character is lowercase'),
    m('toUpperCase', 'char', 'char ch', 'Converts to uppercase'),
    m('toLowerCase', 'char', 'char ch', 'Converts to lowercase'),
    m('isWhitespace', 'boolean', 'char ch', 'Determines if the character is whitespace'),
  ]),

  // ── Object ──
  cls('Object', 'Root class of the Java class hierarchy', [
    m('toString', 'String', '', 'Returns a string representation of the object'),
    m('equals', 'boolean', 'Object obj', 'Indicates whether some other object is equal to this one'),
    m('hashCode', 'int', '', 'Returns a hash code value'),
    m('getClass', 'Class<?>',  '', 'Returns the runtime class of this object'),
    m('clone', 'Object', '', 'Creates and returns a copy of this object'),
    m('notify', 'void', '', 'Wakes up a single thread waiting on this monitor'),
    m('notifyAll', 'void', '', 'Wakes up all threads waiting on this monitor'),
    m('wait', 'void', '', 'Causes the current thread to wait'),
  ]),

  // ── StringBuilder ──
  cls('StringBuilder', 'Mutable sequence of characters (not thread-safe)', [
    m('append', 'StringBuilder', 'String str', 'Appends the specified string'),
    m('insert', 'StringBuilder', 'int offset, String str', 'Inserts the string at the position'),
    m('delete', 'StringBuilder', 'int start, int end', 'Removes characters in a substring'),
    m('reverse', 'StringBuilder', '', 'Reverses the sequence of characters'),
    m('toString', 'String', '', 'Converts to a String'),
    m('length', 'int', '', 'Returns the length (character count)'),
    m('charAt', 'char', 'int index', 'Returns the char at the specified index'),
    m('replace', 'StringBuilder', 'int start, int end, String str', 'Replaces characters in a substring'),
    m('capacity', 'int', '', 'Returns the current capacity'),
    m('deleteCharAt', 'StringBuilder', 'int index', 'Removes the char at the specified position'),
  ]),

  // ── Math (utility, all static) ──
  cls('Math', 'Contains methods for performing basic numeric operations', [], [
    m('abs', 'int', 'int a', 'Returns the absolute value'),
    m('max', 'int', 'int a, int b', 'Returns the greater of two values'),
    m('min', 'int', 'int a, int b', 'Returns the smaller of two values'),
    m('pow', 'double', 'double a, double b', 'Returns the value of a raised to the power of b'),
    m('sqrt', 'double', 'double a', 'Returns the square root'),
    m('cbrt', 'double', 'double a', 'Returns the cube root'),
    m('random', 'double', '', 'Returns a random double between 0.0 and 1.0'),
    m('round', 'long', 'double a', 'Returns the closest long'),
    m('ceil', 'double', 'double a', 'Returns the smallest double ≥ argument'),
    m('floor', 'double', 'double a', 'Returns the largest double ≤ argument'),
    m('log', 'double', 'double a', 'Returns the natural logarithm'),
    m('log10', 'double', 'double a', 'Returns the base 10 logarithm'),
    m('sin', 'double', 'double a', 'Returns the trigonometric sine'),
    m('cos', 'double', 'double a', 'Returns the trigonometric cosine'),
    m('tan', 'double', 'double a', 'Returns the trigonometric tangent'),
    m('toRadians', 'double', 'double angdeg', 'Converts degrees to radians'),
    m('toDegrees', 'double', 'double angrad', 'Converts radians to degrees'),
  ], [
    { name: 'PI', type: 'double', doc: 'The double value closer to π (3.141592653589793)' },
    { name: 'E', type: 'double', doc: 'The double value closer to e (2.718281828459045)' },
  ]),

  // ── System ──
  cls('System', 'Provides access to system-level resources', [], [
    m('currentTimeMillis', 'long', '', 'Returns the current time in milliseconds'),
    m('nanoTime', 'long', '', 'Returns the current value of the high-resolution time source in nanoseconds'),
    m('exit', 'void', 'int status', 'Terminates the currently running JVM'),
    m('gc', 'void', '', 'Runs the garbage collector'),
    m('arraycopy', 'void', 'Object src, int srcPos, Object dest, int destPos, int length', 'Copies an array'),
    m('getenv', 'String', 'String name', 'Gets the value of the specified environment variable'),
    m('getProperty', 'String', 'String key', 'Gets the system property indicated by the key'),
    m('lineSeparator', 'String', '', 'Returns the system-dependent line separator string'),
  ], [
    { name: 'out', type: 'PrintStream', doc: 'The standard output stream' },
    { name: 'err', type: 'PrintStream', doc: 'The standard error output stream' },
    { name: 'in', type: 'InputStream', doc: 'The standard input stream' },
  ]),

  // ── Arrays ──
  cls('Arrays', 'Utility methods for arrays', [], [
    m('sort', 'void', 'int[] a', 'Sorts the specified array into ascending order'),
    m('asList', 'List<T>', 'T... a', 'Returns a fixed-size list backed by the specified array'),
    m('stream', 'Stream<T>', 'T[] array', 'Returns a sequential Stream with the array as its source'),
    m('copyOf', 'T[]', 'T[] original, int newLength', 'Copies the specified array, truncating or padding'),
    m('copyOfRange', 'T[]', 'T[] original, int from, int to', 'Copies the specified range of the array'),
    m('fill', 'void', 'int[] a, int val', 'Assigns the specified value to each element'),
    m('toString', 'String', 'int[] a', 'Returns a string representation of the array'),
    m('deepToString', 'String', 'Object[] a', 'Returns a string representation of the deep contents'),
    m('binarySearch', 'int', 'int[] a, int key', 'Searches for the key using binary search'),
    m('equals', 'boolean', 'int[] a, int[] a2', 'Returns true if the two arrays are equal'),
    m('deepEquals', 'boolean', 'Object[] a1, Object[] a2', 'Returns true if the two arrays are deeply equal'),
  ]),

  // ── Collections ──
  cls('Collections', 'Utility methods for collections', [], [
    m('sort', 'void', 'List<T> list', 'Sorts the specified list into ascending order'),
    m('reverse', 'void', 'List<?> list', 'Reverses the order of elements'),
    m('shuffle', 'void', 'List<?> list', 'Randomly permutes the list'),
    m('unmodifiableList', 'List<T>', 'List<? extends T> list', 'Returns an unmodifiable view'),
    m('singletonList', 'List<T>', 'T o', 'Returns an immutable list containing only the specified object'),
    m('emptyList', 'List<T>', '', 'Returns an empty immutable list'),
    m('emptyMap', 'Map<K,V>', '', 'Returns an empty immutable map'),
    m('emptySet', 'Set<T>', '', 'Returns an empty immutable set'),
    m('frequency', 'int', 'Collection<?> c, Object o', 'Returns the number of elements equal to o'),
    m('max', 'T', 'Collection<? extends T> coll', 'Returns the maximum element'),
    m('min', 'T', 'Collection<? extends T> coll', 'Returns the minimum element'),
    m('swap', 'void', 'List<?> list, int i, int j', 'Swaps elements at the specified positions'),
    m('binarySearch', 'int', 'List<? extends Comparable<? super T>> list, T key', 'Searches using binary search'),
  ]),
]

// --------------- Collection Interfaces & Implementations ---------------
const LIST_METHODS: JavaMethodInfo[] = [
  m('add', 'boolean', 'E element', 'Appends the element to the end of the list'),
  m('add', 'void', 'int index, E element', 'Inserts the element at the specified position'),
  m('get', 'E', 'int index', 'Returns the element at the specified position'),
  m('set', 'E', 'int index, E element', 'Replaces the element at the specified position'),
  m('remove', 'E', 'int index', 'Removes the element at the specified position'),
  m('size', 'int', '', 'Returns the number of elements'),
  m('isEmpty', 'boolean', '', 'Returns true if this list contains no elements'),
  m('contains', 'boolean', 'Object o', 'Returns true if this list contains the specified element'),
  m('indexOf', 'int', 'Object o', 'Returns the index of the first occurrence'),
  m('lastIndexOf', 'int', 'Object o', 'Returns the index of the last occurrence'),
  m('clear', 'void', '', 'Removes all elements from this list'),
  m('toArray', 'Object[]', '', 'Returns an array containing all elements'),
  m('subList', 'List<E>', 'int fromIndex, int toIndex', 'Returns a view of the portion of this list'),
  m('iterator', 'Iterator<E>', '', 'Returns an iterator over the elements'),
  m('addAll', 'boolean', 'Collection<? extends E> c', 'Appends all elements in the specified collection'),
  m('sort', 'void', 'Comparator<? super E> c', 'Sorts this list according to the comparator'),
  m('stream', 'Stream<E>', '', 'Returns a sequential Stream with this collection as its source'),
  m('forEach', 'void', 'Consumer<? super E> action', 'Performs the given action for each element'),
  m('removeIf', 'boolean', 'Predicate<? super E> filter', 'Removes all elements matching the given predicate'),
]

const MAP_METHODS: JavaMethodInfo[] = [
  m('put', 'V', 'K key, V value', 'Associates the specified value with the specified key'),
  m('get', 'V', 'Object key', 'Returns the value to which the specified key is mapped'),
  m('containsKey', 'boolean', 'Object key', 'Returns true if this map contains the specified key'),
  m('containsValue', 'boolean', 'Object value', 'Returns true if this map maps one or more keys to the value'),
  m('keySet', 'Set<K>', '', 'Returns a Set view of the keys'),
  m('values', 'Collection<V>', '', 'Returns a Collection view of the values'),
  m('entrySet', 'Set<Map.Entry<K,V>>', '', 'Returns a Set view of the mappings'),
  m('remove', 'V', 'Object key', 'Removes the mapping for the specified key'),
  m('size', 'int', '', 'Returns the number of key-value mappings'),
  m('isEmpty', 'boolean', '', 'Returns true if this map contains no mappings'),
  m('clear', 'void', '', 'Removes all mappings from this map'),
  m('putIfAbsent', 'V', 'K key, V value', 'If the key is not already associated with a value, associates it'),
  m('getOrDefault', 'V', 'Object key, V defaultValue', 'Returns the value or a default if not present'),
  m('forEach', 'void', 'BiConsumer<? super K, ? super V> action', 'Performs the given action for each entry'),
  m('replace', 'V', 'K key, V value', 'Replaces the entry for the specified key'),
  m('merge', 'V', 'K key, V value, BiFunction<? super V, ? super V, ? extends V> remappingFunction', 'Merges the value for a key'),
  m('compute', 'V', 'K key, BiFunction<? super K, ? super V, ? extends V> remappingFunction', 'Computes a new mapping for the key'),
  m('putAll', 'void', 'Map<? extends K, ? extends V> m', 'Copies all mappings from the specified map'),
]

const SET_METHODS: JavaMethodInfo[] = [
  m('add', 'boolean', 'E element', 'Adds the specified element to this set'),
  m('contains', 'boolean', 'Object o', 'Returns true if this set contains the specified element'),
  m('remove', 'boolean', 'Object o', 'Removes the specified element from this set'),
  m('size', 'int', '', 'Returns the number of elements'),
  m('isEmpty', 'boolean', '', 'Returns true if this set contains no elements'),
  m('clear', 'void', '', 'Removes all elements from this set'),
  m('iterator', 'Iterator<E>', '', 'Returns an iterator over the elements'),
  m('toArray', 'Object[]', '', 'Returns an array containing all elements'),
  m('addAll', 'boolean', 'Collection<? extends E> c', 'Adds all elements in the specified collection'),
  m('retainAll', 'boolean', 'Collection<?> c', 'Retains only elements also contained in the specified collection'),
  m('removeAll', 'boolean', 'Collection<?> c', 'Removes all elements contained in the specified collection'),
  m('stream', 'Stream<E>', '', 'Returns a sequential Stream'),
  m('forEach', 'void', 'Consumer<? super E> action', 'Performs the given action for each element'),
]

export const JAVA_COLLECTION_CLASSES: JavaClassInfo[] = [
  iface('List', 'An ordered collection (sequence)', LIST_METHODS),
  cls('ArrayList', 'Resizable-array implementation of the List interface', LIST_METHODS),
  cls('LinkedList', 'Doubly-linked list implementation of List and Deque', LIST_METHODS),
  iface('Map', 'An object that maps keys to values', MAP_METHODS),
  cls('HashMap', 'Hash table based implementation of the Map interface', MAP_METHODS),
  cls('TreeMap', 'Red-Black tree based NavigableMap implementation (sorted)', MAP_METHODS),
  cls('LinkedHashMap', 'Hash table + linked list implementation (insertion-ordered)', MAP_METHODS),
  iface('Set', 'A collection that contains no duplicate elements', SET_METHODS),
  cls('HashSet', 'Hash table backed implementation of the Set interface', SET_METHODS),
  cls('TreeSet', 'NavigableSet implementation based on TreeMap (sorted)', SET_METHODS),
  cls('LinkedHashSet', 'Hash table + linked list implementation (insertion-ordered)', SET_METHODS),
  cls('Stack', 'LIFO stack of objects', [
    m('push', 'E', 'E item', 'Pushes an item onto the top of this stack'),
    m('pop', 'E', '', 'Removes and returns the object at the top'),
    m('peek', 'E', '', 'Looks at the object at the top without removing it'),
    m('empty', 'boolean', '', 'Tests if this stack is empty'),
    m('search', 'int', 'Object o', 'Returns the 1-based position from the top'),
  ]),
  cls('PriorityQueue', 'Priority heap-based queue', [
    m('add', 'boolean', 'E e', 'Inserts the specified element'),
    m('offer', 'boolean', 'E e', 'Inserts the specified element'),
    m('poll', 'E', '', 'Retrieves and removes the head, or returns null'),
    m('peek', 'E', '', 'Retrieves but does not remove the head, or returns null'),
    m('remove', 'boolean', 'Object o', 'Removes a single instance of the specified element'),
    m('size', 'int', '', 'Returns the number of elements'),
    m('isEmpty', 'boolean', '', 'Returns true if empty'),
    m('clear', 'void', '', 'Removes all elements'),
  ]),
]

// --------------- Java 8 Stream & Optional & Functional ---------------
export const JAVA_STREAM_CLASSES: JavaClassInfo[] = [
  iface('Stream', 'A sequence of elements supporting sequential and parallel operations', [
    m('filter', 'Stream<T>', 'Predicate<? super T> predicate', 'Returns a stream of elements matching the predicate'),
    m('map', 'Stream<R>', 'Function<? super T, ? extends R> mapper', 'Returns a stream with the given function applied'),
    m('flatMap', 'Stream<R>', 'Function<? super T, ? extends Stream<? extends R>> mapper', 'Flattens and maps'),
    m('reduce', 'Optional<T>', 'BinaryOperator<T> accumulator', 'Performs a reduction on the elements'),
    m('collect', 'R', 'Collector<? super T, A, R> collector', 'Performs a mutable reduction'),
    m('forEach', 'void', 'Consumer<? super T> action', 'Performs an action for each element'),
    m('sorted', 'Stream<T>', '', 'Returns a stream sorted according to natural order'),
    m('distinct', 'Stream<T>', '', 'Returns a stream with distinct elements'),
    m('limit', 'Stream<T>', 'long maxSize', 'Returns a stream truncated to be no longer than maxSize'),
    m('skip', 'Stream<T>', 'long n', 'Returns a stream discarding the first n elements'),
    m('peek', 'Stream<T>', 'Consumer<? super T> action', 'Returns a stream that also performs the action'),
    m('count', 'long', '', 'Returns the count of elements'),
    m('findFirst', 'Optional<T>', '', 'Returns an Optional for the first element'),
    m('findAny', 'Optional<T>', '', 'Returns an Optional for any element'),
    m('anyMatch', 'boolean', 'Predicate<? super T> predicate', 'Returns whether any elements match the predicate'),
    m('allMatch', 'boolean', 'Predicate<? super T> predicate', 'Returns whether all elements match the predicate'),
    m('noneMatch', 'boolean', 'Predicate<? super T> predicate', 'Returns whether no elements match the predicate'),
    m('toArray', 'Object[]', '', 'Returns an array containing the elements'),
    m('min', 'Optional<T>', 'Comparator<? super T> comparator', 'Returns the minimum element'),
    m('max', 'Optional<T>', 'Comparator<? super T> comparator', 'Returns the maximum element'),
    m('mapToInt', 'IntStream', 'ToIntFunction<? super T> mapper', 'Returns an IntStream'),
    m('mapToLong', 'LongStream', 'ToLongFunction<? super T> mapper', 'Returns a LongStream'),
    m('mapToDouble', 'DoubleStream', 'ToDoubleFunction<? super T> mapper', 'Returns a DoubleStream'),
  ]),

  cls('Optional', 'A container object which may or may not contain a non-null value', [
    m('isPresent', 'boolean', '', 'Returns true if a value is present'),
    m('get', 'T', '', 'If a value is present, returns the value'),
    m('orElse', 'T', 'T other', 'Returns the value if present, otherwise returns other'),
    m('orElseGet', 'T', 'Supplier<? extends T> supplier', 'Returns the value if present, otherwise invokes supplier'),
    m('orElseThrow', 'T', 'Supplier<? extends X> exceptionSupplier', 'Returns the value if present, otherwise throws'),
    m('map', 'Optional<U>', 'Function<? super T, ? extends U> mapper', 'If a value is present, applies the mapping function'),
    m('flatMap', 'Optional<U>', 'Function<? super T, Optional<U>> mapper', 'If a value is present, applies the Optional-bearing mapping function'),
    m('filter', 'Optional<T>', 'Predicate<? super T> predicate', 'If a value is present and matches, returns this Optional'),
    m('ifPresent', 'void', 'Consumer<? super T> action', 'If a value is present, performs the given action'),
  ], [
    m('of', 'Optional<T>', 'T value', 'Returns an Optional with the specified present non-null value'),
    m('ofNullable', 'Optional<T>', 'T value', 'Returns an Optional for the specified value, which may be null'),
    m('empty', 'Optional<T>', '', 'Returns an empty Optional instance'),
  ]),

  cls('Collectors', 'Implementations of Collector for use with Stream.collect()', [], [
    m('toList', 'Collector<T,?,List<T>>', '', 'Returns a Collector that accumulates elements into a List'),
    m('toSet', 'Collector<T,?,Set<T>>', '', 'Returns a Collector that accumulates elements into a Set'),
    m('toMap', 'Collector<T,?,Map<K,U>>', 'Function keyMapper, Function valueMapper', 'Returns a Collector that accumulates elements into a Map'),
    m('joining', 'Collector<CharSequence,?,String>', 'CharSequence delimiter', 'Returns a Collector that concatenates input elements separated by the delimiter'),
    m('groupingBy', 'Collector<T,?,Map<K,List<T>>>', 'Function<? super T, ? extends K> classifier', 'Groups elements by a classifier function'),
    m('partitioningBy', 'Collector<T,?,Map<Boolean,List<T>>>', 'Predicate<? super T> predicate', 'Partitions elements by a predicate'),
    m('counting', 'Collector<T,?,Long>', '', 'Returns a Collector that counts elements'),
    m('summarizingInt', 'Collector<T,?,IntSummaryStatistics>', 'ToIntFunction<? super T> mapper', 'Returns summary statistics Collector'),
    m('toUnmodifiableList', 'Collector<T,?,List<T>>', '', 'Returns a Collector that accumulates into an unmodifiable List'),
    m('toUnmodifiableSet', 'Collector<T,?,Set<T>>', '', 'Returns a Collector that accumulates into an unmodifiable Set'),
  ]),
]

// --------------- Functional Interfaces ---------------
export const JAVA_FUNCTIONAL_INTERFACES: JavaClassInfo[] = [
  iface('Predicate', 'Represents a boolean-valued function of one argument', [
    m('test', 'boolean', 'T t', 'Evaluates this predicate on the given argument'),
    m('and', 'Predicate<T>', 'Predicate<? super T> other', 'Returns a composed predicate that represents a logical AND'),
    m('or', 'Predicate<T>', 'Predicate<? super T> other', 'Returns a composed predicate that represents a logical OR'),
    m('negate', 'Predicate<T>', '', 'Returns a predicate that represents the logical negation'),
  ]),
  iface('Function', 'Represents a function that accepts one argument and produces a result', [
    m('apply', 'R', 'T t', 'Applies this function to the given argument'),
    m('andThen', 'Function<T,V>', 'Function<? super R, ? extends V> after', 'Returns a composed function'),
    m('compose', 'Function<V,R>', 'Function<? super V, ? extends T> before', 'Returns a composed function'),
  ]),
  iface('Consumer', 'Represents an operation that accepts a single input and returns no result', [
    m('accept', 'void', 'T t', 'Performs this operation on the given argument'),
    m('andThen', 'Consumer<T>', 'Consumer<? super T> after', 'Returns a composed Consumer'),
  ]),
  iface('Supplier', 'Represents a supplier of results', [
    m('get', 'T', '', 'Gets a result'),
  ]),
  iface('BiFunction', 'Represents a function that accepts two arguments and produces a result', [
    m('apply', 'R', 'T t, U u', 'Applies this function to the given arguments'),
    m('andThen', 'BiFunction<T,U,V>', 'Function<? super R, ? extends V> after', 'Returns a composed function'),
  ]),
  iface('BiConsumer', 'Represents an operation that accepts two input arguments and returns no result', [
    m('accept', 'void', 'T t, U u', 'Performs this operation on the given arguments'),
  ]),
  iface('UnaryOperator', 'Represents an operation on a single operand producing a result of the same type', [
    m('apply', 'T', 'T t', 'Applies this operator to the given operand'),
  ]),
  iface('BinaryOperator', 'Represents an operation on two operands of the same type', [
    m('apply', 'T', 'T t1, T t2', 'Applies this operator to the given operands'),
  ]),
  iface('Comparator', 'A comparison function which imposes a total ordering', [
    m('compare', 'int', 'T o1, T o2', 'Compares its two arguments for order'),
    m('reversed', 'Comparator<T>', '', 'Returns a comparator that imposes the reverse ordering'),
    m('thenComparing', 'Comparator<T>', 'Comparator<? super T> other', 'Returns a composed comparator'),
  ]),
]

// --------------- I/O & Exceptions ---------------
export const JAVA_IO_EXCEPTION_CLASSES: JavaClassInfo[] = [
  cls('Scanner', 'A simple text scanner for parsing primitive types and strings', [
    m('nextLine', 'String', '', 'Advances past the current line and returns the input that was skipped'),
    m('nextInt', 'int', '', 'Scans the next token as an int'),
    m('nextDouble', 'double', '', 'Scans the next token as a double'),
    m('next', 'String', '', 'Finds and returns the next complete token'),
    m('hasNext', 'boolean', '', 'Returns true if there is another token'),
    m('hasNextLine', 'boolean', '', 'Returns true if there is another line'),
    m('hasNextInt', 'boolean', '', 'Returns true if the next token can be interpreted as an int'),
    m('close', 'void', '', 'Closes this scanner'),
    m('useDelimiter', 'Scanner', 'String pattern', 'Sets the delimiting pattern'),
  ]),
  cls('PrintStream', 'Adds the ability to print representations of various data values', [
    m('println', 'void', 'String x', 'Prints a String and then terminates the line'),
    m('print', 'void', 'String s', 'Prints a String without a newline'),
    m('printf', 'PrintStream', 'String format, Object... args', 'Writes a formatted string'),
    m('flush', 'void', '', 'Flushes the stream'),
    m('close', 'void', '', 'Closes the stream'),
  ]),
  cls('Exception', 'The superclass of all exceptions', [
    m('getMessage', 'String', '', 'Returns the detail message string'),
    m('printStackTrace', 'void', '', 'Prints the stack trace to the standard error stream'),
    m('getCause', 'Throwable', '', 'Returns the cause of this throwable'),
    m('toString', 'String', '', 'Returns a short description'),
  ]),
  cls('RuntimeException', 'Superclass of unchecked exceptions', [
    m('getMessage', 'String', '', 'Returns the detail message string'),
    m('printStackTrace', 'void', '', 'Prints the stack trace'),
  ]),
  cls('NullPointerException', 'Thrown when an application attempts to use null where an object is required', [
    m('getMessage', 'String', '', 'Returns the detail message string'),
  ]),
  cls('IllegalArgumentException', 'Thrown to indicate that a method has been passed an illegal argument', [
    m('getMessage', 'String', '', 'Returns the detail message string'),
  ]),
  cls('IOException', 'Signals that an I/O exception of some sort has occurred', [
    m('getMessage', 'String', '', 'Returns the detail message string'),
    m('printStackTrace', 'void', '', 'Prints the stack trace'),
  ]),
]

// --------------- Aggregate all classes ---------------
export const ALL_JAVA_CLASSES: JavaClassInfo[] = [
  ...JAVA_CLASSES,
  ...JAVA_COLLECTION_CLASSES,
  ...JAVA_STREAM_CLASSES,
  ...JAVA_FUNCTIONAL_INTERFACES,
  ...JAVA_IO_EXCEPTION_CLASSES,
]

// --------------- Type alias map for dot-completion ---------------
// Maps common type names/aliases to the class info for method lookup
export function findClassByName(name: string): JavaClassInfo | undefined {
  // Handle generic types like List<String> -> List
  const baseName = name.replace(/<.*>/, '').trim()
  return ALL_JAVA_CLASSES.find(c => c.name === baseName)
}

// Maps common type shorthands
const TYPE_ALIASES: Record<string, string> = {
  'string': 'String',
  'list': 'List',
  'arraylist': 'ArrayList',
  'linkedlist': 'LinkedList',
  'map': 'Map',
  'hashmap': 'HashMap',
  'treemap': 'TreeMap',
  'set': 'Set',
  'hashset': 'HashSet',
  'treeset': 'TreeSet',
  'optional': 'Optional',
  'stream': 'Stream',
  'scanner': 'Scanner',
  'stringbuilder': 'StringBuilder',
  'integer': 'Integer',
  'double': 'Double',
  'long': 'Long',
  'boolean': 'Boolean',
  'character': 'Character',
  'object': 'Object',
  'stack': 'Stack',
  'priorityqueue': 'PriorityQueue',
  'exception': 'Exception',
  'printstream': 'PrintStream',
}

export function resolveType(typeName: string): JavaClassInfo | undefined {
  const baseName = typeName.replace(/<.*>/, '').trim()
  const resolved = TYPE_ALIASES[baseName.toLowerCase()] || baseName
  return findClassByName(resolved)
}
