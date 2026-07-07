// Validation partagée des articles du Code pénal sénégalais (Loi n° 65-60)
// utilisée côté client (UI) et côté edge function.

export type Article = { numero: string; libelle: string; url?: string };

export const EXPECTED_ARTICLES: Record<string, string[]> = {
  "Vol": ["364", "365"],
  "Vol aggravé": ["364", "366", "367"],
  "Escroquerie": ["379"],
  "Violence physique": ["294", "295", "297"],
  "Abus de confiance": ["383"],
  "Faux et usage de faux": ["132", "137"],
  "Trouble à l'ordre public": ["96", "97"],
};

// Libellés de référence utilisés pour l'auto-correction.
export const ARTICLE_LIBELLES: Record<string, string> = {
  "96": "Rébellion",
  "97": "Attroupement",
  "132": "Faux en écritures",
  "137": "Usage de faux",
  "294": "Coups et blessures volontaires",
  "295": "Violences ayant entraîné une maladie",
  "297": "Violences aggravées",
  "364": "Vol simple",
  "365": "Peines applicables au vol",
  "366": "Vol aggravé",
  "367": "Vol avec circonstances aggravantes",
  "379": "Escroquerie",
  "383": "Abus de confiance",
};

export function normalizeArticleNumber(numero: string): string {
  return String(numero ?? "").replace(/[^\d]/g, "");
}

export function buildArticleUrl(numero: string): string {
  return `https://www.google.com/search?q=Code+p%C3%A9nal+S%C3%A9n%C3%A9gal+article+${encodeURIComponent(
    numero
  )}`;
}

export type ValidationResult = {
  warnings: string[];
  /** numéros cités mais absents de la liste attendue pour ce type d'infraction */
  invalidArticles: string[];
  /** numéros attendus mais non cités */
  missingExpected: string[];
  /** liste attendue (vide si type inconnu) */
  expected: string[];
  /** numéros dont le format est invalide (non numérique) */
  invalidFormat: string[];
};

export function validateArticles(
  type_infraction: string | undefined | null,
  articles: Article[]
): ValidationResult {
  const warnings: string[] = [];
  const expected = (type_infraction && EXPECTED_ARTICLES[type_infraction]) || [];
  const invalidFormat: string[] = [];
  const citedNumbers: string[] = [];

  for (const a of articles ?? []) {
    const n = normalizeArticleNumber(a?.numero);
    if (!n) {
      invalidFormat.push(String(a?.numero ?? ""));
      warnings.push(`Numéro d'article invalide : "${a?.numero}"`);
    } else {
      citedNumbers.push(n);
    }
  }

  if (!articles || articles.length === 0) {
    warnings.push("Aucun article du Code pénal n'a été cité.");
  }

  let invalidArticles: string[] = [];
  let missingExpected: string[] = [];

  if (expected.length) {
    invalidArticles = citedNumbers.filter((n) => !expected.includes(n));
    missingExpected = expected.filter((e) => !citedNumbers.includes(e));
    const hasAnyMatch = citedNumbers.some((n) => expected.includes(n));
    if (!hasAnyMatch && citedNumbers.length) {
      warnings.push(
        `Les articles cités (${citedNumbers.join(", ")}) ne correspondent pas aux articles habituellement retenus pour "${type_infraction}" (attendus : ${expected.join(", ")}). À vérifier manuellement.`
      );
    } else if (invalidArticles.length) {
      warnings.push(
        `Articles hors périmètre pour "${type_infraction}" : ${invalidArticles.join(", ")}.`
      );
    }
    if (missingExpected.length) {
      warnings.push(
        `Articles habituellement attendus non cités : ${missingExpected.join(", ")}.`
      );
    }
  }

  return { warnings, invalidArticles, missingExpected, expected, invalidFormat };
}

/** Retourne la liste "de référence" pour un type d'infraction (auto-correction). */
export function suggestedArticlesFor(type_infraction: string | undefined | null): Article[] {
  const expected = (type_infraction && EXPECTED_ARTICLES[type_infraction]) || [];
  return expected.map((numero) => ({
    numero,
    libelle: ARTICLE_LIBELLES[numero] ?? "Article du Code pénal",
    url: buildArticleUrl(numero),
  }));
}

// -------- Diff utilitaire (LCS ligne à ligne) --------

export type DiffLine = { type: "ctx" | "add" | "rm"; line: string };

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = (oldText ?? "").split("\n");
  const b = (newText ?? "").split("\n");
  const n = a.length;
  const m = b.length;
  // LCS DP
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "rm", line: a[i] });
      i++;
    } else {
      out.push({ type: "add", line: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "rm", line: a[i++] });
  while (j < m) out.push({ type: "add", line: b[j++] });
  return out;
}

export function hasChanges(diff: DiffLine[]): boolean {
  return diff.some((d) => d.type !== "ctx");
}