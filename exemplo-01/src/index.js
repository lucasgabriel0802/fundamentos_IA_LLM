import { UserController } from './controller/UserController.js';
import { ProductController } from './controller/ProductController.js';
import { ModelController } from './controller/ModelTrainingController.js';
import { TFVisorController } from './controller/TFVisorController.js';
import { TFVisorView } from './view/TFVisorView.js';
import { UserService } from './service/UserService.js';
import { ProductService } from './service/ProductService.js';
import { UserView } from './view/UserView.js';
import { ProductView } from './view/ProductView.js';
import { ModelView } from './view/ModelTrainingView.js';
import Events from './events/events.js';
import { WorkerController } from './controller/WorkerController.js';

/**
 * Ponto de entrada da aplicação.
 *
 * A ideia deste arquivo é somente "orquestrar" os objetos principais:
 * - Services: acesso e manipulação de dados.
 * - Views: interação com o DOM (tela).
 * - Controllers: regras de fluxo entre View + Service.
 * - Worker: treinamento de modelo em thread separada.
 *
 * Repare que os controllers recebem dependências já prontas.
 * Esse padrão facilita testes e leitura (injeção de dependências).
 */

// Create shared services
const userService = new UserService();
const productService = new ProductService();

// Create views
const userView = new UserView();
const productView = new ProductView();
const modelView = new ModelView();
const tfVisorView = new TFVisorView();
const mlWorker = new Worker('/src/workers/modelTrainingWorker.js', {
  type: 'module',
});

// Conecta o worker ao sistema de eventos da aplicação.
// A classe WorkerController faz a tradução entre mensagens do worker
// e eventos internos consumidos pelos controllers/views.
const w = WorkerController.init({
  worker: mlWorker,
  events: Events,
});

// Carrega usuários base e dispara um treinamento inicial do modelo.
// Isso deixa a aplicação com recomendações prontas mais cedo.
const users = await userService.getDefaultUsers();
w.triggerTrain(users);

// Controller responsável pelas ações de treinamento e recomendação.
ModelController.init({
  modelView,
  userService,
  events: Events,
});

// Controller dedicado ao painel de visualização do TensorFlow (tfvis).
TFVisorController.init({
  tfVisorView,
  events: Events,
});

// Controller de catálogo/produtos e fluxo de compra.
ProductController.init({
  productView,
  userService,
  productService,
  events: Events,
});

// Controller de usuário (seleção, detalhes e histórico de compras).
const userController = UserController.init({
  userView,
  userService,
  productService,
  events: Events,
});

// Usuário extra criado para simular um perfil sem histórico.
// Ele é útil para testar o comportamento do recomendador com "cold start".
userController.renderUsers({
  id: 99,
  name: 'Josézin da Silva',
  age: 30,
  purchases: [],
});
