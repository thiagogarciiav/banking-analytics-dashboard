-- ==========================================================================
-- Banco Digital — Schema + Dados demonstrativos
-- MySQL 8 / MariaDB
-- ==========================================================================

DROP DATABASE IF EXISTS banco_digital;
CREATE DATABASE banco_digital
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE banco_digital;

-- --------------------------------------------------------------------------
-- Tabelas de domínio
-- --------------------------------------------------------------------------

CREATE TABLE estados (
  uf        CHAR(2)      NOT NULL,
  nome      VARCHAR(60)  NOT NULL,
  PRIMARY KEY (uf)
) ENGINE=InnoDB;

CREATE TABLE cidades (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(80)  NOT NULL,
  uf        CHAR(2)      NOT NULL,
  CONSTRAINT fk_cidade_uf FOREIGN KEY (uf) REFERENCES estados(uf),
  UNIQUE KEY uq_cidade (nome, uf)
) ENGINE=InnoDB;

CREATE TABLE tipos_transacao (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(30)  NOT NULL UNIQUE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
-- Entidades
-- --------------------------------------------------------------------------

CREATE TABLE clientes (
  id         VARCHAR(8)  NOT NULL,       -- ex: CL1001
  nome       VARCHAR(80) NOT NULL,
  idade      TINYINT UNSIGNED NOT NULL,
  cidade_id  INT NOT NULL,
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cliente_cidade FOREIGN KEY (cidade_id) REFERENCES cidades(id),
  INDEX idx_clientes_cidade (cidade_id)
) ENGINE=InnoDB;

CREATE TABLE transacoes (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  cliente_id      VARCHAR(8)  NOT NULL,
  tipo_id         INT         NOT NULL,
  data_transacao  DATE        NOT NULL,
  valor           DECIMAL(12,2) NOT NULL,
  aprovada        TINYINT(1)  NOT NULL DEFAULT 1,
  CONSTRAINT fk_tx_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_tx_tipo    FOREIGN KEY (tipo_id)    REFERENCES tipos_transacao(id),
  INDEX idx_tx_data      (data_transacao),
  INDEX idx_tx_cliente   (cliente_id),
  INDEX idx_tx_tipo      (tipo_id),
  INDEX idx_tx_aprovada  (aprovada)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
-- Seeds de domínio
-- --------------------------------------------------------------------------

INSERT INTO estados (uf, nome) VALUES
  ('BA','Bahia'),
  ('CE','Ceará'),
  ('GO','Goiás'),
  ('MG','Minas Gerais'),
  ('PE','Pernambuco'),
  ('PR','Paraná'),
  ('RJ','Rio de Janeiro'),
  ('RS','Rio Grande do Sul'),
  ('SP','São Paulo');

INSERT INTO cidades (nome, uf) VALUES
  ('São Paulo','SP'),
  ('Campinas','SP'),
  ('Rio de Janeiro','RJ'),
  ('Belo Horizonte','MG'),
  ('Curitiba','PR'),
  ('Porto Alegre','RS'),
  ('Salvador','BA'),
  ('Recife','PE'),
  ('Fortaleza','CE'),
  ('Goiânia','GO');

INSERT INTO tipos_transacao (nome) VALUES
  ('PIX'), ('Cartão'), ('Transferência'), ('Boleto');

-- --------------------------------------------------------------------------
-- Gerador de massa (600 clientes + 2400 transações)
-- Ajuste a quantidade alterando os WHILE abaixo.
-- --------------------------------------------------------------------------

DELIMITER $$

DROP PROCEDURE IF EXISTS gerar_dados_demo $$
CREATE PROCEDURE gerar_dados_demo()
BEGIN
  DECLARE i            INT DEFAULT 0;
  DECLARE v_cliente_id VARCHAR(8);
  DECLARE v_cidade_id  INT;
  DECLARE v_tipo_id    INT;
  DECLARE v_data       DATE;
  DECLARE v_valor      DECIMAL(12,2);
  DECLARE v_aprovada   TINYINT(1);
  DECLARE v_idade      TINYINT;
  DECLARE v_tipo_nome  VARCHAR(30);

  /* ---- 600 clientes ---- */
  SET i = 0;
  WHILE i < 600 DO
    SET v_cliente_id = CONCAT('CL', LPAD(1001 + i, 4, '0'));
    SET v_cidade_id  = 1 + FLOOR(RAND() * 10);
    SET v_idade      = 18 + FLOOR(RAND() * 55);

    INSERT INTO clientes (id, nome, idade, cidade_id)
    VALUES (v_cliente_id, CONCAT('Cliente ', LPAD(i + 1, 3, '0')), v_idade, v_cidade_id);

    SET i = i + 1;
  END WHILE;

  /* ---- 2400 transações ---- */
  SET i = 0;
  WHILE i < 2400 DO
    SET v_cliente_id = CONCAT('CL', LPAD(1001 + FLOOR(RAND() * 600), 4, '0'));
    SET v_tipo_id    = 1 + FLOOR(RAND() * 4);
    SET v_data       = DATE_ADD('2026-01-01', INTERVAL FLOOR(RAND() * 256) DAY);
    SET v_aprovada   = IF(RAND() > 0.075, 1, 0);

    SELECT nome INTO v_tipo_nome FROM tipos_transacao WHERE id = v_tipo_id;

    SET v_valor = ROUND(
      CASE v_tipo_nome
        WHEN 'PIX'            THEN 35  + RAND() * 920
        WHEN 'Cartão'         THEN 20  + RAND() * 1400
        WHEN 'Transferência'  THEN 150 + RAND() * 4800
        ELSE                       50  + RAND() * 2100
      END, 2);

    INSERT INTO transacoes (cliente_id, tipo_id, data_transacao, valor, aprovada)
    VALUES (v_cliente_id, v_tipo_id, v_data, v_valor, v_aprovada);

    SET i = i + 1;
  END WHILE;
END $$

DELIMITER ;

CALL gerar_dados_demo();
DROP PROCEDURE gerar_dados_demo;

-- --------------------------------------------------------------------------
-- Views analíticas (opcionais, úteis para o dashboard)
-- --------------------------------------------------------------------------

-- Volume aprovado por tipo de transação
CREATE OR REPLACE VIEW vw_volume_por_tipo AS
SELECT  t.nome                         AS tipo,
        COUNT(*)                       AS qtd_transacoes,
        SUM(tr.valor)                  AS volume_total
FROM    transacoes tr
JOIN    tipos_transacao t ON t.id = tr.tipo_id
WHERE   tr.aprovada = 1
GROUP BY t.nome
ORDER BY volume_total DESC;

-- Volume aprovado por UF
CREATE OR REPLACE VIEW vw_volume_por_estado AS
SELECT  e.uf,
        e.nome                         AS estado,
        COUNT(*)                       AS qtd_transacoes,
        SUM(tr.valor)                  AS volume_total
FROM    transacoes tr
JOIN    clientes  c ON c.id = tr.cliente_id
JOIN    cidades   ci ON ci.id = c.cidade_id
JOIN    estados   e ON e.uf = ci.uf
WHERE   tr.aprovada = 1
GROUP BY e.uf, e.nome
ORDER BY volume_total DESC;

-- Ticket médio geral
CREATE OR REPLACE VIEW vw_ticket_medio AS
SELECT  COUNT(*)              AS transacoes_aprovadas,
        SUM(valor)            AS volume_total,
        ROUND(AVG(valor), 2)  AS ticket_medio
FROM    transacoes
WHERE   aprovada = 1;

-- Perfil por faixa de idade
CREATE OR REPLACE VIEW vw_perfil_idade AS
SELECT  CASE
          WHEN c.idade < 25 THEN '18–24'
          WHEN c.idade < 35 THEN '25–34'
          WHEN c.idade < 45 THEN '35–44'
          WHEN c.idade < 55 THEN '45–54'
          ELSE '55+'
        END                        AS faixa,
        COUNT(DISTINCT c.id)       AS clientes,
        COUNT(*)                   AS transacoes,
        SUM(tr.valor)              AS volume_total
FROM    transacoes tr
JOIN    clientes   c ON c.id = tr.cliente_id
WHERE   tr.aprovada = 1
GROUP BY faixa
ORDER BY faixa;

-- Top clientes por volume
CREATE OR REPLACE VIEW vw_top_clientes AS
SELECT  c.id                              AS cliente_id,
        c.nome                            AS cliente,
        ci.nome                           AS cidade,
        ci.uf                             AS uf,
        COUNT(*)                          AS transacoes,
        SUM(tr.valor)                     AS volume_aprovado
FROM    transacoes tr
JOIN    clientes   c  ON c.id  = tr.cliente_id
JOIN    cidades    ci ON ci.id = c.cidade_id
WHERE   tr.aprovada = 1
GROUP BY c.id, c.nome, ci.nome, ci.uf
ORDER BY volume_aprovado DESC;

-- Volume diário (jan/2026 em diante)
CREATE OR REPLACE VIEW vw_volume_diario AS
SELECT  data_transacao,
        COUNT(*)          AS transacoes,
        SUM(valor)        AS volume_total
FROM    transacoes
WHERE   aprovada = 1
GROUP BY data_transacao
ORDER BY data_transacao;