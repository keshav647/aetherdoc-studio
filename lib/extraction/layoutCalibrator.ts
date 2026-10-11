import { ExtractedField, FieldCategory, NormalizedBBox } from './types';

/**
 * Multi-page calibrated bounding box slots for user uploads.
 * Pages 1–2 have structured header + section slots.
 * Pages 3–12 auto-generate 3 balanced tall slots per page.
 */
function buildCalibratedSlots(): {
  page: number;
  bbox: NormalizedBBox;
  defaultCategory: FieldCategory;
}[] {
  const slots: { page: number; bbox: NormalizedBBox; defaultCategory: FieldCategory }[] = [
    // PAGE 1 — Header, Credentials & Primary Content
    { page: 1, bbox: { x: 0.06, y: 0.065, w: 0.43, h: 0.115 }, defaultCategory: 'DOCUMENT_META' },
    { page: 1, bbox: { x: 0.51, y: 0.065, w: 0.43, h: 0.115 }, defaultCategory: 'DOCUMENT_META' },
    { page: 1, bbox: { x: 0.06, y: 0.23,  w: 0.88, h: 0.24  }, defaultCategory: 'COMPLIANCE'    },
    { page: 1, bbox: { x: 0.06, y: 0.53,  w: 0.88, h: 0.36  }, defaultCategory: 'LINE_ITEMS'    },
    // PAGE 2 — Extended Sections
    { page: 2, bbox: { x: 0.06, y: 0.11,  w: 0.88, h: 0.25  }, defaultCategory: 'LINE_ITEMS'    },
    { page: 2, bbox: { x: 0.06, y: 0.41,  w: 0.88, h: 0.27  }, defaultCategory: 'LINE_ITEMS'    },
    { page: 2, bbox: { x: 0.06, y: 0.73,  w: 0.88, h: 0.18  }, defaultCategory: 'FINANCIAL_TOTALS' },
  ];

  const cats: FieldCategory[] = ['LINE_ITEMS', 'FINANCIAL_TOTALS', 'COMPLIANCE'];
  const yStarts = [0.08, 0.41, 0.74];
  const heights = [0.28, 0.28, 0.18];
  for (let pg = 3; pg <= 12; pg++) {
    for (let s = 0; s < 3; s++) {
      slots.push({
        page: pg,
        bbox: { x: 0.06, y: yStarts[s], w: 0.88, h: heights[s] },
        defaultCategory: cats[s],
      });
    }
  }
  return slots;
}

export const CALIBRATED_SLOTS = buildCalibratedSlots();

/**
 * Computes content-proportional, non-overlapping vertical bounding boxes on a page.
 */
export function computeProportionalBoxes(values: string[]): NormalizedBBox[] {
  const count = values.length;
  if (count === 0) return [];
  const topMargin = 0.066;
  const availableHeight = 0.858;
  const gap = count > 6 ? 0.01 : 0.014;
  const usableHeight = Math.max(0.2, availableHeight - Math.max(0, count - 1) * gap);

  const weights = values.map((val) => {
    const len = (val || '').length;
    if (len < 45) return 1.0;
    if (len < 110) return 1.35;
    if (len < 220) return 1.75;
    return 2.15;
  });
  const totalWeight = weights.reduce((acc, w) => acc + w, 0) || count;

  const rawHeights = weights.map((w) =>
    Math.min(0.26, Math.max(0.056, (w / totalWeight) * usableHeight))
  );
  const rawSum = rawHeights.reduce((acc, h) => acc + h, 0) || 1;
  const scale = rawSum > usableHeight ? usableHeight / rawSum : 1;
  const finalHeights = rawHeights.map((h) => Number((h * scale).toFixed(3)));

  let cursorY = topMargin;
  return finalHeights.map((h) => {
    const box: NormalizedBBox = {
      x: 0.06,
      y: Number(Math.min(0.89, cursorY).toFixed(3)),
      w: 0.88,
      h: Number(Math.max(0.052, Math.min(0.26, h)).toFixed(3)),
    };
    cursorY += h + gap;
    return box;
  });
}

/**
 * Upgrades legacy category enums and cramped half-width CALIBRATED_SLOTS bounding boxes
 * on cached uploaded documents in localStorage so they render cleanly without overlap or clipping.
 */
export function recalibrateDocumentFieldsLayout(fields: ExtractedField[]): ExtractedField[] {
  if (!fields || fields.length === 0) return fields;

  const inferFriendlyCategory = (f: ExtractedField): string => {
    const rawCat = (f.category || '').trim();
    if (
      rawCat &&
      !['DOCUMENT_META', 'LINE_ITEMS', 'FINANCIAL_TOTALS', 'COMPLIANCE'].includes(rawCat)
    ) {
      return rawCat;
    }
    const label = `${f.label} ${f.field_key}`.toLowerCase();
    if (/name|contact|email|phone|location|linkedin|github|identity|author/.test(label)) {
      return 'Contact & Identity';
    }
    if (/role|profile|summary|objective|about|title/.test(label)) {
      return 'Profile & Objective';
    }
    if (/education|degree|university|college|academic|school|gpa/.test(label)) {
      return 'Education & Academic Background';
    }
    if (/experience|employment|work|history|career|intern/.test(label)) {
      return 'Professional Experience';
    }
    if (/skill|competenc|stack|technolog|language|tool/.test(label)) {
      return 'Technical Skills & Stack';
    }
    if (/project|system|portfolio|built|architecture/.test(label)) {
      return 'Projects & Systems Built';
    }
    if (/certif|award|honor|achievement|publication/.test(label)) {
      return 'Certifications & Achievements';
    }
    if (/total|subtotal|tax|amount|balance|price|fee|cost/.test(label)) {
      return 'Financial Totals & Pricing';
    }
    if (/iban|swift|bank|compliance|term|governing|sla/.test(label)) {
      return 'Terms & Compliance';
    }
    if (rawCat === 'DOCUMENT_META') return 'Document Overview & Metadata';
    if (rawCat === 'FINANCIAL_TOTALS') return 'Summary & Key Metrics';
    if (rawCat === 'COMPLIANCE') return 'Qualifications & Terms';
    return 'Core Content & Details';
  };

  // Check if any field uses legacy narrow side-by-side boxes (w < 0.65) or top collision (y < 0.064)
  const needsBboxRecalibration = fields.some(
    (f) => f.bbox.w < 0.65 || f.bbox.y < 0.064
  );

  // Group by page and re-index pages sequentially
  const pageBuckets = new Map<number, ExtractedField[]>();
  for (const f of fields) {
    const p = Math.max(1, f.page_number || 1);
    if (!pageBuckets.has(p)) pageBuckets.set(p, []);
    pageBuckets.get(p)!.push(f);
  }

  const sortedPages = Array.from(pageBuckets.keys()).sort((a, b) => a - b);
  const updated: ExtractedField[] = [];

  sortedPages.forEach((origPage, pageIdx) => {
    const seqPage = pageIdx + 1;
    const pageFields = pageBuckets.get(origPage)!;
    const boxes = computeProportionalBoxes(pageFields.map((f) => f.field_value || ''));

    pageFields.forEach((f, idx) => {
      const newBbox: NormalizedBBox = needsBboxRecalibration
        ? boxes[idx] || { x: 0.06, y: 0.08, w: 0.88, h: 0.12 }
        : f.bbox;

      updated.push({
        ...f,
        page_number: seqPage,
        category: inferFriendlyCategory(f),
        bbox: newBbox,
      });
    });
  });

  return updated;
}
