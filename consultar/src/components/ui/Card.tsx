import React from 'react'
import { cn } from '../../utils/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
}

const Card: React.FC<CardProps> = ({ className, children }) => {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6 shadow-sm', className)}>
      {children}
    </div>
  )
}

export default Card