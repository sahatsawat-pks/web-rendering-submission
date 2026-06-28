import { getSubjects } from "./db"
import { getSubjectConfig as getStaticConfig, getCanonicalSubjectCode, normalizeSubjectCode, SubjectConfig } from "./subjectConfig"
import { adaptSubjectConfig } from "./subjectConfigAdapter"

/**
 * Server-side utility to get subject configuration without using fetch()
 */
export async function getSubjectConfigServer(code: string): Promise<SubjectConfig | null> {
  const upperCode = normalizeSubjectCode(code)
  if (!upperCode) return null

  // 1. Resolve alias or canonical subject in static config first
  const staticConfig = getStaticConfig(upperCode)
  const resolvedCode = getCanonicalSubjectCode(upperCode) || upperCode

  // 2. Fetch from database using the requested code, canonical code, or known aliases
  try {
    const subjects = await getSubjects()
    const subject = subjects.find(s => {
      const subjectCode = normalizeSubjectCode(s.code)
      const aliases = (s.aliases || []).map(alias => normalizeSubjectCode(alias))
      return subjectCode === upperCode || subjectCode === resolvedCode || aliases.includes(upperCode) || aliases.includes(resolvedCode)
    })
    
    if (subject) {
      // If found in DB, adapt it. This is usually the source of truth for dynamic subjects.
      return adaptSubjectConfig(subject)
    }
  } catch (error) {
    console.error(`Error fetching subject config for ${upperCode} on server:`, error)
  }

  // 3. Fallback to static config if alias or static subject is defined
  return staticConfig
}
