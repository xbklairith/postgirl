import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    autoResize = false,
    minRows = 3,
    maxRows = 10,
    rows,
    ...props 
  }, ref) => {
    const [currentRows, setCurrentRows] = React.useState(rows || minRows);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const textarea = e.currentTarget;
        const lineHeight = 24; // Approximate line height in pixels
        const padding = 16; // Padding top + bottom
        
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate the number of lines needed
        const lines = Math.ceil((textarea.scrollHeight - padding) / lineHeight);
        const clampedLines = Math.max(minRows, Math.min(maxRows, lines));
        
        setCurrentRows(clampedLines);
        textarea.style.height = `${clampedLines * lineHeight + padding}px`;
      }
      
      // Call original onInput if provided
      if (props.onInput) {
        props.onInput(e);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            className={cn(
              'input w-full resize-none',
              autoResize && 'overflow-hidden',
              error && 'ring-2 ring-red-500',
              className
            )}
            rows={autoResize ? currentRows : rows || minRows}
            ref={ref}
            onInput={handleInput}
            {...props}
          />
        </div>
        {(error || helperText) && (
          <div className="mt-1">
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {helperText && !error && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';