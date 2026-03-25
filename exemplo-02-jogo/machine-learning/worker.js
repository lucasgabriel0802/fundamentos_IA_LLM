importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');

const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;
let INPUT_MODEL_DIMENTIONS = 640;
const CLASS_THRESHOLD = 0.38;
const TRACK_HISTORY_SIZE = 3;
const PREDICTION_HORIZON_SECONDS = 0.06;
const MIN_DIRECTION_SPEED = 15;
const MIN_TRACK_SCORE = 38;
const MAX_TRACK_JUMP = 250;
const SMOOTHING_ALPHA = 0.7;
const MAX_ACCELERATION = 2500;
const LEAD_TIME_MULTIPLIER = 1.3;
const LEAD_TIME_MIN = 0.09;
const LEAD_TIME_MAX = 0.38;

let _labels = [];
let _model = null;
const _positionHistory = [];
let _lastTrackedPosition = null;
let _smoothedPosition = null;
let _stableFrames = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDirectionFromVelocity(vx, vy) {
  const horizontal =
    Math.abs(vx) < MIN_DIRECTION_SPEED ? '' : vx > 0 ? 'right' : 'left';
  const vertical =
    Math.abs(vy) < MIN_DIRECTION_SPEED ? '' : vy > 0 ? 'down' : 'up';

  if (horizontal && vertical) return `${vertical}-${horizontal}`;
  if (horizontal) return horizontal;
  if (vertical) return vertical;

  return 'stationary';
}

function getHighestConfidencePrediction(predictions) {
  return predictions.reduce((best, current) => {
    return Number(current.score) > Number(best.score) ? current : best;
  });
}

function chooseTrackedPrediction(predictions) {
  if (predictions.length === 0) return null;

  const strongPredictions = predictions.filter(
    (prediction) => Number(prediction.score) >= MIN_TRACK_SCORE,
  );

  const candidates =
    strongPredictions.length > 0 ? strongPredictions : predictions;

  if (!_lastTrackedPosition) {
    return getHighestConfidencePrediction(candidates);
  }

  const trackingBonus = _stableFrames > 3 ? 30 : _stableFrames > 1 ? 15 : 0;

  let bestCandidate = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = Math.hypot(
      candidate.x - _lastTrackedPosition.x,
      candidate.y - _lastTrackedPosition.y,
    );

    if (distance > MAX_TRACK_JUMP) continue;

    const confidencePenalty = (100 - Number(candidate.score)) * 1.5;
    const cost = distance + confidencePenalty - trackingBonus;

    if (cost < bestCost) {
      bestCost = cost;
      bestCandidate = candidate;
    }
  }

  return bestCandidate || getHighestConfidencePrediction(candidates);
}

function smoothTrackedPrediction({ x, y }) {
  if (!_smoothedPosition) {
    _smoothedPosition = { x, y };
    return _smoothedPosition;
  }

  _smoothedPosition = {
    x: SMOOTHING_ALPHA * x + (1 - SMOOTHING_ALPHA) * _smoothedPosition.x,
    y: SMOOTHING_ALPHA * y + (1 - SMOOTHING_ALPHA) * _smoothedPosition.y,
  };

  return _smoothedPosition;
}

function resetTrackerState() {
  _positionHistory.length = 0;
  _lastTrackedPosition = null;
  _smoothedPosition = null;
  _stableFrames = 0;
}

function trackPosition(x, y) {
  _positionHistory.push({
    x,
    y,
    t: performance.now(),
  });

  while (_positionHistory.length > TRACK_HISTORY_SIZE) {
    _positionHistory.shift();
  }
}

