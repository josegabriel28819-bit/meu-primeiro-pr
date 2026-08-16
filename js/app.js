// ---------- Estado e persistência ----------

const STORAGE_KEY = 'pontoValeApp_v1';

/** @typedef {{id:string,data:string,entrada:string,saidaAlmoco:string,voltaAlmoco:string,saida:string,obs:string}} PontoRegistro */
/** @typedef {{id:string,data:string,dias:number,valorDia:number,saldoAnterior:number,necessario:number,reposicao:number,saldoFinal:number}} ValeHistorico */
/** @typedef {{id:string,nome:string,jornadaHoras:number,valorDiaVT:number,valorDiaVC:number,saldoVT:number,saldoVC:number,pontos:PontoRegistro[],historicoVT:ValeHistorico[],historicoVC:ValeHistorico[]}} Colaborador */

let state = {
  colaboradores: [],
  ativoId: null,
  escala: { grupoBase: 'A', sabados: [] },
};

function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.colaboradores)) {
        state = parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar dados salvos', e);
  }
  if (!state.escala || !Array.isArray(state.escala.sabados)) {
    state.escala = { grupoBase: (state.escala && state.escala.grupoBase) || 'A', sabados: [] };
  }
  state.colaboradores.forEach(normalizarColaborador);
}

function normalizarColaborador(c) {
  if (!c.diasSemana) c.diasSemana = { seg: true, ter: true, qua: true, qui: true, sex: true };
  if (typeof c.trabalhaSabado !== 'boolean') c.trabalhaSabado = false;
  if (typeof c.sabadoInicio !== 'string') c.sabadoInicio = '';
  if (typeof c.grupoEscala !== 'string') c.grupoEscala = '';
  if (typeof c.recebeAparte !== 'boolean') c.recebeAparte = false;
  return c;
}

// Jornada de sábado é sempre 5h, a partir do horário de entrada.
const DURACAO_SABADO_HORAS = 5;

