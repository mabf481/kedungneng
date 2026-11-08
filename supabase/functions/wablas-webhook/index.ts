import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WABLAS_TOKEN = Deno.env.get("WABLAS_TOKEN") ?? "";
const WABLAS_SECRET_KEY = Deno.env.get("WABLAS_SECRET_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("WABLAS_WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const WAJIB_PER_BULAN = 10000;

type WablasIncoming = {
  id?: string;
  pushName?: string;
  isGroup?: boolean;
  message?: string;
  phone?: string;
  messageType?: string;
  sender?: string;
  timestamp?: string;
  body?: string;
  text?: string;
  isFromMe?: boolean;
  [key: string]: unknown;
};

type DueMonth = {
  tahun: number;
  bulan: number;
  jumlah: number;
  shortfall: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizePhone(value: unknown) {
  let phone = String(value ?? "").replace(/\D/g, "");

  if (phone.startsWith("0")) {
    phone = "62" + phone.slice(1);
  }

  return phone;
}

function rupiah(value: number) {
  return "Rp" + Math.round(value).toLocaleString("id-ID");
}

function monthName(month: number) {
  return [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ][month - 1];
}

function currentYearMonth() {
  const now = new Date();

  return {
    tahun: now.getUTCFullYear(),
    bulan: now.getUTCMonth() + 1,
  };
}

function buildDueMonths(
  tanggalMasuk: string | null | undefined,
  rows: Array<{
    tahun: number;
    bulan: number;
    jumlah: number;
  }>
): DueMonth[] {
  if (!tanggalMasuk) {
    return [];
  }

  const join = new Date(tanggalMasuk + "T00:00:00Z");

  let year = join.getUTCFullYear();
  let month = join.getUTCMonth() + 1;

  const now = currentYearMonth();

  const byMonth = new Map<string, number>();

  for (const row of rows) {
    byMonth.set(
      `${row.tahun}-${String(row.bulan).padStart(2, "0")}`,
      Number(row.jumlah ?? 0),
    );
  }

  const result: DueMonth[] = [];

  while (
    year < now.tahun ||
    (year === now.tahun && month <= now.bulan)
  ) {
    const key = `${year}-${String(month).padStart(2, "0")}`;

    const jumlah = byMonth.get(key) ?? 0;

    result.push({
      tahun: year,
      bulan: month,
      jumlah,
      shortfall: Math.max(WAJIB_PER_BULAN - jumlah, 0),
    });

    month++;

    if (month === 13) {
      month = 1;
      year++;
    }
  }

  return result;
}

function buildSWReply(
  anggota: any,
  dueMonths: DueMonth[],
  promptForPayment = true,
) {
  const { tahun, bulan } = currentYearMonth();

  const tunggakan = dueMonths.filter(
    (x) => x.shortfall > 0,
  );

  const bulanTunggakan = tunggakan.length;

  const rupiahTunggakan = tunggakan.reduce(
    (sum, x) => sum + x.shortfall,
    0,
  );

  const lines = [
    `Simpanan Wajib a/n ${anggota.nama} (${monthName(bulan)} ${tahun})`,
    "",
  ];

  if (bulanTunggakan === 0) {
    lines.push("Lunas (Tidak Ada Tunggakan)");
  } else {
    lines.push(
      `Jumlah Kewajiban = ${bulanTunggakan} bulan | ${rupiah(rupiahTunggakan)}`,
    );

    if (promptForPayment) {
      lines.push(
        "",
        "Silahkan masukan bulan yang akan di bayar",
      );
    }
  }

  return lines.join("\n");
}

async function sendText(
  phone: string,
  message: string,
  refId: string,
) {
  if (!WABLAS_TOKEN) {
    return {
      ok: false,
      error: "WABLAS_TOKEN belum dikonfigurasi",
    };
  }

  try {
    const response = await fetch(
      "https://smg.wablas.com/api/v2/send-message",
      {
        method: "POST",

        headers: {
          "Authorization":
            `${WABLAS_TOKEN}.${WABLAS_SECRET_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },

        body: JSON.stringify({
          data: [
            {
              phone,
              message,
              ref_id: refId,
            },
          ],
        }),

        signal: AbortSignal.timeout(30000),
      },
    );

    const raw = await response.text();

    let body: any = {};

    try {
      body = JSON.parse(raw);
    } catch {
      body = {
        raw,
      };
    }

    if (!response.ok || body.status !== true) {
      return {
        ok: false,
        http_status: response.status,
        response: body,
      };
    }

    return {
      ok: true,
      response: body,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : String(e),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response(null, { status: 200 });
  }

  if (req.method !== "POST") {
    return json(
      {
        ok: false,
        error: "Method not allowed",
      },
      405,
    );
  }

  if (WEBHOOK_SECRET) {
    const url = new URL(req.url);

    const supplied =
      req.headers.get("x-webhook-secret") ||
      url.searchParams.get("key");

    if (supplied !== WEBHOOK_SECRET) {
      return json(
        {
          ok: false,
          error: "Unauthorized",
        },
        401,
      );
    }
  }

  let payload: WablasIncoming;

  try {
    payload = await req.json();
  } catch {
    return json(
      {
        ok: false,
        error: "Invalid JSON",
      },
      400,
    );
  }

  const phone = normalizePhone(
    payload.phone || payload.sender,
  );

  const message = String(
    payload.message ??
      payload.body ??
      payload.text ??
      "",
  ).trim();

  const messageType = String(
    payload.messageType ??
      payload.type ??
      "unknown",
  );

  if (!phone) {
    return json({
      ok: true,
      ignored: "missing_phone",
    });
  }

  if (
    String(payload.isFromMe).toLowerCase() ===
    "true"
  ) {
    return json({
      ok: true,
      ignored: "from_me",
    });
  }

  if (payload.isGroup === true) {
    return json({
      ok: true,
      ignored: "group_message",
    });
  }

  await supabase
    .from("wa_messages")
    .upsert(
      {
        wablas_id:
          payload.id || null,
        phone,
        direction: "inbound",
        message,
        message_type: messageType,
        raw: payload,
      },
      {
        onConflict: "wablas_id",
        ignoreDuplicates: true,
      },
    );

  const {
    data: allowed,
    error: allowedError,
  } = await supabase
    .from("wa_allowed_numbers")
    .select("id, name, active")
    .eq("phone", phone)
    .eq("active", true)
    .maybeSingle();

  if (allowedError) {
    return json(
      {
        ok: false,
        error: "whitelist_database_error",
      },
      500,
    );
  }

  if (!allowed) {
    const reply =
      "Maaf, nomor WhatsApp ini belum diizinkan untuk menggunakan Bot Kedungneng.";

    const refId =
      `deny-${payload.id || crypto.randomUUID()}`;

    const sent = await sendText(
      phone,
      reply,
      refId,
    );

    await supabase
      .from("wa_messages")
      .insert({
        phone,
        direction: "outbound",
        message: reply,
        message_type: "text",
        raw: {
          ref_id: refId,
          reason: "not_whitelisted",
          wablas: sent,
        },
      });

    return json({
      ok: true,
      allowed: false,
      sent: sent.ok,
    });
  }

  const cleanMessage = message
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  const { data: waUser } =
    await supabase
      .from("wa_users")
      .select("state, data")
      .eq("phone", phone)
      .maybeSingle();

  const state = String(
    waUser?.state ?? "menu",
  );

  const stateData =
    waUser?.data &&
    typeof waUser.data === "object"
      ? (waUser.data as Record<string, unknown>)
      : {};

  async function saveState(
    nextState: string,
    data: Record<string, unknown> = {},
  ) {
    await supabase
      .from("wa_users")
      .upsert(
        {
          phone,
          state: nextState,
          data,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "phone",
        },
      );
  }

  async function sendAndLog(
    reply: string,
    refId: string,
    meta: Record<string, unknown> = {},
  ) {
    const sent = await sendText(
      phone,
      reply,
      refId,
    );

    await supabase
      .from("wa_messages")
      .insert({
        phone,
        direction: "outbound",
        message: reply,
        message_type: "text",
        raw: {
          ref_id: refId,
          ...meta,
          wablas: sent,
        },
      });

    return sent;
  }

  async function loadMember(
    memberId: string,
  ) {
    const {
      data: anggota,
      error: anggotaError,
    } = await supabase
      .from("koperasi_anggota")
      .select(
        "id, no_anggota, nama, tanggal_masuk",
      )
      .eq("id", memberId)
      .maybeSingle();

    if (anggotaError || !anggota) {
      return null;
    }

    const {
      data: rows,
      error: wajibError,
    } = await supabase
      .from("koperasi_simpanan_wajib")
      .select(
        "tahun, bulan, jumlah",
      )
      .eq("anggota_id", memberId)
      .order("tahun", {
        ascending: true,
      })
      .order("bulan", {
        ascending: true,
      });

    if (wajibError) {
      return null;
    }

    return {
      anggota,

      dueMonths: buildDueMonths(
        anggota.tanggal_masuk,
        rows ?? [],
      ),
    };
  }

  async function findMemberByName(
    namaCari: string,
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("koperasi_anggota")
      .select(
        "id, no_anggota, nama, tanggal_masuk",
      )
      .ilike("nama", namaCari);

    if (error) {
      return {
        error: true,
        rows: [] as any[],
      };
    }

    return {
      error: false,
      rows: data ?? [],
    };
  }

  // =====================================================
  // 1. CEK SIMPANAN NAMA
  // =====================================================

  const cekMatch =
    cleanMessage.match(
      /^cek\s+simpanan\s+(.+)$/i,
    );

  if (cekMatch) {
    const namaCari =
      cekMatch[1]
        .trim()
        .replace(/\s+/g, " ");

    const found =
      await findMemberByName(
        namaCari,
      );

    if (found.error) {
      return json(
        {
          ok: false,
          error:
            "member_database_error",
        },
        500,
      );
    }

    if (found.rows.length === 0) {
      await sendAndLog(
        "Anggota dengan nama *" +
          namaCari +
          "* tidak ditemukan.",

        "cek-not-found-" +
          (payload.id ||
            crypto.randomUUID()),

        {
          command:
            "cek_simpanan_not_found",
          nama: namaCari,
        },
      );

      return new Response(null, { status: 200 });
    }

    const anggota =
      found.rows[0];

    const {
      data: wajibRows,
      error: wajibError,
    } = await supabase
      .from("koperasi_simpanan_wajib")
      .select("jumlah")
      .eq(
        "anggota_id",
        anggota.id,
      );

    if (wajibError) {
      return json(
        {
          ok: false,
          error:
            "wajib_database_error",
        },
        500,
      );
    }

    const totalWajib =
      (wajibRows ?? [])
        .reduce(
          (sum, row) =>
            sum +
            Number(
              row.jumlah ?? 0,
            ),
          0,
        );

    const {
      data: pokokRow,
    } = await supabase
      .from("koperasi_anggota")
      .select("simpanan_pokok")
      .eq("id", anggota.id)
      .maybeSingle();

    const totalPokok =
      Number(
        pokokRow?.simpanan_pokok ??
          0,
      );

    const totalSimpanan =
      totalPokok +
      totalWajib;

    const loaded =
      await loadMember(
        anggota.id,
      );

    if (!loaded) {
      return json(
        {
          ok: false,
          error:
            "member_data_error",
        },
        500,
      );
    }

    const tunggakan =
      loaded.dueMonths.filter(
        (x) => x.shortfall > 0,
      );

    const totalTunggakan =
      tunggakan.reduce(
        (sum, x) =>
          sum + x.shortfall,
        0,
      );

    const reply = [
      "Nama = " +
        anggota.nama,

      "Nomor Anggota = " +
        anggota.no_anggota,

      "Jumlah Simpanan Pokok = " +
        rupiah(totalPokok),

      "Jumlah Simpanan Wajib = " +
        rupiah(totalWajib),

      "Jumlah Simpanan = " +
        rupiah(totalSimpanan),

      "",

      "Jumlah Simpanan Wajib Bulan Tertunggak = " +
        tunggakan.length +
        " bulan",

      "Jumlah Simpanan Wajib Rp tertunggak = " +
        rupiah(totalTunggakan),
    ].join("\n");

    await saveState(
      "menu",
      {},
    );

    await sendAndLog(
      reply,

      "cek-" +
        anggota.no_anggota +
        "-" +
        (payload.id ||
          crypto.randomUUID()),

      {
        command:
          "cek_simpanan",
        no_anggota:
          anggota.no_anggota,
      },
    );

    return new Response(null, { status: 200 });
  }

  // =====================================================
  // 2. PERINTAH SIMPANAN WAJIB NAMA
  //
  // Contoh:
  // Simpanan Wajib MUNAJI
  // =====================================================

  const swMatch =
    cleanMessage.match(
      /^simpanan\s+wajib\s+(.+)$/i,
    );

  if (swMatch) {
    const namaCari =
      swMatch[1]
        .trim()
        .replace(/\s+/g, " ");

    const found =
      await findMemberByName(
        namaCari,
      );

    if (found.error) {
      return json(
        {
          ok: false,
          error:
            "member_database_error",
        },
        500,
      );
    }

    if (found.rows.length === 0) {
      await sendAndLog(
        `Anggota dengan nama *${namaCari}* tidak ditemukan.`,

        `not-found-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_member_not_found",
          nama: namaCari,
        },
      );

      return new Response(null, { status: 200 });
    }

    // =================================================
    // NAMA DOBEL
    // =================================================

    if (found.rows.length > 1) {
      const pilihan =
        found.rows
          .map(
            (a, i) =>
              `${i + 1}. ${a.nama} — ${a.no_anggota}`,
          )
          .join("\n");

      await saveState(
        "sw_pilih_anggota",
        {
          anggota_ids:
            found.rows.map(
              (a) => a.id,
            ),
        },
      );

      await sendAndLog(
        `Ditemukan ${found.rows.length} anggota dengan nama *${namaCari}*.\nSilakan pilih:\n\n${pilihan}`,

        `choose-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_choose_member",
          nama: namaCari,
        },
      );

      return new Response(null, { status: 200 });
    }

    const loaded =
      await loadMember(
        found.rows[0].id,
      );

    if (!loaded) {
      return json(
        {
          ok: false,
          error:
            "member_data_error",
        },
        500,
      );
    }

    const tunggakan =
      loaded.dueMonths.filter(
        (x) => x.shortfall > 0,
      );

    // =================================================
    // SUDAH LUNAS
    // =================================================

    if (tunggakan.length === 0) {
      await saveState(
        "menu",
        {},
      );

      await sendAndLog(
        buildSWReply(
          loaded.anggota,
          loaded.dueMonths,
          false,
        ),

        `sw-${
          loaded.anggota.no_anggota
        }-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_check",
          no_anggota:
            loaded.anggota
              .no_anggota,
        },
      );
    }

    // =================================================
    // MASIH ADA TUNGGAKAN
    // =================================================

    else {
      await saveState(
        "sw_wait_months",
        {
          anggota_id:
            loaded.anggota.id,

          no_anggota:
            loaded.anggota
              .no_anggota,

          nama:
            loaded.anggota
              .nama,

          tunggakan_bulan:
            tunggakan.length,

          tunggakan_rp:
            tunggakan.reduce(
              (sum, x) =>
                sum + x.shortfall,
              0,
            ),
        },
      );

      await sendAndLog(
        buildSWReply(
          loaded.anggota,
          loaded.dueMonths,
          true,
        ),

        `sw-${
          loaded.anggota.no_anggota
        }-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_check",

          no_anggota:
            loaded.anggota
              .no_anggota,
        },
      );
    }

    return new Response(null, { status: 200 });
  }

  // =====================================================
  // 3. JIKA NAMA DOBEL
  // =====================================================

  if (
    state ===
    "sw_pilih_anggota"
  ) {
    const pilihan =
      Number(cleanMessage);

    const ids =
      Array.isArray(
        stateData.anggota_ids,
      )
        ? stateData.anggota_ids.map(
            String,
          )
        : [];

    if (
      !Number.isInteger(
        pilihan,
      ) ||
      pilihan < 1 ||
      pilihan > ids.length
    ) {
      await sendAndLog(
        "Pilihan tidak valid. Silahkan kirim nomor pilihan.",

        `invalid-choice-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_invalid_member_choice",
        },
      );

      return new Response(null, { status: 200 });
    }

    const loaded =
      await loadMember(
        ids[pilihan - 1],
      );

    if (!loaded) {
      await saveState(
        "menu",
        {},
      );

      await sendAndLog(
        "Data anggota tidak ditemukan.",

        `member-missing-${
          payload.id ||
          crypto.randomUUID()
        }`,
      );

      return new Response(null, { status: 200 });
    }

    const tunggakan =
      loaded.dueMonths.filter(
        (x) => x.shortfall > 0,
      );

    if (
      tunggakan.length === 0
    ) {
      await saveState(
        "menu",
        {},
      );

      await sendAndLog(
        buildSWReply(
          loaded.anggota,
          loaded.dueMonths,
          false,
        ),

        `sw-${
          loaded.anggota.no_anggota
        }-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_check",

          no_anggota:
            loaded.anggota
              .no_anggota,
        },
      );
    }

    else {
      await saveState(
        "sw_wait_months",
        {
          anggota_id:
            loaded.anggota.id,

          no_anggota:
            loaded.anggota
              .no_anggota,

          nama:
            loaded.anggota
              .nama,

          tunggakan_bulan:
            tunggakan.length,

          tunggakan_rp:
            tunggakan.reduce(
              (sum, x) =>
                sum + x.shortfall,
              0,
            ),
        },
      );

      await sendAndLog(
        buildSWReply(
          loaded.anggota,
          loaded.dueMonths,
          true,
        ),

        `sw-${
          loaded.anggota.no_anggota
        }-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_check",

          no_anggota:
            loaded.anggota
              .no_anggota,
        },
      );
    }

    return new Response(null, { status: 200 });
  }

  // =====================================================
  // 4. SETELAH BOT MEMINTA JUMLAH BULAN
  // =====================================================

  if (
    state ===
    "sw_wait_months"
  ) {
    const jumlahBulan =
      Number(cleanMessage);

    const maxBulan =
      Number(
        stateData.tunggakan_bulan ??
          0,
      );

    if (
      !Number.isInteger(
        jumlahBulan,
      ) ||
      jumlahBulan < 1 ||
      jumlahBulan > maxBulan
    ) {
      await sendAndLog(
        `Jumlah bulan tidak valid. Masukkan angka 1 sampai ${maxBulan}.`,

        `invalid-months-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_invalid_month_count",
        },
      );

      return new Response(null, { status: 200 });
    }

    const nominal =
      jumlahBulan *
      WAJIB_PER_BULAN;

    await saveState(
      "sw_wait_payment",
      {
        anggota_id:
          String(
            stateData.anggota_id,
          ),

        no_anggota:
          String(
            stateData.no_anggota ??
              "",
          ),

        nama:
          String(
            stateData.nama ??
              "",
          ),

        jumlah_bulan:
          jumlahBulan,

        nominal,
      },
    );

    await sendAndLog(
      `Jumlah bulan yang akan dibayar = ${jumlahBulan} bulan\nJumlah yang harus dibayar = ${rupiah(nominal)}\n\nSilahkan masukan nominal pembayaran`,

      `sw-amount-${
        payload.id ||
        crypto.randomUUID()
      }`,

      {
        command:
          "sw_request_payment",

        jumlah_bulan:
          jumlahBulan,

        nominal,
      },
    );

    return new Response(null, { status: 200 });
  }

  // =====================================================
  // 5. SETELAH MENERIMA NOMINAL PEMBAYARAN
  // =====================================================

  if (
    state ===
    "sw_wait_payment"
  ) {
    const paymentInput =
      cleanMessage.replace(
        /[^0-9]/g,
        "",
      );

    const nominal =
      Number(
        stateData.nominal ??
          0,
      );

    const jumlahBulan =
      Number(
        stateData.jumlah_bulan ??
          0,
      );

    const dibayar =
      Number(paymentInput);

    if (
      !Number.isFinite(
        dibayar,
      ) ||
      dibayar !== nominal
    ) {
      await sendAndLog(
        `Nominal pembayaran tidak sesuai.\nJumlah yang harus dibayar = ${rupiah(nominal)}\n\nSilahkan masukan nominal pembayaran`,

        `invalid-payment-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_invalid_payment",

          expected:
            nominal,

          received:
            dibayar,
        },
      );

      return new Response(null, { status: 200 });
    }

    const anggotaId =
      String(
        stateData.anggota_id,
      );

    const loaded =
      await loadMember(
        anggotaId,
      );

    if (!loaded) {
      return json(
        {
          ok: false,
          error:
            "member_data_error",
        },
        500,
      );
    }

    const tunggakan =
      loaded.dueMonths
        .filter(
          (x) =>
            x.shortfall > 0,
        )
        .slice(
          0,
          jumlahBulan,
        );

    if (
      tunggakan.length !==
      jumlahBulan
    ) {
      await saveState(
        "menu",
        {},
      );

      await sendAndLog(
        "Data tunggakan berubah. Silahkan kirim ulang perintah Simpanan Wajib nama anggota.",

        `sw-data-changed-${
          payload.id ||
          crypto.randomUUID()
        }`,

        {
          command:
            "sw_data_changed",
        },
      );

      return new Response(null, { status: 200 });
    }

    // =================================================
    // CATAT PEMBAYARAN
    // BULAN TERTUA TERLEBIH DAHULU
    // =================================================

    for (
      const due of tunggakan
    ) {
      const existing =
        await supabase
          .from(
            "koperasi_simpanan_wajib",
          )
          .select(
            "id, jumlah",
          )
          .eq(
            "anggota_id",
            anggotaId,
          )
          .eq(
            "tahun",
            due.tahun,
          )
          .eq(
            "bulan",
            due.bulan,
          )
          .maybeSingle();

      if (existing.error) {
        return json(
          {
            ok: false,
            error:
              "payment_lookup_error",
          },
          500,
        );
      }

      if (
        existing.data
      ) {
        const currentAmount =
          Number(
            existing.data
              .jumlah ?? 0,
          );

        const newAmount =
          currentAmount +
          due.shortfall;

        const updated =
          await supabase
            .from(
              "koperasi_simpanan_wajib",
            )
            .update({
              jumlah:
                newAmount,
              sumber_transaksi:
                "WA",
            })
            .eq(
              "id",
              existing.data.id,
            );

        if (
          updated.error
        ) {
          return json(
            {
              ok: false,
              error:
                "payment_update_error",
            },
            500,
          );
        }
      }

      else {
        const inserted =
          await supabase
            .from(
              "koperasi_simpanan_wajib",
            )
            .insert({
              anggota_id:
                anggotaId,

              tahun:
                due.tahun,

              bulan:
                due.bulan,

              jumlah:
                due.shortfall,

              sumber_transaksi:
                "WA",
            });

        if (
          inserted.error
        ) {
          return json(
            {
              ok: false,
              error:
                "payment_insert_error",
            },
            500,
          );
        }
      }
    }

    await saveState(
      "menu",
      {},
    );

    // =================================================
    // HITUNG ULANG SETELAH PEMBAYARAN
    // =================================================

    const afterPayment =
      await loadMember(
        anggotaId,
      );

    if (!afterPayment) {
      return json(
        {
          ok: false,
          error:
            "member_data_error_after_payment",
        },
        500,
      );
    }

    const reply =
      buildSWReply(
        afterPayment.anggota,
        afterPayment.dueMonths,
        false,
      );

    await sendAndLog(
      `Pembayaran ${rupiah(dibayar)} berhasil dicatat untuk ${jumlahBulan} bulan.\n${reply}\nTerimakasih Pembayaran Selesai.\nby koperasi LLP kedungneng`,

      `sw-paid-${
        afterPayment.anggota
          .no_anggota
      }-${
        payload.id ||
        crypto.randomUUID()
      }`,

      {
        command:
          "sw_payment_success",

        no_anggota:
          afterPayment
            .anggota
            .no_anggota,

        jumlah_bulan:
          jumlahBulan,

        nominal:
          dibayar,
      },
    );

    return new Response(null, { status: 200 });
  }

  // =====================================================
  // PERINTAH TIDAK DIKENALI
  // =====================================================

  await sendAndLog(
    "Perintah tidak dikenali.\nGunakan format:\nSIMPANAN WAJIB NAMA ANGGOTA",

    `help-${
      payload.id ||
      crypto.randomUUID()
    }`,

    {
      command:
        "unsupported_command",
    },
  );

  return new Response(null, { status: 200 });
});