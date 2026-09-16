-- PostgreSQL 15+ | Base demonstrativa para análise de clientes de banco digital
-- Cria 600 clientes e 2.500 transações entre 1º de janeiro e 13 de setembro de 2026.

DROP TABLE IF EXISTS transacoes;
DROP TABLE IF EXISTS clientes;

CREATE TABLE clientes (
    cliente_id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    cidade VARCHAR(80) NOT NULL,
    uf CHAR(2) NOT NULL,
    data_nascimento DATE NOT NULL,
    data_cadastro DATE NOT NULL,
    segmento VARCHAR(20) NOT NULL CHECK (segmento IN ('Essencial', 'Plus', 'Prime'))
);

CREATE TABLE transacoes (
    transacao_id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes(cliente_id),
    data_hora TIMESTAMPTZ NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('PIX', 'Cartão', 'Transferência', 'Boleto')),
    valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
    status_transacao VARCHAR(12) NOT NULL CHECK (status_transacao IN ('Aprovada', 'Recusada')),
    descricao VARCHAR(120)   
);

CREATE INDEX idx_transacoes_cliente_data ON transacoes (cliente_id, data_hora DESC);
CREATE INDEX idx_transacoes_data_status ON transacoes (data_hora, status_transacao);
CREATE INDEX idx_clientes_uf_cidade ON clientes (uf, cidade);

INSERT INTO clientes (nome, email, cidade, uf, data_nascimento, data_cadastro, segmento)
SELECT
'Cliente ' || lpad(gs::text, 3, '0'),
'cliente' || lpad(gs::text, 3, '0') || "@exemplo.com",
localidade.cidade,
localidade.uf,
DATE '1965-01-01' + (random() * 13000)::int,
DATE '2023-01-01' + (random() * 1200)::int,
CASE
    WHEN random() < 0.64 THEN 'Essencial'
    WHEN random() < 0.86 THEN 'Plus'
    ELSE 'Prime'
END
FROM generate_series(1, 600) AS gs
CROSS JOIN LATERAL (
    SELECT * FROM (VALUES
        ('SP', 'São Paulo'), ('SP', 'Campinas'), ('RJ', 'Rio de Janeiro'),
        ('MG', 'Belo Horizonte'), ('PR', 'Curitiba'), ('RS', 'Porto Alegre'),
        ('BA', 'Salvador'), ('PE', 'Recife'), ('CE', 'Fortaleza'), ('GO', 'Goiânia')
    ) AS localidades(uf, cidade)
    ORDER BY random()
    LIMIT 1
) AS localidade;

INSERT INTO transacoes (cliente_id, data_hora, tipo, valor, status_transacao, descricao)
SELECT
  1 + floor(random() * 600)::bigint,
  TIMESTAMPTZ '2026-01-01 00:00:00-03' + (random() * INTERVAL '256 days'),
  tipo_transacao.tipo,
  round((
    CASE tipo_transacao.tipo
      WHEN 'PIX' THEN 35 + random() * 920
      WHEN 'Cartão' THEN 20 + random() * 1400
      WHEN 'Transferência' THEN 150 + random() * 4800
      ELSE 50 + random() * 2100
    END
  )::numeric, 2),
  CASE WHEN random() < 0.925 THEN 'Aprovada' ELSE 'Recusada' END,
  CASE tipo_transacao.tipo
    WHEN 'PIX' THEN 'Pagamento via PIX'
    WHEN 'Cartão' THEN 'Compra no cartão'
    WHEN 'Transferência' THEN 'Transferência bancária'
    ELSE 'Pagamento de boleto'
  END
FROM generate_series(1, 2500)
CROSS JOIN LATERAL (
  SELECT (ARRAY['PIX', 'Cartão', 'Transferência', 'Boleto'])
    [1 + floor(random() * 4)::int] AS tipo
) AS tipo_transacao;

-- Indicadores por mês
SELECT
  date_trunc('month', t.data_hora)::date AS mes,
  COUNT(DISTINCT t.cliente_id) AS clientes_ativos,
  COUNT(*) AS transacoes,
  COUNT(*) FILTER (WHERE t.status_transacao = 'Aprovada') AS transacoes_aprovadas,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.status_transacao = 'Aprovada') / COUNT(*), 1)
    AS taxa_aprovacao_pct,
  ROUND(SUM(t.valor) FILTER (WHERE t.status_transacao = 'Aprovada'), 2) AS volume_aprovado,
  ROUND(AVG(t.valor) FILTER (WHERE t.status_transacao = 'Aprovada'), 2) AS ticket_medio
FROM transacoes t
GROUP BY 1
ORDER BY 1;

-- Concentração regional
SELECT
  c.uf,
  c.cidade,
  COUNT(*) FILTER (WHERE t.status_transacao = 'Aprovada') AS transacoes_aprovadas,
  ROUND(SUM(t.valor) FILTER (WHERE t.status_transacao = 'Aprovada'), 2) AS volume_aprovado
FROM transacoes t
JOIN clientes c ON c.cliente_id = t.cliente_id
GROUP BY c.uf, c.cidade
ORDER BY volume_aprovado DESC;

-- Ranking de clientes
SELECT
  c.cliente_id,
  c.nome,
  c.cidade,
  c.uf,
  COUNT(t.transacao_id) FILTER (WHERE t.status_transacao = 'Aprovada') AS transacoes_aprovadas,
  ROUND(SUM(t.valor) FILTER (WHERE t.status_transacao = 'Aprovada'), 2) AS volume_aprovado
FROM clientes c
JOIN transacoes t ON t.cliente_id = c.cliente_id
GROUP BY c.cliente_id, c.nome, c.cidade, c.uf
ORDER BY volume_aprovado DESC NULLS LAST
LIMIT 10;