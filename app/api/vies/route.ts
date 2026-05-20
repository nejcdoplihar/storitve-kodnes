// app/api/vies/route.ts
// Proxy za EU VIES REST endpoint — preveri DDV številko in vrne podatke
// (naziv + parsiran naslov). Klicanje direktno iz brskalnika bi padlo zaradi CORS.

import { NextRequest, NextResponse } from "next/server";

const VIES_URL =
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

// ============================================================
// HELPERS
// ============================================================

function viesErrorMessage(code: string): string {
  const map: Record<string, string> = {
    INVALID_INPUT: "Neveljaven vnos davčne številke.",
    SERVICE_UNAVAILABLE: "VIES storitev trenutno ni na voljo.",
    MS_UNAVAILABLE: "Davčni urad države trenutno ni na voljo.",
    TIMEOUT: "Časovna omejitev pri VIES storitvi.",
    INVALID_REQUESTER_INFO: "Neveljavni podatki o zahtevi.",
    VAT_BLOCKED: "Davčna številka je blokirana.",
    IP_BLOCKED: "Vaš IP je blokiran s strani VIES.",
    GLOBAL_MAX_CONCURRENT_REQ: "VIES je preobremenjen, poskusi kasneje.",
    MS_MAX_CONCURRENT_REQ: "Davčni urad države je preobremenjen.",
  };
  return map[code] || `VIES napaka: ${code}`;
}

// Pretvori "VOJKOVA CESTA" → "Vojkova cesta" (samo prva črka velika po besedah)
function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-/])\p{L}/gu, (t) => t.toUpperCase());
}

// SI parsanje: zadnja vrstica je "DDDD KRAJ"
function parseSIAddress(addr: string): {
  street: string;
  postal: string;
  city: string;
} {
  const lines = addr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { street: "", postal: "", city: "" };

  const lastLine = lines[lines.length - 1];
  const m = lastLine.match(/^(\d{4})\s+(.+)$/);

  if (m) {
    return {
      street: toTitleCase(lines.slice(0, -1).join(", ")),
      postal: m[1],
      city: toTitleCase(m[2]),
    };
  }

  return { street: toTitleCase(lines.join(", ")), postal: "", city: "" };
}

// IT parsanje: zadnja vrstica je "DDDDD KRAJ XX" (XX = okrožje, neobvezno)
function parseITAddress(addr: string): {
  street: string;
  postal: string;
  city: string;
} {
  const lines = addr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { street: "", postal: "", city: "" };

  const lastLine = lines[lines.length - 1];
  // "00100 ROMA RM" → postal="00100", city="ROMA", province="RM"
  const m = lastLine.match(/^(\d{5})\s+(.+?)(?:\s+([A-Z]{2}))?$/);

  if (m) {
    const provincePart = m[3] ? ` (${m[3]})` : "";
    return {
      street: toTitleCase(lines.slice(0, -1).join(", ")),
      postal: m[1],
      city: toTitleCase(m[2].trim()) + provincePart,
    };
  }

  return { street: toTitleCase(lines.join(", ")), postal: "", city: "" };
}

function parseAddress(country: string, addr: string) {
  if (country.toUpperCase() === "IT") return parseITAddress(addr);
  return parseSIAddress(addr);
}

// ============================================================
// ROUTE
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { country, vat } = body as { country?: string; vat?: string };

    if (!country || !vat) {
      return NextResponse.json(
        { error: "Manjka država ali davčna številka." },
        { status: 400 }
      );
    }

    const countryCode = country.toUpperCase();
    const cleanVat = String(vat).replace(/[\s\-.]/g, "").toUpperCase();
    // Odstrani country prefix če je uporabnik vključil (npr. SI12345678 → 12345678)
    const vatNumber = cleanVat.startsWith(countryCode)
      ? cleanVat.slice(countryCode.length)
      : cleanVat;

    if (!vatNumber || !/^\d+$/.test(vatNumber)) {
      return NextResponse.json(
        { error: "Davčna številka mora vsebovati samo številke." },
        { status: 400 }
      );
    }

    const res = await fetch(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode, vatNumber }),
      // VIES je lahko počasen — daj mu nekaj časa
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `VIES storitev ni dosegljiva (${res.status}).` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // VIES vrne userError pri napaki klica
    if (data.userError && data.userError !== "VALID") {
      return NextResponse.json(
        { error: viesErrorMessage(data.userError) },
        { status: 400 }
      );
    }

    if (!data.valid) {
      return NextResponse.json(
        { error: "Davčna številka ni veljavna." },
        { status: 404 }
      );
    }

    const parsed = parseAddress(countryCode, String(data.address || ""));

    // VIES včasih vrne "---" za naziv/naslov (privacy)
    const cleanName = String(data.name || "").trim();
    const finalName = cleanName === "---" ? "" : cleanName;

    return NextResponse.json({
      ok: true,
      country: countryCode,
      vat: `${countryCode}${vatNumber}`,
      name: finalName,
      addressRaw: String(data.address || ""),
      street: parsed.street,
      postal: parsed.postal,
      city: parsed.city,
    });
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.name === "TimeoutError" || e.name === "AbortError"
          ? "VIES odgovor ni prispel v 15 sekundah."
          : e.message
        : "Neznana napaka pri klicu VIES.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
