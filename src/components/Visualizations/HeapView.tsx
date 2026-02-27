// ============================================
// Enhanced Heap View with Data Structure Visualization
// ============================================

import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../../state/executionStore'
import { valueToString, HeapObject, Value } from '../../jvm/types/JVMState'
import { useState } from 'react'

const typeColors: Record<string, { border: string; bg: string; text: string }> = {
  object: { border: 'border-jvm-heap', bg: 'bg-jvm-heap/10', text: 'text-jvm-heap' },
  array: { border: 'border-jvm-method', bg: 'bg-jvm-method/10', text: 'text-jvm-method' },
  lambda: { border: 'border-jvm-pc', bg: 'bg-jvm-pc/10', text: 'text-jvm-pc' },
  string: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
}

export function HeapView() {
  const { jvmState } = useExecutionStore()
  const { heap } = jvmState
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid')
  const [selectedObject, setSelectedObject] = useState<string | null>(null)

  return (
    <div className="h-full flex flex-col jvm-panel overflow-hidden">
      <div className="jvm-panel-header text-jvm-heap">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        Heap Memory
        <span className="text-dark-muted font-normal ml-2">{heap.length} objects</span>

        {/* View Mode Toggle */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded ${viewMode === 'grid' ? 'bg-jvm-heap/30 text-jvm-heap' : 'text-dark-muted hover:text-dark-text'}`}
            title="Grid View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${viewMode === 'list' ? 'bg-jvm-heap/30 text-jvm-heap' : 'text-dark-muted hover:text-dark-text'}`}
            title="List View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`p-1 rounded ${viewMode === 'tree' ? 'bg-jvm-heap/30 text-jvm-heap' : 'text-dark-muted hover:text-dark-text'}`}
            title="Tree View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="popLayout">
          {heap.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-dark-muted text-sm text-center py-8"
            >
              <div className="mb-2">
                <svg className="w-12 h-12 mx-auto text-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              No objects allocated on heap
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              {heap.map((obj) => (
                <HeapObjectCard
                  key={obj.id}
                  obj={obj}
                  isSelected={selectedObject === obj.id}
                  onSelect={() => setSelectedObject(selectedObject === obj.id ? null : obj.id)}
                  allObjects={heap}
                />
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-1">
              {heap.map((obj) => (
                <HeapObjectRow
                  key={obj.id}
                  obj={obj}
                  isSelected={selectedObject === obj.id}
                  onSelect={() => setSelectedObject(selectedObject === obj.id ? null : obj.id)}
                />
              ))}
            </div>
          ) : (
            <HeapTreeView objects={heap} />
          )}
        </AnimatePresence>
      </div>

      {/* Heap Stats */}
      <div className="mt-2 pt-2 border-t border-dark-border">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-jvm-heap/30 border border-jvm-heap" />
            <span className="text-dark-muted">Objects: {heap.filter(o => o.type === 'object').length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-jvm-method/30 border border-jvm-method" />
            <span className="text-dark-muted">Arrays: {heap.filter(o => o.type === 'array').length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-jvm-pc/30 border border-jvm-pc" />
            <span className="text-dark-muted">Lambdas: {heap.filter(o => o.type === 'lambda').length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HeapObjectCardProps {
  obj: HeapObject
  isSelected: boolean
  onSelect: () => void
  allObjects: HeapObject[]
}

function HeapObjectCard({ obj, isSelected, onSelect, allObjects }: HeapObjectCardProps) {
  const colors = typeColors[obj.type] || typeColors.object

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onClick={onSelect}
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${colors.border} ${colors.bg} ${isSelected ? 'ring-2 ring-white/30 shadow-lg' : 'hover:shadow-md'
        }`}
    >
      {/* Object Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-mono font-bold ${colors.text}`}>@{obj.id}</span>
        <span className="font-semibold text-sm truncate flex-1">{obj.className}</span>
        <TypeBadge type={obj.type} />
      </div>

      {/* GC Info */}
      <div className="flex items-center gap-2 mb-2">
        {obj.gcRoot && (
          <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            GC Root
          </span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded ${obj.isReachable ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {obj.isReachable ? 'Reachable' : 'Unreachable'}
        </span>
        <span className="text-xs text-dark-muted ml-auto">Step #{obj.createdAtStep}</span>
      </div>

      {/* Object Content */}
      {obj.type === 'array' && obj.arrayElements && (
        <ArrayVisualization elements={obj.arrayElements} className={obj.className} />
      )}

      {obj.type === 'object' && obj.fields.length > 0 && (
        <ObjectFieldsVisualization fields={obj.fields} allObjects={allObjects} />
      )}

      {obj.type === 'lambda' && (
        <LambdaVisualization obj={obj} />
      )}

      {obj.type === 'string' && obj.stringValue && (
        <div className="p-2 bg-dark-bg rounded border border-dark-border">
          <span className="font-mono text-yellow-400">"{obj.stringValue}"</span>
        </div>
      )}
    </motion.div>
  )
}

function ArrayVisualization({ elements, className }: { elements: Value[]; className: string }) {
  const isStack = className.toLowerCase().includes('stack')
  const isQueue = className.toLowerCase().includes('queue')
  const isLinkedList = className.toLowerCase().includes('list') || className.toLowerCase().includes('linked')

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-dark-muted">
        <span>Length: {elements.length}</span>
        {isStack && <span className="px-1.5 py-0.5 bg-jvm-stack/20 text-jvm-stack rounded">Stack</span>}
        {isQueue && <span className="px-1.5 py-0.5 bg-jvm-heap/20 text-jvm-heap rounded">Queue</span>}
        {isLinkedList && <span className="px-1.5 py-0.5 bg-jvm-method/20 text-jvm-method rounded">List</span>}
      </div>

      {elements.length === 0 ? (
        <div className="text-xs text-dark-muted italic p-2 bg-dark-bg rounded">Empty array</div>
      ) : (
        <div className={`flex gap-1 overflow-x-auto p-2 bg-dark-bg rounded ${isStack ? 'flex-col-reverse' : ''}`}>
          {elements.slice(0, 20).map((elem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`flex-shrink-0 px-2 py-1 rounded border text-xs font-mono ${isStack && i === elements.length - 1
                  ? 'bg-jvm-stack/20 border-jvm-stack text-jvm-stack'
                  : isQueue && i === 0
                    ? 'bg-jvm-heap/20 border-jvm-heap text-jvm-heap'
                    : 'bg-dark-card border-dark-border text-dark-text'
                }`}
            >
              <span className="text-dark-muted mr-1">[{i}]</span>
              {valueToString(elem)}
            </motion.div>
          ))}
          {elements.length > 20 && (
            <div className="text-xs text-dark-muted self-center">+{elements.length - 20} more</div>
          )}
        </div>
      )}

      {isStack && elements.length > 0 && (
        <div className="flex justify-between text-xs text-dark-muted px-2">
          <span>Bottom</span>
          <span>Top (index {elements.length - 1})</span>
        </div>
      )}
      {isQueue && elements.length > 0 && (
        <div className="flex justify-between text-xs text-dark-muted px-2">
          <span>Front (dequeue)</span>
          <span>Back (enqueue)</span>
        </div>
      )}
    </div>
  )
}

function ObjectFieldsVisualization({ fields, allObjects }: { fields: HeapObject['fields']; allObjects: HeapObject[] }) {
  // Check if this might be a linked list node
  const hasNextField = fields.some(f => f.name.toLowerCase() === 'next')
  const hasDataField = fields.some(f => f.name.toLowerCase() === 'data' || f.name.toLowerCase() === 'value')
  const isLinkedListNode = hasNextField && (hasDataField || fields.length <= 3)

  // Check if this might be a tree node
  const hasLeftRight = fields.some(f => f.name.toLowerCase() === 'left') && fields.some(f => f.name.toLowerCase() === 'right')
  const isTreeNode = hasLeftRight

  return (
    <div className="space-y-1">
      <div className="text-xs text-dark-muted mb-1 flex items-center gap-2">
        <span>Fields ({fields.length})</span>
        {isLinkedListNode && <span className="px-1.5 py-0.5 bg-jvm-method/20 text-jvm-method rounded">Linked Node</span>}
        {isTreeNode && <span className="px-1.5 py-0.5 bg-jvm-pc/20 text-jvm-pc rounded">Tree Node</span>}
      </div>

      <div className="space-y-1 p-2 bg-dark-bg rounded">
        {fields.map((field, i) => {
          const val = field.value
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2 text-xs"
            >
              <span className={`font-medium ${field.name === 'next' || field.name === 'left' || field.name === 'right'
                  ? 'text-jvm-heap'
                  : 'text-dark-accent'
                }`}>
                {field.name}
              </span>
              <span className="text-dark-muted">=</span>
              <span className="font-mono bg-dark-card px-1.5 py-0.5 rounded">
                {valueToString(val)}
              </span>
              {val.kind === 'reference' && val.objectId && (
                <span className="text-dark-muted">
                  → {allObjects.find(o => o.id === val.objectId)?.className || 'Object'}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function LambdaVisualization({ obj }: { obj: HeapObject }) {
  const infoField = obj.fields.find(f => f.name === 'info')

  return (
    <div className="p-2 bg-dark-bg rounded border border-jvm-pc/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-jvm-pc font-bold">λ</span>
        <span className="text-sm text-dark-text">Lambda Expression</span>
      </div>
      {infoField && (
        <div className="font-mono text-xs text-dark-muted bg-dark-card p-2 rounded">
          {valueToString(infoField.value)}
        </div>
      )}
    </div>
  )
}

function HeapObjectRow({ obj, isSelected, onSelect }: { obj: HeapObject; isSelected: boolean; onSelect: () => void }) {
  const colors = typeColors[obj.type] || typeColors.object

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onSelect}
      className={`p-2 rounded border cursor-pointer transition-all flex items-center gap-3 ${colors.border} ${isSelected ? colors.bg : 'bg-dark-bg hover:' + colors.bg
        }`}
    >
      <span className={`text-xs font-mono font-bold ${colors.text}`}>@{obj.id}</span>
      <span className="font-medium text-sm">{obj.className}</span>
      <TypeBadge type={obj.type} />
      {obj.type === 'array' && obj.arrayLength !== undefined && (
        <span className="text-xs text-dark-muted">[{obj.arrayLength}]</span>
      )}
      {obj.gcRoot && (
        <span className="text-xs text-green-400">GC Root</span>
      )}
      <span className="text-xs text-dark-muted ml-auto">Step #{obj.createdAtStep}</span>
    </motion.div>
  )
}

function HeapTreeView({ objects }: { objects: HeapObject[] }) {
  // Find root objects (GC roots or objects not referenced by others)
  const referencedIds = new Set<string>()
  objects.forEach(obj => {
    obj.references.forEach(ref => referencedIds.add(ref))
    obj.fields.forEach(field => {
      if (field.value.kind === 'reference' && field.value.objectId) {
        referencedIds.add(field.value.objectId)
      }
    })
  })

  const roots = objects.filter(obj => obj.gcRoot || !referencedIds.has(obj.id))

  return (
    <div className="space-y-2 p-2">
      {roots.map(root => (
        <TreeNode key={root.id} obj={root} allObjects={objects} depth={0} />
      ))}
    </div>
  )
}

function TreeNode({ obj, allObjects, depth }: { obj: HeapObject; allObjects: HeapObject[]; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const colors = typeColors[obj.type] || typeColors.object

  // Find child references
  const childRefs: string[] = []
  obj.fields.forEach(field => {
    if (field.value.kind === 'reference' && field.value.objectId) {
      childRefs.push(field.value.objectId)
    }
  })
  const children = allObjects.filter(o => childRefs.includes(o.id))

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${colors.border} ${colors.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        {children.length > 0 && (
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} className="text-dark-muted">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.span>
        )}
        <span className={`text-xs font-mono ${colors.text}`}>@{obj.id}</span>
        <span className="text-sm font-medium">{obj.className}</span>
        {obj.gcRoot && <span className="text-xs text-green-400">Root</span>}
      </div>

      {expanded && children.map(child => (
        <TreeNode key={child.id} obj={child} allObjects={allObjects} depth={depth + 1} />
      ))}
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors = typeColors[type] || typeColors.object

  const icons: Record<string, string> = {
    object: '{}',
    array: '[]',
    lambda: 'λ',
    string: '""',
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} font-medium`}>
      {icons[type] || '?'} {type}
    </span>
  )
}
