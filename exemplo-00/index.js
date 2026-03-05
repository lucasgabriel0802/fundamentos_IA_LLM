import tf, {
  callbacks,
  model,
} from '@tensorflow/tfjs-node';

async function trainModel(inputXs, outputYs) {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      units: 80,
      activation: 'relu',
      inputShape: [7],
    }),
  );

  model.add(
    tf.layers.dense({ units: 3, activation: 'softmax' }),
  );

  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(inputXs, outputYs, {
    verbose: 0,
    epochs: 100,
    batchSize: 3,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`,
        );
      },
    },
  });

  return model;
}
async function predict(model, novaPessoaNormalizada) {
  const inputTensor = tf.tensor2d(novaPessoaNormalizada);
  const prediction = model.predict(inputTensor);
  const predictionArray = await prediction.array();
  console.log(
    'Probabilidades de cada categoria:',
    predictionArray[0].map(
      (prob, index) =>
        `${labelsNomes[index]}: ${(prob * 100).toFixed(4)}%`,
    ),
  );
}

// Exemplo de pessoas para treino (cada pessoa com idade, cor e localização)
// const pessoas = [
//     { nome: "Erick", idade: 30, cor: "azul", localizacao: "São Paulo" },
//     { nome: "Ana", idade: 25, cor: "vermelho", localizacao: "Rio" },
//     { nome: "Carlos", idade: 40, cor: "verde", localizacao: "Curitiba" }
// ];

// Vetores de entrada com valores já normalizados e one-hot encoded
// Ordem: [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
// const tensorPessoas = [
//     [0.33, 1, 0, 0, 1, 0, 0], // Erick
//     [0, 0, 1, 0, 0, 1, 0],    // Ana
//     [1, 0, 0, 1, 0, 0, 1]     // Carlos
// ]

// Usamos apenas os dados numéricos, como a rede neural só entende números.
// tensorPessoasNormalizado corresponde ao dataset de entrada do modelo.
const tensorPessoasNormalizado = [
  [0.33, 1, 0, 0, 1, 0, 0], // Erick
  [0, 0, 1, 0, 0, 1, 0], // Ana
  [1, 0, 0, 1, 0, 0, 1], // Carlos
];

// Labels das categorias a serem previstas (one-hot encoded)
// [premium, medium, basic]
const labelsNomes = ['premium', 'medium', 'basic']; // Ordem dos labels
const tensorLabels = [
  [1, 0, 0], // premium - Erick
  [0, 1, 0], // medium - Ana
  [0, 0, 1], // basic - Carlos
];

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(tensorPessoasNormalizado);
const outputYs = tf.tensor2d(tensorLabels);

// inputXs.print();
// outputYs.print();

const modeloTreinado = await trainModel(inputXs, outputYs);

const novaPessoa = {
  nome: 'Maria',
  idade: 28,
  cor: 'verde',
  localizacao: 'Curitiba',
};
// exemplo normalizando idade
// idade_min = 25 idade_max = 40 => idade_normalizada = (28 - 25) / (40 - 25) = 0.2
const novaPessoaNormalizada = [
  [
    0.2, // idade normalizada
    1, // azul
    0, // vermelho
    0, // verde
    1, // São Paulo
    0, // Rio
    0, // Curitiba
  ],
];
predict(modeloTreinado, novaPessoaNormalizada);
