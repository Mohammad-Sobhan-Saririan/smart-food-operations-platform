const FORBIDDEN = new Set([
  'insert', 'update', 'delete', 'drop', 'alter', 'create', 'replace', 'attach', 'detach',
  'vacuum', 'pragma', 'reindex', 'analyze', 'begin', 'commit', 'rollback', 'savepoint',
  'release', 'transaction', 'load_extension',
]);

function stripCommentsAndStrings(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];
    if (c === '-' && n === '-') {
      i += 2;
      while (i < sql.length && sql[i] !== '\n') i++;
      out += ' ';
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      out += ' ';
      i++;
      while (i < sql.length) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) { i += 2; continue; }
          i++;
          break;
        }
        if (sql[i] === '\\' && i + 1 < sql.length) i += 2;
        else i++;
      }
      continue;
    }
    if (c === '[') {
      out += ' ';
      i++;
      while (i < sql.length && sql[i] !== ']') i++;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function validateReadOnlySql(sql) {
  if (typeof sql !== 'string' || !sql.trim()) throw new Error('SQL query is required.');
  if (sql.length > 20000) throw new Error('SQL query is too large.');

  const sanitized = stripCommentsAndStrings(sql).trim();
  const withoutTrailingSemicolon = sanitized.replace(/;\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) throw new Error('Only one SQL statement is allowed.');

  const tokens = withoutTrailingSemicolon.toLowerCase().match(/[a-z_][a-z0-9_]*/g) || [];
  if (!tokens.length || !['select', 'with'].includes(tokens[0])) {
    throw new Error('Only SELECT or WITH ... SELECT analytics queries are allowed.');
  }
  for (const token of tokens) {
    if (FORBIDDEN.has(token)) throw new Error(`Read-only reporting blocked SQL keyword: ${token}.`);
  }
  if (tokens[0] === 'with' && !tokens.includes('select')) {
    throw new Error('WITH queries must resolve to a SELECT statement.');
  }
  return sql.trim().replace(/;\s*$/, '');
}

export const _internal = { stripCommentsAndStrings };
