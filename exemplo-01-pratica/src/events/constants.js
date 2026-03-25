/**
 * Nomes dos eventos internos da aplicação (Event Bus no browser).
 *
 * Convenção usada:
 * - "domínio:ação" para ficar legível e evitar colisões de nome.
 * - Esses nomes são reutilizados por controllers/views via classe Events.
 */
export const events = {
  // Usuário selecionado no <select>
  userSelected: 'user:selected',
  // Lista de usuários foi alterada (compra adicionada/removida etc.)
  usersUpdated: 'users:updated',
  // Compra criada para o usuário atual
  purchaseAdded: 'purchase:added',
  // Compra removida do histórico
  purchaseRemoved: 'purchase:remove',
  // Solicita treino do modelo
  modelTrain: 'training:train',
  // Treino finalizado
  trainingComplete: 'training:complete',

  // Atualização de progresso do treino
  modelProgressUpdate: 'model:progress-update',
  // Recomendação pronta para renderização
  recommendationsReady: 'recommendations:ready',
  // Solicita recomendação para um usuário
  recommend: 'recommend',
};

/**
 * Nomes de mensagens trocadas com o Web Worker.
 *
 * Aqui não usamos CustomEvent do DOM.
 * Esses tipos viajam em postMessage/onmessage.
 */
export const workerEvents = {
  // Worker informa conclusão do treino
  trainingComplete: 'training:complete',
  // Main thread solicita treino
  trainModel: 'train:model',
  // Main thread solicita recomendação
  recommend: 'recommend',
  // Log por época de treinamento
  trainingLog: 'training:log',
  // Progresso parcial do pipeline
  progressUpdate: 'progress:update',
  // Dados para visualização no tfvis
  tfVisData: 'tfvis:data',
  // Logs específicos de visualização
  tfVisLogs: 'tfvis:logs',
};
