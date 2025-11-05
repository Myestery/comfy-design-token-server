import { GitHubClient } from './github-client.js';
import { mergeCSS, updateTokenSection } from './claude-merger.js';
import { extractDesignTokenSection, replaceLines } from './css-parser.js';

/**
 * Main workflow for processing design token updates
 */
export class TokenUpdateWorkflow {
  constructor(config) {
    this.config = config;
    this.testMode = config.testMode || false; // Test mode flag
    this.github = new GitHubClient(
      config.githubToken,
      config.githubOwner,
      config.githubRepo
    );
  }

  /**
   * Process a new CSS update from Figma
   * @param {string} newCSS - CSS content from Figma
   * @returns {Promise<{success: boolean, prUrl?: string, error?: string}>}
   */
  async processUpdate(newCSS) {
    try {
      console.log('\n=== Starting Token Update Workflow ===\n');

      // Step 1: Check if bot branch exists
      console.log(`1. Checking if branch "${this.config.botBranch}" exists...`);
      const botBranchExists = await this.github.branchExists(this.config.botBranch);

      let sourceBranch;
      let oldCSS;
      let fileSha;

      if (!botBranchExists) {
        console.log(`   Branch doesn't exist. Previous PR was likely merged.`);
        console.log(`   Will create new branch from main.`);
        sourceBranch = 'main';

        // Fetch CSS from main
        console.log('\n2. Fetching current CSS from main branch...');
        const fileData = await this.github.getFileContent(
          this.config.targetFilePath,
          'main'
        );
        oldCSS = fileData.content;
        fileSha = fileData.sha;

        // Create new bot branch
        console.log(`\n3. Creating branch "${this.config.botBranch}"...`);
        await this.github.createBranch(this.config.botBranch, 'main');
      } else {
        console.log(`   Branch exists. Will update existing branch.`);
        sourceBranch = this.config.botBranch;

        // Fetch CSS from bot branch
        console.log('\n2. Fetching current CSS from bot branch...');
        const fileData = await this.github.getFileContent(
          this.config.targetFilePath,
          this.config.botBranch
        );
        oldCSS = fileData.content;
        fileSha = fileData.sha;

        console.log('\n3. Branch already exists, skipping creation.');
      }

      console.log(`   Old CSS: ${oldCSS.length} characters`);
      console.log(`   New CSS: ${newCSS.length} characters`);

      // Step 4: Extract and merge token section (@theme, :root, .dark-theme) using Claude
      console.log('\n4. Extracting design token sections (@theme, :root, .dark-theme)...');
      const oldTokenSection = extractDesignTokenSection(oldCSS);
      const newTokenSection = extractDesignTokenSection(newCSS);

      if (!oldTokenSection) {
        throw new Error('No complete token section found in old CSS (missing @theme, :root, or .dark-theme)');
      }
      if (!newTokenSection) {
        throw new Error('No complete token section found in new CSS (missing @theme, :root, or .dark-theme)');
      }

      console.log(`   Old token section: lines ${oldTokenSection.startLine}-${oldTokenSection.endLine} (${oldTokenSection.content.length} characters)`);
      console.log(`   - @theme: line ${oldTokenSection.blocks.theme}`);
      console.log(`   - :root: line ${oldTokenSection.blocks.root}`);
      console.log(`   - .dark-theme: lines ${oldTokenSection.blocks.darkTheme}-${oldTokenSection.blocks.darkThemeEnd}`);
      console.log(`   New token section: ${newTokenSection.content.length} characters`);

      console.log('\n5. Merging token section using Claude AI...');
      const updatedTokenSection = await this.mergeTokenSection(
        oldTokenSection.content,
        newTokenSection.content
      );
      console.log(`   Updated token section: ${updatedTokenSection.length} characters`);

      // Replace only the token section lines
      console.log(`\n6. Replacing lines ${oldTokenSection.startLine}-${oldTokenSection.endLine} in original CSS...`);
      const mergedCSS = replaceLines(
        oldCSS,
        oldTokenSection.startLine,
        oldTokenSection.endLine,
        updatedTokenSection
      );
      console.log(`   Final CSS: ${mergedCSS.length} characters`);

      // Check if there are any changes
      if (mergedCSS === oldCSS) {
        console.log('\n⚠️  No changes detected in CSS. Skipping commit and PR creation.');
        console.log('\n=== Workflow Complete (No Changes) ===\n');
        return {
          success: true,
          noChanges: true,
          message: 'No changes detected in design tokens',
        };
      }

      // Step 7: Update file in GitHub
      console.log('\n7. Updating file in GitHub...');
      await this.github.updateFile(
        this.config.targetFilePath,
        mergedCSS,
        this.config.botBranch,
        fileSha,
        '[automated] Update Design Tokens'
      );

      // Step 8: Check if PR exists, create if not
      console.log('\n8. Checking for existing PR...');

      let prUrl;

      if (this.testMode) {
        console.log('   TEST MODE: Skipping PR creation');
        prUrl = `https://github.com/${this.config.githubOwner}/${this.config.githubRepo}/tree/${this.config.botBranch}`;
        console.log(`   Branch URL: ${prUrl}`);
      } else {
        const prInfo = await this.github.getPullRequest(this.config.botBranch, 'main');

        if (prInfo.exists) {
          console.log(`   PR already exists: #${prInfo.number}`);
          console.log(`   URL: ${prInfo.url}`);
          prUrl = prInfo.url;
        } else {
          console.log('   No PR found. Creating new PR...');
          const newPR = await this.github.createPullRequest(
            '[automated] Update Design Tokens',
            this.config.botBranch,
            'main',
            '[automated] Update Design Tokens'
          );
          prUrl = newPR.url;
        }
      }

      console.log('\n=== Workflow Complete ===\n');
      console.log(this.testMode ? `Branch: ${prUrl}` : `Pull Request: ${prUrl}`);

      return {
        success: true,
        prUrl,
        testMode: this.testMode,
      };
    } catch (error) {
      console.error('\n❌ Workflow failed:', error.message);
      console.error(error.stack);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Merge CSS using Claude API (legacy full-file merge)
   * @param {string} oldCSS
   * @param {string} newCSS
   * @returns {Promise<string>}
   */
  async mergeCSS(oldCSS, newCSS) {
    return await mergeCSS(oldCSS, newCSS, this.config.anthropicApiKey);
  }

  /**
   * Update the token section (@theme, :root, .dark-theme) using Claude API
   * @param {string} oldTokenSection
   * @param {string} newTokenSection
   * @returns {Promise<string>}
   */
  async mergeTokenSection(oldTokenSection, newTokenSection) {
    return await updateTokenSection(oldTokenSection, newTokenSection, this.config.anthropicApiKey);
  }
}
