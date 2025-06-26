import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export interface VariableHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variables?: Record<string, string>;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
}

interface VariableMatch {
  start: number;
  end: number;
  variable: string;
  value?: string;
}

export const VariableHighlighter: React.FC<VariableHighlighterProps> = ({
  value,
  onChange,
  placeholder,
  className,
  variables = {},
  multiline = false,
  rows = 3,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Extract variables from text using {{variable}} pattern
  const extractVariables = (text: string): VariableMatch[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: VariableMatch[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const variableName = match[1].trim();
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        variable: variableName,
        value: variables[variableName],
      });
    }

    return matches;
  };

  // Create highlighted HTML
  const createHighlightedHtml = (text: string): string => {
    const variableMatches = extractVariables(text);
    if (variableMatches.length === 0) {
      return text.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    }

    let result = '';
    let lastIndex = 0;

    variableMatches.forEach((match) => {
      // Add text before the variable
      const beforeText = text.slice(lastIndex, match.start);
      result += beforeText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');

      // Add highlighted variable
      const variableText = text.slice(match.start, match.end);
      const isResolved = match.value !== undefined;
      const highlightClass = isResolved 
        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700'
        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700';
      
      result += `<span class="variable-highlight ${highlightClass} px-1 rounded text-sm font-medium" data-variable="${match.variable}" data-value="${match.value || ''}">${variableText.replace(/ /g, '&nbsp;')}</span>`;

      lastIndex = match.end;
    });

    // Add remaining text
    const remainingText = text.slice(lastIndex);
    result += remainingText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');

    return result;
  };

  // Sync scroll between input and highlight layer
  const syncScroll = () => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = inputRef.current.scrollTop;
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  // Handle mouse events for tooltip
  const handleMouseEnter = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('variable-highlight')) {
      const variable = target.getAttribute('data-variable');
      const value = target.getAttribute('data-value');
      
      if (variable) {
        const rect = target.getBoundingClientRect();
        setTooltip({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
          content: value ? `${variable}: ${value}` : `${variable}: undefined`,
        });
      }
    }
  };

  const handleMouseLeave = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('variable-highlight')) {
      setTooltip(null);
    }
  };

  // Set up event listeners for highlights
  useEffect(() => {
    if (highlightRef.current) {
      const highlightElement = highlightRef.current;
      const highlights = highlightElement.querySelectorAll('.variable-highlight');
      
      highlights.forEach((highlight) => {
        highlight.addEventListener('mouseenter', handleMouseEnter);
        highlight.addEventListener('mouseleave', handleMouseLeave);
      });

      return () => {
        highlights.forEach((highlight) => {
          highlight.removeEventListener('mouseenter', handleMouseEnter);
          highlight.removeEventListener('mouseleave', handleMouseLeave);
        });
      };
    }
  }, [value, variables]);

  const inputClasses = cn(
    'w-full bg-transparent resize-none outline-none text-transparent caret-slate-900 dark:caret-slate-100',
    'relative z-10',
    className
  );

  const highlightClasses = cn(
    'absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words',
    'text-slate-900 dark:text-slate-100 leading-normal',
    'px-3 py-2 font-mono text-sm'
  );

  const containerClasses = cn(
    'relative w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm',
    'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500',
    'bg-white dark:bg-slate-800',
    disabled && 'opacity-50 cursor-not-allowed'
  );

  const commonProps = {
    ref: inputRef as any,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onScroll: syncScroll,
    placeholder,
    disabled,
    className: inputClasses,
    style: {
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: '14px',
      lineHeight: '1.5',
      padding: '8px 12px',
    },
  };

  return (
    <>
      <div className={containerClasses}>
        {/* Highlight layer */}
        <div
          ref={highlightRef}
          className={highlightClasses}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            padding: '8px 12px',
          }}
          dangerouslySetInnerHTML={{ __html: createHighlightedHtml(value) }}
        />

        {/* Input layer */}
        {multiline ? (
          <textarea
            {...commonProps}
            rows={rows}
          />
        ) : (
          <input
            {...commonProps}
            type="text"
          />
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          {tooltip.content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </>
  );
};