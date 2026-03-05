import { View } from './View.js';

/**
 * View de produtos.
 *
 * Exibe catálogo/recomendações e captura ação de compra da interface.
 * Não contém regra de negócio; apenas renderiza e repassa callbacks.
 */
export class ProductView extends View {
  // DOM elements
  #productList = document.querySelector('#productList');

  #buttons;
  // Templates and callbacks
  #productTemplate;
  #onBuyProduct;

  constructor() {
    super();
    this.init();
  }

  // Carrega template HTML do card de produto.
  async init() {
    this.#productTemplate = await this.loadTemplate(
      './src/view/templates/product-card.html',
    );
  }

  // Quando há usuário selecionado, os botões de compra podem ser habilitados.
  onUserSelected(user) {
    // Se existir id válido, habilita compra; caso contrário, mantém desabilitado.
    this.setButtonsState(user.id ? false : true);
  }

  // Controller registra callback para "comprar".
  registerBuyProductCallback(callback) {
    this.#onBuyProduct = callback;
  }

  // Renderiza cards de produtos/recomendações no container principal.
  render(products, disableButtons = true) {
    if (!this.#productTemplate) return;
    const html = products
      .map((product) => {
        return this.replaceTemplate(this.#productTemplate, {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          color: product.color,
          product: JSON.stringify(product),
        });
      })
      .join('');

    this.#productList.innerHTML = html;
    this.attachBuyButtonListeners();

    // Controle de estado inicial dos botões após render.
    this.setButtonsState(disableButtons);
  }

  // Habilita/desabilita todos os botões "Buy Now".
  setButtonsState(disabled) {
    if (!this.#buttons) {
      this.#buttons = document.querySelectorAll('.buy-now-btn');
    }
    this.#buttons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  // Conecta eventos de clique de cada card de produto.
  attachBuyButtonListeners() {
    this.#buttons = document.querySelectorAll('.buy-now-btn');
    this.#buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        // Produto serializado no `data-product` do botão.
        const product = JSON.parse(button.dataset.product);
        const originalText = button.innerHTML;

        // Feedback visual rápido de "adicionado".
        button.innerHTML = '<i class="bi bi-check-circle-fill"></i> Added';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('btn-success');
          button.classList.add('btn-primary');
        }, 500);

        // Encaminha ação para controller.
        this.#onBuyProduct(product, button);
      });
    });
  }
}
