import { ChevronDown, Trash2 } from 'lucide-react'
import { DATA_TYPES } from '../utils/codeGenerator'

const inputCls =
  'w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2.5 py-1.5 text-sm text-slate-100 ' +
  'placeholder-slate-500 outline-none transition hover:border-slate-600 ' +
  'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30'

const ARRAY_ITEM_TYPES = ['String', 'Number', 'Boolean', 'Date', 'ObjectId']

function Collapse({ open, children }) {
  return (
    <div
      className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0">{children}</div>
    </div>
  )
}

function LabeledInput({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}

function Toggle({ checked, onChange, disabled, tone = 'emerald', children }) {
  const active =
    tone === 'amber'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-sky-500/40 bg-sky-500/10 text-sky-300'

  return (
    <label
      className={`inline-flex select-none items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
        checked
          ? active
          : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-3.5 w-3.5 accent-emerald-500"
      />
      {children}
    </label>
  )
}

function FieldBadges({ field }) {
  const chips = []

  if (field.required) {
    chips.push({
      label: 'required',
      className: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
    })
  }
  if (field.unique) {
    chips.push({
      label: 'unique',
      className: 'bg-sky-500/10 text-sky-300 ring-sky-500/20',
    })
  }

  const defaultValue = String(field.defaultValue ?? '').trim()
  if (defaultValue) {
    chips.push({
      label: `default: ${defaultValue}`,
      className: 'bg-slate-800 text-slate-400 ring-slate-700',
    })
  }

  const enums = String(field.enumValues ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (field.type === 'String' && enums.length) {
    chips.push({
      label: `enum: ${enums.join(', ')}`,
      className: 'bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-500/20',
    })
  }

  if (field.type === 'ObjectId' && String(field.ref ?? '').trim()) {
    chips.push({
      label: `ref: ${String(field.ref).trim()}`,
      className: 'bg-teal-500/10 text-teal-300 ring-teal-500/20',
    })
  }

  if (!chips.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-3 pl-12">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ${chip.className}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  )
}

export default function FieldItem({
  field,
  index,
  expanded,
  onChange,
  onRemove,
  onToggle,
}) {
  const set = (prop) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value
    onChange(field.id, prop, value)
  }

  const isUniqueDisabled = field.type === 'Array' || field.type === 'Object'

  return (
    <li
      className={`rounded-xl border bg-slate-800/40 transition-all duration-200 ${
        expanded
          ? 'border-emerald-500/40 bg-slate-800/80 shadow-lg shadow-black/30 ring-1 ring-emerald-500/20'
          : 'border-slate-700/70 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2 p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
          {index + 1}
        </span>

        <input
          type="text"
          value={field.name}
          onChange={set('name')}
          placeholder="fieldName"
          aria-label={`Name of field ${index + 1}`}
          className={`${inputCls} min-w-0 flex-1 font-mono`}
        />

        <select
          value={field.type}
          onChange={set('type')}
          aria-label={`Data type of field ${index + 1}`}
          className={`${inputCls} w-[104px] shrink-0 cursor-pointer px-2`}
        >
          {DATA_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggle}
          title={expanded ? 'Collapse options' : 'Expand options'}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} options for field ${
            field.name || index + 1
          }`}
          className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-700/60 hover:text-slate-200 active:scale-95"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <button
          type="button"
          onClick={() => onRemove(field.id)}
          title="Delete field"
          aria-label={`Delete field ${field.name || index + 1}`}
          className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-red-500/15 hover:text-red-400 active:scale-95"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {!expanded && <FieldBadges field={field} />}

      <Collapse open={expanded}>
        <div className="space-y-3 border-t border-slate-700/60 px-3 pb-3 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Toggle checked={field.required} onChange={set('required')} tone="amber">
              Required
            </Toggle>
            <Toggle
              checked={field.unique}
              onChange={set('unique')}
              disabled={isUniqueDisabled}
              tone="sky"
            >
              Unique
            </Toggle>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabeledInput label="Default value">
              <input
                type="text"
                value={field.defaultValue}
                onChange={set('defaultValue')}
                placeholder="optional"
                className={`${inputCls} font-mono text-xs`}
              />
            </LabeledInput>

            {field.type === 'String' && (
              <LabeledInput label="Enums">
                <input
                  type="text"
                  value={field.enumValues}
                  onChange={set('enumValues')}
                  placeholder="active, inactive"
                  className={`${inputCls} font-mono text-xs`}
                />
              </LabeledInput>
            )}

            {(field.type === 'ObjectId' ||
              (field.type === 'Array' && field.arrayItemType === 'ObjectId')) && (
              <LabeledInput label="Ref model">
                <input
                  type="text"
                  value={field.ref}
                  onChange={set('ref')}
                  placeholder="e.g. User"
                  className={`${inputCls} font-mono text-xs`}
                />
              </LabeledInput>
            )}

            {field.type === 'Array' && (
              <LabeledInput label="Array item type">
                <select
                  value={field.arrayItemType}
                  onChange={set('arrayItemType')}
                  className={`${inputCls} cursor-pointer`}
                >
                  {ARRAY_ITEM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </LabeledInput>
            )}
          </div>
        </div>
      </Collapse>
    </li>
  )
}
