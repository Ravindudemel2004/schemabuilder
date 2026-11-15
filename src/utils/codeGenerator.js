/**
 * utils/codeGenerator.js
 * ---------------------------------------------------------------------------
 * Pure helper functions that turn the builder's state (model name + fields)
 * into a ready-to-use Mongoose schema file, plus a tiny JS syntax highlighter
 * used by the live preview panel.
 */

/** The data types offered in the field editor dropdown. */
export const DATA_TYPES = [
  'String',
  'Number',
  'Boolean',
  'Date',
  'ObjectId',
  'Array',
  'Object',
]

/**
 * Convert an arbitrary model name into a valid JavaScript identifier
 * in PascalCase, e.g. "user account" -> "UserAccount".
 */
export function toValidModelName(rawName) {
  const pascal = String(rawName || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  if (!pascal) return 'MyModel'
  // Identifiers cannot start with a digit.
  return /^[0-9]/.test(pascal) ? `M${pascal}` : pascal
}

/** Derive a pluralised, lower-cased MongoDB collection name from a model name. */
export function toCollectionName(modelName) {
  const base = toValidModelName(modelName)
  // Very small naive pluralisation – good enough for generated scaffolding.
  if (/s$/i.test(base)) return base.toLowerCase() + 'es'
  if (/[^aeiou]y$/i.test(base)) return base.slice(0, -1).toLowerCase() + 'ies'
  return base.toLowerCase() + 's'
}

/**
 * Coerce a raw "default value" string typed by the user into a literal
 * snippet appropriate for the chosen data type.
 * Returns `null` when no default should be emitted.
 */
export function formatDefaultValue(rawValue, dataType) {
  const trimmed = String(rawValue ?? '').trim()
  if (trimmed === '') return null

  switch (dataType) {
    case 'Number': {
      const num = Number(trimmed)
      return Number.isNaN(num) ? null : String(num)
    }
    case 'Boolean': {
      if (/^(true|1|yes)$/i.test(trimmed)) return 'true'
      if (/^(false|0|no)$/i.test(trimmed)) return 'false'
      return 'true' // any other non-empty text is treated as truthy
    }
    case 'Date': {
      const date = new Date(trimmed)
      if (!Number.isNaN(date.getTime())) {
        return `new Date('${date.toISOString()}')`
      }
      // Allow dynamic expressions like `Date.now`
      return trimmed === 'now' ? 'Date.now' : `new Date()`
    }
    case 'Array': {
      // Accept comma separated items -> inline array of strings
      const items = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return items.length ? `[${items.map((i) => `'${i}'`).join(', ')}]` : '[]'
    }
    case 'ObjectId':
      // A static default ObjectId makes little sense; expose the factory idiom.
      return 'new mongoose.Types.ObjectId()'
    case 'String':
    case 'Object':
    default:
      return `'${trimmed.replace(/'/g, "\\'")}'`
  }
}

/** Parse the comma-separated enum input into a clean array of values. */
export function parseEnumValues(rawEnum) {
  return String(rawEnum ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

/**
 * Build the `{ ... }` object-literal body for a single field definition.
 * Returns a one-line or multi-line string depending on complexity.
 */
function buildFieldBody(field) {
  const parts = []

  // --- type -------------------------------------------------------------
  if (field.type === 'ObjectId') {
    const ref = String(field.ref ?? '').trim()
    parts.push(`type: mongoose.Schema.Types.ObjectId`)
    if (ref) parts.push(`ref: '${ref.replace(/'/g, "\\'")}'`)
  } else if (field.type === 'Array') {
    const itemType = ['String', 'Number', 'Boolean', 'Date', 'ObjectId'].includes(
      field.arrayItemType,
    )
      ? field.arrayItemType
      : 'String'
    if (itemType === 'ObjectId') {
      const ref = String(field.ref ?? '').trim()
      parts.push(
        `type: [{ type: mongoose.Schema.Types.ObjectId${ref ? `, ref: '${ref}'` : ''} }]`,
      )
    } else {
      parts.push(`type: [${itemType}]`)
    }
  } else if (field.type === 'Object') {
    parts.push('type: Object')
  } else {
    parts.push(`type: ${field.type}`)
  }

  // --- required / unique --------------------------------------------------
  if (field.required) parts.push('required: true')
  if (field.unique && field.type !== 'Array' && field.type !== 'Object') {
    parts.push('unique: true')
  }

  // --- default ------------------------------------------------------------
  const def = formatDefaultValue(field.defaultValue, field.type)
  if (def !== null) parts.push(`default: ${def}`)

  // --- enum (String only) ---------------------------------------------------
  if (field.type === 'String') {
    const enums = parseEnumValues(field.enumValues)
    if (enums.length > 0) {
      parts.push(`enum: [${enums.map((e) => `'${e.replace(/'/g, "\\'")}'`).join(', ')}]`)
    }
  }

  // Short definitions stay on one line; longer ones are expanded.
  const inline = parts.join(', ')
  if (inline.length <= 60) return `{ ${inline} }`
  const inner = parts.map((p) => `      ${p},`).join('\n')
  return `{\n${inner}\n    }`
}

/**
 * Generate the complete Mongoose module source for the given schema state.
 * @param {string} modelName  Raw model name entered by the user.
 * @param {Array}  fields     Array of field descriptor objects.
 * @returns {string} Valid JavaScript source code.
 */
export function generateMongooseCode(modelName, fields) {
  const Model = toValidModelName(modelName)
  const collection = toCollectionName(modelName)

  const validFields = (fields || []).filter((f) => String(f.name).trim() !== '')

  const fieldLines = validFields.length
    ? validFields
        .map((f) => `  ${String(f.name).trim()}: ${buildFieldBody(f)},`)
        .join('\n')
    : '  // Add fields using the panel on the left'

  return `const mongoose = require('mongoose');

const ${Model.charAt(0).toLowerCase() + Model.slice(1)}Schema = new mongoose.Schema({
${fieldLines}
}, {
  timestamps: true,
  collection: '${collection}',
});

// Indexes declared via \`unique: true\` above are created automatically.

const ${Model} = mongoose.model('${Model}', ${Model.charAt(0).toLowerCase() + Model.slice(1)}Schema);

module.exports = ${Model};
`
}

/* ---------------------------------------------------------------------------
 * Tiny JS tokenizer used for syntax highlighting in the live preview.
 * Produces an array of { text, cls } tokens rendered as <span>s.
 * ------------------------------------------------------------------------- */

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'require', 'module', 'exports',
  'new', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export',
  'from', 'default', 'true', 'false', 'null', 'undefined', 'this',
])

