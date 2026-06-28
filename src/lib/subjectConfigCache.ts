import { SubjectConfig, normalizeSubjectCode, getSubjectConfig } from "./subjectConfig"
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
  const upperCode = normalizeSubjectCode(code)

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
        
        // Cache the result for both the requested input and the canonical subject code
        const canonicalCode = normalizeSubjectCode(config.code)
        configCache[upperCode] = config
        if (canonicalCode) {
          configCache[canonicalCode] = config
        }
        config.aliases?.forEach(alias => {
          const aliasKey = normalizeSubjectCode(alias)
          if (aliasKey) {
            configCache[aliasKey] = config
          }
        })
        return config
      }

      const staticConfig = getSubjectConfig(upperCode)
      if (staticConfig) {
        configCache[upperCode] = staticConfig
        const canonicalCode = normalizeSubjectCode(staticConfig.code)
        if (canonicalCode) {
          configCache[canonicalCode] = staticConfig
        }
        staticConfig.aliases?.forEach(alias => {
          const aliasKey = normalizeSubjectCode(alias)
          if (aliasKey) {
            configCache[aliasKey] = staticConfig
          }
        })
        return staticConfig
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
  if (!code) {
    Object.keys(configCache).forEach(key => delete configCache[key])
    Object.keys(pendingRequests).forEach(key => delete pendingRequests[key])
    return
  }

  const upperCode = normalizeSubjectCode(code)

  Object.keys(configCache).forEach((key) => {
    const config = configCache[key]
    if (!config) return

    const aliases = config.aliases?.map(normalizeSubjectCode) || []
    if (
      key === upperCode ||
      normalizeSubjectCode(config.code) === upperCode ||
      aliases.includes(upperCode)
    ) {
      delete configCache[key]
    }
  })

  if (upperCode in pendingRequests) {
    delete pendingRequests[upperCode]
  }
}