function predictFromHistory(width, height) {
  if (_positionHistory.length === 0) {
    return null;
  }

  const last = _positionHistory[_positionHistory.length - 1];

  if (_positionHistory.length < 2) {
    return {
      predictedX: last.x,
      predictedY: last.y,
      direction: 'unknown',
      velocityX: 0,
      velocityY: 0,
      leadTimeSeconds: 0,
    };
  }

  if (_positionHistory.length === 2) {
    const [p0, p1] = _positionHistory;
    const dt = Math.max((p1.t - p0.t) / 1000, 1 / 240);
    const vx = (p1.x - p0.x) / dt;
    const vy = (p1.y - p0.y) / dt;

    const leadTime = clamp(
      dt * 1.5 + PREDICTION_HORIZON_SECONDS,
      LEAD_TIME_MIN,
      LEAD_TIME_MAX * 0.7,
    );
    const predictedX = clamp(p1.x + vx * leadTime, 0, width);
    const predictedY = clamp(p1.y + vy * leadTime, 0, height);

    return {
      predictedX,
      predictedY,
      direction: getDirectionFromVelocity(vx, vy),
      velocityX: vx,
      velocityY: vy,
      leadTimeSeconds: leadTime,
    };
  }

  const [p0, p1, p2] = _positionHistory;

  const dt1 = Math.max((p1.t - p0.t) / 1000, 1 / 240);
  const dt2 = Math.max((p2.t - p1.t) / 1000, 1 / 240);

  const vx1 = (p1.x - p0.x) / dt1;
  const vy1 = (p1.y - p0.y) / dt1;
  const vx2 = (p2.x - p1.x) / dt2;
  const vy2 = (p2.y - p1.y) / dt2;

  const avgDt = (dt1 + dt2) / 2;
  const ax = clamp((vx2 - vx1) / avgDt, -MAX_ACCELERATION, MAX_ACCELERATION);
  const ay = clamp((vy2 - vy1) / avgDt, -MAX_ACCELERATION, MAX_ACCELERATION);

  const dt = clamp(
    avgDt * LEAD_TIME_MULTIPLIER + PREDICTION_HORIZON_SECONDS,
    LEAD_TIME_MIN,
    LEAD_TIME_MAX,
  );
  const predictedX = clamp(p2.x + vx2 * dt + 0.5 * ax * dt * dt, 0, width);
  const predictedY = clamp(p2.y + vy2 * dt + 0.5 * ay * dt * dt, 0, height);

  return {
    predictedX,
    predictedY,
    direction: getDirectionFromVelocity(vx2, vy2),
    velocityX: vx2,
    velocityY: vy2,
    leadTimeSeconds: dt,
  };
}

async function loadModelAndLabels() {
  await tf.ready();

  _labels = await (await fetch(LABELS_PATH)).json();
  _model = await tf.loadGraphModel(MODEL_PATH);

  // warmup
  const dummyInput = tf.ones(_model.inputs[0].shape);
  if (_model) INPUT_MODEL_DIMENTIONS = _model.inputs[0].shape[1];

  await _model.executeAsync(dummyInput);
  tf.dispose(dummyInput);

  postMessage({ type: 'model-loaded' });
}

function preprocessImage(inputImage) {
  return tf.tidy(() => {
    const image = tf.browser.fromPixels(inputImage);

    return tf.image
      .resizeBilinear(image, [
        _model.inputs[0].shape[1], //shape[1] = altura do modelo
        _model.inputs[0].shape[2], //shape[2] = largura do modelo
      ])
      .div(255) //Normaliza os valores dos pixels.
      .expandDims(0); //Batch de 1 amostra (1 imagem)
  });
}

async function runInference(tensor) {
  const output = await _model.executeAsync(tensor);
  tf.dispose(tensor);
  const [boxes, scores, classes] = output.slice(0, 3);
  const [boxesData, scoresData, classesData] = await Promise.all([
    boxes.data(),
    scores.data(),
    classes.data(),
  ]);

  output.forEach((t) => t.dispose());

  return {
    boxes: boxesData,
    scores: scoresData,
    classes: classesData,
  };
}

function* processPrediction({ boxes, scores, classes }, width, height) {
  for (let index = 0; index < scores.length; index++) {
    if (scores[index] < CLASS_THRESHOLD) continue;

    const label = _labels[classes[index]];
    if (label !== 'kite') continue;
    console.log(
      `Detected ${label} with confidence ${(scores[index] * 100).toFixed(2)}%`,
    );
    let [x1, y1, x2, y2] = boxes.slice(index * 4, (index + 1) * 4);
    x1 *= width;
    x2 *= width;
    y1 *= height;
    y2 *= height;

    const boxWidth = x2 - x1;
    const boxHeight = y2 - y1;
    const centerX = x1 + boxWidth / 2;
    const centerY = y1 + boxHeight / 2;

    yield {
      x: centerX,
      y: centerY,
      score: (scores[index] * 100).toFixed(2),
      label,
    };
  }
}

loadModelAndLabels();

self.onmessage = async ({ data }) => {
  if (data.type !== 'predict') return;
  if (_model) {
    const preImage = preprocessImage(data.image);
    const { width, height } = data.image;

    const inferenceResults = await runInference(preImage);

    const predictions = Array.from(
      processPrediction(inferenceResults, width, height),
    );

    if (predictions.length === 0) {
      resetTrackerState();
      return;
    }

    const bestPrediction = chooseTrackedPrediction(predictions);
    if (!bestPrediction) {
      resetTrackerState();
      return;
    }

    _lastTrackedPosition = {
      x: bestPrediction.x,
      y: bestPrediction.y,
    };

    const smoothedPosition = smoothTrackedPrediction(bestPrediction);

    trackPosition(smoothedPosition.x, smoothedPosition.y);
    _stableFrames =
      _positionHistory.length === TRACK_HISTORY_SIZE ? _stableFrames + 1 : 0;

    const trajectory = predictFromHistory(width, height);
    if (!trajectory) return;

    postMessage({
      type: 'prediction',
      ...bestPrediction,
      smoothedX: smoothedPosition.x,
      smoothedY: smoothedPosition.y,
      stableFrames: _stableFrames,
      ...trajectory,
    });
  }
};
