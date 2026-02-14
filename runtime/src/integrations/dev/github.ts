/**
 * GitHub Integration
 * Repos, issues, PRs, actions, deployments
 */

import { BaseIntegration, ActionResult, Credentials, IntegrationAction, OAuthConfig } from '../base.js';

export class GitHubIntegration extends BaseIntegration {
  id = 'github';
  name = 'GitHub';
  description = 'Manage repositories, issues, pull requests, and GitHub Actions';
  category = 'dev' as const;
  icon = '🐙';

  oauth: OAuthConfig = {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: [
      'repo',
      'read:user',
      'workflow',
      'read:org',
    ],
  };

  actions: IntegrationAction[] = [
    {
      name: 'createRepo',
      description: 'Create a new repository',
      parameters: {
        name: { type: 'string', description: 'Repository name', required: true },
        description: { type: 'string', description: 'Repository description', required: false },
        private: { type: 'boolean', description: 'Make repo private', required: false },
      },
      returns: 'Repository object',
    },
    {
      name: 'createIssue',
      description: 'Create an issue in a repository',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        title: { type: 'string', description: 'Issue title', required: true },
        body: { type: 'string', description: 'Issue body', required: false },
        labels: { type: 'array', description: 'Labels to add', required: false },
      },
      returns: 'Issue object',
    },
    {
      name: 'createPR',
      description: 'Create a pull request',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        title: { type: 'string', description: 'PR title', required: true },
        head: { type: 'string', description: 'Head branch', required: true },
        base: { type: 'string', description: 'Base branch', required: true },
        body: { type: 'string', description: 'PR description', required: false },
      },
      returns: 'Pull request object',
    },
    {
      name: 'mergePR',
      description: 'Merge a pull request',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        pullNumber: { type: 'number', description: 'PR number', required: true },
        mergeMethod: { type: 'string', description: 'Merge method', required: false, enum: ['merge', 'squash', 'rebase'] },
      },
    },
    {
      name: 'listIssues',
      description: 'List issues in a repository',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        state: { type: 'string', description: 'Issue state', required: false, enum: ['open', 'closed', 'all'] },
        labels: { type: 'string', description: 'Filter by labels (comma-separated)', required: false },
      },
      returns: 'Array of issues',
    },
    {
      name: 'getFile',
      description: 'Get file contents from a repository',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        path: { type: 'string', description: 'File path', required: true },
        ref: { type: 'string', description: 'Branch/commit/tag', required: false },
      },
      returns: 'File content',
    },
    {
      name: 'createFile',
      description: 'Create or update a file',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        path: { type: 'string', description: 'File path', required: true },
        content: { type: 'string', description: 'File content', required: true },
        message: { type: 'string', description: 'Commit message', required: true },
        branch: { type: 'string', description: 'Target branch', required: false },
        sha: { type: 'string', description: 'File SHA (for updates)', required: false },
      },
    },
    {
      name: 'triggerWorkflow',
      description: 'Trigger a GitHub Actions workflow',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        workflowId: { type: 'string', description: 'Workflow ID or filename', required: true },
        ref: { type: 'string', description: 'Branch/tag to run on', required: true },
        inputs: { type: 'object', description: 'Workflow inputs', required: false },
      },
    },
    {
      name: 'getWorkflowRuns',
      description: 'Get workflow run history',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        workflowId: { type: 'string', description: 'Workflow ID or filename', required: false },
      },
      returns: 'Array of workflow runs',
    },
    {
      name: 'commentIssue',
      description: 'Add a comment to an issue or PR',
      parameters: {
        repo: { type: 'string', description: 'Repo (owner/name)', required: true },
        issueNumber: { type: 'number', description: 'Issue/PR number', required: true },
        body: { type: 'string', description: 'Comment body', required: true },
      },
    },
  ];

  private baseUrl = 'https://api.github.com';

  async execute(action: string, params: Record<string, any>, credentials: Credentials): Promise<ActionResult> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    
    if (credentials.accessToken) {
      headers['Authorization'] = `Bearer ${credentials.accessToken}`;
    } else if (credentials.apiKey) {
      headers['Authorization'] = `token ${credentials.apiKey}`;
    }

    try {
      switch (action) {
        case 'createRepo': {
          const response = await fetch(`${this.baseUrl}/user/repos`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: params.name,
              description: params.description,
              private: params.private || false,
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to create repo');

          return { success: true, data };
        }

        case 'createIssue': {
          const [owner, repo] = params.repo.split('/');
          const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: params.title,
              body: params.body,
              labels: params.labels,
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to create issue');

          return { success: true, data };
        }

        case 'createPR': {
          const [owner, repo] = params.repo.split('/');
          const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: params.title,
              head: params.head,
              base: params.base,
              body: params.body,
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to create PR');

          return { success: true, data };
        }

        case 'mergePR': {
          const [owner, repo] = params.repo.split('/');
          const response = await fetch(
            `${this.baseUrl}/repos/${owner}/${repo}/pulls/${params.pullNumber}/merge`,
            {
              method: 'PUT',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merge_method: params.mergeMethod || 'merge',
              }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to merge PR');
          }

          return { success: true };
        }

        case 'listIssues': {
          const [owner, repo] = params.repo.split('/');
          const searchParams = new URLSearchParams({
            state: params.state || 'open',
            ...(params.labels && { labels: params.labels }),
          });

          const response = await fetch(
            `${this.baseUrl}/repos/${owner}/${repo}/issues?${searchParams}`,
            { headers }
          );

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to list issues');

          return { success: true, data };
        }

        case 'getFile': {
          const [owner, repo] = params.repo.split('/');
          const url = params.ref
            ? `${this.baseUrl}/repos/${owner}/${repo}/contents/${params.path}?ref=${params.ref}`
            : `${this.baseUrl}/repos/${owner}/${repo}/contents/${params.path}`;

          const response = await fetch(url, { headers });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'File not found');

          // Decode base64 content
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          return { success: true, data: { ...data, content } };
        }

        case 'createFile': {
          const [owner, repo] = params.repo.split('/');
          const response = await fetch(
            `${this.baseUrl}/repos/${owner}/${repo}/contents/${params.path}`,
            {
              method: 'PUT',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: params.message,
                content: Buffer.from(params.content).toString('base64'),
                branch: params.branch,
                sha: params.sha,
              }),
            }
          );

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to create file');

          return { success: true, data };
        }

        case 'triggerWorkflow': {
          const [owner, repo] = params.repo.split('/');
          const response = await fetch(
            `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${params.workflowId}/dispatches`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ref: params.ref,
                inputs: params.inputs || {},
              }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to trigger workflow');
          }

          return { success: true };
        }

        case 'getWorkflowRuns': {
          const [owner, repo] = params.repo.split('/');
          const url = params.workflowId
            ? `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${params.workflowId}/runs`
            : `${this.baseUrl}/repos/${owner}/${repo}/actions/runs`;

          const response = await fetch(url, { headers });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to get workflow runs');

          return { success: true, data: data.workflow_runs };
        }

        case 'commentIssue': {
          const [owner, repo] = params.repo.split('/');
          const response = await fetch(
            `${this.baseUrl}/repos/${owner}/${repo}/issues/${params.issueNumber}/comments`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ body: params.body }),
            }
          );

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to add comment');

          return { success: true, data };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
