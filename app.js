let chaveCriptografica = null;
let cofre = criarEstruturaCofre();
let itensSelecionados = new Set();

const STORAGE_KEY = "cofre_senhas_dados";
const SALT_KEY = "cofre_senhas_salt";

document.addEventListener("DOMContentLoaded", iniciarApp);

function criarEstruturaCofre() {
  return {
    senhas: [],
    gastos: [],
    categoriasGastos: [],
    pagadoresGastos: []
  };
}

function iniciarApp() {
  const dados = localStorage.getItem(STORAGE_KEY);
  const salt = localStorage.getItem(SALT_KEY);

  preencherDataGastoHoje();

  if (dados && salt) {
    mostrarTela("telaLogin");
  } else {
    mostrarTela("telaConfigurar");
  }

  registrarServiceWorker();
}

function mostrarTela(id) {
  document.getElementById("telaConfigurar").classList.add("hidden");
  document.getElementById("telaLogin").classList.add("hidden");
  document.getElementById("telaCofre").classList.add("hidden");

  document.getElementById(id).classList.remove("hidden");
}

function abrirAba(aba) {
  const abaSenhas = document.getElementById("abaSenhas");
  const abaGastos = document.getElementById("abaGastos");
  const btnAbaSenhas = document.getElementById("btnAbaSenhas");
  const btnAbaGastos = document.getElementById("btnAbaGastos");

  if (aba === "senhas") {
    abaSenhas.classList.remove("hidden");
    abaGastos.classList.add("hidden");
    btnAbaSenhas.classList.add("ativa");
    btnAbaGastos.classList.remove("ativa");
    renderizarListaSenhas();
  } else {
    abaSenhas.classList.add("hidden");
    abaGastos.classList.remove("hidden");
    btnAbaSenhas.classList.remove("ativa");
    btnAbaGastos.classList.add("ativa");
    atualizarSelectCategoriasGastos();
    atualizarSelectPagadoresGastos();
    alternarCamposPagadorInicial();
    renderizarListaGastos();
  }
}

/* =========================
   COFRE / LOGIN
========================= */

async function criarCofre() {
  const senha = document.getElementById("novaSenhaMestra").value;
  const confirmar = document.getElementById("confirmarSenhaMestra").value;

  if (!senha || !confirmar) {
    alert("Digite e confirme a senha mestra.");
    return;
  }

  if (senha !== confirmar) {
    alert("As senhas não conferem.");
    return;
  }

  if (senha.length < 10) {
    alert("Use uma senha mestra com pelo menos 10 caracteres.");
    return;
  }

  const salt = gerarBytesAleatorios(16);
  localStorage.setItem(SALT_KEY, arrayBufferParaBase64(salt));

  chaveCriptografica = await derivarChave(senha, salt);
  cofre = criarEstruturaCofre();

  await salvarCofre();

  document.getElementById("novaSenhaMestra").value = "";
  document.getElementById("confirmarSenhaMestra").value = "";

  mostrarTela("telaCofre");
  abrirAba("senhas");
}

async function desbloquearCofre() {
  const senha = document.getElementById("senhaMestraLogin").value;

  if (!senha) {
    alert("Digite sua senha mestra.");
    return;
  }

  try {
    const saltBase64 = localStorage.getItem(SALT_KEY);
    const salt = base64ParaArrayBuffer(saltBase64);

    chaveCriptografica = await derivarChave(senha, salt);

    const dadosCriptografados = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const texto = await descriptografar(dadosCriptografados, chaveCriptografica);

    cofre = normalizarEstruturaCofre(JSON.parse(texto));

    document.getElementById("senhaMestraLogin").value = "";
    mostrarTela("telaCofre");
    abrirAba("senhas");

    await salvarCofre();
  } catch (erro) {
    alert("Senha mestra incorreta ou cofre corrompido.");
  }
}

async function salvarCofre() {
  const texto = JSON.stringify(cofre);
  const dadosCriptografados = await criptografar(texto, chaveCriptografica);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dadosCriptografados));
}

function bloquearCofre() {
  chaveCriptografica = null;
  cofre = criarEstruturaCofre();
  itensSelecionados.clear();
  mostrarTela("telaLogin");
}

function normalizarEstruturaCofre(dados) {
  const agora = new Date().toISOString();

  if (Array.isArray(dados)) {
    return {
      senhas: dados.map(item => normalizarSenha(item, agora)),
      gastos: [],
      categoriasGastos: [],
      pagadoresGastos: []
    };
  }

  const novo = criarEstruturaCofre();

  if (dados && Array.isArray(dados.senhas)) {
    novo.senhas = dados.senhas.map(item => normalizarSenha(item, agora));
  }

  if (dados && Array.isArray(dados.gastos)) {
    novo.gastos = dados.gastos.map(item => normalizarGasto(item, agora));
  }

  if (dados && Array.isArray(dados.categoriasGastos)) {
    novo.categoriasGastos = [...new Set(dados.categoriasGastos.filter(Boolean))].sort();
  }

  if (dados && Array.isArray(dados.pagadoresGastos)) {
    novo.pagadoresGastos = [...new Set(dados.pagadoresGastos.filter(Boolean))].sort();
  }

  return novo;
}

function normalizarSenha(item, agora = new Date().toISOString()) {
  return {
    id: item.id || crypto.randomUUID(),
    servico: item.servico || "",
    usuario: item.usuario || "",
    senha: item.senha || "",
    url: item.url || "",
    observacoes: item.observacoes || "",
    criadoEm: item.criadoEm || agora,
    atualizadoEm: item.atualizadoEm || item.criadoEm || agora
  };
}

function normalizarGasto(item, agora = new Date().toISOString()) {
  const valorUnitario = Number(item.valorUnitario || item.valor || 0);
  const quantidade = Number(item.quantidade || 1);
  const tipo = item.tipo || "unico";
  const statusInicial = item.statusManual || item.status || "pendente";
  const data = item.data || agora.slice(0, 10);

  let unidades = [];

  if (Array.isArray(item.unidades) && item.unidades.length > 0) {
    unidades = item.unidades.map(unidade => ({
      id: unidade.id || crypto.randomUUID(),
      valor: Number(unidade.valor || valorUnitario || 0),
      statusManual: unidade.statusManual || unidade.status || statusInicial,
      pagador: unidade.pagador || "",
      pagoEm: unidade.pagoEm || "",
      data: unidade.data || data,
      criadoEm: unidade.criadoEm || item.criadoEm || agora,
      atualizadoEm: unidade.atualizadoEm || item.atualizadoEm || item.criadoEm || agora
    }));
  } else {
    for (let i = 0; i < quantidade; i++) {
      unidades.push({
        id: crypto.randomUUID(),
        valor: valorUnitario,
        statusManual: statusInicial,
        pagador: item.pagador || "",
        pagoEm: statusInicial === "pago" ? (item.pagoEm || agora) : "",
        data,
        criadoEm: item.criadoEm || agora,
        atualizadoEm: item.atualizadoEm || item.criadoEm || agora
      });
    }
  }

  return {
    id: item.id || crypto.randomUUID(),
    descricao: item.descricao || "",
    categoria: item.categoria || "",
    valorUnitario,
    quantidade: unidades.length,
    data,
    tipo,
    observacoes: item.observacoes || "",
    unidades,
    criadoEm: item.criadoEm || agora,
    atualizadoEm: item.atualizadoEm || item.criadoEm || agora
  };
}

/* =========================
   SENHAS
========================= */

async function adicionarSenha() {
  const servico = document.getElementById("servico").value.trim();
  const usuario = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const url = document.getElementById("url").value.trim();
  const observacoes = document.getElementById("observacoes").value.trim();

  if (!servico || !usuario || !senha) {
    alert("Preencha serviço, usuário e senha.");
    return;
  }

  const agora = new Date().toISOString();

  cofre.senhas.push({
    id: crypto.randomUUID(),
    servico,
    usuario,
    senha,
    url,
    observacoes,
    criadoEm: agora,
    atualizadoEm: agora
  });

  await salvarCofre();

  document.getElementById("servico").value = "";
  document.getElementById("usuario").value = "";
  document.getElementById("senha").value = "";
  document.getElementById("url").value = "";
  document.getElementById("observacoes").value = "";

  renderizarListaSenhas();
}

