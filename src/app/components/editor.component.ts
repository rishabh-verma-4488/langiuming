import { Component, OnInit, OnDestroy, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule, NgxMonacoEditorConfig, NgxEditorModel } from 'ngx-monaco-editor-v2';
import { MonacoLSPClient } from '../language/monaco-lsp-client';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorModule],
  template: `
    <div class="editor-container">
      <div class="editor-header">
        <h3>Language Editor</h3>
        <div class="editor-actions">
          <button class="btn btn-primary" (click)="formatCode()">Format</button>
          <button class="btn btn-secondary" (click)="clearEditor()">Clear</button>
        </div>
      </div>
      <div class="editor-content">
        <ngx-monaco-editor 
          [options]="editorOptions" 
          [model]="editorModel"
          (onInit)="onEditorInit($event)"
          class="monaco-editor">
        </ngx-monaco-editor>
      </div>
      <div class="editor-footer">
        <div class="status-bar">
          <span class="status-item">Line {{ currentLine }}, Column {{ currentColumn }}</span>
          <span class="status-item" [class.error]="errorCount > 0">
            {{ errorCount }} errors, {{ warningCount }} warnings
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e1e5e9;
    }

    .editor-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
    }

    .editor-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .editor-content {
      flex: 1;
      min-height: 400px;
    }

    .editor-footer {
      background: #f8f9fa;
      border-top: 1px solid #e1e5e9;
    }

    .status-bar {
      display: flex;
      justify-content: space-between;
      padding: 8px 16px;
      font-size: 12px;
      color: #6b7280;
    }

    .status-item.error {
      color: #dc2626;
      font-weight: 500;
    }

    .monaco-editor {
      height: 100%;
      min-height: 400px;
    }
  `]
})
export class EditorComponent implements OnInit, OnDestroy, OnChanges {
  @Output() contentChange = new EventEmitter<string>();

  private editor: any = null;
  private lspClient = new MonacoLSPClient();
  private updateTimeout: any = null;
  currentLine = 1;
  currentColumn = 1;
  errorCount = 0;
  warningCount = 0;

  // Monaco editor options
  editorOptions = {
    theme: 'vs-light',
    language: 'specter',
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    minimap: { enabled: false },
    readOnly: false,
    selectOnLineNumbers: true,
    glyphMargin: true,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 0,
    renderLineHighlight: 'line',
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto'
    }
  };

  // Editor content
  private _code = `// Specter Language Example - Expression-Only Grammar
// Valid expressions (no errors):
GreaterThan(100, 50) AND LessThan(200, 300)
Equals(Not(Empty("test")), true) OR Contains([1, 2, 3], 2)
Currency(50000, "USD")
Duration(6, MONTHS)
add(10, 20)

// Invalid examples to see validation errors:
hello world
var name = value
name = value
(unmatched parentheses
{unmatched braces`;

  get code(): string {
    return this._code;
  }

  set code(value: string) {
    this._code = value;
    this.updateEditorModel();
    this.contentChange.emit(value);
    // LSP will handle validation automatically
  }

  // Editor model for Monaco
  editorModel: NgxEditorModel = {
    value: this._code,
    language: 'specter'
  };

  private updateEditorModel() {
    this.editorModel = {
      value: this._code,
      language: 'specter'
    };
  }

  async ngOnInit() {
    // Configure Monaco Editor environment before editor initialization
    (window as any).MonacoEnvironment = {
      getWorkerUrl: function (moduleId: string, label: string) {
        if (label === 'json') {
          return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/language/json/json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/language/css/css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/language/html/html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
          return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/language/typescript/ts.worker.js';
        }
        return 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/editor/editor.worker.js';
      }
    };

    // Initialize LSP client
    try {
      await this.lspClient.initialize();
      console.log('LSP client initialized successfully');
      
      // Open the initial document
      await this.lspClient.openDocument('file:///specter-document', this._code);
    } catch (error) {
      console.error('Failed to initialize LSP client:', error);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Handle any changes if needed
  }

  async ngOnDestroy() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.editor) {
      this.editor.dispose();
    }
    await this.lspClient.dispose();
  }

  onEditorInit(editor: any) {
    console.log('Editor initialized:', editor);
    this.editor = editor;
    
    // Register the Specter language
    const monaco = (window as any).monaco;
    if (!monaco) {
      console.error('Monaco not available on window object');
      return;
    }

    // Set Monaco editor instance in LSP client
    this.lspClient.setMonacoEditor(monaco, editor);
    
    // Check if editor is editable
    console.log('Editor readOnly:', editor.getOption(monaco.editor.EditorOption.readOnly));
    console.log('Editor is editable:', !editor.getOption(monaco.editor.EditorOption.readOnly));
    
    console.log('Monaco available:', monaco);
    monaco.languages.register({ id: 'specter' });

    // Set language configuration
    monaco.languages.setLanguageConfiguration('specter', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' }
      ]
    });

    // Set syntax highlighting
    monaco.languages.setMonarchTokensProvider('specter', {
      keywords: [
        'var', 'rule', 'where', 'true', 'false',
        'AND', 'OR'
      ],
      operators: ['=', ':', ',', '(', ')', '{', '}'],
      types: ['number', 'string', 'boolean', 'currency', 'duration', 'array', 'object'],
      tokenizer: {
        root: [
          // Keywords
          [/\b(var|rule|where)\b/, 'keyword'],
          [/\b(AND|OR)\b/, 'keyword.operator'],
          [/\b(number|string|boolean|currency|duration|array|object)\b/, 'type'],
          [/\b(true|false)\b/, 'keyword.boolean'],
          
          // Function calls - dynamic highlighting
          [/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/, 'function'],
          
          // Duration units
          [/\b(DAYS|WEEKS|MONTHS|YEARS)\b/, 'keyword.constant'],
          
          // Identifiers with dot notation
          [/[a-zA-Z_$][a-zA-Z0-9_$]*(\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*/, 'identifier'],
          
          // Strings
          [/"[^"]*"/, 'string'],
          
          // Numbers (including negative)
          [/-?\d+(\.\d+)?/, 'number'],
          
          // Operators
          [/[=:,(){}]/, 'operator'],
          
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment']
        ]
      }
    });

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      const content = this.editor.getValue();
      console.log('Code changed:', content);
      this._code = content;
      this.contentChange.emit(content);
      
      // Debounce LSP updates to avoid too many requests while typing
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }
      
      this.updateTimeout = setTimeout(() => {
        // Notify LSP client of document changes
        if (this.lspClient.isInitialized()) {
          console.log('Content changed, updating LSP document...');
          this.lspClient.updateDocument('file:///specter-document', content, Date.now());
        } else {
          console.log('LSP client not initialized, skipping document update');
        }
      }, 500); // Wait 500ms after user stops typing
    });

    // Listen for cursor position changes
    this.editor.onDidChangeCursorPosition((e: any) => {
      this.currentLine = e.position.lineNumber;
      this.currentColumn = e.position.column;
    });
  }


  // LSP handles validation automatically - no manual validation needed



  formatCode() {
    if (this.editor) {
      this.editor.getAction('editor.action.formatDocument')?.run();
    }
  }

  clearEditor() {
    this.code = '';
    this.updateEditorModel();
  }
}