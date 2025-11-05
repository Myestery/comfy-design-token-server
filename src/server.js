import express from 'express';
import dotenv from 'dotenv';
import { TokenUpdateWorkflow } from './workflow.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse text/plain as raw text
app.use(express.text({ limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Comfy Design Token Server',
    version: '1.0.0',
  });
});

// Webhook endpoint to receive CSS from Figma plugin
app.post('/webhook/figma-tokens', async (req, res) => {
  try {
    const css = req.body;

    if (!css || typeof css !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: CSS content is required',
      });
    }

    console.log(`\n📥 Received CSS update (${css.length} characters)`);

    // Validate environment variables
    const requiredEnvVars = [
      'ANTHROPIC_API_KEY',
      'GITHUB_TOKEN',
      'GITHUB_OWNER',
      'GITHUB_REPO',
      'TARGET_FILE_PATH',
      'BOT_BRANCH',
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Check for test mode
    const testMode = req.query.test === 'true' || process.env.TEST_MODE === 'true';

    if (testMode) {
      console.log('⚠️  TEST MODE ENABLED - PR creation will be skipped');
    }

    // Respond immediately to the client
    res.json({
      success: true,
      message: 'Design tokens update queued for processing',
    });

    // Process the update asynchronously
    setImmediate(async () => {
      try {
        // Create workflow instance
        const workflow = new TokenUpdateWorkflow({
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
          githubToken: process.env.GITHUB_TOKEN,
          githubOwner: process.env.GITHUB_OWNER,
          githubRepo: process.env.GITHUB_REPO,
          targetFilePath: process.env.TARGET_FILE_PATH,
          botBranch: process.env.BOT_BRANCH,
          testMode: testMode,
        });

        // Process the update
        const result = await workflow.processUpdate(css);

        if (result.success) {
          console.log(`\n✅ Update complete: ${result.prUrl}\n`);
        } else {
          console.error(`\n❌ Update failed: ${result.error}\n`);
        }
      } catch (error) {
        console.error('❌ Error in async processing:', error);
      }
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Comfy Design Token Server');
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook/figma-tokens`);
  console.log('\n✅ Server ready to receive design token updates\n');
});
