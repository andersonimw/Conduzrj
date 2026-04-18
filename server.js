const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use((req, res, next) => {
  console.log('>>>', req.method, req.url, JSON.stringify(req.headers['content-type']||''));
  next();
});
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

// Inicializa banco JSON
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      config: {
        nome: "Conduz RJ",
        motorista: "Seu Nome",
        telefone: "21999999999",
        veiculo: "Toyota Corolla 2023",
        foto: "",
        sobre: "Motorista particular profissional no Rio de Janeiro. Pontualidade, conforto e discrição garantidos.",
        instagram: "",
        senha_admin: "conduzrj2024"
      },
      servicos: [
        { id: 1, nome: "Corrida Avulsa", descricao: "Trajeto simples de A a B", preco: "A consultar", icone: "car", ativo: true },
        { id: 2, nome: "Diária (8h)", descricao: "Motorista à sua disposição por 8 horas", preco: "R$ 450,00", icone: "clock", ativo: true },
        { id: 3, nome: "Meio Período (4h)", descricao: "Motorista à sua disposição por 4 horas", preco: "R$ 250,00", icone: "clock", ativo: true },
        { id: 4, nome: "Transfer Aeroporto", descricao: "GIG ou SDU com pontualidade garantida", preco: "R$ 120,00", icone: "plane", ativo: true },
        { id: 5, nome: "Executivo Corporativo", descricao: "Para empresas e reuniões de negócios", preco: "A consultar", icone: "briefcase", ativo: true },
        { id: 6, nome: "Eventos e Shows", descricao: "Rock in Rio, Réveillon, casamentos e festas", preco: "A consultar", icone: "star", ativo: true },
        { id: 7, nome: "Turismo pelo RJ", descricao: "Roteiros personalizados pela cidade maravilhosa", preco: "R$ 350,00", icone: "map", ativo: true }
      ],
      horarios: {
        segunda: { ativo: true, inicio: "07:00", fim: "22:00" },
        terca:   { ativo: true, inicio: "07:00", fim: "22:00" },
        quarta:  { ativo: true, inicio: "07:00", fim: "22:00" },
        quinta:  { ativo: true, inicio: "07:00", fim: "22:00" },
        sexta:   { ativo: true, inicio: "07:00", fim: "22:00" },
        sabado:  { ativo: true, inicio: "08:00", fim: "20:00" },
        domingo: { ativo: false, inicio: "09:00", fim: "18:00" }
      },
      pedidos: [],
      avaliacoes: [
        { nome: "Carlos M.", texto: "Excelente profissional! Pontual e veículo impecável.", estrelas: 5, data: "2024-03-10" },
        { nome: "Fernanda R.", texto: "Usei para transfer no GIG. Perfeito, recomendo muito!", estrelas: 5, data: "2024-03-15" },
        { nome: "Roberto S.", texto: "Motorista discreto e educado. Virou meu motorista fixo.", estrelas: 5, data: "2024-03-20" }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function getDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

initDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'conduzrj_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    secure: false,
    sameSite: 'lax',
    httpOnly: false
  }
}));

// API - dados públicos
app.get('/api/dados', (req, res) => {
  const db = getDB();
  res.json({
    config: { ...db.config, senha_admin: undefined },
    servicos: db.servicos.filter(s => s.ativo),
    horarios: db.horarios,
    avaliacoes: db.avaliacoes,
    frota: db.frota || []
  });
});

// API - enviar pedido
app.post('/api/pedido', (req, res) => {
  const db = getDB();
  const { nome, telefone, servico, data, hora, origem, destino, observacoes } = req.body;
  if (!nome || !telefone || !servico || !data || !hora) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios' });
  }
  const pedido = {
    id: Date.now(),
    nome, telefone, servico, data, hora,
    origem: origem || '',
    destino: destino || '',
    observacoes: observacoes || '',
    status: 'pendente',
    criado_em: new Date().toISOString()
  };
  db.pedidos.push(pedido);
  saveDB(db);
  const msg = `Olá! Sou ${nome}. Gostaria de solicitar: *${servico}* para o dia *${data}* às *${hora}*. ${origem ? 'Origem: ' + origem + '.' : ''} ${destino ? 'Destino: ' + destino + '.' : ''} ${observacoes ? 'Obs: ' + observacoes : ''}`;
  const tel = db.config.telefone.replace(/\D/g, '');
  res.json({ sucesso: true, whatsapp: `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}` });
});

// ADMIN - login
app.post('/api/admin/login', (req, res) => {
  const db = getDB();
  if (req.body.senha === db.config.senha_admin) {
    req.session.admin = true;
    res.json({ sucesso: true });
  } else {
    res.status(401).json({ erro: 'Senha incorreta' });
  }
});

app.get('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ sucesso: true });
});

function authAdmin(req, res, next) {
  if (req.session.admin) return next();
  if (req.headers['x-admin-token'] === process.env.ADMIN_TOKEN || req.headers['x-admin-token'] === 'conduzrj2024') return next();
  res.status(401).json({ erro: 'Não autorizado' });
}

