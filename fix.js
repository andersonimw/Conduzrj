const fs = require('fs');
let c = fs.readFileSync('server.js','utf8');
c = c.replace(
`// Todas as rotas retornam o index
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});`,
`// Rota admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Todas as rotas retornam o index
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});`
);
fs.writeFileSync('server.js', c);
console.log('CORRIGIDO');
