// ============================================
// Sento - Input Components
// Clean, accessible, banking-app quality
// ============================================

'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-[13px] font-medium text-[#F4F4F5]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftAddon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F6167] pointer-events-none">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full h-12
              bg-[#0D0E10]
              border rounded-lg
              text-[#F4F4F5] text-[15px]
              placeholder:text-[#3A3C40]
              transition-all duration-[120ms] ease-out
              focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftAddon ? 'pl-11' : 'pl-4'}
              ${rightAddon ? 'pr-11' : 'pr-4'}
              ${error 
                ? 'border-[#D45353] focus:border-[#D45353] focus:shadow-[0_0_0_3px_rgba(212,83,83,0.12)]' 
                : 'border-[rgba(255,255,255,0.06)] hover:bg-[#111214] hover:border-[rgba(255,255,255,0.08)] focus:bg-[#111214] focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(91,185,140,0.06)]'
              }
              ${className}
            `}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5F6167] pointer-events-none">
              {rightAddon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p className={`text-[12px] ${error ? 'text-[#D45353]' : 'text-[#5F6167]'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={textareaId} 
            className="block text-[13px] font-medium text-[#F4F4F5]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full min-h-[120px]
            px-4 py-3
            bg-[#0D0E10]
            border rounded-lg
            text-[#F4F4F5] text-[15px]
            placeholder:text-[#3A3C40]
            transition-all duration-[120ms] ease-out
            resize-none
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-[#D45353] focus:border-[#D45353] focus:shadow-[0_0_0_3px_rgba(212,83,83,0.12)]' 
              : 'border-[rgba(255,255,255,0.06)] hover:bg-[#111214] hover:border-[rgba(255,255,255,0.08)] focus:bg-[#111214] focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(91,185,140,0.06)]'
            }
            ${className}
          `}
          {...props}
        />
        {(error || hint) && (
          <p className={`text-[12px] ${error ? 'text-[#D45353]' : 'text-[#5F6167]'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select Component
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={selectId} 
            className="block text-[13px] font-medium text-[#F4F4F5]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full h-12
              px-4 pr-10
              bg-[#0D0E10]
              border rounded-lg
              text-[#F4F4F5] text-[15px]
              appearance-none
              transition-all duration-[120ms] ease-out
              focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error 
                ? 'border-[#D45353] focus:border-[#D45353] focus:shadow-[0_0_0_3px_rgba(212,83,83,0.12)]' 
                : 'border-[rgba(255,255,255,0.06)] hover:bg-[#111214] hover:border-[rgba(255,255,255,0.08)] focus:bg-[#111214] focus:border-[rgba(255,255,255,0.2)] focus:shadow-[0_0_0_3px_rgba(91,185,140,0.06)]'
              }
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-[#5F6167]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {(error || hint) && (
          <p className={`text-[12px] ${error ? 'text-[#D45353]' : 'text-[#5F6167]'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Input, Textarea, Select };
export type { InputProps, TextareaProps, SelectProps };