function renderizarListaSenhas() {
  const lista = document.getElementById("listaSenhas");
  if (!lista) return;

  lista.innerHTML = "";

  const filtrados = obterSenhasFiltradas();

  atualizarContadorSelecao(filtrados.length);

  if (filtrados.length === 0) {
    lista.innerHTML = "<p>Nenhuma senha encontrada.</p>";
    return;
  }

  filtrados.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";

    const marcado = itensSelecionados.has(item.id) ? "checked" : "";
    const dataAtualizacao = formatarDataCurta(item.atualizadoEm || item.criadoEm);

    div.innerHTML = `
      <div class="item-data">${dataAtualizacao}</div>

      <div class="item-topo">
        <input
          type="checkbox"
          class="item-check"
          ${marcado}
          onchange="alternarSelecao('${item.id}', this.checked)"
          aria-label="Selecionar ${escaparHtml(item.servico || "")}"
        />

        <div class="item-info">
          <strong>${escaparHtml(item.servico || "-")}</strong>
          <small>${escaparHtml(item.usuario || "-")}</small>
          ${item.url ? `<div class="item-url">${escaparHtml(item.url)}</div>` : ""}
        </div>
      </div>

      <div class="acoes">
        <button onclick="verSenha('${item.id}')">Ver</button>
        <button onclick="copiarSenha('${item.id}')">Copiar</button>
        <button onclick="excluirSenha('${item.id}')">Excluir</button>
      </div>
    `;

    lista.appendChild(div);
  });
}

function obterSenhasFiltradas() {
  const buscaCampo = document.getElementById("busca");
  const busca = buscaCampo ? buscaCampo.value.toLowerCase().trim() : "";

  if (!busca) {
    return cofre.senhas;
  }

  return cofre.senhas.filter(item => {
    const servico = (item.servico || "").toLowerCase();
    const usuario = (item.usuario || "").toLowerCase();
    const url = (item.url || "").toLowerCase();
    const observacoes = (item.observacoes || "").toLowerCase();

    return (
      servico.includes(busca) ||
      usuario.includes(busca) ||
      url.includes(busca) ||
      observacoes.includes(busca)
    );
  });
}

function verSenha(id) {
  const item = cofre.senhas.find(x => x.id === id);
  if (!item) return;

  alert(montarTextoCredencial(item));
}

async function copiarSenha(id) {
  const item = cofre.senhas.find(x => x.id === id);
  if (!item) return;

  const texto = montarTextoCredencial(item);

  try {
    await navigator.clipboard.writeText(texto);
    alert("Todas as informações foram copiadas para a área de transferência.");
  } catch (erro) {
    alert("Não foi possível copiar automaticamente. As informações serão exibidas na tela.");
    alert(texto);
  }
}

function montarTextoCredencial(item) {
  return (
    `Serviço: ${item.servico || "-"}\n` +
    `Usuário/E-mail: ${item.usuario || "-"}\n` +
    `Senha: ${item.senha || "-"}\n` +
    `URL: ${item.url || "-"}\n` +
    `Observações: ${item.observacoes || "-"}\n` +
    `Criado em: ${formatarDataHora(item.criadoEm)}\n` +
    `Última atualização: ${formatarDataHora(item.atualizadoEm || item.criadoEm)}`
  );
}

async function excluirSenha(id) {
  const confirmar = confirm("Tem certeza que deseja excluir esta senha?");
  if (!confirmar) return;

  cofre.senhas = cofre.senhas.filter(x => x.id !== id);
  itensSelecionados.delete(id);

  await salvarCofre();
  renderizarListaSenhas();
}

function gerarSenha() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()-_=+[]{}";
  let senha = "";

  for (let i = 0; i < 20; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }

  document.getElementById("senha").value = senha;
}

function alternarSelecao(id, marcado) {
  if (marcado) {
    itensSelecionados.add(id);
  } else {
    itensSelecionados.delete(id);
  }

  atualizarContadorSelecao(obterSenhasFiltradas().length);
}

function selecionarTodosFiltrados() {
  const filtrados = obterSenhasFiltradas();

  if (filtrados.length === 0) {
    alert("Nenhum item filtrado para selecionar.");
    return;
  }

  filtrados.forEach(item => itensSelecionados.add(item.id));
  renderizarListaSenhas();
}

function limparSelecao() {
  itensSelecionados.clear();
  renderizarListaSenhas();
}

function atualizarContadorSelecao(totalFiltrados = null) {
  const contador = document.getElementById("contadorItens");
  if (!contador) return;

  const total = cofre.senhas.length;
  const selecionados = itensSelecionados.size;
  const filtrados = totalFiltrados !== null ? totalFiltrados : obterSenhasFiltradas().length;

  if (selecionados === 0) {
    contador.textContent = `${total} senha(s) no cofre · ${filtrados} exibida(s) · nenhuma selecionada.`;
  } else {
    contador.textContent = `${total} senha(s) no cofre · ${filtrados} exibida(s) · ${selecionados} selecionada(s).`;
  }
}

/* =========================
   GASTOS
========================= */

async function adicionarGasto() {
  const descricao = document.getElementById("descricaoGasto").value.trim();
  const categoriaSelecionada = document.getElementById("categoriaGastoSelect").value.trim();
  const novaCategoria = document.getElementById("novaCategoriaGasto").value.trim();
  const valorUnitario = Number(document.getElementById("valorGasto").value);
  const quantidade = Number(document.getElementById("quantidadeGasto").value || 1);
  const data = document.getElementById("dataGasto").value;
  const tipo = document.getElementById("tipoGasto").value;
  const statusManual = document.getElementById("statusManualGasto").value;
  const pagadorSelecionado = document.getElementById("pagadorGastoSelect").value.trim();
  const novoPagador = document.getElementById("novoPagadorGasto").value.trim();
  const observacoes = document.getElementById("observacoesGasto").value.trim();

  if (!descricao || !valorUnitario || valorUnitario <= 0 || !data || !quantidade || quantidade <= 0) {
    alert("Preencha descrição, valor unitário, quantidade e data.");
    return;
  }

  if (categoriaSelecionada && novaCategoria) {
    alert("Escolha uma categoria existente OU digite uma nova categoria, nunca as duas ao mesmo tempo.");
    return;
  }

  if (!categoriaSelecionada && !novaCategoria) {
    alert("Selecione uma categoria existente ou informe uma nova categoria.");
    return;
  }

  let pagador = "";

  if (statusManual === "pago") {
    if (pagadorSelecionado && novoPagador) {
      alert("Escolha um pagador existente OU digite um novo pagador, nunca os dois ao mesmo tempo.");
      return;
    }

    if (!pagadorSelecionado && !novoPagador) {
      alert("Como o gasto está marcado como pago, informe quem pagou.");
      return;
    }

    pagador = novoPagador || pagadorSelecionado;

    if (novoPagador) {
      adicionarPagadorGastoSeNaoExistir(novoPagador);
    }
  }

  const categoria = novaCategoria || categoriaSelecionada;

  if (novaCategoria) {
    adicionarCategoriaGastoSeNaoExistir(novaCategoria);
  }

  const existente = cofre.gastos.find(g =>
    normalizarTextoComparacao(g.descricao) === normalizarTextoComparacao(descricao) &&
    normalizarTextoComparacao(g.categoria) === normalizarTextoComparacao(categoria) &&
    g.tipo === tipo
  );

  const agora = new Date().toISOString();

  const novasUnidades = criarUnidadesGasto({
    quantidade,
    valorUnitario,
    statusManual,
    pagador,
    data,
    agora
  });

  if (existente) {
    const resumoValores = calcularResumoValoresUnidades(existente);
    const valorMudou = Number(resumoValores.valorAtual || 0) !== Number(valorUnitario || 0);

    const mensagemValor = valorMudou
      ? `\n\nATENÇÃO: o valor mudou.\nValor atual do serviço: ${formatarMoeda(resumoValores.valorAtual)}\nNovo valor informado: ${formatarMoeda(valorUnitario)}`
      : `\n\nO valor unitário não mudou.\nValor atual: ${formatarMoeda(valorUnitario)}`;

    const adicionarAoExistente = confirm(
      `Já existe um gasto/serviço parecido:\n\n` +
      `${existente.descricao}\n` +
      `Categoria: ${existente.categoria}\n` +
      `Tipo: ${formatarTipoGasto(existente.tipo)}` +
      mensagemValor +
      `\n\nClique em OK para adicionar ${quantidade} unidade(s) ao serviço existente com o valor informado agora.\n` +
      `Clique em Cancelar para criar um novo serviço separado.`
    );

    if (adicionarAoExistente) {
      existente.unidades.push(...novasUnidades);
      existente.quantidade = existente.unidades.length;
      existente.valorUnitario = valorUnitario;
      existente.atualizadoEm = agora;

      if (observacoes) {
        existente.observacoes = existente.observacoes
          ? `${existente.observacoes}\n${observacoes}`
          : observacoes;
      }

      await salvarCofre();
      limparFormularioGasto();
      atualizarSelectCategoriasGastos();
      atualizarSelectPagadoresGastos();
      renderizarListaGastos();
      return;
    }
  }

  cofre.gastos.push({
    id: crypto.randomUUID(),
    descricao,
    categoria,
    valorUnitario,
    quantidade,
    data,
    tipo,
    observacoes,
    unidades: novasUnidades,
    criadoEm: agora,
    atualizadoEm: agora
  });

  await salvarCofre();

  limparFormularioGasto();
  atualizarSelectCategoriasGastos();
  atualizarSelectPagadoresGastos();
  renderizarListaGastos();
}

