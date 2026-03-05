import { View } from './View.js';

/**
 * View de usuário.
 *
 * Esta classe cuida exclusivamente de:
 * - ler/escrever elementos do DOM relacionados ao usuário,
 * - emitir callbacks para o controller,
 * - renderizar histórico de compras com templates HTML.
 */
export class UserView extends View {
  // Referências de DOM usadas pela seção de usuário.
  #userSelect = document.querySelector('#userSelect');
  #userAge = document.querySelector('#userAge');
  #pastPurchasesList = document.querySelector('#pastPurchasesList');

  // Estado interno e callbacks registrados pelo controller.
  #purchaseTemplate;
  #onUserSelect;
  #onPurchaseRemove;
  #pastPurchaseElements = [];

  constructor() {
    super();
    this.init();
  }

  // Carrega template de compra e liga listener principal do select.
  async init() {
    this.#purchaseTemplate = await this.loadTemplate(
      './src/view/templates/past-purchase.html',
    );
    this.attachUserSelectListener();
  }

  // Controller injeta callback para seleção de usuário.
  registerUserSelectCallback(callback) {
    this.#onUserSelect = callback;
  }

  // Controller injeta callback para remoção de compra.
  registerPurchaseRemoveCallback(callback) {
    this.#onPurchaseRemove = callback;
  }

  // Renderiza opções do <select> com base na lista de usuários.
  renderUserOptions(users) {
    const options = users
      .map((user) => {
        return `<option value="${user.id}">${user.name}</option>`;
      })
      .join('');

    this.#userSelect.innerHTML += options;
  }

  // Exibe informações básicas do usuário selecionado.
  renderUserDetails(user) {
    this.#userAge.value = user.age;
  }

  // Renderiza histórico completo de compras passadas.
  renderPastPurchases(pastPurchases) {
    if (!this.#purchaseTemplate) return;

    // Estado vazio amigável para o usuário.
    if (!pastPurchases || pastPurchases.length === 0) {
      this.#pastPurchasesList.innerHTML = '<p>No past purchases found.</p>';
      return;
    }

    const html = pastPurchases
      .map((product) => {
        return this.replaceTemplate(this.#purchaseTemplate, {
          ...product,
          product: JSON.stringify(product),
        });
      })
      .join('');

    this.#pastPurchasesList.innerHTML = html;
    this.attachPurchaseClickHandlers();
  }

  // Insere somente uma nova compra no topo da lista (render incremental).
  addPastPurchase(product) {
    // Se havia mensagem vazia, limpa antes de inserir item real.
    if (this.#pastPurchasesList.innerHTML.includes('No past purchases found')) {
      this.#pastPurchasesList.innerHTML = '';
    }

    const purchaseHtml = this.replaceTemplate(this.#purchaseTemplate, {
      ...product,
      product: JSON.stringify(product),
    });

    this.#pastPurchasesList.insertAdjacentHTML('afterbegin', purchaseHtml);

    // Pequeno destaque visual para indicar item recém-adicionado.
    const newPurchase =
      this.#pastPurchasesList.firstElementChild.querySelector('.past-purchase');
    newPurchase.classList.add('past-purchase-highlight');

    setTimeout(() => {
      newPurchase.classList.remove('past-purchase-highlight');
    }, 1000);

    this.attachPurchaseClickHandlers();
  }

  // Escuta mudanças no seletor de usuário e repassa id ao controller.
  attachUserSelectListener() {
    this.#userSelect.addEventListener('change', (event) => {
      const userId = event.target.value ? Number(event.target.value) : null;

      if (userId) {
        if (this.#onUserSelect) {
          this.#onUserSelect(userId);
        }
      } else {
        // Se nada selecionado, limpa painel de detalhes.
        this.#userAge.value = '';
        this.#pastPurchasesList.innerHTML = '';
      }
    });
  }

  // Liga clique em cada compra para permitir remoção do histórico.
  attachPurchaseClickHandlers() {
    // Guarda referências atualizadas dos elementos renderizados.
    this.#pastPurchaseElements = [];

    const purchaseElements = document.querySelectorAll('.past-purchase');

    purchaseElements.forEach((purchaseElement) => {
      this.#pastPurchaseElements.push(purchaseElement);

      purchaseElement.onclick = (event) => {
        // Dados serializados no data-attribute do template.
        const product = JSON.parse(purchaseElement.dataset.product);
        const userId = this.getSelectedUserId();
        const element = purchaseElement.closest('.col-md-6');

        // Delegamos ao controller a regra de negócio da remoção.
        this.#onPurchaseRemove({ element, userId, product });

        // Efeito de saída para melhorar percepção da interação.
        element.style.transition = 'opacity 0.5s ease';
        element.style.opacity = '0';

        setTimeout(() => {
          element.remove();

          // Se não sobrou nenhum item, mostramos mensagem vazia.
          if (document.querySelectorAll('.past-purchase').length === 0) {
            this.renderPastPurchases([]);
          }
        }, 500);
      };
    });
  }

  // Conveniência para quem precisa recuperar usuário selecionado.
  getSelectedUserId() {
    return this.#userSelect.value ? Number(this.#userSelect.value) : null;
  }
}
