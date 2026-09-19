// Node.js 20+ | API para alimentar o dashboard com PostgreSQL
// Defina DATABASE_URL, por exemplo: postgresql://usuario:senha@localhost:5432/banco_digital
import express from 'express';
import pg from 'pg';

DATABASE_URL = "postgresql://usuario:senha@localhost:5432/banco_digital";

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = process.env.PORT || 3000;

function filters(query) {
  const clauses = [];
  const values = [];

  const add = (sql, value) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  if (query.uf) add('c.uf = ?', query.uf);
  if (query.cidade) add('c.cidade = ?', query.cidade);
  if (query.tipo) add('t.tipo = ?', query.tipo);

  if (query.mes) {
    add(
      "date_trunc('month', t.data_hora)::date = ?::date",
      `${query.mes}-01`
    );
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values
  };
}

app.get('/api/filtros', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        json_agg(DISTINCT uf ORDER BY uf) AS ufs,
        json_agg(DISTINCT cidade ORDER BY cidade) AS cidades
      FROM clientes
    `);

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const { where, values } = filters(req.query);

    const sql = `
      WITH base AS (
        SELECT
          t.*,
          c.nome,
          c.cidade,
          c.uf,
          c.data_nascimento
        FROM transacoes t
        JOIN clientes c ON c.cliente_id = t.cliente_id
        ${where}
      )
      SELECT json_build_object(
        'kpis', (
          SELECT json_build_object(
            'clientes_ativos', COUNT(DISTINCT cliente_id),
            'transacoes', COUNT(*),
            'volume_aprovado',
              COALESCE(
                ROUND(SUM(valor) FILTER (WHERE status = 'Aprovada'), 2),
                0
              ),
            'ticket_medio',
              COALESCE(
                ROUND(AVG(valor) FILTER (WHERE status = 'Aprovada'), 2),
                0
              ),
            'taxa_aprovacao',
              COALESCE(
                ROUND(
                  100.0 * COUNT(*) FILTER (WHERE status = 'Aprovada')
                  / NULLIF(COUNT(*), 0),
                  1
                ),
                0
              )
          )
          FROM base
        ),

        'volume_por_tipo', (
          SELECT COALESCE(json_agg(x ORDER BY x.volume_aprovado DESC), '[]')
          FROM (
            SELECT
              tipo,
              ROUND(SUM(valor), 2) AS volume_aprovado
            FROM base
            WHERE status = 'Aprovada'
            GROUP BY tipo
          ) x
        ),

        'volume_por_estado', (
          SELECT COALESCE(json_agg(x ORDER BY x.volume_aprovado DESC), '[]')
          FROM (
            SELECT
              uf,
              ROUND(SUM(valor), 2) AS volume_aprovado
            FROM base
            WHERE status = 'Aprovada'
            GROUP BY uf
          ) x
        ),

        'serie_diaria', (
          SELECT COALESCE(json_agg(x ORDER BY x.dia), '[]')
          FROM (
            SELECT
              data_hora::date AS dia,
              ROUND(SUM(valor), 2) AS volume_aprovado
            FROM base
            WHERE status = 'Aprovada'
            GROUP BY 1
          ) x
        ),

        'top_clientes', (
          SELECT COALESCE(json_agg(x ORDER BY x.volume_aprovado DESC), '[]')
          FROM (
            SELECT
              cliente_id,
              nome,
              cidade,
              uf,
              COUNT(*) AS transacoes,
              ROUND(SUM(valor), 2) AS volume_aprovado
            FROM base
            WHERE status = 'Aprovada'
            GROUP BY cliente_id, nome, cidade, uf
            LIMIT 10
          ) x
        )
      ) AS dashboard;
    `;

    const { rows } = await pool.query(sql, values);
    res.json(rows[0].dashboard);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: 'Não foi possível consultar o banco de dados.'
  });
});

app.listen(port, () => {
  console.log(`API disponível em http://localhost:${port}`);
});

