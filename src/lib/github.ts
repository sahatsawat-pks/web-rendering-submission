import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_ORG = process.env.GITHUB_ORG || "MUICT-Class";

export interface GitHubFileData {
  content: string;
  encoding: string;
  size: number;
  sha: string;
  url: string;
}

export interface FetchResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    size: number;
    sha: string;
    fileName: string;
  };
}

/**
 * Fetches a file from a private GitHub repository
 * Repository name pattern: 682-lab{labNumber}-{username}
 * 
 * @param username - GitHub username of the student
 * @param labNumber - Lab number (e.g., "01", "02")
 * @param fileName - File to fetch (default: "index.html")
 * @returns FetchResult with file content or error message
 */
export async function fetchRepositoryFile(
  username: string,
  labNumber: string,
  fileName: string = "index.html"
): Promise<FetchResult> {
  try {
    // Construct repository name: 682-lab{number}-{username}
    const repoName = `682-lab${labNumber}-${username}`;

    // console.log(`Fetching ${fileName} from ${GITHUB_ORG}/${repoName}...`);

    // Get the default branch first
    const { data: repo } = await octokit.repos.get({
      owner: GITHUB_ORG,
      repo: repoName,
    });

    const defaultBranch = repo.default_branch;
    // console.log(`Default branch for ${repoName}: ${defaultBranch}`);

    try {
      // Try fetching the exact file first
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_ORG,
        repo: repoName,
        path: fileName,
        ref: defaultBranch,
      });

      return processFileData(data, fileName);
    } catch (err: any) {
      if (err.status === 404) {
        // console.log(`File ${fileName} not found. Attempting smart fallback...`);
        
        // List root directory to find case-insensitive match or fallback
        const { data: files } = await octokit.repos.getContent({
          owner: GITHUB_ORG,
          repo: repoName,
          path: "",
          ref: defaultBranch,
        });

        if (Array.isArray(files)) {
            // 1. Case-insensitive match
            const exactMatch = files.find(f => f.name.toLowerCase() === fileName.toLowerCase());
            if (exactMatch) {
                // console.log(`Found case-insensitive match: ${exactMatch.name}`);
                const { data } = await octokit.repos.getContent({
                    owner: GITHUB_ORG,
                    repo: repoName,
                    path: exactMatch.path,
                    ref: defaultBranch,
                });
                return processFileData(data, exactMatch.name);
            }

            // 2. If looking for index.html but failed, look for any .html
            if (fileName.toLowerCase() === "index.html") {
                const anyHtml = files.find(f => f.name.toLowerCase().endsWith(".html"));
                if (anyHtml) {
                     // console.log(`Found alternative HTML: ${anyHtml.name}`);
                     const { data } = await octokit.repos.getContent({
                        owner: GITHUB_ORG,
                        repo: repoName,
                        path: anyHtml.path,
                        ref: defaultBranch,
                    });
                    return processFileData(data, anyHtml.name);
                }
            }
        }
      }
      throw err; // Re-throw if not handled
    }
  } catch (error: any) {
    console.error("GitHub API Error:", error);

    if (error.status === 404) {
      return {
        success: false,
        error: "Repository or file not found. Please check your username and lab number.",
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        success: false,
        error: "Access denied. Please check your GitHub token permissions.",
      };
    }

    return {
      success: false,
      error: error.message || "An unexpected error occurred.",
    };
  }
}

