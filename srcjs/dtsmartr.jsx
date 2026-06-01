import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const ROW_HEIGHT         = 36;
const HEADER_HEIGHT_BASE = 64;   // without labels
const HEADER_HEIGHT_LBL  = 82;   // with labels row
const COL_WIDTH          = 160;
const ROW_NUM_W          = 52;
const OVERSCAN           = 8;
const CATEGORICAL   = new Set(['character', 'factor', 'logical']);

const TYPE_META = {
  numeric:   { bg: '#dbeafe', text: '#1d4ed8', icon: '#' },
  integer:   { bg: '#dbeafe', text: '#1d4ed8', icon: '#' },
  character: { bg: '#ffedd5', text: '#c2410c', icon: 'A' },
  factor:    { bg: '#dcfce7', text: '#15803d', icon: '≡' },
  logical:   { bg: '#f3e8ff', text: '#7e22ce', icon: '?' },
  datetime:  { bg: '#fce7f3', text: '#be185d', icon: '⏱' },
  default:   { bg: '#f1f5f9', text: '#475569', icon: '~' },
};
const tm = t => TYPE_META[t] || TYPE_META.default;

const getOperatorsForType = (type) => {
  if (CATEGORICAL.has(type)) {
    return [
      { value: '==', label: '=' },
      { value: '!=', label: '≠' },
      { value: 'in', label: 'is in' },
      { value: 'not_in', label: 'is not in' },
      { value: 'contains', label: 'contains' },
      { value: 'not_contains', label: 'does not contain' },
      { value: 'starts_with', label: 'starts with' },
      { value: 'ends_with', label: 'ends with' },
      { value: 'is_null', label: 'is null' },
      { value: 'is_not_null', label: 'is not null' }
    ];
  }
  if (type === 'numeric' || type === 'integer' || type === 'datetime') {
    return [
      { value: '==', label: '=' },
      { value: '!=', label: '≠' },
      { value: 'in', label: 'is in' },
      { value: 'not_in', label: 'is not in' },
      { value: '>', label: '>' },
      { value: '<', label: '<' },
      { value: '>=', label: '≥' },
      { value: '<=', label: '≤' },
      { value: 'is_null', label: 'is null' },
      { value: 'is_not_null', label: 'is not null' }
    ];
  }
  return [
    { value: '==', label: '=' },
    { value: '!=', label: '≠' },
    { value: 'in', label: 'is in' },
    { value: 'not_in', label: 'is not in' },
    { value: 'is_null', label: 'is null' },
    { value: 'is_not_null', label: 'is not null' }
  ];
};

const MultiSelectCheckboxDropdown = ({ uniqueVals, selectedVals, onChange, colors, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredVals = useMemo(() => {
    return (uniqueVals || []).filter(v => {
      const strVal = v === null ? 'NA' : String(v);
      return strVal.toLowerCase().includes(search.toLowerCase());
    });
  }, [uniqueVals, search]);

  const toggleVal = (val) => {
    const strVal = val === null ? 'NA' : String(val);
    const next = selectedVals.includes(strVal)
      ? selectedVals.filter(x => x !== strVal)
      : [...selectedVals, strVal];
    onChange(next);
  };

  const selectAll = () => {
    const allStrs = filteredVals.map(v => v === null ? 'NA' : String(v));
    const next = Array.from(new Set([...selectedVals, ...allStrs]));
    onChange(next);
  };

  const clearAll = () => {
    const filteredStrs = filteredVals.map(v => v === null ? 'NA' : String(v));
    const next = selectedVals.filter(x => !filteredStrs.includes(x));
    onChange(next);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 12px',
          border: `1.5px solid ${colors.border}`,
          borderRadius: 6,
          background: colors.btnBg,
          color: colors.text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          outline: 'none',
          fontSize: 13,
          minWidth: 150,
          textAlign: 'left',
          justifyContent: 'space-between'
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 200
        }}>
          {selectedVals.length === 0
            ? '(Select values...)'
            : selectedVals.length === 1
              ? selectedVals[0]
              : `${selectedVals.length} values selected`}
        </span>
        <span style={{ fontSize: 10, color: colors.subText }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 1000,
          marginTop: 4,
          width: 250,
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
          padding: 8,
          boxSizing: 'border-box'
        }}>
          <input
            type="text"
            placeholder="Search values..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '6px 8px',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              outline: 'none',
              fontSize: 12,
              marginBottom: 6,
              background: colors.bg,
              color: colors.text
            }}
          />

          <div style={{ display: 'flex', gap: 10, padding: '0 4px 6px 4px', borderBottom: `1px solid ${colors.border}`, marginBottom: 6 }}>
            <span onClick={selectAll} style={{ fontSize: 11, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}>
              Select All
            </span>
            <span onClick={clearAll} style={{ fontSize: 11, color: colors.subText, cursor: 'pointer', textDecoration: 'underline' }}>
              Clear
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.subText }}>
              {selectedVals.length} chosen
            </span>
          </div>

          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredVals.length === 0 ? (
              <div style={{ padding: '6px 4px', color: colors.subText, fontStyle: 'italic', fontSize: 12 }}>
                No matches
              </div>
            ) : (
              filteredVals.map(v => {
                const strVal = v === null ? 'NA' : String(v);
                const isChecked = selectedVals.includes(strVal);
                return (
                  <label
                    key={strVal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: isChecked ? (isDarkMode ? '#1e3a8a' : '#eff6ff') : 'transparent',
                      fontSize: 12,
                      userSelect: 'none'
                    }}
                    onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = colors.hoverBg; }}
                    onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleVal(v)}
                      style={{
                        accentColor: '#2563eb',
                        cursor: 'pointer',
                        width: 13,
                        height: 13,
                        margin: 0
                      }}
                    />
                    <span style={{ color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {strVal}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RCodeModal = ({ codeObj, onClose, colors, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('dplyr');
  const [copied, setCopied] = useState(false);

  const codeText = activeTab === 'dplyr'
    ? codeObj.dplyr
    : activeTab === 'baseR'
      ? codeObj.baseR
      : codeObj.sql;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: colors.cardBg,
        borderRadius: 12,
        width: '90%',
        maxWidth: 700,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colors.toolbarBg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: colors.text }}>Reproduce Query Code</span>
          </div>
          <button 
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 20,
              color: colors.subText,
              cursor: 'pointer',
              fontWeight: 'bold',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.border}`,
          background: isDarkMode ? '#1e293b' : '#f1f5f9',
          padding: '0 12px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'dplyr',  label: 'tidyverse (dplyr)' },
            { id: 'baseR',  label: 'Base R' },
            { id: 'sql',    label: 'SQL Query' }
            // { id: 'arrow',  label: 'Arrow' },
            // { id: 'duckdb', label: 'DuckDB / dbplyr' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
                color: activeTab === tab.id ? '#2563eb' : colors.subText,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: colors.subText }}>
            Copy and paste this code to reproduce your current filters:
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <pre style={{
              margin: 0,
              padding: '14px 16px',
              background: '#0f172a',
              color: '#e2e8f0',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
              overflowX: 'auto',
              maxHeight: 280,
              lineHeight: 1.5,
              whiteSpace: 'pre'
            }}>
              {codeText}
            </pre>
            
            <button
              onClick={handleCopy}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                padding: '5px 10px',
                background: copied ? '#22c55e' : 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{copied ? '✓' : '📋'}</span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid ${colors.border}`,
          background: colors.toolbarBg,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${colors.border}`,
              background: colors.btnBg,
              color: colors.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const generateRCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount) => {
  const conditions = [];

  Object.entries(filters).forEach(([col, val]) => {
    if (val == null) return;
    const colMeta = metadata.find(m => m.name === col);
    if (!colMeta) return;

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      const hasNA = val.includes(null);
      const nonNAVals = val.filter(v => v !== null);
      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }
      if (hasNA) {
        expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
      }
      conditions.push(expr);
    } else if (typeof val === 'string' && val.trim() !== '') {
      conditions.push(`grepl("${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
    }
  });

  const ruleConditions = [];
  queryRules.forEach(rule => {
    const col = rule.col;
    const op = rule.op;
    const val = rule.val;
    const colMeta = metadata.find(m => m.name === col);
    const isNumeric = colMeta ? (colMeta.type === 'numeric' || colMeta.type === 'integer') : false;

    if (op === 'is_null') {
      ruleConditions.push(`is.na(${col})`);
      return;
    }
    if (op === 'is_not_null') {
      ruleConditions.push(`!is.na(${col})`);
      return;
    }

    if (op === 'in' || op === 'not_in') {
      let allowed = [];
      try { allowed = JSON.parse(val || '[]'); } catch(e) {}
      if (allowed.length === 0) return;

      const hasNA = allowed.includes('NA') || allowed.includes(null);
      const nonNAVals = allowed.filter(v => v !== 'NA' && v !== null);

      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => isNumeric ? Number(v) : `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }

      if (op === 'in') {
        if (hasNA) {
          expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
        }
      } else {
        if (expr) {
          expr = `!(${expr})`;
        }
        if (hasNA) {
          expr = expr ? `(${expr} & !is.na(${col}))` : `!is.na(${col})`;
        }
      }
      if (expr) {
        ruleConditions.push(expr);
      }
      return;
    }

    let rVal = val;
    if (isNumeric) {
      rVal = Number(val);
      if (isNaN(rVal)) rVal = `"${val}"`;
    } else if (colMeta?.type === 'logical') {
      rVal = val.toUpperCase();
    } else {
      rVal = `"${val.replace(/"/g, '\\"')}"`;
    }

    switch (op) {
      case '==':
        ruleConditions.push(`${col} == ${rVal}`);
        break;
      case '!=':
        ruleConditions.push(`${col} != ${rVal}`);
        break;
      case '>':
        ruleConditions.push(`${col} > ${rVal}`);
        break;
      case '<':
        ruleConditions.push(`${col} < ${rVal}`);
        break;
      case '>=':
        ruleConditions.push(`${col} >= ${rVal}`);
        break;
      case '<=':
        ruleConditions.push(`${col} <= ${rVal}`);
        break;
      case 'contains':
        ruleConditions.push(`grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'not_contains':
        ruleConditions.push(`!grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'starts_with':
        ruleConditions.push(`grepl("^${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
        break;
      case 'ends_with':
        ruleConditions.push(`grepl("${val.replace(/"/g, '\\"')}$", ${col}, ignore.case = TRUE)`);
        break;
    }
  });

  if (ruleConditions.length > 0) {
    if (ruleConditions.length === 1) {
      conditions.push(ruleConditions[0]);
    } else {
      const connector = queryLogical === 'OR' ? ' | ' : ' & ';
      conditions.push(`(${ruleConditions.join(connector)})`);
    }
  }

  let selectExpr = '';
  if (visibleCols && visibleCols.length < totalColsCount) {
    selectExpr = ` %>%\n  select(${visibleCols.join(', ')})`;
  }

  if (conditions.length === 0) {
    if (visibleCols && visibleCols.length < totalColsCount) {
      return `# No active filters\nlibrary(dplyr)\nfiltered_df <- ${datasetName}${selectExpr}`;
    }
    return `# No active filters\nlibrary(dplyr)\nfiltered_df <- ${datasetName}`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `library(dplyr)\n\nfiltered_df <- ${datasetName} %>%\n  filter(\n    ${filterExpression.replace(/\n/g, '\n    ')}\n  )${selectExpr}`;
};

const generateBaseRCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount) => {
  const conditions = [];

  Object.entries(filters).forEach(([col, val]) => {
    if (val == null) return;
    const colMeta = metadata.find(m => m.name === col);
    if (!colMeta) return;

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      const hasNA = val.includes(null);
      const nonNAVals = val.filter(v => v !== null);
      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }
      if (hasNA) {
        expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
      }
      conditions.push(expr);
    } else if (typeof val === 'string' && val.trim() !== '') {
      conditions.push(`grepl("${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
    }
  });

  const ruleConditions = [];
  queryRules.forEach(rule => {
    const col = rule.col;
    const op = rule.op;
    const val = rule.val;
    const colMeta = metadata.find(m => m.name === col);
    const isNumeric = colMeta ? (colMeta.type === 'numeric' || colMeta.type === 'integer') : false;

    if (op === 'is_null') {
      ruleConditions.push(`is.na(${col})`);
      return;
    }
    if (op === 'is_not_null') {
      ruleConditions.push(`!is.na(${col})`);
      return;
    }

    if (op === 'in' || op === 'not_in') {
      let allowed = [];
      try { allowed = JSON.parse(val || '[]'); } catch(e) {}
      if (allowed.length === 0) return;

      const hasNA = allowed.includes('NA') || allowed.includes(null);
      const nonNAVals = allowed.filter(v => v !== 'NA' && v !== null);

      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => isNumeric ? Number(v) : `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }

      if (op === 'in') {
        if (hasNA) {
          expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
        }
      } else {
        if (expr) {
          expr = `!(${expr})`;
        }
        if (hasNA) {
          expr = expr ? `(${expr} & !is.na(${col}))` : `!is.na(${col})`;
        }
      }
      if (expr) {
        ruleConditions.push(expr);
      }
      return;
    }

    let rVal = val;
    if (isNumeric) {
      rVal = Number(val);
      if (isNaN(rVal)) rVal = `"${val}"`;
    } else if (colMeta?.type === 'logical') {
      rVal = val.toUpperCase();
    } else {
      rVal = `"${val.replace(/"/g, '\\"')}"`;
    }

    switch (op) {
      case '==':
        ruleConditions.push(`${col} == ${rVal}`);
        break;
      case '!=':
        ruleConditions.push(`${col} != ${rVal}`);
        break;
      case '>':
        ruleConditions.push(`${col} > ${rVal}`);
        break;
      case '<':
        ruleConditions.push(`${col} < ${rVal}`);
        break;
      case '>=':
        ruleConditions.push(`${col} >= ${rVal}`);
        break;
      case '<=':
        ruleConditions.push(`${col} <= ${rVal}`);
        break;
      case 'contains':
        ruleConditions.push(`grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'not_contains':
        ruleConditions.push(`!grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'starts_with':
        ruleConditions.push(`grepl("^${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
        break;
      case 'ends_with':
        ruleConditions.push(`grepl("${val.replace(/"/g, '\\"')}$", ${col}, ignore.case = TRUE)`);
        break;
    }
  });

  if (ruleConditions.length > 0) {
    if (ruleConditions.length === 1) {
      conditions.push(ruleConditions[0]);
    } else {
      const connector = queryLogical === 'OR' ? ' | ' : ' & ';
      conditions.push(`(${ruleConditions.join(connector)})`);
    }
  }

  let selectArg = '';
  if (visibleCols && visibleCols.length < totalColsCount) {
    const colListStr = visibleCols.map(c => `"${c.replace(/"/g, '\\"')}"`).join(', ');
    selectArg = `,\n  select = c(${colListStr})`;
  }

  if (conditions.length === 0) {
    if (visibleCols && visibleCols.length < totalColsCount) {
      return `# No active filters\nfiltered_df <- subset(\n  ${datasetName}${selectArg}\n)`;
    }
    return `# No active filters\nfiltered_df <- subset(${datasetName})`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `filtered_df <- subset(\n  ${datasetName},\n  subset = ${filterExpression.replace(/\n/g, '\n  ')}${selectArg}\n)`;
};

const generateSQLCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount) => {
  const conditions = [];

  Object.entries(filters).forEach(([col, val]) => {
    if (val == null) return;
    if (Array.isArray(val)) {
      if (val.length === 0) return;
      const hasNA = val.includes(null);
      const nonNAVals = val.filter(v => v !== null);
      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ');
        expr = `${col} IN (${listStr})`;
      }
      if (hasNA) {
        expr = expr ? `(${expr} OR ${col} IS NULL)` : `${col} IS NULL`;
      }
      conditions.push(expr);
    } else if (typeof val === 'string' && val.trim() !== '') {
      conditions.push(`${col} LIKE '%${val.replace(/'/g, "''")}%'`);
    }
  });

  const ruleConditions = [];
  queryRules.forEach(rule => {
    const col = rule.col;
    const op = rule.op;
    const val = rule.val;
    const colMeta = metadata.find(m => m.name === col);
    const isNumeric = colMeta ? (colMeta.type === 'numeric' || colMeta.type === 'integer') : false;

    if (op === 'is_null') {
      ruleConditions.push(`${col} IS NULL`);
      return;
    }
    if (op === 'is_not_null') {
      ruleConditions.push(`${col} IS NOT NULL`);
      return;
    }

    if (op === 'in' || op === 'not_in') {
      let allowed = [];
      try { allowed = JSON.parse(val || '[]'); } catch(e) {}
      if (allowed.length === 0) return;

      const hasNA = allowed.includes('NA') || allowed.includes(null);
      const nonNAVals = allowed.filter(v => v !== 'NA' && v !== null);

      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => isNumeric ? Number(v) : `'${String(v).replace(/'/g, "''")}'`).join(', ');
        expr = `${col} IN (${listStr})`;
      }

      if (op === 'in') {
        if (hasNA) {
          expr = expr ? `(${expr} OR ${col} IS NULL)` : `${col} IS NULL`;
        }
      } else {
        if (expr) {
          expr = `${col} NOT IN (${nonNAVals.map(v => isNumeric ? Number(v) : `'${String(v).replace(/'/g, "''")}'`).join(', ')})`;
        }
        if (hasNA) {
          expr = expr ? `(${expr} AND ${col} IS NOT NULL)` : `${col} IS NOT NULL`;
        }
      }
      if (expr) {
        ruleConditions.push(expr);
      }
      return;
    }

    let rVal = val;
    if (isNumeric) {
      rVal = Number(val);
      if (isNaN(rVal)) rVal = `'${val}'`;
    } else if (colMeta?.type === 'logical') {
      rVal = val.toUpperCase() === 'TRUE' ? '1' : '0';
    } else {
      rVal = `'${val.replace(/'/g, "''")}'`;
    }

    switch (op) {
      case '==':
        ruleConditions.push(`${col} = ${rVal}`);
        break;
      case '!=':
        ruleConditions.push(`${col} <> ${rVal}`);
        break;
      case '>':
        ruleConditions.push(`${col} > ${rVal}`);
        break;
      case '<':
        ruleConditions.push(`${col} < ${rVal}`);
        break;
      case '>=':
        ruleConditions.push(`${col} >= ${rVal}`);
        break;
      case '<=':
        ruleConditions.push(`${col} <= ${rVal}`);
        break;
      case 'contains':
        ruleConditions.push(`${col} LIKE '%${val.replace(/'/g, "''")}%'`);
        break;
      case 'not_contains':
        ruleConditions.push(`${col} NOT LIKE '%${val.replace(/'/g, "''")}%'`);
        break;
      case 'starts_with':
        ruleConditions.push(`${col} LIKE '${val.replace(/'/g, "''")}%'`);
        break;
      case 'ends_with':
        ruleConditions.push(`${col} LIKE '%${val.replace(/'/g, "''")}'`);
        break;
    }
  });

  if (ruleConditions.length > 0) {
    if (ruleConditions.length === 1) {
      conditions.push(ruleConditions[0]);
    } else {
      const connector = queryLogical === 'OR' ? ' OR ' : ' AND ';
      conditions.push(`(${ruleConditions.join(connector)})`);
    }
  }

  let selectCols = '*';
  if (visibleCols && visibleCols.length < totalColsCount) {
    selectCols = visibleCols.join(', ');
  }

  if (conditions.length === 0) {
    return `SELECT ${selectCols}\nFROM ${datasetName};`;
  }

  const whereClause = conditions.join('\n  AND ');
  return `SELECT ${selectCols}\nFROM ${datasetName}\nWHERE\n  ${whereClause.replace(/\n/g, '\n  ')};`;
};

const generateArrowCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount) => {
  const conditions = [];

  Object.entries(filters).forEach(([col, val]) => {
    if (val == null) return;
    const colMeta = metadata.find(m => m.name === col);
    if (!colMeta) return;

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      const hasNA = val.includes(null);
      const nonNAVals = val.filter(v => v !== null);
      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }
      if (hasNA) {
        expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
      }
      conditions.push(expr);
    } else if (typeof val === 'string' && val.trim() !== '') {
      conditions.push(`grepl("${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
    }
  });

  const ruleConditions = [];
  queryRules.forEach(rule => {
    const col = rule.col;
    const op = rule.op;
    const val = rule.val;
    const colMeta = metadata.find(m => m.name === col);
    const isNumeric = colMeta ? (colMeta.type === 'numeric' || colMeta.type === 'integer') : false;

    if (op === 'is_null') {
      ruleConditions.push(`is.na(${col})`);
      return;
    }
    if (op === 'is_not_null') {
      ruleConditions.push(`!is.na(${col})`);
      return;
    }

    if (op === 'in' || op === 'not_in') {
      let allowed = [];
      try { allowed = JSON.parse(val || '[]'); } catch(e) {}
      if (allowed.length === 0) return;

      const hasNA = allowed.includes('NA') || allowed.includes(null);
      const nonNAVals = allowed.filter(v => v !== 'NA' && v !== null);

      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => isNumeric ? Number(v) : `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }

      if (op === 'in') {
        if (hasNA) {
          expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
        }
      } else {
        if (expr) {
          expr = `!(${expr})`;
        }
        if (hasNA) {
          expr = expr ? `(${expr} & !is.na(${col}))` : `!is.na(${col})`;
        }
      }
      if (expr) {
        ruleConditions.push(expr);
      }
      return;
    }

    let rVal = val;
    if (isNumeric) {
      rVal = Number(val);
      if (isNaN(rVal)) rVal = `"${val}"`;
    } else if (colMeta?.type === 'logical') {
      rVal = val.toUpperCase();
    } else {
      rVal = `"${val.replace(/"/g, '\\"')}"`;
    }

    switch (op) {
      case '==':
        ruleConditions.push(`${col} == ${rVal}`);
        break;
      case '!=':
        ruleConditions.push(`${col} != ${rVal}`);
        break;
      case '>':
        ruleConditions.push(`${col} > ${rVal}`);
        break;
      case '<':
        ruleConditions.push(`${col} < ${rVal}`);
        break;
      case '>=':
        ruleConditions.push(`${col} >= ${rVal}`);
        break;
      case '<=':
        ruleConditions.push(`${col} <= ${rVal}`);
        break;
      case 'contains':
        ruleConditions.push(`grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'not_contains':
        ruleConditions.push(`!grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'starts_with':
        ruleConditions.push(`grepl("^${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
        break;
      case 'ends_with':
        ruleConditions.push(`grepl("${val.replace(/"/g, '\\"')}$", ${col}, ignore.case = TRUE)`);
        break;
    }
  });

  if (ruleConditions.length > 0) {
    if (ruleConditions.length === 1) {
      conditions.push(ruleConditions[0]);
    } else {
      const connector = queryLogical === 'OR' ? ' | ' : ' & ';
      conditions.push(`(${ruleConditions.join(connector)})`);
    }
  }

  let selectExpr = '';
  if (visibleCols && visibleCols.length < totalColsCount) {
    selectExpr = ` %>%\n  select(${visibleCols.join(', ')})`;
  }

  if (conditions.length === 0) {
    return `library(arrow)\nlibrary(dplyr)\n\n# Assuming ${datasetName} is an Arrow Table or Dataset pointer\nfiltered_arrow <- ${datasetName}${selectExpr} %>%\n  collect()`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `library(arrow)\nlibrary(dplyr)\n\n# Assuming ${datasetName} is an Arrow Table or Dataset pointer\nfiltered_arrow <- ${datasetName} %>%\n  filter(\n    ${filterExpression.replace(/\n/g, '\n    ')}\n  )${selectExpr} %>%\n  collect()`;
};

const generateDuckDBCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount) => {
  const conditions = [];

  Object.entries(filters).forEach(([col, val]) => {
    if (val == null) return;
    const colMeta = metadata.find(m => m.name === col);
    if (!colMeta) return;

    if (Array.isArray(val)) {
      if (val.length === 0) return;
      const hasNA = val.includes(null);
      const nonNAVals = val.filter(v => v !== null);
      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }
      if (hasNA) {
        expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
      }
      conditions.push(expr);
    } else if (typeof val === 'string' && val.trim() !== '') {
      conditions.push(`grepl("${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
    }
  });

  const ruleConditions = [];
  queryRules.forEach(rule => {
    const col = rule.col;
    const op = rule.op;
    const val = rule.val;
    const colMeta = metadata.find(m => m.name === col);
    const isNumeric = colMeta ? (colMeta.type === 'numeric' || colMeta.type === 'integer') : false;

    if (op === 'is_null') {
      ruleConditions.push(`is.na(${col})`);
      return;
    }
    if (op === 'is_not_null') {
      ruleConditions.push(`!is.na(${col})`);
      return;
    }

    if (op === 'in' || op === 'not_in') {
      let allowed = [];
      try { allowed = JSON.parse(val || '[]'); } catch(e) {}
      if (allowed.length === 0) return;

      const hasNA = allowed.includes('NA') || allowed.includes(null);
      const nonNAVals = allowed.filter(v => v !== 'NA' && v !== null);

      let expr = '';
      if (nonNAVals.length > 0) {
        const listStr = nonNAVals.map(v => isNumeric ? Number(v) : `"${String(v).replace(/"/g, '\\"')}"`).join(', ');
        expr = `${col} %in% c(${listStr})`;
      }

      if (op === 'in') {
        if (hasNA) {
          expr = expr ? `(${expr} | is.na(${col}))` : `is.na(${col})`;
        }
      } else {
        if (expr) {
          expr = `!(${expr})`;
        }
        if (hasNA) {
          expr = expr ? `(${expr} & !is.na(${col}))` : `!is.na(${col})`;
        }
      }
      if (expr) {
        ruleConditions.push(expr);
      }
      return;
    }

    let rVal = val;
    if (isNumeric) {
      rVal = Number(val);
      if (isNaN(rVal)) rVal = `"${val}"`;
    } else if (colMeta?.type === 'logical') {
      rVal = val.toUpperCase();
    } else {
      rVal = `"${val.replace(/"/g, '\\"')}"`;
    }

    switch (op) {
      case '==':
        ruleConditions.push(`${col} == ${rVal}`);
        break;
      case '!=':
        ruleConditions.push(`${col} != ${rVal}`);
        break;
      case '>':
        ruleConditions.push(`${col} > ${rVal}`);
        break;
      case '<':
        ruleConditions.push(`${col} < ${rVal}`);
        break;
      case '>=':
        ruleConditions.push(`${col} >= ${rVal}`);
        break;
      case '<=':
        ruleConditions.push(`${col} <= ${rVal}`);
        break;
      case 'contains':
        ruleConditions.push(`grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'not_contains':
        ruleConditions.push(`!grepl(${rVal}, ${col}, ignore.case = TRUE)`);
        break;
      case 'starts_with':
        ruleConditions.push(`grepl("^${val.replace(/"/g, '\\"')}", ${col}, ignore.case = TRUE)`);
        break;
      case 'ends_with':
        ruleConditions.push(`grepl("${val.replace(/"/g, '\\"')}$", ${col}, ignore.case = TRUE)`);
        break;
    }
  });

  if (ruleConditions.length > 0) {
    if (ruleConditions.length === 1) {
      conditions.push(ruleConditions[0]);
    } else {
      const connector = queryLogical === 'OR' ? ' | ' : ' & ';
      conditions.push(`(${ruleConditions.join(connector)})`);
    }
  }

  let selectExpr = '';
  if (visibleCols && visibleCols.length < totalColsCount) {
    selectExpr = ` %>%\n  select(${visibleCols.join(', ')})`;
  }

  if (conditions.length === 0) {
    return `library(duckdb)\nlibrary(dplyr)\nlibrary(dbplyr)\n\n# Assuming tbl_duckdb is a dbplyr table pointer connected to DuckDB\nfiltered_duck <- tbl_duckdb${selectExpr} %>%\n  collect()`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `library(duckdb)\nlibrary(dplyr)\nlibrary(dbplyr)\n\n# Assuming tbl_duckdb is a dbplyr table pointer connected to DuckDB\nfiltered_duck <- tbl_duckdb %>%\n  filter(\n    ${filterExpression.replace(/\n/g, '\n    ')}\n  )${selectExpr} %>%\n  collect()`;
};

