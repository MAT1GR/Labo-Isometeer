// src/components/ui/Input.tsx (CORREGIDO)

import React, { forwardRef } from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

// Usamos forwardRef para pasar la ref al input interno
const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  className,
  ...props
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref} // Aquí asignamos la ref al elemento input real
        className={cn(
          'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

// Asignar un nombre para facilitar la depuración
Input.displayName = "Input"

export default Input