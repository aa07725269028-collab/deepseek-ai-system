// تحديث ملف server.js
const fs = require('fs');
const path = require('path');

const newCode = `
const express = require('express');
const config = require('./config');
const app = express();

app.get('/', (req, res) => {
    res.send(\`<h1>\${config.SITE_NAME} يعمل!</h1>\`);
});

app.listen(config.PORT, () => {
    console.log(\`✅ \${config.SITE_NAME} يعمل على http://localhost:\${config.PORT}\`);
});
`;

fs.writeFileSync('server.js', newCode);
console.log('✅ تم تحديث server.js');
