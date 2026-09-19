# 💜📊 Dashboard de Clientes — Banco Digital

Dashboard analítico e interativo para visualização de transações, perfil da base e concentração regional de clientes de um banco digital — tudo em um único arquivo HTML, com CSS e JavaScript embutidos e tema noturno em paleta roxo / violeta / rosa.

Projeto 100% front-end, sem build, sem dependências, sem servidor. Abriu no navegador, funcionou.

## Visualize o projeto



## ✨ Funcionalidades
-  5 KPIs — clientes ativos, transações, volume transacionado, ticket médio e taxa de aprovação

- Filtros combinados por UF, cidade, tipo de transação e mês

- Gráfico de linha de volume diário em SVG puro (sem bibliotecas)

- Barras horizontais de volume por tipo de transação, por estado e por faixa de idade

- Tabela de ranking dos clientes de maior valor no recorte atual

- Tema noturno com gradientes roxo → violeta → rosa

- Responsivo com breakpoints em 850px e 500px

## 🚀 Como rodar
Baixe o arquivo `dashboard.html`

Dê duplo clique (ou abra com `Ctrl+O` / `Cmd+O` no navegador)

Pronto. Nada de `npm install`, nada de servidor local, nada de build.

## 🧠 Como os dados funcionam
Os 2.400 registros demo são gerados no client-side por um gerador pseudoaleatório com seed fixa:

```javascript
let seed = 74219;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
```
Isso significa que toda vez que você recarrega a página, os dados são exatamente os mesmos — o que é ótimo para demonstração e para testes visuais.

Cada registro tem o formato:

```javascript
{
  id: "CL1001",
  name: "Cliente 001",
  uf: "SP",
  city: "São Paulo",
  date: "2026-03-14",
  type: "PIX",
  approved: true,
  amount: 842.30,
  age: 32
}
```

## 🧩 Decisões técnicas
- Arquivo único — zero fricção para abrir, compartilhar ou embutir em qualquer página.

- Sem frameworks — HTML, CSS e JS puros; ideal para portfólio e para servir como referência.

- Gráfico em SVG gerado à mão — evita Chart.js, D3 e similares; bundle mínimo e controle total.

- CSS escopado por #bank-dashboard — pode colar em qualquer site sem risco de vazar estilo.

- Gerador com seed fixa — dados reproduzíveis entre reloads, sem depender de backend.

- Ponto de integração em uma linha — trocar demo por API é literalmente substituir a origem do array records.

## Contribuição

- Se você quiser contribuir para este projeto, fique à vontade para fazer um fork, criar um branch e enviar um pull request com suas melhorias.

## Autor

Este projeto foi desenvolvido por **Thiago Garcia**.