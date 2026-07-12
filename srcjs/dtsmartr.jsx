import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { tableFromIPC } from 'apache-arrow';

// ── Constants ────────────────────────────────────────────────────────────────
const ROW_HEIGHT         = 36;
const HEADER_HEIGHT_BASE = 125;   // without labels
const HEADER_HEIGHT_LBL  = 145;   // with labels row
const HEADER_HEIGHT_COMPACT_BASE = 48;   // without labels compact
const HEADER_HEIGHT_COMPACT_LBL  = 68;   // with labels compact
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
      : activeTab === 'sql'
        ? codeObj.sql
        : activeTab === 'arrow'
          ? codeObj.arrow
          : codeObj.duckdb;

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
            { id: 'sql',    label: 'SQL Query' },
            { id: 'arrow',  label: 'Arrow' },
            { id: 'duckdb', label: 'DuckDB / dbplyr' }
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

const generateRCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount, sortState = []) => {
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

  let sortExpr = '';
  if (sortState && sortState.length > 0) {
    const sortCols = sortState.map(item => item.desc ? `desc(${item.id})` : item.id).join(', ');
    sortExpr = ` %>%\n  arrange(${sortCols})`;
  }

  if (conditions.length === 0) {
    if ((visibleCols && visibleCols.length < totalColsCount) || sortExpr) {
      return `# No active filters\nlibrary(dplyr)\nfiltered_df <- ${datasetName}${sortExpr}${selectExpr}`;
    }
    return `# No active filters\nlibrary(dplyr)\nfiltered_df <- ${datasetName}`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `library(dplyr)\n\nfiltered_df <- ${datasetName} %>%\n  filter(\n    ${filterExpression.replace(/\n/g, '\n    ')}\n  )${sortExpr}${selectExpr}`;
};

const generateBaseRCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount, sortState = []) => {
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

  let sortExpr = '';
  if (sortState && sortState.length > 0) {
    const sortArgs = sortState.map(item => item.desc ? `-xtfrm(${item.id})` : item.id).join(', ');
    sortExpr = `\n\n# Sort\nfiltered_df <- filtered_df[with(filtered_df, order(${sortArgs})), ]`;
  }

  if (conditions.length === 0) {
    if (visibleCols && visibleCols.length < totalColsCount) {
      return `# No active filters\nfiltered_df <- subset(\n  ${datasetName}${selectArg}\n)${sortExpr}`;
    }
    return `# No active filters\nfiltered_df <- subset(${datasetName})${sortExpr}`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `filtered_df <- subset(\n  ${datasetName},\n  subset = ${filterExpression.replace(/\n/g, '\n  ')}${selectArg}\n)${sortExpr}`;
};

const generateSQLCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount, sortState = []) => {
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

  let orderClause = '';
  if (sortState && sortState.length > 0) {
    const sortCols = sortState.map(item => `${item.id} ${item.desc ? 'DESC' : 'ASC'}`).join(', ');
    orderClause = `\nORDER BY ${sortCols}`;
  }

  if (conditions.length === 0) {
    return `SELECT ${selectCols}\nFROM ${datasetName}${orderClause};`;
  }

  const whereClause = conditions.join('\n  AND ');
  return `SELECT ${selectCols}\nFROM ${datasetName}\nWHERE\n  ${whereClause.replace(/\n/g, '\n  ')}${orderClause};`;
};

const generateArrowCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount, sortState = []) => {
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

  let sortExpr = '';
  if (sortState && sortState.length > 0) {
    const sortCols = sortState.map(item => item.desc ? `desc(${item.id})` : item.id).join(', ');
    sortExpr = ` %>%\n  arrange(${sortCols})`;
  }

  if (conditions.length === 0) {
    return `library(arrow)\nlibrary(dplyr)\n\n# Assuming ${datasetName} is an Arrow Table or Dataset pointer\nfiltered_arrow <- ${datasetName}${sortExpr}${selectExpr} %>%\n  collect()`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `library(arrow)\nlibrary(dplyr)\n\n# Assuming ${datasetName} is an Arrow Table or Dataset pointer\nfiltered_arrow <- ${datasetName} %>%\n  filter(\n    ${filterExpression.replace(/\n/g, '\n    ')}\n  )${sortExpr}${selectExpr} %>%\n  collect()`;
};

const generateDuckDBCode = (datasetName, filters, queryRules, queryLogical, metadata, visibleCols, totalColsCount, sortState = []) => {
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

  let sortExpr = '';
  if (sortState && sortState.length > 0) {
    const sortCols = sortState.map(item => item.desc ? `desc(${item.id})` : item.id).join(', ');
    sortExpr = ` %>%\n  arrange(${sortCols})`;
  }

  if (conditions.length === 0) {
    return `library(duckdb)\nlibrary(dplyr)\nlibrary(dbplyr)\n\n# Assuming tbl_duckdb is a dbplyr table pointer connected to DuckDB\nfiltered_duck <- tbl_duckdb${sortExpr}${selectExpr} %>%\n  collect()`;
  }

  const filterExpression = conditions.join(' &\n  ');
  return `library(duckdb)\nlibrary(dplyr)\nlibrary(dbplyr)\n\n# Assuming tbl_duckdb is a dbplyr table pointer connected to DuckDB\nfiltered_duck <- tbl_duckdb %>%\n  filter(\n    ${filterExpression.replace(/\n/g, '\n    ')}\n  )${sortExpr}${selectExpr} %>%\n  collect()`;
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

// ── Sort Dropdown (floating popup) ───────────────────────────────────────────
const SortDropdown = ({ meta, position, onSort, onClose, colors, initialShift }) => {
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const panelW = 220;
  const left   = Math.min(position.x, window.innerWidth - panelW - 8);
  const top    = Math.min(position.y + 4, window.innerHeight - 200);

  return (
    <div ref={ref} onMouseDown={e => e.stopPropagation()} style={{
      position:'fixed', zIndex:9999, left, top, width:panelW,
      background:colors.cardBg, border:`1px solid ${colors.border}`, borderRadius:8,
      boxShadow:'0 10px 30px rgba(0,0,0,0.15)',
      fontFamily:"'Inter','Segoe UI',sans-serif", fontSize:13, overflow:'hidden',
      padding: '4px 0'
    }}>
      {[
        ['asc', '↑ Sort ascending (Primary)', false],
        ['desc', '↓ Sort descending (Primary)', false],
        ['asc_add', '➕ Add to sort (Ascending)', true],
        ['desc_add', '➕ Add to sort (Descending)', true],
        ['clear', '❌ Remove from sort', false]
      ].map(([d, lbl, isAdd]) => (
        <div key={d} onClick={(e) => {
          const dir = d.startsWith('asc') ? 'asc' : d.startsWith('desc') ? 'desc' : 'clear';
          onSort(meta.name, isAdd, dir);
          onClose();
        }}
          style={{ padding:'10px 16px', cursor:'pointer', color:colors.text, display:'flex', alignItems:'center', gap:8 }}
          onMouseEnter={e=>e.currentTarget.style.background=colors.hoverBg}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          {lbl}
        </div>
      ))}
    </div>
  );
};

// ── Filter Panel (floating popup) ────────────────────────────────────────────
const FilterPanel = ({ meta, uniqueVals, applied, position, onApply, onClear, onClose, colors, isDarkMode }) => {
  const isCat = CATEGORICAL.has(meta.type) || (uniqueVals && uniqueVals.length <= 20);
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

      {/* Search */}
      <div style={{ padding:'10px 12px', borderBottom:`1px solid ${colors.border}` }}>
        <div style={{ position:'relative' }}>
          <input autoFocus type="text"
            placeholder={isCat ? 'Search values…' : 'Filter value…'}
            value={isCat ? search : text}
            onChange={e => isCat ? setSearch(e.target.value) : setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') apply(); }}
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
// ── Collapsible Side Panel Drawer ──
// ── Interactive Histogram (Numeric) ──
const InteractiveHistogram = ({ histogramData, minVal, maxVal, colors, isDarkMode }) => {
  const [hoveredBin, setHoveredBin] = useState(null);

  if (!histogramData || histogramData.length === 0) return null;

  const width = 320;
  const height = 160;
  const paddingLeft = 35;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const fmt = (n) => {
    if (n == null) return '—';
    if (typeof n === 'string') {
      if (n.includes('T') && n.includes('Z')) {
        const d = new Date(n);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
      }
      return n;
    }
    const num = Number(n);
    if (isNaN(num)) return String(n);
    if (Math.abs(num) >= 1e4) return num.toExponential(1);
    if (!Number.isInteger(num)) return num.toFixed(1);
    return num.toLocaleString();
  };

  const binWidth = chartWidth / histogramData.length;
  const maxCount = Math.max(...histogramData.map(d => d.count), 1);

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <svg width={width} height={height} style={{ overflow: 'visible', userSelect: 'none' }}>
        {/* Background Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          const gridVal = maxCount * ratio;
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke={isDarkMode ? '#334155' : '#e2e8f0'} 
                strokeDasharray="3,3" 
              />
              <text 
                x={paddingLeft - 6} 
                y={y + 3} 
                fill={colors.subText} 
                fontSize={9} 
                textAnchor="end"
              >
                {fmt(gridVal)}
              </text>
            </g>
          );
        })}

        {/* X Axis Line */}
        <line 
          x1={paddingLeft} 
          y1={height - paddingBottom} 
          x2={width - paddingRight} 
          y2={height - paddingBottom} 
          stroke={colors.border} 
          strokeWidth={1.5}
        />

        {/* Bars */}
        {histogramData.map((d, i) => {
          const barHeight = (d.count / maxCount) * chartHeight;
          const x = paddingLeft + i * binWidth + 1;
          const y = height - paddingBottom - barHeight;
          const w = binWidth - 2;
          const h = Math.max(barHeight, d.count > 0 ? 1.5 : 0);

          const isHovered = hoveredBin === i;
          const fill = isHovered 
            ? (isDarkMode ? '#38bdf8' : '#0284c7') 
            : (isDarkMode ? '#0284c7' : '#3b82f6');

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={fill}
              rx={1.5}
              style={{ transition: 'fill 0.2s ease, opacity 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredBin(i)}
              onMouseLeave={() => setHoveredBin(null)}
            />
          );
        })}

        {/* X Axis Labels */}
        <text 
          x={paddingLeft} 
          y={height - 8} 
          fill={colors.subText} 
          fontSize={10} 
          textAnchor="start"
        >
          {fmt(minVal)}
        </text>
        <text 
          x={width - paddingRight} 
          y={height - 8} 
          fill={colors.subText} 
          fontSize={10} 
          textAnchor="end"
        >
          {fmt(maxVal)}
        </text>
      </svg>

      {/* Tooltip text box */}
      <div style={{
        minHeight: 38,
        background: isDarkMode ? '#0f172a' : '#f8fafc',
        border: `1.5px solid ${colors.border}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 11,
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontWeight: 500,
        boxSizing: 'border-box'
      }}>
        {hoveredBin !== null && histogramData[hoveredBin] ? (
          <div>
            Range: <b style={{ fontFamily: 'monospace' }}>[{fmt(histogramData[hoveredBin].rangeMin)} - {fmt(histogramData[hoveredBin].rangeMax)})</b>
            <span style={{ margin: '0 6px', color: colors.subText }}>•</span>
            Count: <b>{histogramData[hoveredBin].count.toLocaleString()} values</b> ({histogramData[hoveredBin].pct.toFixed(1)}%)
          </div>
        ) : (
          <span style={{ color: colors.subText, fontStyle: 'italic' }}>Hover over the histogram bars to inspect details</span>
        )}
      </div>
    </div>
  );
};

// ── Interactive Categorical Pareto Chart (Categorical) ──
const InteractiveCategoricalBarChart = ({ topCats, colors, isDarkMode }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!topCats || topCats.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {topCats.map((cat, idx) => {
        const isHovered = hoveredIdx === idx;
        const barBg = isHovered 
          ? (isDarkMode ? '#3b82f6' : '#1e3a8a') 
          : '#3b82f6';
        
        return (
          <div 
            key={idx} 
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 3, 
              padding: '6px 8px',
              borderRadius: 6,
              background: isHovered ? (isDarkMode ? '#334155' : '#f1f5f9') : 'transparent',
              transition: 'background 0.2s ease',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ 
                color: colors.text, 
                fontWeight: isHovered ? 700 : 600, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', 
                maxWidth: 180 
              }} title={cat.val}>
                {cat.val}
              </span>
              <span style={{ color: colors.subText, fontSize: 10 }}>
                {cat.count.toLocaleString()} values ({cat.pct.toFixed(1)}%)
              </span>
            </div>
            {/* Visual Bar */}
            <div style={{ 
              height: 8, 
              borderRadius: 4, 
              background: isDarkMode ? '#1e293b' : '#e2e8f0', 
              overflow: 'hidden',
              border: `1px solid ${colors.border}`,
              boxSizing: 'border-box'
            }}>
              <div 
                style={{ 
                  width: `${cat.pct}%`, 
                  height: '100%', 
                  background: barBg, 
                  borderRadius: 4,
                  transition: 'width 0.3s ease, background-color 0.2s ease'
                }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Collapsible Side Panel Drawer ──
const DataInsightsDrawer = ({ summary, onClose, colors, isDarkMode }) => {
  if (!summary) return null;

  const isNumeric = summary.type === 'numeric' || summary.type === 'integer';

  const fmt = (n) => {
    if (n == null) return '—';
    if (Math.abs(n) >= 1e6) return n.toExponential(2);
    if (!Number.isInteger(n) && Math.abs(n) < 1e4) return n.toFixed(3);
    return n.toLocaleString();
  };

  return (
    <div style={{
      width: 360,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: colors.cardBg,
      borderLeft: `1px solid ${colors.border}`,
      boxSizing: 'border-box',
      fontFamily: "'Inter','Segoe UI',sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: colors.toolbarBg
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow:'hidden' }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: colors.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            Data Insights: {summary.col}
          </span>
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
          title="Close drawer"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Type and overall summary */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: colors.subText, letterSpacing: '0.05em' }}>
            Column Overview
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: isDarkMode ? '#0f172a' : '#f8fafc', padding: 10, borderRadius: 8, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 10, color: colors.subText }}>Data Type</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, textTransform: 'capitalize' }}>{summary.type}</div>
            </div>
            <div style={{ background: isDarkMode ? '#0f172a' : '#f8fafc', padding: 10, borderRadius: 8, border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 10, color: colors.subText }}>Unique Values</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{summary.uniqueCount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: colors.subText, letterSpacing: '0.05em' }}>
            Completeness & Quality
          </h4>
          <div style={{ background: isDarkMode ? '#0f172a' : '#f8fafc', padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: colors.text, fontWeight: 600 }}>Valid Data</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>{summary.validCount.toLocaleString()} ({summary.validPct.toFixed(1)}%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: colors.text, fontWeight: 600 }}>Missing (NA)</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>{summary.naCount.toLocaleString()} ({summary.naPct.toFixed(1)}%)</span>
            </div>
            
            {/* Visual Bar */}
            <div style={{ height: 8, borderRadius: 4, background: isDarkMode ? '#334155' : '#e2e8f0', overflow: 'hidden', display: 'flex', marginTop: 4 }}>
              <div style={{ width: `${summary.validPct}%`, height: '100%', background: '#22c55e' }} />
              <div style={{ width: `${summary.naPct}%`, height: '100%', background: '#ef4444' }} />
            </div>
          </div>
        </div>

        {/* Quick Statistics (for Numeric) */}
        {isNumeric && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: colors.subText, letterSpacing: '0.05em' }}>
              Descriptive Statistics
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              background: isDarkMode ? '#0f172a' : '#f8fafc',
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${colors.border}`
            }}>
              {[
                { label: 'Minimum', value: fmt(summary.min) },
                { label: 'Maximum', value: fmt(summary.max) },
                { label: 'Mean', value: fmt(summary.mean) },
                { label: 'Median', value: fmt(summary.median) }
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '4px 0' }}>
                  <div style={{ fontSize: 10, color: colors.subText }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distribution profile visual chart */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: colors.subText, letterSpacing: '0.05em' }}>
            Distribution Profile
          </h4>
          
          {isNumeric || summary.type === 'datetime' ? (
            <div style={{
              background: isDarkMode ? '#0f172a' : '#f8fafc',
              padding: 16,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <InteractiveHistogram 
                histogramData={summary.histogramData} 
                minVal={summary.type === 'datetime' ? summary.minDisplay : summary.min} 
                maxVal={summary.type === 'datetime' ? summary.maxDisplay : summary.max} 
                colors={colors}
                isDarkMode={isDarkMode}
              />
            </div>
          ) : (
            <div style={{
              background: isDarkMode ? '#0f172a' : '#f8fafc',
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <InteractiveCategoricalBarChart 
                topCats={summary.topCats} 
                colors={colors} 
                isDarkMode={isDarkMode} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Column Metadata Tooltip ────────────────────────────────────────────────────
const ColMetaTooltip = ({ meta, rawRows, colors, isDarkMode, customSummary = null }) => {
  const isNumeric = meta.type === 'numeric' || meta.type === 'integer';

  const summary = useMemo(() => {
    if (customSummary) return customSummary;
    return {
      totalRows: 0,
      uniqueCount: 0,
      naCount: 0,
      validCount: 0,
      validPct: 100,
      naPct: 0,
      min: null,
      max: null,
      mean: null,
      median: null,
      topCats: [],
      histogramBins: [],
    };
  }, [meta.name, isNumeric, customSummary]);

  const totalRows = summary.totalRows;
  const naCount = summary.naCount;
  const validCount = summary.validCount ?? (summary.totalRows - summary.naCount);
  const missPct = summary.naPct !== undefined ? summary.naPct.toFixed(1) : '0.0';
  const validPct = summary.validPct !== undefined ? summary.validPct.toFixed(1) : '100.0';

  const fmt = (n) => {
    if (n == null) return '—';
    if (Math.abs(n) >= 1e6) return n.toExponential(2);
    if (!Number.isInteger(n) && Math.abs(n) < 1e4) return n.toFixed(2);
    return n.toLocaleString();
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: isNumeric ? 'auto' : 0,
      right: isNumeric ? 0 : 'auto',
      zIndex: 15000,
      marginTop: 4,
      width: 240,
      background: isDarkMode ? '#1e293b' : '#ffffff',
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
      padding: '12px 14px',
      pointerEvents: 'none',
      fontFamily: "'Inter','Segoe UI',sans-serif",
    }}>
      {/* Column title */}
      <div style={{ fontWeight: 700, fontSize: 13, color: colors.text, marginBottom: 8,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {meta.name}
      </div>

      {/* Summary Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: colors.subText }}>Total Rows:</span>
          <span style={{ fontWeight: 600, color: colors.text }}>{totalRows.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: colors.subText }}>Unique Values:</span>
          <span style={{ fontWeight: 600, color: colors.text }}>{(summary.uniqueCount ?? '—').toLocaleString()} uniq</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: colors.subText }}>Missing (NA):</span>
          <span style={{ fontWeight: 600, color: naCount > 0 ? '#ef4444' : colors.text }}>
            {naCount.toLocaleString()} missing ({missPct}%)
          </span>
        </div>
      </div>

      {/* Data quality bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ height: 6, borderRadius: 3, background: isDarkMode ? '#334155' : '#e2e8f0',
          overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${validPct}%`,
            background: parseFloat(validPct) >= 90 ? '#22c55e' : parseFloat(validPct) >= 70 ? '#f59e0b' : '#ef4444',
            borderRadius: 3,
          }} />
        </div>
      </div>

      {/* Numeric stats OR top values */}
      {isNumeric ? (
        <div>
          <div style={{ fontSize: 9, color: colors.subText, fontWeight: 600, marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descriptive Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              ['Min', fmt(summary.min)],
              ['Mean', fmt(summary.mean)],
              ['Median', fmt(summary.median)],
              ['Max', fmt(summary.max)]
            ].map(([lbl, val]) => (
              <div key={lbl} style={{
                background: isDarkMode ? '#0f172a' : '#f8fafc',
                borderRadius: 6, padding: '5px 6px',
                border: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10
              }}>
                <span style={{ color: colors.subText, fontWeight: 500 }}>{lbl}</span>
                <span style={{ fontWeight: 700, color: colors.text }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      ) : summary.topCats.length > 0 ? (
        <div>
          <div style={{ fontSize: 9, color: colors.subText, fontWeight: 600, marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top 5 Values</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, color: colors.text }}>
            <tbody>
              {summary.topCats.slice(0, 5).map(({ val, count, pct }) => (
                <tr key={val} style={{ borderBottom: `1px solid ${isDarkMode ? '#334155' : '#f1f5f9'}` }}>
                  <td style={{ padding: '4px 0', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>
                    {val}
                  </td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 600, color: colors.subText }}>
                    {count.toLocaleString()}
                  </td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700, width: 40 }}>
                    {pct.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

// ── Column Header Cell ────────────────────────────────────────────────────────
const ColHeader = React.memo(({
  meta, summary, isSorted, sortDir, sortPriority, isFiltered, showLabels,
  onSort, onOpenPanel, onOpenInsights, onResizeStart, colWidth, colors,
  isDarkMode, summary_header = true, insights = true, headerHeight,
  frozenLeftOffset, isFrozen, isAnchored, onAnchor,
  onDragStart, onDragOver, onDragEnd, onDrop, isDragOver
}) => {
  const t       = tm(meta.type);
  const btnRef  = useRef(null);
  const [hoveringName, setHoveringName] = useState(false);
  const HEADER_HEIGHT = summary_header
    ? (showLabels ? HEADER_HEIGHT_LBL : HEADER_HEIGHT_BASE)
    : (showLabels ? HEADER_HEIGHT_COMPACT_LBL : HEADER_HEIGHT_COMPACT_BASE);
  const isNumericCol = meta.type === 'numeric' || meta.type === 'integer';

  const stickyStyle = frozenLeftOffset != null ? {
    position: 'sticky',
    left: frozenLeftOffset,
    zIndex: 12
  } : {};

  const openFilterPanel = e => {
    e.stopPropagation();
    const r = btnRef.current.getBoundingClientRect();
    onOpenPanel(meta.name, { x: r.left, y: r.bottom }, 'filter');
  };

  const openSortDropdown = e => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    onOpenPanel(meta.name, { x: r.left, y: r.bottom }, 'sort', e.shiftKey);
  };

  const renderSummaryZone = () => {
    if (!summary) return null;

    // Check conditions for hiding sparklines
    const cv = (summary.stdDev != null && summary.mean) ? (summary.stdDev / Math.abs(summary.mean)) : null;
    const isConstant = summary.uniqueCount === 1;
    const isBinary = summary.uniqueCount === 2;
    const isLowVariance = cv !== null && cv < 0.1;
    const isLowCardinalityCategorical = summary.mode === 'categorical' && summary.uniqueCount < 5;

    // If constant
    if (isConstant && summary.topCats[0]) {
      return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:60, fontSize:11, color:colors.subText }}>
          <span style={{ background: isDarkMode ? '#1e293b' : '#f1f5f9', padding: '4px 8px', borderRadius: 6, border: `1px solid ${colors.border}` }}>
            🔒 Constant: <b>{String(summary.topCats[0].val)}</b>
          </span>
        </div>
      );
    }

    // If binary
    if (isBinary && summary.topCats[0] && summary.topCats[1]) {
      return (
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:60, fontSize:10, color:colors.subText, gap:4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
            <span>{String(summary.topCats[0].val)}</span>
            <span>{String(summary.topCats[1].val)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: isDarkMode ? '#334155' : '#e2e8f0', display: 'flex' }}>
            <div style={{ width: `${summary.topCats[0].pct}%`, background: '#3b82f6', height: '100%' }} />
            <div style={{ width: `${summary.topCats[1].pct}%`, background: '#10b981', height: '100%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 600, padding: '0 4px' }}>
            <span>{summary.topCats[0].pct.toFixed(0)}%</span>
            <span>{summary.topCats[1].pct.toFixed(0)}%</span>
          </div>
        </div>
      );
    }

    // If low variance
    if (isLowVariance && (summary.mode === 'numeric' || summary.mode === 'integer')) {
      return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:60, fontSize:11, color:colors.subText }}>
          <span style={{ background: isDarkMode ? '#1e293b' : '#f1f5f9', padding: '4px 8px', borderRadius: 6, border: `1px solid ${colors.border}` }} title={`CV = ${cv.toFixed(3)}`}>
            ⚖️ CV: <b>{cv.toFixed(2)}</b> (low var)
          </span>
        </div>
      );
    }

    // If low cardinality categorical
    if (isLowCardinalityCategorical) {
      const top3 = summary.topCats.slice(0, 3);
      return (
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:60, gap:4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.subText }}>
            <span>🏷️ {summary.uniqueCount} categories</span>
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {top3.map((cat, idx) => (
              <span key={idx} style={{
                fontSize: 9, background: isDarkMode ? '#1e293b' : '#f1f5f9',
                padding: '2px 6px', borderRadius: 4, border: `1px solid ${colors.border}`,
                maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }} title={`${cat.val}: ${cat.pct.toFixed(0)}%`}>
                {cat.val} ({cat.pct.toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (summary.mode === 'identifier') {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:60, gap:2 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.text }}>
            {summary.uniqueCount.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: colors.subText, textTransform: 'lowercase' }}>
            unique values
          </div>
        </div>
      );
    }

    if (summary.mode === 'numeric' || summary.mode === 'datetime') {
      return (
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', height:60, padding: '4px 0 2px 0', boxSizing:'border-box' }}>
          {/* Histogram bars */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:40, width:'100%', marginBottom:4 }}>
            {summary.histogramBins.map((pct, idx) => (
              <div key={idx} style={{
                flex:1,
                height: `${pct}%`,
                background: isDarkMode ? '#38bdf8' : '#0284c7',
                borderRadius: '1px 1px 0 0',
                minHeight: pct > 0 ? 1 : 0
              }} />
            ))}
          </div>
          {/* Range text */}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color: colors.subText }}>
            <span>{summary.minDisplay}</span>
            <span>{summary.maxDisplay}</span>
          </div>
        </div>
      );
    }

    // Categorical mode (mini horizontal stacked bar representing top 3 categories)
    const top3 = summary.topCats.slice(0, 3);
    const hasCats = top3.length > 0;
    const colorsList = isDarkMode
      ? ['#3b82f6', '#10b981', '#f59e0b', '#64748b']
      : ['#60a5fa', '#34d399', '#fbbf24', '#cbd5e1'];

    const stackedTooltip = top3.map(cat => `${cat.val}: ${cat.pct.toFixed(0)}%`).join(' • ');

    return (
      <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', height:60, gap:5, padding: '2px 0', boxSizing:'border-box' }}>
        {hasCats ? (
          <>
            <div 
              style={{ 
                display: 'flex', 
                height: 14, 
                borderRadius: 4, 
                overflow: 'hidden', 
                width: '100%', 
                background: isDarkMode ? '#1e293b' : '#f1f5f9',
                border: `1px solid ${colors.border}`,
                boxSizing: 'border-box'
              }}
              title={stackedTooltip}
            >
              {top3.map((cat, idx) => {
                const bg = colorsList[idx] || colorsList[colorsList.length - 1];
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      width: `${cat.pct}%`, 
                      height: '100%', 
                      background: bg 
                    }} 
                  />
                );
              })}
            </div>
            {/* Legend showing top 2 levels with matching color dots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
              {top3.slice(0, 2).map((cat, idx) => {
                const dotColor = colorsList[idx] || '#64748b';
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9, color: colors.subText, lineHeight: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 95 }} title={cat.val}>
                        {cat.val}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600, marginLeft: 4 }}>{cat.pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: colors.subText, fontStyle: 'italic', textAlign: 'center' }}>No categories</div>
        )}
      </div>
    );
  };

  const qualityColor = summary ? (summary.validPct >= 90 ? '#22c55e' : summary.validPct >= 70 ? '#f59e0b' : '#ef4444') : '#22c55e';
  const missingTooltip = summary ? `${summary.totalRows.toLocaleString()} values • ${summary.naCount.toLocaleString()} missing (${summary.naPct.toFixed(0)}%)` : '';

  const renderSortIndicator = () => {
    if (!isSorted) return null;
    const arrow = sortDir === 'asc' ? '↑' : '↓';
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const priorityBadge = sortPriority && sortPriority <= 9
      ? numberEmojis[sortPriority - 1]
      : sortPriority ? `[${sortPriority}]` : '';
    
    return (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          fontSize: 11,
          color: '#3b82f6',
          flexShrink: 0,
          background: isDarkMode ? '#1e3a8a' : '#dbeafe',
          padding: '2px 4px',
          borderRadius: 4,
          lineHeight: 1,
          fontWeight: 700
        }}
        title={`Sorted ${sortDir === 'asc' ? 'ascending' : 'descending'} (Priority ${sortPriority})`}
      >
        {priorityBadge} {arrow}
      </span>
    );
  };

  return (
    <div
      className="dtex-header-cell"
      draggable={true}
      onDragStart={(e) => {
        if (e.target.closest('.dtex-resize-handle') || e.target.closest('button') || e.target.closest('span[onClick]')) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", meta.name);
        onDragStart(meta.name);
        
        // Add styling for drag image snapshot
        const target = e.currentTarget;
        target.classList.add('column-drag-ghost');
        setTimeout(() => {
          target.classList.remove('column-drag-ghost');
        }, 0);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(meta.name, e);
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(meta.name);
      }}
      onClick={(e) => {
        if (e.target.closest('.dtex-resize-handle') || e.target.closest('button') || e.target.closest('span[onClick]')) {
          return;
        }
        e.stopPropagation();
        onSort(meta.name, e.shiftKey);
      }}
      style={{
        width: colWidth, flexShrink:0, height:headerHeight || HEADER_HEIGHT,
        padding:'5px 8px 8px 10px', display:'flex', flexDirection:'column',
        justifyContent:'space-between', cursor:'grab', userSelect:'none',
        borderRight: isAnchored ? '3px solid #3b82f6' : `1px solid ${colors.border}`, boxSizing:'border-box',
        background: isSorted ? colors.headerActiveBg : isFiltered ? (isDarkMode ? '#064e3b' : '#f0fdf4') : colors.headerBg,
        position: 'relative',
        boxShadow: isDragOver ? 'inset 4px 0 0 #3b82f6, 0 0 8px rgba(59, 130, 246, 0.4)' : undefined,
        ...stickyStyle,
      }}
    >
      {/* Row 1: type icon + column name + info icon + insights icon + sort indicator */}
      <div style={{ display:'flex', alignItems:'center', gap:4, flexDirection: isNumericCol ? 'row-reverse' : 'row' }}>
        <span style={{ fontSize:10, color:t.text, fontWeight:700,
          background:t.bg, borderRadius:3, padding:'0 4px', flexShrink:0 }}>{t.icon}</span>
        
        {/* Hoverable Name with i Icon */}
        <div
          onMouseEnter={e => { e.stopPropagation(); if (summary_header) setHoveringName(true); }}
          onMouseLeave={() => setHoveringName(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flex: 1,
            overflow: 'hidden',
            justifyContent: isNumericCol ? 'flex-end' : 'flex-start',
            cursor: summary_header ? 'help' : 'pointer',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderBottom: (summary_header && hoveringName) ? `1px dashed ${colors.subText}` : '1px solid transparent',
            }}
          >
            {meta.name}
          </span>
          {summary_header && (
            <span style={{ fontSize: 10, color: hoveringName ? '#3b82f6' : colors.subText, flexShrink: 0 }}>
              ⓘ
            </span>
          )}
        </div>
        
        {renderSortIndicator()}
        
        {/* Insights button */}
        {insights && summary_header && (
          <button
            onClick={e => {
              e.stopPropagation(); // prevent sort
              onOpenInsights(meta.name);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 11,
              padding: '2px',
              borderRadius: 4,
              color: colors.subText,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Open Data Insights Drawer"
            onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.color = colors.subText}
          >
            📊
          </button>
        )}

        {/* Anchor/Freeze button */}
        <button
          onClick={e => {
            e.stopPropagation();
            onAnchor(meta.name);
          }}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px',
            borderRadius: 4,
            color: isFrozen ? '#3b82f6' : colors.subText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title={isAnchored ? "Unanchor column" : isFrozen ? "Frozen (anchored to the right)" : "Anchor column (freeze left)"}
          onMouseEnter={e => { if (!isFrozen) e.currentTarget.style.color = '#3b82f6'; }}
          onMouseLeave={e => { if (!isFrozen) e.currentTarget.style.color = colors.subText; }}
        >
          ⚓
        </button>

        {/* Filter button (inline in Row 1 only when compact/minimal view) */}
        {!summary_header && (
          <button
            ref={btnRef}
            onClick={openFilterPanel}
            title="Filter Menu"
            style={{
              border: 'none',
              background: isFiltered ? '#3b82f6' : 'transparent',
              color: isFiltered ? '#fff' : colors.subText,
              cursor: 'pointer',
              fontSize: 11,
              padding: '2px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            onMouseEnter={e => { if (!isFiltered) e.currentTarget.style.color = '#3b82f6'; }}
            onMouseLeave={e => { if (!isFiltered) e.currentTarget.style.color = colors.subText; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </button>
        )}
      </div>

      {/* Row 2 (label): shown only when showLabels=true and label exists */}
      {showLabels && meta.label && (
        <div style={{
          fontSize:10, color:'#7c3aed', fontStyle:'italic',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          lineHeight:'13px',
          background:'#f5f3ff', borderRadius:3, padding:'1px 4px',
          textAlign: isNumericCol ? 'right' : 'left',
        }} title={meta.label}>
          {meta.label}
        </div>
      )}

      {/* Summary Micro-Dashboard Zone */}
      {summary_header && renderSummaryZone()}

      {/* Thin data-quality bar at the bottom with explicit tooltip */}
      {summary_header && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 4,
            background: isDarkMode ? '#475569' : '#cbd5e1',
            overflow: 'hidden',
            display: 'flex'
          }} 
          title={missingTooltip}
        >
          <div style={{
            width: `${summary ? summary.validPct : 100}%`,
            height: '100%',
            background: '#22c55e'
          }} />
        </div>
      )}

      {/* Metadata tooltip on column name hover */}
      {hoveringName && summary_header && summary && (
        <ColMetaTooltip meta={meta} rawRows={[]} colors={colors} isDarkMode={isDarkMode} customSummary={summary} />
      )}

      {/* Absolute Filter Menu button (detailed view only, aligned with summary zone at bottom) */}
      {summary_header && (
        <button
          ref={btnRef}
          onClick={openFilterPanel}
          title="Filter Menu"
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            width: 20,
            height: 20,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isFiltered ? '#3b82f6' : 'transparent',
            color: isFiltered ? '#fff' : colors.subText,
            zIndex: 5
          }}
          onMouseEnter={e => { if (!isFiltered) e.currentTarget.style.color = '#3b82f6'; }}
          onMouseLeave={e => { if (!isFiltered) e.currentTarget.style.color = colors.subText; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
        </button>
      )}

      {/* Drag-to-resize handle */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(meta.name, e);
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 5,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 15,
          background: 'transparent'
        }}
        className="dtex-resize-handle"
      />
    </div>
  );
});

// Helper to decode Base64 to Uint8Array buffer for Arrow IPC decoding
const base64ToUint8Array = (base64) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper to evaluate a row against a list of Advanced Query rules
const evaluateRow = (row, rules, logical) => {
  if (!rules || rules.length === 0) return true;

  const ruleEvaluations = rules.map(rule => {
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

  if (logical === 'AND') {
    return ruleEvaluations.every(res => res);
  } else {
    return ruleEvaluations.some(res => res);
  }
};

// ── Main Component ────────────────────────────────────────────────────────────
const DTSmartRComponent = ({ data, arrow_payload, metadata, datasetName = 'df', options = {} }) => {
  const {
    advanced_filter = true,
    show_labels     = true,
    column_picker   = true,
    allow_export    = true,
    theme           = 'auto',
    na_string       = 'NA',
    hidden_columns  = [],
    header_summary  = true,
    header_density  = 'auto',
    row_density     = 'standard'
  } = options;

  const [showRCodeModal,   setShowRCodeModal]   = useState(false);
  const [sortState,        setSortState]        = useState([]); // [{ id, desc }]
  const [colWidths,        setColWidths]        = useState({}); // { colName: width }
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
  const [columnOrder,      setColumnOrder]      = useState([]);
  const [frozenColId,      setFrozenColId]      = useState(null);
  const [draggedColId,     setDraggedColId]     = useState(null);
  const [dragOverColId,    setDragOverColId]    = useState(null);
  const [draftQueryRules,  setDraftQueryRules]  = useState([]);     // rules being edited in panel
  const [headerDensity,    setHeaderDensity]    = useState(() => localStorage.getItem('dtsmartr-header-density') || header_density);
  const [rowDensity,       setRowDensity]       = useState(() => localStorage.getItem('dtsmartr-row-density') || row_density);
  const [showShortcuts,    setShowShortcuts]    = useState(false);  // keyboard cheatsheet overlay
  const [showFilterTip,    setShowFilterTip]    = useState(() => !localStorage.getItem('dtsmartr-hint-filter-dismissed'));
  const [showSortTip,      setShowSortTip]      = useState(() => !localStorage.getItem('dtsmartr-hint-sort-dismissed'));
  const wrapRef = useRef(null);

  const getColWidth = useCallback((colName) => colWidths[colName] || COL_WIDTH, [colWidths]);

  const resizingRef = useRef(null);

  const ROW_HEIGHT = rowDensity === 'compact' ? 24 : rowDensity === 'comfortable' ? 40 : 32;

  const handleHeaderDensityChange = useCallback((mode) => {
    setHeaderDensity(mode);
    localStorage.setItem('dtsmartr-header-density', mode);
  }, []);

  const handleRowDensityChange = useCallback((mode) => {
    setRowDensity(mode);
    localStorage.setItem('dtsmartr-row-density', mode);
  }, []);

  const handleResizeStart = useCallback((colName, e) => {
    resizingRef.current = {
      colName,
      startX: e.clientX,
      startWidth: colWidths[colName] || COL_WIDTH
    };
    const handleMouseMove = (ev) => {
      if (!resizingRef.current) return;
      const { colName: name, startX, startWidth } = resizingRef.current;
      const newWidth = Math.max(50, startWidth + (ev.clientX - startX));
      setColWidths(prev => ({ ...prev, [name]: newWidth }));
    };
    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [colWidths]);

  const [showInsights,     setShowInsights]     = useState(false);
  const [activeInsightCol, setActiveInsightCol] = useState(null);

  const handleOpenInsights = useCallback((col) => {
    setActiveInsightCol(col);
    setShowInsights(true);
  }, []);

  // Raw rows from R column-oriented format or Arrow IPC payload
  const rawRows = useMemo(() => {
    if (arrow_payload) {
      try {
        const buffer = base64ToUint8Array(arrow_payload);
        const table = tableFromIPC(buffer);
        const columns = table.schema.fields.map(f => f.name);
        const n = table.numRows;
        const rows = [];
        
        // Contiguous column vector references for fast lookups
        const vectors = columns.map(col => table.getChild(col));
        
        for (let i = 0; i < n; i++) {
          const row = {};
          for (let j = 0; j < columns.length; j++) {
            row[columns[j]] = vectors[j].get(i);
          }
          rows.push(row);
        }
        return rows;
      } catch (err) {
        console.error("Failed to parse Arrow IPC payload, falling back to data:", err);
      }
    }

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
  }, [data, arrow_payload]);

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

  // Precalculated summaries for all columns in this dataset (Kaggle-style)
  const colSummaries = useMemo(() => {
    const summaries = {};
    const totalRows = rawRows.length;

    (metadata || []).forEach(meta => {
      const col = meta.name;
      const type = meta.type;
      const isNum = type === 'numeric' || type === 'integer';

      let validCount = 0;
      let naCount = 0;
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let values = [];
      const freq = {};

      for (let i = 0; i < totalRows; i++) {
        const v = rawRows[i]?.[col];
        if (v == null) {
          naCount++;
        } else {
          validCount++;
          if (isNum) {
            const n = Number(v);
            if (!isNaN(n)) {
              if (n < min) min = n;
              if (n > max) max = n;
              sum += n;
            }
          } else {
            const s = String(v);
            freq[s] = (freq[s] || 0) + 1;
          }
          values.push(v);
        }
      }

      const uniqueCount = meta.unique_values ?? (uniqueVals[col] ? uniqueVals[col].length : 0);
      const validPct = totalRows > 0 ? ((validCount / totalRows) * 100) : 100;
      const naPct = totalRows > 0 ? ((naCount / totalRows) * 100) : 0;

      // Calculate Median & Standard Deviation for numeric
      let median = null;
      let stdDev = null;
      if (isNum && validCount > 0) {
        const sortedNums = values.map(Number).filter(v => !isNaN(v)).sort((a, b) => a - b);
        if (sortedNums.length > 0) {
          const mid = Math.floor(sortedNums.length / 2);
          median = sortedNums.length % 2 !== 0 ? sortedNums[mid] : (sortedNums[mid - 1] + sortedNums[mid]) / 2;
        }
        if (validCount > 1) {
          const meanVal = sum / validCount;
          const squaredDiffs = values.map(Number).filter(v => !isNaN(v)).map(v => (v - meanVal) ** 2);
          const sumSquaredDiffs = squaredDiffs.reduce((a, b) => a + b, 0);
          stdDev = Math.sqrt(sumSquaredDiffs / (validCount - 1));
        } else {
          stdDev = 0;
        }
      }

      // Check if it's in identifier mode
      const isIdentifier = uniqueCount === totalRows || (uniqueCount > 0.8 * totalRows && !isNum);

      let mode = 'categorical';
      if (isIdentifier) {
        mode = 'identifier';
      } else if (isNum) {
        mode = 'numeric';
      } else if (type === 'datetime') {
        mode = 'datetime';
      }

      // Calculate detailed top categories list (up to 10)
      let topCats = [];
      const sortedFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      topCats = sortedFreq.slice(0, 10).map(([val, count]) => ({
        val,
        count,
        pct: totalRows > 0 ? ((count / totalRows) * 100) : 0
      }));

      // Calculate histogram for numeric and datetime
      let histogramBins = [];
      let histogramData = [];
      let minDisplay = '';
      let maxDisplay = '';

      if (isNum && validCount > 0) {
        const binCount = 12;
        const range = max - min;
        const binSize = range > 0 ? range / binCount : 1;
        const bins = Array(binCount).fill(0);

        for (let i = 0; i < values.length; i++) {
          const v = Number(values[i]);
          if (isNaN(v)) continue;
          let binIdx = range > 0 ? Math.floor((v - min) / binSize) : 0;
          if (binIdx >= binCount) binIdx = binCount - 1;
          if (binIdx < 0) binIdx = 0;
          bins[binIdx]++;
        }

        const maxBin = Math.max(...bins, 1);
        histogramBins = bins.map(cnt => (cnt / maxBin) * 100);
        
        // Calculate detailed histogram data for interactive SVG chart
        histogramData = bins.map((cnt, idx) => {
          const rMin = min + idx * binSize;
          const rMax = min + (idx + 1) * binSize;
          return {
            idx,
            count: cnt,
            pct: (cnt / validCount) * 100,
            rangeMin: rMin,
            rangeMax: rMax,
          };
        });

        // Format min/max display
        const fmt = (val) => {
          if (Number.isInteger(val)) return val.toLocaleString();
          return val.toFixed(1);
        };
        minDisplay = fmt(min);
        maxDisplay = fmt(max);
      } else if (type === 'datetime' && validCount > 0) {
        const timestamps = values.map(v => new Date(v).getTime()).filter(t => !isNaN(t));
        if (timestamps.length > 0) {
          const tMin = Math.min(...timestamps);
          const tMax = Math.max(...timestamps);
          const binCount = 12;
          const range = tMax - tMin;
          const binSize = range > 0 ? range / binCount : 1;
          const bins = Array(binCount).fill(0);

          for (let i = 0; i < timestamps.length; i++) {
            let binIdx = range > 0 ? Math.floor((timestamps[i] - tMin) / binSize) : 0;
            if (binIdx >= binCount) binIdx = binCount - 1;
            if (binIdx < 0) binIdx = 0;
            bins[binIdx]++;
          }

          const maxBin = Math.max(...bins, 1);
          histogramBins = bins.map(cnt => (cnt / maxBin) * 100);

          histogramData = bins.map((cnt, idx) => {
            const rMin = tMin + idx * binSize;
            const rMax = tMin + (idx + 1) * binSize;
            return {
              idx,
              count: cnt,
              pct: (cnt / validCount) * 100,
              rangeMin: new Date(rMin).toISOString(),
              rangeMax: new Date(rMax).toISOString(),
            };
          });

          const fmtDate = (ts) => {
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          };
          minDisplay = fmtDate(tMin);
          maxDisplay = fmtDate(tMax);
        }
      }

      summaries[col] = {
        col,
        type,
        mode,
        totalRows,
        validCount,
        naCount,
        validPct,
        naPct,
        uniqueCount,
        min: validCount > 0 && isNum ? min : null,
        max: validCount > 0 && isNum ? max : null,
        mean: validCount > 0 && isNum ? (sum / validCount) : null,
        median: validCount > 0 && isNum ? median : null,
        stdDev,
        topCats,
        histogramBins,
        histogramData,
        minDisplay,
        maxDisplay,
      };
    });

    return summaries;
  }, [rawRows, metadata, uniqueVals]);

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

  // Synchronize columnOrder when metadata loads
  useEffect(() => {
    if (metadata) {
      setColumnOrder(metadata.map(m => m.name));
    }
  }, [metadata]);

  // Synchronize draft rules when Query Builder opens or queryRules changes
  useEffect(() => {
    if (showQueryBuilder) {
      setDraftQueryRules(queryRules);
    }
  }, [showQueryBuilder, queryRules]);

  // Keyboard Shortcuts Event Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If focused inside input fields, don't run global shortcuts
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'SELECT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // '?' key
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // Ctrl+F or Meta+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowQueryBuilder(prev => !prev);
      }

      // Ctrl+Shift+F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFilters({});
        setQueryRules([]);
        setDraftQueryRules([]);
      }

      // Ctrl+Shift+[
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '{') {
        e.preventDefault();
        handleRowDensityChange('compact');
      }

      // Ctrl+Shift+]
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '}') {
        e.preventDefault();
        handleRowDensityChange('comfortable');
      }

      // Ctrl+Shift+0
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ')') {
        e.preventDefault();
        handleRowDensityChange('standard');
      }

      // Escape key to close modals
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setPopup(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRowDensityChange]);

  // Reorder and filter columns
  const cols = useMemo(() => {
    const metaMap = {};
    for (const m of (metadata || [])) {
      metaMap[m.name] = m;
    }
    const order = columnOrder.length > 0 ? columnOrder : (metadata || []).map(m => m.name);
    const result = [];
    for (const name of order) {
      const meta = metaMap[name];
      if (meta && (visible ? visible.has(name) : true)) {
        result.push(meta);
      }
    }
    // Append any columns in metadata not in order (sanity fallback)
    for (const m of (metadata || [])) {
      if (!order.includes(m.name) && (visible ? visible.has(m.name) : true)) {
        result.push(m);
      }
    }
    return result;
  }, [metadata, visible, columnOrder]);

  // Cumulative offset mapping for frozen/sticky columns
  const frozenColIndices = useMemo(() => {
    if (!frozenColId) return {};
    const idx = cols.findIndex(c => c.name === frozenColId);
    if (idx === -1) return {};

    const offsets = {};
    let currentLeft = ROW_NUM_W;
    for (let i = 0; i <= idx; i++) {
      offsets[cols[i].name] = currentLeft;
      currentLeft += getColWidth(cols[i].name);
    }
    return offsets;
  }, [cols, frozenColId, colWidths]);

  // Drag and Drop reordering handlers
  const handleDragStart = useCallback((colId) => {
    setDraggedColId(colId);
  }, []);

  const handleDragOver = useCallback((colId, e) => {
    e.preventDefault();
    setDragOverColId(colId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedColId(null);
    setDragOverColId(null);
  }, []);

  const handleDrop = useCallback((targetColId) => {
    if (!draggedColId || draggedColId === targetColId) return;

    setColumnOrder(prev => {
      const list = prev.length > 0 ? [...prev] : (metadata || []).map(m => m.name);
      const draggedIdx = list.indexOf(draggedColId);
      const targetIdx = list.indexOf(targetColId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;

      const next = [...list];
      next.splice(draggedIdx, 1);
      next.splice(targetIdx, 0, draggedColId);
      return next;
    });

    setDraggedColId(null);
    setDragOverColId(null);
  }, [draggedColId, metadata]);

  const handleAnchorToggle = useCallback((colId) => {
    setFrozenColId(prev => prev === colId ? null : colId);
  }, []);



  // Filter 1: Column-level quick filters only
  const quickFilteredRows = useMemo(() => {
    const activeQuick = Object.entries(filters).filter(([,v]) =>
      v != null && (Array.isArray(v) ? v.length>0 : v!==''));

    if (!activeQuick.length) return rawRows;

    return rawRows.filter(row => {
      return activeQuick.every(([col, val]) => {
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
    });
  }, [rawRows, filters]);

  // Filter 2: Apply committed queryRules on top of quickFilteredRows
  const filteredRows = useMemo(() => {
    const hasRules = queryRules && queryRules.length > 0;
    if (!hasRules) return quickFilteredRows;
    return quickFilteredRows.filter(row => evaluateRow(row, queryRules, queryLogical));
  }, [quickFilteredRows, queryRules, queryLogical]);

  // Preview highlighting matching set (based on draft rules)
  const draftMatchingRows = useMemo(() => {
    if (!showQueryBuilder || draftQueryRules.length === 0) return new Set();
    const matched = new Set();
    quickFilteredRows.forEach((row) => {
      if (evaluateRow(row, draftQueryRules, queryLogical)) {
        matched.add(row);
      }
    });
    return matched;
  }, [quickFilteredRows, draftQueryRules, queryLogical, showQueryBuilder]);

  // Preview matching row count (based on draft rules)
  const draftMatchCount = useMemo(() => {
    if (!showQueryBuilder) return 0;
    if (draftQueryRules.length === 0) return quickFilteredRows.length;
    return quickFilteredRows.filter(row => evaluateRow(row, draftQueryRules, queryLogical)).length;
  }, [quickFilteredRows, draftQueryRules, queryLogical, showQueryBuilder]);

  // Sort
  const rows = useMemo(() => {
    if (!sortState || sortState.length === 0) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      for (const item of sortState) {
        const col = item.id;
        const desc = item.desc;
        const av = a[col], bv = b[col];
        if (av == null && bv == null) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        
        let cmp = 0;
        if (typeof av === 'number' && typeof bv === 'number') {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }
        
        if (cmp !== 0) {
          return desc ? -cmp : cmp;
        }
      }
      return 0;
    });
  }, [filteredRows, sortState]);

  const handleSort = useCallback((col, shiftKey, explicitDir) => {
    setSortState(prev => {
      const idx = prev.findIndex(item => item.id === col);

      if (explicitDir === 'clear') {
        if (idx > -1) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      }

      const desc = explicitDir ? (explicitDir === 'desc') : false;

      if (shiftKey) {
        if (idx > -1) {
          const next = [...prev];
          if (explicitDir) {
            next[idx] = { id: col, desc };
          } else {
            if (next[idx].desc === false) {
              next[idx] = { id: col, desc: true };
            } else {
              next.splice(idx, 1);
            }
          }
          return next;
        } else {
          return [...prev, { id: col, desc }];
        }
      } else {
        if (explicitDir) {
          return [{ id: col, desc }];
        } else {
          if (prev.length === 1 && prev[0].id === col) {
            if (prev[0].desc === false) {
              return [{ id: col, desc: true }];
            } else {
              return [];
            }
          } else {
            return [{ id: col, desc: false }];
          }
        }
      }
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

  // Virtualisation — header height depends on label visibility, header_summary, and chosen density mode
  const HEADER_HEIGHT = useMemo(() => {
    const isDetailed = headerDensity === 'detailed' || (headerDensity === 'auto' && wrapH >= 600);
    const isCompact = headerDensity === 'auto' && wrapH < 600;
    const isMinimal = headerDensity === 'minimal';
    
    if (isMinimal) {
      return (showLabels && hasAnyLabel) ? 48 : 32;
    }
    if (isCompact) {
      return (showLabels && hasAnyLabel) ? 68 : 48;
    }
    return (showLabels && hasAnyLabel) ? HEADER_HEIGHT_LBL : HEADER_HEIGHT_BASE;
  }, [headerDensity, wrapH, showLabels, hasAnyLabel]);
  const bodyH       = wrapH - HEADER_HEIGHT;
  const startIdx    = Math.max(0, Math.floor(scrollTop/ROW_HEIGHT) - OVERSCAN);
  const endIdx      = Math.min(rows.length, Math.ceil((scrollTop+bodyH)/ROW_HEIGHT) + OVERSCAN);
  const visibleRows = rows.slice(startIdx, endIdx);
  const tableW      = ROW_NUM_W + cols.reduce((sum, col) => sum + getColWidth(col.name), 0);

  const popupMeta = popup ? (metadata||[]).find(c=>c.name===popup.col) : null;

  if (!metadata || (!data && !arrow_payload)) return <div style={{padding:20,color:'#94a3b8'}}>No data</div>;

  const containerStyle = {
    height: '100%', display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    fontSize: 13, background: colors.bg, color: colors.text,
    border: `1px solid ${colors.border}`, boxSizing: 'border-box',
  };

  const outerStyle = {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box'
  };

  return (
    <div style={outerStyle}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={containerStyle}>
          <style>{`
            .dtex-row:hover { background-color: ${isDarkMode ? '#334155' : '#f1f5f9'} !important; }
            .dtex-row:hover .dtex-rownum { background-color: ${isDarkMode ? '#334155' : '#f1f5f9'} !important; }
            .dtex-header-cell:hover { background-color: ${isDarkMode ? '#334155' : '#f1f5f9'} !important; }
            .dtex-resize-handle:hover { background-color: #3b82f6 !important; }
          `}</style>

          {/* ── Toolbar ── */}
          <div style={{ flexShrink:0, padding:'8px 14px', borderBottom:`1px solid ${colors.border}`,
            background:colors.toolbarBg, display:'flex', alignItems:'center', gap:12 }}>
            {datasetName && (
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: 6, borderRight: `1px solid ${colors.border}`, paddingRight: 12 }}>
                📁 {datasetName}
              </span>
            )}
            {/* Stats */}
            <span style={{ color:colors.subText, fontSize:12 }}>
              <b style={{color:colors.text}}>{rows.length}</b>
              {rows.length!==rawRows.length && <> / {rawRows.length}</>} rows ·{' '}
              <b style={{color:colors.text}}>{cols.length}</b>
              {cols.length!==(metadata||[]).length && <> / {(metadata||[]).length}</>} columns
            </span>
            {sortState.length > 0 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {sortState.map((item, idx) => (
                  <span key={item.id} style={{ fontSize:11, color:colors.text, background:isDarkMode ? '#334155' : '#e2e8f0',
                    padding:'2px 8px', borderRadius:10, display: 'flex', alignItems: 'center', gap: 3 }}>
                    ↕ {item.id} {item.desc ? 'desc' : 'asc'}
                    <span style={{ fontSize: 9, opacity: 0.7 }}>({idx + 1})</span>
                  </span>
                ))}
                <button onClick={() => setSortState([])} style={{ fontSize:11, padding:'2px 6px', border:'none', background:'transparent', color:'#ef4444', cursor: 'pointer', textDecoration: 'underline' }}>
                  Clear sort
                </button>
              </div>
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

              {/* Header Density Button Group */}
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden', padding: 2, background: colors.toolbarBg }}>
                <button
                  onClick={() => handleHeaderDensityChange('minimal')}
                  title="Minimal headers (32px)"
                  style={{
                    border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    background: headerDensity === 'minimal' ? '#3b82f6' : 'transparent',
                    color: headerDensity === 'minimal' ? '#fff' : colors.text,
                    fontWeight: headerDensity === 'minimal' ? 600 : 400
                  }}
                >
                  ≡ Min
                </button>
                <button
                  onClick={() => handleHeaderDensityChange('auto')}
                  title="Auto responsive headers"
                  style={{
                    border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    background: headerDensity === 'auto' ? '#3b82f6' : 'transparent',
                    color: headerDensity === 'auto' ? '#fff' : colors.text,
                    fontWeight: headerDensity === 'auto' ? 600 : 400
                  }}
                >
                  ≡ Auto
                </button>
                <button
                  onClick={() => handleHeaderDensityChange('detailed')}
                  title="Detailed headers (125px)"
                  style={{
                    border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    background: headerDensity === 'detailed' ? '#3b82f6' : 'transparent',
                    color: headerDensity === 'detailed' ? '#fff' : colors.text,
                    fontWeight: headerDensity === 'detailed' ? 600 : 400
                  }}
                >
                  ≡ Detail
                </button>
              </div>

              {/* Row Density Button Group */}
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden', padding: 2, background: colors.toolbarBg }}>
                <button
                  onClick={() => handleRowDensityChange('compact')}
                  title="Compact rows (24px) [Ctrl+Shift+[]"
                  style={{
                    border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    background: rowDensity === 'compact' ? '#3b82f6' : 'transparent',
                    color: rowDensity === 'compact' ? '#fff' : colors.text,
                    fontWeight: rowDensity === 'compact' ? 600 : 400
                  }}
                >
                  Compact
                </button>
                <button
                  onClick={() => handleRowDensityChange('standard')}
                  title="Standard rows (32px) [Ctrl+Shift+0]"
                  style={{
                    border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    background: rowDensity === 'standard' ? '#3b82f6' : 'transparent',
                    color: rowDensity === 'standard' ? '#fff' : colors.text,
                    fontWeight: rowDensity === 'standard' ? 600 : 400
                  }}
                >
                  Standard
                </button>
                <button
                  onClick={() => handleRowDensityChange('comfortable')}
                  title="Comfortable rows (40px) [Ctrl+Shift+]]"
                  style={{
                    border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    background: rowDensity === 'comfortable' ? '#3b82f6' : 'transparent',
                    color: rowDensity === 'comfortable' ? '#fff' : colors.text,
                    fontWeight: rowDensity === 'comfortable' ? 600 : 400
                  }}
                >
                  Comfort
                </button>
              </div>

            {/* Label toggle — only shown when dataset has labelled columns */}
            {hasAnyLabel && (
              <button onClick={() => setShowLabels(v => !v)}
                title={showLabels ? 'Hide column labels' : 'Show column labels'}
                style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  width:32, height:32, padding:0, border:`1px solid ${colors.border}`, borderRadius:8,
                  background: showLabels ? (isDarkMode ? '#2e1065' : '#f5f3ff') : colors.btnBg,
                  color: showLabels ? '#7c3aed' : colors.text,
                  cursor:'pointer',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                  borderColor: showLabels ? '#c4b5fd' : colors.border }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              </button>
            )}

            {/* Advanced Filter button */}
            {advanced_filter && (
              <button onClick={() => setShowQueryBuilder(v => !v)} style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:32, height:32, padding:0, position:'relative', border:`1px solid ${colors.border}`, borderRadius:8,
                background: showQueryBuilder ? (isDarkMode ? '#1e3a8a' : '#eff6ff') : colors.btnBg,
                color: showQueryBuilder ? (isDarkMode ? '#3b82f6' : '#2563eb') : colors.text,
                borderColor: showQueryBuilder ? (isDarkMode ? '#3b82f6' : '#bfdbfe') : colors.border,
                cursor:'pointer',
                boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
              }} title="Advanced Filter (Ctrl + F)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                {queryRules.length > 0 && (
                  <span style={{
                    position:'absolute', top:-4, right:-4, fontSize:9, background:'#2563eb', color:'#fff',
                    borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:600
                  }}>
                    {queryRules.length}
                  </span>
                )}
              </button>
            )}

            {/* Query Code Button */}
            {allow_export && (
              <button onClick={() => setShowRCodeModal(true)} style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:32, height:32, padding:0, border:`1px solid ${colors.border}`, borderRadius:8,
                background:colors.btnBg, color:colors.text,
                cursor:'pointer',
                boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
              }} title="Query Code (Show R/SQL/DuckDB code)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              </button>
            )}

            {/* Column visibility toggle */}
            {column_picker && (
              <div style={{ position:'relative' }}>
                <button onClick={()=>setShowColVis(v=>!v)} style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width:32, height:32, padding:0, position:'relative', border:`1px solid ${colors.border}`, borderRadius:8,
                  background: showColVis ? colors.text : colors.btnBg,
                  color: showColVis ? colors.bg : colors.text,
                  cursor:'pointer',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                }} title="Columns Show/Hide">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                  {visible && visible.size < (metadata||[]).length && (
                    <span style={{
                      position:'absolute', top:-4, right:-4, fontSize:9, background:'#ef4444', color:'#fff',
                      borderRadius:'50%', width:14, height:14, display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:600
                    }}>
                      {(metadata||[]).length - visible.size}
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

          {/* ── Main content area with side panel ── */}
          <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>
            {/* Left: Scrollable grid container */}
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
                <div style={{ position:'sticky', left:0, zIndex:13,
                  width:ROW_NUM_W, flexShrink:0, height:HEADER_HEIGHT,
                  background:colors.headerBg, borderRight:`1px solid ${colors.border}`, boxSizing: 'border-box',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:colors.subText, fontSize:10 }}>#</div>
                {cols.map(meta => {
                  const sortIdx = sortState.findIndex(item => item.id === meta.name);
                  const isSorted = sortIdx > -1;
                  const sortDirVal = isSorted ? (sortState[sortIdx].desc ? 'desc' : 'asc') : null;
                  const sortPriority = isSorted ? sortIdx + 1 : null;
                  
                  return (
                    <ColHeader key={meta.name} meta={meta}
                      summary={colSummaries[meta.name]}
                      isSorted={isSorted}
                      sortDir={sortDirVal}
                      sortPriority={sortPriority}
                      showLabels={showLabels && hasAnyLabel}
                      isFiltered={!!(filters[meta.name] &&
                        (Array.isArray(filters[meta.name]) ? filters[meta.name].length>0 : filters[meta.name]!==''))}
                      onSort={handleSort}
                      onOpenPanel={(col,pos,type) => setPopup(p=>p&&p.col===col&&p.type===type?null:{col,position:pos,type})}
                      onOpenInsights={handleOpenInsights}
                      onResizeStart={handleResizeStart}
                      colWidth={getColWidth(meta.name)}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      summary_header={headerDensity === 'detailed' || (headerDensity === 'auto' && wrapH >= 600)}
                      insights={headerDensity === 'detailed' || (headerDensity === 'auto' && wrapH >= 600)}
                      headerHeight={HEADER_HEIGHT}
                      frozenLeftOffset={frozenColIndices[meta.name]}
                      isFrozen={frozenColIndices[meta.name] != null}
                      isAnchored={frozenColId === meta.name}
                      onAnchor={handleAnchorToggle}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      isDragOver={dragOverColId === meta.name}
                    />
                  );
                })}
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
                      const isMatch = draftMatchingRows.has(row);
                      const stripe = isPinned
                        ? (isDarkMode ? '#78350f' : '#fef9c3')  // gold-tinted pinned background
                        : isMatch
                          ? (isDarkMode ? 'rgba(234, 179, 8, 0.15)' : 'rgba(254, 240, 138, 0.35)') // highlight matching rows in yellow
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
                            display:'flex', minHeight:ROW_HEIGHT, height:'auto',
                            alignItems:'stretch', borderBottom:`1px solid ${colors.border}`,
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
                              position:'sticky', left:0, zIndex:3,
                              width:ROW_NUM_W, flexShrink:0, height:'100%',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              gap: 2,
                              color: isPinned ? '#f59e0b' : colors.subText,
                              fontWeight: isPinned ? 700 : 400,
                              borderRight:`1px solid ${colors.border}`,
                              borderLeft: isMatch ? '3px solid #eab308' : undefined, // matching row border
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
                            const isFrozen = frozenColIndices[meta.name] != null;
                            const isNA = cellVal == null;
                            const cellBg = isNA
                              ? (isDarkMode
                                  ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239, 68, 68, 0.05) 4px, rgba(239, 68, 68, 0.05) 8px)'
                                  : 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239, 68, 68, 0.03) 4px, rgba(239, 68, 68, 0.03) 8px)')
                              : undefined;

                            const frozenStyle = isFrozen ? {
                              position: 'sticky',
                              left: frozenColIndices[meta.name],
                              zIndex: 2,
                              background: cellBg || stripe,
                            } : {
                              background: cellBg || undefined
                            };
                            
                            return (
                              <div key={meta.name} style={{
                                width: getColWidth(meta.name), flexShrink:0,
                                padding: rowDensity === 'compact' ? '2px 8px' : rowDensity === 'comfortable' ? '10px 12px' : '6px 10px',
                                borderRight: meta.name === frozenColId ? '3px solid #3b82f6' : `1px solid ${colors.border}`, color:colors.text,
                                fontVariantNumeric:'tabular-nums', height:'100%',
                                display:'flex', alignItems:'center', boxSizing: 'border-box',
                                justifyContent: isNumericCol ? 'flex-end' : 'flex-start',
                                fontFamily: isNumericCol ? "'Fira Code', 'Consolas', monospace" : 'inherit',
                                fontSize: isNumericCol ? (rowDensity === 'compact' ? 11 : 12) : (rowDensity === 'compact' ? 12 : 13),
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                lineHeight: '1.4',
                                ...frozenStyle,
                              }} title={cellVal!=null?String(cellVal):'NA'}>
                                {cellVal != null
                                  ? String(cellVal)
                                  : <span style={{color:isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 500, fontStyle:'italic'}}>{na_string}</span>}
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

            {/* Right: Collapsible Filter Panel */}
            {showQueryBuilder && (
              <div style={{
                width: 350,
                borderLeft: `1px solid ${colors.border}`,
                background: colors.toolbarBg,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxSizing: 'border-box',
                zIndex: 20
              }}>
                {/* Panel Header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: colors.headerBg
                }}>
                  <h3 style={{ margin: 0, fontSize: 14, color: colors.text, fontWeight: 600 }}>🔍 Advanced Filter</h3>
                  <button 
                    onClick={() => setShowQueryBuilder(false)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: colors.subText, fontSize: 16
                    }}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Panel Content: Scrollable QueryBuilder */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  {showFilterTip && (
                    <div style={{
                      background: isDarkMode ? '#1e293b' : '#eff6ff',
                      border: `1px solid ${isDarkMode ? '#3b82f6' : '#bfdbfe'}`,
                      padding: '8px 12px', borderRadius: 6, fontSize: 11, color: colors.text,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12
                    }}>
                      <span>💡 Tip: Press Ctrl+F to quickly toggle this filter panel.</span>
                      <button
                        onClick={() => {
                          setShowFilterTip(false);
                          localStorage.setItem('dtsmartr-hint-filter-dismissed', 'true');
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.subText, fontWeight: 700 }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  <QueryBuilder
                    metadata={metadata || []}
                    rules={draftQueryRules}
                    logical={queryLogical}
                    onAddRule={() => {
                      const defaultCol = metadata[0]?.name || '';
                      const defaultType = metadata[0]?.type || 'character';
                      const defaultOps = getOperatorsForType(defaultType);
                      setDraftQueryRules(p => [
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
                      setDraftQueryRules(p => p.filter(r => r.id !== id));
                    }}
                    onUpdateRule={(id, updates) => {
                      setDraftQueryRules(p => p.map(r => r.id === id ? { ...r, ...updates } : r));
                    }}
                    onUpdateLogical={setQueryLogical}
                    onClearRules={() => setDraftQueryRules([])}
                    uniqueVals={uniqueVals}
                    colors={colors}
                    isDarkMode={isDarkMode}
                  />
                </div>
                
                {/* Panel Footer */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: `1px solid ${colors.border}`,
                  background: colors.headerBg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>
                    Showing {draftMatchCount.toLocaleString()} of {quickFilteredRows.length.toLocaleString()} rows
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setQueryRules(draftQueryRules);
                      }}
                      style={{
                        flex: 1, padding: '8px 12px', background: '#2563eb', color: '#fff',
                        border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Apply Filter
                    </button>
                    <button
                      onClick={() => {
                        setDraftQueryRules([]);
                        setQueryRules([]);
                      }}
                      style={{
                        padding: '8px 12px', background: '#ef4444', color: '#fff',
                        border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Floating filter panel & Sort dropdown ── */}
          {popup && popupMeta && popup.type === 'sort' && (
            <SortDropdown
              meta={popupMeta}
              position={popup.position}
              onSort={handleSort}
              onClose={() => setPopup(null)}
              colors={colors}
              initialShift={popup.shift}
            />
          )}
          {popup && popupMeta && popup.type === 'filter' && (
            <FilterPanel
              meta={popupMeta}
              uniqueVals={uniqueVals[popup.col]}
              applied={filters[popup.col]}
              position={popup.position}
              onApply={handleApply}
              onClear={handleClear}
              onClose={()=>setPopup(null)}
              colors={colors}
              isDarkMode={isDarkMode}
            />
          )}

          {/* ── Reproducible Code modal ── */}
          {showRCodeModal && (
            <RCodeModal
              codeObj={{
                dplyr:  generateRCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length, sortState),
                baseR:  generateBaseRCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length, sortState),
                sql:    generateSQLCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length, sortState),
                arrow:  generateArrowCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length, sortState),
                duckdb: generateDuckDBCode(datasetName, filters, queryRules, queryLogical, metadata, cols.map(c => c.name), metadata.length, sortState)
              }}
              onClose={() => setShowRCodeModal(false)}
              colors={colors}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      </div>

      {/* ── Collapsible Side Panel Drawer ── */}
      {showInsights && activeInsightCol && colSummaries[activeInsightCol] && (
        <DataInsightsDrawer
          summary={colSummaries[activeInsightCol]}
          onClose={() => setShowInsights(false)}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      )}
      {/* ── Keyboard Shortcuts Cheatsheet modal ── */}
      {showShortcuts && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }} onClick={() => setShowShortcuts(false)}>
          <div style={{
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            borderRadius: 12, padding: 24, width: 420, maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: colors.text, fontSize: 16 }}>⌨️ Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.subText, fontSize: 16 }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: colors.text }}>
              <div style={{ fontWeight: 600, borderBottom: `1px solid ${colors.border}`, paddingBottom: 4, color: colors.subText }}>Navigation</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>↑ ↓ ← →</span> <span>Navigate cells</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Home / End</span> <span>First / Last column</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PgUp / PgDn</span> <span>Scroll page</span></div>
              
              <div style={{ fontWeight: 600, borderBottom: `1px solid ${colors.border}`, paddingBottom: 4, marginTop: 8, color: colors.subText }}>Filtering & Sorting</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ctrl + F</span> <span>Toggle advanced filter panel</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ctrl + Shift + F</span> <span>Clear all filters</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Click Header</span> <span>Sort ascending/descending/clear</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shift + Click Header</span> <span>Multi-column sort</span></div>
              
              <div style={{ fontWeight: 600, borderBottom: `1px solid ${colors.border}`, paddingBottom: 4, marginTop: 8, color: colors.subText }}>View Options</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ctrl + Shift + [</span> <span>Compact row height (24px)</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ctrl + Shift + ]</span> <span>Comfortable row height (40px)</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ctrl + Shift + 0</span> <span>Standard row height (32px)</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>?</span> <span>Show this cheatsheet</span></div>
            </div>
          </div>
        </div>
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
        // Handle full-screen sizing for standalone HTML exports
        const container = document.getElementById('htmlwidget_container');
        if (container) {
          document.documentElement.style.margin = '0';
          document.documentElement.style.padding = '0';
          document.documentElement.style.width = '100%';
          document.documentElement.style.height = '100%';
          document.documentElement.style.overflow = 'hidden';

          document.body.style.margin = '0';
          document.body.style.padding = '0';
          document.body.style.width = '100%';
          document.body.style.height = '100%';
          document.body.style.overflow = 'hidden';

          container.style.width = '100%';
          container.style.height = '100%';
          container.style.margin = '0';
          container.style.padding = '0';

          el.style.height = '100vh';
          el.style.width = '100%';
        } else {
          el.style.height = el.style.height || (height + 'px');
        }
        const elem = React.createElement(DTSmartRComponent, {
          data: x.data,
          arrow_payload: x.arrow_payload,
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
      resize: function(w, h) {
        const container = document.getElementById('htmlwidget_container');
        if (container) {
          el.style.height = '100vh';
        } else {
          el.style.height = h + 'px';
        }
      }
    };
  }
});