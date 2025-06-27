import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export interface VariableHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
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

interface VariableSuggestion {
  name: string;
  value?: string;
  description?: string;
}

export const VariableHighlighter: React.FC<VariableHighlighterProps> = ({
  value,
  onChange,
  placeholder,
  className,
  style = {},
  variables = {},
  multiline = false,
  rows = 3,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>([]);
  const [suggestionPosition, setSuggestionPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Check if cursor is at a position where variable suggestions should appear
  const checkForVariableSuggestion = (text: string, cursorPos: number): { show: boolean; query: string; startPos: number } => {
    // Look for {{ before cursor position
    const beforeCursor = text.substring(0, cursorPos);
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');
    
    if (lastOpenBrace === -1) {
      return { show: false, query: '', startPos: -1 };
    }
    
    // Check if there's a closing }} after the opening {{
    const afterOpenBrace = text.substring(lastOpenBrace);
    const closeBraceIndex = afterOpenBrace.indexOf('}}');
    
    // If we find }}, make sure cursor is before it
    if (closeBraceIndex !== -1 && cursorPos > lastOpenBrace + closeBraceIndex) {
      return { show: false, query: '', startPos: -1 };
    }
    
    // Extract the partial variable name
    const partialVar = beforeCursor.substring(lastOpenBrace + 2);
    
    // Only show suggestions if we're directly after {{ or typing a variable name
    return {
      show: true,
      query: partialVar,
      startPos: lastOpenBrace + 2
    };
  };

  // Filter variables based on query
  const getFilteredSuggestions = (query: string): VariableSuggestion[] => {
    const availableVars = Object.entries(variables).map(([name, value]) => ({
      name,
      value,
      description: value ? `Value: ${value}` : 'No value set'
    }));

    if (!query) {
      return availableVars;
    }

    return availableVars.filter(variable => 
      variable.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Create highlighted HTML
  const createHighlightedHtml = (text: string): string => {
    const variableMatches = extractVariables(text);
    if (variableMatches.length === 0) {
      return text.replace(/\n/g, '<br>');
    }

    let result = '';
    let lastIndex = 0;

    variableMatches.forEach((match) => {
      // Add text before the variable (keep spaces as-is since we use pre-wrap)
      const beforeText = text.slice(lastIndex, match.start);
      result += beforeText.replace(/\n/g, '<br>');

      // Add highlighted variable
      const variableText = text.slice(match.start, match.end);
      const isResolved = match.value !== undefined;
      const highlightClass = isResolved 
        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      
      result += `<span class="variable-highlight ${highlightClass}" data-variable="${match.variable}" data-value="${match.value || ''}">${variableText}</span>`;

      lastIndex = match.end;
    });

    // Add remaining text (keep spaces as-is since we use pre-wrap)
    const remainingText = text.slice(lastIndex);
    result += remainingText.replace(/\n/g, '<br>');

    return result;
  };

  // Sync scroll between input and highlight layer
  const syncScroll = () => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = inputRef.current.scrollTop;
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  // Handle input changes and cursor position
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    // Check if we should show variable suggestions
    const suggestionInfo = checkForVariableSuggestion(newValue, cursorPos);
    
    if (suggestionInfo.show) {
      const filteredSuggestions = getFilteredSuggestions(suggestionInfo.query);
      setSuggestions(filteredSuggestions);
      setSelectedSuggestionIndex(0);
      setShowSuggestions(filteredSuggestions.length > 0);
      
      // Calculate suggestion position
      updateSuggestionPosition();
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle cursor position changes (arrow keys, clicks)
  const handleSelectionChange = () => {
    if (!inputRef.current) return;
    
    const cursorPos = inputRef.current.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    const suggestionInfo = checkForVariableSuggestion(value, cursorPos);
    
    if (suggestionInfo.show) {
      const filteredSuggestions = getFilteredSuggestions(suggestionInfo.query);
      setSuggestions(filteredSuggestions);
      setSelectedSuggestionIndex(0);
      setShowSuggestions(filteredSuggestions.length > 0);
      updateSuggestionPosition();
    } else {
      setShowSuggestions(false);
    }
  };

  // Update suggestion dropdown position
  const updateSuggestionPosition = () => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    const inputRect = input.getBoundingClientRect();
    
    // For single line inputs, position below the input
    if (!multiline) {
      setSuggestionPosition({
        x: inputRect.left,
        y: inputRect.bottom + 4
      });
    } else {
      // For multiline, try to position near the cursor
      // This is a simplified version - more complex cursor positioning would require canvas measurement
      setSuggestionPosition({
        x: inputRect.left + 10,
        y: inputRect.top + 30
      });
    }
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
        
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectSuggestion(selectedSuggestionIndex);
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  // Select a suggestion and insert it into the text
  const selectSuggestion = (index: number) => {
    if (!inputRef.current || index < 0 || index >= suggestions.length) return;
    
    const suggestion = suggestions[index];
    const suggestionInfo = checkForVariableSuggestion(value, cursorPosition);
    
    if (!suggestionInfo.show) return;
    
    // Replace the current partial variable with the selected one
    const beforeVariable = value.substring(0, suggestionInfo.startPos - 2); // -2 for {{
    const afterCursor = value.substring(cursorPosition);
    
    const newValue = `${beforeVariable}{{${suggestion.name}}}${afterCursor}`;
    const newCursorPosition = beforeVariable.length + suggestion.name.length + 4; // +4 for {{}}
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        inputRef.current.focus();
      }
    }, 0);
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
    'w-full bg-transparent resize-none outline-none text-transparent',
    'relative z-10 border-0 variable-highlighter-input',
    className
  );

  const highlightClasses = cn(
    'absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words',
    'text-slate-900 dark:text-slate-100 border-0',
    'box-border'
  );

  const containerClasses = cn(
    'relative w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm',
    'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500',
    'bg-white dark:bg-slate-800',
    'variable-highlighter-container',
    disabled && 'opacity-50 cursor-not-allowed'
  );

  // Force exact character measurements by using system monospace
  const sharedStyle = {
    fontFamily: 'ui-monospace, Menlo, Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace',
    fontSize: '14px',
    lineHeight: '1.42857',
    padding: '8px 12px',
    margin: '0',
    border: '0',
    outline: '0',
    boxSizing: 'border-box' as const,
    fontFeatureSettings: '"liga" 0, "kern" 0, "calt" 0',
    fontVariantLigatures: 'none',
    letterSpacing: '0',
    wordSpacing: '0',
    textIndent: '0',
    textAlign: 'left' as const,
    fontWeight: '400',
    fontStyle: 'normal',
    textDecoration: 'none',
    textTransform: 'none' as const,
    textRendering: 'optimizeSpeed' as const,
    fontKerning: 'none' as const,
    whiteSpace: multiline ? 'pre-wrap' as const : 'nowrap' as const,
    overflow: 'hidden',
    ...style,
  };

  const commonProps = {
    ref: inputRef as any,
    value,
    onChange: handleInputChange,
    onScroll: syncScroll,
    onSelect: handleSelectionChange,
    onKeyDown: handleKeyDown,
    onBlur: () => {
      // Delay hiding suggestions to allow for click selection
      setTimeout(() => setShowSuggestions(false), 150);
    },
    placeholder,
    disabled,
    className: inputClasses,
    style: sharedStyle,
  };


  return (
    <>
      <div className={containerClasses}>
        {/* Highlight layer */}
        <div
          ref={highlightRef}
          className={highlightClasses}
          style={sharedStyle}
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

      {/* Variable Suggestions Dropdown */}
      {showSuggestions && suggestionPosition && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto min-w-[200px]"
          style={{
            left: suggestionPosition.x,
            top: suggestionPosition.y,
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.name}
              className={`px-3 py-2 cursor-pointer text-sm border-l-2 ${
                index === selectedSuggestionIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => selectSuggestion(index)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{suggestion.name}</span>
                {suggestion.value && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 truncate max-w-[100px]">
                    {suggestion.value}
                  </span>
                )}
              </div>
              {suggestion.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {suggestion.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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