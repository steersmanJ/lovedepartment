import React, { useState, useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Loader2 } from 'lucide-react';

// Optional CDN fallback only for exotic non-flowchart Mermaid diagrams (0 bytes in bundle)
let mermaidCdnPromise = null;
function loadMermaidFromCdn() {
  if (typeof window !== 'undefined' && window.mermaid) {
    return Promise.resolve(window.mermaid);
  }
  if (!mermaidCdnPromise) {
    mermaidCdnPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
      script.async = true;
      script.onload = () => {
        if (window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
          });
          resolve(window.mermaid);
        } else {
          reject(new Error('Mermaid CDN failed'));
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return mermaidCdnPromise;
}

// Configure marked defaults
marked.use({
  breaks: true,
  gfm: true,
});

/**
 * Ultra-fast synchronous Flowchart renderer (0ms, 0KB bundle impact).
 * Converts standard `flowchart TD/TB/LR` or `graph TD/TB/LR` blocks into crisp HTML/SVG cards.
 * Returns null if the diagram uses complex/unsupported syntax so CDN fallback can handle it.
 */
function tryRenderFastFlowchart(rawCode) {
  if (!rawCode) return null;
  const trimmed = rawCode.trim();
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const headerMatch = lines[0].match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\s*$/i);
  if (!headerMatch) return null;

  // Fallback to full mermaid if complex features are present
  if (/\b(?:subgraph|classDef|click|style\s+\w+)\b/i.test(trimmed)) {
    return null;
  }

  const direction = headerMatch[1].toUpperCase();
  const isHorizontal = direction === 'LR' || direction === 'RL';

  const nodesMap = new Map();
  const nodeOrder = [];
  const registerNode = (id, label) => {
    if (!id) return;
    if (!nodeOrder.includes(id)) nodeOrder.push(id);
    if (label !== undefined && label !== null) {
      nodesMap.set(id, label);
    } else if (!nodesMap.has(id)) {
      nodesMap.set(id, id);
    }
  };

  // 1. Extract node definitions: Id["Label"], Id("Label"), Id[Label], etc.
  const defRegex = /([A-Za-z0-9_가-힣-]+)\s*(?:\["([\s\S]*?)"\]|\("([\s\S]*?)"\)|\(\["([\s\S]*?)"\]\)|\[([^\]"]+?)\]|\(([^)"]+?)\))/g;
  let match;
  while ((match = defRegex.exec(trimmed)) !== null) {
    const id = match[1];
    const label = match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6] ?? id;
    registerNode(id, label.trim());
  }

  // 2. Parse edge sequences (e.g. Day1 --> Day2 --> Day3)
  const edgeOrder = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('%%')) continue;
    if (/(?:-->|---|==>|-\.->)/.test(line)) {
      // Remove inline node labels before splitting edges
      const cleanLine = line.replace(/(?:\["[\s\S]*?"\]|\("[\s\S]*?"\)|\(\["[\s\S]*?"\]\)|\[[^\]]*?\]|\([^)]*?\))/g, '');
      const parts = cleanLine.split(/\s*(?:-->|---|==>|-\.->)(?:\|[^|]*\|)?\s*/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        const idMatch = part.match(/^([A-Za-z0-9_가-힣-]+)/);
        if (idMatch) {
          const id = idMatch[1];
          registerNode(id);
          if (!edgeOrder.includes(id)) {
            edgeOrder.push(id);
          }
        }
      }
    }
  }

  const finalOrder = edgeOrder.length > 0
    ? [...edgeOrder, ...nodeOrder.filter(id => !edgeOrder.includes(id))]
    : nodeOrder;

  if (finalOrder.length === 0) return null;

  const arrowSvg = isHorizontal
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="4" x2="12" y2="19"></line><polyline points="6 13 12 19 18 13"></polyline></svg>`;

  const itemsHtml = finalOrder.map((id, idx) => {
    const rawLabel = nodesMap.get(id) || id;
    const parts = rawLabel.split(/<br\s*\/?>|\n/i).map(s => s.trim()).filter(Boolean);
    let contentHtml = '';
    if (parts.length > 1) {
      const titleLine = parts[0];
      const bodyLines = parts.slice(1).join('<br/>');
      contentHtml = `<div class="fast-flowchart-title">${titleLine}</div><div class="fast-flowchart-body">${bodyLines}</div>`;
    } else {
      contentHtml = `<div class="fast-flowchart-title">${rawLabel}</div>`;
    }

    const arrowBlock = idx < finalOrder.length - 1
      ? `<div class="fast-flowchart-arrow">${arrowSvg}</div>`
      : '';

    return `<div class="fast-flowchart-node">${contentHtml}</div>${arrowBlock}`;
  }).join('');

  return `<div class="mermaid-diagram-wrapper"><div class="fast-flowchart ${isHorizontal ? 'fast-flowchart-lr' : 'fast-flowchart-td'}">${itemsHtml}</div></div>`;
}

/**
 * Preprocesses markdown text to handle CJK bold particle boundaries,
 * fast flowchart blocks, and tab-separated tables.
 */
export function preprocessMarkdown(text) {
  if (!text) return '';

  // 0. Replace standard ```mermaid flowchart blocks synchronously for 0ms rendering
  let processed = text.replace(/```mermaid\s*\n([\s\S]*?)```/gi, (fullMatch, code) => {
    const fastHtml = tryRenderFastFlowchart(code);
    return fastHtml ? `\n${fastHtml}\n` : fullMatch;
  });

  // 1. Fix Korean/CJK bold edge cases where ** is next to punctuation or particles like **단어)**과
  processed = processed.replace(/\*\*([^\n*]+?)\*\*/g, '<strong>$1</strong>');

  // 2. Convert tab-separated table rows to Markdown table syntax
  const lines = processed.split('\n');
  const result = [];
  let tableLines = [];

  function flushTable() {
    if (tableLines.length === 0) return;
    if (tableLines.length >= 2) {
      const header = tableLines[0].split('\t').map(c => c.trim()).filter(Boolean);
      if (header.length > 1) {
        const sep = header.map(() => '---');
        result.push('| ' + header.join(' | ') + ' |');
        result.push('| ' + sep.join(' | ') + ' |');
        for (let i = 1; i < tableLines.length; i++) {
          const row = tableLines[i].split('\t').map(c => c.trim());
          while (row.length < header.length) row.push('');
          result.push('| ' + row.slice(0, header.length).join(' | ') + ' |');
        }
      } else {
        result.push(...tableLines);
      }
    } else {
      result.push(...tableLines);
    }
    tableLines = [];
  }

  for (const line of lines) {
    if (line.includes('\t') && line.trim().length > 0) {
      tableLines.push(line);
    } else {
      flushTable();
      result.push(line);
    }
  }
  flushTable();
  return result.join('\n');
}