function somarHoras(horaStr, horas) {
  if (!horaStr) return '';
  const [h, m] = horaStr.split(':').map(Number);
  const totalMin = h * 60 + m + horas * 60;
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function salvarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getColaboradorAtivo() {
  return state.colaboradores.find(c => c.id === state.ativoId) || null;
}

// ---------- Utilitários de formatação ----------

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutosParaHoraLegivel(totalMin) {
  const sinal = totalMin < 0 ? '-' : '';
  const abs = Math.abs(Math.round(totalMin));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${h}h${m.toString().padStart(2, '0')}`;
}

function hojeISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function mesAtualISO() {
  return hojeISO().slice(0, 7);
}

// ---------- Cálculo de ponto ----------

function calcularMinutosTrabalhados(p) {
  const entrada = timeToMinutes(p.entrada);
  const saida = timeToMinutes(p.saida);
  if (entrada === null || saida === null) return null;
  let total = saida - entrada;
  const saidaAlmoco = timeToMinutes(p.saidaAlmoco);
  const voltaAlmoco = timeToMinutes(p.voltaAlmoco);
  if (saidaAlmoco !== null && voltaAlmoco !== null) {
    total -= (voltaAlmoco - saidaAlmoco);
  }
  return total;
}

function calcularResumoMes(colaborador, mesISO) {
  const registros = colaborador.pontos.filter(p => p.data.startsWith(mesISO));
  let trabalhadosMin = 0;
  let diasComRegistro = 0;
  registros.forEach(p => {
    const min = calcularMinutosTrabalhados(p);
    if (min !== null) {
      trabalhadosMin += min;
      diasComRegistro += 1;
    }
  });
  const esperadoMin = diasComRegistro * colaborador.jornadaHoras * 60;
  const saldoMin = trabalhadosMin - esperadoMin;
  return { trabalhadosMin, esperadoMin, saldoMin, registros };
}

// ---------- Cálculo de vale ----------

function calcularReposicao(valorDia, dias, saldoAtual) {
  const necessario = valorDia * dias;
  const reposicao = Math.max(necessario - saldoAtual, 0);
  const saldoFinal = saldoAtual + reposicao;
  return { necessario, reposicao, saldoFinal };
}

// ---------- Navegação por abas ----------

function inicializarTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'relatorio') renderRelatorio();
      if (btn.dataset.tab === 'escalas') { renderEscalaMes(); renderTabelaEscala(); }
    });
  });
}

// ---------- Seletor de colaborador ----------

function renderSelectColaborador() {
  const select = document.getElementById('selectColaborador');
  select.innerHTML = '';
  if (state.colaboradores.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'Nenhum colaborador cadastrado';
    opt.value = '';
    select.appendChild(opt);
    select.disabled = true;
    state.ativoId = null;
    return;
  }
  select.disabled = false;
  state.colaboradores.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nome;
    select.appendChild(opt);
  });
  if (!state.ativoId || !state.colaboradores.some(c => c.id === state.ativoId)) {
    state.ativoId = state.colaboradores[0].id;
  }
  select.value = state.ativoId;
}

// Evita que a roda do mouse altere valores de campos numéricos ao rolar a página
document.addEventListener('wheel', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'number' && document.activeElement === e.target) {
    e.preventDefault();
    e.target.blur();
  }
}, { passive: false });

document.addEventListener('DOMContentLoaded', () => {
  carregarEstado();
  inicializarTabs();
  inicializarColaboradores();
  inicializarPonto();
  inicializarVales();
  inicializarEscala();
  inicializarRelatorio();
  inicializarBackup();

  document.getElementById('selectColaborador').addEventListener('change', (e) => {
    state.ativoId = e.target.value;
    salvarEstado();
    renderTudo();
  });

  renderTudo();
});

function renderTudo() {
  renderSelectColaborador();
  renderTabelaColaboradores();
  renderPontoConteudo();
  renderValesConteudo();
}

// ---------- Colaboradores ----------

function inicializarColaboradores() {
  const form = document.getElementById('formColaborador');
  const btnCancelar = document.getElementById('btnCancelarEdicao');

  document.getElementById('colaboradorTrabalhaSabado').addEventListener('change', (e) => {
    document.getElementById('colaboradorSabadoInicio').disabled = !e.target.checked;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('colaboradorId').value;
    const nome = document.getElementById('colaboradorNome').value.trim();
    const jornadaHoras = parseFloat(document.getElementById('colaboradorJornada').value) || 0;
    const valorDiaVT = parseFloat(document.getElementById('colaboradorValorVT').value) || 0;
    const valorDiaVC = parseFloat(document.getElementById('colaboradorValorVC').value) || 0;
    const diasSemana = {
      seg: document.getElementById('colaboradorDiaSeg').checked,
      ter: document.getElementById('colaboradorDiaTer').checked,
      qua: document.getElementById('colaboradorDiaQua').checked,
      qui: document.getElementById('colaboradorDiaQui').checked,
      sex: document.getElementById('colaboradorDiaSex').checked,
    };
    const trabalhaSabado = document.getElementById('colaboradorTrabalhaSabado').checked;
    const sabadoInicio = trabalhaSabado ? document.getElementById('colaboradorSabadoInicio').value : '';
    const grupoEscala = document.getElementById('colaboradorGrupo').value;
    const recebeAparte = document.getElementById('colaboradorRecebeAparte').checked;

    if (!nome) return;

    if (id) {
      const c = state.colaboradores.find(c => c.id === id);
      if (c) {
        c.nome = nome;
        c.jornadaHoras = jornadaHoras;
        c.valorDiaVT = valorDiaVT;
        c.valorDiaVC = valorDiaVC;
        c.diasSemana = diasSemana;
        c.trabalhaSabado = trabalhaSabado;
        c.sabadoInicio = sabadoInicio;
        c.grupoEscala = grupoEscala;
        c.recebeAparte = recebeAparte;
      }
    } else {
      const novo = {
        id: gerarId(),
        nome,
        jornadaHoras,
        diasSemana,
        trabalhaSabado,
        sabadoInicio,
        grupoEscala,
        recebeAparte,
        valorDiaVT,
        valorDiaVC,
        saldoVT: 0,
        saldoVC: 0,
        pontos: [],
        historicoVT: [],
        historicoVC: [],
      };
      state.colaboradores.push(novo);
      state.ativoId = novo.id;
    }

    salvarEstado();
    resetFormColaborador();
    renderTudo();
  });

  btnCancelar.addEventListener('click', resetFormColaborador);
}

function resetFormColaborador() {
  document.getElementById('formColaborador').reset();
  document.getElementById('colaboradorId').value = '';
  document.getElementById('colaboradorJornada').value = '8.8';
  document.getElementById('colaboradorSabadoInicio').disabled = true;
  document.getElementById('formColaboradorTitulo').textContent = 'Novo colaborador';
  document.getElementById('btnSalvarColaborador').textContent = 'Adicionar colaborador';
  document.getElementById('btnCancelarEdicao').classList.add('hidden');
}

function editarColaborador(id) {
  const c = state.colaboradores.find(c => c.id === id);
  if (!c) return;
  document.getElementById('colaboradorId').value = c.id;
  document.getElementById('colaboradorNome').value = c.nome;
  document.getElementById('colaboradorJornada').value = c.jornadaHoras;
  document.getElementById('colaboradorValorVT').value = c.valorDiaVT;
  document.getElementById('colaboradorValorVC').value = c.valorDiaVC;
  document.getElementById('colaboradorDiaSeg').checked = !!c.diasSemana.seg;
  document.getElementById('colaboradorDiaTer').checked = !!c.diasSemana.ter;
  document.getElementById('colaboradorDiaQua').checked = !!c.diasSemana.qua;
  document.getElementById('colaboradorDiaQui').checked = !!c.diasSemana.qui;
  document.getElementById('colaboradorDiaSex').checked = !!c.diasSemana.sex;
  document.getElementById('colaboradorTrabalhaSabado').checked = c.trabalhaSabado;
  document.getElementById('colaboradorSabadoInicio').value = c.sabadoInicio || '';
  document.getElementById('colaboradorSabadoInicio').disabled = !c.trabalhaSabado;
  document.getElementById('colaboradorGrupo').value = c.grupoEscala || '';
  document.getElementById('colaboradorRecebeAparte').checked = c.recebeAparte;
  document.getElementById('formColaboradorTitulo').textContent = 'Editar colaborador';
  document.getElementById('btnSalvarColaborador').textContent = 'Salvar alterações';
  document.getElementById('btnCancelarEdicao').classList.remove('hidden');
  document.getElementById('colaboradorNome').focus();
}

function excluirColaborador(id) {
  const c = state.colaboradores.find(c => c.id === id);
  if (!c) return;
  if (!confirm(`Excluir "${c.nome}"? Isso também apaga os registros de ponto e histórico de vales dele(a).`)) return;
  state.colaboradores = state.colaboradores.filter(c => c.id !== id);
  if (state.ativoId === id) state.ativoId = null;
  salvarEstado();
  renderTudo();
}

function formatarDiasSemana(dias) {
  const todos = ['seg', 'ter', 'qua', 'qui', 'sex'];
  const nomes = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex' };
  const marcados = todos.filter(d => dias && dias[d]);
  if (marcados.length === 5) return 'Seg-Sex';
  if (marcados.length === 0) return '-';
  return marcados.map(d => nomes[d]).join(', ');
}

function formatarSabado(c) {
  if (!c.trabalhaSabado) return 'Não';
  if (!c.sabadoInicio) return 'Sim (sem horário)';
  return `${c.sabadoInicio} - ${somarHoras(c.sabadoInicio, DURACAO_SABADO_HORAS)}`;
}

// Quem trabalha aos sábados sai 1h mais cedo na sexta-feira (regra da empresa).
function saiMaisCedoNaSexta(c) {
  return c.trabalhaSabado ? 'Sim' : '-';
}

function renderTabelaColaboradores() {
  const tbody = document.querySelector('#tabelaColaboradores tbody');
  tbody.innerHTML = '';
  document.getElementById('msgSemColaboradores').classList.toggle('hidden', state.colaboradores.length > 0);

  state.colaboradores.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.nome)}${c.recebeAparte ? '<span class="tag-aparte">à parte</span>' : ''}</td>
      <td>${formatarDiasSemana(c.diasSemana)}</td>
      <td>${minutosParaHoraLegivel(c.jornadaHoras * 60)}</td>
      <td>${formatarSabado(c)}</td>
      <td>${saiMaisCedoNaSexta(c)}</td>
      <td>${c.grupoEscala ? `<span class="badge badge-${c.grupoEscala.toLowerCase()}">Grupo ${c.grupoEscala}</span>` : '-'}</td>
      <td>${formatarMoeda(c.valorDiaVT)}</td>
      <td>${formatarMoeda(c.valorDiaVC)}</td>
      <td>${formatarMoeda(c.saldoVT)}</td>
      <td>${formatarMoeda(c.saldoVC)}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="editar" data-id="${c.id}">Editar</button>
        <button class="icon-btn danger" data-action="excluir" data-id="${c.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-action="editar"]').forEach(b =>
    b.addEventListener('click', () => editarColaborador(b.dataset.id)));
  tbody.querySelectorAll('button[data-action="excluir"]').forEach(b =>
    b.addEventListener('click', () => excluirColaborador(b.dataset.id)));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Ponto ----------

function inicializarPonto() {
  const form = document.getElementById('formPonto');
  const filtroMes = document.getElementById('filtroMesPonto');
  filtroMes.value = mesAtualISO();
  document.getElementById('pontoData').value = hojeISO();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const colaborador = getColaboradorAtivo();
    if (!colaborador) return;

    const id = document.getElementById('pontoId').value;
    const registro = {
      id: id || gerarId(),
      data: document.getElementById('pontoData').value,
      entrada: document.getElementById('pontoEntrada').value,
      saidaAlmoco: document.getElementById('pontoSaidaAlmoco').value,
      voltaAlmoco: document.getElementById('pontoVoltaAlmoco').value,
      saida: document.getElementById('pontoSaida').value,
      obs: document.getElementById('pontoObs').value.trim(),
    };

    if (!registro.data || !registro.entrada || !registro.saida) return;

    if (id) {
      const idx = colaborador.pontos.findIndex(p => p.id === id);
      if (idx >= 0) colaborador.pontos[idx] = registro;
    } else {
      colaborador.pontos.push(registro);
    }

    salvarEstado();
    resetFormPonto();
    renderPontoConteudo();
  });

  document.getElementById('btnCancelarPonto').addEventListener('click', resetFormPonto);
  filtroMes.addEventListener('change', renderPontoConteudo);
}

function resetFormPonto() {
  document.getElementById('formPonto').reset();
  document.getElementById('pontoId').value = '';
  document.getElementById('pontoData').value = hojeISO();
  document.getElementById('pontoTituloForm').textContent = 'Registrar ponto do dia';
  document.getElementById('btnSalvarPonto').textContent = 'Salvar registro';
  document.getElementById('btnCancelarPonto').classList.add('hidden');
}

function editarPonto(id) {
  const colaborador = getColaboradorAtivo();
  if (!colaborador) return;
  const p = colaborador.pontos.find(p => p.id === id);
  if (!p) return;
  document.getElementById('pontoId').value = p.id;
  document.getElementById('pontoData').value = p.data;
  document.getElementById('pontoEntrada').value = p.entrada;
  document.getElementById('pontoSaidaAlmoco').value = p.saidaAlmoco || '';
  document.getElementById('pontoVoltaAlmoco').value = p.voltaAlmoco || '';
  document.getElementById('pontoSaida').value = p.saida;
  document.getElementById('pontoObs').value = p.obs || '';
  document.getElementById('pontoTituloForm').textContent = 'Editar registro de ponto';
  document.getElementById('btnSalvarPonto').textContent = 'Salvar alterações';
  document.getElementById('btnCancelarPonto').classList.remove('hidden');
}

function excluirPonto(id) {
  const colaborador = getColaboradorAtivo();
  if (!colaborador) return;
  if (!confirm('Excluir este registro de ponto?')) return;
  colaborador.pontos = colaborador.pontos.filter(p => p.id !== id);
  salvarEstado();
  renderPontoConteudo();
}

function renderPontoConteudo() {
  const colaborador = getColaboradorAtivo();
  const semColaborador = document.getElementById('pontoSemColaborador');
  const conteudo = document.getElementById('pontoConteudo');

  if (!colaborador) {
    semColaborador.classList.remove('hidden');
    conteudo.classList.add('hidden');
    return;
  }
  semColaborador.classList.add('hidden');
  conteudo.classList.remove('hidden');

  const mesISO = document.getElementById('filtroMesPonto').value || mesAtualISO();
  const resumo = calcularResumoMes(colaborador, mesISO);

  document.getElementById('resumoHorasTrabalhadas').textContent = minutosParaHoraLegivel(resumo.trabalhadosMin);
  document.getElementById('resumoHorasEsperadas').textContent = minutosParaHoraLegivel(resumo.esperadoMin);
  const saldoEl = document.getElementById('resumoSaldoHoras');
  saldoEl.textContent = minutosParaHoraLegivel(resumo.saldoMin);
  saldoEl.className = 'resumo-valor ' + (resumo.saldoMin >= 0 ? 'positivo' : 'negativo');

  const tbody = document.querySelector('#tabelaPonto tbody');
  tbody.innerHTML = '';
  const registrosOrdenados = [...resumo.registros].sort((a, b) => b.data.localeCompare(a.data));

  document.getElementById('msgSemPontos').classList.toggle('hidden', registrosOrdenados.length > 0);

  registrosOrdenados.forEach(p => {
    const min = calcularMinutosTrabalhados(p);
    const saldoDia = min !== null ? min - colaborador.jornadaHoras * 60 : null;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarDataBR(p.data)}</td>
      <td>${p.entrada || '-'}</td>
      <td>${p.saidaAlmoco || '-'}</td>
      <td>${p.voltaAlmoco || '-'}</td>
      <td>${p.saida || '-'}</td>
      <td>${min !== null ? minutosParaHoraLegivel(min) : '-'}</td>
      <td class="${saldoDia !== null ? (saldoDia >= 0 ? 'positivo' : 'negativo') : ''}">${saldoDia !== null ? minutosParaHoraLegivel(saldoDia) : '-'}</td>
      <td>${escapeHtml(p.obs || '')}</td>
      <td class="row-actions">
        <button class="icon-btn" data-action="editar" data-id="${p.id}">Editar</button>
        <button class="icon-btn danger" data-action="excluir" data-id="${p.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-action="editar"]').forEach(b =>
    b.addEventListener('click', () => editarPonto(b.dataset.id)));
  tbody.querySelectorAll('button[data-action="excluir"]').forEach(b =>
    b.addEventListener('click', () => excluirPonto(b.dataset.id)));
}

function formatarDataBR(iso) {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ---------- Vales ----------

function inicializarVales() {
  ['VT', 'VC'].forEach(tipo => {
    const prefix = tipo.toLowerCase();

    document.getElementById(`${prefix}ValorDia`).addEventListener('change', (e) => {
      const colaborador = getColaboradorAtivo();
      if (!colaborador) return;
      colaborador[`valorDia${tipo}`] = parseFloat(e.target.value) || 0;
      salvarEstado();
      renderTabelaColaboradores();
    });

    document.getElementById(`${prefix}SaldoAtual`).addEventListener('change', (e) => {
      const colaborador = getColaboradorAtivo();
      if (!colaborador) return;
      colaborador[`saldo${tipo}`] = parseFloat(e.target.value) || 0;
      salvarEstado();
      renderValesConteudo();
      renderTabelaColaboradores();
    });

    document.getElementById(`btnCalcular${tipo}`).addEventListener('click', () => {
      calcularEExibirVale(tipo);
    });

    document.getElementById(`btnConfirmar${tipo}`).addEventListener('click', () => {
      confirmarReposicao(tipo);
    });
  });
}

let calculoPendente = { VT: null, VC: null };

function calcularEExibirVale(tipo) {
  const colaborador = getColaboradorAtivo();
  if (!colaborador) return;
  const prefix = tipo.toLowerCase();

  const valorDia = parseFloat(document.getElementById(`${prefix}ValorDia`).value) || 0;
  const saldoAtual = parseFloat(document.getElementById(`${prefix}SaldoAtual`).value) || 0;
  const dias = parseInt(document.getElementById(`${prefix}Dias`).value, 10) || 0;

  const { necessario, reposicao, saldoFinal } = calcularReposicao(valorDia, dias, saldoAtual);

  document.getElementById(`${prefix}Necessario`).textContent = formatarMoeda(necessario);
  document.getElementById(`${prefix}SaldoAtualDisplay`).textContent = formatarMoeda(saldoAtual);
  document.getElementById(`${prefix}Reposicao`).textContent = formatarMoeda(reposicao);

  const btnConfirmar = document.getElementById(`btnConfirmar${tipo}`);
  if (dias > 0) {
    btnConfirmar.classList.remove('hidden');
    calculoPendente[tipo] = { dias, valorDia, saldoAtual, necessario, reposicao, saldoFinal };
  } else {
    btnConfirmar.classList.add('hidden');
    calculoPendente[tipo] = null;
  }
}

function confirmarReposicao(tipo) {
  const colaborador = getColaboradorAtivo();
  const calculo = calculoPendente[tipo];
  if (!colaborador || !calculo) return;

  colaborador[`saldo${tipo}`] = calculo.saldoFinal;
  colaborador[`valorDia${tipo}`] = calculo.valorDia;

  const historico = tipo === 'VT' ? colaborador.historicoVT : colaborador.historicoVC;
  historico.unshift({
    id: gerarId(),
    data: hojeISO(),
    dias: calculo.dias,
    valorDia: calculo.valorDia,
    saldoAnterior: calculo.saldoAtual,
    necessario: calculo.necessario,
    reposicao: calculo.reposicao,
    saldoFinal: calculo.saldoFinal,
  });

  calculoPendente[tipo] = null;
  salvarEstado();
  renderValesConteudo();
  renderTabelaColaboradores();
}

function renderValesConteudo() {
  const colaborador = getColaboradorAtivo();
  const semColaborador = document.getElementById('valesSemColaborador');
  const conteudo = document.getElementById('valesConteudo');

  if (!colaborador) {
    semColaborador.classList.remove('hidden');
    conteudo.classList.add('hidden');
    return;
  }
  semColaborador.classList.add('hidden');
  conteudo.classList.remove('hidden');

  ['VT', 'VC'].forEach(tipo => {
    const prefix = tipo.toLowerCase();
    document.getElementById(`${prefix}ValorDia`).value = colaborador[`valorDia${tipo}`];
    document.getElementById(`${prefix}SaldoAtual`).value = colaborador[`saldo${tipo}`];
    document.getElementById(`${prefix}Dias`).value = 0;
    document.getElementById(`${prefix}Necessario`).textContent = formatarMoeda(0);
    document.getElementById(`${prefix}SaldoAtualDisplay`).textContent = formatarMoeda(colaborador[`saldo${tipo}`]);
    document.getElementById(`${prefix}Reposicao`).textContent = formatarMoeda(0);
    document.getElementById(`btnConfirmar${tipo}`).classList.add('hidden');
    calculoPendente[tipo] = null;

    const historico = tipo === 'VT' ? colaborador.historicoVT : colaborador.historicoVC;
    const tbody = document.querySelector(`#tabelaHistorico${tipo} tbody`);
    tbody.innerHTML = '';
    historico.forEach(h => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatarDataBR(h.data)}</td>
        <td>${h.dias}</td>
        <td>${formatarMoeda(h.necessario)}</td>
        <td>${formatarMoeda(h.saldoAnterior)}</td>
        <td>${formatarMoeda(h.reposicao)}</td>
        <td>${formatarMoeda(h.saldoFinal)}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// ---------- Escala de sábados (Grupo A / Grupo B) ----------

// No Solides a semana começa no domingo: o sábado aparece com a data do
// domingo que abre aquela semana (6 dias antes), em vez da data real.
function dataComoApareceNoSolides(dataISO) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nomeDiaSemana(dataISO) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  const nomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return nomes[d.getDay()];
}

function listarSabadosDoMes(mesISO) {
  const [ano, mes] = mesISO.split('-').map(Number);
  const sabados = [];
  const d = new Date(ano, mes - 1, 1);
  while (d.getMonth() === mes - 1) {
    if (d.getDay() === 6) {
      sabados.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return sabados;
}

function sugerirGrupo(dataISO) {
  const anteriores = state.escala.sabados
    .filter(s => s.data < dataISO)
    .sort((a, b) => b.data.localeCompare(a.data));
  if (anteriores.length > 0) {
    return anteriores[0].grupo === 'A' ? 'B' : 'A';
  }
  const posteriores = state.escala.sabados
    .filter(s => s.data > dataISO)
    .sort((a, b) => a.data.localeCompare(b.data));
  if (posteriores.length > 0) {
    return posteriores[0].grupo === 'A' ? 'B' : 'A';
  }
  return state.escala.grupoBase || 'A';
}

function inicializarEscala() {
  const selectGrupoBase = document.getElementById('escalaGrupoBase');
  selectGrupoBase.value = state.escala.grupoBase || 'A';
  selectGrupoBase.addEventListener('change', (e) => {
    state.escala.grupoBase = e.target.value;
    salvarEstado();
  });

  const mesInput = document.getElementById('escalaMes');
  mesInput.value = mesAtualISO();
  mesInput.addEventListener('change', renderEscalaMes);

  document.getElementById('btnSalvarEscalaMes').addEventListener('click', () => {
    const mesISO = mesInput.value;
    if (!mesISO) return;
    const linhas = document.querySelectorAll('#escalaSabadosMes .escala-sabado-row');
    linhas.forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const select = row.querySelector('select');
      const dataISO = checkbox.dataset.data;
      state.escala.sabados = state.escala.sabados.filter(s => s.data !== dataISO);
      if (checkbox.checked) {
        state.escala.sabados.push({ id: gerarId(), data: dataISO, grupo: select.value });
      }
    });
    salvarEstado();
    renderEscalaMes();
    renderTabelaEscala();
  });

  const conferenciaData = document.getElementById('conferenciaData');
  conferenciaData.value = hojeISO();
  conferenciaData.addEventListener('input', renderConferenciaData);

  renderConferenciaData();
  renderEscalaMes();
  renderTabelaEscala();
}

function renderConferenciaData() {
  const dataISO = document.getElementById('conferenciaData').value;
  const out = document.getElementById('conferenciaResultado');
  if (!dataISO) {
    out.innerHTML = '';
    return;
  }
  const solidesISO = dataComoApareceNoSolides(dataISO);
  out.innerHTML = `
    <div class="resultado-linha"><span>Data real (${nomeDiaSemana(dataISO)})</span><strong>${formatarDataBR(dataISO)}</strong></div>
    <div class="resultado-linha destaque"><span>Vai aparecer no Solides como</span><strong>${formatarDataBR(solidesISO)}</strong></div>
  `;
}

function renderEscalaMes() {
  const mesISO = document.getElementById('escalaMes').value;
  const container = document.getElementById('escalaSabadosMes');
  container.innerHTML = '';
  if (!mesISO) return;

  const sabados = listarSabadosDoMes(mesISO);
  sabados.forEach(dataISO => {
    const existente = state.escala.sabados.find(s => s.data === dataISO);
    const sugestao = existente ? existente.grupo : sugerirGrupo(dataISO);
    const solidesData = dataComoApareceNoSolides(dataISO);

    const row = document.createElement('div');
    row.className = 'escala-sabado-row';
    row.innerHTML = `
      <label class="escala-check">
        <input type="checkbox" data-data="${dataISO}" ${existente ? 'checked' : ''}>
        <span>${formatarDataBR(dataISO)}</span>
      </label>
      <select data-data="${dataISO}" ${existente ? '' : 'disabled'}>
        <option value="A" ${sugestao === 'A' ? 'selected' : ''}>Grupo A</option>
        <option value="B" ${sugestao === 'B' ? 'selected' : ''}>Grupo B</option>
      </select>
      <span class="hint">Solides mostrará: ${formatarDataBR(solidesData)}</span>
    `;
    container.appendChild(row);

    const checkbox = row.querySelector('input[type="checkbox"]');
    const select = row.querySelector('select');
    checkbox.addEventListener('change', () => {
      select.disabled = !checkbox.checked;
      recalcularSugestoesMes();
    });
  });

  recalcularSugestoesMes();
}

// Encadeia a alternância entre os sábados marcados no mês em edição (mesmo
// os que ainda não foram salvos), e não só o histórico já persistido.
function recalcularSugestoesMes() {
  const linhas = Array.from(document.querySelectorAll('#escalaSabadosMes .escala-sabado-row'));
  let grupoAnterior = null;
  linhas.forEach(row => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const select = row.querySelector('select');
    if (!checkbox.checked) return;
    const dataISO = checkbox.dataset.data;
    const existente = state.escala.sabados.find(s => s.data === dataISO);
    if (existente) {
      grupoAnterior = select.value;
      return;
    }
    select.value = grupoAnterior ? (grupoAnterior === 'A' ? 'B' : 'A') : sugerirGrupo(dataISO);
    grupoAnterior = select.value;
  });
}

