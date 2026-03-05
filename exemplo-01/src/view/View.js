/**
 * Classe base de View.
 *
 * Objetivo: concentrar utilidades comuns de renderização para reutilização
 * nas views concretas (UserView, ProductView, etc.).
 */
export class View {
  constructor() {
    // Garante contexto correto caso o método seja passado como callback.
    this.loadTemplate = this.loadTemplate.bind(this);
  }

  // Carrega um arquivo HTML (template) e devolve como string.
  async loadTemplate(templatePath) {
    const response = await fetch(templatePath);
    return await response.text();
  }

  // Substitui placeholders no formato {{chave}} pelos valores do objeto `data`.
  // Exemplo: {{name}} -> "Notebook".
  replaceTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }
}
