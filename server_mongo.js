require("dotenv").config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;

// Conecta MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✅ MongoDB conectado!');
}).catch(e => console.error('❌ Erro MongoDB:', e.message));

// Schema único para todos os dados
const DadosSchema = new mongoose.Schema({ chave: String, valor: mongoose.Schema.Types.Mixed });
const Dados = mongoose.model('Dados', DadosSchema);

async function getDB() {
  const docs = await Dados.find({});
  const db = {};
  docs.forEach(d => db[d.chave] = d.valor);
  return db;
}

async function saveDB(chave, valor) {
  await Dados.findOneAndUpdate({ chave }, { valor }, { upsert: true, new: true });
}

// Multer
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'conduzrj_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false, sameSite: 'lax', httpOnly: false }
}));

app.use((req, res, next) => {
  console.log('>>>', req.method, req.url);
  next();
});

function authAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.status(401).json({ erro: 'Não autorizado' });
}

// API pública
app.get('/api/dados', async (req, res) => {
  const db = await getDB();
  res.json({
    config: { ...(db.config||{}), senha_admin: undefined },
    servicos: (db.servicos||[]).filter(s => s.ativo),
    horarios: db.horarios || {},
    avaliacoes: db.avaliacoes || [],
    frota: db.frota || []
  });
});

app.post('/api/pedido', async (req, res) => {
  const { nome, telefone, email, servico, data, hora, origem, destino, observacoes } = req.body;
  if (!nome || !telefone || !servico || !data || !hora) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios' });
  }
  const db = await getDB();
  const pedidos = db.pedidos || [];
  const pedido = {
    id: Date.now(),
    nome, telefone, email: email || '', servico, data, hora,
    origem: origem || '',
    destino: destino || '',
    observacoes: observacoes || '',
    status: 'pendente',
    criado_em: new Date().toISOString()
  };
  pedidos.push(pedido);
  await saveDB('pedidos', pedidos);
  const config = db.config || {};
  const tel = (config.telefone||'').replace(/\D/g, '');
  const email = req.body.email || '';
  const km = req.body.km || '';
  const valorEstimado = req.body.valorEstimado || '';
  const som = req.body.som || '';
  const musica = req.body.musica || '';
  const artista = req.body.artista || '';
  const ar = req.body.ar || '';
  const agua = req.body.agua || '';
  const passageiros = req.body.passageiros || '1';
  const veiculo = req.body.veiculo || '';
  const parada = req.body.parada || '';
  const voo = req.body.voo || '';
  const bagagens = req.body.bagagens || '';
  const pet = req.body.pet || '';

  const msg = `🚗 *NOVA SOLICITAÇÃO — ConduzRJ*

👤 *Cliente:* ${nome}
📱 *WhatsApp:* ${tel}
📧 *E-mail:* ${email || 'Não informado'}
🛎️ *Serviço:* ${servico}
📅 *Data:* ${data}
⏰ *Horário:* ${hora}
${km ? '📍 *KM estimado:* '+km+'km' : ''}
${valorEstimado ? '💰 *Valor estimado:* '+valorEstimado : ''}
${origem ? '🟢 *Origem:* '+origem : ''}
${destino ? '🔴 *Destino:* '+destino : ''}
${veiculo ? '🚗 *Veículo preferido:* '+veiculo : ''}
${parada ? '🛑 *Parada adicional:* '+parada : ''}
${voo ? '✈️ *Número do voo:* '+voo : ''}

🎵 *Preferências da viagem:*
${som === 'silencio' ? '🔇 Viagem em silêncio' : som === 'musica' ? '🎵 Com música: '+(musica === 'Outro' ? artista : musica) : ''}
${ar ? '❄️ Ar condicionado: '+ar : ''}
${agua ? '💧 Água mineral: '+agua : ''}
${pet ? '🐾 Pet: '+pet : ''}

👥 *Passageiros:* ${passageiros}
${bagagens && bagagens !== 'Nenhuma' ? '🧳 *Bagagens:* '+bagagens : ''}
${observacoes ? '📝 *Obs:* '+observacoes : ''}`;
  res.json({ sucesso: true, whatsapp: `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}` });
});

