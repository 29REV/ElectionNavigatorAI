const fs = require('fs');
const path = require('path');

const filePath = path.join('C:\\Users\\Sangamithra Perumal\\.gemini\\antigravity\\brain\\1f034acc-9cf4-4fae-8d65-52da04a3b559\\.system_generated\\steps\\163\\content.md');
const content = fs.readFileSync(filePath, 'utf8');

const regex = /\[([^\]]+)\]\(https:\/\/myneta\.info\/TamilNadu2026\/index\.php\?action=show_candidates&constituency_id=(\d+)\)/g;
const constituencies = [];
let match;

while ((match = regex.exec(content)) !== null) {
    constituencies.push({
        id: match[2],
        name: match[1].trim()
    });
}

// Remove duplicates (sometimes there are multiple links for same ID)
const uniqueConstituencies = [];
const seenIds = new Set();
for (const c of constituencies) {
    if (!seenIds.has(c.id)) {
        uniqueConstituencies.push(c);
        seenIds.add(c.id);
    }
}

fs.writeFileSync(path.join(__dirname, '../data/constituencies.json'), JSON.stringify(uniqueConstituencies, null, 2));
console.log(`Extracted ${uniqueConstituencies.length} constituencies.`);
