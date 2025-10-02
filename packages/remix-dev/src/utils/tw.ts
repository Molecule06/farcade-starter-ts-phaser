import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge
 * Ensures proper Tailwind class precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Template literal helper for readable multi-line class lists
 * Splits lines, trims whitespace, and joins into single string
 * 
 * Usage:
 * tw`
 *   flex items-center
 *   bg-primary
 *   hover:bg-primary-hover
 * `
 */
export function tw(strings: TemplateStringsArray, ...values: any[]) {
  const fullString = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '')
  }, '')
  
  return fullString
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
}