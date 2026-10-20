const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cosmos = require('./cosmos');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

app.post('/api/disconnect', (_req, res) => {
  cosmos.disconnect();
  res.json({ ok: true });
});

// A chave é recebida pelo servidor local e nunca é enviada de volta ao navegador.
app.post('/api/connect', wrap(async (req, res) => {
  const { endpoint, key, database } = req.body;
  cosmos.configure(endpoint?.trim(), key, database?.trim());
  const databases = await cosmos.listDatabases();
  if (!databases.includes(database.trim())) {
    return res.status(400).json({ error: `Banco não encontrado: ${database.trim()}` });
  }
  res.json({ databases, defaults: cosmos.defaults });
}));

// Bancos disponíveis e valores padrão do .env ou da conexão atual
app.get('/api/databases', wrap(async (_req, res) => {
  res.json({ databases: await cosmos.listDatabases(), defaults: cosmos.defaults });
}));

// Containers de um banco (com o caminho da partition key)
app.get('/api/databases/:db/containers', wrap(async (req, res) => {
  res.json({ containers: await cosmos.listContainers(req.params.db) });
}));

// Consulta paginada: { db, container, query, pageSize, token }
app.post('/api/query', wrap(async (req, res) => {
  const { db, container, query, pageSize, token } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'Informe a query' });
  res.json(await cosmos.runQueryPage(db, container, query, {
    pageSize: Math.min(Number(pageSize) || 50, 200),
    continuationToken: token || undefined,
  }));
}));

// Criar/atualizar (upsert): { db, container, item }
app.post('/api/items/save', wrap(async (req, res) => {
  const { db, container, item } = req.body;
  if (!item || typeof item !== 'object') return res.status(400).json({ error: 'Item inválido' });
  if (!item.id) item.id = crypto.randomUUID();
  const { resource, requestCharge } = await cosmos.getContainer(db, container).items.upsert(item);
  res.json({ item: resource, requestCharge });
}));

// Excluir: { db, container, item }  (a partition key é extraída do próprio item)
app.post('/api/items/delete', wrap(async (req, res) => {
  const { db, container, item } = req.body;
  if (!item?.id) return res.status(400).json({ error: 'Item sem id' });
  const pkPath = await cosmos.partitionPath(db || cosmos.defaults.db, container || cosmos.defaults.container);
  const { requestCharge } = await cosmos
    .getContainer(db, container)
    .item(item.id, cosmos.pkValue(item, pkPath))
    .delete();
  res.json({ ok: true, requestCharge });
}));

app.use((err, _req, res, _next) => {
  console.error(err.message);
  const status = Number.isInteger(err.code) && err.code >= 400 && err.code < 600 ? err.code : 500;
  res.status(status).json({ error: err.message });
});

// Sem autenticação: escuta só em localhost.
const port = process.env.PORT || 3000;
app.listen(port, '127.0.0.1', () => console.log(`Gerenciador em http://localhost:${port}`));