const TOKEN_CLASSES = {
  keyword: 'text-fuchsia-400',
  string: 'text-emerald-300',
  number: 'text-amber-300',
  comment: 'text-slate-500 italic',
  property: 'text-sky-300',
  punctuation: 'text-slate-500',
  ident: 'text-slate-200',
  whitespace: '',
}

/**
 * Highlight JavaScript source into tokens. Deliberately simple but robust
 * enough for the deterministic output of generateMongooseCode().
 */
export function highlightJavaScript(code) {
  const tokens = []
  const regex =
    /(\/\/[^\n]*)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([{}[\]().,:;=+\-*/<>!?&|]+)|(.)/g

  let match
  while ((match = regex.exec(code)) !== null) {
    const [full, comment, str, num, word, ws, punct, other] = match
    if (comment) tokens.push({ text: full, cls: TOKEN_CLASSES.comment })
    else if (str) tokens.push({ text: full, cls: TOKEN_CLASSES.string })
    else if (num) tokens.push({ text: full, cls: TOKEN_CLASSES.number })
    else if (word) {
      // Look ahead: is this word used as an object property (`name:`)?
      const rest = code.slice(regex.lastIndex)
      const isProperty = /^\s*:/.test(rest)
      const cls = KEYWORDS.has(full)
        ? TOKEN_CLASSES.keyword
        : isProperty
          ? TOKEN_CLASSES.property
          : /^[A-Z]/.test(full)
            ? 'text-teal-300'
            : TOKEN_CLASSES.ident
      tokens.push({ text: full, cls })
    } else if (ws) tokens.push({ text: full, cls: TOKEN_CLASSES.whitespace })
    else if (punct) tokens.push({ text: full, cls: TOKEN_CLASSES.punctuation })
    else if (other) tokens.push({ text: full, cls: TOKEN_CLASSES.ident })
  }
  return tokens
}
