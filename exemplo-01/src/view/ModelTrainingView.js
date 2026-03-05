import { View } from './View.js';

/**
 * View da seção de treinamento do modelo.
 *
 * Ela controla a UI de:
 * - botão de treinar,
 * - botão de recomendar,
 * - indicador de progresso,
 * - resumo de compras de todos os usuários.
 */
export class ModelView extends View {
  // Elementos de UI usados no painel.
  #trainModelBtn = document.querySelector('#trainModelBtn');
  #purchasesArrow = document.querySelector('#purchasesArrow');
  #purchasesDiv = document.querySelector('#purchasesDiv');
  #allUsersPurchasesList = document.querySelector('#allUsersPurchasesList');
  #runRecommendationBtn = document.querySelector('#runRecommendationBtn');
  #onTrainModel;
  #onRunRecommendation;

  constructor() {
    super();
    this.attachEventListeners();
  }

  // Controller registra callback para início de treino.
  registerTrainModelCallback(callback) {
    this.#onTrainModel = callback;
  }

  // Controller registra callback para rodar recomendação.
  registerRunRecommendationCallback(callback) {
    this.#onRunRecommendation = callback;
  }

  // Centraliza listeners dos controles da seção.
  attachEventListeners() {
    this.#trainModelBtn.addEventListener('click', () => {
      this.#onTrainModel();
    });
    this.#runRecommendationBtn.addEventListener('click', () => {
      this.#onRunRecommendation();
    });

    this.#purchasesDiv.addEventListener('click', () => {
      const purchasesList = this.#allUsersPurchasesList;

      // Lê estado atual (visível/oculto) para alternar painel.
      const isHidden =
        window.getComputedStyle(purchasesList).display === 'none';

      if (isHidden) {
        purchasesList.style.display = 'block';
        this.#purchasesArrow.classList.remove('bi-chevron-down');
        this.#purchasesArrow.classList.add('bi-chevron-up');
      } else {
        purchasesList.style.display = 'none';
        this.#purchasesArrow.classList.remove('bi-chevron-up');
        this.#purchasesArrow.classList.add('bi-chevron-down');
      }
    });
  }

  // Habilita botão de recomendação quando há modelo treinado.
  enableRecommendButton() {
    this.#runRecommendationBtn.disabled = false;
  }

  // Atualiza feedback visual do botão durante treino.
  updateTrainingProgress(progress) {
    this.#trainModelBtn.disabled = true;
    this.#trainModelBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Training...';

    // Quando chega em 100%, restaura estado normal.
    if (progress.progress === 100) {
      this.#trainModelBtn.disabled = false;
      this.#trainModelBtn.innerHTML = 'Train Recommendation Model';
    }
  }

  // Monta um resumo visual de compras para cada usuário.
  renderAllUsersPurchases(users) {
    const html = users
      .map((user) => {
        const purchasesHtml = user.purchases
          .map((purchase) => {
            return `<span class="badge bg-light text-dark me-1 mb-1">${purchase.name}</span>`;
          })
          .join('');

        return `
                <div class="user-purchase-summary">
                    <h6>${user.name} (Age: ${user.age})</h6>
                    <div class="purchases-badges">
                        ${purchasesHtml || '<span class="text-muted">No purchases</span>'}
                    </div>
                </div>
            `;
      })
      .join('');

    this.#allUsersPurchasesList.innerHTML = html;
  }
}
