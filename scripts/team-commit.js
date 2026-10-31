import { execSync } from 'child_process';

/**
 * FleetDash Team Commit Helper
 * 
 * Enables the Team Lead to commit and push on behalf of team members
 * while preserving 100% accurate GitHub author attribution and branch isolation
 * as required by the Infotact Project Execution Handbook V2.0.
 */

// Member profile configuration
// If you know their exact GitHub emails, replace the placeholder emails below.
// Note: Even the GitHub no-reply email format (e.g. ID+username@users.noreply.github.com) works seamlessly!
const MEMBERS = {
  rupam: {
    name: 'Rupam',
    email: 'rupambairagya08@gmail.com',
    branch: 'main',
    githubUsername: 'Rupam852'
  },
  anish: {
    name: 'Anish Das',
    email: 'anishdas061106@gmail.com', // Replace with Anish's GitHub email if different
    branch: 'member-anish',
    githubUsername: 'Anish061106'
  },
  mistu: {
    name: 'Mistu Naskar',
    email: 'mamma30y@users.noreply.github.com', // Replace with Mistu's GitHub email if different
    branch: 'member-mistu',
    githubUsername: 'mamma30y'
  },
  subhankari: {
    name: 'SUBHANKARI MONDAL',
    email: 'subhankarim303-wq@users.noreply.github.com', // Replace with Subhankari's GitHub email if different
    branch: 'member-subhankari',
    githubUsername: 'subhankarim303-wq'
  }
};

const args = process.argv.slice(2);
const memberKey = (args[0] || '').toLowerCase();
const commitMessage = args.slice(1).join(' ');

if (!memberKey || !MEMBERS[memberKey as keyof typeof MEMBERS]) {
  console.log('===============================================================');
  console.log('⚡ FleetDash Team Commit & Branch Automation');
  console.log('===============================================================');
  console.log('Usage: node scripts/team-commit.js <member> "<commit-message>"');
  console.log('\nAvailable Members:');
  console.log('  - rupam      ➔ Branch: main               (GitHub: Rupam852)');
  console.log('  - anish      ➔ Branch: member-anish       (GitHub: Anish061106)');
  console.log('  - mistu      ➔ Branch: member-mistu       (GitHub: mamma30y)');
  console.log('  - subhankari ➔ Branch: member-subhankari  (GitHub: subhankarim303-wq)');
  console.log('\nExample:');
  console.log('  node scripts/team-commit.js anish "feat(geospatial): add turf polygon intersection rules"');
  console.log('===============================================================');
  process.exit(1);
}

if (!commitMessage) {
  console.error('❌ Error: Commit message is required.');
  process.exit(1);
}

const member = MEMBERS[memberKey as keyof typeof MEMBERS];

try {
  console.log(`\n[Git] Switching to branch: ${member.branch}...`);
  execSync(`git checkout ${member.branch}`, { stdio: 'inherit' });

  console.log(`[Git] Staging files...`);
  execSync(`git add .`, { stdio: 'inherit' });

  console.log(`[Git] Committing as ${member.name} (${member.email})...`);
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: member.name,
    GIT_AUTHOR_EMAIL: member.email,
    GIT_COMMITTER_NAME: member.name,
    GIT_COMMITTER_EMAIL: member.email
  };

  execSync(`git commit -m "${commitMessage}"`, { env, stdio: 'inherit' });

  console.log(`\n✅ Commit created successfully under ${member.name}!`);
  console.log(`To push to GitHub, run: git push -u origin ${member.branch}`);
} catch (err: unknown) {
  console.error('❌ Failed to execute commit:', err instanceof Error ? err.message : err);
  process.exit(1);
}
