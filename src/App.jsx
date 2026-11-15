import React, { useMemo, useReducer, useState } from 'react'
import { Database, Plus, Copy, Check, Download, Braces, FileType, KeyRound } from 'lucide-react'
import FieldItem from './components/FieldItem'
import { generateMongooseCode, highlightJavaScript, toValidModelName } from './utils/codeGenerator'

let idCounter = 0
const nextId = () => `field-${Date.now()}-${idCounter++}`

const createField = (overrides = {}) => ({
  id: nextId(),
  name: 'fieldName',
  type: 'String',
  required: false,
  unique: false,
  defaultValue: '',
  enumValues: '',
  ref: '',
  arrayItemType: 'String',
  ...overrides,
})

const initialState = {
  modelName: 'Venue',
  fields: [
    createField({ name: 'property_id', type: 'String', unique: true }),
    createField({ name: 'name', type: 'String' }),
    createField({
      name: 'category',
      type: 'String',
      enumValues:
        'lecture_hall,lab,lab_instrument,furniture,library_computer,gym,auditorium,study_area,service_center',
    }),
    createField({ name: 'department', type: 'String' }),
    createField({ name: 'location_building', type: 'String' }),
    createField({ name: 'location_floor', type: 'String' }),
    createField({ name: 'location_room', type: 'String' }),
    createField({ name: 'description', type: 'String' }),
    createField({ name: 'service_provided', type: 'String' }),
    createField({ name: 'tags', type: 'Array', arrayItemType: 'String' }),
    createField({ name: 'images', type: 'Array', arrayItemType: 'String' }),
    createField({
      name: 'status',
      type: 'String',
      enumValues: 'available,booked,maintenance,retired,in_use',
    }),
    createField({ name: 'is_bookable', type: 'Boolean' }),
    createField({
      name: 'booking_type',
      type: 'String',
      enumValues: 'per_session,hourly,daily,external_system',
    }),
    createField({ name: 'external_system_url', type: 'String' }),
    createField({ name: 'created_at', type: 'Date' }),
    createField({ name: 'updated_at', type: 'Date' }),
  ],
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODEL_NAME':
      return { ...state, modelName: action.payload }

    case 'ADD_FIELD': {
      const field = createField()
      return { ...state, fields: [...state.fields, field] }
    }

    case 'REMOVE_FIELD':
      return {
        ...state,
        fields: state.fields.filter((f) => f.id !== action.payload),
      }

    case 'UPDATE_FIELD': {
      const { id, prop, value } = action.payload
      return {
        ...state,
        fields: state.fields.map((f) => (f.id === id ? { ...f, [prop]: value } : f)),
      }
    }

    default:
      return state
  }
}

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
  'w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2.5 py-1.5 text-sm text-slate-100 ' +
  'placeholder-slate-500 outline-none transition hover:border-slate-600 ' +
  'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30'

function CodePreview({ code }) {
  const tokens = useMemo(() => highlightJavaScript(code), [code])
  const lineCount = code.split('\n').length

  return (
    <div className="relative min-h-full">
      <pre className="min-w-full p-4 font-mono text-[13px] leading-relaxed">
        <code>
          {tokens.map((token, i) => (
            <span key={i} className={token.cls}>
              {token.text}
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

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [copied, setCopied] = useState(false)

  const generatedCode = useMemo(
    () => generateMongooseCode(state.modelName, state.fields),
    [state.modelName, state.fields],
  )

  const validFieldCount = state.fields.filter((f) => f.name.trim()).length

  const updateField = (id, prop, value) =>
    dispatch({ type: 'UPDATE_FIELD', payload: { id, prop, value } })

  const removeField = (id) => dispatch({ type: 'REMOVE_FIELD', payload: id })

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
    } catch {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400 ring-1 ring-emerald-500/20">
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
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition active:scale-95 ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
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
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-95"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download .js</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-20 sm:px-6 lg:h-screen lg:overflow-hidden">
        <div className="grid grid-cols-1 gap-5 lg:h-full lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="flex min-h-0 flex-col gap-4 lg:h-full">
            <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <Braces size={16} className="text-emerald-400" />
                  Model Configuration
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <LabeledInput label="Model Name" className="flex-1">
                  <input
                    type="text"
                    value={state.modelName}
                    onChange={(e) => dispatch({ type: 'SET_MODEL_NAME', payload: e.target.value })}
                    placeholder="e.g. Asset, User, Product"
                    className={`${inputCls} font-mono`}
                  />
                </LabeledInput>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'ADD_FIELD' })}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-95"
                >
                  <Plus size={16} />
                  Add New Field
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                  <FileType size={16} className="text-emerald-400" />
                  Fields
                </h2>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {validFieldCount} defined
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {state.fields.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-700 py-10 text-center">
                    <KeyRound size={28} className="text-slate-600" />
                    <p className="text-sm text-slate-500">
                      No fields yet. Click{' '}
                      <span className="font-semibold text-slate-300">"Add New Field"</span> to start
                      building your schema.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {state.fields.map((field, i) => (
                      <FieldItem
                        key={field.id}
                        field={field}
                        index={i}
                        onChange={updateField}
                        onRemove={removeField}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col lg:h-full">
            <div className="flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl lg:min-h-0">
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
                  Live Preview —{' '}
                  <span className="font-mono text-emerald-300">
                    {toValidModelName(state.modelName)}.model.js
                  </span>
                </h2>
                <span className="hidden shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/20 sm:inline">
                  live
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <CodePreview code={generatedCode} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
