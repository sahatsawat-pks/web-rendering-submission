import { SubjectConfig } from "./subjectConfig"
import { adaptSubjectConfig } from "./subjectConfigAdapter"
import { Subject } from "./db"

// Simple in-memory cache
// Key: Subject Code (uppercase), Value: Promise<SubjectConfig | null> or SubjectConfig
const configCache: Record<string, SubjectConfig> = {}
const pendingRequests: Record<string, Promise<SubjectConfig | null>> = {}

/**
 * Fetches subject configuration with caching.
 * If a request is already in flight, returns that promise.
 * If data is cached, returns it immediately.
 */
export async function fetchSubjectConfig(code: string): Promise<SubjectConfig | null> {
  const upperCode = code.toUpperCase()

  // Return cached value if available
  if (configCache[upperCode]) {
    return configCache[upperCode]
  }

  // Return pending request if exists (deduplication)
  if (upperCode in pendingRequests) {
    return pendingRequests[upperCode]
  }

  // Create new request
  const request = fetch(`/api/subjects?code=${upperCode}`)
    .then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      
      if (data.subjects && data.subjects.length > 0) {
        const subject: Subject = data.subjects[0]
        const config = adaptSubjectConfig(subject)
        
        // Cache the result
        configCache[upperCode] = config
        return config
      }
      return null
    })
    .catch((err) => {
      console.error(`Error fetching config for ${upperCode}:`, err)
      return null
    })
    .finally(() => {
      // Cleanup pending request
      delete pendingRequests[upperCode]
    })

  pendingRequests[upperCode] = request
  return request
}

/**
 * Clear the cache for a specific subject or all subjects
 * Useful when admin updates a subject
 */
export function invalidateSubjectConfigCache(code?: string) {
  if (code) {
    const upperCode = code.toUpperCase()
    delete configCache[upperCode]
  } else {
    // Clear all
    Object.keys(configCache).forEach(key => delete configCache[key])
  }
}
