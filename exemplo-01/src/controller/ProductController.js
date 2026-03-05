/**
 * Controller de produtos.
 *
 * Responsável por:
 * - Carregar catálogo inicial.
 * - Reagir à seleção de usuário.
 * - Encaminhar ação de compra para o fluxo de usuários.
 * - Exibir recomendações quando o worker retorna resultados.
 */
export class ProductController {
  #productView;
  #currentUser = null;
  #events;
  #productService;
  constructor({ productView, events, productService }) {
    this.#productView = productView;
    this.#productService = productService;
    this.#events = events;
    this.init();
  }

  static init(deps) {
    return new ProductController(deps);
  }

  // Configuração inicial: listeners + render da vitrine padrão.
  async init() {
    this.setupCallbacks();
    this.setupEventListeners();
    const products = await this.#productService.getProducts();
    this.#productView.render(products, true);
  }

  // Assina eventos globais para manter a vitrine sincronizada.
  setupEventListeners() {
    this.#events.onUserSelected((user) => {
      this.#currentUser = user;
      this.#productView.onUserSelected(user);
      // A seleção já pode disparar recomendação automática.
      this.#events.dispatchRecommend(user);
    });

    // Quando recomendações chegam, renderiza lista ordenada por score.
    this.#events.onRecommendationsReady(({ recommendations }) => {
      this.#productView.render(recommendations, false);
    });
  }

  // Liga clique do botão "Buy" ao método de compra do controller.
  setupCallbacks() {
    this.#productView.registerBuyProductCallback(
      this.handleBuyProduct.bind(this),
    );
  }

  // Compra aqui significa "emitir intenção"; persistência acontece no UserController.
  async handleBuyProduct(product) {
    const user = this.#currentUser;
    this.#events.dispatchPurchaseAdded({ user, product });
  }
}
