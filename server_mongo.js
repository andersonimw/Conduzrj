require("dotenv").config();
const admin = require("firebase-admin");

if(!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require("./firebase-service-account.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin inicializado");
  } catch(e) {
    console.log("⚠️ Firebase Admin não configurado:", e.message);
  }
}

const webpush = require('web-push');
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:conduzrjtransfer@gmail.com',
  process.env.VAPID_PUBLIC_KEY || 'BLU2busxH85trFqeHSMl68XkFZJC63kDrHMC9VLpzDKBDdqPVeNbmEkhVEoB34vwPEDAAo3OxsCKz-tc2J2Fx9s',
  process.env.VAPID_PRIVATE_KEY || 'kPLG4Nf0e6mqkpHi0VMtzHeWaPuQHTvIj5ENg9ItJrA'
);

async function enviarNotificacaoFCM(titulo, corpo, tokens) {
  if(!tokens || tokens.length === 0) return;
  for(const token of tokens) {
    try {
      const subscription = JSON.parse(token);
      await webpush.sendNotification(subscription, JSON.stringify({
        title: titulo,
        body: corpo
      }));
      console.log("✅ Notificação Web Push enviada");
    } catch(e) {
      console.log("❌ Erro notificação:", e.message);
    }
  }
}
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'conduzrjtransfer@gmail.com',
    pass: 'ooxx forp bkkl aymm'
  }
});
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
    km: req.body.km || '',
    valorEstimado: req.body.valorEstimado || '',
    som: req.body.som || '',
    musica: req.body.musica || '',
    artista: req.body.artista || '',
    ar: req.body.ar || '',
    agua: req.body.agua || '',
    veiculo: req.body.veiculo || '',
    parada: req.body.parada || '',
    voo: req.body.voo || '',
    passageiros: req.body.passageiros || '1',
    bagagens: req.body.bagagens || '',
    pet: req.body.pet || '',
    carregador: req.body.carregador || '',
    status: 'pendente',
    criado_em: new Date().toISOString()
  };
  pedidos.push(pedido);
  await saveDB('pedidos', pedidos);
  const config = db.config || {};
  const tel = (config.telefone||'').replace(/\D/g, '');
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
${pet ? '🐾 Pet: '+pet+'\n' : ''}${req.body.carregador ? '🔌 Carregador: '+req.body.carregador : ''}

👥 *Passageiros:* ${passageiros}
${bagagens && bagagens !== 'Nenhuma' ? '🧳 *Bagagens:* '+bagagens : ''}
${observacoes ? '📝 *Obs:* '+observacoes : ''}`;
  // Enviar notificacao push para o admin
  enviarNotificacao(
    '🚗 Novo pedido — ConduzRJ',
    nome + ' · ' + servico + ' · ' + data + ' às ' + hora
  );

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
  const statusAnterior = pedidos[idx].status;
  pedidos[idx].status = req.body.status;
  await saveDB('pedidos', pedidos);

  // Enviar recibo por e-mail quando concluido
  if (req.body.status === 'concluido' && statusAnterior !== 'concluido') {
    const pedido = pedidos[idx];
    console.log('Email do pedido:', pedido.email);
    if (pedido.email) {
      try {
        console.log('Tentando enviar e-mail para:', pedido.email);
        const info = await transporter.sendMail({
          from: 'ConduzRJ <conduzrjtransfer@gmail.com>',
          to: pedido.email,
          subject: 'Recibo da sua viagem — ConduzRJ',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#fff">
              <div style="background:#c9a84c;padding:20px;border-radius:8px 8px 0 0;text-align:center">
                <h1 style="color:#fff;font-size:24px;margin:0">🚗 ConduzRJ</h1>
                <p style="color:#fff;margin:4px 0;font-size:14px">Transfer & Chauffeur Rio de Janeiro</p>
              </div>
              <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px">
                <h2 style="color:#111;font-size:20px;margin-bottom:16px">✅ Viagem Concluída!</h2>
                <p style="color:#333;margin:8px 0"><strong>👤 Cliente:</strong> ${pedido.nome}</p>
                <p style="color:#333;margin:8px 0"><strong>🔔 Serviço:</strong> ${pedido.servico}</p>
                <p style="color:#333;margin:8px 0"><strong>📅 Data:</strong> ${pedido.data}</p>
                <p style="color:#333;margin:8px 0"><strong>⏰ Horário:</strong> ${pedido.hora}</p>
                ${pedido.origem ? `<p style="color:#333;margin:8px 0"><strong>🟢 Origem:</strong> ${pedido.origem}</p>` : ''}
                ${pedido.destino ? `<p style="color:#333;margin:8px 0"><strong>🔴 Destino:</strong> ${pedido.destino}</p>` : ''}
                ${pedido.km ? `<p style="color:#333;margin:8px 0"><strong>📍 KM estimado:</strong> ${pedido.km}km</p>` : ''}
                ${pedido.valorEstimado ? `<p style="color:#c9a84c;margin:12px 0;font-size:18px"><strong>💰 Valor: ${pedido.valorEstimado}</strong></p>` : ''}
                ${pedido.passageiros ? `<p style="color:#333;margin:8px 0"><strong>👥 Passageiros:</strong> ${pedido.passageiros}</p>` : ''}
                ${pedido.bagagens && pedido.bagagens !== 'Nenhuma' ? `<p style="color:#333;margin:8px 0"><strong>🧳 Bagagens:</strong> ${pedido.bagagens}</p>` : ''}
                ${pedido.veiculo ? `<p style="color:#333;margin:8px 0"><strong>🚗 Veículo:</strong> ${pedido.veiculo}</p>` : ''}
                <hr style="border:1px solid #eee;margin:16px 0">
                <p style="color:#333;margin:8px 0"><strong>🎵 Preferências da viagem:</strong></p>
                ${pedido.som === 'musica' ? `<p style="color:#333;margin:4px 0">🎵 Música: ${pedido.musica || ''}</p>` : pedido.som === 'silencio' ? `<p style="color:#333;margin:4px 0">🔇 Viagem em silêncio</p>` : ''}
                ${pedido.ar ? `<p style="color:#333;margin:4px 0">❄️ Ar condicionado: ${pedido.ar}</p>` : ''}
                ${pedido.agua ? `<p style="color:#333;margin:4px 0">💧 Água mineral: ${pedido.agua}</p>` : ''}
                ${pedido.pet ? `<p style="color:#333;margin:4px 0">🐾 Pet: ${pedido.pet}</p>` : ''}
                <hr style="border:1px solid #eee;margin:16px 0">
                <p style="color:#333;margin:16px 0">Foi um prazer te atender! 😊</p>
                <div style="text-align:center;margin:24px 0">
                  <p style="color:#333;margin:8px 0">Se quiser, deixe uma avaliação rápida no Google — me ajuda muito a continuar crescendo! 🙏</p>
                  <a href="https://maps.app.goo.gl/1RSGPH3tBvvU6cpi6" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#c9a84c;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">⭐ Avaliar no Google</a>
                </div>
                <p style="color:#888;font-size:12px;text-align:center">Em caso de dúvidas, entre em contato pelo WhatsApp.</p>
              </div>
            </div>
          `
        });
        console.log('E-mail enviado com sucesso!', info.messageId);
      } catch(e) {
        console.log('Erro ao enviar e-mail:', e.message, e);
      }
    }
  }

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
  await enviarNotificacaoFCM(titulo, corpo, tokensNotificacao);
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
