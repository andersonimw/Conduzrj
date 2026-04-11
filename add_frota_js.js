const fs = require('fs');
let c = fs.readFileSync('public/admin.html', 'utf8');

const js = `
// FROTA
let veiculoEditando = -1;
let fotosNovas = [];

async function carregarFrota() {
  const r = await fetch('/api/admin/frota');
  if (!r.ok) return;
  const frota = await r.json();
  const el = document.getElementById('frotaList');
  if (!frota.length) {
    el.innerHTML = '<p style="color:var(--suave);padding:16px 0">Nenhum veiculo cadastrado ainda. Clique em + Adicionar veiculo.</p>';
    return;
  }
  el.innerHTML = frota.map((v, i) => {
    const fotos = (v.fotos || []);
    return '<div style="background:#111;border:1px solid var(--borda);border-radius:12px;padding:16px 20px;margin-bottom:12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
      + (fotos[0] ? '<img src="'+fotos[0]+'" style="width:80px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--borda)">' : '<div style="width:80px;height:60px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--suave);font-size:24px">car</div>')
      + '<div style="flex:1">'
      + '<div style="font-weight:700;font-size:15px;margin-bottom:4px">'+v.modelo+' '+v.ano+'</div>'
      + '<div style="font-size:13px;color:var(--suave)">'+v.cor+(v.placa ? ' &nbsp;·&nbsp; '+v.placa : '')+'</div>'
      + (v.descricao ? '<div style="font-size:12px;color:#666;margin-top:4px">'+v.descricao+'</div>' : '')
      + '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">'
      + fotos.map(f => '<img src="'+f+'" style="width:40px;height:30px;object-fit:cover;border-radius:4px">').join('')
      + '</div></div>'
      + '<div style="display:flex;gap:8px">'
      + '<button class="btn-salvar" style="padding:6px 14px;font-size:13px" onclick="editarVeiculo('+i+')">Editar</button>'
      + '<button class="btn-perigo" onclick="removerVeiculo('+i+')">Remover</button>'
      + '</div></div>';
  }).join('');
}

function mostrarFormVeiculo() {
  veiculoEditando = -1;
  fotosNovas = [];
  document.getElementById('v-modelo').value = '';
  document.getElementById('v-ano').value = '';
  document.getElementById('v-cor').value = '';
  document.getElementById('v-placa').value = '';
  document.getElementById('v-desc').value = '';
  document.getElementById('fotosPreview').innerHTML = '';
  document.getElementById('formVeiculoTitulo').textContent = 'Novo veiculo';
  document.getElementById('formVeiculoCard').style.display = 'block';
  document.getElementById('formVeiculoCard').scrollIntoView({behavior:'smooth'});
}

async function editarVeiculo(idx) {
  const r = await fetch('/api/admin/frota');
  const frota = await r.json();
  const v = frota[idx];
  veiculoEditando = idx;
  fotosNovas = v.fotos || [];
  document.getElementById('v-modelo').value = v.modelo || '';
  document.getElementById('v-ano').value = v.ano || '';
  document.getElementById('v-cor').value = v.cor || '';
  document.getElementById('v-placa').value = v.placa || '';
  document.getElementById('v-desc').value = v.descricao || '';
  document.getElementById('formVeiculoTitulo').textContent = 'Editar veiculo';
  const prev = document.getElementById('fotosPreview');
  prev.innerHTML = fotosNovas.map((f,i) => '<div style="position:relative">'
    + '<img src="'+f+'" style="width:80px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--borda)">'
    + '<button onclick="removerFotoExistente('+i+')" style="position:absolute;top:-6px;right:-6px;background:#ef4444;border:none;color:#fff;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:11px">x</button>'
    + '</div>').join('');
  document.getElementById('formVeiculoCard').style.display = 'block';
  document.getElementById('formVeiculoCard').scrollIntoView({behavior:'smooth'});
}

function removerFotoExistente(idx) {
  fotosNovas.splice(idx, 1);
  const prev = document.getElementById('fotosPreview');
  prev.innerHTML = fotosNovas.map((f,i) => '<div style="position:relative">'
    + '<img src="'+f+'" style="width:80px;height:60px;object-fit:cover;border-radius:8px">'
    + '<button onclick="removerFotoExistente('+i+')" style="position:absolute;top:-6px;right:-6px;background:#ef4444;border:none;color:#fff;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:11px">x</button>'
    + '</div>').join('');
}

function previewFotos(input) {
  const files = Array.from(input.files);
  const prev = document.getElementById('fotosPreview');
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const div = document.createElement('div');
      div.style.cssText = 'position:relative';
      div.innerHTML = '<img src="'+e.target.result+'" style="width:80px;height:60px;object-fit:cover;border-radius:8px;border:1px solid var(--borda)">'
        + '<div style="position:absolute;top:-6px;right:-6px;background:var(--dourado);border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#000;font-weight:700">N</div>';
      prev.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

async function salvarVeiculo() {
  const modelo = document.getElementById('v-modelo').value.trim();
  const ano = document.getElementById('v-ano').value.trim();
  const cor = document.getElementById('v-cor').value.trim();
  if (!modelo || !ano) { alert('Preencha pelo menos modelo e ano'); return; }

  const btn = document.querySelector('#formVeiculoCard .btn-salvar');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  // Upload das fotos novas
  const input = document.getElementById('v-fotos');
  const urlsFotos = [...fotosNovas.filter(f => f.startsWith('/uploads/'))];
  if (input.files.length > 0) {
    for (const file of Array.from(input.files)) {
      const fd = new FormData();
      fd.append('foto', file);
      const ur = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const ud = await ur.json();
      if (ud.url) urlsFotos.push(ud.url);
    }
  }

  const r = await fetch('/api/admin/frota');
  const frota = await r.json();
  const veiculo = {
    id: veiculoEditando >= 0 ? frota[veiculoEditando].id : Date.now(),
    modelo, ano, cor,
    placa: document.getElementById('v-placa').value.trim(),
    descricao: document.getElementById('v-desc').value.trim(),
    fotos: urlsFotos
  };

  if (veiculoEditando >= 0) frota[veiculoEditando] = veiculo;
  else frota.push(veiculo);

  await fetch('/api/admin/frota', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(frota) });

  btn.textContent = 'Salvar veiculo';
  btn.disabled = false;
  mostrarMsg('msgFrota');
  cancelarFormVeiculo();
  carregarFrota();
}

async function removerVeiculo(idx) {
  if (!confirm('Remover este veiculo?')) return;
  const r = await fetch('/api/admin/frota');
  const frota = await r.json();
  frota.splice(idx, 1);
  await fetch('/api/admin/frota', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(frota) });
  carregarFrota();
}

function cancelarFormVeiculo() {
  document.getElementById('formVeiculoCard').style.display = 'none';
  document.getElementById('v-fotos').value = '';
  fotosNovas = [];
}
`;

c = c.replace('</script>', js + '\n</script>');
fs.writeFileSync('public/admin.html', c);
console.log('JS FROTA ADICIONADO');
