export interface Model {
    $type: 'Model';
    statements: Statement[];
}

export interface Statement {
    $type: string;
}

export interface GreetingStatement extends Statement {
    $type: 'GreetingStatement';
    target: string;
    message?: string;
}

export interface AssignmentStatement extends Statement {
    $type: 'AssignmentStatement';
    name: string;
    value: string | number | boolean;
}

export type HelloWorldAstType = Model | GreetingStatement | AssignmentStatement;