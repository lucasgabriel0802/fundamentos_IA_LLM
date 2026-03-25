import { buildLayout } from './layout';

const CAPTURE_INTERVAL_MS = 120;
const MIN_SHOT_CONFIDENCE = 28;
const MIN_STABLE_FRAMES = 1;
const SHOT_COOLDOWN_MS = 200;
const MAX_LEAD_DISTANCE = 200;
const HIGH_CONFIDENCE_THRESHOLD = 70;
const HIGH_SPEED_THRESHOLD = 180;
const FAST_TARGET_COOLDOWN = 160;

function shouldShootPrediction(data, now, lastShotAt) {
  const confidence = Number(data.score);
  if (!Number.isFinite(confidence) || confidence < MIN_SHOT_CONFIDENCE) {
    return false;
  }

  if (!Number.isFinite(data.predictedX) || !Number.isFinite(data.predictedY)) {
    return false;
  }

  const isHighConfidence = confidence >= HIGH_CONFIDENCE_THRESHOLD;
  const requiredStableFrames = isHighConfidence ? 0 : MIN_STABLE_FRAMES;

  if ((data.stableFrames || 0) < requiredStableFrames) {
    return false;
  }

  const speed = Math.hypot(data.velocityX || 0, data.velocityY || 0);
  const isFastMoving = speed >= HIGH_SPEED_THRESHOLD;
  const cooldown = isFastMoving ? FAST_TARGET_COOLDOWN : SHOT_COOLDOWN_MS;

  if (now - lastShotAt < cooldown) {
    return false;
  }

  const originX = Number.isFinite(data.smoothedX) ? data.smoothedX : data.x;
  const originY = Number.isFinite(data.smoothedY) ? data.smoothedY : data.y;
  const leadDistance = Math.hypot(
    data.predictedX - originX,
    data.predictedY - originY,
  );

  const maxLead = isHighConfidence
    ? MAX_LEAD_DISTANCE * 1.3
    : MAX_LEAD_DISTANCE;

  return leadDistance <= maxLead;
}

export default async function main(game) {
  const container = buildLayout(game.app);
  const worker = new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module',
  });
  let lastShotAt = Number.NEGATIVE_INFINITY;

  game.stage.aim.visible = false;

  worker.onmessage = ({ data }) => {
    const { type, x, y } = data;

    if (type === 'prediction') {
      // console.log(`🎯 AI predicted at: (${x}, ${y})`);
      container.updateHUD(data);
      game.stage.aim.visible = true;

      const targetX = Number.isFinite(data.predictedX)
        ? data.predictedX
        : Number.isFinite(data.smoothedX)
          ? data.smoothedX
          : x;
      const targetY = Number.isFinite(data.predictedY)
        ? data.predictedY
        : Number.isFinite(data.smoothedY)
          ? data.smoothedY
          : y;

      game.stage.aim.setPosition(targetX, targetY);
      const position = game.stage.aim.getGlobalPosition();

      const now = performance.now();
      if (!shouldShootPrediction(data, now, lastShotAt)) {
        return;
      }

      game.handleClick({
        global: position,
      });

      lastShotAt = now;
    }
  };

  setInterval(async () => {
    const canvas = game.app.renderer.extract.canvas(game.stage);
    const bitmap = await createImageBitmap(canvas);

    worker.postMessage(
      {
        type: 'predict',
        image: bitmap,
      },
      [bitmap],
    );
  }, CAPTURE_INTERVAL_MS);

  return container;
}