function criarUnidadesGasto({ quantidade, valorUnitario, statusManual, pagador, data, agora }) {
  const unidades = [];

  for (let i = 0; i < quantidade; i++) {
    unidades.push({
      id: crypto.randomUUID(),
      valor: valorUnitario,
      statusManual,
      pagador: statusManual === "pago" ? pagador : "",
      pagoEm: statusManual === "pago" ? agora : "",
      data,
      criadoEm: agora,
      atualizadoEm: agora
    });
  }

  return unidades;
}

function limparFormularioGasto() {
  document.getElementById("descricaoGasto").value = "";
  document.getElementById("categoriaGastoSelect").value = "";
  document.getElementById("novaCategoriaGasto").value = "";
  document.getElementById("valorGasto").value = "";
  document.getElementById("quantidadeGasto").value = "1";
  document.getElementById("observacoesGasto").value = "";
  document.getElementById("tipoGasto").value = "unico";
  document.getElementById("statusManualGasto").value = "pendente";
  document.getElementById("pagadorGastoSelect").value = "";
  document.getElementById("novoPagadorGasto").value = "";
  alternarCamposPagadorInicial();
  preencherDataGastoHoje();
}

/* =========================
   CATEGORIAS / PAGADORES
========================= */

function adicionarCategoriaGastoSeNaoExistir(categoria) {
  const nome = categoria.trim();
  if (!nome) return;

  if (!Array.isArray(cofre.categoriasGastos)) {
    cofre.categoriasGastos = [];
  }

  const existe = cofre.categoriasGastos.some(cat =>
    normalizarTextoComparacao(cat) === normalizarTextoComparacao(nome)
  );

  if (!existe) {
    cofre.categoriasGastos.push(nome);
    cofre.categoriasGastos.sort();
  }
}

