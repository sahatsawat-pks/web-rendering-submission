import { getSubjects } from "./db"
import { getSubjectConfig as getStaticConfig, SubjectConfig } from "./subjectConfig"
import { adaptSubjectConfig } from "./subjectConfigAdapter"

/**
 * Server-side utility to get subject configuration without using fetch()
 */
export async function getSubjectConfigServer(code: string): Promise<SubjectConfig | null> {
  const upperCode = code.toUpperCase()
  
  // 1. Check static config first
  const staticConfig = getStaticConfig(upperCode)
  
  // 2. Fetch from database
  try {
    const subjects = await getSubjects()
    const subject = subjects.find(s => s.code.toUpperCase() === upperCode)
    
    if (subject) {
      // If found in DB, adapt it. 
      // Note: In some cases we might want to merge DB values into static config if both exist.
      // But usually DB config is the source of truth for dynamic subjects.
      return adaptSubjectConfig(subject)
    }
  } catch (error) {
    console.error(`Error fetching subject config for ${upperCode} on server:`, error)
  }
  
  // 3. Fallback to static config
  return staticConfig
}
