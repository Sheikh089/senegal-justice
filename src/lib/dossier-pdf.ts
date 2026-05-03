import { jsPDF } from "jspdf";
import { getDossierMediaUrls, BIOMETRIC_LABELS, type BiometricKey } from "./dossier-media";
import type { DossierRow } from "./dossier-helpers";

async function urlToDataUrl(url: string): Promise<{ data: string; format: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const format: "JPEG" | "PNG" = blob.type.includes("png") ? "PNG" : "JPEG";
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return { data, format };
  } catch {
    return null;
  }
}

export async function generateDossierPdf(
  dossier: DossierRow,
  opts: { assignedName?: string | null; output?: "save" | "blob" } = {}
): Promise<Blob | void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // En-tête
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DOSSIER JUDICIAIRE", margin, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Référence : ${dossier.reference}`, margin, 16);
  doc.text(
    `Édité le ${new Date().toLocaleString("fr-FR")}`,
    pageW - margin,
    16,
    { align: "right" }
  );
  y = 30;
  doc.setTextColor(15, 23, 42);

  // Titre
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(dossier.titre, pageW - 2 * margin);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 2;

  // Infos générales
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const meta: [string, string | null | undefined][] = [
    ["Statut", dossier.status],
    ["Priorité", dossier.priority],
    ["Type d'infraction", dossier.type_infraction],
    ["Lieu", dossier.lieu],
    ["Date des faits", dossier.date_faits],
    ["Assigné à", opts.assignedName ?? null],
    ["Créé le", new Date(dossier.created_at).toLocaleDateString("fr-FR")],
  ];
  for (const [label, val] of meta) {
    if (!val) continue;
    ensureSpace(6);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(val), margin + 38, y);
    y += 6;
  }

  // Description
  if (dossier.description) {
    y += 2;
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.text("Description des faits", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(dossier.description, pageW - 2 * margin);
    for (const ln of lines) {
      ensureSpace(5);
      doc.text(ln, margin, y);
      y += 5;
    }
  }

  // Mis en cause
  const mec: [string, string | null | undefined][] = [
    ["Prénom", dossier.mis_en_cause_prenom],
    ["Nom", dossier.mis_en_cause_nom],
    ["Né(e) le", dossier.mis_en_cause_date_naissance],
    ["Lieu de naissance", dossier.mis_en_cause_lieu_naissance],
    ["Profession", dossier.mis_en_cause_profession],
    ["Téléphone", dossier.mis_en_cause_telephone],
    ["Adresse", dossier.mis_en_cause_adresse],
  ].filter(([, v]) => v) as [string, string][];

  if (mec.length) {
    y += 4;
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Mis en cause", margin, y);
    y += 6;
    doc.setFontSize(10);
    for (const [label, val] of mec) {
      ensureSpace(6);
      doc.setFont("helvetica", "bold");
      doc.text(`${label} :`, margin, y);
      doc.setFont("helvetica", "normal");
      const wrap = doc.splitTextToSize(String(val), pageW - 2 * margin - 38);
      doc.text(wrap, margin + 38, y);
      y += Math.max(6, wrap.length * 5);
    }
  }

  // Photos & empreintes
  const urls = await getDossierMediaUrls(dossier);
  const keys = (Object.keys(BIOMETRIC_LABELS) as BiometricKey[]).filter((k) => urls[k]);

  if (keys.length) {
    y += 6;
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Photos & empreintes", margin, y);
    y += 6;

    const cols = 3;
    const gap = 5;
    const cellW = (pageW - 2 * margin - gap * (cols - 1)) / cols;
    const cellH = cellW;
    let col = 0;

    for (const k of keys) {
      const url = urls[k]!;
      const img = await urlToDataUrl(url);
      if (!img) continue;

      if (col === 0) ensureSpace(cellH + 8);
      const x = margin + col * (cellW + gap);
      try {
        doc.addImage(img.data, img.format, x, y, cellW, cellH, undefined, "FAST");
      } catch {
        doc.setDrawColor(200);
        doc.rect(x, y, cellW, cellH);
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(BIOMETRIC_LABELS[k], x + cellW / 2, y + cellH + 4, { align: "center" });

      col++;
      if (col >= cols) {
        col = 0;
        y += cellH + 8;
      }
    }
    if (col !== 0) y += cellH + 8;
  }

  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Dossier ${dossier.reference} — Page ${i}/${totalPages}`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    );
  }

  if (opts.output === "blob") {
    return doc.output("blob");
  }
  doc.save(`dossier-${dossier.reference}.pdf`);
}