const QueryBuilder = ({ metadata, rules, logical, onAddRule, onRemoveRule, onUpdateRule, onUpdateLogical, onClearRules, uniqueVals, colors, isDarkMode }) => {
  return (
    <div style={{
      background: colors.toolbarBg,
      borderBottom: `1px solid ${colors.border}`,
      padding: '14px 18px',
      fontFamily: "'Inter','Segoe UI',sans-serif",
      fontSize: 13,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {/* Control row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: colors.text }}>Match</span>
        <select 
          value={logical} 
          onChange={e => onUpdateLogical(e.target.value)}
          style={{
            padding: '5px 8px',
            border: `1.5px solid ${colors.border}`,
            borderRadius: 6,
            background: colors.btnBg,
            fontWeight: 600,
            color: colors.text,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="AND">ALL (AND)</option>
          <option value="OR">ANY (OR)</option>
        </select>
        <span style={{ color: colors.subText }}>of the following conditions:</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button 
            onClick={onAddRule}
            style={{
              padding: '6px 12px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>+</span> Add Condition
          </button>
          {rules.length > 0 && (
            <button 
              onClick={onClearRules}
              style={{
                padding: '6px 12px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div style={{ color: colors.subText, fontStyle: 'italic', padding: '6px 0' }}>
          No query conditions added. Click "+ Add Condition" to filter this dataset.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((rule) => {
            const selectedColName = rule.col;
            const colMeta = metadata.find(m => m.name === selectedColName) || metadata[0];
            const ops = getOperatorsForType(colMeta.type);
            const isNullOp = rule.op === 'is_null' || rule.op === 'is_not_null';
            const isLogical = colMeta.type === 'logical';

            return (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Column */}
                <select
                  value={rule.col}
                  onChange={e => {
                    const newCol = e.target.value;
                    const newColMeta = metadata.find(m => m.name === newCol);
                    const newOps = getOperatorsForType(newColMeta.type);
                    onUpdateRule(rule.id, {
                      col: newCol,
                      op: newOps[0].value,
                      val: newColMeta.type === 'logical' ? 'true' : ''
                    });
                  }}
                  style={{
                    padding: '6px 10px',
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: 6,
                    minWidth: 150,
                    outline: 'none',
                    background: colors.btnBg,
                    color: colors.text
                  }}
                >
                  {metadata.map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={rule.op}
                  onChange={e => {
                    const newOp = e.target.value;
                    const valIsHidden = newOp === 'is_null' || newOp === 'is_not_null';
                    onUpdateRule(rule.id, {
                      op: newOp,
                      val: valIsHidden ? '' : rule.val
                    });
                  }}
                  style={{
                    padding: '6px 10px',
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: 6,
                    outline: 'none',
                    background: colors.btnBg,
                    color: colors.text
                  }}
                >
                  {ops.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Value Input */}
                {!isNullOp && (
                  <>
                    {isLogical ? (
                      <select
                        value={rule.val}
                        onChange={e => onUpdateRule(rule.id, { val: e.target.value })}
                        style={{
                          padding: '6px 10px',
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 6,
                          outline: 'none',
                          background: colors.btnBg,
                          color: colors.text
                        }}
                      >
                        <option value="true">TRUE</option>
                        <option value="false">FALSE</option>
                      </select>
                    ) : (rule.op === 'in' || rule.op === 'not_in') ? (
                      (() => {
                        let selectedList = [];
                        try {
                          selectedList = JSON.parse(rule.val || '[]');
                        } catch (e) {}
                        if (!Array.isArray(selectedList)) selectedList = [];

                        return (
                          <MultiSelectCheckboxDropdown
                            uniqueVals={uniqueVals[selectedColName]}
                            selectedVals={selectedList}
                            onChange={(next) => onUpdateRule(rule.id, { val: JSON.stringify(next) })}
                            colors={colors}
                            isDarkMode={isDarkMode}
                          />
                        );
                      })()
                    ) : (CATEGORICAL.has(colMeta.type) && (rule.op === '==' || rule.op === '!=')) ? (
                      <select
                        value={rule.val}
                        onChange={e => onUpdateRule(rule.id, { val: e.target.value })}
                        style={{
                          padding: '6px 10px',
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 6,
                          outline: 'none',
                          background: colors.btnBg,
                          color: colors.text,
                          maxWidth: 220
                        }}
                      >
                        <option value="">(Select value)</option>
                        {(uniqueVals[selectedColName] || []).map(v => {
                          const strVal = v === null ? 'NA' : String(v);
                          return (
                            <option key={strVal} value={strVal}>{strVal}</option>
                          );
                        })}
                      </select>
                    ) : colMeta.type === 'numeric' || colMeta.type === 'integer' ? (
                      <input
                        type="number"
                        placeholder="Number..."
                        value={rule.val}
                        onChange={e => onUpdateRule(rule.id, { val: e.target.value })}
                        style={{
                          padding: '6px 10px',
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 6,
                          outline: 'none',
                          background: colors.btnBg,
                          color: colors.text,
                          width: 130
                        }}
                      />
                    ) : colMeta.type === 'datetime' ? (
                      <input
                        type="date"
                        value={rule.val}
                        onChange={e => onUpdateRule(rule.id, { val: e.target.value })}
                        style={{
                          padding: '6px 10px',
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 6,
                          outline: 'none',
                          background: colors.btnBg,
                          color: colors.text
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="Text..."
                        value={rule.val}
                        onChange={e => onUpdateRule(rule.id, { val: e.target.value })}
                        style={{
                          padding: '6px 10px',
                          border: `1.5px solid ${colors.border}`,
                          borderRadius: 6,
                          outline: 'none',
                          background: colors.btnBg,
                          color: colors.text,
                          width: 150
                        }}
                      />
                    )}
                  </>
                )}

                {/* Delete button */}
                <button
                  onClick={() => onRemoveRule(rule.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDarkMode ? '#7f1d1d' : '#fef2f2',
                    border: `1px solid ${isDarkMode ? '#991b1b' : '#fee2e2'}`,
                    borderRadius: 6,
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontWeight: 'bold',
                    fontSize: 16
                  }}
                  title="Remove condition"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Filter Panel (floating popup) ────────────────────────────────────────────
const FilterPanel = ({ meta, uniqueVals, applied, position, onApply, onClear, onClose, onSort, colors, isDarkMode }) => {
  const isCat = CATEGORICAL.has(meta.type);
  const initSel = new Set(applied && Array.isArray(applied) ? applied : []);
  const initTxt = (!isCat && applied && typeof applied === 'string') ? applied : '';
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(initSel);
  const [text,     setText]     = useState(initTxt);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const listVals = useMemo(() =>
    (uniqueVals || []).filter(v => String(v).toLowerCase().includes(search.toLowerCase())),
    [uniqueVals, search]);

  const toggle = v => setSelected(p => { const s = new Set(p); s.has(v) ? s.delete(v) : s.add(v); return s; });

  const apply = () => {
    if (isCat) onApply(meta.name, selected.size > 0 ? [...selected] : null);
    else        onApply(meta.name, text.trim() || null);
    onClose();
  };
  const clear = () => { setSelected(new Set()); setText(''); onClear(meta.name); onClose(); };

  const panelW = 260;
  const left   = Math.min(position.x, window.innerWidth - panelW - 8);
  const top    = Math.min(position.y + 4, window.innerHeight - 420);

  return (
    <div ref={ref} onMouseDown={e => e.stopPropagation()} style={{
      position:'fixed', zIndex:9999, left, top, width:panelW,
      background:colors.cardBg, border:`1px solid ${colors.border}`, borderRadius:10,
      boxShadow:'0 16px 48px rgba(0,0,0,0.18)',
      fontFamily:"'Inter','Segoe UI',sans-serif", fontSize:13, overflow:'hidden',
    }}>
      {/* Sort */}
      <div style={{ borderBottom:`1px solid ${colors.border}` }}>
        {[['asc','↑  Sort ascending'],['desc','↓  Sort descending']].map(([d,lbl]) => (
          <div key={d} onClick={() => { onSort(meta.name,d); onClose(); }}
            style={{ padding:'10px 16px', cursor:'pointer', color:colors.text, display:'flex', alignItems:'center', gap:8 }}
            onMouseEnter={e=>e.currentTarget.style.background=colors.hoverBg}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            {lbl}
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding:'10px 12px', borderBottom:`1px solid ${colors.border}` }}>
        <div style={{ position:'relative' }}>
          <input autoFocus type="text"
            placeholder={isCat ? 'Search values…' : 'Filter value…'}
            value={isCat ? search : text}
            onChange={e => isCat ? setSearch(e.target.value) : setText(e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', padding:'7px 32px 7px 10px',
              border:`1px solid ${colors.border}`, borderRadius:6, fontSize:12, outline:'none',
              color:colors.text, background:colors.bg }} />
          <span style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)',
            color:colors.subText, fontSize:14, pointerEvents:'none' }}>🔍</span>
        </div>
      </div>

      {/* Checkboxes */}
      {isCat && (
        <>
          <div style={{ display:'flex', gap:12, padding:'6px 16px', borderBottom:`1px solid ${colors.border}` }}>
            <span onClick={() => setSelected(new Set(listVals||[]))}
              style={{ fontSize:11, color:'#3b82f6', cursor:'pointer', textDecoration:'underline' }}>
              Select all
            </span>
            <span onClick={() => setSelected(new Set())}
              style={{ fontSize:11, color:colors.subText, cursor:'pointer', textDecoration:'underline' }}>
              Clear
            </span>
            <span style={{ marginLeft:'auto', fontSize:11, color:colors.subText }}>
              {selected.size} selected
            </span>
          </div>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {listVals.length === 0 && (
              <div style={{ padding:'12px 16px', color:colors.subText, fontSize:12 }}>No matching values</div>
            )}
            {listVals.map(v => {
              const lbl = v == null ? 'NA' : String(v);
              const chk = selected.has(v);
              return (
                <label key={lbl} style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'8px 16px', cursor:'pointer',
                  background: chk ? (isDarkMode ? '#1e3a8a' : '#eff6ff') : 'transparent' }}
                  onMouseEnter={e => { if(!chk) e.currentTarget.style.background=colors.hoverBg; }}
                  onMouseLeave={e => { if(!chk) e.currentTarget.style.background='transparent'; }}>
                  <input type="checkbox" checked={chk} onChange={() => toggle(v)}
                    style={{ accentColor:'#3b82f6', width:14, height:14, cursor:'pointer', flexShrink:0 }} />
                  <span style={{ color:colors.text }}>{lbl}</span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {/* Buttons */}
      <div style={{ display:'flex', gap:8, padding:'12px 16px',
        borderTop:`1px solid ${colors.border}`, background:colors.toolbarBg }}>
        <button onClick={clear} style={{ flex:1, padding:'8px 0', borderRadius:20,
          border:`1.5px solid ${colors.border}`, background:colors.btnBg, color:colors.text,
          fontSize:13, fontWeight:500, cursor:'pointer' }}>Clear</button>
        <button onClick={apply} style={{ flex:1, padding:'8px 0', borderRadius:20,
          border:'none', background:colors.text, color:colors.bg,
          fontSize:13, fontWeight:600, cursor:'pointer' }}>Apply</button>
      </div>
    </div>
  );
};

// ── Column Visibility Panel ───────────────────────────────────────────────────
const ColVisPanel = ({ metadata, visible, onChange, onClose, colors, isDarkMode }) => {
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const filtered = metadata.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const allOn  = metadata.every(m => visible.has(m.name));
  const allOff = metadata.every(m => !visible.has(m.name));

  const toggle = name => onChange(prev => {
    const s = new Set(prev);
    s.has(name) ? s.delete(name) : s.add(name);
    return s;
  });

  return (
    <div ref={ref} style={{
      position:'absolute', top:'100%', right:0, marginTop:4, zIndex:9999,
      width:240, background:colors.cardBg, border:`1px solid ${colors.border}`, borderRadius:10,
      boxShadow:'0 12px 40px rgba(0,0,0,0.15)',
      fontFamily:"'Inter','Segoe UI',sans-serif", fontSize:13, overflow:'hidden',
    }}>
      <div style={{ padding:'10px 12px', borderBottom:`1px solid ${colors.border}`,
        fontWeight:600, color:colors.text, fontSize:13 }}>
        Columns
      </div>
      {/* Search */}
      <div style={{ padding:'8px 12px', borderBottom:`1px solid ${colors.border}` }}>
        <input type="text" placeholder="Search columns…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', boxSizing:'border-box', padding:'6px 10px',
            border:`1px solid ${colors.border}`, borderRadius:6, fontSize:12,
            outline:'none', color:colors.text, background:colors.bg }} />
      </div>
      {/* Select all / none */}
      <div style={{ display:'flex', gap:12, padding:'6px 16px',
        borderBottom:`1px solid ${colors.border}` }}>
        <span onClick={() => onChange(new Set(metadata.map(m=>m.name)))}
          style={{ fontSize:11, color:'#3b82f6', cursor:'pointer', textDecoration:'underline' }}>
          Show all
        </span>
        <span onClick={() => onChange(new Set())}
          style={{ fontSize:11, color:colors.subText, cursor:'pointer', textDecoration:'underline' }}>
          Hide all
        </span>
        <span style={{ marginLeft:'auto', fontSize:11, color:colors.subText }}>
          {visible.size} / {metadata.length}
        </span>
      </div>
      {/* Column list */}
      <div style={{ maxHeight:300, overflowY:'auto' }}>
        {filtered.map(meta => {
          const on = visible.has(meta.name);
          const t  = tm(meta.type);
          return (
            <label key={meta.name} style={{ display:'flex', alignItems:'center', gap:10,
              padding:'8px 16px', cursor:'pointer',
              background: on ? (isDarkMode ? '#064e3b' : '#f0fdf4') : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = on ? (isDarkMode ? '#064e3b' : '#f0fdf4') : colors.hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = on ? (isDarkMode ? '#064e3b' : '#f0fdf4') : 'transparent'}>
              <input type="checkbox" checked={on} onChange={() => toggle(meta.name)}
                style={{ accentColor:'#22c55e', width:14, height:14, cursor:'pointer', flexShrink:0 }} />
              <span style={{ fontSize:10, padding:'1px 4px', borderRadius:3,
                background:t.bg, color:t.text, fontWeight:700, flexShrink:0 }}>
                {t.icon}
              </span>
              <span style={{ color:colors.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {meta.name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

// ── Column Metadata Tooltip ────────────────────────────────────────────────────
const ColMetaTooltip = ({ meta, rawRows, colors, isDarkMode }) => {
  const isNumeric = meta.type === 'numeric' || meta.type === 'integer';
  const totalRows = rawRows.length;

  const { validCount, naCount, topValues, minVal, maxVal, meanVal } = useMemo(() => {
    let valid = 0, na = 0;
    const freq = {};
    let min = Infinity, max = -Infinity, sum = 0, numCount = 0;

    for (const row of rawRows) {
      const v = row[meta.name];
      if (v == null) {
        na++;
      } else {
        valid++;
        if (isNumeric) {
          const n = Number(v);
          if (!isNaN(n)) {
            if (n < min) min = n;
            if (n > max) max = n;
            sum += n;
            numCount++;
          }
        } else {
          const s = String(v);
          freq[s] = (freq[s] || 0) + 1;
        }
      }
    }

    const top = isNumeric ? [] : Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([val, cnt]) => ({ val, cnt }));

    return {
      validCount: valid,
      naCount: na,
      topValues: top,
      minVal: isNumeric && numCount > 0 ? min : null,
      maxVal: isNumeric && numCount > 0 ? max : null,
      meanVal: isNumeric && numCount > 0 ? (sum / numCount) : null,
    };
  }, [rawRows, meta.name, isNumeric]);

  const missPct = totalRows > 0 ? ((naCount / totalRows) * 100).toFixed(1) : '0.0';
  const validPct = 100 - parseFloat(missPct);

  const fmt = (n) => {
    if (n == null) return '—';
    if (Math.abs(n) >= 1e6) return n.toExponential(2);
    if (!Number.isInteger(n) && Math.abs(n) < 1e4) return n.toFixed(3);
    return n.toLocaleString();
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      zIndex: 15000,
      marginTop: 4,
      width: 210,
      background: isDarkMode ? '#1e293b' : '#ffffff',
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
      padding: '10px 12px',
      pointerEvents: 'none',
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      {/* Column title */}
      <div style={{ fontWeight: 700, fontSize: 12, color: colors.text, marginBottom: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {meta.name}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'Rows', value: totalRows.toLocaleString() },
          { label: 'Unique', value: (meta.unique_values ?? '—').toLocaleString() },
          { label: 'Missing', value: `${missPct}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: '1 1 auto',
            background: isDarkMode ? '#0f172a' : '#f8fafc',
            borderRadius: 6, padding: '4px 6px', textAlign: 'center',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: 9, color: colors.subText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Data quality bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: colors.subText, fontWeight: 600, marginBottom: 3,
          textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data quality</div>
        <div style={{ height: 6, borderRadius: 3, background: isDarkMode ? '#334155' : '#e2e8f0',
          overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${validPct}%`,
            background: validPct >= 90 ? '#22c55e' : validPct >= 70 ? '#f59e0b' : '#ef4444',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ fontSize: 9, color: colors.subText, marginTop: 2 }}>
          {validCount.toLocaleString()} valid · {naCount.toLocaleString()} NA
        </div>
      </div>

      {/* Numeric stats OR top values */}
      {isNumeric ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {[['Min', fmt(minVal)], ['Mean', fmt(meanVal)], ['Max', fmt(maxVal)]].map(([lbl, val]) => (
            <div key={lbl} style={{
              background: isDarkMode ? '#0f172a' : '#f8fafc',
              borderRadius: 6, padding: '3px 5px', textAlign: 'center',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: 9, color: colors.subText, fontWeight: 600 }}>{lbl}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>{val}</div>
            </div>
          ))}
        </div>
      ) : topValues.length > 0 ? (
        <div>
          <div style={{ fontSize: 9, color: colors.subText, fontWeight: 600, marginBottom: 4,
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top values</div>
          {topValues.map(({ val, cnt }) => {
            const pct = totalRows > 0 ? (cnt / totalRows) * 100 : 0;
            return (
              <div key={val} style={{ marginBottom: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10,
                  color: colors.text, marginBottom: 1 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{val}</span>
                  <span style={{ color: colors.subText, flexShrink: 0, marginLeft: 4 }}>{cnt.toLocaleString()}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: isDarkMode ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

// ── Column Header Cell ────────────────────────────────────────────────────────
const ColHeader = React.memo(({ meta, sortCol, sortDir, isFiltered, showLabels, onSort, onOpenPanel, rawRows, colors, isDarkMode }) => {
  const active  = sortCol === meta.name;
  const t       = tm(meta.type);
  const btnRef  = useRef(null);
  const [hoveringName, setHoveringName] = useState(false);
  const HEADER_HEIGHT = showLabels ? HEADER_HEIGHT_LBL : HEADER_HEIGHT_BASE;
  const isNumericCol = meta.type === 'numeric' || meta.type === 'integer';

  // Data-quality bar calculation (memoized per column metadata + rawRows)
  const { validPct, naCount } = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return { validPct: 100, naCount: 0 };
    let na = 0;
    for (const row of rawRows) {
      if (row[meta.name] == null) na++;
    }
    return {
      validPct: ((rawRows.length - na) / rawRows.length) * 100,
      naCount: na,
    };
  }, [rawRows, meta.name]);

  const qualityColor = validPct >= 90 ? '#22c55e' : validPct >= 70 ? '#f59e0b' : '#ef4444';

  const openPanel = e => {
    e.stopPropagation();
    const r = btnRef.current.getBoundingClientRect();
    onOpenPanel(meta.name, { x: r.left, y: r.bottom });
  };

  return (
    <div onClick={() => onSort(meta.name)} className="dtex-header-cell" style={{
      width: COL_WIDTH, flexShrink:0, height:HEADER_HEIGHT,
      padding:'5px 8px 5px 10px', display:'flex', flexDirection:'column',
      justifyContent:'center', cursor:'pointer', userSelect:'none',
      borderRight:`1px solid ${colors.border}`, boxSizing:'border-box',
      background: active ? colors.headerActiveBg : isFiltered ? (isDarkMode ? '#064e3b' : '#f0fdf4') : colors.headerBg,
      position: 'relative',
    }}>
      {/* Row 1: type icon + column name + sort arrow */}
      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
        <span style={{ fontSize:10, color:t.text, fontWeight:700,
          background:t.bg, borderRadius:3, padding:'0 4px', flexShrink:0 }}>{t.icon}</span>
        {/* Hoverable column name that triggers metadata tooltip */}
        <span
          onMouseEnter={e => { e.stopPropagation(); setHoveringName(true); }}
          onMouseLeave={() => setHoveringName(false)}
          style={{
            fontWeight:600, fontSize:13, color:colors.text,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1,
            textAlign: isNumericCol ? 'right' : 'left',
            borderBottom: hoveringName ? `1px dashed ${colors.subText}` : '1px solid transparent',
            cursor: 'help',
          }}
        >
          {meta.name}
        </span>
        <span style={{ fontSize:10, color: active?'#3b82f6':colors.subText, flexShrink:0 }}>
          {active ? (sortDir==='asc'?'▲':'▼') : '⇅'}
        </span>
      </div>

      {/* Row 2 (label): shown only when showLabels=true and label exists */}
      {showLabels && meta.label && (
        <div style={{
          fontSize:10, color:'#7c3aed', fontStyle:'italic',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          marginBottom:2, lineHeight:'13px',
          background:'#f5f3ff', borderRadius:3, padding:'1px 4px',
          textAlign: isNumericCol ? 'right' : 'left',
        }} title={meta.label}>
          {meta.label}
        </div>
      )}
      {/* Spacer when labels on but no label for this column */}
      {showLabels && !meta.label && (
        <div style={{ height:15, marginBottom:2 }} />
      )}

      {/* Row 3: type badge + uniq count + quality bar + filter button */}
      <div style={{ display:'flex', gap:4, alignItems:'center' }}>
        <span style={{ fontSize:10, padding:'1px 5px', borderRadius:3,
          background:t.bg, color:t.text, fontWeight:600 }}>{meta.type}</span>
        <span style={{ fontSize:10, padding:'1px 5px', borderRadius:3,
          background:isDarkMode ? '#334155' : '#f1f5f9', color:colors.subText }}>{meta.unique_values} uniq</span>
        {/* Thin data-quality bar */}
        <div style={{ flex:1, height:4, borderRadius:2, background: isDarkMode ? '#334155' : '#e2e8f0',
          overflow:'hidden', minWidth:20 }}
          title={`${validPct.toFixed(1)}% valid · ${naCount} NA`}
        >
          <div style={{
            width: `${validPct}%`, height:'100%',
            background: qualityColor, borderRadius:2,
          }} />
        </div>
        <button ref={btnRef} onClick={openPanel} title="Filter / Sort"
          style={{ width:20, height:20, border:'none', borderRadius:4,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, flexShrink:0,
            background: isFiltered?'#3b82f6':'transparent',
            color: isFiltered?'#fff':colors.subText }}>
          ≡
        </button>
      </div>

      {/* Metadata tooltip on column name hover */}
      {hoveringName && rawRows && rawRows.length > 0 && (
        <ColMetaTooltip meta={meta} rawRows={rawRows} colors={colors} isDarkMode={isDarkMode} />
      )}
    </div>
  );
});

// ── Main Component ────────────────────────────────────────────────────────────
const DTSmartRComponent = ({ data, metadata, datasetName = 'df', options = {} }) => {
  const {
    advanced_filter = true,
    show_labels     = true,
    column_picker   = true,
    allow_export    = true,
    theme           = 'auto',
    na_string       = 'NA',
    hidden_columns  = []
  } = options;

  const [showRCodeModal,   setShowRCodeModal]   = useState(false);
  const [sortCol,          setSortCol]          = useState(null);
  const [sortDir,          setSortDir]          = useState('asc');
  const [filters,          setFilters]          = useState({});
  const [popup,            setPopup]            = useState(null);
  const [showColVis,       setShowColVis]       = useState(false);
  const [visible,          setVisible]          = useState(null);
  const [scrollTop,        setScrollTop]        = useState(0);
  const [showLabels,       setShowLabels]       = useState(show_labels);   // label toggle
  const [wrapH,            setWrapH]            = useState(400);
  const [showQueryBuilder, setShowQueryBuilder] = useState(false); // advanced filter open/close
  const [queryRules,       setQueryRules]       = useState([]);     // rules list
  const [queryLogical,     setQueryLogical]     = useState('AND');   // logic connector
  const [pinnedRows,       setPinnedRows]       = useState(new Set()); // row-pinning by original index
  const wrapRef = useRef(null);

  // Whether any column in this dataset carries a label
  const hasAnyLabel = useMemo(() =>
    (metadata || []).some(m => m.label), [metadata]);

  // Dark Mode detection
  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // 'auto'
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [theme]);

  // Theme palettes
  const colors = useMemo(() => {
    if (isDarkMode) {
      return {
        bg: '#0f172a',
        text: '#f8fafc',
        border: '#334155',
        cardBg: '#1e293b',
        stripe: '#1e293b',
        rowBg: '#0f172a',
        toolbarBg: '#1e293b',
        hoverBg: '#334155',
        subText: '#94a3b8',
        btnBg: '#334155',
        btnText: '#f8fafc',
        headerBg: '#1e293b',
        headerActiveBg: '#1e3a8a',
        headerActiveBorder: '#3b82f6',
      };
    } else {
      return {
        bg: '#ffffff',
        text: '#1e293b',
        border: '#e2e8f0',
        cardBg: '#ffffff',
        stripe: '#fafafa',
        rowBg: '#ffffff',
        toolbarBg: '#f8fafc',
        hoverBg: '#f1f5f9',
        subText: '#64748b',
        btnBg: '#ffffff',
        btnText: '#334155',
        headerBg: '#f8fafc',
        headerActiveBg: '#eff6ff',
        headerActiveBorder: '#bfdbfe',
      };
    }
  }, [isDarkMode]);

  // Track scroll wrapper height via ResizeObserver
  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setWrapH(e.contentRect.height);
    });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  // Raw rows from R column-oriented format
  const rawRows = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const keys = Object.keys(data);
    if (!keys.length) return [];
    const n = data[keys[0]].length;
    return Array.from({ length:n }, (_, i) => {
      const row = {};
      for (const k of keys) row[k] = data[k][i];
      return row;
    });
  }, [data]);

  // Default: initialize visible columns using hidden_columns preference
  useEffect(() => {
    if (metadata && visible === null) {
      const hiddenSet = new Set(hidden_columns || []);
      const initialVisible = new Set(
        metadata.map(m => m.name).filter(name => !hiddenSet.has(name))
      );
      setVisible(initialVisible);
    }
  }, [metadata, hidden_columns]);

  const cols = useMemo(() =>
    (metadata || []).filter(m => visible ? visible.has(m.name) : true),
    [metadata, visible]);

  // Unique values per column (including NA values)
  const uniqueVals = useMemo(() => {
    const out = {};
    for (const meta of (metadata||[])) {
      const seen = new Set();
      let hasNull = false;
      for (const row of rawRows) {
        const v = row[meta.name];
        if (v == null) {
          hasNull = true;
        } else {
          seen.add(v);
        }
      }
      const sorted = [...seen].sort((a,b) =>
        typeof a==='number' && typeof b==='number' ? a-b : String(a).localeCompare(String(b)));
      if (hasNull) {
        sorted.push(null);
      }
      out[meta.name] = sorted;
    }
    return out;
  }, [rawRows, metadata]);

  // Filter
  const filteredRows = useMemo(() => {
    // 1. Column-level quick filters
    const activeQuick = Object.entries(filters).filter(([,v]) =>
      v != null && (Array.isArray(v) ? v.length>0 : v!==''));

    // 2. Advanced Query rules
    const hasRules = queryRules && queryRules.length > 0;

    if (!activeQuick.length && !hasRules) return rawRows;

    return rawRows.filter(row => {
      // Evaluate quick filters first (must all match - AND)
      const matchesQuick = activeQuick.every(([col, val]) => {
        const cell = row[col];
        if (Array.isArray(val)) {
          return val.some(v => {
            if (v == null && cell == null) return true;
            if (v != null && cell != null) return String(v) === String(cell);
            return false;
          });
        }
        if (cell == null) return false;
        return String(cell).toLowerCase().includes(val.toLowerCase());
      });

      if (!matchesQuick) return false;

      // Evaluate advanced query rules
      if (!hasRules) return true;

      const ruleEvaluations = queryRules.map(rule => {
        const cell = row[rule.col];
        const val = rule.val;
        const op = rule.op;

        // Null checks
        if (op === 'is_null') {
          return cell == null || cell === '';
        }
        if (op === 'is_not_null') {
          return cell != null && cell !== '';
        }

        // Evaluate NA/null check for 'in' and 'not_in' before checking if cell == null
        if (op === 'in') {
          let allowed = [];
          try { allowed = JSON.parse(val || '[]'); } catch(e) {}
          if (allowed.length === 0) return true;
          if (cell == null) return allowed.includes('NA') || allowed.includes(null);
          return allowed.some(v => String(v).toLowerCase() === String(cell).toLowerCase());
        }
        if (op === 'not_in') {
          let forbidden = [];
          try { forbidden = JSON.parse(val || '[]'); } catch(e) {}
          if (forbidden.length === 0) return true;
          if (cell == null) return !(forbidden.includes('NA') || forbidden.includes(null));
          return !forbidden.some(v => String(v).toLowerCase() === String(cell).toLowerCase());
        }

        // If the cell value is null but we are not doing a null check, then it is false
        if (cell == null) return false;

        const cellStr = String(cell).toLowerCase();
        const valStr = String(val).toLowerCase();

        switch (op) {
          case '==':
            if (typeof cell === 'boolean') {
              return String(cell) === val;
            }
            if (typeof cell === 'number') {
              return cell === Number(val);
            }
            return cellStr === valStr;
          case '!=':
            if (typeof cell === 'boolean') {
              return String(cell) !== val;
            }
            if (typeof cell === 'number') {
              return cell !== Number(val);
            }
            return cellStr !== valStr;
          case '>':
            return typeof cell === 'number' ? cell > Number(val) : cellStr > valStr;
          case '<':
            return typeof cell === 'number' ? cell < Number(val) : cellStr < valStr;
          case '>=':
            return typeof cell === 'number' ? cell >= Number(val) : cellStr >= valStr;
          case '<=':
            return typeof cell === 'number' ? cell <= Number(val) : cellStr <= valStr;
          case 'contains':
            return cellStr.includes(valStr);
          case 'not_contains':
            return !cellStr.includes(valStr);
          case 'starts_with':
            return cellStr.startsWith(valStr);
          case 'ends_with':
            return cellStr.endsWith(valStr);
          default:
            return true;
        }
      });

      if (queryLogical === 'AND') {
        return ruleEvaluations.every(res => res);
      } else {
        return ruleEvaluations.some(res => res);
      }
    });
  }, [rawRows, filters, queryRules, queryLogical]);

  // Sort
  const rows = useMemo(() => {
    if (!sortCol) return filteredRows;
    return [...filteredRows].sort((a,b) => {
      const av=a[sortCol], bv=b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av==='number'&&typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv));
      return sortDir==='asc'?cmp:-cmp;
    });
  }, [filteredRows, sortCol, sortDir]);

  const handleSort = useCallback((col, dir) => {
    if (dir) { setSortCol(col); setSortDir(dir); }
    else setSortCol(prev => {
      if (prev===col) { setSortDir(d=>d==='asc'?'desc':'asc'); return col; }
      setSortDir('asc'); return col;
    });
  }, []);

  const handleApply = useCallback((col, val) => {
    setFilters(p => ({ ...p, [col]: val })); setScrollTop(0);
  }, []);
  const handleClear = useCallback(col => {
    setFilters(p => { const n={...p}; delete n[col]; return n; });
  }, []);

  const activeFilterCount = Object.values(filters).filter(v =>
    v != null && (Array.isArray(v) ? v.length>0 : v!=='')).length;

  // Virtualisation — header height depends on label visibility
  const HEADER_HEIGHT = (showLabels && hasAnyLabel) ? HEADER_HEIGHT_LBL : HEADER_HEIGHT_BASE;
  const bodyH       = wrapH - HEADER_HEIGHT;
  const startIdx    = Math.max(0, Math.floor(scrollTop/ROW_HEIGHT) - OVERSCAN);
  const endIdx      = Math.min(rows.length, Math.ceil((scrollTop+bodyH)/ROW_HEIGHT) + OVERSCAN);
  const visibleRows = rows.slice(startIdx, endIdx);
  const tableW      = ROW_NUM_W + cols.length * COL_WIDTH;

  const popupMeta = popup ? (metadata||[]).find(c=>c.name===popup.col) : null;

  if (!metadata || !data) return <div style={{padding:20,color:'#94a3b8'}}>No data</div>;

  const containerStyle = {
    height: '100%', display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    fontSize: 13, background: colors.bg, color: colors.text,
    border: `1px solid ${colors.border}`, boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        .dtex-row:hover { background-color: ${isDarkMode ? '#334155' : '#f1f5f9'} !important; }
        .dtex-row:hover .dtex-rownum { background-color: ${isDarkMode ? '#334155' : '#f1f5f9'} !important; }
        .dtex-header-cell:hover { background-color: ${isDarkMode ? '#334155' : '#f1f5f9'} !important; }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ flexShrink:0, padding:'8px 14px', borderBottom:`1px solid ${colors.border}`,
        background:colors.toolbarBg, display:'flex', alignItems:'center', gap:12 }}>
        {/* Stats */}
        <span style={{ color:colors.subText, fontSize:12 }}>
          <b style={{color:colors.text}}>{rows.length}</b>
          {rows.length!==rawRows.length && <> / {rawRows.length}</>} rows ·{' '}
          <b style={{color:colors.text}}>{cols.length}</b>
          {cols.length!==(metadata||[]).length && <> / {(metadata||[]).length}</>} columns
        </span>
        {sortCol && (
          <span style={{ fontSize:11, color:colors.text, background:isDarkMode ? '#334155' : '#e2e8f0',
            padding:'2px 8px', borderRadius:10 }}>
            ↕ {sortCol} {sortDir}
          </span>
        )}
        {activeFilterCount>0 && (
          <span style={{ fontSize:11, color:'#3b82f6', background:isDarkMode ? '#1e3a8a' : '#dbeafe',
            padding:'2px 8px', borderRadius:10 }}>
            🔍 {activeFilterCount} filter{activeFilterCount>1?'s':''}
          </span>
        )}
        {activeFilterCount>0 && (
          <button onClick={()=>setFilters({})} style={{ fontSize:11, padding:'3px 10px',
            border:`1px solid ${colors.border}`, borderRadius:10, background:colors.btnBg,
            color:colors.text, cursor:'pointer' }}>
            Clear filters
          </button>
        )}

        {/* Right-side buttons */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>

        {/* Label toggle — only shown when dataset has labelled columns */}
        {hasAnyLabel && (
          <button onClick={() => setShowLabels(v => !v)}
            title={showLabels ? 'Hide column labels' : 'Show column labels'}
            style={{ display:'flex', alignItems:'center', gap:5,
              padding:'6px 10px', border:`1px solid ${colors.border}`, borderRadius:8,
              background: showLabels ? (isDarkMode ? '#2e1065' : '#f5f3ff') : colors.btnBg,
              color: showLabels ? '#7c3aed' : colors.subText,
              fontSize:12, fontWeight:500, cursor:'pointer',
              boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
              borderColor: showLabels ? '#c4b5fd' : colors.border }}>
            <span style={{fontSize:13}}>🏷</span>
            {showLabels ? 'Labels on' : 'Labels off'}
          </button>
        )}

        {/* Advanced Filter button */}
        {advanced_filter && (
          <button onClick={() => setShowQueryBuilder(v => !v)} style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 12px', border:`1px solid ${colors.border}`, borderRadius:8,
            background: showQueryBuilder ? (isDarkMode ? '#1e3a8a' : '#eff6ff') : colors.btnBg,
            color: showQueryBuilder ? (isDarkMode ? '#3b82f6' : '#2563eb') : colors.text,
            borderColor: showQueryBuilder ? (isDarkMode ? '#3b82f6' : '#bfdbfe') : colors.border,
            fontSize:12, fontWeight:500, cursor:'pointer',
            boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
          }} title="Build advanced multi-condition search queries">
            <span style={{fontSize:14}}>🔍</span> Advanced Filter
            {queryRules.length > 0 && (
              <span style={{ fontSize:10, background:'#2563eb', color:'#fff',
                borderRadius:10, padding:'1px 5px', marginLeft:2 }}>
                {queryRules.length}
              </span>
            )}
          </button>
        )}

        {/* Query Code Button */}
        {allow_export && (
          <button onClick={() => setShowRCodeModal(true)} style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 12px', border:`1px solid ${colors.border}`, borderRadius:8,
            background:colors.btnBg, color:colors.text,
            fontSize:12, fontWeight:500, cursor:'pointer',
            boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
          }} title="Show reproducible R or SQL query for these filters">
            <span style={{fontSize:14}}>📊</span> Query Code
          </button>
        )}

        {/* Column visibility toggle */}
        {column_picker && (
          <div style={{ position:'relative' }}>
            <button onClick={()=>setShowColVis(v=>!v)} style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 12px', border:`1px solid ${colors.border}`, borderRadius:8,
              background: showColVis ? colors.text : colors.btnBg,
              color: showColVis ? colors.bg : colors.text,
              fontSize:12, fontWeight:500, cursor:'pointer',
              boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <span style={{fontSize:14}}>⊞</span> Columns
              {visible && visible.size < (metadata||[]).length && (
                <span style={{ fontSize:10, background:'#ef4444', color:'#fff',
                  borderRadius:10, padding:'1px 5px', marginLeft:2 }}>
                  {(metadata||[]).length - visible.size} hidden
                </span>
              )}
            </button>
            {showColVis && (
              <ColVisPanel
                metadata={metadata||[]}
                visible={visible || new Set()}
                onChange={setVisible}
                onClose={()=>setShowColVis(false)}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        )}
        </div> {/* end right-side buttons */}
      </div>

      {/* ── Collapsible Query Builder Panel ── */}
      {showQueryBuilder && (
        <QueryBuilder
          metadata={metadata || []}
          rules={queryRules}
          logical={queryLogical}
          onAddRule={() => {
            const defaultCol = metadata[0]?.name || '';
            const defaultType = metadata[0]?.type || 'character';
            const defaultOps = getOperatorsForType(defaultType);
            setQueryRules(p => [
              ...p,
              {
                id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                col: defaultCol,
                op: defaultOps[0].value,
                val: defaultType === 'logical' ? 'true' : ''
              }
            ]);
          }}
          onRemoveRule={(id) => {
            setQueryRules(p => p.filter(r => r.id !== id));
          }}
          onUpdateRule={(id, updates) => {
            setQueryRules(p => p.map(r => r.id === id ? { ...r, ...updates } : r));
          }}
          onUpdateLogical={setQueryLogical}
          onClearRules={() => setQueryRules([])}
          uniqueVals={uniqueVals}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ── Single scroll container ── */}
      <div
        ref={wrapRef}
        onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
        style={{ flex:1, overflow:'auto', position:'relative', background: colors.bg }}
      >
        {/* Inner — full virtual width + height */}
        <div style={{ width: tableW, minWidth:'100%',
          height: HEADER_HEIGHT + rows.length * ROW_HEIGHT }}>

          {/* ── Sticky header row ── */}
          <div style={{ position:'sticky', top:0, zIndex:10, display:'flex',
            width: tableW, minWidth: '100%', boxSizing: 'border-box',
            borderBottom:`2px solid ${colors.border}`, background:colors.headerBg }}>
            {/* Row-number corner — sticky left AND top */}
            <div style={{ position:'sticky', left:0, zIndex:11,
              width:ROW_NUM_W, flexShrink:0, height:HEADER_HEIGHT,
              background:colors.headerBg, borderRight:`1px solid ${colors.border}`, boxSizing: 'border-box',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:colors.subText, fontSize:10 }}>#</div>
            {cols.map(meta => (
              <ColHeader key={meta.name} meta={meta}
                sortCol={sortCol} sortDir={sortDir}
                showLabels={showLabels && hasAnyLabel}
                isFiltered={!!(filters[meta.name] &&
                  (Array.isArray(filters[meta.name]) ? filters[meta.name].length>0 : filters[meta.name]!==''))}
                onSort={handleSort}
                onOpenPanel={(col,pos) => setPopup(p=>p&&p.col===col?null:{col,position:pos})}
                rawRows={rawRows}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>

          {/* ── Virtual body ── */}
          <div style={{ position:'relative', height: Math.max(120, rows.length * ROW_HEIGHT) }}>
            {rows.length === 0 ? (
              <div style={{
                position:'absolute', inset:0, display:'flex',
                alignItems:'center', justifyContent:'center',
                color:colors.subText, fontSize:13, fontStyle:'italic'
              }}>
                No records found
              </div>
            ) : (
              <div style={{ position:'absolute', top: startIdx * ROW_HEIGHT, width:'100%' }}>
                {visibleRows.map((row, vi) => {
                  const idx = startIdx + vi;
                  const isPinned = pinnedRows.has(idx);
                  const stripe = isPinned
                    ? (isDarkMode ? '#78350f' : '#fef9c3')  // gold-tinted pinned background
                    : (idx%2===0 ? colors.rowBg : colors.stripe);

                  const togglePin = (e) => {
                    e.stopPropagation();
                    setPinnedRows(prev => {
                      const next = new Set(prev);
                      next.has(idx) ? next.delete(idx) : next.add(idx);
                      return next;
                    });
                  };

                  return (
                    <div
                      key={idx}
                      className="dtex-row"
                      onClick={togglePin}
                      style={{
                        display:'flex', height:ROW_HEIGHT,
                        alignItems:'center', borderBottom:`1px solid ${colors.border}`,
                        background: stripe,
                        cursor: 'pointer',
                        outline: isPinned ? `2px solid #f59e0b` : 'none',
                        outlineOffset: '-2px',
                        position: 'relative',
                      }}
                    >
                      {/* Row number — sticky left, with pin indicator */}
                      <div
                        className="dtex-rownum"
                        style={{
                          position:'sticky', left:0, zIndex:1,
                          width:ROW_NUM_W, flexShrink:0, height:'100%',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          gap: 2,
                          color: isPinned ? '#f59e0b' : colors.subText,
                          fontWeight: isPinned ? 700 : 400,
                          borderRight:`1px solid ${colors.border}`,
                          background: stripe, boxSizing: 'border-box',
                          fontSize: 11,
                        }}
                        title={isPinned ? 'Click to unpin row' : 'Click to pin row'}
                      >
                        {isPinned && <span style={{ fontSize:9, lineHeight:1 }}>📌</span>}
                        {idx+1}
                      </div>
                      {cols.map(meta => {
                        const isNumericCol = meta.type === 'numeric' || meta.type === 'integer';
                        const cellVal = row[meta.name];
                        return (
                          <div key={meta.name} style={{
                            width:COL_WIDTH, flexShrink:0, padding:'0 10px',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                            borderRight:`1px solid ${colors.border}`, color:colors.text,
                            fontVariantNumeric:'tabular-nums', height:'100%',
                            display:'flex', alignItems:'center', boxSizing: 'border-box',
                            justifyContent: isNumericCol ? 'flex-end' : 'flex-start',
                            fontFamily: isNumericCol ? "'Fira Code', 'Consolas', monospace" : 'inherit',
                            fontSize: isNumericCol ? 12 : 13,
                          }} title={cellVal!=null?String(cellVal):'NA'}>
                            {cellVal != null
                              ? String(cellVal)
                              : <span style={{color:isDarkMode ? '#475569' : '#cbd5e1',fontStyle:'italic'}}>{na_string}</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating filter panel ── */}
      {popup && popupMeta && (
        <FilterPanel
          meta={popupMeta}
          uniqueVals={uniqueVals[popup.col]}
          applied={filters[popup.col]}
          position={popup.position}
          onApply={handleApply}
          onClear={handleClear}
          onClose={()=>setPopup(null)}
          onSort={handleSort}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ── Reproducible Code modal ── */}
      {showRCodeModal && (
        <RCodeModal
          codeObj={{
            dplyr: generateRCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length),
            baseR: generateBaseRCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length),
            sql:   generateSQLCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length)
          }}
          onClose={() => setShowRCodeModal(false)}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

// ── HTMLWidgets binding ───────────────────────────────────────────────────────
window.HTMLWidgets.widget({
  name: 'dtsmartr',
  type: 'output',
  factory: function(el, width, height) {
    let root = null;
    return {
      renderValue: function(x) {
        el.style.height = el.style.height || (height + 'px');
        const elem = React.createElement(DTSmartRComponent, {
          data: x.data,
          metadata: x.metadata,
          datasetName: x.dataset_name || 'df',
          options: x.options
        });
        if (window.ReactDOM.createRoot) {
          if (!root) root = window.ReactDOM.createRoot(el);
          root.render(elem);
        } else {
          window.ReactDOM.render(elem, el);
        }
      },
      resize: function(w, h) { el.style.height = h + 'px'; }
    };
  }
});