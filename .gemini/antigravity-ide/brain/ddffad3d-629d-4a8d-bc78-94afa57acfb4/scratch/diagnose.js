const fs = require('fs');
const content = fs.readFileSync('src/locales/en.json', 'utf8');
try {
  JSON.parse(content);
  console.log('Parsed successfully!');
} catch (e) {
  console.log('Error message:', e.message);
  const match = e.message.match(/position (\d+)/);
  if (match) {
    const pos = parseInt(match[1], 10);
    console.log('Snippet:', JSON.stringify(content.slice(Math.max(0, pos - 100), pos + 100)));
  }
}
