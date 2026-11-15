/**
 * App.jsx — Visual MongoDB Schema Builder
 * ---------------------------------------------------------------------------
 * A single-page tool to design Mongoose schemas visually and export them as
 * ready-to-use JavaScript files.
 *
 * Architecture:
 *  - State lives in App via useReducer (fields are a list -> reducer keeps
 *    updates immutable and predictable).
 *  - `utils/codeGenerator.js` holds all pure code-generation / highlighting
 *    logic so components stay presentational.
 *  - Layout: responsive grid — control sidebar (lg:left column) + live
 *    code preview (main area).
 */

import React, { useMemo, useReducer, useState } from 'react'
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Braces,
  KeyRound,
  FileType,
} from 'lucide-react'
import {
  DATA_TYPES,
  generateMongooseCode,
  highlightJavaScript,
  toValidModelName,
} from './utils/codeGenerator'

/* ===========================================================================
 * State management (useReducer)
 * ======================================================================== */

let idCounter = 0
const nextId = () => `field-${Date.now()}-${idCounter++}`

/** Factory for a blank field row. */
const createField = (overrides = {}) => ({
  id: nextId(),
  name: '',
  type: 'String',
  required: false,
  unique: false,
  defaultValue: '',
  enumValues: '', // only meaningful when type === 'String'
  ref: '', // populated reference (ObjectId / Array<ObjectId>)
  arrayItemType: 'String', // item type when type === 'Array'
  ...overrides,
})

/** Sensible starting point so the preview is never empty. */
const initialState = {
  modelName: 'User',
  fields: [
    createField({
      name: 'username',
      type: 'String',
      required: true,
      unique: true,
    }),
    createField({
      name: 'email',
      type: 'String',
      required: true,
      unique: true,
    }),
    createField({
      name: 'role',
      type: 'String',
      enumValues: 'admin, editor, viewer',
      defaultValue: 'viewer',
    }),
    createField({ name: 'isActive', type: 'Boolean', defaultValue: 'true' }),
  ],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODEL_NAME':
      return { ...state, modelName: action.payload }

    case 'ADD_FIELD':
      return { ...state, fields: [...state.fields, createField()] }

    case 'REMOVE_FIELD':
      return {
        ...state,
        fields: state.fields.filter((f) => f.id !== action.payload),
      }

    case 'UPDATE_FIELD': {
      const { id, prop, value } = action.payload
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === id ? { ...f, [prop]: value } : f,
        ),
      }
    }

    default:
      return state
  }
}

/* ===========================================================================
 * Small presentational helpers
 * ======================================================================== */

