/**
 * Controller do módulo de treinamento/recomendação.
 *
 * Ele conecta os botões da `ModelView` com:
 * - dados de usuários (via UserService),
 * - eventos de treino/progresso,
 * - habilitação de recomendação após treinamento.
 */
export class ModelController {
  #modelView;
  #userService;
  #events;
  #currentUser = null;
  #alreadyTrained = false;
  constructor({ modelView, userService, events }) {
    this.#modelView = modelView;
    this.#userService = userService;
    this.#events = events;

    this.init();
  }

  static init(deps) {
    return new ModelController(deps);
  }

  async init() {
    // Neste caso o "init" só organiza registro de callbacks.
    this.setupCallbacks();
  }

  setupCallbacks() {
    // Callbacks da UI para ações de treino e recomendação manual.
    this.#modelView.registerTrainModelCallback(
      this.handleTrainModel.bind(this),
    );
    this.#modelView.registerRunRecommendationCallback(
      this.handleRunRecommendation.bind(this),
    );

    // Guarda usuário atual para recomendações direcionadas.
    this.#events.onUserSelected((user) => {
      this.#currentUser = user;
      if (!this.#alreadyTrained) return;
      this.#modelView.enableRecommendButton();
    });

    // Após treino concluído, botão de recomendação pode ser habilitado.
    this.#events.onTrainingComplete(() => {
      this.#alreadyTrained = true;
      if (!this.#currentUser) return;
      this.#modelView.enableRecommendButton();
    });

    // Sempre que compras mudam, atualiza painel-resumo de dados.
    this.#events.onUsersUpdated(async (...data) => {
      return this.refreshUsersPurchaseData(...data);
    });

    // Repassa progresso para a view atualizar spinner/estado do botão.
    this.#events.onProgressUpdate((progress) => {
      this.handleTrainingProgressUpdate(progress);
    });
  }

  // Coleta usuários atuais e solicita treinamento ao worker (via eventos).
  async handleTrainModel() {
    const users = await this.#userService.getUsers();

    this.#events.dispatchTrainModel(users);
  }

  // Atualiza estado visual de treinamento.
  handleTrainingProgressUpdate(progress) {
    this.#modelView.updateTrainingProgress(progress);
  }

  // Solicita recomendação para o usuário selecionado, com dados atualizados.
  async handleRunRecommendation() {
    const currentUser = this.#currentUser;
    const updatedUser = await this.#userService.getUserById(currentUser.id);
    this.#events.dispatchRecommend(updatedUser);
  }

  // Atualiza listagem agregada de compras por usuário.
  async refreshUsersPurchaseData({ users }) {
    this.#modelView.renderAllUsersPurchases(users);
  }
}