function atualizarSelectCategoriasGastos() {
  const select = document.getElementById("categoriaGastoSelect");
  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Selecione uma categoria</option>`;

  if (!Array.isArray(cofre.categoriasGastos)) {
    cofre.categoriasGastos = [];
  }

  cofre.categoriasGastos.forEach(categoria => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    select.appendChild(option);
  });

  select.value = valorAtual;
}

function adicionarPagadorGastoSeNaoExistir(pagador) {
  const nome = pagador.trim();
  if (!nome) return;

  if (!Array.isArray(cofre.pagadoresGastos)) {
    cofre.pagadoresGastos = [];
  }

  const existe = cofre.pagadoresGastos.some(p =>
    normalizarTextoComparacao(p) === normalizarTextoComparacao(nome)
  );

  if (!existe) {
    cofre.pagadoresGastos.push(nome);
    cofre.pagadoresGastos.sort();
  }
}

function atualizarSelectPagadoresGastos() {
  const selectInicial = document.getElementById("pagadorGastoSelect");
  const filtroPagador = document.getElementById("filtroPagadorGastos");

  if (!Array.isArray(cofre.pagadoresGastos)) {
    cofre.pagadoresGastos = [];
  }

  if (selectInicial) {
    const valorAtual = selectInicial.value;
    selectInicial.innerHTML = `<option value="">Selecione quem pagou</option>`;

    cofre.pagadoresGastos.forEach(pagador => {
      const option = document.createElement("option");
      option.value = pagador;
      option.textContent = pagador;
      selectInicial.appendChild(option);
    });

    selectInicial.value = valorAtual;
  }

  if (filtroPagador) {
    const valorAtualFiltro = filtroPagador.value;
    filtroPagador.innerHTML = `<option value="">Todos os pagadores</option>`;

    cofre.pagadoresGastos.forEach(pagador => {
      const option = document.createElement("option");
      option.value = pagador;
      option.textContent = pagador;
      filtroPagador.appendChild(option);
    });

    filtroPagador.value = valorAtualFiltro;
  }
}

function alternarCamposPagadorInicial() {
  const status = document.getElementById("statusManualGasto");
  const box = document.getElementById("boxPagadorInicial");

  if (!status || !box) return;

  if (status.value === "pago") {
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
  }
}

function solicitarPagadorPagamento() {
  if (!Array.isArray(cofre.pagadoresGastos)) {
    cofre.pagadoresGastos = [];
  }

  let lista = "Quem pagou?\n\n";

  if (cofre.pagadoresGastos.length > 0) {
    lista += "Pagadores cadastrados:\n";

    cofre.pagadoresGastos.forEach((pagador, index) => {
      lista += `${index + 1} - ${pagador}\n`;
    });

    lista += "\nDigite o número da pessoa ou digite um novo nome:";
  } else {
    lista += "Digite o nome de quem pagou:";
  }

  const resposta = prompt(lista);

  if (resposta === null) return "";

  const texto = resposta.trim();

  if (!texto) {
    alert("Informe quem pagou.");
    return "";
  }

  const numero = Number(texto);

  if (
    Number.isInteger(numero) &&
    numero >= 1 &&
    numero <= cofre.pagadoresGastos.length
  ) {
    return cofre.pagadoresGastos[numero - 1];
  }

  return texto;
}

/* =========================
   LISTA / FILTROS DE GASTOS
========================= */

function renderizarListaGastos() {
  const lista = document.getElementById("listaGastos");
  if (!lista) return;

  lista.innerHTML = "";

  const filtrados = obterGastosFiltrados();

atualizarInsightsGastos(filtrados);
calcularInsightsFiltroPagador();
calcularDivisaoGastos();

  if (filtrados.length === 0) {
    lista.innerHTML = "<p>Nenhum gasto encontrado.</p>";
    return;
  }

  filtrados
    .slice()
    .sort((a, b) => new Date(obterMenorVencimentoDoGasto(b)) - new Date(obterMenorVencimentoDoGasto(a)))
    .forEach(item => {
      const resumo = calcularResumoGasto(item);
      const resumoValores = calcularResumoValoresUnidades(item);
      const pagadoresTexto = obterPagadoresTextoGasto(item);

      const div = document.createElement("div");
      div.className = `item status-${resumo.status}`;

      div.innerHTML = `
        <div class="item-data">${formatarDataCurta(resumo.proximoVencimento)}</div>

        <div class="item-info">
          <span class="status-badge ${resumo.status}">${resumo.rotulo}</span>

          <strong>${escaparHtml(item.descricao || "-")}</strong>
          <small>${escaparHtml(item.categoria || "Sem categoria")} · ${formatarTipoGasto(item.tipo)}</small>

          <div class="item-extra">
            Valor atual: ${formatarMoeda(resumoValores.valorAtual)} · Quantidade: ${resumo.quantidadeTotal}
          </div>

          ${
            resumoValores.valoresDiferentes
              ? `<div class="item-extra destaque-valor">
                  Valores diferentes: Sim · Menor: ${formatarMoeda(resumoValores.menorValor)} · Maior: ${formatarMoeda(resumoValores.maiorValor)}
                </div>`
              : `<div class="item-extra">Valores diferentes: Não</div>`
          }

          <div class="resumo-unidades">
            <div>
              <span>Pago</span>
              <strong>${resumo.quantidadePaga} un. · ${formatarMoeda(resumo.totalPago)}</strong>
            </div>
            <div>
              <span>Pendente</span>
              <strong>${resumo.quantidadePendente} un. · ${formatarMoeda(resumo.totalPendente)}</strong>
            </div>
            <div>
              <span>Vencido</span>
              <strong>${resumo.quantidadeVencida} un. · ${formatarMoeda(resumo.totalVencido)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>${resumo.quantidadeTotal} un. · ${formatarMoeda(resumo.totalGeral)}</strong>
            </div>
          </div>

          <div class="item-extra">
            Próximo vencimento: ${formatarDataCurta(resumo.proximoVencimento)}
          </div>

          ${item.observacoes ? `<div class="item-extra">${escaparHtml(item.observacoes)}</div>` : ""}
          ${pagadoresTexto ? `<div class="item-extra">Pago por: ${escaparHtml(pagadoresTexto)}</div>` : ""}
        </div>

        <div class="acoes">
          <button onclick="verGasto('${item.id}')">Ver</button>
          <button onclick="editarGasto('${item.id}')">Editar</button>
          <button onclick="excluirGasto('${item.id}')">Excluir</button>
        </div>

        <div class="acoes">
          <button onclick="pagarUmaUnidadeGasto('${item.id}')">Pagar unidade</button>
          <button onclick="adicionarUnidadeRapida('${item.id}')">+ Unidade</button>
          <button onclick="marcarTudoPago('${item.id}')">Tudo pago</button>
        </div>

        <div class="acoes">
          <button onclick="marcarTudoPendente('${item.id}')">Tudo pendente</button>
        </div>
      `;

      lista.appendChild(div);
    });
}

function obterGastosFiltrados() {
  const buscaCampo = document.getElementById("buscaGastos");
  const busca = buscaCampo ? buscaCampo.value.toLowerCase().trim() : "";

  const filtroPagadorCampo = document.getElementById("filtroPagadorGastos");
  const filtroPagador = filtroPagadorCampo ? filtroPagadorCampo.value.trim() : "";

  const filtroPeriodoCampo = document.getElementById("filtroPeriodoPagadorGastos");
  const filtroPeriodo = filtroPeriodoCampo ? filtroPeriodoCampo.value : "todos";

  const dataInicioCampo = document.getElementById("filtroDataPagamentoInicio");
  const dataFimCampo = document.getElementById("filtroDataPagamentoFim");

  const dataInicio = dataInicioCampo ? dataInicioCampo.value : "";
  const dataFim = dataFimCampo ? dataFimCampo.value : "";

  return cofre.gastos.filter(item => {
    const resumo = calcularResumoGasto(item);

    const descricao = (item.descricao || "").toLowerCase();
    const categoria = (item.categoria || "").toLowerCase();
    const observacoes = (item.observacoes || "").toLowerCase();
    const tipo = formatarTipoGasto(item.tipo).toLowerCase();
    const status = resumo.rotulo.toLowerCase();
    const pagadoresTexto = obterPagadoresTextoGasto(item).toLowerCase();

    const passouBusca = !busca || (
      descricao.includes(busca) ||
      categoria.includes(busca) ||
      observacoes.includes(busca) ||
      tipo.includes(busca) ||
      status.includes(busca) ||
      pagadoresTexto.includes(busca)
    );

    const existeFiltroPagamento =
      filtroPagador ||
      filtroPeriodo === "mes" ||
      filtroPeriodo === "personalizado" ||
      dataInicio ||
      dataFim;

    const passouPagamento = !existeFiltroPagamento || gastoTemPagamentoNoFiltro(
      item,
      filtroPagador,
      filtroPeriodo,
      dataInicio,
      dataFim
    );

    return passouBusca && passouPagamento;
  });
}

function obterPagadoresTextoGasto(gasto) {
  const unidades = Array.isArray(gasto.unidades) ? gasto.unidades : [];

  const pagadores = unidades
    .filter(u => u.statusManual === "pago" && u.pagador)
    .map(u => u.pagador);

  return [...new Set(pagadores)].join(", ");
}

function gastoTemPagamentoNoFiltro(gasto, pagador = "", periodo = "todos", dataInicio = "", dataFim = "") {
  const unidades = Array.isArray(gasto.unidades) ? gasto.unidades : [];

  return unidades.some(unidade => {
    if (unidade.statusManual !== "pago") return false;

    if (pagador) {
      if (normalizarTextoComparacao(unidade.pagador) !== normalizarTextoComparacao(pagador)) {
        return false;
      }
    }

    if (!unidade.pagoEm) return false;

    return pagamentoEstaNoPeriodo(unidade.pagoEm, periodo, dataInicio, dataFim);
  });
}

function pagamentoEstaNoPeriodo(dataPagamentoIso, periodo = "todos", dataInicio = "", dataFim = "") {
  if (!dataPagamentoIso) return false;

  const dataPagamento = new Date(dataPagamentoIso);

  if (isNaN(dataPagamento.getTime())) return false;

  const dataPagamentoLocal = obterDataLocalSemHora(dataPagamento);

  if (periodo === "mes") {
    const hoje = new Date();

    return (
      dataPagamento.getMonth() === hoje.getMonth() &&
      dataPagamento.getFullYear() === hoje.getFullYear()
    );
  }

  if (dataInicio) {
    const inicio = criarDataLocal(dataInicio);

    if (dataPagamentoLocal < inicio) {
      return false;
    }
  }

  if (dataFim) {
    const fim = criarDataLocal(dataFim);

    if (dataPagamentoLocal > fim) {
      return false;
    }
  }

  return true;
}

function calcularInsightsFiltroPagador() {
  const filtroPagadorCampo = document.getElementById("filtroPagadorGastos");
  const filtroPagador = filtroPagadorCampo ? filtroPagadorCampo.value.trim() : "";

  const filtroPeriodoCampo = document.getElementById("filtroPeriodoPagadorGastos");
  const filtroPeriodo = filtroPeriodoCampo ? filtroPeriodoCampo.value : "todos";

  const dataInicioCampo = document.getElementById("filtroDataPagamentoInicio");
  const dataFimCampo = document.getElementById("filtroDataPagamentoFim");

  const dataInicio = dataInicioCampo ? dataInicioCampo.value : "";
  const dataFim = dataFimCampo ? dataFimCampo.value : "";

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const totais = {
    totalPago: 0,
    pagoMes: 0
  };

  cofre.gastos.forEach(gasto => {
    const unidades = Array.isArray(gasto.unidades) ? gasto.unidades : [];

    unidades.forEach(unidade => {
      if (unidade.statusManual !== "pago") return;

      if (filtroPagador) {
        if (normalizarTextoComparacao(unidade.pagador) !== normalizarTextoComparacao(filtroPagador)) {
          return;
        }
      }

      if (!unidade.pagoEm) return;

      if (!pagamentoEstaNoPeriodo(unidade.pagoEm, filtroPeriodo, dataInicio, dataFim)) {
        return;
      }

      const valor = Number(unidade.valor || gasto.valorUnitario || 0);
      const dataPagamento = new Date(unidade.pagoEm);

      totais.totalPago += valor;

      if (
        dataPagamento.getMonth() === mesAtual &&
        dataPagamento.getFullYear() === anoAtual
      ) {
        totais.pagoMes += valor;
      }
    });
  });

  definirTexto("insightFiltroTotalPago", formatarMoeda(totais.totalPago));
  definirTexto("insightFiltroPagoMes", formatarMoeda(totais.pagoMes));
}

/* =========================
   CÁLCULOS DE GASTOS
========================= */

function calcularResumoGasto(gasto) {
  const unidades = Array.isArray(gasto.unidades) ? gasto.unidades : [];

  const resumo = {
    quantidadeTotal: unidades.length,
    quantidadePaga: 0,
    quantidadePendente: 0,
    quantidadeVencida: 0,
    totalPago: 0,
    totalPendente: 0,
    totalVencido: 0,
    totalGeral: 0,
    status: "pendente",
    rotulo: "PENDENTE",
    proximoVencimento: gasto.data || new Date().toISOString().slice(0, 10)
  };

  unidades.forEach(unidade => {
    const info = obterStatusUnidadeGasto(gasto, unidade);
    const valor = Number(unidade.valor || gasto.valorUnitario || 0);

    resumo.totalGeral += valor;

    if (info.status === "pago") {
      resumo.quantidadePaga++;
      resumo.totalPago += valor;
    }

    if (info.status === "pendente") {
      resumo.quantidadePendente++;
      resumo.totalPendente += valor;
    }

    if (info.status === "vencido") {
      resumo.quantidadeVencida++;
      resumo.totalVencido += valor;
    }
  });

  resumo.proximoVencimento = obterProximoVencimentoVisualGasto(gasto);

  if (resumo.quantidadeVencida > 0) {
    resumo.status = "vencido";
    resumo.rotulo = "VENCIDO";
  } else if (resumo.quantidadePendente > 0) {
    resumo.status = "pendente";
    resumo.rotulo = resumo.quantidadePaga > 0 ? "PENDENTE PARCIAL" : "PENDENTE";
  } else {
    resumo.status = "pago";
    resumo.rotulo = "PAGO";
  }

  return resumo;
}

function calcularResumoValoresUnidades(gasto) {
  const unidades = Array.isArray(gasto.unidades) ? gasto.unidades : [];

  const valores = unidades
    .map(unidade => Number(unidade.valor || 0))
    .filter(valor => valor > 0);

  if (valores.length === 0) {
    const valor = Number(gasto.valorUnitario || 0);

    return {
      valorAtual: valor,
      menorValor: valor,
      maiorValor: valor,
      valoresDiferentes: false
    };
  }

  const menorValor = Math.min(...valores);
  const maiorValor = Math.max(...valores);
  const valorAtual = Number(gasto.valorUnitario || valores[valores.length - 1] || 0);

  return {
    valorAtual,
    menorValor,
    maiorValor,
    valoresDiferentes: menorValor !== maiorValor
  };
}

function obterStatusUnidadeGasto(gasto, unidade) {
  const vencimentoAtual = obterVencimentoAtualUnidade(gasto, unidade);
  const hoje = obterDataLocalSemHora(new Date());
  const dataVencimento = criarDataLocal(vencimentoAtual);

  if (unidade.statusManual === "pago") {
    return {
      status: "pago",
      rotulo: "PAGO",
      vencimento: obterProximoCicloAposPagamento(gasto, unidade)
    };
  }

  if (dataVencimento < hoje) {
    return {
      status: "vencido",
      rotulo: "VENCIDO",
      vencimento: vencimentoAtual
    };
  }

  return {
    status: "pendente",
    rotulo: "PENDENTE",
    vencimento: vencimentoAtual
  };
}

function obterProximoVencimento(gasto, dataBaseInformada) {
  const dataBase = dataBaseInformada || gasto.data || new Date().toISOString().slice(0, 10);
  const tipo = gasto.tipo || "unico";

  if (tipo === "unico") {
    return dataBase;
  }

  const hoje = obterDataLocalSemHora(new Date());
  let vencimento = criarDataLocal(dataBase);

  if (tipo === "mensal") {
    while (vencimento < hoje) {
      vencimento.setMonth(vencimento.getMonth() + 1);
    }
  }

  if (tipo === "anual") {
    while (vencimento < hoje) {
      vencimento.setFullYear(vencimento.getFullYear() + 1);
    }
  }

  return dataParaInputDate(vencimento);
}

function obterVencimentoAtualUnidade(gasto, unidade) {
  const dataBase = unidade.data || gasto.data || new Date().toISOString().slice(0, 10);
  const tipo = gasto.tipo || "unico";

  if (tipo === "unico") {
    return dataBase;
  }

  return obterProximoVencimento(gasto, dataBase);
}

function obterProximoCicloAposPagamento(gasto, unidade) {
  const tipo = gasto.tipo || "unico";
  const dataReferencia = unidade.pagoEm
    ? unidade.pagoEm.slice(0, 10)
    : unidade.data || gasto.data || new Date().toISOString().slice(0, 10);

  if (tipo === "unico") {
    return unidade.data || gasto.data || dataReferencia;
  }

  const data = criarDataLocal(dataReferencia);

  if (tipo === "mensal") {
    data.setMonth(data.getMonth() + 1);
  }

  if (tipo === "anual") {
    data.setFullYear(data.getFullYear() + 1);
  }

  return dataParaInputDate(data);
}

function obterProximoVencimentoVisualGasto(gasto) {
  const unidades = Array.isArray(gasto.unidades) ? gasto.unidades : [];

  if (unidades.length === 0) {
    return obterProximoVencimento(gasto, gasto.data);
  }

  const vencimentos = unidades.map(unidade => {
    const info = obterStatusUnidadeGasto(gasto, unidade);
    return info.vencimento;
  });

  vencimentos.sort();

  return vencimentos[0];
}

function obterMenorVencimentoDoGasto(gasto) {
  return obterProximoVencimentoVisualGasto(gasto);
}

function atualizarInsightsGastos(lista = cofre.gastos) {
  const resumo = calcularResumoGastos(lista);

  definirTexto("insightTotalPago", formatarMoeda(resumo.totalPago));
  definirTexto("insightTotalPendente", formatarMoeda(resumo.totalPendente));
  definirTexto("insightTotalVencido", formatarMoeda(resumo.totalVencido));
  definirTexto("insightTotalGeral", formatarMoeda(resumo.totalGeral));

  definirTexto("insightPagoMes", formatarMoeda(resumo.pagoMes));
  definirTexto("insightVencendoMes", formatarMoeda(resumo.vencendoMes));
  definirTexto("insightVencidoMes", formatarMoeda(resumo.vencidoMes));
  definirTexto("insightTotalMes", formatarMoeda(resumo.totalMes));

  definirTexto("insightQuantidadeServicos", String(lista.length));
  definirTexto("insightQuantidadeUnidades", String(resumo.quantidadeUnidades));
}

function calcularResumoGastos(lista = cofre.gastos) {
  const resumo = {
    totalPago: 0,
    totalPendente: 0,
    totalVencido: 0,
    totalGeral: 0,
    pagoMes: 0,
    vencendoMes: 0,
    vencidoMes: 0,
    totalMes: 0,
    quantidadeUnidades: 0
  };

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  lista.forEach(gasto => {
    const unidades = Array.isArray(gasto.unidades) ? gasto.unidades : [];

    unidades.forEach(unidade => {
      const valor = Number(unidade.valor || gasto.valorUnitario || 0);
      const info = obterStatusUnidadeGasto(gasto, unidade);
      const vencimento = criarDataLocal(info.vencimento);

      resumo.totalGeral += valor;
      resumo.quantidadeUnidades++;

      const ehMesAtual = vencimento.getMonth() === mesAtual && vencimento.getFullYear() === anoAtual;

      if (info.status === "pago") {
        resumo.totalPago += valor;

        if (unidade.pagoEm) {
          const dataPagamento = new Date(unidade.pagoEm);

          if (
            dataPagamento.getMonth() === mesAtual &&
            dataPagamento.getFullYear() === anoAtual
          ) {
            resumo.pagoMes += valor;
          }
        } else if (ehMesAtual) {
          resumo.pagoMes += valor;
        }
      }

      if (info.status === "pendente") {
        resumo.totalPendente += valor;
        if (ehMesAtual) resumo.vencendoMes += valor;
      }

      if (info.status === "vencido") {
        resumo.totalVencido += valor;
        if (ehMesAtual) resumo.vencidoMes += valor;
      }

      if (ehMesAtual) {
        resumo.totalMes += valor;
      }
    });
  });

  return resumo;
}

function calcularDivisaoGastos() {
  const quantidadeCampo = document.getElementById("quantidadePessoasDivisao");
  const tipoCampo = document.getElementById("tipoDivisaoGastos");

  if (!quantidadeCampo || !tipoCampo) return;

  const quantidade = Number(quantidadeCampo.value || 0);
  const tipo = tipoCampo.value;
  const resumo = calcularResumoGastos(obterGastosFiltrados());

  let total = resumo.totalGeral;

  if (tipo === "pago") total = resumo.totalPago;
  if (tipo === "pendente") total = resumo.totalPendente;
  if (tipo === "vencido") total = resumo.totalVencido;
  if (tipo === "mes") total = resumo.totalMes;
  if (tipo === "pagoMes") total = resumo.pagoMes;
  if (tipo === "vencendoMes") total = resumo.vencendoMes;
  if (tipo === "vencidoMes") total = resumo.vencidoMes;

  const porPessoa = quantidade > 0 ? total / quantidade : 0;

  definirTexto("valorTotalDivisao", formatarMoeda(total));
  definirTexto("valorPorPessoaDivisao", formatarMoeda(porPessoa));
}

/* =========================
   AÇÕES DOS GASTOS
========================= */

function verGasto(id) {
  const item = cofre.gastos.find(x => x.id === id);
  if (!item) return;

  alert(montarTextoGasto(item));
}

function montarTextoGasto(item) {
  const resumo = calcularResumoGasto(item);
  const resumoValores = calcularResumoValoresUnidades(item);

  return (
    `Descrição: ${item.descricao || "-"}\n` +
    `Categoria: ${item.categoria || "-"}\n` +
    `Valor atual: ${formatarMoeda(resumoValores.valorAtual)}\n` +
    `Valores diferentes: ${resumoValores.valoresDiferentes ? "Sim" : "Não"}\n` +
    `Menor valor: ${formatarMoeda(resumoValores.menorValor)}\n` +
    `Maior valor: ${formatarMoeda(resumoValores.maiorValor)}\n` +
    `Quantidade: ${resumo.quantidadeTotal}\n` +
    `Tipo: ${formatarTipoGasto(item.tipo)}\n` +
    `Status geral: ${resumo.rotulo}\n` +
    `Total geral: ${formatarMoeda(resumo.totalGeral)}\n` +
    `Total pago: ${formatarMoeda(resumo.totalPago)}\n` +
    `Total pendente: ${formatarMoeda(resumo.totalPendente)}\n` +
    `Total vencido: ${formatarMoeda(resumo.totalVencido)}\n` +
    `Pago por: ${obterPagadoresTextoGasto(item) || "-"}\n` +
    `Data inicial: ${formatarDataCurta(item.data)}\n` +
    `Próximo vencimento: ${formatarDataCurta(resumo.proximoVencimento)}\n` +
    `Observações: ${item.observacoes || "-"}\n` +
    `Criado em: ${formatarDataHora(item.criadoEm)}\n` +
    `Última atualização: ${formatarDataHora(item.atualizadoEm || item.criadoEm)}`
  );
}

function editarGasto(id) {
  const gasto = cofre.gastos.find(item => item.id === id);

  if (!gasto) {
    alert("Gasto não encontrado.");
    return;
  }

  atualizarSelectCategoriasEdicaoGastos();
  atualizarSelectPagadoresEdicaoGastos();

  const resumoValores = calcularResumoValoresUnidades(gasto);

  document.getElementById("editarGastoId").value = gasto.id;
  document.getElementById("editarDescricaoGasto").value = gasto.descricao || "";
  document.getElementById("editarCategoriaGastoSelect").value = gasto.categoria || "";
  document.getElementById("editarNovaCategoriaGasto").value = "";
  document.getElementById("editarValorGasto").value = Number(resumoValores.valorAtual || gasto.valorUnitario || 0).toFixed(2);
  document.getElementById("editarDataGasto").value = gasto.data || new Date().toISOString().slice(0, 10);
  document.getElementById("editarTipoGasto").value = gasto.tipo || "unico";
  document.getElementById("editarStatusGasto").value = "manter";
  document.getElementById("editarObservacoesGasto").value = gasto.observacoes || "";
  document.getElementById("editarPagadorGastoSelect").value = "";
  document.getElementById("editarNovoPagadorGasto").value = "";

  alternarBoxEditarPagador();

  const card = document.getElementById("cardEditarGasto");
  card.classList.remove("hidden");

  card.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function cancelarEdicaoGasto() {
  limparFormularioEdicaoGasto();

  const card = document.getElementById("cardEditarGasto");
  if (card) {
    card.classList.add("hidden");
  }
}

function limparFormularioEdicaoGasto() {
  const campos = [
    "editarGastoId",
    "editarDescricaoGasto",
    "editarCategoriaGastoSelect",
    "editarNovaCategoriaGasto",
    "editarValorGasto",
    "editarDataGasto",
    "editarObservacoesGasto",
    "editarPagadorGastoSelect",
    "editarNovoPagadorGasto"
  ];

  campos.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.value = "";
  });

  const tipo = document.getElementById("editarTipoGasto");
  if (tipo) tipo.value = "unico";

  const status = document.getElementById("editarStatusGasto");
  if (status) status.value = "manter";

  alternarBoxEditarPagador();
}

async function salvarEdicaoGasto() {
  const id = document.getElementById("editarGastoId").value;
  const gasto = cofre.gastos.find(item => item.id === id);

  if (!gasto) {
    alert("Gasto não encontrado.");
    return;
  }

  const descricao = document.getElementById("editarDescricaoGasto").value.trim();
  const categoriaSelecionada = document.getElementById("editarCategoriaGastoSelect").value.trim();
  const novaCategoria = document.getElementById("editarNovaCategoriaGasto").value.trim();
  const valorNovo = Number(document.getElementById("editarValorGasto").value);
  const data = document.getElementById("editarDataGasto").value;
  const tipo = document.getElementById("editarTipoGasto").value;
  const status = document.getElementById("editarStatusGasto").value;
  const observacoes = document.getElementById("editarObservacoesGasto").value.trim();

  const pagadorSelecionado = document.getElementById("editarPagadorGastoSelect").value.trim();
  const novoPagador = document.getElementById("editarNovoPagadorGasto").value.trim();

  if (!descricao || !valorNovo || valorNovo <= 0 || !data) {
    alert("Preencha descrição, valor e data.");
    return;
  }

  if (categoriaSelecionada && novaCategoria) {
    alert("Escolha uma categoria existente OU digite uma nova categoria, nunca as duas ao mesmo tempo.");
    return;
  }

  if (!categoriaSelecionada && !novaCategoria) {
    alert("Selecione uma categoria existente ou informe uma nova categoria.");
    return;
  }

  let pagador = "";

  if (status === "pago") {
    if (pagadorSelecionado && novoPagador) {
      alert("Escolha um pagador existente OU digite um novo pagador, nunca os dois ao mesmo tempo.");
      return;
    }

    if (!pagadorSelecionado && !novoPagador) {
      alert("Para marcar como pago, informe quem pagou.");
      return;
    }

    pagador = novoPagador || pagadorSelecionado;

    if (novoPagador) {
      adicionarPagadorGastoSeNaoExistir(novoPagador);
    }
  }

  const categoria = novaCategoria || categoriaSelecionada;

  if (novaCategoria) {
    adicionarCategoriaGastoSeNaoExistir(novaCategoria);
  }

  const valorAntigo = Number(gasto.valorUnitario || 0);
  const valorMudou = valorAntigo !== valorNovo;

  const agora = new Date().toISOString();

  gasto.descricao = descricao;
  gasto.categoria = categoria;
  gasto.data = data;
  gasto.tipo = tipo;
  gasto.observacoes = observacoes;
  gasto.atualizadoEm = agora;

  if (valorMudou) {
    const aplicarEmTodas = confirm(
      `O valor foi alterado.\n\n` +
      `Valor anterior: ${formatarMoeda(valorAntigo)}\n` +
      `Novo valor: ${formatarMoeda(valorNovo)}\n\n` +
      `Clique em OK para aplicar o novo valor em TODAS as unidades.\n` +
      `Clique em Cancelar para manter os valores antigos e alterar apenas o valor atual do serviço.`
    );

    gasto.valorUnitario = valorNovo;

    if (aplicarEmTodas) {
      gasto.unidades.forEach(unidade => {
        unidade.valor = valorNovo;
        unidade.atualizadoEm = agora;
      });
    }
  } else {
    gasto.valorUnitario = valorNovo;
  }

  if (status === "pendente") {
    const confirmar = confirm("Deseja marcar todas as unidades como pendentes?");
    if (!confirmar) return;

    gasto.unidades.forEach(unidade => {
      unidade.statusManual = "pendente";
      unidade.pagador = "";
      unidade.pagoEm = "";
      unidade.atualizadoEm = agora;
    });
  }

  if (status === "pago") {
    const confirmar = confirm(`Deseja marcar todas as unidades como pagas por ${pagador}?`);
    if (!confirmar) return;

    adicionarPagadorGastoSeNaoExistir(pagador);

    gasto.unidades.forEach(unidade => {
      unidade.statusManual = "pago";
      unidade.pagador = pagador;
      unidade.pagoEm = agora;
      unidade.atualizadoEm = agora;
    });
  }

  gasto.quantidade = Array.isArray(gasto.unidades) ? gasto.unidades.length : 0;

  await salvarCofre();

  atualizarSelectCategoriasGastos();
  atualizarSelectPagadoresGastos();
  atualizarSelectCategoriasEdicaoGastos();
  atualizarSelectPagadoresEdicaoGastos();

  cancelarEdicaoGasto();
  renderizarListaGastos();

  alert("Gasto editado com sucesso.");
}

function atualizarSelectCategoriasEdicaoGastos() {
  const select = document.getElementById("editarCategoriaGastoSelect");
  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Selecione uma categoria</option>`;

  if (!Array.isArray(cofre.categoriasGastos)) {
    cofre.categoriasGastos = [];
  }

  cofre.categoriasGastos.forEach(categoria => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    select.appendChild(option);
  });

  select.value = valorAtual;
}

