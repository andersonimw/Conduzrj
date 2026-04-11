const fs = require('fs');
let c = fs.readFileSync('public/admin.html', 'utf8');

const frota = `
    <!-- FROTA -->
    <div class="tab" id="tab-frota">
      <div class="page-header">
        <div class="page-title">Frota de Veículos</div>
        <div class="page-sub">Gerencie seus veículos e fotos exibidas no site</div>
      </div>
      <div class="card" style="padding:24px;margin-bottom:20px">
        <div class="card-header" style="padding:0 0 16px">
          <div class="card-titulo">Veículos cadastrados</div>
          <button class="btn-salvar" onclick="mostrarFormVeiculo()">+ Adicionar veículo</button>
        </div>
        <div id="frotaList"></div>
      </div>
      <div class="card" style="padding:24px;display:none" id="formVeiculoCard">
        <h4 style="color:var(--dourado);margin-bottom:20px" id="formVeiculoTitulo">Novo veículo</h4>
        <div class="form-admin">
          <div class="form-2col">
            <div><label>Modelo</label><input type="text" id="v-modelo" placeholder="Ex: Toyota Corolla"></div>
            <div><label>Ano</label><input type="text" id="v-ano" placeholder="Ex: 2023"></div>
          </div>
          <div class="form-2col">
            <div><label>Cor</label><input type="text" id="v-cor" placeholder="Ex: Preto"></div>
            <div><label>Placa</label><input type="text" id="v-placa" placeholder="Ex: ABC-1234"></div>
          </div>
          <div><label>Descricao (opcional)</label><input type="text" id="v-desc" placeholder="Ex: Ar condicionado, banco de couro..."></div>
          <div>
            <label>Fotos do veiculo</label>
            <div id="fotosPreview" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px"></div>
            <label style="display:inline-block;background:#111;border:1.5px dashed var(--borda);color:var(--suave);padding:12px 20px;border-radius:10px;cursor:pointer">
              Escolher fotos da galeria
              <input type="file" id="v-fotos" accept="image/*" multiple style="display:none" onchange="previewFotos(this)">
            </label>
            <div style="font-size:12px;color:var(--suave);margin-top:8px">Maximo 5MB por foto - JPG, PNG ou WEBP</div>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button class="btn-salvar" onclick="salvarVeiculo()">Salvar veiculo</button>
            <button class="btn-perigo" onclick="cancelarFormVeiculo()">Cancelar</button>
          </div>
          <div class="salvo-msg" id="msgFrota">Veiculo salvo com sucesso</div>
        </div>
      </div>
    </div>

    <!-- CONFIG -->`;

c = c.replace('    <!-- CONFIG -->', frota);
fs.writeFileSync('public/admin.html', c);
console.log('ABA FROTA ADICIONADA');
