import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// --- Mocks ---
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "cop@example.com" } }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  toast: vi.fn(),
}));

const invokeMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import PoliceNouveau from "@/pages/PoliceNouveau";

function stubAiGenerationsTable() {
  // Chain used: from("ai_generations").insert({...}).select("id").single()
  const single = vi.fn().mockResolvedValue({ data: { id: "gen-1" }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  return { insert, update, select, single };
}

describe("PoliceNouveau — validation & diff (e2e)", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    fromMock.mockReset();
    const gen = stubAiGenerationsTable();
    fromMock.mockImplementation((table: string) => {
      if (table === "ai_generations") return { insert: gen.insert, update: gen.update };
      return {};
    });
  });

  async function fillAndGenerate(articles: { numero: string; libelle: string }[]) {
    render(<PoliceNouveau />);
    fireEvent.change(screen.getByPlaceholderText(/Vol à main armée/i), {
      target: { name: "titre", value: "Vol au marché" },
    });
    // Le premier combobox est le type d'infraction
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { name: "type_infraction", value: "Vol" },
    });

    invokeMock.mockResolvedValueOnce({
      data: {
        description: "Faits constatés par la police au marché.",
        articles,
        warnings: [],
        model: "google/gemini-3-flash-preview",
        version: "v2",
        prompt: "prompt",
      },
      error: null,
    });
    fireEvent.click(screen.getByRole("button", { name: /Générer avec l'IA/i }));
    await screen.findByText(/Prévisualisation IA/i);
  }

  it("affiche un badge 'Cohérent' pour les articles attendus", async () => {
    await fillAndGenerate([
      { numero: "364", libelle: "Vol simple" },
      { numero: "365", libelle: "Peines applicables au vol" },
    ]);
    const badges = await screen.findAllByText(/Cohérent/i);
    expect(badges.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/Hors périmètre/i)).toBeNull();
  });

  it("marque un article invalide comme 'Hors périmètre' et propose Auto-corriger", async () => {
    await fillAndGenerate([{ numero: "379", libelle: "Escroquerie" }]);
    expect(await screen.findByText(/Hors périmètre/i)).toBeInTheDocument();
    const autoFix = screen.getByRole("button", { name: /Auto-corriger/i });
    expect(autoFix).toBeInTheDocument();
    fireEvent.click(autoFix);
    // après auto-correction, les articles 364/365 remplacent 379
    await waitFor(() => {
      expect(screen.getByText(/Article 364/)).toBeInTheDocument();
      expect(screen.getByText(/Article 365/)).toBeInTheDocument();
      expect(screen.queryByText(/Article 379/)).toBeNull();
    });
  });

  it("propose 'Corriger avec l'IA' quand des incohérences persistent", async () => {
    await fillAndGenerate([{ numero: "379", libelle: "Escroquerie" }]);
    const btn = await screen.findByRole("button", { name: /Corriger avec l'IA/i });
    expect(btn).toBeInTheDocument();

    invokeMock.mockResolvedValueOnce({
      data: {
        description: "Nouvelle description corrigée.",
        articles: [
          { numero: "364", libelle: "Vol simple" },
          { numero: "365", libelle: "Peines applicables au vol" },
        ],
        warnings: [],
        model: "google/gemini-3-flash-preview",
        version: "v2",
        prompt: "prompt-corr",
      },
      error: null,
    });
    fireEvent.click(btn);
    await waitFor(() => {
      // 2e appel avec les listes de correction
      const call = invokeMock.mock.calls[1];
      expect(call[0]).toBe("generate-description");
      const body = call[1].body;
      expect(body.expected_articles).toEqual(["364", "365"]);
      expect(body.invalid_articles).toContain("379");
    });
    await waitFor(() =>
      expect(screen.getByText(/Nouvelle description corrigée/)).toBeInTheDocument()
    );
  });

  it("affiche la comparaison (diff) avant écrasement d'une description existante", async () => {
    render(<PoliceNouveau />);
    fireEvent.change(screen.getByPlaceholderText(/Vol à main armée/i), {
      target: { name: "titre", value: "Vol au marché" },
    });
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { name: "type_infraction", value: "Vol" },
    });
    // description initiale déjà présente
    fireEvent.change(
      screen.getByPlaceholderText(/circonstances de l'infraction/i),
      { target: { name: "description", value: "Ancienne description existante." } }
    );

    invokeMock.mockResolvedValueOnce({
      data: {
        description: "Nouvelle description proposée par l'IA.",
        articles: [{ numero: "364", libelle: "Vol simple" }],
        warnings: [],
        model: "google/gemini-3-flash-preview",
        version: "v2",
        prompt: "prompt",
      },
      error: null,
    });
    fireEvent.click(screen.getByRole("button", { name: /Générer avec l'IA/i }));
    const diffBtn = await screen.findByRole("button", {
      name: /Comparer avec la description actuelle/i,
    });
    fireEvent.click(diffBtn);
    // ligne ajoutée (add) dans le diff
    const added = await screen.findAllByText(/Nouvelle description proposée/i);
    expect(added.length).toBeGreaterThanOrEqual(1);
    // ligne supprimée (rm) — visible uniquement dans le diff
    const removed = screen.getAllByText(/Ancienne description existante/i);
    expect(removed.length).toBeGreaterThanOrEqual(1);
  });
});