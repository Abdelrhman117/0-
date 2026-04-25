import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glass?: boolean;
}

export function Card({ children, className = '', glass, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-surface-border ${
        glass
          ? 'bg-coffee-950/60 backdrop-blur'
          : 'bg-surface-card'
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b border-surface-border ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-coffee-200 font-semibold text-base">{children}</h2>;
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
