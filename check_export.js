const fs = require('fs');
const js = fs.readFileSync('qrtest.js', 'utf8');
const regex = /exports\s*=\s*([^,]+)|window\.([^=]+)\s*=/g;
let matches = js.match(regex);
console.log(matches ? matches.slice(-5) : "no match");
