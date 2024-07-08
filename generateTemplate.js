const fs = require('fs');
const path = require('path');

const folderName = process.argv[2];

if (!folderName) {
  console.error('Por favor, forneça um nome para a pasta.');
  process.exit(1);
}

const dirPath = path.join(__dirname, 'public/templates', folderName);
const indexPath = path.join(dirPath, 'index.html');
const jsonPath = path.join(dirPath, 'index.json');
const variablesPath = path.join(dirPath, 'variables.json');

if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(indexPath, '');
fs.writeFileSync(jsonPath, '{}');
fs.writeFileSync(variablesPath, JSON.stringify({
  query: {
    must: [],
    must_not: []
  }
}, null, 2));

console.log(`Template ${folderName} criado com sucesso em /public/templates/${folderName}`);
