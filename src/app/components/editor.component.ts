import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import * as monaco from 'monaco-editor';
import { CommonModule } from '@angular/common';
import { HelloWorldValidator } from '../language/hello-world-validator';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container">
      <div class="editor-header">
        <h3>Language Editor</h3>
        <div class="editor-actions">
          <button class="btn btn-primary" (click)="formatCode()">Format</button>
          <button class="btn btn-secondary" (click)="clearEditor()">Clear</button>
        </div>
      </div>
      <div #editorContainer class="editor-content"></div>
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
  `]
})
export class EditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  @Output() contentChange = new EventEmitter<string>();

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private validator = new HelloWorldValidator();
  currentLine = 1;
  currentColumn = 1;
  errorCount = 0;
  warningCount = 0;

  ngOnInit() {
    this.initializeEditor();
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  private async initializeEditor() {
    // Configure Monaco Editor environment
    (window as any).MonacoEnvironment = {
      getWorkerUrl: function (moduleId: string, label: string) {
        if (label === 'json') {
          return './vs/language/json/json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return './vs/language/css/css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return './vs/language/html/html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
          return './vs/language/typescript/ts.worker.js';
        }
        return './vs/editor/editor.worker.js';
      }
    };

    // Register the Specter language
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

    // Create the editor
    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      value: `// Specter Language Example - Expression-Only Grammar
// Valid expressions (no errors):
GreaterThan(100, 50) AND LessThan(200, 300)
Equals(Not(Empty("test")), true) OR Contains([1, 2, 3], 2)
Currency(50000, "USD")
Duration(6, MONTHS)