// Rota de ping leve para cronjob
app.get('/ping', (req, res) => {
  res.send('ok');
});

// Admin - login
app.post('/api/admin/login', async (req, res) => {
  const db = await getDB();
  const senha = (db.config||{}).senha_admin || process.env.ADMIN_PASSWORD || 'conduzrj2024';
  if (req.body.senha === senha) {
    req.session.admin = true;
    req.session.save(() => res.json({ sucesso: true }));
  } else {
    res.status(401).json({ erro: 'Senha incorreta' });
  }
});

app.get('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ sucesso: true });
});

app.get('/api/admin/pedidos', authAdmin, async (req, res) => {
  const db = await getDB();
  res.json((db.pedidos||[]).reverse());
});

app.put('/api/admin/pedido/:id', authAdmin, async (req, res) => {
  const db = await getDB();
  const pedidos = db.pedidos || [];
  const idx = pedidos.findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Pedido não encontrado' });
  pedidos[idx].status = req.body.status;
  await saveDB('pedidos', pedidos);
  res.json({ sucesso: true });
});

app.get('/api/admin/config', authAdmin, async (req, res) => {
  const db = await getDB();
  res.json(db.config || {});
});

app.put('/api/admin/config', authAdmin, async (req, res) => {
  const db = await getDB();
  const config = { ...(db.config||{}), ...req.body };
  await saveDB('config', config);
  res.json({ sucesso: true });
});

app.put('/api/admin/horarios', authAdmin, async (req, res) => {
  await saveDB('horarios', req.body);
  res.json({ sucesso: true });
});

app.put('/api/admin/servicos', authAdmin, async (req, res) => {
  await saveDB('servicos', req.body);
  res.json({ sucesso: true });
});

app.put('/api/admin/avaliacoes-save', authAdmin, async (req, res) => {
  await saveDB('avaliacoes', req.body);
  res.json({ sucesso: true });
});

app.post('/api/admin/upload', upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'conduzrj', resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve(result)
      );
      Readable.from(req.file.buffer).pipe(stream);
    });
    res.json({ sucesso: true, url: result.secure_url });
  } catch(e) {
    console.error('Cloudinary erro:', e);
    res.status(500).json({ erro: 'Erro ao fazer upload' });
  }
});

app.get('/api/admin/frota', async (req, res) => {
  const db = await getDB();
  res.json(db.frota || []);
});

app.put('/api/admin/frota', authAdmin, async (req, res) => {
  await saveDB('frota', req.body);
  res.json({ sucesso: true });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// Salvar token de notificacao
let tokensNotificacao = [];
app.post("/api/salvar-token", (req, res) => {
  const { token } = req.body;
  if (token && !tokensNotificacao.includes(token)) tokensNotificacao.push(token);
  res.json({ sucesso: true });
});

// Enviar notificacao push
async function enviarNotificacao(titulo, corpo) {
  if (tokensNotificacao.length === 0) return;
  const axios = require("axios");
  const { GoogleAuth } = require("google-auth-library");
  try {
    for (const token of tokensNotificacao) {
      await axios.post("https://fcm.googleapis.com/v1/projects/conduzrj/messages:send", {
        message: { token, notification: { title: titulo, body: corpo } }
      });
    }
  } catch(e) { console.log("Erro notificacao:", e.message); }
}
// Verificar disponibilidade de horario
app.get("/api/verificar-horario", async (req, res) => {
  const { data, hora } = req.query;
  if (!data || !hora) return res.json({ disponivel: true });
  const db = await getDB();
  const pedidos = db.pedidos || [];
  const agora = new Date();
  const conflito = pedidos.find(p => {
    if (p.data !== data || p.hora !== hora || p.status === "cancelado") return false;
    const dataHora = new Date(p.data + "T" + p.hora);
    return dataHora > agora;
  });
  res.json({ disponivel: !conflito });
});
app.listen(PORT, () => {
  console.log(`✅ Conduz RJ rodando em http://localhost:${PORT}`);
  console.log(`📱 Painel admin em http://localhost:${PORT}/admin`);
});
