// main.js

const produtos = [
  { nome: "Hambúrguer de Costela", preco: 23 },
  { nome: "Drink de Morango", preco: 10 },
  { nome: "Drink de Limão", preco: 8 }
];

const estado = {
  vendas: JSON.parse(localStorage.getItem("fecam_vendas")) || [],
  despesas: Number(localStorage.getItem("fecam_despesas")) || 0,
  relatorioPausado: false
};

let chartBar, chartPie, chartLine;

document.addEventListener("DOMContentLoaded", () => {
  setupInputs();
  renderResumo();
  renderGraficos();
  bindRelatorio();
  bindDespesas();
  bindUnloadWarning();
});

function setupInputs() {
  document.querySelectorAll(".card").forEach((card, index) => {
    const btn = card.querySelector("button");
    btn.addEventListener("click", () => {
      const inputQtd = card.querySelector("input");
      const selectForma = card.querySelector("select");
      const qtd = Number(inputQtd.value);
      const forma = selectForma.value;
      if (!qtd || !forma) return alert("Preencha quantidade e forma de pagamento.");

      const nomeProduto = produtos[index].nome;
      const precoProduto = produtos[index].preco;
      const total = precoProduto * qtd;

      const confirmacao = confirm(`Confirmar pedido?\n\n${nomeProduto} x${qtd} (${forma})\nTotal: ${formatBRL(total)}`);

      if (!confirmacao) return;

      const venda = {
        nome: nomeProduto,
        preco: precoProduto,
        quantidade: qtd,
        forma: forma,
        total: total,
        timestamp: new Date().toISOString()
      };

      estado.vendas.push(venda);
      localStorage.setItem("fecam_vendas", JSON.stringify(estado.vendas));

      if (!estado.relatorioPausado) {
        renderResumo();
        renderGraficos();
      }

      alert("✅ Pedido registrado com sucesso!");

      inputQtd.value = "";
      selectForma.selectedIndex = 0;
      inputQtd.focus();
    });
  });
}

function renderResumo() {
  const totais = {
    bruto: 0,
    PIX: 0,
    Dinheiro: 0,
    burguer: 0,
    morango: 0,
    limao: 0
  };

  for (let venda of estado.vendas) {
    totais.bruto += venda.total;
    totais[venda.forma] += venda.total;
    if (venda.nome.includes("Costela")) totais.burguer += venda.quantidade;
    if (venda.nome.includes("Morango")) totais.morango += venda.quantidade;
    if (venda.nome.includes("Limão")) totais.limao += venda.quantidade;
  }

  document.getElementById("total-bruto").textContent = formatBRL(totais.bruto);
  document.getElementById("total-pix").textContent = formatBRL(totais.PIX);
  document.getElementById("total-dinheiro").textContent = formatBRL(totais.Dinheiro);
  document.getElementById("qtd-burguer").textContent = totais.burguer;
  document.getElementById("qtd-morango").textContent = totais.morango;
  document.getElementById("qtd-limao").textContent = totais.limao;
  document.getElementById("lucro").textContent = formatBRL(totais.bruto - estado.despesas);
}

function bindDespesas() {
  const input = document.getElementById("despesas");
  input.value = estado.despesas;
  input.addEventListener("input", () => {
    estado.despesas = Number(input.value);
    localStorage.setItem("fecam_despesas", estado.despesas);
    if (!estado.relatorioPausado) {
      renderResumo();
      renderGraficos();
    }
  });
}

