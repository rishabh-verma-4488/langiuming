        export const SpecterGrammar = `

        grammar Specter

        entry Model:
            expressions+=Expression*;

        Expression:
            LogicalExpression;

        LogicalExpression:
            PrimaryExpression ({LogicalExpression.left=current} operator=('AND' | 'OR') right=PrimaryExpression)*;

        PrimaryExpression:
            FunctionCall | Literal | ParenthesizedExpression;

        ParenthesizedExpression:
            '(' expression=Expression ')';

        FunctionCall:
            name=ID '(' arguments=FunctionArguments? ')';

        FunctionArguments:
            values+=Expression (',' values+=Expression)*;

        Literal:
            StringLiteral | NumberLiteral | ArrayLiteral | BooleanLiteral;

        StringLiteral:
            value=STRING;

        NumberLiteral:
            value=NUMBER;

        BooleanLiteral:
            value=('true' | 'false');

        ArrayLiteral:
            '[' values+=Expression (',' values+=Expression)* ']';

        terminal NUMBER returns number:
            /-?\\d+(\\.\\d+)?/;

        terminal STRING:
            /"[^"]*"/;

        terminal ID:
            /[a-zA-Z_$][a-zA-Z0-9_$]*/;

        hidden terminal WS:
            /[\\s\\n\\r]+/;

        hidden terminal ML_COMMENT:
            /\\/\\*[\\s\\S]*?\\*\\//;

        hidden terminal SL_COMMENT:
            /\\/\\/[^\\n\\r]*/;
        `;