/** Label wrapper for inputs to keep consistent styling across the panel. */
function LabeledInput({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-md border border-slate-600/60 bg-slate-800/70 px-2.5 py-1.5 text-sm text-slate-100 ' +
  'placeholder-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 ' +
  'hover:border-slate-500'

/* ===========================================================================
 * FieldEditor — one editable row in the field list
 * ======================================================================== */

function FieldEditor({ field, onChange, onRemove, index }) {
  const set = (prop) => (e) => {
    const value =
      e.target.type === 'checkbox' ? e.target.checked : e.target.value
    onChange(field.id, prop, value)
  }

  return (
    <li className="group rounded-lg border border-slate-700 bg-slate-800/50 p-3 shadow-sm transition hover:border-slate-600">
      {/* Header row: index badge, name, type, delete */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">
          {index + 1}
        </span>

        <input
          type="text"
          value={field.name}
          onChange={set('name')}
          placeholder="fieldName"
          className={`${inputCls} flex-1 font-mono`}
          aria-label={`Name of field ${index + 1}`}
        />

        <select
          value={field.type}
          onChange={set('type')}
          className={`${inputCls} w-32 shrink-0 cursor-pointer`}
          aria-label={`Data type of field ${index + 1}`}
        >
          {DATA_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onRemove(field.id)}
          title="Delete field"
          aria-label={`Delete field ${field.name || index + 1}`}
          className="shrink-0 rounded-md p-2 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400 active:scale-95"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Options row */}
      <div className="mt-2.5 flex flex-wrap items-end gap-x-4 gap-y-2 pl-8">
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={field.required}
            onChange={set('required')}
            className="h-4 w-4 accent-emerald-500"
          />
          Required
        </label>

        <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={field.unique}
            onChange={set('unique')}
            disabled={field.type === 'Array' || field.type === 'Object'}
            className="h-4 w-4 accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          />
          Unique
        </label>

        <LabeledInput label="Default value" className="w-40">
          <input
            type="text"
            value={field.defaultValue}
            onChange={set('defaultValue')}
            placeholder="optional"
            className={`${inputCls} font-mono text-xs`}
          />
        </LabeledInput>

        {/* Enum values — only shown for String fields (per spec) */}
        {field.type === 'String' && (
          <LabeledInput label="Enum values (comma-separated)" className="min-w-48 flex-1">
            <input
              type="text"
              value={field.enumValues}
              onChange={set('enumValues')}
              placeholder="e.g. active, inactive"
              className={`${inputCls} font-mono text-xs`}
            />
          </LabeledInput>
        )}

        {/* Reference model — extra affordance for ObjectId relations */}
        {(field.type === 'ObjectId' ||
          (field.type === 'Array' && field.arrayItemType === 'ObjectId')) && (
          <LabeledInput label="Ref model" className="w-32">
            <input
              type="text"
              value={field.ref}
              onChange={set('ref')}
              placeholder="e.g. User"
              className={`${inputCls} font-mono text-xs`}
            />
          </LabeledInput>
        )}

        {/* Item type selector for Array fields */}
        {field.type === 'Array' && (
          <LabeledInput label="Array item type" className="w-32">
            <select
              value={field.arrayItemType}
              onChange={set('arrayItemType')}
              className={`${inputCls} cursor-pointer`}
            >
              {['String', 'Number', 'Boolean', 'Date', 'ObjectId'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </LabeledInput>
        )}
      </div>
    </li>
  )
}

/* ===========================================================================
 * CodePreview — read-only, syntax-highlighted live output
 * ======================================================================== */

function CodePreview({ code }) {
  const tokens = useMemo(() => highlightJavaScript(code), [code])
  const lineCount = code.split('\n').length

  return (
    <div className="relative h-full overflow-auto rounded-xl border border-slate-700 bg-slate-950/80">
      <pre className="min-w-full p-4 font-mono text-[13px] leading-relaxed">
        <code>
          {tokens.map((tok, i) => (
            <span key={i} className={tok.cls}>
              {tok.text}
            </span>
          ))}
        </code>
      </pre>
      <span className="pointer-events-none absolute bottom-3 right-4 rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-500">
        {lineCount} lines · JavaScript
      </span>
    </div>
  )
}

/* ===========================================================================
 * App
 * ======================================================================== */

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [copied, setCopied] = useState(false)

  /* --- derived: regenerate code whenever state changes ------------------- */
  const generatedCode = useMemo(
    () => generateMongooseCode(state.modelName, state.fields),
    [state.modelName, state.fields],
  )

  const validFieldCount = state.fields.filter((f) => f.name.trim()).length

  /* --- handlers ------------------------------------------------------------ */
  const updateField = (id, prop, value) =>
    dispatch({ type: 'UPDATE_FIELD', payload: { id, prop, value } })

  const removeField = (id) => dispatch({ type: 'REMOVE_FIELD', payload: id })

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
    } catch {
      // Fallback for insecure contexts / older browsers
      const ta = document.createElement('textarea')
      ta.value = generatedCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${toValidModelName(state.modelName)}.model.js`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /* --- render --------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* ============================ Header ============================ */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
              <Database size={22} />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-lg">
                Mongo Schema Builder
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                Design visually · Export Mongoose code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition active:scale-95 ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="hidden sm:inline">
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-95"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download .js</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================= Main layout ========================== */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(360px,440px)_1fr]">
        {/* ---------------------- Sidebar: controls ---------------------- */}
        <aside className="flex flex-col gap-5">
          {/* Model configuration card */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
              <Braces size={16} className="text-emerald-400" />
              Model Configuration
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <LabeledInput label="Model Name" className="flex-1">
                <input
                  type="text"
                  value={state.modelName}
                  onChange={(e) =>
                    dispatch({ type: 'SET_MODEL_NAME', payload: e.target.value })
                  }
                  placeholder="e.g. Asset, User, Product"
                  className={`${inputCls} font-mono`}
                />
              </LabeledInput>
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADD_FIELD' })}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-95"
              >
                <Plus size={16} />
                Add New Field
              </button>
            </div>
            {state.modelName.trim() &&
              state.modelName !== toValidModelName(state.modelName) && (
                <p className="mt-2 text-xs text-slate-500">
                  Will be exported as model{' '}
                  <code className="rounded bg-slate-800 px-1 py-0.5 text-emerald-300">
                    {toValidModelName(state.modelName)}
                  </code>
                </p>
              )}
          </section>

          {/* Field list card */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <FileType size={16} className="text-emerald-400" />
                Fields
              </h2>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                {validFieldCount} defined
              </span>
            </div>

            {state.fields.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-700 py-10 text-center">
                <KeyRound size={28} className="text-slate-600" />
                <p className="text-sm text-slate-500">
                  No fields yet. Click{' '}
                  <span className="font-semibold text-slate-300">
                    “Add New Field”
                  </span>{' '}
                  to start building your schema.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.fields.map((field, i) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={i}
                    onChange={updateField}
                    onRemove={removeField}
                  />
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* -------------------- Main: live preview ----------------------- */}
        <section className="flex min-h-[420px] flex-col lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <span className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </span>
              Live Preview — {toValidModelName(state.modelName)}.model.js
            </h2>
            <span className="text-xs text-slate-500">Updates in real time</span>
          </div>
          <div className="min-h-0 flex-1">
            <CodePreview code={generatedCode} />
          </div>
        </section>
      </main>

      {/* ============================ Footer ============================ */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        Built with React + Tailwind + Lucide · Paste the output into any
        Node/Mongoose project
      </footer>
    </div>
  )
}
