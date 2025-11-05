import { Octokit } from '@octokit/rest';

/**
 * GitHub client for managing design token updates
 */
export class GitHubClient {
  constructor(token, owner, repo) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Check if a branch exists
   * @param {string} branchName
   * @returns {Promise<boolean>}
   */
  async branchExists(branchName) {
    try {
      await this.octokit.rest.repos.getBranch({
        owner: this.owner,
        repo: this.repo,
        branch: branchName,
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get the content of a file from a specific branch
   * @param {string} filePath
   * @param {string} branch
   * @returns {Promise<{content: string, sha: string}>}
   */
  async getFileContent(filePath, branch) {
    const response = await this.octokit.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      ref: branch,
    });

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return {
      content,
      sha: response.data.sha,
    };
  }

  /**
   * Create a new branch from another branch
   * @param {string} newBranchName
   * @param {string} fromBranch
   * @returns {Promise<void>}
   */
  async createBranch(newBranchName, fromBranch = 'main') {
    // Get the SHA of the source branch
    const { data: refData } = await this.octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${fromBranch}`,
    });

    const sha = refData.object.sha;

    // Create new branch
    await this.octokit.rest.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${newBranchName}`,
      sha,
    });

    console.log(`✓ Created branch: ${newBranchName}`);
  }

  /**
   * Update a file in a branch
   * @param {string} filePath
   * @param {string} content
   * @param {string} branch
   * @param {string} sha - Current file SHA
   * @param {string} commitMessage
   * @returns {Promise<void>}
   */
  async updateFile(filePath, content, branch, sha, commitMessage) {
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      sha,
      branch,
    });

    console.log(`✓ Updated file: ${filePath}`);
  }

  /**
   * Check if a PR exists from a branch
   * @param {string} headBranch
   * @param {string} baseBranch
   * @returns {Promise<{exists: boolean, number?: number, url?: string}>}
   */
  async getPullRequest(headBranch, baseBranch = 'main') {
    const { data: pulls } = await this.octokit.rest.pulls.list({
      owner: this.owner,
      repo: this.repo,
      head: `${this.owner}:${headBranch}`,
      base: baseBranch,
      state: 'open',
    });

    if (pulls.length > 0) {
      return {
        exists: true,
        number: pulls[0].number,
        url: pulls[0].html_url,
      };
    }

    return { exists: false };
  }

  /**
   * Create a pull request
   * @param {string} title
   * @param {string} headBranch
   * @param {string} baseBranch
   * @param {string} body
   * @returns {Promise<{number: number, url: string}>}
   */
  async createPullRequest(title, headBranch, baseBranch = 'main', body = '') {
    const { data: pr } = await this.octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title,
      head: headBranch,
      base: baseBranch,
      body,
    });

    console.log(`✓ Created PR #${pr.number}: ${pr.html_url}`);

    return {
      number: pr.number,
      url: pr.html_url,
    };
  }
}
