/**
 * Service de usuários.
 *
 * Responsabilidades:
 * - Carregar usuários iniciais do JSON.
 * - Persistir alterações no `sessionStorage`.
 * - Expor operações simples de leitura/escrita para controllers.
 */
export class UserService {
  // Chave única no sessionStorage para não colidir com outros projetos.
  #storageKey = 'ew-academy-users';

  // Sempre que a aplicação inicia, os usuários padrão são carregados
  // e gravados no sessionStorage para virar a "fonte de verdade" da sessão.
  async getDefaultUsers() {
    const response = await fetch('./data/users.json');
    const users = await response.json();
    this.#setStorage(users);

    return users;
  }

  // Retorna o snapshot atual de usuários da sessão.
  async getUsers() {
    const users = this.#getStorage();
    return users;
  }

  // Busca um usuário específico pelo id.
  async getUserById(userId) {
    const users = this.#getStorage();
    return users.find((user) => user.id === userId);
  }

  // Atualiza os dados de um usuário existente e persiste em sessão.
  async updateUser(user) {
    const users = this.#getStorage();
    const userIndex = users.findIndex((u) => u.id === user.id);

    users[userIndex] = { ...users[userIndex], ...user };
    this.#setStorage(users);

    return users[userIndex];
  }

  // Adiciona um usuário no início da lista (ordem mais recente primeiro).
  async addUser(user) {
    const users = this.#getStorage();
    this.#setStorage([user, ...users]);
  }

  // Helper privado para leitura segura do sessionStorage.
  #getStorage() {
    const data = sessionStorage.getItem(this.#storageKey);
    return data ? JSON.parse(data) : [];
  }

  // Helper privado para serializar e persistir em sessão.
  #setStorage(data) {
    sessionStorage.setItem(this.#storageKey, JSON.stringify(data));
  }
}
