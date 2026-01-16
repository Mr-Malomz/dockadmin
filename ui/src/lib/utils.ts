import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Extend tailwind-merge to recognize our custom duck color classes
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Add custom text color classes
      'text-color': [
        { 'text-duck-dark': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
        { 'text-duck-white': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
        { 'text-duck-primary': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
      ],
      // Add custom background color classes
      'bg-color': [
        { 'bg-duck-dark': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
        { 'bg-duck-white': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
        { 'bg-duck-primary': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
      ],
      // Add custom border color classes
      'border-color': [
        { 'border-duck-dark': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
        { 'border-duck-white': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
        { 'border-duck-primary': ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
      ],
      // Add custom font size classes
      'font-size': [
        { 'text-duck': ['xxs', 'xs', 'ssm', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