function atualizarSelectPagadoresEdicaoGastos() {
  const select = document.getElementById("editarPagadorGastoSelect");
  if (!select) return;

  const valorAtual = select.value;

  select.innerHTML = `<option value="">Selecione quem pagou</option>`;

  if (!Array.isArray(cofre.pagadoresGastos)) {
    cofre.pagadoresGastos = [];
  }

  cofre.pagadoresGastos.forEach(pagador => {
    const option = document.createElement("option");
    option.value = pagador;
    option.textContent = pagador;
    select.appendChild(option);
  });

  select.value = valorAtual;
}

function alternarBoxEditarPagador() {
  const status = document.getElementById("editarStatusGasto");
  const box = document.getElementById("boxEditarPagadorGasto");

  if (!status || !box) return;

  if (status.value === "pago") {
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
  }
}

async function pagarUmaUnidadeGasto(id) {
  const gasto = cofre.gastos.find(x => x.id === id);
  if (!gasto) return;

  const unidade = gasto.unidades.find(u => {
    const info = obterStatusUnidadeGasto(gasto, u);
    return info.status === "vencido" || info.status === "pendente";
  });

  if (!unidade) {
    alert("Todas as unidades deste serviço já estão pagas.");
    return;
  }

  const pagador = solicitarPagadorPagamento();

  if (!pagador) return;

  const agora = new Date().toISOString();

  unidade.statusManual = "pago";
  unidade.pagador = pagador;
  unidade.pagoEm = agora;
  unidade.atualizadoEm = agora;
  gasto.atualizadoEm = agora;

  adicionarPagadorGastoSeNaoExistir(pagador);

  await salvarCofre();
  atualizarSelectPagadoresGastos();
  renderizarListaGastos();
}

