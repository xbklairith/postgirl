import React, { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  PlusIcon, 
  CogIcon,
  CheckIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
// import { Button } from '../ui';
import { cn } from '../../utils/cn';
import type { Environment } from '../../types/environment';

interface EnvironmentSelectorProps {
  environments: Environment[];
  activeEnvironmentId?: string;
  onEnvironmentChange: (environmentId: string) => void;
  onCreateEnvironment: () => void;
  onEditEnvironment: (environment: Environment) => void;
  onManageEnvironments: () => void;
  className?: string;
  disabled?: boolean;
}

export const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  environments,
  activeEnvironmentId,
  onEnvironmentChange,
  onCreateEnvironment,
  onEditEnvironment,
  onManageEnvironments,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectorRef = React.useRef<HTMLDivElement>(null);

  const activeEnvironment = environments.find(env => env.id === activeEnvironmentId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const updatePosition = () => {
      if (selectorRef.current && isOpen) {
        const rect = selectorRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
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

  const getEnvironmentIcon = (environment: Environment) => {
    const name = environment.name.toLowerCase();
    if (name.includes('prod')) return '🔴';
    if (name.includes('staging') || name.includes('stage')) return '🟡';
    if (name.includes('dev') || name.includes('development')) return '🟢';
    if (name.includes('test')) return '🔵';
    return '🌐';
  };

  const getEnvironmentVariableCount = (environment: Environment) => {
    return Object.keys(environment.variables).length;
  };

  const getEnabledVariableCount = (environment: Environment) => {
    return Object.values(environment.variables).length;
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div 
        className={cn(
          'fixed rounded-lg shadow-xl z-[9999]',
          'bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg',
          'border border-slate-200/60 dark:border-slate-600/60',
          'ring-1 ring-black ring-opacity-5',
          'max-h-96 overflow-auto'
        )}
        style={{
          top: dropdownPosition.top + 4,
          left: dropdownPosition.left,
          width: Math.max(dropdownPosition.width, 320)
        }}
      >
        <div className="py-2">
          {/* Environment List */}
          <div className="px-2 pb-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-1 mb-1">
              Environments
            </div>
            {environments.map((environment) => {
              const variableCount = getEnvironmentVariableCount(environment);
              const enabledCount = getEnabledVariableCount(environment);
              const isActive = environment.id === activeEnvironmentId;
              
              return (
                <button
                  key={environment.id}
                  type="button"
                  onClick={() => {
                    onEnvironmentChange(environment.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full text-left rounded-md p-2 mb-1 transition-colors duration-150',
                    'hover:bg-slate-100/60 dark:hover:bg-slate-700/60',
                    'focus:outline-none focus:bg-slate-100/60 dark:focus:bg-slate-700/60',
                    isActive && 'bg-primary-50/60 dark:bg-primary-900/20 ring-1 ring-primary-200/50 dark:ring-primary-700/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-sm">{getEnvironmentIcon(environment)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            'font-medium truncate',
                            isActive ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-slate-100'
                          )}>
                            {environment.name}
                          </span>
                          {isActive && <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {enabledCount}/{variableCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEnvironment(environment);
                          setIsOpen(false);
                        }}
                        className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
                        title="Edit environment"
                      >
                        <CogIcon className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/60 dark:border-slate-600/60 my-1" />

          {/* Actions */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => {
                onCreateEnvironment();
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left rounded-md p-2 mb-1 transition-colors duration-150',
                'hover:bg-slate-100/60 dark:hover:bg-slate-700/60',
                'focus:outline-none focus:bg-slate-100/60 dark:focus:bg-slate-700/60',
                'text-slate-700 dark:text-slate-300'
              )}
            >
              <div className="flex items-center space-x-2">
                <PlusIcon className="w-4 h-4" />
                <span className="font-medium">Create New Environment</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onManageEnvironments();
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left rounded-md p-2 transition-colors duration-150',
                'hover:bg-slate-100/60 dark:hover:bg-slate-700/60',
                'focus:outline-none focus:bg-slate-100/60 dark:focus:bg-slate-700/60',
                'text-slate-700 dark:text-slate-300'
              )}
            >
              <div className="flex items-center space-x-2">
                <CogIcon className="w-4 h-4" />
                <span className="font-medium">Manage Environments</span>
              </div>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={selectorRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'relative w-full text-left cursor-default rounded-lg border transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50',
          
          // Glassmorphism styles
          'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm',
          'border-slate-200/60 dark:border-slate-600/60',
          'hover:bg-white/80 dark:hover:bg-slate-800/80',
          'hover:border-slate-300/60 dark:hover:border-slate-500/60',
          
          // Text styles
          'text-slate-900 dark:text-slate-100',
          
          // Size
          'px-3 py-2',
          
          // Disabled styles
          disabled && 'opacity-50 cursor-not-allowed',
          
          // Open state
          isOpen && 'ring-2 ring-primary-500 ring-opacity-50',
          
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {activeEnvironment ? (
              <>
                <span className="text-sm">{getEnvironmentIcon(activeEnvironment)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate">
                      {activeEnvironment.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {getEnabledVariableCount(activeEnvironment)}/{getEnvironmentVariableCount(activeEnvironment)} variables
                  </div>
                </div>
              </>
            ) : (
              <>
                <GlobeAltIcon className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">
                  {environments.length === 0 ? 'No environments available' : 'Select environment...'}
                </span>
              </>
            )}
          </div>
          
          <ChevronDownIcon 
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-200 ml-2',
              isOpen && 'rotate-180'
            )} 
          />
        </div>
      </button>


      {/* Render dropdown via portal */}
      {renderDropdown()}
    </div>
  );
};