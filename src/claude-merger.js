import Anthropic from '@anthropic-ai/sdk';

/**
 * Merge two CSS files using Claude AI
 * @param {string} oldCSS - Current CSS from GitHub repo
 * @param {string} newCSS - New CSS from Figma
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<string>} - Merged CSS
 */
export async function mergeCSS(oldCSS, newCSS, apiKey) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const prompt = `You are updating a design system CSS file.

OLD CSS (current in repo):
\`\`\`css
${oldCSS}
\`\`\`

NEW CSS (from Figma):
\`\`\`css
${newCSS}
\`\`\`

IMPORTANT RULES:
1. **Primitive tokens** (@theme block): Update values for existing colors, add new primitive tokens
2. **Semantic tokens** (:root and .dark-theme): Update values, add new semantic tokens
3. **Component tokens** (marked with "UPDATE ONLY IF EXISTS"):
   - Check if the component token variable exists in OLD CSS
   - If YES: Update its value to match NEW CSS
   - If NO: Skip it completely, do NOT add it
   - Component tokens can appear in multiple places (:root, .dark-theme, etc.)
4. **Preserve structure**: Keep all sections, comments, and formatting from OLD CSS
5. **CSS variable references**: The NEW CSS uses var() with fallbacks - preserve these exactly
6. **Keep everything else**: All non-token CSS rules, utilities, and styles must remain unchanged

COMPONENT TOKEN UPDATE LOGIC:
The NEW CSS includes component tokens with comments like "/* UPDATE ONLY IF EXISTS */".
For each of these:
- Search the OLD CSS for that variable name (e.g., --node-background)
- If found anywhere in OLD CSS: update its value
- If not found: ignore it completely

Task: Intelligently merge the NEW tokens into the OLD CSS structure:
- Update all primitive color values in @theme block
- Update all semantic token values in :root and .dark-theme blocks
- Add any NEW primitive or semantic tokens in appropriate sections
- For component tokens: ONLY update values if the variable already exists in OLD CSS
- Preserve all formatting, comments, structure, and non-token CSS

Output only the final merged CSS file with no explanations.`;

  console.log('Calling Claude API to merge CSS files...');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from the response
  const mergedCSS = message.content[0].text;

  console.log(`✓ Claude merged CSS (${mergedCSS.length} characters)`);

  return mergedCSS;
}

/**
 * Clean markdown formatting from Claude's response
 * @param {string} text - Raw response text
 * @returns {string} Clean CSS content
 */
function cleanMarkdownFormatting(text) {
  let cleaned = text.trim();

  // Remove markdown code fences
  cleaned = cleaned.replace(/^```css\n?/gm, '');
  cleaned = cleaned.replace(/^```\n?/gm, '');
  cleaned = cleaned.replace(/```$/gm, '');

  // Remove any leading/trailing whitespace again
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Update the design token section (@theme, :root, .dark-theme) using Claude AI
 * @param {string} oldTokenSection - Current token section from GitHub
 * @param {string} newTokenSection - New token section from Figma
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<string>} - Updated token section (clean CSS, no markdown)
 */
export async function updateTokenSection(oldTokenSection, newTokenSection, apiKey) {
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const prompt = `You are updating the design token section of a CSS file. This section contains three main blocks:
1. @theme - Primitive color tokens
2. :root - Light mode semantic tokens
3. .dark-theme - Dark mode semantic tokens

CURRENT TOKEN SECTION:
${oldTokenSection}

NEW TOKENS TO MERGE:
${newTokenSection}

RULES:
1. Update existing token values to match new tokens EXACTLY as they appear in NEW
2. Add new tokens in the appropriate blocks (maintain structure and ordering)
3. Preserve all comments, section headers, and formatting from OLD
4. Keep the block structures intact (@theme { }, :root { }, .dark-theme { })
5. If a token exists in both OLD and NEW, use the NEW value EXACTLY (including var() syntax)
6. If a token is only in NEW, add it to the appropriate block
7. If a token is only in OLD, keep it unchanged
8. DO NOT add fallbacks to var() references - keep them exactly as provided
9. DO NOT remove fallbacks from var() references - keep them exactly as provided
10. Preserve the exact var() syntax from NEW tokens (with or without fallbacks)

OUTPUT REQUIREMENTS:
- Output ONLY the updated token section content
- DO NOT wrap output in markdown code blocks (no \`\`\`css)
- DO NOT add explanations or comments outside the CSS
- Start with @theme and end with the closing brace of .dark-theme
- Match the exact formatting and syntax from the inputs

Output the updated token section:`;

  console.log('Calling Claude API to update token section (@theme, :root, .dark-theme)...');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text and clean any markdown formatting
  let updatedTokenSection = message.content[0].text;
  updatedTokenSection = cleanMarkdownFormatting(updatedTokenSection);

  console.log(`✓ Claude updated token section (${updatedTokenSection.length} characters)`);

  return updatedTokenSection;
}

/**
 * @deprecated Use updateTokenSection instead
 * Kept for backward compatibility
 */
export async function updateThemeBlock(oldThemeBlock, newThemeTokens, apiKey) {
  return updateTokenSection(oldThemeBlock, newThemeTokens, apiKey);
}
