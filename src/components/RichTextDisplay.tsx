"use client"

import DOMPurify from 'dompurify'
import { useEffect, useState, useRef } from 'react'

interface RichTextDisplayProps {
  content: string
  className?: string
  inline?: boolean
}

export default function RichTextDisplay({ content, className = '', inline = false }: RichTextDisplayProps) {
  const [sanitizedContent, setSanitizedContent] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load KaTeX CSS if not present
      if (!document.getElementById('katex-css')) {
        const link = document.createElement('link')
        link.id = 'katex-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
        document.head.appendChild(link)
      }

      // Load KaTeX JS if not present
      if (!document.getElementById('katex-js')) {
        const script = document.createElement('script')
        script.id = 'katex-js'
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js'
        script.defer = true
        document.head.appendChild(script)
      }

      // Load KaTeX auto-render extension if not present
      if (!document.getElementById('katex-auto-render')) {
        const autoScript = document.createElement('script')
        autoScript.id = 'katex-auto-render'
        autoScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js'
        autoScript.defer = true
        document.head.appendChild(autoScript)
      }

      const clean = DOMPurify.sanitize(content || '', {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 
          'a', 'span', 'div', 'sup', 'sub', 'math', 'semantics', 'mrow', 'annotation'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'xmlns', 'encoding'],
        ADD_ATTR: ['style']
      })
      setSanitizedContent(clean)
    }
  }, [content])

  useEffect(() => {
    if (typeof window !== 'undefined' && containerRef.current && sanitizedContent) {
      const renderMath = () => {
        const win = window as any
        if (win.renderMathInElement && containerRef.current) {
          try {
            win.renderMathInElement(containerRef.current, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false }
              ],
              throwOnError: false
            })
          } catch (err) {
            console.error('KaTeX rendering error:', err)
          }
        }
      }

      const win = window as any
      if (win.renderMathInElement) {
        renderMath()
      } else {
        const timer1 = setTimeout(renderMath, 200)
        const timer2 = setTimeout(renderMath, 600)
        const timer3 = setTimeout(renderMath, 1200)
        return () => {
          clearTimeout(timer1)
          clearTimeout(timer2)
          clearTimeout(timer3)
        }
      }
    }
  }, [sanitizedContent])

  if (inline) {
    return (
      <span 
        ref={containerRef}
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}
