import { expect, type Locator, type Page } from '@playwright/test';

/** Elementos comunes a todas las páginas de ParaBank (cabecera, panel lateral, contenido). */
export abstract class BasePage {
  protected abstract readonly path: string;

  readonly title: Locator;
  readonly errorMessage: Locator;

  constructor(readonly page: Page) {
    this.title = page.locator('#rightPanel h1.title').first();
    this.errorMessage = page.locator('#rightPanel p.error');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
  }

  async expectTitle(text: string | RegExp): Promise<void> {
    await expect(this.title).toHaveText(text);
  }
}
