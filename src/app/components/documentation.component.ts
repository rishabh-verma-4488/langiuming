import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GrammarRule {
  name: string;
  description: string;
  syntax: string;
  examples: string[];
}

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="documentation-container">
      <div class="documentation-header">
        <h3>Language Documentation</h3>
      </div>
      
      <div class="documentation-content">
        <div class="overview-section">
          <h4>Overview</h4>
          <p>The Specter language is a powerful domain-specific language for expression evaluation with advanced type checking, validation, and IDE features. It supports complex logical expressions, type-safe function calls, and data type-specific operations.</p>
        </div>

        <div class="rules-section">
          <h4>Grammar Rules</h4>
          <div class="rule-card" *ngFor="let rule of grammarRules">
            <div class="rule-header">
              <h5>{{ rule.name }}</h5>
            </div>
            <div class="rule-body">
              <p class="rule-description">{{ rule.description }}</p>
              <div class="syntax-block">
                <strong>Syntax:</strong>
                <code>{{ rule.syntax }}</code>
              </div>
              <div class="examples-block">
                <strong>Examples:</strong>
                <div class="example" *ngFor="let example of rule.examples">
                  <code>{{ example }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tokens-section">
          <h4>Tokens</h4>
          <div class="token-list">
            <div class="token-item" *ngFor="let token of tokens">
              <strong>{{ token.name }}:</strong>
              <code>{{ token.pattern }}</code>
              <span class="token-description">{{ token.description }}</span>
            </div>
          </div>
        </div>

        <div class="features-section">
          <h4>Editor Features</h4>
          <ul class="feature-list">
            <li><strong>Syntax Highlighting:</strong> Keywords, strings, numbers, and comments are highlighted</li>
            <li><strong>Error Detection:</strong> Invalid syntax is marked with red underlines</li>
            <li><strong>Warnings:</strong> Style suggestions are shown with yellow underlines</li>
            <li><strong>Auto-closing:</strong> Quotes and brackets are automatically closed</li>
            <li><strong>Comments:</strong> Support for both line (//) and block (/* */) comments</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .documentation-container {
      height: 100%;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      overflow: hidden;
    }

    .documentation-header {
      padding: 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e1e5e9;
    }

    .documentation-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
    }

    .documentation-content {
      padding: 20px;
      height: calc(100% - 60px);
      overflow-y: auto;
    }

    .overview-section,
    .rules-section,
    .tokens-section,
    .features-section {
      margin-bottom: 24px;
    }

    h4 {
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      margin: 0 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #e1e5e9;
    }

    .overview-section p {
      color: #4a5568;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }

    .rule-card {
      background: #f8f9fa;
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    .rule-header {
      padding: 10px 12px;
      background: white;
      border-bottom: 1px solid #e1e5e9;
    }

    .rule-header h5 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: #2d3748;
    }

    .rule-body {
      padding: 12px;
    }

    .rule-description {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #4a5568;
      line-height: 1.4;
    }

    .syntax-block,
    .examples-block {
      margin-top: 8px;
    }

    .syntax-block strong,
    .examples-block strong {
      font-size: 12px;
      color: #2d3748;
      display: block;
      margin-bottom: 4px;
    }

    code {
      background: #f1f3f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 11px;
      color: #1a202c;
      display: block;
      margin-bottom: 4px;
    }

    .example {
      margin-bottom: 4px;
    }

    .token-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .token-item {
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
    }

    .token-item strong {
      color: #2d3748;
      margin-right: 8px;
    }

    .token-item code {
      display: inline;
      margin: 0 8px 0 0;
    }

    .token-description {
      color: #6b7280;
    }

    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .feature-list li {
      padding: 6px 0;
      font-size: 12px;
      color: #4a5568;
      line-height: 1.4;
    }

    .feature-list li strong {
      color: #2d3748;
    }
  `]
})
export class DocumentationComponent {
  @Input() currentContent = '';

  grammarRules: GrammarRule[] = [
    {
      name: 'LogicalExpression',
      description: 'A logical expression that combines atomic expressions using AND/OR operators.',
      syntax: '<expression> AND <expression> | <expression> OR <expression>',
      examples: [
        'GreaterThan(100, 50) AND LessThan(200, 300)',
        'Equals(name, "test") OR Not(Empty(value))',
        '(GreaterThan(x, 0) AND LessThan(x, 100)) OR Equals(x, -1)'
      ]
    },
    {
      name: 'FunctionCall',
      description: 'A function call that performs operations on values. Supports binary, unary, and factory functions.',
      syntax: '<FunctionName>(<arguments>)',
      examples: [
        'GreaterThan(100, 50)',
        'Not(Empty("test"))',
        'Currency(1000, "USD")',
        'Duration(30, DAYS)'
      ]
    },
    {
      name: 'VariableDeclaration',
      description: 'A variable declaration with optional type annotation and value assignment.',
      syntax: 'var <name>[: <type>] = <value>',
      examples: [
        'var budget: currency = Currency(50000, "USD")',
        'var duration: duration = Duration(6, MONTHS)',
        'var name = "John Doe"',
        'var active: boolean = true'
      ]
    },
    {
      name: 'TypeRule',
      description: 'A custom type rule that defines validation logic with parameters and return type.',
      syntax: 'rule <name>(<parameters>): <returnType> { <body> }',
      examples: [
        'rule validateBudget(amount: number): boolean { GreaterThan(amount, 0) AND LessThan(amount, 1000000) }',
        'rule isPositive(value: number): boolean { GreaterThan(value, 0) }'
      ]
    }
  ];

  tokens = [
    { name: 'ID', pattern: '[a-zA-Z_$][a-zA-Z0-9_$]*(\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*', description: 'Identifier with optional dot notation' },
    { name: 'STRING', pattern: '"[^"]*"', description: 'String literal enclosed in double quotes' },
    { name: 'NUMBER', pattern: '-?\\d+(\\.\\d+)?', description: 'Integer or decimal number (supports negative)' },
    { name: 'BOOLEAN', pattern: 'true|false', description: 'Boolean literal' },
    { name: 'KEYWORDS', pattern: 'var|rule|where|AND|OR', description: 'Language keywords' },
    { name: 'FUNCTIONS', pattern: 'GreaterThan|LessThan|Equals|Contains|Not|Empty|Currency|Duration', description: 'Built-in functions' },
    { name: 'TYPES', pattern: 'number|string|boolean|currency|duration|array|object', description: 'Type annotations' },
    { name: 'UNITS', pattern: 'DAYS|WEEKS|MONTHS|YEARS', description: 'Duration units' }
  ];
}