/**
 * Controller de usuários.
 *
 * Papel deste controller:
 * - Receber eventos de UI da `UserView`.
 * - Manipular dados via `UserService`.
 * - Publicar eventos globais para outras partes da aplicação reagirem.
 */
export class UserController {
  #userService;
  #userView;
  #events;
  constructor({ userView, userService, events }) {
    this.#userView = userView;
    this.#userService = userService;
    this.#events = events;
  }

  static init(deps) {
    return new UserController(deps);
  }

  // Fluxo inicial de renderização da tela de usuários.
  async renderUsers(nonTrainedUser) {
    const users = await this.#userService.getDefaultUsers();

    // Usuário extra sem histórico para testar recomendação em cenário frio.
    this.#userService.addUser(nonTrainedUser);
    const defaultAndNonTrained = [nonTrainedUser, ...users];

    // Renderiza opções no select e liga listeners.
    this.#userView.renderUserOptions(defaultAndNonTrained);
    this.setupCallbacks();
    this.setupPurchaseObserver();

    // Dispara snapshot global para quem precisar dos usuários.
    this.#events.dispatchUsersUpdated({ users: defaultAndNonTrained });
  }

  // Conecta callbacks de interface para métodos do controller.
  setupCallbacks() {
    this.#userView.registerUserSelectCallback(this.handleUserSelect.bind(this));
    this.#userView.registerPurchaseRemoveCallback(
      this.handlePurchaseRemove.bind(this),
    );
  }

  // Observa compras adicionadas por outro fluxo (ProductController).
  setupPurchaseObserver() {
    this.#events.onPurchaseAdded(async (...data) => {
      return this.handlePurchaseAdded(...data);
    });
  }

  // Quando usuário muda no select: atualiza detalhes e notifica o restante do app.
  async handleUserSelect(userId) {
    const user = await this.#userService.getUserById(userId);
    this.#events.dispatchUserSelected(user);
    return this.displayUserDetails(user);
  }

  // Persiste nova compra e atualiza UI/lista global de usuários.
  async handlePurchaseAdded({ user, product }) {
    const updatedUser = await this.#userService.getUserById(user.id);
    updatedUser.purchases.push({
      ...product,
    });

    await this.#userService.updateUser(updatedUser);

    const lastPurchase =
      updatedUser.purchases[updatedUser.purchases.length - 1];
    this.#userView.addPastPurchase(lastPurchase);
    this.#events.dispatchUsersUpdated({
      users: await this.#userService.getUsers(),
    });
  }

  // Remove compra do histórico do usuário e sincroniza estado global.
  async handlePurchaseRemove({ userId, product }) {
    const user = await this.#userService.getUserById(userId);
    const index = user.purchases.findIndex((item) => item.id === product.id);

    if (index !== -1) {
      // Remove exatamente 1 item a partir do índice encontrado.
      user.purchases.splice(index, 1);
      await this.#userService.updateUser(user);

      const updatedUsers = await this.#userService.getUsers();
      this.#events.dispatchUsersUpdated({ users: updatedUsers });
    }
  }

  // Atualiza bloco de detalhes (idade + compras passadas).
  async displayUserDetails(user) {
    this.#userView.renderUserDetails(user);
    this.#userView.renderPastPurchases(user.purchases);
  }

  // Exposto para cenários em que outra camada precisa saber seleção atual.
  getSelectedUserId() {
    return this.#userView.getSelectedUserId();
  }
}
