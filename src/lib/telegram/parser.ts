import type { Category, TransactionType } from '@/types/database';
import type { ParsedExpense } from '@/types/telegram';

export interface CategoryAliasMap {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  isFixedCost: boolean;
  type: TransactionType;
  aliases: string[];
}

/**
 * Normalizes text by lowercasing, removing accents, and trimming excess whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parses user text or transcribed voice messages in Portuguese into structured financial transaction data.
 * Examples:
 * - "45 uber" -> 45.00, Transporte, isFixed: false
 * - "R$ 12,50 cafezinho" -> 12.50, Alimentação, isFixed: false
 * - "150 internet fixo" -> 150.00, Moradia, isFixed: true
 * - "3000 salario" -> 3000.00, Renda, type: 'INCOME'
 * - "gastei 50 no mercado" -> 50.00, Alimentação (not matching 'gas' in Moradia)
 */
export function parseExpenseText(
  rawText: string,
  categories: Category[] = []
): ParsedExpense | null {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  // Guard against massive payload DoS
  const safeText = rawText.length > 500 ? rawText.slice(0, 500) : rawText;
  const normalized = normalizeText(safeText);

  // 1. Extract Amount
  // Prioritize amounts with currency prefix "R$" or preceded by "por" / "de" / "valor", or find all numeric tokens
  const allNumberMatches = Array.from(normalized.matchAll(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/gi));

  if (allNumberMatches.length === 0) {
    return null;
  }

  // If there are multiple numbers (e.g. "comprei 2 pizzas por 80"), choose the one with R$ or the largest / last
  let chosenMatch = allNumberMatches[0];
  if (allNumberMatches.length > 1) {
    const currencyPrefixed = allNumberMatches.find((m) => m[0].includes('r$'));
    if (currencyPrefixed) {
      chosenMatch = currencyPrefixed;
    } else {
      // Pick the last number or largest
      chosenMatch = allNumberMatches[allNumberMatches.length - 1];
    }
  }

  const rawAmountStr = chosenMatch[1].replace(',', '.');
  const amount = parseFloat(rawAmountStr);

  if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
    return null;
  }

  // 2. Remove the chosen amount portion from the string to analyze remaining keywords
  const remainingText = normalized
    .replace(chosenMatch[0], '')
    .replace(/r\$/g, '')
    .trim();

  // 3. Detect Modifiers (Fixed vs Variable)
  let isExplicitlyFixed: boolean | null = null;
  if (/\b(fixo|fixa|recorrente|mensal|assinatura)\b/i.test(remainingText)) {
    isExplicitlyFixed = true;
  } else if (/\b(avulso|variavel|variável|pontual|hoje)\b/i.test(remainingText)) {
    isExplicitlyFixed = false;
  }

  // Filler words to ignore in Portuguese
  const stopWords = new Set([
    'de', 'no', 'na', 'nos', 'nas', 'com', 'em', 'para', 'pra', 'o', 'a', 'os', 'as',
    'um', 'uma', 'uns', 'umas', 'r$', 'por', 'gastei', 'comprei', 'paguei', 'foi', 'custou',
    'valor', 'reais', 'real', 'total', 'hoje', 'ontem'
  ]);

  // Clean words for category matching
  const words = remainingText
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w && !stopWords.has(w));

  // 4. Find Matching Category with Strict Match & Long Prefix Safeguards
  let matchedCategory: Category | undefined;
  let confidence: ParsedExpense['confidence'] = 'FALLBACK';

  if (words.length > 0) {
    // 4.1 Try exact match on category name
    matchedCategory = categories.find((c) =>
      words.some((w) => normalizeText(c.name) === w)
    );

    if (matchedCategory) {
      confidence = 'HIGH';
    } else {
      // 4.2 Try match on aliases with collision safeguards:
      // Short aliases (<=3 chars like 'gas', 'net', 'tim', 'bar') require EXACT match
      // Longer aliases (>3 chars) allow prefix match
      matchedCategory = categories.find((c) =>
        c.aliases?.some((alias) => {
          const normAlias = normalizeText(alias);
          return words.some((w) => {
            if (w === normAlias) return true;
            if (normAlias.length > 3) {
              return w.startsWith(normAlias) || (w.length > 3 && normAlias.startsWith(w));
            }
            return false;
          });
        })
      );

      if (matchedCategory) {
        confidence = 'MEDIUM';
      }
    }
  }

  // 4.3 Fallback to default unclassified category
  if (!matchedCategory) {
    matchedCategory = categories.find((c) => c.isUnclassifiedFallback) || categories[0];
    confidence = 'FALLBACK';
  }

  // 5. Determine Transaction Type & isFixed inheritance rule
  const type: TransactionType = matchedCategory?.type || 'EXPENSE';
  const isFixed = isExplicitlyFixed !== null
    ? isExplicitlyFixed
    : (matchedCategory ? matchedCategory.isFixedCost : false);

  const rawDescription = words.join(' ') || matchedCategory?.name || 'Gasto sem descrição';
  const description = rawDescription.slice(0, 80);

  return {
    amount: Number(amount.toFixed(2)),
    rawText: safeText,
    categoryQuery: words.join(' '),
    matchedCategoryId: matchedCategory?.id,
    matchedCategoryName: matchedCategory?.name,
    matchedCategoryIcon: matchedCategory?.icon,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    isFixed,
    type,
    confidence,
  };
}
