## Módulo 02 - Exemplo 01

Este projeto é um exemplo simples de classificação com rede neural usando TensorFlow.js no Node.js.

## Conteúdo da pasta

- `index.js`: código principal do exemplo.
  - Monta e treina um modelo `tf.sequential`.
  - Usa dados de entrada já normalizados e one-hot encoded.
  - Faz predição para uma nova pessoa e imprime probabilidades por classe.
- `package.json`: metadados do projeto, dependências e scripts npm.
- `package-lock.json`: lockfile das versões instaladas.
- `.prettierrc`: regras de formatação automática (Prettier).
- `.vscode/settings.json`: configurações locais do VS Code (formatar ao salvar com Prettier).
- `readme.md`: esta documentação.

## Tecnologias

- Node.js (ES Modules)
- `@tensorflow/tfjs-node`
- Prettier

## Como executar

1. Instale as dependências:

```bash
npm install
```

2. Rode o projeto:

```bash
npm start
```

O script `start` já está configurado para reduzir logs informativos do TensorFlow/oneDNN.

## Scripts disponíveis

- `npm start`: executa o `index.js` em modo watch.
- `npm run format`: formata todos os arquivos com Prettier.
- `npm run format:check`: verifica se a formatação está correta.

## Objetivo didático

Demonstrar, de forma prática, o fluxo básico de Machine Learning:

1. Preparar dados de entrada e rótulos.
2. Definir e compilar o modelo.
3. Treinar com `model.fit`.
4. Fazer predição em novos dados.
