/**
 * Script to update table references in the codebase
 * 
 * This script will:
 * 1. Update 'account_details' to 'customer_details'
 * 2. Update 'tailor_profiles' to 'tailor_details'
 * 
 * How to run:
 * 1. Make sure Node.js is installed
 * 2. Run: node scripts/update-table-references.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const replacements = [
  { from: 'account_details', to: 'customer_details' },
  { from: 'tailor_profiles', to: 'tailor_details' }
];

// Helper to get files with matches
function getFilesWithMatches(searchTerm) {
  try {
    // Use grep to find files containing the terms (works on Unix-like systems)
    const command = `grep -l "${searchTerm}" --include="*.ts" --include="*.tsx" -r ./app`;
    const output = execSync(command, { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error(`Error searching for '${searchTerm}':`, error.message);
    return [];
  }
}

// Process a file
function processFile(filePath, from, to) {
  console.log(`Processing ${filePath}...`);
  
  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains the pattern in actual code (not in comments)
    const regex = new RegExp(`\\.from\\(['"']${from}['"']\\)`, 'g');
    if (!regex.test(content)) {
      console.log(`  No actionable matches in ${filePath}`);
      return;
    }
    
    // Make the replacement
    const updatedContent = content.replace(regex, `.from('${to}')`);
    
    // Write the updated content back
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`  Updated ${filePath}`);
  } catch (error) {
    console.error(`  Error processing ${filePath}:`, error.message);
  }
}

// Main function
async function main() {
  console.log('Starting table reference update...');
  
  // Process each replacement
  for (const { from, to } of replacements) {
    console.log(`\nReplacing '${from}' with '${to}'...`);
    
    // Get files that need updating
    const filesToUpdate = getFilesWithMatches(from);
    
    if (filesToUpdate.length === 0) {
      console.log(`  No files found with '${from}'`);
      continue;
    }
    
    console.log(`  Found ${filesToUpdate.length} files to update`);
    
    // Process each file
    for (const file of filesToUpdate) {
      processFile(file, from, to);
    }
  }
  
  console.log('\nUpdate complete!');
}

// Run the script
main().catch(console.error); 