async function adicionarUnidadeRapida(id) {
  const gasto = cofre.gastos.find(x => x.id === id);
  if (!gasto) return;

  const valorAtual = Number(gasto.valorUnitario || 0);

  const respostaValor = prompt(
    `Informe o valor unitário da nova unidade.\n\nValor atual: ${formatarMoeda(valorAtual)}\n\nSe não mudou, mantenha o mesmo valor.`,
    String(valorAtual.toFixed(2))
  );

  if (respostaValor === null) return;

  const novoValor = Number(String(respostaValor).replace(",", "."));

  if (!novoValor || novoValor <= 0) {
    alert("Valor inválido.");
    return;
  }

  const status = confirm("A nova unidade já está paga?\n\nOK = paga\nCancelar = pendente")
    ? "pago"
    : "pendente";

  let pagador = "";

  if (status === "pago") {
    pagador = solicitarPagadorPagamento();
    if (!pagador) return;
    adicionarPagadorGastoSeNaoExistir(pagador);
  }

  const agora = new Date().toISOString();

  gasto.unidades.push({
    id: crypto.randomUUID(),
    valor: novoValor,
    statusManual: status,
    pagador: status === "pago" ? pagador : "",
    pagoEm: status === "pago" ? agora : "",
    data: new Date().toISOString().slice(0, 10),
    criadoEm: agora,
    atualizadoEm: agora
  });

  gasto.valorUnitario = novoValor;
  gasto.quantidade = gasto.unidades.length;
  gasto.atualizadoEm = agora;

  await salvarCofre();
  atualizarSelectPagadoresGastos();
  renderizarListaGastos();
}

