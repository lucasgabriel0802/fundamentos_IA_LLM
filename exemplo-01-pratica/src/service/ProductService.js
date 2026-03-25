/**
 * Service de produtos.
 *
 * Neste exemplo o catálogo é lido de arquivo JSON estático.
 * Em projetos reais, esse service costuma conversar com uma API HTTP.
 */
export class ProductService {
  // Retorna catálogo completo.
  async getProducts() {
    const response = await fetch('./data/products.json');
    return await response.json();
  }

  // Busca um produto por id.
  async getProductById(id) {
    const products = await this.getProducts();
    return products.find((product) => product.id === id);
  }

  // Filtra catálogo para uma lista de ids.
  async getProductsByIds(ids) {
    const products = await this.getProducts();
    return products.filter((product) => ids.includes(product.id));
  }
}
