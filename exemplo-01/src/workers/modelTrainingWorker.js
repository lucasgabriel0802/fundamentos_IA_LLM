import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

/**
 * Web Worker responsável por treinamento e inferência de recomendações.
 *
 * Por que usar worker?
 * - Treinar modelo pode ser custoso para a CPU.
 * - Rodar em thread separada evita travar a interface (main thread).
 *
 * Fluxo resumido:
 * 1) Main thread envia `train:model` com usuários.
 * 2) Worker prepara contexto e cria dataset supervisionado.
 * 3) Treina rede neural com TensorFlow.js.
 * 4) Main thread envia `recommend` e worker retorna ranking de produtos.
 */
console.log('Model training worker initialized');

// Contexto global usado após o treinamento para inferência.
let _globalCtx = {};

// Modelo treinado armazenado em memória do worker.
let _model = null;

// Pesos relativos de cada tipo de característica no vetor final.
// Eles modulam "importância" de cada dimensão durante a vetorização.
const WEIGHTS = {
  age: 0.1,
  price: 0.2,
  color: 0.3,
  category: 0.4,
};

// Normalização min-max: converte valor para faixa aproximada [0, 1].
// Evita que uma feature (ex.: preço alto) domine as demais.
const normalize = (value, min, max) => (value - min) / (max - min) || 1;

/**
 * Cria contexto de codificação a partir de usuários + catálogo.
 *
 * O contexto contém:
 * - índices de categorias/cores para one-hot,
 * - limites min/max para normalização,
 * - dimensões do vetor,
 * - idade média de compradores por produto.
 */
function makeContext(users, catalog) {
  // Estatísticas de idade para normalização.
  const ages = users.map((u) => u.age);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);

  const products = catalog;

  const prices = catalog.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Vocabulário categórico para one-hot encoding.
  const colors = [...new Set(catalog.map((p) => p.color))];
  const categories = [...new Set(catalog.map((p) => p.category))];

  // Tabelas de índice (string -> posição no vetor one-hot).
  const colorIndex = Object.fromEntries(
    colors.map((color, index) => [color, index]),
  );
  const categoryIndex = Object.fromEntries(
    categories.map((category, index) => [category, index]),
  );

  const middleAge = (minAge + maxAge) / 2;
  const ageSums = {};
  const ageCounts = {};

  // Calcula idade média de quem comprou cada produto.
  // Isso ajuda a representar tendência etária de cada item.
  users.forEach((user) => {
    user.purchases.forEach((purchase) => {
      ageSums[purchase.name] = (ageSums[purchase.name] || 0) + user.age;
      ageCounts[purchase.name] = (ageCounts[purchase.name] || 0) + 1;
    });
  });

  const productAverageAges = Object.fromEntries(
    products.map((product) => {
      const avgAge = ageCounts[product.name]
        ? ageSums[product.name] / ageCounts[product.name]
        : // Fallback para produtos sem histórico: idade média global.
          middleAge;
      return [product.name, normalize(avgAge, minAge, maxAge)];
    }),
  );

  const ctx = {
    users,
    products,
    colorIndex,
    categoryIndex,
    minAge,
    maxAge,
    minPrice,
    maxPrice,
    numCategories: categories.length,
    numColors: colors.length,
    dimencions: 2 + categories.length + colors.length,
    productAverageAges,
  };

  return ctx;
}

/**
 * Cria vetor one-hot ponderado.
 * Ex.: categoria "electronics" -> [0,0,1,0] * peso.
 */
const oneHotWeighted = (index, length, weight) => {
  // Proteção para entradas inválidas.
  if (!Number.isInteger(index) || length <= 0) {
    return tf.zeros([Math.max(length, 0)], 'float32');
  }

  return tf.oneHot(index, length).cast('float32').mul(weight);
};

/**
 * Codifica produto em vetor numérico (tensor 1D):
 * [preço_normalizado, idade_media_compradores, categoria_one_hot, cor_one_hot]
 */
function encodeProduct(product, ctx) {
  const price = tf.tensor1d([
    normalize(product.price, ctx.minPrice, ctx.maxPrice) * WEIGHTS.price,
  ]);
  const age = tf.tensor1d([
    (ctx.productAverageAges[product.name] ?? 0.5) * WEIGHTS.age,
  ]);

  const category = oneHotWeighted(
    ctx.categoryIndex[product.category],
    ctx.numCategories,
    WEIGHTS.category,
  );

  const color = oneHotWeighted(
    ctx.colorIndex[product.color],
    ctx.numColors,
    WEIGHTS.color,
  );

  return tf.concat([price, age, category, color]);
}

/**
 * Codifica usuário em vetor.
 *
 * Estratégia:
 * - Se já comprou algo: média dos vetores dos produtos comprados.
 * - Se não comprou: vetor base com idade + zeros (cold start).
 */
