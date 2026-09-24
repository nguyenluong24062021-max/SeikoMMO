import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm text-slate-100 shadow-xl transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({
  className = '',
  children,
  ...props
}) => {
  return <div className={cn('p-5 flex flex-col space-y-1.5', className)} {...props}>{children}</div>;
};

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  className = '',
  children,
  ...props
}) => {
  return <h3 className={cn('text-lg font-bold tracking-tight text-white', className)} {...props}>{children}</h3>;
};

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className = '',
  children,
  ...props
}) => {
  return <p className={cn('text-xs text-slate-400', className)} {...props}>{children}</p>;
};

export const CardContent: React.FC<CardProps> = ({
  className = '',
  children,
  ...props
}) => {
  return <div className={cn('p-5 pt-0', className)} {...props}>{children}</div>;
};

export const CardFooter: React.FC<CardProps> = ({
  className = '',
  children,
  ...props
}) => {
  return <div className={cn('p-5 pt-0 flex items-center', className)} {...props}>{children}</div>;
};
