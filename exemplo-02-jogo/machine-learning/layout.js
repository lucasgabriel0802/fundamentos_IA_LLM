// layout.js
import * as PIXI from 'pixi.js';

export function buildLayout(app) {
  // Container for HUD
  const hud = new PIXI.Container();
  hud.y = 50;
  hud.zIndex = 1000;

  // Score Text
  const scoreText = new PIXI.Text({
    text: 'Confidence: 0%',
    style: {
      fontFamily: 'monospace',
      fontSize: 24,
      fill: 0xffffff,
      stroke: 0x000000,
    },
  });
  hud.addChild(scoreText);

  // Predictions Text
  const predictionsText = new PIXI.Text({
    text: 'Predictions:',
    style: {
      fontFamily: 'monospace',
      fontSize: 16,
      fill: 0xfff666,
      stroke: 0x333300,
      wordWrap: true,
      wordWrapWidth: 420,
    },
  });
  predictionsText.y = 36;
  hud.addChild(predictionsText);

  // Add HUD to stage, ensure it's always on top
  app.stage.sortableChildren = true;
  app.stage.addChild(hud);

  // Function to reposition HUD at top-right
  function positionHUD() {
    // Margin from the right
    const margin = 16;
    // Find HUD width (in case text wraps/grows)
    const hudWidth = Math.max(scoreText.width, predictionsText.width);
    hud.x = app.renderer.width - hudWidth - margin;
  }

  // Utility for updating HUD
  function updateHUD(data) {
    const confidence = Number(data.score);
    scoreText.text = Number.isFinite(confidence)
      ? `Confidence: ${confidence.toFixed(1)}% | lock: ${data.stableFrames || 0}`
      : `Confidence: -- | lock: ${data.stableFrames || 0}`;

    const currentPosition = `(${Math.round(data.x)}, ${Math.round(data.y)})`;
    const predictedPosition =
      Number.isFinite(data.predictedX) && Number.isFinite(data.predictedY)
        ? `(${Math.round(data.predictedX)}, ${Math.round(data.predictedY)})`
        : currentPosition;
    const direction = data.direction || 'unknown';
    const leadMs = Number.isFinite(data.leadTimeSeconds)
      ? `${Math.round(data.leadTimeSeconds * 1000)}ms`
      : '--';

    predictionsText.text = `Predictions: now ${currentPosition} -> next ${predictedPosition} [${direction}] lead=${leadMs}`;
    positionHUD();
  }

  // Position HUD initially and on every resize
  positionHUD();
  window.addEventListener('resize', () => {
    positionHUD();
  });

  return {
    updateHUD,
  };
}
