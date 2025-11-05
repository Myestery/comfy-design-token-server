/**
 * CSS Parser for extracting and manipulating @theme blocks
 */

/**
 * Extract @theme blocks from CSS content with line numbers
 * @param {string} cssContent - The full CSS content
 * @returns {Array<{type: string, startLine: number, endLine: number, content: string}>}
 */
export function extractThemeBlocks(cssContent) {
  const lines = cssContent.split('\n');
  const blocks = [];

  let inBlock = false;
  let blockType = null;
  let blockStartLine = -1;
  let blockContent = [];
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // Lines are 1-indexed

    // Check for @theme declaration
    if (!inBlock && line.trim().startsWith('@theme')) {
      inBlock = true;
      blockStartLine = lineNumber;
      blockContent = [line];
      braceDepth = 0;

      // Determine block type (theme or theme inline)
      if (line.includes('inline')) {
        blockType = 'theme inline';
      } else {
        blockType = 'theme';
      }

      // Count braces in the same line
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      continue;
    }

    if (inBlock) {
      blockContent.push(line);

      // Count braces
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Check if block is complete
      if (braceDepth === 0 && blockContent.length > 1) {
        blocks.push({
          type: blockType,
          startLine: blockStartLine,
          endLine: lineNumber,
          content: blockContent.join('\n')
        });

        inBlock = false;
        blockType = null;
        blockContent = [];
      }
    }
  }

  return blocks;
}

/**
 * Replace lines in CSS content
 * @param {string} originalContent - The original CSS content
 * @param {number} startLine - Start line (1-indexed)
 * @param {number} endLine - End line (1-indexed, inclusive)
 * @param {string} newContent - New content to replace with
 * @returns {string} Updated CSS content
 */
export function replaceLines(originalContent, startLine, endLine, newContent) {
  const lines = originalContent.split('\n');

  // Validate line numbers
  if (startLine < 1 || endLine > lines.length || startLine > endLine) {
    throw new Error(`Invalid line range: ${startLine}-${endLine} (total lines: ${lines.length})`);
  }

  // Split new content into lines
  const newLines = newContent.split('\n');

  // Replace the specified range
  // Note: Array indices are 0-based, but line numbers are 1-based
  const before = lines.slice(0, startLine - 1);
  const after = lines.slice(endLine);

  return [...before, ...newLines, ...after].join('\n');
}

/**
 * Extract only the first @theme block (main primitive tokens)
 * @param {string} cssContent - The full CSS content
 * @returns {{startLine: number, endLine: number, content: string} | null}
 */
export function extractMainThemeBlock(cssContent) {
  const blocks = extractThemeBlocks(cssContent);

  // Return the first non-inline @theme block
  return blocks.find(block => block.type === 'theme') || null;
}

/**
 * Extract the design token section (@theme, :root, and .dark-theme blocks)
 * This finds the start of @theme and the end of .dark-theme to get the full range
 * @param {string} cssContent - The full CSS content
 * @returns {{startLine: number, endLine: number, content: string} | null}
 */
export function extractDesignTokenSection(cssContent) {
  const lines = cssContent.split('\n');

  let themeStartLine = -1;
  let rootStartLine = -1;
  let darkThemeStartLine = -1;
  let darkThemeEndLine = -1;

  let inBlock = false;
  let braceDepth = 0;
  let currentBlockType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const trimmedLine = line.trim();

    // Check for @theme declaration (first one only, not inline)
    if (themeStartLine === -1 && trimmedLine.startsWith('@theme') && !trimmedLine.includes('inline')) {
      themeStartLine = lineNumber;
      inBlock = true;
      currentBlockType = 'theme';
      braceDepth = 0;
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      continue;
    }

    // Check for :root block
    if (rootStartLine === -1 && trimmedLine.startsWith(':root')) {
      rootStartLine = lineNumber;
      inBlock = true;
      currentBlockType = 'root';
      braceDepth = 0;
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      continue;
    }

    // Check for .dark-theme block
    if (trimmedLine.startsWith('.dark-theme')) {
      darkThemeStartLine = lineNumber;
      inBlock = true;
      currentBlockType = 'dark-theme';
      braceDepth = 0;
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      continue;
    }

    if (inBlock) {
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Check if block is complete
      if (braceDepth === 0) {
        if (currentBlockType === 'dark-theme') {
          darkThemeEndLine = lineNumber;
          break; // We found the end of .dark-theme, we're done
        }
        inBlock = false;
        currentBlockType = null;
      }
    }
  }

  // Validate we found all three blocks
  if (themeStartLine === -1 || darkThemeEndLine === -1) {
    return null;
  }

  // Extract the content from themeStartLine to darkThemeEndLine
  const sectionLines = lines.slice(themeStartLine - 1, darkThemeEndLine);
  const content = sectionLines.join('\n');

  return {
    startLine: themeStartLine,
    endLine: darkThemeEndLine,
    content,
    blocks: {
      theme: themeStartLine,
      root: rootStartLine,
      darkTheme: darkThemeStartLine,
      darkThemeEnd: darkThemeEndLine
    }
  };
}
