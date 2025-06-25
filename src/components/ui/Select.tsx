import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const selectRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        // Check if click is inside the dropdown portal
        const target = event.target as Element;
        const isClickInsideDropdown = target.closest('[data-dropdown-portal="select"]');
        if (!isClickInsideDropdown) {
          setIsOpen(false);
        }
      }
    };

    const updatePosition = () => {
      if (selectRef.current && isOpen) {
        const rect = selectRef.current.getBoundingClientRect();
        const dropdownHeight = Math.min(240, options.length * 40 + 8); // Estimate actual height
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Determine if dropdown should open upward
        const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow && spaceAbove >= 100;
        
        // Calculate position
        let top = shouldOpenUpward 
          ? Math.max(8, rect.top + window.scrollY - dropdownHeight - 4)
          : rect.bottom + window.scrollY + 4;
        
        // Ensure dropdown doesn't go off screen
        if (!shouldOpenUpward && top + dropdownHeight > window.innerHeight + window.scrollY) {
          top = window.innerHeight + window.scrollY - dropdownHeight - 8;
        }
        
        setDropdownPosition({
          top,
          left: Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - rect.width - 8)),
          width: rect.width,
          openUpward: shouldOpenUpward
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    }

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div 
        data-dropdown-portal="select"
        className={cn(
          'fixed rounded-lg shadow-xl z-[100]',
          'bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg',
          'border border-slate-200/60 dark:border-slate-600/60',
          'ring-1 ring-black ring-opacity-5',
          'max-h-60 overflow-auto'
        )}
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width
        }}
      >
        <div className="py-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'relative w-full text-left px-3 py-2 text-sm transition-colors duration-150',
                'hover:bg-slate-100/60 dark:hover:bg-slate-700/60',
                'focus:outline-none focus:bg-slate-100/60 dark:focus:bg-slate-700/60',
                'text-slate-900 dark:text-slate-100',
                option.value === value && 'bg-primary-50/60 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              )}
            >
              <span className="block truncate">
                {option.label}
              </span>
              
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={selectRef} className={cn('relative', className)}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          // Base styles
          'relative w-full text-left cursor-default rounded-lg border transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50',
          
          // Glassmorphism styles
          'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm',
          'border-slate-200/60 dark:border-slate-600/60',
          'hover:bg-white/80 dark:hover:bg-slate-800/80',
          'hover:border-slate-300/60 dark:hover:border-slate-500/60',
          
          // Text styles
          'text-slate-900 dark:text-slate-100',
          
          // Size classes
          sizeClasses[size],
          
          // Disabled styles
          disabled && 'opacity-50 cursor-not-allowed',
          
          // Open state
          isOpen && 'ring-2 ring-primary-500 ring-opacity-50'
        )}
      >
        <span className={cn(
          'block truncate',
          !selectedOption && 'text-slate-500 dark:text-slate-400'
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDownIcon 
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )} 
          />
        </span>
      </button>

      {/* Render dropdown via portal */}
      {renderDropdown()}
    </div>
  );
};