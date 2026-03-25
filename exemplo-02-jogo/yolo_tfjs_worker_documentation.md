# YOLOv5n + TensorFlow.js Web Worker

Este código implementa **detecção de objetos usando YOLOv5n** com
TensorFlow.js executando dentro de um **Web Worker**.

O uso do Worker permite que a inferência de IA aconteça **fora da thread
principal**, evitando travamentos da interface.

Fluxo geral:

Imagem → Preprocessamento → Inferência YOLO → Pós‑processamento →
Resultado enviado para a UI

------------------------------------------------------------------------

# Dependência

``` javascript
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');
```

Carrega a biblioteca **TensorFlow.js** dentro do Web Worker.

Isso permite executar modelos de Machine Learning diretamente no
navegador.

------------------------------------------------------------------------

# Configurações do modelo

``` javascript
const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;
let INPUT_MODEL_DIMENTIONS = 640;
const CLASS_THRESHOLD = 0.5;
```

### MODEL_PATH

Caminho do modelo YOLO convertido para TensorFlow.js.

### LABELS_PATH

Arquivo JSON contendo os nomes das classes detectáveis.

Exemplo:

``` json
["person","bicycle","car","kite"]
```

### INPUT_MODEL_DIMENTIONS

Dimensão de entrada do modelo (geralmente **640x640** no YOLOv5).

### CLASS_THRESHOLD

Define o **nível mínimo de confiança** para considerar uma detecção
válida.

Exemplo:

    0.5 = 50% de confiança

------------------------------------------------------------------------

# Variáveis globais

``` javascript
let _labels = [];
let _model = null;
```

### \_labels

Lista de nomes das classes detectáveis.

### \_model

Instância do modelo carregado.

------------------------------------------------------------------------

# Função `loadModelAndLabels`

``` javascript
async function loadModelAndLabels()
```

Responsável por:

1.  Inicializar TensorFlow
2.  Carregar labels
3.  Carregar modelo YOLO
4.  Fazer **warmup do modelo**

### Inicialização do TensorFlow

``` javascript
await tf.ready();
```

Garante que o TensorFlow.js esteja pronto antes de executar qualquer
operação.

### Carregamento das labels

``` javascript
_labels = await (await fetch(LABELS_PATH)).json();
```

Carrega o arquivo JSON contendo os nomes das classes.

### Carregamento do modelo

``` javascript
_model = await tf.loadGraphModel(MODEL_PATH);
```

Carrega o modelo YOLO convertido para TensorFlow.js.

### Warmup do modelo

``` javascript
const dummyInput = tf.ones(_model.inputs[0].shape);
await _model.executeAsync(dummyInput);
```

Executa uma inferência com dados fictícios.

Objetivos:

-   inicializar memória
-   compilar kernels
-   reduzir latência da primeira inferência

### Liberação de memória

``` javascript
tf.dispose(dummyInput);
```

Remove o tensor usado no warmup.

### Notificação para a aplicação

``` javascript
postMessage({ type: 'model-loaded' });
```

Informa que o modelo foi carregado.

------------------------------------------------------------------------

# Função `preprocessImage`

``` javascript
function preprocessImage(inputImage)
```

Responsável por **preparar a imagem para o modelo**.

Entrada típica:

    [height, width, channels]

Saída esperada pelo modelo:

    [batch, height, width, channels]

### Conversão da imagem

``` javascript
const image = tf.browser.fromPixels(inputImage);
```

Transforma a imagem em um Tensor.

### Redimensionamento

``` javascript
tf.image.resizeBilinear(image, [
  _model.inputs[0].shape[1],
  _model.inputs[0].shape[2],
])
```

Redimensiona a imagem para o tamanho esperado pelo modelo.

Normalmente:

    640 x 640

### Normalização

``` javascript
.div(255)
```

Converte pixels:

    0-255 → 0-1

### Adiciona dimensão de batch

``` javascript
.expandDims(0)
```

Transforma:

    [640,640,3]

em:

    [1,640,640,3]

Batch representa **quantas imagens são processadas simultaneamente**.

------------------------------------------------------------------------

# Função `runInference`

``` javascript
async function runInference(tensor)
```

Executa a inferência do modelo YOLO.

### Execução do modelo

``` javascript
const output = await _model.executeAsync(tensor);
```

Retorna tensores com os resultados.

### Liberação do tensor de entrada

``` javascript
tf.dispose(tensor);
```

Evita vazamento de memória.

### Extração das saídas principais

``` javascript
const [boxes, scores, classes] = output.slice(0, 3);
```

YOLO retorna:

  Saída     Descrição
  --------- --------------------------------
  boxes     coordenadas das bounding boxes
  scores    confiança
  classes   classe detectada

### Conversão para arrays

``` javascript
boxes.data()
scores.data()
classes.data()
```

Transforma tensores em arrays JavaScript.

### Limpeza de memória

``` javascript
output.forEach((t) => t.dispose());
```

Remove os tensores retornados.

### Retorno

``` javascript
return {
  boxes: boxesData,
  scores: scoresData,
  classes: classesData,
};
```

------------------------------------------------------------------------

# Função `processPrediction`

``` javascript
function* processPrediction({ boxes, scores, classes }, width, height)
```

Responsável por **processar as detecções do modelo**.

É uma **generator function**, usando `yield`.

### Loop nas detecções

``` javascript
for (let index = 0; index < scores.length; index++)
```

Cada índice representa um objeto detectado.

### Filtro de confiança

``` javascript
if (scores[index] < CLASS_THRESHOLD) continue;
```

Remove detecções fracas.

### Identificação da classe

``` javascript
const label = _labels[classes[index]];
```

Converte o ID da classe para nome.

### Filtro da classe

``` javascript
if (label !== 'kite') continue;
```

Mantém apenas objetos **kite**.

### Extração da bounding box

``` javascript
let [x1, y1, x2, y2] = boxes.slice(index * 4, (index + 1) * 4);
```

Formato:

    [x1, y1, x2, y2]

### Conversão para pixels

YOLO retorna valores normalizados.

``` javascript
x1 *= width;
x2 *= width;
y1 *= height;
y2 *= height;
```

### Cálculo do centro

``` javascript
const centerX = x1 + boxWidth / 2;
const centerY = y1 + boxHeight / 2;
```

Obtém o ponto central da caixa.

### Resultado final

``` javascript
yield {
  x: centerX,
  y: centerY,
  score: (scores[index] * 100).toFixed(2),
};
```

Exemplo:

``` json
{
 "x": 320,
 "y": 210,
 "score": "91.34"
}
```

------------------------------------------------------------------------

# Inicialização

``` javascript
loadModelAndLabels();
```

Carrega o modelo quando o Worker inicia.

------------------------------------------------------------------------

# Comunicação com a aplicação

``` javascript
self.onmessage = async ({ data }) => {
```

Recebe mensagens da thread principal.

### Verificação do tipo

``` javascript
if (data.type !== 'predict') return;
```

Processa apenas mensagens de predição.

### Preprocessamento

``` javascript
const preImage = preprocessImage(data.image);
```

### Inferência

``` javascript
const inferenceResults = await runInference(preImage);
```

### Processamento das detecções

``` javascript
for (const prediction of processPrediction(...))
```

### Envio do resultado

``` javascript
postMessage({
  type: 'prediction',
  ...prediction,
});
```

Cada objeto detectado é enviado para a aplicação principal.

------------------------------------------------------------------------

# Fluxo completo

Thread principal → envia imagem → Worker

Worker: 1. preprocessImage 2. runInference 3. processPrediction

Resultado → enviado de volta para a UI.
