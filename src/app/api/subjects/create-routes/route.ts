import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

interface GitHubFileContent {
  path: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.username !== 'kanzaki_aito') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { subjectCode, createScoreCheckPlaceholder, createLabRunnerPlaceholder, courseSummaryLink } = await request.json();
    
    if (!subjectCode) {
      return NextResponse.json({ error: 'Subject code required' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPO; // format: "owner/repo"
    const githubBranch = process.env.GITHUB_BRANCH || 'main';

    if (!githubToken || !githubRepo) {
      return NextResponse.json({ 
        error: 'GitHub integration not configured',
        message: 'Set GITHUB_TOKEN and GITHUB_REPO environment variables'
      }, { status: 500 });
    }

    const [owner, repo] = githubRepo.split('/');
    const lowerCode = subjectCode.toLowerCase();

    // Define files to create
    const files: GitHubFileContent[] = [
      // Student routes
      {
        path: `src/app/${lowerCode}/layout.tsx`,
        content: generateStudentLayout(subjectCode)
      },
      {
        path: `src/app/${lowerCode}/page.tsx`,
        content: generateStudentPage(subjectCode, createScoreCheckPlaceholder, createLabRunnerPlaceholder, courseSummaryLink)
      }
    ];

    // Add rendering page (lab runner) conditionally
    if (createLabRunnerPlaceholder) {
      files.push({
        path: `src/app/${lowerCode}/rendering/page.tsx`,
        content: generatePlaceholderPage(subjectCode, 'Lab Runner')
      });
    } else {
      files.push({
        path: `src/app/${lowerCode}/rendering/page.tsx`,
        content: generateRenderingPage(subjectCode)
      });
    }

    // Add score page conditionally
    if (createScoreCheckPlaceholder) {
      files.push({
        path: `src/app/${lowerCode}/score/page.tsx`,
        content: generatePlaceholderPage(subjectCode, 'Score Check')
      });
    } else {
      files.push({
        path: `src/app/${lowerCode}/score/page.tsx`,
        content: generateScorePage(subjectCode)
      });
    }

    // Admin routes
    files.push(
      {
        path: `src/app/admin/${lowerCode}/layout.tsx`,
        content: generateAdminLayout(subjectCode)
      },
      {
        path: `src/app/admin/${lowerCode}/page.tsx`,
        content: generateAdminPage(subjectCode)
      },
      {
        path: `src/app/admin/${lowerCode}/tests/page.tsx`,
        content: generateTestsPage(subjectCode)
      }
    );

    // Get latest commit SHA from branch
    const branchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${githubBranch}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!branchRes.ok) {
      throw new Error(`Failed to get branch: ${branchRes.statusText}`);
    }

    const branchData = await branchRes.json();
    const latestCommitSha = branchData.object.sha;

    // Get the tree of the latest commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!commitRes.ok) {
      throw new Error(`Failed to get commit: ${commitRes.statusText}`);
    }

    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const blobRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: file.content,
              encoding: 'utf-8'
            })
          }
        );

        if (!blobRes.ok) {
          throw new Error(`Failed to create blob for ${file.path}`);
        }

        const blobData = await blobRes.json();
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        };
      })
    );

    // Create a new tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: blobs
        })
      }
    );

    if (!treeRes.ok) {
      throw new Error(`Failed to create tree: ${treeRes.statusText}`);
    }

    const treeData = await treeRes.json();

    // Create a new commit
    const newCommitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add routes for ${subjectCode} subject`,
          tree: treeData.sha,
          parents: [latestCommitSha]
        })
      }
    );

    if (!newCommitRes.ok) {
      throw new Error(`Failed to create commit: ${newCommitRes.statusText}`);
    }

    const newCommitData = await newCommitRes.json();

    // Update the reference
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${githubBranch}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sha: newCommitData.sha
        })
      }
    );

    if (!updateRefRes.ok) {
      throw new Error(`Failed to update reference: ${updateRefRes.statusText}`);
    }

    return NextResponse.json({
      success: true,
      message: `Routes for ${subjectCode} created and committed`,
      commitSha: newCommitData.sha,
      filesCreated: files.map(f => f.path)
    });

  } catch (error: any) {
    console.error('Route creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create routes', details: error.message },
      { status: 500 }
    );
  }
}

// Template generators
function generateStudentLayout(code: string): string {
  return `export default function ${code}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
`;
}

function generateStudentPage(code: string, isScorePlaceholder?: boolean, isLabRunnerPlaceholder?: boolean, courseSummaryLink?: string): string {
  const renderingLabel = isLabRunnerPlaceholder ? 'Test Submission (Coming Soon)' : 'Test Submission';
  const scoreLabel = isScorePlaceholder ? 'View Scores (Coming Soon)' : 'View Scores';
  const renderingDisabled = isLabRunnerPlaceholder ? 'pointer-events-none opacity-50' : '';
  const scoreDisabled = isScorePlaceholder ? 'pointer-events-none opacity-50' : '';
  
  const courseSummarySection = courseSummaryLink ? `
          <a
            href="${courseSummaryLink}"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Course Summary</h2>
            <p className="text-gray-600 dark:text-gray-400">
              View course documentation and materials
            </p>
          </a>` : '';

  return `"use client";

