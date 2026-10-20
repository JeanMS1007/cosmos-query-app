# Cosmos Query App

Aplicação local para consultar e administrar dados no Azure Cosmos DB com API NoSQL.

## Especificações

- **Servidor:** Node.js com Express.
- **Interface:** HTML, CSS e JavaScript, servidos pelo próprio servidor.
- **Conexão:** endpoint, chave e banco informados na interface ou definidos em variáveis de ambiente.
- **Endereço local:** `http://localhost:3000` por padrão. O servidor escuta em `127.0.0.1`.
- **Consultas:** SQL do Cosmos DB, exibidas em páginas de até 50 itens, com custo em RU.
- **Dados:** permite criar itens, editar e salvar por upsert, além de excluir itens.
- **Containers:** carrega a lista do banco conectado. O caminho simples da partition key é suportado; partition keys hierárquicas não são suportadas.

## Iniciar

Na pasta `cosmos-query-app`, instale as dependências e inicie o servidor:

```bash
npm install
npm start
```

Abra `http://localhost:3000`, informe o endpoint, a chave e o banco e selecione **Conectar**. Também é possível definir `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE` e `COSMOS_CONTAINER` no arquivo `.env`. A porta pode ser alterada com `PORT`.

## Segurança

O servidor escuta apenas em `127.0.0.1` e a interface não possui autenticação. A chave informada na interface fica na memória do servidor durante a conexão; **Limpar conexão** remove os dados da conexão ativa. Não exponha o servidor à rede sem implementar autenticação e controles de acesso.