// Try these invalid examples to see validation errors:
// hello world
// random text
// 123abc
// var name = value
// name = value
// function without parentheses
// (unmatched parentheses
// {unmatched braces`,
      language: 'specter',
      theme: 'vs-light',
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      minimap: { enabled: false }
    });

    // Listen for content changes
    this.editor.onDidChangeModelContent(() => {
      const content = this.editor?.getValue() || '';
      this.contentChange.emit(content);
      this.validateContent(content);
    });

    // Listen for cursor position changes
    this.editor.onDidChangeCursorPosition((e: monaco.editor.ICursorPositionChangedEvent) => {
      this.currentLine = e.position.lineNumber;
      this.currentColumn = e.position.column;
    });

    // Initial validation
    this.validateContent(this.editor.getValue());
  }

  private validateContent(content: string) {
    const lines = content.split('\n');
    const markers: monaco.editor.IMarkerData[] = [];
    let errorCount = 0;
    let warningCount = 0;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
        return;
      }

      // Validate that the line matches Specter grammar
      const validation = this.validateSpecterLine(trimmedLine);
      
      if (!validation.isValid) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: validation.message,
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1
        });
        errorCount++;
      }

      // Add any additional warnings
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: warning,
            startLineNumber: index + 1,
            startColumn: 1,
            endLineNumber: index + 1,
            endColumn: line.length + 1
          });
          warningCount++;
        });
      }
    });

    if (this.editor) {
      monaco.editor.setModelMarkers(this.editor.getModel()!, 'specter', markers);
    }

    this.errorCount = errorCount;
    this.warningCount = warningCount;
  }

  private validateSpecterLine(line: string): { isValid: boolean; message: string; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check for unmatched parentheses
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return {
        isValid: false,
        message: 'Unmatched parentheses',
        warnings: []
      };
    }

    // Check for unmatched braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return {
        isValid: false,
        message: 'Unmatched braces',
        warnings: []
      };
    }

    // Validate against Specter grammar patterns
    const patterns = [
      // Function calls: FunctionName(arg1, arg2)
      /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)$/,
      
      // Type rules: rule name(params): type { body }
      /^rule\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*:\s*(number|string|boolean|currency|duration|array|object)\s*\{[^}]*\}$/,
      
      // Logical expressions with AND/OR
      /^.+(\s+(AND|OR)\s+.+)+$/,
      
      // Parenthesized expressions
      /^\(.+\)$/,
      
      // Simple values: numbers, strings, booleans, identifiers
      /^(\d+(\.\d+)?|"[^"]*"|true|false|[a-zA-Z_$][a-zA-Z0-9_$]*(\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)$/,
      
      // Duration units
      /^(DAYS|WEEKS|MONTHS|YEARS)$/,
      
      // Type annotations
      /^(number|string|boolean|currency|duration|array|object)$/
    ];

    // Check if line matches any valid pattern
    const matchesPattern = patterns.some(pattern => pattern.test(line));
    
    if (!matchesPattern) {
      // Provide specific error messages based on what the line looks like
      if (line.startsWith('var')) {
        return {
          isValid: false,
          message: 'Variable declarations are not supported in Specter language',
          warnings: []
        };
      }
      
      if (line.includes('=') && !line.includes('(')) {
        return {
          isValid: false,
          message: 'Assignment operations are not supported. Use function calls instead',
          warnings: []
        };
      }
      
      if (line.includes('(') && !line.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/)) {
        return {
          isValid: false,
          message: 'Function call must start with valid identifier',
          warnings: []
        };
      }
      
      if (line.includes('{') && !line.startsWith('rule')) {
        return {
          isValid: false,
          message: 'Block must be part of rule definition',
          warnings: []
        };
      }
      
      if (line.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) && !line.match(/^(DAYS|WEEKS|MONTHS|YEARS|number|string|boolean|currency|duration|array|object)$/)) {
        return {
          isValid: false,
          message: 'Identifier must be part of valid expression or function call',
          warnings: []
        };
      }
      
      return {
        isValid: false,
        message: 'Invalid Specter syntax. Must be a function call, variable declaration, rule definition, or valid expression',
        warnings: []
      };
    }

    // Additional validation for function calls
    if (line.includes('(') && line.includes(')')) {
      const functionValidation = this.validateFunctionCallInLine(line);
      if (!functionValidation.isValid) {
        return functionValidation;
      }
      warnings.push(...functionValidation.warnings);
    }

    return {
      isValid: true,
      message: '',
      warnings
    };
  }

  private validateFunctionCallInLine(line: string): { isValid: boolean; message: string; warnings: string[] } {
    const warnings: string[] = [];
    
    // Find all function calls in the line
    const functionCallRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/g;
    let match: RegExpExecArray | null;
    
    while ((match = functionCallRegex.exec(line)) !== null) {
      const functionCall = match[0];
      const functionName = match[1];
      
      // Parse the function call
      const parsed = this.validator['functionValidator'].parseFunctionCall(functionCall);
      if (parsed) {
        // Convert string arguments to their actual types for validation
        const typedArguments = parsed.args.map((arg: string) => this.parseArgumentValue(arg.trim()));
        
        // Validate the function call
        const validation = this.validator['functionValidator'].validateFunctionCall(parsed.name, typedArguments);
        
        if (!validation.isValid) {
          return {
            isValid: false,
            message: validation.errors[0] || 'Invalid function call',
            warnings: []
          };
        }
        
        warnings.push(...validation.warnings);
      }
    }
    
    return {
      isValid: true,
      message: '',
      warnings
    };
  }

  private parseArgumentValue(arg: string): any {
    // Remove quotes from strings
    if (arg.startsWith('"') && arg.endsWith('"')) {
      return arg.slice(1, -1);
    }
    
    // Parse numbers
    if (!isNaN(Number(arg))) {
      return Number(arg);
    }
    
    // Parse booleans
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    
    // Parse arrays (simple case)
    if (arg.startsWith('[') && arg.endsWith(']')) {
      const content = arg.slice(1, -1).trim();
      if (content === '') return [];
      return content.split(',').map(item => this.parseArgumentValue(item.trim()));
    }
    
    // Return as string for identifiers and other cases
    return arg;
  }

  private validateFunctionCalls(line: string, lineNumber: number, markers: monaco.editor.IMarkerData[], errorCount: number, warningCount: number) {
    // Use HelloWorldValidator to validate function calls
    const validationResults: { message: string; severity: 'error' | 'warning' }[] = [];
    
    // Create a mock ValidationAcceptor to collect validation results
    const mockAcceptor = (severity: any, message: string, info: any) => {
      if (severity === 'error' || severity === 'warning') {
        validationResults.push({ message, severity });
      }
    };
    
    // Validate the line using HelloWorldValidator
    this.validator.validateFunctionCalls(line, mockAcceptor);
    
    // Convert validation results to Monaco markers
    validationResults.forEach(result => {
      markers.push({
        severity: result.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        message: result.message,
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: line.length + 1
      });
      
      if (result.severity === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }
    });
  }



  formatCode() {
    if (this.editor) {
      this.editor.getAction('editor.action.formatDocument')?.run();
    }
  }

  clearEditor() {
    if (this.editor) {
      this.editor.setValue('');
    }
  }
}