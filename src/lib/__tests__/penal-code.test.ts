import { describe, it, expect } from "vitest";
import {
  EXPECTED_ARTICLES,
  validateArticles,
  normalizeArticleNumber,
  suggestedArticlesFor,
  diffLines,
  hasChanges,
} from "@/lib/penal-code";

describe("EXPECTED_ARTICLES mapping", () => {
  it("associe Vol aux articles 364/365", () => {
    expect(EXPECTED_ARTICLES["Vol"]).toEqual(["364", "365"]);
  });
  it("associe Vol aggravé aux articles 364/366/367", () => {
    expect(EXPECTED_ARTICLES["Vol aggravé"]).toEqual(["364", "366", "367"]);
  });
  it("associe Escroquerie à l'article 379", () => {
    expect(EXPECTED_ARTICLES["Escroquerie"]).toEqual(["379"]);
  });
});

describe("normalizeArticleNumber", () => {
  it("supprime les caractères non numériques", () => {
    expect(normalizeArticleNumber("Art. 364")).toBe("364");
    expect(normalizeArticleNumber("  365 ")).toBe("365");
    expect(normalizeArticleNumber("")).toBe("");
  });
});

describe("validateArticles", () => {
  it("valide un vol avec les articles 364/365 sans warning bloquant", () => {
    const res = validateArticles("Vol", [
      { numero: "364", libelle: "Vol simple" },
      { numero: "365", libelle: "Peines applicables au vol" },
    ]);
    expect(res.invalidArticles).toEqual([]);
    expect(res.missingExpected).toEqual([]);
  });

  it("marque comme invalides les articles hors périmètre", () => {
    const res = validateArticles("Vol", [
      { numero: "379", libelle: "Escroquerie" },
    ]);
    expect(res.invalidArticles).toContain("379");
    expect(res.warnings.some((w) => w.includes("ne correspondent pas"))).toBe(true);
  });

  it("liste les articles attendus manquants", () => {
    const res = validateArticles("Vol aggravé", [
      { numero: "364", libelle: "Vol simple" },
    ]);
    expect(res.missingExpected).toEqual(["366", "367"]);
  });

  it("signale les numéros de format invalide", () => {
    const res = validateArticles("Vol", [{ numero: "abc", libelle: "?" }]);
    expect(res.invalidFormat).toContain("abc");
  });

  it("prévient quand aucun article n'est cité", () => {
    const res = validateArticles("Vol", []);
    expect(res.warnings.some((w) => w.toLowerCase().includes("aucun"))).toBe(true);
  });

  it("ne bloque pas si type d'infraction inconnu", () => {
    const res = validateArticles("Autre", [{ numero: "999", libelle: "X" }]);
    expect(res.expected).toEqual([]);
    expect(res.invalidArticles).toEqual([]);
  });
});

describe("suggestedArticlesFor", () => {
  it("retourne les articles attendus pour Vol", () => {
    const suggested = suggestedArticlesFor("Vol");
    expect(suggested.map((a) => a.numero)).toEqual(["364", "365"]);
    expect(suggested[0].libelle).toBeTruthy();
    expect(suggested[0].url).toContain("364");
  });
  it("retourne une liste vide pour un type inconnu", () => {
    expect(suggestedArticlesFor("Inconnu")).toEqual([]);
  });
});

describe("diffLines", () => {
  it("détecte les lignes ajoutées et supprimées", () => {
    const d = diffLines("a\nb\nc", "a\nB\nc");
    expect(d.find((l) => l.type === "rm" && l.line === "b")).toBeTruthy();
    expect(d.find((l) => l.type === "add" && l.line === "B")).toBeTruthy();
    expect(hasChanges(d)).toBe(true);
  });
  it("retourne uniquement du contexte si textes identiques", () => {
    const d = diffLines("x\ny", "x\ny");
    expect(hasChanges(d)).toBe(false);
  });
});