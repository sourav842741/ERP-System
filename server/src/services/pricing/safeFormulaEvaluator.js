import Decimal from 'decimal.js';

/**
 * Safe Mathematical Formula Evaluator without eval()
 * Uses tokenization and recursive operator precedence parsing backed by Decimal.js
 */

const ALLOWED_VARIABLES = new Set([
  'sellingPrice',
  'productCost',
  'effectivePrice',
  'mrp',
  'weight',
  'shippingFee',
  'commission',
  'gst',
  'fixedFee'
]);

export const validateFormulaString = (formula) => {
  if (!formula || typeof formula !== 'string') return { valid: false, error: 'Formula must be a non-empty string' };

  // Sanitize and check only allowed characters: letters, numbers, operators, spaces, parentheses, dots
  const sanitized = formula.trim();
  const invalidCharsRegex = /[^a-zA-Z0-9+\-*/().\s%]/;
  if (invalidCharsRegex.test(sanitized)) {
    return { valid: false, error: 'Formula contains prohibited characters' };
  }

  // Tokenize identifiers
  const identifierRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  const matches = sanitized.match(identifierRegex) || [];
  for (const identifier of matches) {
    if (!ALLOWED_VARIABLES.has(identifier)) {
      return { valid: false, error: `Unauthorized variable in formula: "${identifier}". Allowed: ${Array.from(ALLOWED_VARIABLES).join(', ')}` };
    }
  }

  return { valid: true };
};

export const evaluateSafeFormula = (formula, context = {}) => {
  const validation = validateFormulaString(formula);
  if (!validation.valid) {
    throw new Error(`Formula Validation Error: ${validation.error}`);
  }

  // Substitute variables with numeric values safely
  const tokens = [];
  let i = 0;
  const str = formula.trim();

  while (i < str.length) {
    const ch = str[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < str.length && /[0-9.]/.test(str[i])) {
        numStr += str[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: new Decimal(numStr) });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
        ident += str[i];
        i++;
      }
      const val = context[ident] !== undefined ? new Decimal(context[ident]) : new Decimal(0);
      tokens.push({ type: 'NUMBER', value: val });
      continue;
    }

    if (['+', '-', '*', '/', '(', ')'].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    i++;
  }

  // Shunting-yard algorithm to Postfix (RPN)
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const outputQueue = [];
  const opStack = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];

    if (token.type === 'NUMBER') {
      outputQueue.push(token);
    } else if (token.value === '(') {
      opStack.push(token);
    } else if (token.value === ')') {
      while (opStack.length && opStack[opStack.length - 1].value !== '(') {
        outputQueue.push(opStack.pop());
      }
      opStack.pop(); // Remove '('
    } else {
      // Operator
      const isUnaryMinus = token.value === '-' && (idx === 0 || tokens[idx - 1].value === '(' || tokens[idx - 1].type === 'OP');
      if (isUnaryMinus) {
        outputQueue.push({ type: 'NUMBER', value: new Decimal(0) });
      }

      while (
        opStack.length &&
        opStack[opStack.length - 1].value !== '(' &&
        precedence[opStack[opStack.length - 1].value] >= precedence[token.value]
      ) {
        outputQueue.push(opStack.pop());
      }
      opStack.push(token);
    }
  }

  while (opStack.length) {
    outputQueue.push(opStack.pop());
  }

  // Evaluate RPN with Decimal.js
  const evalStack = [];
  for (const token of outputQueue) {
    if (token.type === 'NUMBER') {
      evalStack.push(token.value);
    } else {
      const b = evalStack.pop();
      const a = evalStack.pop() || new Decimal(0);

      switch (token.value) {
        case '+':
          evalStack.push(a.plus(b));
          break;
        case '-':
          evalStack.push(a.minus(b));
          break;
        case '*':
          evalStack.push(a.times(b));
          break;
        case '/':
          evalStack.push(b.isZero() ? new Decimal(0) : a.dividedBy(b));
          break;
        default:
          break;
      }
    }
  }

  return evalStack.length ? evalStack[0] : new Decimal(0);
};

export default { evaluateSafeFormula, validateFormulaString };
