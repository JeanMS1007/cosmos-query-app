require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

let client = null;
let defaults = {
  db: process.env.COSMOS_DATABASE || null,
  container: process.env.COSMOS_CONTAINER || null,
};

if (process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY) {
  client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY,
  });
}

function configure(endpoint, key, database) {
  if (!endpoint || !key || !database) {
    throw new Error('Informe endpoint, chave e banco de dados.');
  }
  client = new CosmosClient({ endpoint, key });
  defaults = { ...defaults, db: database };
}

function disconnect() {
  client = null;
  defaults = { ...defaults, db: null, container: null };
}

function requireClient() {
  if (!client) throw new Error('Conecte-se ao Cosmos DB informando endpoint e chave.');
  return client;
}

const getContainer = (db, container) => {
  if (!db || !container) throw new Error('Selecione um banco e um container.');
  return requireClient().database(db).container(container);
};

async function listDatabases() {
  const { resources } = await requireClient().databases.readAll().fetchAll();
  return resources.map((d) => d.id);
}

async function listContainers(db) {
  const { resources } = await requireClient().database(db).containers.readAll().fetchAll();
  return resources.map((c) => ({ id: c.id, partitionKey: c.partitionKey?.paths?.[0] || null }));
}

// Cache do caminho da partition key (ex.: "/category") por db/container.
const pkCache = new Map();
async function partitionPath(db, name) {
  const key = `${db}/${name}`;
  if (!pkCache.has(key)) {
    const { resource } = await getContainer(db, name).read();
    pkCache.set(key, resource.partitionKey.paths[0]);
  }
  return pkCache.get(key);
}

const pkValue = (item, path) =>
  path.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), item);

async function runQueryPage(db, name, query, { pageSize = 50, continuationToken } = {}) {
  const it = getContainer(db, name).items.query(query, {
    maxItemCount: pageSize,
    continuationToken,
  });
  const { resources, continuationToken: next, requestCharge } = await it.fetchNext();
  return { items: resources, continuationToken: next ?? null, requestCharge };
}

module.exports = {
  configure,
  disconnect,
  get defaults() { return defaults; },
  getContainer,
  listDatabases,
  listContainers,
  partitionPath,
  pkValue,
  runQueryPage,
};