// Helper to process file data response
function processFileData(data: any, fileName: string): FetchResult {
    if (Array.isArray(data) || data.type !== "file") {
      return {
        success: false,
        error: `Path '${fileName}' is not a file`,
      };
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return {
      success: true,
      content,
      metadata: {
        size: data.size,
        sha: data.sha,
        fileName: data.name,
      },
    };
}

export interface FetchRawResult {
  success: boolean;
  content?: Buffer;
  error?: string;
}

export async function fetchRawRepositoryFile(
  username: string,
  labNumber: string,
  filePath: string
): Promise<FetchRawResult> {
  try {
    const repoName = `682-lab${labNumber}-${username}`;
    
    // Get default branch
    const { data: repo } = await octokit.repos.get({
      owner: GITHUB_ORG,
      repo: repoName,
    });

    try {
        const { data } = await octokit.repos.getContent({
          owner: GITHUB_ORG,
          repo: repoName,
          path: filePath,
          ref: repo.default_branch,
        });

        if (Array.isArray(data) || data.type !== "file") {
          return { success: false, error: "Not a file" };
        }

        const content = Buffer.from(data.content, "base64");
        return { success: true, content };
    } catch (err: any) {
        if (err.status === 404) {
            // console.log(`Raw file ${filePath} not found. Fallback...`);
            // List root (or parent dir) to find match. 
            // For simplicity, verify against root list if path has no slashes, or just fail for deep paths if complex.
            // Using the same root-list strategy is safest for "index.html" or simple labs.
            
            const { data: files } = await octokit.repos.getContent({
                owner: GITHUB_ORG,
                repo: repoName,
                path: "", 
                ref: repo.default_branch,
            });

            if (Array.isArray(files)) {
                // 1. Case-insensitive
                const match = files.find(f => f.name.toLowerCase() === filePath.toLowerCase());
                if (match) {
                     const { data } = await octokit.repos.getContent({
                        owner: GITHUB_ORG,
                        repo: repoName,
                        path: match.path,
                        ref: repo.default_branch,
                    });
                     if (!Array.isArray(data) && data.type === "file") {
                         return { success: true, content: Buffer.from(data.content, "base64") };
                     }
                }
                
                // 2. HTML fallback
                if (filePath.toLowerCase().endsWith("index.html")) {
                     const anyHtml = files.find(f => f.name.toLowerCase().endsWith(".html"));
                     if (anyHtml) {
                         const { data } = await octokit.repos.getContent({
                            owner: GITHUB_ORG,
                            repo: repoName,
                            path: anyHtml.path,
                            ref: repo.default_branch,
                        });
                        if (!Array.isArray(data) && data.type === "file") {
                            return { success: true, content: Buffer.from(data.content, "base64") };
                        }
                     }
                }
            }
        }
        throw err;
    }

  } catch (error: any) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Lists files in a repository directory (optional enhancement)
 * 
 * @param username - GitHub username
 * @param labNumber - Lab number
 * @param path - Path within the repository (default: root)
 * @returns Array of file/directory names
 */
export interface FileEntry {
  name: string;
  type: "file" | "dir" | "submodule" | "symlink";
}

export async function listRepositoryFiles(
  username: string,
  labNumber: string,
  path: string = ""
): Promise<{ success: boolean; files?: FileEntry[]; error?: string }> {
  try {
    const repoName = `682-lab${labNumber}-${username}`;

    // Get repo info to find default branch
    const { data: repo } = await octokit.repos.get({
      owner: GITHUB_ORG,
      repo: repoName,
    });

    // Get the full tree recursively
    const { data: treeData } = await octokit.git.getTree({
      owner: GITHUB_ORG,
      repo: repoName,
      tree_sha: repo.default_branch,
      recursive: "true",
    });

    if (treeData.truncated) {
      // console.warn(`Tree for ${repoName} was truncated`);
    }

    // Filter and map files
    const files: FileEntry[] = treeData.tree
      .filter((item) => item.type === "blob")
      .map((item) => ({
        name: item.path || "",
        type: "file" as const,
      }))
      .filter(f => f.name !== "");

    const dirs: FileEntry[] = treeData.tree
      .filter((item) => item.type === "tree")
      .map((item) => ({
        name: item.path || "",
        type: "dir" as const,
      }));

    return {
      success: true,
      files: [...dirs, ...files],
    };
  } catch (error: any) {
    console.error("List files error:", error);
    return {
      success: false,
      error: error.message || "Failed to list files",
    };
  }
}