async function marcarTudoPago(id) {
  const gasto = cofre.gastos.find(x => x.id === id);
  if (!gasto) return;

  const confirmar = confirm("Deseja marcar todas as unidades como pagas?");
  if (!confirmar) return;

  const pagador = solicitarPagadorPagamento();

  if (!pagador) return;

  adicionarPagadorGastoSeNaoExistir(pagador);

  const agora = new Date().toISOString();

  gasto.unidades.forEach(unidade => {
    unidade.statusManual = "pago";
    unidade.pagador = pagador;
    unidade.pagoEm = agora;
    unidade.atualizadoEm = agora;
  });

  gasto.atualizadoEm = agora;

  await salvarCofre();
  atualizarSelectPagadoresGastos();
  renderizarListaGastos();
}

async function marcarTudoPendente(id) {
  const gasto = cofre.gastos.find(x => x.id === id);
  if (!gasto) return;

  const confirmar = confirm("Deseja marcar todas as unidades como pendentes?");
  if (!confirmar) return;

  const agora = new Date().toISOString();

  gasto.unidades.forEach(unidade => {
    unidade.statusManual = "pendente";
    unidade.pagador = "";
    unidade.pagoEm = "";
    unidade.atualizadoEm = agora;
  });

  gasto.atualizadoEm = agora;

  await salvarCofre();
  renderizarListaGastos();
}

async function excluirGasto(id) {
  const confirmar = confirm("Tem certeza que deseja excluir este gasto/serviço?");
  if (!confirmar) return;

  cofre.gastos = cofre.gastos.filter(x => x.id !== id);

  await salvarCofre();
  renderizarListaGastos();
}

function preencherDataGastoHoje() {
  const campo = document.getElementById("dataGasto");
  if (!campo) return;

  campo.value = new Date().toISOString().slice(0, 10);
}

/* =========================
   BACKUP / EXPORTAÇÃO / IMPORTAÇÃO
========================= */

async function exportarTudo() {
  if (!chaveCriptografica) {
    alert("Cofre bloqueado. Desbloqueie antes de exportar.");
    return;
  }

  const confirmar = confirm("Deseja exportar TODO o cofre, incluindo senhas e gastos, em arquivo criptografado?");
  if (!confirmar) return;

  await exportarPacote(cofre, "completo");
}

async function exportarSenhas() {
  if (!chaveCriptografica) {
    alert("Cofre bloqueado. Desbloqueie antes de exportar.");
    return;
  }

  if (cofre.senhas.length === 0) {
    alert("Não há senhas para exportar.");
    return;
  }

  const pacote = {
    senhas: cofre.senhas,
    gastos: [],
    categoriasGastos: [],
    pagadoresGastos: []
  };

  await exportarPacote(pacote, "senhas");
}

