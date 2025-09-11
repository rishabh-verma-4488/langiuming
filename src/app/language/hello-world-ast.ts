import { AstNode } from 'langium';

export interface Model extends AstNode {
    statements: Statement[];
}

export interface Statement extends AstNode {}

export interface GreetingStatement extends Statement {
    target: string;
    message?: string;
}

export interface AssignmentStatement extends Statement {
    name: string;
    value: string | number | boolean;
}

export function isModel(node: AstNode): node is Model {
    return node.$type === 'Model';
}

export function isGreetingStatement(node: AstNode): node is GreetingStatement {
    return node.$type === 'GreetingStatement';
}

export function isAssignmentStatement(node: AstNode): node is AssignmentStatement {
    return node.$type === 'AssignmentStatement';
}