export const SpecterGrammar = `
grammar Specter

entry Expression:
    LogicalExpression;

LogicalExpression:
    AndExpression ({LogicalExpression.left=current} 'OR' right=AndExpression)*;

AndExpression:
    AtomicExpression ({AndExpression.left=current} 'AND' right=AtomicExpression)*;

AtomicExpression:
    ParenthesizedExpression | FunctionCall;

ParenthesizedExpression:
    '(' expression=Expression ')';

FunctionCall:
    name=ID '(' arguments=FunctionArguments? ')';

FunctionArguments:
    values+=Expression (',' values+=Expression)*;

Value:
    Identifier | Literal | ParenthesizedExpression;

Literal:
    NumberLiteral | StringLiteral | BooleanLiteral;

// Type System
Type:
    'number' | 'string' | 'boolean' | 'currency' | 'duration' | 'array' | 'object';

TypeAnnotation:
    ':' type=Type;

// Variable Declarations with Types
VariableDeclaration:
    'var' name=ID type=TypeAnnotation? '=' value=Expression;

// Type Constraints
TypeConstraint:
    'where' condition=Expression;

// Advanced Type Rules
TypeRule:
    'rule' name=ID '(' parameters=ParameterList ')' ':' returnType=Type
    '{' body=Expression '}';

ParameterList:
    parameters+=Parameter (',' parameters+=Parameter)*;

Parameter:
    name=ID ':' type=Type;

// Data Type Specific Rules
CurrencyRule:
    'currency' name=ID ':' value=NumberLiteral ',' type=StringLiteral;

DurationRule:
    'duration' name=ID ':' value=NumberLiteral ',' unit=DurationUnit;

DurationUnit:
    'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

// Literals
NumberLiteral:
    value=NUMBER;

StringLiteral:
    value=STRING;

BooleanLiteral:
    value=('true' | 'false');

Identifier:
    name=ID;

terminal NUMBER returns number:
    /-?\\d+(\\.\\d+)?/;

terminal STRING:
    /"[^"]*"/;

terminal ID:
    /[a-zA-Z_$][a-zA-Z0-9_$]*(\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*/;

hidden terminal WS:
    /[\\s\\n\\r]+/;

hidden terminal ML_COMMENT:
    /\\/\\*[\\s\\S]*?\\*\\//;

hidden terminal SL_COMMENT:
    /\\/\\/[^\\n\\r]*/;
`;