function encodeUser(user, ctx) {
  if (user.purchases.length) {
    return tf
      .stack(user.purchases.map((product) => encodeProduct(product, ctx)))
      .mean(0)
      .reshape([1, ctx.dimencions]);
  }

  return tf
    .concat1d([
      // Placeholder para preço médio (sem compras => 0).
      tf.zeros([1]),
      tf.tensor1d([normalize(user.age, ctx.minAge, ctx.maxAge) * WEIGHTS.age]),
      // Sem histórico categórico/cores no cold start.
      tf.zeros([ctx.numCategories]),
      tf.zeros([ctx.numColors]),
    ])
    .reshape([1, ctx.dimencions]);
}

/**
 * Monta dataset supervisionado para classificação binária:
 * Entrada  = [vetor_usuario, vetor_produto]
 * Rótulo   = 1 (comprou) ou 0 (não comprou)
 */
function createTrainingData(ctx) {
  const inputs = [];
  const labels = [];

  // Para cada usuário com compras, criamos exemplos contra todo o catálogo.
  ctx.users
    .filter((user) => user.purchases.length > 0)
    .forEach((user) => {
      const userVector = Array.from(encodeUser(user, ctx).dataSync());
      ctx.products.forEach((product) => {
        const productVector = Array.from(
          encodeProduct(product, ctx).dataSync(),
        );
        // Classe positiva se o produto está no histórico do usuário.
        const label = user.purchases.some((p) => p.name === product.name)
          ? 1
          : 0;

        inputs.push([...userVector, ...productVector]);
        labels.push(label);
      });
    });

  return {
    xs: tf.tensor2d(inputs),
    ys: tf.tensor2d(labels, [labels.length, 1]),
    inputDimension: ctx.dimencions * 2,
  };
}

/**
 * Cria e treina a rede neural.
 *
 * Arquitetura:
 * - Camadas densas ReLU para aprender combinações não-lineares.
 * - Saída sigmoid para probabilidade de compra (0 a 1).
 */
async function configureNeuralNetAndTrain(trainingData) {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [trainingData.inputDimension],
      units: 128,
      activation: 'relu',
    }),
  );

  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));

  // Uma saída binária (probabilidade de compra).
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(trainingData.xs, trainingData.ys, {
    epochs: 100,
    batchSize: 32,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        // Envia métricas para a UI em tempo real.
        postMessage({
          type: workerEvents.trainingLog,
          epoch: epoch + 1,
          loss: logs.loss,
          accuracy: logs.acc,
        });
      },
    },
  });
  return model;
}

/**
 * Pipeline completo de treino disparado pela main thread.
 */
async function trainModel({ users }) {
  // Progresso inicial simbólico para feedback imediato na UI.
  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 50 },
  });

  // Carrega catálogo e monta contexto de encoding.
  const catalog = await (await fetch('/data/products.json')).json();
  const context = makeContext(users, catalog);

  // Pré-calcula vetores de produtos para acelerar inferência futura.
  context.productVectors = catalog.map((product) => {
    return {
      name: product.name,
      meta: { ...product },
      vector: encodeProduct(product, context).dataSync(),
    };
  });

  _globalCtx = context;

  // Constrói dataset e executa treinamento.
  const trainingData = createTrainingData(context);

  _model = await configureNeuralNetAndTrain(trainingData);

  // Sinaliza conclusão para habilitar recomendações na interface.
  postMessage({
    type: workerEvents.progressUpdate,
    progress: { progress: 100 },
  });
  postMessage({ type: workerEvents.trainingComplete });
}

/**
 * Gera ranking de recomendação para um usuário.
 */
function recommend(user, ctx) {
  console.log('will recommend for user:', user);

  // Sem modelo treinado, não há inferência possível.
  if (!_model) return;

  const runtimeCtx = ctx ?? _globalCtx;
  const userVector = Array.from(encodeUser(user, runtimeCtx).dataSync());

  // `tf.tidy` libera tensores temporários automaticamente (evita vazamento de memória).
  const recommendations = tf.tidy(() => {
    // Para cada produto, concatena vetor do usuário + vetor do produto.
    const inputs = runtimeCtx.productVectors.map((vector) => [
      ...userVector,
      ...vector.vector,
    ]);
    const inputTensor = tf.tensor2d(inputs);
    const prediction = _model.predict(inputTensor);
    const scoreTensor = Array.isArray(prediction) ? prediction[0] : prediction;
    const scores = Array.from(scoreTensor.dataSync());

    // Monta ranking ordenado do maior score para o menor.
    return runtimeCtx.productVectors
      .map((product, index) => ({
        ...product.meta,
        name: product.name,
        score: scores[index] ?? 0,
      }))
      .sort((a, b) => b.score - a.score);
  });

  postMessage({
    type: workerEvents.recommend,
    user,
    recommendations,
  });
}

// Tabela de roteamento de ações recebidas via `postMessage`.
const handlers = {
  [workerEvents.trainModel]: trainModel,
  [workerEvents.recommend]: (d) => recommend(d.user, _globalCtx),
};

// Entrada principal de mensagens da main thread.
self.onmessage = (e) => {
  const { action, ...data } = e.data;
  if (handlers[action]) handlers[action](data);
};
