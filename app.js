/* ==========================================================================
   Dashboard de Clientes — Banco Digital
   ========================================================================== */

(() => {
  "use strict";

  /* ----------------------------------------------------------------------
     1) Configuração / fontes de dados
     ---------------------------------------------------------------------- */

  const CITIES = [
    ["SP", "São Paulo"],
    ["SP", "Campinas"],
    ["RJ", "Rio de Janeiro"],
    ["MG", "Belo Horizonte"],
    ["PR", "Curitiba"],
    ["RS", "Porto Alegre"],
    ["BA", "Salvador"],
    ["PE", "Recife"],
    ["CE", "Fortaleza"],
    ["GO", "Goiânia"]
  ];

  const TYPES = ["PIX", "Cartão", "Transferência", "Boleto"];

  const TOTAL_TRANSACTIONS = 2400;

  /* ----------------------------------------------------------------------
     2) Gerador de dados demo (substitua por fetch('/api/...') se tiver backend)
     ---------------------------------------------------------------------- */

  function criarGerador(seedInicial) {
    let seed = seedInicial;
    return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  }

  function gerarRegistrosDemo() {
    const rnd = criarGerador(74219);
    const records = [];

    for (let i = 0; i < TOTAL_TRANSACTIONS; i++) {
      const city = CITIES[Math.floor(rnd() * CITIES.length)];

      const date = new Date(
        Date.UTC(2026, 0, 1) + Math.floor(rnd() * 256) * 86400000
      );

      const type = TYPES[Math.floor(rnd() * TYPES.length)];
      const approved = rnd() > 0.075;

      const base =
        type === "PIX"
          ? 35 + rnd() * 920
          : type === "Cartão"
            ? 20 + rnd() * 1400
            : type === "Transferência"
              ? 150 + rnd() * 4800
              : 50 + rnd() * 2100;

      const amount = Math.round(base * 100) / 100;

      records.push({
        id: `CL${String(1001 + Math.floor(rnd() * 600)).padStart(4, "0")}`,
        name: `Cliente ${String(1 + Math.floor(rnd() * 600)).padStart(3, "0")}`,
        uf: city[0],
        city: city[1],
        date: date.toISOString().slice(0, 10),
        type,
        approved,
        amount,
        age: 18 + Math.floor(rnd() * 55)
      });
    }

    return records;
  }

  const records = gerarRegistrosDemo();

  /* ----------------------------------------------------------------------
     3) Helpers de formatação
     ---------------------------------------------------------------------- */

  const getElement = (id) => document.getElementById(id);

  const money = (value) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    });

  const formatNumber = (value) => value.toLocaleString("pt-BR");

  /* ----------------------------------------------------------------------
     4) Helpers de dados
     ---------------------------------------------------------------------- */

  function addOptions(id, values) {
    const element = getElement(id);
    [...new Set(values)].sort().forEach((value) => {
      element.insertAdjacentHTML(
        "beforeend",
        `<option value="${value}">${value}</option>`
      );
    });
  }

  function updateCities() {
    const selectedUf = getElement("uf").value;
    const currentCity = getElement("city").value;
    const cityElement = getElement("city");

    cityElement.innerHTML = '<option value="Todos">Todas as cidades</option>';

    addOptions(
      "city",
      records
        .filter((r) => selectedUf === "Todos" || r.uf === selectedUf)
        .map((r) => r.city)
    );

    cityElement.value = [...cityElement.options].some(
      (o) => o.value === currentCity
    )
      ? currentCity
      : "Todos";
  }

  function grouped(data, field, calc) {
    const result = {};
    data.forEach((r) => {
      result[r[field]] = (result[r[field]] || 0) + calc(r);
    });

    return Object.entries(result)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  /* ----------------------------------------------------------------------
     5) Renderização — barras
     ---------------------------------------------------------------------- */

  function renderBars(id, items, formatter = money) {
    const maxValue = Math.max(...items.map((i) => i.value), 1);
    const el = getElement(id);

    el.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <div class="barrow">
                <span>${item.key}</span>
                <div class="track">
                  <div class="fill" style="width:${(item.value / maxValue) * 100}%"></div>
                </div>
                <b>${formatter(item.value)}</b>
              </div>`
          )
          .join("")
      : '<div class="empty">Sem dados no recorte.</div>';
  }

  /* ----------------------------------------------------------------------
     6) Renderização — gráfico de linha (SVG)
     ---------------------------------------------------------------------- */

  function drawLine(values) {
    const svg = getElement("line");
    const width = svg.clientWidth || 600;
    const height = 260;
    const padding = 34;
    const maxValue = Math.max(...values.map((v) => v.value), 1);

    const coords = values.map((item, index) => {
      const x = padding + (index * (width - padding * 2)) / 30;
      const y =
        height - padding - (item.value / maxValue) * (height - padding * 2);
      return { x, y };
    });

    const points = coords.map(({ x, y }) => `${x},${y}`).join(" ");
    const area = [
      `${padding},${height - padding}`,
      points,
      `${width - padding},${height - padding}`
    ].join(" ");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    svg.innerHTML = `
      <defs>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="55%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a855f7" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0" />
        </linearGradient>
      </defs>

      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#3a2e5c" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#3a2e5c" />

      <polygon points="${area}" fill="url(#lineFill)" />

      <text x="${padding}" y="18" fill="#a99fc4" font-size="11">${money(maxValue)}</text>
      <text x="${padding}" y="${height - 10}" fill="#a99fc4" font-size="11">1</text>
      <text x="${width - padding - 10}" y="${height - 10}" fill="#a99fc4" font-size="11">31</text>

      <polyline points="${points}" fill="none" stroke="url(#lineStroke)" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round" />
    `;
  }

  /* ----------------------------------------------------------------------
     7) Render principal
     ---------------------------------------------------------------------- */

  function render() {
    const selectedUf = getElement("uf").value;
    const selectedCity = getElement("city").value;
    const selectedType = getElement("type").value;
    const selectedPeriod = getElement("period").value;

    const data = records.filter(
      (r) =>
        (selectedUf === "Todos" || r.uf === selectedUf) &&
        (selectedCity === "Todos" || r.city === selectedCity) &&
        (selectedType === "Todos" || r.type === selectedType) &&
        r.date.startsWith(selectedPeriod)
    );

    const approved = data.filter((r) => r.approved);

    const totalVolume = approved.reduce((acc, r) => acc + r.amount, 0);
    const activeClients = new Set(data.map((r) => r.id)).size;
    const approvalRate = data.length ? approved.length / data.length : 0;

    /* KPIs */
    getElement("clients").textContent = formatNumber(activeClients);
    getElement("clientsSub").textContent = "clientes no período";

    getElement("txs").textContent = formatNumber(data.length);
    getElement("txsSub").textContent = `${formatNumber(approved.length)} aprovadas`;

    getElement("volume").textContent = money(totalVolume);
    getElement("volumeSub").textContent = "somente aprovadas";

    getElement("ticket").textContent = money(
      approved.length ? totalVolume / approved.length : 0
    );
    getElement("ticketSub").textContent = "por transação aprovada";

    getElement("approval").textContent = `${(approvalRate * 100).toFixed(1)}%`;
    getElement("approvalSub").textContent =
      `${formatNumber(data.length - approved.length)} recusadas`;

    /* Barras */
    renderBars(
      "typeBars",
      grouped(approved, "type", (r) => r.amount)
    );

    renderBars(
      "stateBars",
      grouped(approved, "uf", (r) => r.amount).slice(0, 6)
    );

    const ageGroups = [
      ["18–24", 0],
      ["25–34", 0],
      ["35–44", 0],
      ["45–54", 0],
      ["55+", 0]
    ];

    approved.forEach((r) => {
      const i =
        r.age < 25 ? 0 : r.age < 35 ? 1 : r.age < 45 ? 2 : r.age < 55 ? 3 : 4;
      ageGroups[i][1]++;
    });

    renderBars(
      "profileBars",
      ageGroups.map(([key, value]) => ({ key, value })),
      formatNumber
    );

    /* Linha */
    const dailySeries = Array.from({ length: 31 }, (_, index) => ({
      day: index + 1,
      value: approved
        .filter((r) => Number(r.date.slice(-2)) === index + 1)
        .reduce((acc, r) => acc + r.amount, 0)
    }));

    drawLine(dailySeries);

    /* Ranking */
    const clientRanking = {};

    approved.forEach((r) => {
      const client = clientRanking[r.id] || {
        ...r,
        transactions: 0,
        volume: 0
      };
      client.transactions++;
      client.volume += r.amount;
      clientRanking[r.id] = client;
    });

    getElement("ranking").innerHTML =
      Object.values(clientRanking)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8)
        .map(
          (c) => `
            <tr>
              <td>${c.name}</td>
              <td>${c.city} / ${c.uf}</td>
              <td>${formatNumber(c.transactions)}</td>
              <td>${money(c.volume)}</td>
            </tr>`
        )
        .join("") ||
      '<tr><td colspan="4" class="empty">Sem dados no recorte.</td></tr>';
  }

  /* ----------------------------------------------------------------------
     8) Inicialização
     ---------------------------------------------------------------------- */

  function init() {
    addOptions("uf", records.map((r) => r.uf));
    addOptions("type", TYPES);

    getElement("uf").onchange = () => {
      updateCities();
      render();
    };

    ["city", "type", "period"].forEach((id) => {
      getElement(id).onchange = render;
    });

    getElement("clear").onclick = () => {
      getElement("uf").value = "Todos";
      updateCities();
      getElement("type").value = "Todos";
      getElement("period").value = "";
      render();
    };

    updateCities();
    render();

    addEventListener("resize", render);
  }

  init();
})();