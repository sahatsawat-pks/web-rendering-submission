"use client"

import DOMPurify from 'dompurify'
import { useEffect, useState } from 'react'

interface RichTextDisplayProps {
  content: string
  className?: string
}

export default function RichTextDisplay({ content, className = '' }: RichTextDisplayProps) {
  const [sanitizedContent, setSanitizedContent] = useState('')

  useEffect(() => {
    // Sanitize HTML content to prevent XSS attacks
    if (typeof window !== 'undefined') {
      const clean = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
        ADD_ATTR: ['style']
      })
      setSanitizedContent(clean)
    }
  }, [content])

  return (
    <div 
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}
