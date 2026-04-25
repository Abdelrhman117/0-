import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-coffee-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-coffee-950 border rounded-lg text-sm text-coffee-100 placeholder-coffee-700 focus:outline-none focus:ring-1 transition-colors ${
          error
            ? 'border-red-700 focus:ring-red-700'
            : 'border-surface-border focus:border-coffee-500 focus:ring-coffee-500/30'
        } ${className}`}
        {...rest}
      />
      {hint  && !error && <p className="text-xs text-coffee-600">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export function Select({ label, error, className = '', id, children, ...rest }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-coffee-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full px-3 py-2 bg-coffee-950 border rounded-lg text-sm text-coffee-100 focus:outline-none focus:ring-1 transition-colors ${
          error
            ? 'border-red-700 focus:ring-red-700'
            : 'border-surface-border focus:border-coffee-500 focus:ring-coffee-500/30'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...rest }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-coffee-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        className={`w-full px-3 py-2 bg-coffee-950 border rounded-lg text-sm text-coffee-100 placeholder-coffee-700 focus:outline-none focus:ring-1 transition-colors resize-none ${
          error
            ? 'border-red-700 focus:ring-red-700'
            : 'border-surface-border focus:border-coffee-500 focus:ring-coffee-500/30'
        } ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
