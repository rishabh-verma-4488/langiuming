import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { EditorComponent } from './app/components/editor.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule, NgxMonacoEditorConfig } from 'ngx-monaco-editor-v2';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorModule, EditorComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <h1>Langium Language Studio</h1>
          <p>Build and test your domain-specific language with Monaco Editor integration</p>
        </div>
      </header>
      
      <main class="app-main">
        <app-editor (contentChange)="onContentChange($event)"></app-editor>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .app-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #f5f7fa;
    }

    .app-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .header-content p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
      font-weight: 300;
    }

    .app-main {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 400px 400px;
      gap: 20px;
      padding: 20px;
      max-width: 1600px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .editor-panel,
    .documentation-panel,
    .evaluator-panel {
      height: 100%;
      min-height: 600px;
    }

    @media (max-width: 1400px) {
      .app-main {
        grid-template-columns: 1fr 400px;
        grid-template-rows: 1fr auto;
      }
      
      .evaluator-panel {
        grid-column: 1 / -1;
        max-height: 400px;
        min-height: 300px;
      }
    }

    @media (max-width: 1024px) {
      .app-main {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr auto auto;
      }
      
      .documentation-panel,
      .evaluator-panel {
        max-height: 400px;
        min-height: 300px;
      }
    }

    @media (max-width: 768px) {
      .header-content {
        padding: 0 16px;
      }
      
      .header-content h1 {
        font-size: 24px;
      }
      
      .header-content p {
        font-size: 14px;
      }
      
      .app-main {
        gap: 16px;
        padding: 16px;
      }
    }
  `]
})
export class App {
  currentContent = '';

  onContentChange(content: string) {
    this.currentContent = content;
  }
}

// Configure Monaco Editor
const monacoConfig: NgxMonacoEditorConfig = {
  baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs',
  defaultOptions: { 
    scrollBeyondLastLine: false,
    readOnly: false,
    automaticLayout: true
  },
  onMonacoLoad: () => {
    console.log('Monaco Editor loaded');
    console.log('Monaco object:', (window as any).monaco);
    // Monaco will be available as (window as any).monaco
  }
};

bootstrapApplication(App, {
  providers: [
    MonacoEditorModule.forRoot(monacoConfig).providers || []
  ]
});