function renderTabelaEscala() {
  const tbody = document.querySelector('#tabelaEscala tbody');
  tbody.innerHTML = '';
  const ordenados = [...state.escala.sabados].sort((a, b) => a.data.localeCompare(b.data));

  document.getElementById('msgSemEscala').classList.toggle('hidden', ordenados.length > 0);

  ordenados.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarDataBR(s.data)}</td>
      <td><span class="badge badge-${s.grupo.toLowerCase()}">Grupo ${s.grupo}</span></td>
      <td>${formatarDataBR(dataComoApareceNoSolides(s.data))}</td>
      <td class="row-actions"><button class="icon-btn danger" data-id="${s.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-id]').forEach(b => {
    b.addEventListener('click', () => {
      if (!confirm('Remover este sábado da escala?')) return;
      state.escala.sabados = state.escala.sabados.filter(s => s.id !== b.dataset.id);
      salvarEstado();
      renderEscalaMes();
      renderTabelaEscala();
    });
  });
}

// ---------- Relatório ----------

function inicializarRelatorio() {
  document.getElementById('filtroMesRelatorio').value = mesAtualISO();
  document.getElementById('filtroMesRelatorio').addEventListener('change', renderRelatorio);
}

function renderRelatorio() {
  const mesISO = document.getElementById('filtroMesRelatorio').value || mesAtualISO();
  const tbody = document.querySelector('#tabelaRelatorio tbody');
  tbody.innerHTML = '';

  document.getElementById('msgSemRelatorio').classList.toggle('hidden', state.colaboradores.length > 0);

  state.colaboradores.forEach(c => {
    const resumo = calcularResumoMes(c, mesISO);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.nome)}</td>
      <td>${minutosParaHoraLegivel(resumo.trabalhadosMin)}</td>
      <td class="${resumo.saldoMin >= 0 ? 'positivo' : 'negativo'}">${minutosParaHoraLegivel(resumo.saldoMin)}</td>
      <td>${formatarMoeda(c.saldoVT)}</td>
      <td>${formatarMoeda(c.saldoVC)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Backup (exportar / importar) ----------

function inicializarBackup() {
  document.getElementById('btnExportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ponto-vales-backup-${hojeISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('inputImportar').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.colaboradores)) throw new Error('Formato inválido');
        if (!confirm('Importar estes dados vai substituir os dados atuais salvos neste navegador. Continuar?')) return;
        state = parsed;
        if (!state.escala || !Array.isArray(state.escala.sabados)) {
          state.escala = { grupoBase: (state.escala && state.escala.grupoBase) || 'A', sabados: [] };
        }
        state.colaboradores.forEach(normalizarColaborador);
        salvarEstado();
        renderTudo();
        renderRelatorio();
        alert('Dados importados com sucesso.');
      } catch (err) {
        alert('Não foi possível importar o arquivo: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}