import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ${code}Page() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold">${code} Dashboard</h1>
          </div>
          <ModeToggle />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/${code.toLowerCase()}/rendering"
            className={\`p-6 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 transition-colors ${renderingDisabled}\`}
          >
            <h2 className="text-xl font-semibold mb-2">${renderingLabel}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              ${isLabRunnerPlaceholder ? 'Feature will be implemented soon' : 'Submit and test your code'}
            </p>
          </Link>

          <Link
            href="/${code.toLowerCase()}/score"
            className={\`p-6 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 transition-colors ${scoreDisabled}\`}
          >
            <h2 className="text-xl font-semibold mb-2">${scoreLabel}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              ${isScorePlaceholder ? 'Feature will be implemented soon' : 'Check your lab scores'}
            </p>
          </Link>${courseSummarySection ? '\n\n' + courseSummarySection : ''}
        </div>
      </div>
    </div>
  );
}
`;
}

function generateRenderingPage(code: string): string {
  return `"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ${code}RenderingPage() {
  const [studentId, setStudentId] = useState("");
  const [labNumber, setLabNumber] = useState("");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOutput("");

    try {
      const res = await fetch("/api/test-runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, labNumber, code }),
      });
      const data = await res.json();
      setOutput(data.output || data.error || "No output");
    } catch (err) {
      setOutput("Error running tests");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/${code.toLowerCase()}"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          ${code} - Test Submission
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Student ID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#161b22] text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Lab Number
            </label>
            <input
              type="text"
              value={labNumber}
              onChange={(e) => setLabNumber(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#161b22] text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Code
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#161b22] text-gray-900 dark:text-white font-mono"
              rows={15}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Tests"}
          </button>
        </form>

        {output && (
          <div className="mt-8 p-4 bg-gray-100 dark:bg-[#161b22] rounded-lg">
            <h2 className="font-semibold mb-2 text-gray-900 dark:text-white">
              Output:
            </h2>
            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
`;
}

function generateScorePage(code: string): string {
  return `"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ${code}ScorePage() {
  const [studentId, setStudentId] = useState("");
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(\`/api/scores?studentId=\${studentId}&subject=${code}\`);
      const data = await res.json();
      setScores(data.scores || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/${code.toLowerCase()}"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          ${code} - Scores
        </h1>

        <form onSubmit={handleFetch} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter Student ID"
              className="flex-1 p-3 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#161b22] text-gray-900 dark:text-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Fetch Scores"}
            </button>
          </div>
        </form>

        {scores.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="p-3 text-left text-gray-900 dark:text-white">Lab</th>
                  <th className="p-3 text-left text-gray-900 dark:text-white">Score</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score: any) => (
                  <tr
                    key={score.labNumber}
                    className="border-b border-gray-100 dark:border-white/5"
                  >
                    <td className="p-3 text-gray-900 dark:text-white">
                      {score.labNumber}
                    </td>
                    <td className="p-3 text-gray-900 dark:text-white">
                      {score.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
`;
}

function generateAdminLayout(code: string): string {
  return `export default function Admin${code}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
`;
}

function generateAdminPage(code: string): string {
  return `"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Admin${code}Page() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (
          data.username === "kanzaki_aito" ||
          (data.role === "Lecturer" && data.permissions?.${code.toLowerCase()})
        ) {
          setHasAccess(true);
        } else {
          router.push("/admin/dashboard");
        }
      })
      .catch(() => router.push("/admin/dashboard"));
  }, [router]);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0d1117] flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/dashboard"
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ${code} Admin Dashboard
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/${code.toLowerCase()}/tests"
            className="p-6 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Manage Test Cases
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Create and edit test cases for labs
            </p>
          </Link>

          <Link
            href="/admin/labs?subject=${code}"
            className="p-6 border border-gray-200 dark:border-white/10 rounded-lg hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Manage Labs
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configure lab settings
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
`;
}

function generateTestsPage(code: string): string {
  return `"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Admin${code}TestsPage() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (
          data.username === "kanzaki_aito" ||
          (data.role === "Lecturer" && data.permissions?.${code.toLowerCase()})
        ) {
          setHasAccess(true);
        } else {
          router.push("/admin/dashboard");
        }
      })
      .catch(() => router.push("/admin/dashboard"));
  }, [router]);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0d1117] flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/${code.toLowerCase()}"
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ${code} - Manage Test Cases
          </h1>
        </div>

        <div className="text-gray-600 dark:text-gray-400">
          Test case management interface for ${code}
        </div>
      </div>
    </div>
  );
}
`;
}

function generatePlaceholderPage(code: string, featureName: string): string {
  return `"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";

export default function ${code}${featureName.replace(/\s+/g, '')}Page() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/${code.toLowerCase()}"
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold">${code} - ${featureName}</h1>
          </div>
          <ModeToggle />
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="inline-block p-6 bg-gray-100 dark:bg-white/5 rounded-full mb-4">
                <svg
                  className="w-16 h-16 text-gray-400 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              The ${featureName} feature for ${code} is currently under development
              and will be available in a future update.
            </p>
            <Link
              href="/${code.toLowerCase()}"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
}
