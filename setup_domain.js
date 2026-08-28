const fs = require('fs');
const path = require('path');

const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
const entry = '\n127.0.0.1 asksofaworks.local\n';

try {
  const content = fs.readFileSync(hostsPath, 'utf8');
  if (content.includes('asksofaworks.local')) {
    console.log('==================================================');
    console.log('Domain mapping already exists in your hosts file!');
    console.log('==================================================');
  } else {
    fs.appendFileSync(hostsPath, entry, 'utf8');
    console.log('==================================================');
    console.log('SUCCESS: asksofaworks.local successfully mapped!');
    console.log('==================================================');
  }
} catch (err) {
  console.log('==================================================');
  console.log('ERROR: Access Denied. Failed to write to hosts file.');
  console.log('Reason:', err.message);
  console.log('==================================================');
  console.log('\n👉 SOLUTION: You must open your command terminal');
  console.log('   as ADMINISTRATOR to run this command!');
}
