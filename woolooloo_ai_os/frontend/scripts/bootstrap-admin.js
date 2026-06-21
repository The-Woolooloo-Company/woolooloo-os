#!/usr/bin/env node
/**
 * Bootstrap script to create the default admin user with a hashed password.
 * Usage: node scripts/bootstrap-admin.js [password]
 * 
 * If no password is provided, a random password is generated and printed.
 * The hashed password is set via NEXT_PUBLIC_DEFAULT_ADMIN_HASH env var.
 */

const bcrypt = require('bcryptjs');

async function main() {
  const password = process.argv[2] || require('crypto').randomBytes(16).toString('hex');
  const hash = await bcrypt.hash(password, 10);
  
  console.log('=== Woolooloo AI OS - Admin Bootstrap ===');
  console.log('');
  console.log('Username: admin');
  console.log(`Password: ${password}`);
  console.log('');
  console.log('Add this to your .env file:');
  console.log(`NEXT_PUBLIC_DEFAULT_ADMIN_HASH=${hash}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change this password after first login!');
}

main().catch(console.error);