// ADMIN - pedidos
app.get('/api/admin/pedidos', authAdmin, (req, res) => {
  const db = getDB();
  res.json(db.pedidos.reverse());
});

app.put('/api/admin/pedido/:id', authAdmin, async (req, res) => {
  const db = getDB();
  const idx = db.pedidos.findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const statusAnterior = db.pedidos[idx].status;
  db.pedidos[idx].status = req.body.status;
  saveDB(db);

  // Enviar recibo por e-mail quando concluido
  if (req.body.status === 'concluido' && statusAnterior !== 'concluido') {
    const pedido = db.pedidos[idx];
    if (pedido.email) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'ConduzRJ <recibo@conduzrj.com.br>',
          to: pedido.email,
          subject: 'Recibo da sua viagem — ConduzRJ',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#fff">
              <div style="text-align:center;margin-bottom:24px">
                <h1 style="color:#c9a84c;font-size:28px;margin:0">ConduzRJ</h1>
                <p style="color:#666;font-size:13px;margin:4px 0 0">Transfer & Chauffeur Rio de Janeiro</p>
              </div>
              <div style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:24px">
                <h2 style="color:#111;font-size:18px;margin:0 0 16px">✅ Viagem Concluída</h2>
                <p style="color:#333;margin:8px 0"><strong>Cliente:</strong> ${pedido.nome}</p>
                <p style="color:#333;margin:8px 0"><strong>Serviço:</strong> ${pedido.servico}</p>
                <p style="color:#333;margin:8px 0"><strong>Data:</strong> ${pedido.data}</p>
                <p style="color:#333;margin:8px 0"><strong>Horário:</strong> ${pedido.hora}</p>
                ${pedido.origem ? `<p style="color:#333;margin:8px 0"><strong>Origem:</strong> ${pedido.origem}</p>` : ''}
                ${pedido.destino ? `<p style="color:#333;margin:8px 0"><strong>Destino:</strong> ${pedido.destino}</p>` : ''}
                ${pedido.valorEstimado ? `<p style="color:#c9a84c;margin:8px 0;font-size:18px"><strong>Valor:</strong> ${pedido.valorEstimado}</p>` : ''}
              </div>
              <div style="text-align:center;margin-bottom:24px">
                <p style="color:#333;font-size:15px">Foi um prazer te atender! 😊</p>
                <p style="color:#666;font-size:13px">Se quiser, deixe uma avaliação no Google:</p>
                <a href="https://maps.app.goo.gl/1RSGPH3tBvvU6cpi6" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#c9a84c;color:#000;border-radius:8px;font-weight:700;text-decoration:none">⭐ Avaliar no Google</a>
              </div>
              <div style="text-align:center;border-top:1px solid #eee;padding-top:16px">
                <p style="color:#999;font-size:12px">ConduzRJ — Transfer & Chauffeur Rio de Janeiro</p>
                <p style="color:#999;font-size:12px">(21) 97672-6175 · conduzrj.onrender.com</p>
              </div>
            </div>
          `
        });
      } catch(e) {
        console.log('Erro ao enviar e-mail:', e.message);
      }
    }
  }

  res.json({ sucesso: true });
});

// ADMIN - config
app.get('/api/admin/config', authAdmin, (req, res) => {
  const db = getDB();
  res.json(db.config);
});

app.put('/api/admin/config', authAdmin, (req, res) => {
  const db = getDB();
  db.config = { ...db.config, ...req.body };
  saveDB(db);
  res.json({ sucesso: true });
});

// ADMIN - horarios
app.put('/api/admin/horarios', authAdmin, (req, res) => {
  const db = getDB();
  db.horarios = req.body;
  saveDB(db);
  res.json({ sucesso: true });
});

// ADMIN - servicos
app.put('/api/admin/servicos', authAdmin, (req, res) => {
  const db = getDB();
  db.servicos = req.body;
  saveDB(db);
  res.json({ sucesso: true });
});

// Rota admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const multer = require('multer');
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, Date.now() + '.' + ext);
  }
});
const upload = multer({ storage: multerStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Todas as rotas retornam o index

app.post('/api/admin/upload', upload.single('foto'), (req, res) => {
  console.log('UPLOAD req.file:', req.file);
  console.log('UPLOAD req.body:', req.body);
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  res.json({ sucesso: true, url: '/uploads/' + req.file.filename });
});

// Frota de veículos
app.get('/api/admin/frota', (req, res) => {
  const db = getDB();
  res.json(db.frota || []);
});

app.put('/api/admin/frota', authAdmin, (req, res) => {
  const db = getDB();
  db.frota = req.body;
  saveDB(db);
  res.json({ sucesso: true });
});
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Upload de imagens



app.listen(PORT, () => {
  console.log(`\n✅ Conduz RJ rodando em http://localhost:${PORT}`);
  console.log(`📱 Painel admin em http://localhost:${PORT}/admin`);
  console.log(`🔑 Senha admin padrão: conduzrj2024\n`);
});

// Rotas avaliações admin
app.put('/api/admin/avaliacoes-save', authAdmin, (req, res) => {
  const db = getDB();
  db.avaliacoes = req.body;
  saveDB(db);
  res.json({ sucesso: true });
});

