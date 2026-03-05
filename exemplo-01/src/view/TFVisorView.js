import { View } from './View.js';

/**
 * View de visualização do treinamento com tfjs-vis (tfvis).
 *
 * Guarda pontos históricos de loss/acurácia e redesenha gráficos a cada época.
 */
export class TFVisorView extends View {
  // Estado interno do painel (dados e séries).
  #weights = null;
  #catalog = [];
  #users = [];
  #logs = [];
  #lossPoints = [];
  #accPoints = [];
  constructor() {
    super();

    // Abre a janela/aba do visor de métricas.
    tfvis.visor().open();
  }

  // Salva dados recebidos para eventual uso em visualizações adicionais.
  renderData(data) {
    this.#weights = data.weights;
    this.#catalog = data.catalog;
    this.#users = data.users;
  }

  // Limpa estado antes de um novo ciclo de treinamento.
  resetDashboard() {
    this.#weights = null;
    this.#catalog = [];
    this.#users = [];
    this.#logs = [];
    this.#lossPoints = [];
    this.#accPoints = [];
  }

  // Recebe log por época e atualiza os dois gráficos (acurácia e erro).
  handleTrainingLog(log) {
    const { epoch, loss, accuracy } = log;
    this.#lossPoints.push({ x: epoch, y: loss });
    this.#accPoints.push({ x: epoch, y: accuracy });
    this.#logs.push(log);

    // Gráfico 1: evolução da acurácia.
    tfvis.render.linechart(
      {
        name: 'Precisão do Modelo',
        tab: 'Treinamento',
        style: { display: 'inline-block', width: '49%' },
      },
      { values: this.#accPoints, series: ['precisão'] },
      {
        xLabel: 'Época (Ciclos de Treinamento)',
        yLabel: 'Precisão (%)',
        height: 300,
      },
    );

    // Gráfico 2: evolução do erro (loss).
    tfvis.render.linechart(
      {
        name: 'Erro de Treinamento',
        tab: 'Treinamento',
        style: { display: 'inline-block', width: '49%' },
      },
      { values: this.#lossPoints, series: ['erros'] },
      {
        xLabel: 'Época (Ciclos de Treinamento)',
        yLabel: 'Valor do Erro',
        height: 300,
      },
    );
  }
}
