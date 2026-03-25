import { workerEvents } from '../events/constants.js';

/**
 * Controller-ponte entre Main Thread e Web Worker.
 *
 * Ele traduz eventos da aplicação em `postMessage` para o worker,
 * e traduz mensagens do worker em eventos internos (`Events`).
 */
export class WorkerController {
  #worker;
  #events;
  #alreadyTrained = false;
  constructor({ worker, events }) {
    this.#worker = worker;
    this.#events = events;
    this.#alreadyTrained = false;
    this.init();
  }

  async init() {
    // Registra assinaturas de eventos e listener do worker.
    this.setupCallbacks();
  }

  static init(deps) {
    return new WorkerController(deps);
  }

  setupCallbacks() {
    // Ao solicitar treino, encaminha dados para o worker.
    this.#events.onTrainModel((data) => {
      this.#alreadyTrained = false;
      this.triggerTrain(data);
    });

    // Marca estado local para liberar recomendações.
    this.#events.onTrainingComplete(() => {
      this.#alreadyTrained = true;
    });

    // Recomendação só é enviada quando já existe modelo treinado.
    this.#events.onRecommend((data) => {
      if (!this.#alreadyTrained) return;

      this.triggerRecommend(data);
    });

    // Tipos de mensagens de alto volume (normalmente não logamos no console).
    const eventsToIgnoreLogs = [
      workerEvents.progressUpdate,
      workerEvents.trainingLog,
      workerEvents.tfVisData,
      workerEvents.tfVisLogs,
      workerEvents.trainingComplete,
    ];
    this.#worker.onmessage = (event) => {
      if (!eventsToIgnoreLogs.includes(event.data.type))
        console.log(event.data);

      // Progresso de treino (ex.: 50%, 100%).
      if (event.data.type === workerEvents.progressUpdate) {
        this.#events.dispatchProgressUpdate(event.data.progress);
      }

      // Worker confirmou fim do treinamento.
      if (event.data.type === workerEvents.trainingComplete) {
        this.#events.dispatchTrainingComplete(event.data);
      }

      // Dados iniciais para visualização no tfvis.
      if (event.data.type === workerEvents.tfVisData) {
        this.#events.dispatchTFVisorData(event.data.data);
      }

      // Log por época para a view de gráficos.
      if (event.data.type === workerEvents.trainingLog) {
        this.#events.dispatchTFVisLogs(event.data);
      }

      // Resultado de recomendação pronto para a ProductView.
      if (event.data.type === workerEvents.recommend) {
        this.#events.dispatchRecommendationsReady(event.data);
      }
    };
  }

  // Envia comando de treino para o worker.
  triggerTrain(users) {
    this.#worker.postMessage({ action: workerEvents.trainModel, users });
  }

  // Envia comando de recomendação para o worker.
  triggerRecommend(user) {
    this.#worker.postMessage({ action: workerEvents.recommend, user });
  }
}
