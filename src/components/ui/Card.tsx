import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
}) => {
  const baseClasses = 'bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200';
  const hoverClasses = onClick ? 'hover:shadow-md cursor-pointer' : '';
  const classes = `${baseClasses} ${hoverClasses} ${className}`;
  
  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};