async function exportarSelecionadas() {
  if (!chaveCriptografica) {
    alert("Cofre bloqueado. Desbloqueie antes de exportar.");
    return;
  }

  if (itensSelecionados.size === 0) {
    alert("Selecione pelo menos uma senha para exportar.");
    return;
  }

  const selecionadas = cofre.senhas.filter(item => itensSelecionados.has(item.id));

  if (selecionadas.length === 0) {
    alert("Nenhuma senha selecionada foi encontrada.");
    return;
  }

  const pacote = {
    senhas: selecionadas,
    gastos: [],
    categoriasGastos: [],
    pagadoresGastos: []
  };

  await exportarPacote(pacote, "senhas-selecionadas");
}

async function exportarPacote(dados, tipo) {
  try {
    const pacote = {
      app: "Nexus Vault",
      empresa: "Nexus Connect",
      tipo,
      versao: 5,
      exportadoEm: new Date().toISOString(),
      dados: normalizarEstruturaCofre(dados)
    };

    const texto = JSON.stringify(pacote);
    const dadosCriptografados = await criptografar(texto, chaveCriptografica);

    const backup = {
      app: "Nexus Vault",
      empresa: "Nexus Connect",
      formato: "backup-criptografado",
      algoritmo: "AES-GCM",
      kdf: "PBKDF2-SHA256",
      versao: 5,
      tipo,
      exportadoEm: new Date().toISOString(),
      quantidadeSenhas: pacote.dados.senhas.length,
      quantidadeGastos: pacote.dados.gastos.length,
      payload: dadosCriptografados
    };

    baixarArquivoJson(backup, `nexus-vault-${tipo}-${gerarDataArquivo()}.json`);

    alert("Exportação criptografada concluída com sucesso.");
  } catch (erro) {
    alert("Erro ao exportar dados.");
    console.error(erro);
  }
}

async function importarBackup(event) {
  const arquivo = event.target.files[0];
  event.target.value = "";

  if (!arquivo) return;

  if (!chaveCriptografica) {
    alert("Desbloqueie o cofre antes de importar.");
    return;
  }

  const confirmar = confirm(
    "Você selecionou um backup. Ele será descriptografado usando a senha mestra atual.\n\nDeseja continuar?"
  );

  if (!confirmar) return;

  try {
    const textoArquivo = await lerArquivoComoTexto(arquivo);
    const backup = JSON.parse(textoArquivo);

    if (!backup.payload || !backup.payload.iv || !backup.payload.dados) {
      alert("Arquivo de backup inválido.");
      return;
    }

    const textoDescriptografado = await descriptografar(backup.payload, chaveCriptografica);
    const pacote = JSON.parse(textoDescriptografado);

    let dadosImportados;

    if (pacote.dados) {
      dadosImportados = normalizarEstruturaCofre(pacote.dados);
    } else if (pacote.itens) {
      dadosImportados = normalizarEstruturaCofre(pacote.itens);
    } else {
      alert("Backup descriptografado, mas o formato não foi reconhecido.");
      return;
    }

    const totalSenhas = dadosImportados.senhas.length;
    const totalGastos = dadosImportados.gastos.length;

    const substituir = confirm(
      `Backup encontrado:\n\n` +
      `Senhas: ${totalSenhas}\n` +
      `Gastos: ${totalGastos}\n\n` +
      `Clique em OK para SUBSTITUIR o cofre atual.\n` +
      `Clique em Cancelar para MESCLAR com os dados atuais.`
    );

    if (substituir) {
      const confirmaSubstituir = confirm(
        "ATENÇÃO: substituir apagará os dados atuais deste aparelho e colocará os dados do backup.\n\nDeseja realmente substituir?"
      );

      if (!confirmaSubstituir) return;

      cofre = dadosImportados;
    } else {
      mesclarDadosImportados(dadosImportados);
    }

    await salvarCofre();

    itensSelecionados.clear();
    atualizarSelectCategoriasGastos();
    atualizarSelectPagadoresGastos();
    renderizarListaSenhas();
    renderizarListaGastos();

    alert("Backup importado com sucesso.");
  } catch (erro) {
    alert("Erro ao importar backup. Verifique se o arquivo é válido e se a senha mestra é a mesma usada na exportação.");
    console.error(erro);
  }
}

function mesclarDadosImportados(dadosImportados) {
  const idsSenhas = new Set(cofre.senhas.map(item => item.id));
  const idsGastos = new Set(cofre.gastos.map(item => item.id));

  dadosImportados.senhas.forEach(item => {
    if (!idsSenhas.has(item.id)) {
      cofre.senhas.push(item);
    }
  });

  dadosImportados.gastos.forEach(item => {
    if (!idsGastos.has(item.id)) {
      cofre.gastos.push(item);
    }
  });

  if (!Array.isArray(cofre.categoriasGastos)) {
    cofre.categoriasGastos = [];
  }

  if (Array.isArray(dadosImportados.categoriasGastos)) {
    dadosImportados.categoriasGastos.forEach(categoria => {
      adicionarCategoriaGastoSeNaoExistir(categoria);
    });
  }

  if (!Array.isArray(cofre.pagadoresGastos)) {
    cofre.pagadoresGastos = [];
  }

  if (Array.isArray(dadosImportados.pagadoresGastos)) {
    dadosImportados.pagadoresGastos.forEach(pagador => {
      adicionarPagadorGastoSeNaoExistir(pagador);
    });
  }
}

function lerArquivoComoTexto(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);

    leitor.readAsText(arquivo);
  });
}

function baixarArquivoJson(objeto, nomeArquivo) {
  const json = JSON.stringify(objeto, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function gerarDataArquivo() {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  const hora = String(agora.getHours()).padStart(2, "0");
  const minuto = String(agora.getMinutes()).padStart(2, "0");

  return `${ano}${mes}${dia}-${hora}${minuto}`;
}

/* =========================
   FORMATADORES E DATAS
========================= */

function formatarDataCurta(dataIso) {
  if (!dataIso) return "-";

  if (/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) {
    const partes = dataIso.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0].slice(2)}`;
  }

  const data = new Date(dataIso);

  if (isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
}

function formatarDataHora(dataIso) {
  if (!dataIso) return "-";

  const data = new Date(dataIso);

  if (isNaN(data.getTime())) {
    return "-";
  }

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarTipoGasto(tipo) {
  if (tipo === "mensal") return "Mensal";
  if (tipo === "anual") return "Anual";
  return "Apenas uma vez";
}

function criarDataLocal(dataIso) {
  if (!dataIso) return obterDataLocalSemHora(new Date());

  const partes = dataIso.split("-");
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

function obterDataLocalSemHora(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function dataParaInputDate(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function definirTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

function normalizarTextoComparacao(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* =========================
   CRIPTOGRAFIA
========================= */

async function derivarChave(senha, salt) {
  const encoder = new TextEncoder();

  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(senha),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 250000,
      hash: "SHA-256"
    },
    material,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function criptografar(texto, chave) {
  const iv = gerarBytesAleatorios(12);
  const encoder = new TextEncoder();

  const criptografado = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    chave,
    encoder.encode(texto)
  );

  return {
    iv: arrayBufferParaBase64(iv),
    dados: arrayBufferParaBase64(criptografado)
  };
}

async function descriptografar(payload, chave) {
  const iv = base64ParaArrayBuffer(payload.iv);
  const dados = base64ParaArrayBuffer(payload.dados);

  const descriptografado = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    chave,
    dados
  );

  return new TextDecoder().decode(descriptografado);
}

function gerarBytesAleatorios(tamanho) {
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return bytes;
}

function arrayBufferParaBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binario = "";

  bytes.forEach(byte => {
    binario += String.fromCharCode(byte);
  });

  return btoa(binario);
}

function base64ParaArrayBuffer(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);

  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }

  return bytes;
}

/* =========================
   UTILITÁRIOS
========================= */

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("change", event => {
  if (event.target && event.target.id === "editarStatusGasto") {
    alternarBoxEditarPagador();
  }
});

function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
