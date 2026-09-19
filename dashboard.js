// dashboard.js
const fmtBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0
});
const fmtBRLFull = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL'
});
const fmtInt = new Intl.NumberFormat('pt-BR');

const $ = (id) => document.getElementById(id);

async function carregarFiltros() {
  const r = await fetch('/api/filtros');
  const { ufs = [], cidades = [] } = await r.json();

  const ufSel = $('uf');
  ufs.forEach(uf => ufSel.add(new Option(uf, uf)));

  const cidadeSel = $('cidade');
  cidades.forEach(c => cidadeSel.add(new Option(c, c)));
}

function kpiHTML({ clientes_ativos, transacoes, volume_aprovado, ticket_medio, taxa_aprovacao }) {
  return `
    <div class="kpi"><small>Clientes ativos</small><strong>${fmtInt.format(clientes_ativos)}</strong></div>
    <div class="kpi"><small>Transações</small><strong>${fmtInt.format(transacoes)}</strong></div>
    <div class="kpi"><small>Volume aprovado</small><strong>${fmtBRL.format(volume_aprovado)}</strong></div>
    <div class="kpi"><small>Ticket médio</small><strong>${fmtBRLFull.format(ticket_medio)}</strong></div>
    <div class="kpi"><small>Taxa de aprovação</small><strong>${taxa_aprovacao.toFixed(1)}%</strong></div>
  `;
}

function barrasHTML(dados, chaveLabel) {
  if (!dados.length) return '<p class="empty">Sem dados.</p>';
  const max = Math.max(...dados.map(d => Number(d.volume_aprovado)));
  return dados.map(d => {
    const pct = (Number(d.volume_aprovado) / max) * 100;
    return `
      <div class="barrow">
        <span>${d[chaveLabel]}</span>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <b>${fmtBRL.format(d.volume_aprovado)}</b>
      </div>
    `;
  }).join('');
}

function topHTML(lista) {
  if (!lista.length) {
    return `<tr><td colspan="5" class="empty">Sem dados.</td></tr>`;
  }
  return lista.map(c => `
    <tr>
      <td>${c.nome}</td>
      <td>${c.cidade}</td>
      <td>${c.uf}</td>
      <td>${fmtInt.format(c.transacoes)}</td>
      <td>${fmtBRL.format(c.volume_aprovado)}</td>
    </tr>
  `).join('');
}

// --- Gráfico de linha (canvas puro) ---
function desenharSerie(serie) {
  const canvas = $('chart');
  const note = $('chart-note');
  const ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width, H = rect.height;
  const pad = { t: 16, r: 12, b: 28, l: 52 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  ctx.clearRect(0, 0, W, H);

  if (!serie.length) {
    note.textContent = 'Sem dados para exibir.';
    return;
  }
  note.textContent = `${serie.length} dia(s) com transações aprovadas.`;

  const pontos = serie.map(p => ({
    x: new Date(p.dia).getTime(),
    y: Number(p.volume_aprovado)
  }));
  const xMin = Math.min(...pontos.map(p => p.x));
  const xMax = Math.max(...pontos.map(p => p.x));
  const yMax = Math.max(...pontos.map(p => p.y)) * 1.1;

  const sx = (x) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * innerW;
  const sy = (y) => pad.t + innerH - (y / yMax) * innerH;

  // Grid + labels Y
  ctx.strokeStyle = '#3d2b56';
  ctx.fillStyle = '#c8b9dd';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (innerH / 4) * i;
    const val = yMax * (1 - i / 4);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + innerW, y);
    ctx.stroke();
    ctx.fillText(fmtBRL.format(val), pad.l - 6, y + 4);
  }

  // Área + linha
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + innerH);
  grad.addColorStop(0, 'rgba(237,118,199,0.55)');
  grad.addColorStop(1, 'rgba(156,101,239,0.02)');

  ctx.beginPath();
  pontos.forEach((p, i) => {
    const x = sx(p.x), y = sy(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(sx(pontos.at(-1).x), pad.t + innerH);
  ctx.lineTo(sx(pontos[0].x), pad.t + innerH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  pontos.forEach((p, i) => {
    const x = sx(p.x), y = sy(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#ed76c7';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eixo X (data inicial e final)
  ctx.fillStyle = '#ad9ac5';
  ctx.textAlign = 'left';
  ctx.fillText(new Date(xMin).toLocaleDateString('pt-BR'), pad.l, H - 8);
  ctx.textAlign = 'right';
  ctx.fillText(new Date(xMax).toLocaleDateString('pt-BR'), pad.l + innerW, H - 8);
}

async function atualizar() {
  const badge = $('badge');
  badge.textContent = 'Carregando…';

  const params = new URLSearchParams();
  const uf = $('uf').value;
  const cidade = $('cidade').value;
  const tipo = $('tipo').value;
  const mes = $('mes').value;
  if (uf) params.set('uf', uf);
  if (cidade) params.set('cidade', cidade);
  if (tipo) params.set('tipo', tipo);
  if (mes) params.set('mes', mes);

  try {
    const r = await fetch('/api/dashboard?' + params);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();

    $('kpis').innerHTML = kpiHTML(data.kpis);
    $('bars-tipo').innerHTML = barrasHTML(data.volume_por_tipo, 'tipo');
    $('bars-uf').innerHTML = barrasHTML(data.volume_por_estado, 'uf');
    $('top-body').innerHTML = topHTML(data.top_clientes);

    desenharSerie(data.serie_diaria);

    badge.textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR');
  } catch (err) {
    console.error(err);
    badge.textContent = 'Erro ao carregar';
  }
}

// Redesenha gráfico ao redimensionar
window.addEventListener('resize', () => {
  clearTimeout(window.__rz);
  window.__rz = setTimeout(atualizar, 250);
});

// Init
(async () => {
  await carregarFiltros();
  $('filters').addEventListener('submit', (e) => {
    e.preventDefault();
    atualizar();
  });
  // Recarrega ao trocar qualquer filtro
  ['uf', 'cidade', 'tipo', 'mes'].forEach(id =>
    $(id).addEventListener('change', atualizar)
  );
  atualizar();
})();