function bindRelatorio() {
  document.querySelector("button.btn-primary").addEventListener("click", () => {
    let rel = `Data: ${new Date().toLocaleString()}\n\n`;
    let total = 0;
    for (let venda of estado.vendas) {
      rel += `- ${venda.nome} x${venda.quantidade} (${venda.forma}): ${formatBRL(venda.total)}\n`;
      total += venda.total;
    }
    rel += `\nTotal Bruto: ${formatBRL(total)}`;
    rel += `\nPIX: ${formatBRL(estado.vendas.filter(v => v.forma === 'PIX').reduce((s,v) => s+v.total, 0))}`;
    rel += `\nDinheiro: ${formatBRL(estado.vendas.filter(v => v.forma === 'Dinheiro').reduce((s,v) => s+v.total, 0))}`;
    rel += `\nDespesas: ${formatBRL(estado.despesas)}`;
    rel += `\nLucro Líquido: ${formatBRL(total - estado.despesas)}`;
    document.getElementById("area-relatorio").textContent = rel;
  });

  const pauseBtn = document.createElement("button");
  pauseBtn.className = "btn btn-warning me-2";
  pauseBtn.textContent = "Pausar Atualizações";
  pauseBtn.addEventListener("click", () => {
    estado.relatorioPausado = !estado.relatorioPausado;
    pauseBtn.textContent = estado.relatorioPausado ? "Continuar Atualizações" : "Pausar Atualizações";
  });
  document.querySelector("#relatorio .mb-3").appendChild(pauseBtn);

  document.getElementById("limpar-dados").addEventListener("click", () => {
    if (confirm("Tem certeza que deseja limpar todos os dados do dia?")) {
      localStorage.removeItem("fecam_vendas");
      localStorage.removeItem("fecam_despesas");
      location.reload();
    }
  });
}

function bindUnloadWarning() {
  window.addEventListener("beforeunload", function (e) {
    e.preventDefault();
    e.returnValue = 'Tem certeza que deseja sair? Os dados são salvos automaticamente, mas a aba será fechada.';
  });
}

function renderGraficos() {
  const ctxBar = document.getElementById("grafico-barras");
  const ctxPie = document.getElementById("grafico-pizza");
  const ctxLine = document.getElementById("grafico-lucro");

  if (chartBar) chartBar.destroy();
  if (chartPie) chartPie.destroy();
  if (chartLine) chartLine.destroy();

  const burguer = estado.vendas.filter(v => v.nome.includes("Costela")).reduce((s,v) => s+v.quantidade, 0);
  const morango = estado.vendas.filter(v => v.nome.includes("Morango")).reduce((s,v) => s+v.quantidade, 0);
  const limao = estado.vendas.filter(v => v.nome.includes("Limão")).reduce((s,v) => s+v.quantidade, 0);

  const pix = estado.vendas.filter(v => v.forma === "PIX").reduce((s,v) => s+v.total, 0);
  const dinheiro = estado.vendas.filter(v => v.forma === "Dinheiro").reduce((s,v) => s+v.total, 0);

  const lucroPorHora = {};
  estado.vendas.forEach(v => {
    const hora = new Date(v.timestamp).getHours();
    lucroPorHora[hora] = (lucroPorHora[hora] || 0) + v.total;
  });

  chartBar = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ["Costela", "Morango", "Limão"],
      datasets: [{
        label: 'Vendas por Produto',
        data: [burguer, morango, limao],
        backgroundColor: ['#ffc107', '#dc3545', '#20c997']
      }]
    }
  });

  chartPie = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: ["PIX", "Dinheiro"],
      datasets: [{
        data: [pix, dinheiro],
        backgroundColor: ['#0dcaf0', '#ffc107']
      }]
    }
  });

  chartLine = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: Object.keys(lucroPorHora),
      datasets: [{
        label: 'Lucro por Hora',
        data: Object.values(lucroPorHora),
        borderColor: '#198754',
        fill: false
      }]
    }
  });
}

function formatBRL(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}function senhaParaSair(e) {
  e.preventDefault();
  e.returnValue = '';

  const senha = prompt("Digite a senha de administrador para sair do sistema:");
  if (senha !== "12345") {
    alert("Senha incorreta! Não é possível fechar a aba.");
    return false;
  }

  window.removeEventListener("beforeunload", senhaParaSair);
  window.close();
}

window.addEventListener("beforeunload", senhaParaSair);