import { events } from './constants.js';

/**
 * Mini Event Bus da aplicação.
 *
 * Este arquivo encapsula uso de `CustomEvent` para evitar que o restante
 * da base precise conhecer detalhes de `document.addEventListener`.
 *
 * Padrão adotado:
 * - `onX(callback)`: assina um evento.
 * - `dispatchX(data)`: publica um evento com payload em `event.detail`.
 */
export default class Events {
  // Disparado quando o treinamento termina.
  static onTrainingComplete(callback) {
    document.addEventListener(events.trainingComplete, (event) => {
      return callback(event.detail);
    });
  }

  // Publica conclusão de treinamento para os interessados.
  static dispatchTrainingComplete(data) {
    const event = new CustomEvent(events.trainingComplete, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina solicitação de recomendação.
  static onRecommend(callback) {
    document.addEventListener(events.recommend, (event) => {
      return callback(event.detail);
    });
  }

  // Publica solicitação de recomendação.
  static dispatchRecommend(data) {
    const event = new CustomEvent(events.recommend, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina resultado de recomendações pronto para UI.
  static onRecommendationsReady(callback) {
    document.addEventListener(events.recommendationsReady, (event) => {
      return callback(event.detail);
    });
  }

  // Publica lista de recomendações recebida do worker.
  static dispatchRecommendationsReady(data) {
    const event = new CustomEvent(events.recommendationsReady, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina comando para iniciar treino.
  static onTrainModel(callback) {
    document.addEventListener(events.modelTrain, (event) => {
      return callback(event.detail);
    });
  }

  // Publica comando para iniciar treino.
  static dispatchTrainModel(data) {
    const event = new CustomEvent(events.modelTrain, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina logs de treinamento para visualização.
  static onTFVisLogs(callback) {
    document.addEventListener(events.tfvisLogs, (event) => {
      return callback(event.detail);
    });
  }

  // Publica logs de treinamento (época, loss, acurácia).
  static dispatchTFVisLogs(data) {
    const event = new CustomEvent(events.tfvisLogs, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina dados usados no painel tfvis.
  static onTFVisorData(callback) {
    document.addEventListener(events.tfvisData, (event) => {
      return callback(event.detail);
    });
  }

  // Publica dados de visualização vindos do worker.
  static dispatchTFVisorData(data) {
    const event = new CustomEvent(events.tfvisData, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina progresso do treinamento.
  static onProgressUpdate(callback) {
    document.addEventListener(events.modelProgressUpdate, (event) => {
      return callback(event.detail);
    });
  }

  // Publica progresso parcial do pipeline de treino.
  static dispatchProgressUpdate(progressData) {
    const event = new CustomEvent(events.modelProgressUpdate, {
      detail: progressData,
    });
    document.dispatchEvent(event);
  }

  // Assina seleção de usuário na interface.
  static onUserSelected(callback) {
    document.addEventListener(events.userSelected, (event) => {
      return callback(event.detail);
    });
  }

  // Publica usuário escolhido para os controllers interessados.
  static dispatchUserSelected(data) {
    const event = new CustomEvent(events.userSelected, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina atualização global da coleção de usuários.
  static onUsersUpdated(callback) {
    document.addEventListener(events.usersUpdated, (event) => {
      return callback(event.detail);
    });
  }

  // Publica atualização global de usuários.
  static dispatchUsersUpdated(data) {
    const event = new CustomEvent(events.usersUpdated, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina inclusão de compra no histórico.
  static onPurchaseAdded(callback) {
    document.addEventListener(events.purchaseAdded, (event) => {
      return callback(event.detail);
    });
  }

  // Publica que uma compra foi adicionada.
  static dispatchPurchaseAdded(data) {
    const event = new CustomEvent(events.purchaseAdded, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Assina remoção de compra do histórico.
  static onPurchaseRemoved(callback) {
    document.addEventListener(events.purchaseRemoved, (event) => {
      return callback(event.detail);
    });
  }

  // Publica remoção de compra.
  static dispatchEventPurchaseRemoved(data) {
    const event = new CustomEvent(events.purchaseRemoved, {
      detail: data,
    });
    document.dispatchEvent(event);
  }

  // Mantido para compatibilidade; assina progresso de treino.
  static onProgressUpdate(callback) {
    document.addEventListener(events.modelProgressUpdate, (event) => {
      return callback(event.detail);
    });
  }
}
