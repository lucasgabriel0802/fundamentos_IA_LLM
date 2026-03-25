/**
 * Controller dedicado ao dashboard do tfvis.
 *
 * Ele observa eventos de treino e repassa logs para a view de gráficos.
 */
export class TFVisorController {
  #tfVisorView;
  #events;
  constructor({ tfVisorView, events }) {
    this.#tfVisorView = tfVisorView;
    this.#events = events;

    this.init();
  }

  static init(deps) {
    return new TFVisorController(deps);
  }

  async init() {
    // Organização dos listeners do módulo.
    this.setupCallbacks();
  }

  setupCallbacks() {
    // A cada novo treino, limpamos estado dos gráficos.
    this.#events.onTrainModel(() => {
      this.#tfVisorView.resetDashboard();
    });

    // Recebe logs por época para desenhar curvas de loss/accuracy.
    this.#events.onTFVisLogs((log) => {
      this.#tfVisorView.handleTrainingLog(log);
    });
  }
}
