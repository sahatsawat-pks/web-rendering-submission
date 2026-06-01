import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Subject paths that need visibility check
const subjectPaths = ['itcs223', 'itcs227', 'itge162', 'itcs123', 'itcs251', 'itcs255', 'itds283']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check subject visibility for non-admin users
  const subjectMatch = subjectPaths.find(s => path.startsWith(`/${s}`))
  if (subjectMatch) {
    const token = request.cookies.get('auth-token')?.value
    
    // If user has token, they might be admin - let them through
    // If no token, check if subject is visible
    if (!token) {
      try {
        // Fetch subject visibility
        const baseUrl = request.nextUrl.origin
        const response = await fetch(`${baseUrl}/api/subjects`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          const subject = data.subjects?.find((s: any) => 
            s.code.toLowerCase() === subjectMatch.toLowerCase()
          )
          
          // If subject exists and is not visible, redirect to home
          if (subject && !subject.is_visible) {
            return NextResponse.redirect(new URL('/', request.url))
          }
        }
      } catch (error) {
        console.error('Error checking subject visibility:', error)
        // On error, allow access to avoid breaking the site
      }
    }
  }

  // Only run on /admin routes
  if (path.startsWith('/admin')) {
    const token = request.cookies.get('auth-token')?.value
    // We can't verify the JWT signature easily in middleware without edge-compatible lib.
    // Assuming existence is enough check for redirect, but verifying is safer.
    // Since `jose` is edge compatible, we can try to verify slightly or just check existence for speed using the provided lib if compatible.
    // However, importing from '@/lib/auth' might pull in other node deps.
    // Let's rely on simple presence check + standard verification in the actual page/API for security, 
    // OR duplicate the verification logic here if simple.
    // For now, simple presence check is often sufficient for UX redirection, actual data is protected by API.
    
    // BUT user specifically asked "if user is not logged in yet redirected".
    
    const isLoginPage = path === '/admin/login';
    
    if (isLoginPage) {
        if (token) {
             return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        }
    } else {
        // Protected Admin Pages
        if (!token) {
             return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/itcs223/:path*', '/itcs227/:path*', '/itge162/:path*', '/itcs123/:path*', '/itcs251/:path*', '/itcs255/:path*', '/itds283/:path*'],
}