// In-memory cache for parsed markdown HTML and fetched file URLs
const htmlCache = new Map();
const fileContentCache = new Map();

function safeSanitize(dirtyHtml) {
  try {
    const sanitizeFn = typeof DOMPurify !== 'undefined' ? DOMPurify?.sanitize : null;
    if (typeof sanitizeFn === 'function') {
      return sanitizeFn(dirtyHtml, {
        ADD_TAGS: ['svg', 'g', 'path', 'rect', 'circle', 'line', 'polygon', 'polyline', 'text', 'tspan', 'marker', 'defs', 'use'],
        ADD_ATTR: ['target', 'rel', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform', 'class', 'id', 'width', 'height', 'xmlns', 'marker-end', 'marker-start', 'x1', 'y1', 'x2', 'y2', 'points']
      });
    }
  } catch (err) {
    console.warn('DOMPurify sanitize warning, using rawHtml:', err);
  }
  return dirtyHtml;
}

function MarkdownRenderer({ content, fileUrl, className = '' }) {
  const containerRef = useRef(null);
  const [fetchedContent, setFetchedContent] = useState(() => (fileUrl && fileContentCache.get(fileUrl)) || '');
  const [isFetchingFile, setIsFetchingFile] = useState(false);

  // If content is empty but a markdown file is attached, fetch its content with memory caching
  useEffect(() => {
    if (!content && fileUrl && (fileUrl.toLowerCase().includes('.md') || fileUrl.toLowerCase().includes('.markdown') || fileUrl.toLowerCase().includes('.txt'))) {
      if (fileContentCache.has(fileUrl)) {
        setFetchedContent(fileContentCache.get(fileUrl));
        return;
      }
      setIsFetchingFile(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(text => {
          fileContentCache.set(fileUrl, text);
          setFetchedContent(text);
          setIsFetchingFile(false);
        })
        .catch(err => {
          console.warn('Failed to load markdown from fileUrl:', err);
          setIsFetchingFile(false);
        });
    }
  }, [content, fileUrl]);

  const activeText = content || fetchedContent;

  const html = useMemo(() => {
    if (!activeText) return '';
    if (htmlCache.has(activeText)) {
      return htmlCache.get(activeText);
    }
    try {
      const prepared = preprocessMarkdown(activeText);
      const rawHtml = marked.parse(prepared);
      const cleanHtml = safeSanitize(rawHtml);
      if (htmlCache.size > 100) htmlCache.clear();
      htmlCache.set(activeText, cleanHtml);
      return cleanHtml;
    } catch (e) {
      console.error('Markdown parse error:', e);
      return activeText.replace(/\n/g, '<br/>');
    }
  }, [activeText]);

  // Fallback effect only if non-flowchart exotic mermaid blocks exist
  useEffect(() => {
    if (!containerRef.current) return;

    const mermaidNodes = containerRef.current.querySelectorAll('pre code.language-mermaid');
    if (mermaidNodes.length === 0) return;

    let isMounted = true;

    loadMermaidFromCdn()
      .then(async (mermaidInstance) => {
        if (!isMounted) return;

        for (let idx = 0; idx < mermaidNodes.length; idx++) {
          const codeElement = mermaidNodes[idx];
          const rawCode = codeElement.textContent;
          const parentPre = codeElement.parentElement;
          if (!parentPre) continue;

          const uniqueId = `mermaid-chart-${Date.now()}-${idx}-${Math.floor(Math.random() * 10000)}`;

          try {
            const { svg } = await mermaidInstance.render(uniqueId, rawCode);
            if (!isMounted) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'mermaid-diagram-wrapper';
            wrapper.innerHTML = svg;
            parentPre.replaceWith(wrapper);
          } catch (err) {
            console.warn('Failed to render mermaid diagram:', err);
            const stray = document.getElementById(uniqueId) || document.getElementById('d' + uniqueId);
            if (stray) stray.remove();
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load mermaid CDN:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [html]);

  if (isFetchingFile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <Loader2 size={16} className="spin" /> 마크다운 문서 내용을 불러오는 중...
      </div>
    );
  }

  if (!activeText) return null;

  return (
    <div 
      ref={containerRef}
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default React.memo(MarkdownRenderer);


