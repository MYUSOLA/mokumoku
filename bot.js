
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const cors = require("cors");

// =========================
// Supabase設定
// =========================

const SUPABASE_URL = (process.env.SUPABASE_URL || "")
    .replace(/\/+$/, "");

const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error(
        "SUPABASE_URL と SUPABASE_SECRET_KEY を設定してください。"
    );
}

// =========================
// 予定データ
// =========================

let schedules = [];
let lastGeneratedId = 0;

// =========================
// エラーログ
// =========================

function logError(context, error) {
    console.error(`[${context}]`, error);
}

// =========================
// Supabase REST API
// =========================

async function supabaseRequest(path, options = {}) {
    const headers = {
        apikey: SUPABASE_SECRET_KEY,
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${path}`,
        {
            ...options,
            headers
        }
    );

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`Supabase ${response.status}: ${text}`);
    }

    return text ? JSON.parse(text) : null;
}

// =========================
// データベースから予定を読み込む
// =========================

async function loadSchedules() {
    const rows = await supabaseRequest(
        "schedules?select=*&order=date.asc"
    );

    schedules = rows.map(row => ({
        ...row,
        id: Number(row.id),
        date: String(row.date),
        time: row.time || "",
        timeType: row.timeType || "time",
        title: row.title || "",
        person: Array.isArray(row.person) ? row.person : [],
        note: row.note || "",
        announcement: row.announcement !== false,
        announcementMinutes: Number(row.announcementMinutes ?? 30),

        // 公演情報
        event_type: row.event_type || "normal",
        performance_type: row.performance_type || "",
        work_id: row.work_id ?? null,
        work_title: row.work_title || ""
    }));

    console.log(
        `Supabaseから予定を${schedules.length}件読み込みました。`
    );
}
// =========================
// 予定を新規保存
// =========================

async function insertSchedules(items) {
    if (items.length === 0) {
        return [];
    }

    const normalizedItems = items.map(item => ({
        ...item,
        note: item.note || ""
    }));

    return await supabaseRequest(
        "schedules?on_conflict=id",
        {
            method: "POST",
            headers: {
                Prefer: "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify(normalizedItems)
        }
    );
}

// =========================
// 予定を1件更新
// =========================

async function updateScheduleInDatabase(schedule) {
    const normalizedSchedule = {
        ...schedule,
        note: schedule.note || ""
    };

    const rows = await supabaseRequest(
        `schedules?id=eq.${encodeURIComponent(schedule.id)}&select=*`,
        {
            method: "PATCH",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify(normalizedSchedule)
        }
    );

    if (!rows || rows.length === 0) {
        return null;
    }

    return {
        ...rows[0],
        id: Number(rows[0].id),
        person: Array.isArray(rows[0].person)
            ? rows[0].person
            : [],
        note: rows[0].note || ""
    };
}

// =========================
// 予定を1件削除
// =========================

async function deleteScheduleFromDatabase(id) {
    const rows = await supabaseRequest(
        `schedules?id=eq.${encodeURIComponent(id)}&select=*`,
        {
            method: "DELETE",
            headers: {
                Prefer: "return=representation"
            }
        }
    );

    return rows && rows.length > 0 ? rows[0] : null;
}

// =========================
// 一意なIDを作る
// =========================

function createNewId() {
    let id = Math.max(Date.now(), lastGeneratedId + 1);

    while (
        schedules.some(schedule => Number(schedule.id) === id)
    ) {
        id++;
    }

    lastGeneratedId = id;
    return id;
}

// =========================
// 日付変換
// MMDD / YYYYMMDD
// =========================

function parseDateInput(input) {
    const value = String(input).trim();

    let year;
    let month;
    let day;

    if (/^\d{4}$/.test(value)) {
        year = new Date().getFullYear();
        month = Number(value.substring(0, 2));
        day = Number(value.substring(2, 4));
    } else if (/^\d{8}$/.test(value)) {
        year = Number(value.substring(0, 4));
        month = Number(value.substring(4, 6));
        day = Number(value.substring(6, 8));
    } else {
        return null;
    }

    const checkDate = new Date(year, month - 1, day);

    if (
        checkDate.getFullYear() !== year ||
        checkDate.getMonth() !== month - 1 ||
        checkDate.getDate() !== day
    ) {
        return null;
    }

    return (
        `${year}-` +
        `${String(month).padStart(2, "0")}-` +
        `${String(day).padStart(2, "0")}`
    );
}

// =========================
// 時間変換
// =========================

function parseTimeInput(input) {
    const value = String(input).trim();

    const timeTypeMap = {
        "朝": { time: "", timeType: "morning" },
        "昼": { time: "", timeType: "afternoon" },
        "夕方": { time: "", timeType: "evening" },
        "夜": { time: "", timeType: "night" },
        "一日中": { time: "", timeType: "allday" }
    };

    if (timeTypeMap[value]) {
        return timeTypeMap[value];
    }

    let hour;
    let minute;

    if (/^\d{1,2}$/.test(value)) {
        hour = Number(value);
        minute = 0;
    } else if (/^\d{4}$/.test(value)) {
        hour = Number(value.substring(0, 2));
        minute = Number(value.substring(2, 4));
    } else {
        return null;
    }

    if (
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    return {
        time:
            `${String(hour).padStart(2, "0")}:` +
            `${String(minute).padStart(2, "0")}`,
        timeType: "time"
    };
}

// =========================
// 表示用の時間
// =========================

function getDisplayTime(time, timeType) {
    if (timeType === "morning") return "🌅 朝";
    if (timeType === "afternoon") return "☀️ 昼";
    if (timeType === "evening") return "🌆 夕方";
    if (timeType === "night") return "🌙 夜";
    if (timeType === "allday") return "📅 一日中";

    return time || "時間未指定";
}


 // =========================
// 予定をメモリ上でも更新
// =========================

function normalizeSchedule(schedule) {
    return {
        ...schedule,
        id: Number(schedule.id),
        date: String(schedule.date),
        time: schedule.time || "",
        timeType: schedule.timeType || "time",
        title: schedule.title || "",
        person: Array.isArray(schedule.person)
            ? schedule.person
            : [],
        note: schedule.note || "",
        announcement: schedule.announcement !== false,
        announcementMinutes: Number(
            schedule.announcementMinutes ?? 30
        ),

        // 公演情報
        event_type: schedule.event_type || "normal",
        performance_type: schedule.performance_type || "",
        work_id: schedule.work_id ?? null,
        work_title: schedule.work_title || ""
    };
}

function replaceScheduleInMemory(schedule) {
    const index = schedules.findIndex(
        item => Number(item.id) === Number(schedule.id)
    );

    if (index === -1) {
        schedules.push(normalizeSchedule(schedule));
    } else {
        schedules[index] = normalizeSchedule(schedule);
    }
}

function removeScheduleFromMemory(id) {
    const index = schedules.findIndex(
        item => Number(item.id) === Number(id)
    );

    if (index !== -1) {
        schedules.splice(index, 1);
    }
}


// =========================
// Webサーバー
// =========================

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// =========================
// 予定一覧
// =========================

app.get("/schedules", (req, res) => {
    res.json(schedules);
});

// =========================
// メンバー一覧（全端末で共有）
// =========================

app.get("/members", async (req, res) => {
    try {
        const result = await supabaseRequest(
            "site_members?id=eq.1&select=members"
        );

        const members = result?.[0]?.members ?? [];
        res.json(members);
    } catch (error) {
        console.error("メンバー一覧の取得に失敗:", error);
        res.status(500).json({
            error: "メンバー一覧の取得に失敗しました"
        });
    }
});

app.put("/members", async (req, res) => {
    try {
        const input = req.body?.members;

        if (!Array.isArray(input)) {
            return res.status(400).json({
                error: "メンバー一覧の形式が正しくありません"
            });
        }

        const members = [
            ...new Set(
                input
                    .filter(name => typeof name === "string")
                    .map(name => name.trim())
                    .filter(Boolean)
            )
        ];

        const result = await supabaseRequest(
            "site_members?on_conflict=id",
            {
                method: "POST",
                headers: {
                    Prefer: "resolution=merge-duplicates,return=representation"
                },
                body: JSON.stringify([
                    {
                        id: 1,
                        members
                    }
                ])
            }
        );

        res.json({
            members: result?.[0]?.members ?? members
        });
    } catch (error) {
        console.error("メンバー一覧の保存に失敗:", error);
        res.status(500).json({
            error: "メンバー一覧の保存に失敗しました"
        });
    }
});



// =========================
// 作品一覧（Supabaseから取得）
// =========================

app.get("/works", async (req, res) => {
    try {
        const works = await supabaseRequest(
            "performance_works?select=id,name,created_at&order=id.asc"
        );

        res.json(works);
    } catch (error) {
        logError("作品一覧の取得", error);

        res.status(500).json({
            error: "作品一覧の取得に失敗しました"
        });
    }
});

// =========================
// 作品を新規登録
// =========================

app.post("/works", async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim();

        if (!name) {
            return res.status(400).json({
                error: "作品名を入力してください"
            });
        }

        const rows = await supabaseRequest(
            "performance_works?select=id,name,created_at",
            {
                method: "POST",
                headers: {
                    Prefer: "return=representation"
                },
                body: JSON.stringify({
                    name
                })
            }
        );

        if (!rows || rows.length === 0) {
            throw new Error(
                "Supabaseから作品の保存結果が返されませんでした。"
            );
        }

        res.status(201).json(rows[0]);
    } catch (error) {
        logError("作品登録", error);

        const isDuplicate =
            String(error.message).includes("23505");

        res.status(isDuplicate ? 409 : 500).json({
            error: isDuplicate
                ? "同じ名前の作品がすでに登録されています"
                : "作品の登録に失敗しました"
        });
    }
});

// =========================
// 作品名を編集
// =========================

app.put("/works/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const name = String(req.body?.name || "").trim();

        if (
            !Number.isSafeInteger(id) ||
            id <= 0 ||
            !name
        ) {
            return res.status(400).json({
                error: "作品IDまたは作品名が正しくありません"
            });
        }

        const rows = await supabaseRequest(
            `performance_works?id=eq.${id}&select=id,name,created_at`,
            {
                method: "PATCH",
                headers: {
                    Prefer: "return=representation"
                },
                body: JSON.stringify({
                    name
                })
            }
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                error: "作品が見つかりません"
            });
        }

        res.json(rows[0]);
    } catch (error) {
        logError("作品名編集", error);

        const isDuplicate =
            String(error.message).includes("23505");

        res.status(isDuplicate ? 409 : 500).json({
            error: isDuplicate
                ? "同じ名前の作品がすでに登録されています"
                : "作品名の編集に失敗しました"
        });
    }
});



 // =========================
// Webサイトから予定追加
// =========================

app.post("/schedules", async (req, res) => {
    try {
        const body = req.body || {};

        const person = Array.isArray(body.person)
            ? body.person
                .map(name => String(name).trim())
                .filter(name => name !== "")
            : [];

        if (!body.date || !body.title || person.length === 0) {
            return res.status(400).json({
                error: "日付・予定名・参加者が必要です"
            });
        }

        const timeType = body.timeType || "time";

        const newSchedule = {
            id: createNewId(),
            date: String(body.date),
            time: timeType === "time"
                ? String(body.time || "")
                : "",
            timeType,
            title: String(body.title),
            person,
            note: String(body.note || ""),
            announcement: body.announcement !== false,
            announcementMinutes:
                Number.isFinite(Number(body.announcementMinutes))
                    ? Number(body.announcementMinutes)
                    : 30,

            // 公演情報
            event_type: body.event_type || "normal",
            performance_type: body.performance_type || "",
            work_id: body.work_id ?? null,
            work_title: String(body.work_title || "")
        };

        const rows = await insertSchedules([newSchedule]);
        const saved = rows && rows[0];

        if (!saved) {
            throw new Error(
                "Supabaseから保存結果が返されませんでした。"
            );
        }

        replaceScheduleInMemory(saved);

        res.status(201).json({
            message: "予定を追加しました",
            event: normalizeSchedule(saved)
        });
    } catch (error) {
        logError("予定追加", error);

        res.status(500).json({
            error: "予定の保存に失敗しました"
        });
    }
});

// =========================
// Webサイトから予定編集
// =========================

app.put("/schedules/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const index = schedules.findIndex(
            schedule => Number(schedule.id) === id
        );

        if (index === -1) {
            return res.status(404).json({
                error: "予定が見つかりません"
            });
        }

        const body = req.body || {};
        const current = schedules[index];
        const updated = { ...current };

        if (body.date !== undefined) {
            updated.date = String(body.date);
        }

        if (body.time !== undefined) {
            updated.time = String(body.time);
        }

        if (body.timeType !== undefined) {
            updated.timeType = body.timeType;
        }

        if (updated.timeType !== "time") {
            updated.time = "";
        }

        if (body.title !== undefined) {
            updated.title = String(body.title);
        }

        if (Array.isArray(body.person)) {
            updated.person = body.person
                .map(name => String(name).trim())
                .filter(name => name !== "");
        }

        if (body.note !== undefined) {
            updated.note = String(body.note || "");
        }

        if (body.announcement !== undefined) {
            updated.announcement = body.announcement !== false;
        }

        if (body.announcementMinutes !== undefined) {
            const minutes = Number(body.announcementMinutes);

            if (Number.isFinite(minutes)) {
                updated.announcementMinutes = minutes;
            }
        }

        // 公演情報の編集
        if (body.event_type !== undefined) {
            updated.event_type = String(body.event_type || "normal");
        }

        if (body.performance_type !== undefined) {
            updated.performance_type = String(
                body.performance_type || ""
            );
        }

        if (body.work_id !== undefined) {
            updated.work_id = body.work_id === null
                || body.work_id === ""
                ? null
                : Number(body.work_id);
        }

        if (body.work_title !== undefined) {
            updated.work_title = String(body.work_title || "");
        }

        updated.id = current.id;

        const saved = await updateScheduleInDatabase(updated);

        if (!saved) {
            return res.status(404).json({
                error: "データベース上に予定が見つかりません"
            });
        }

        replaceScheduleInMemory(saved);

        res.json({
            message: "予定を編集しました",
            event: normalizeSchedule(saved)
        });
    } catch (error) {
        logError("予定編集", error);

        res.status(500).json({
            error: "予定の保存に失敗しました"
        });
    }
});

// =========================
// Webサイトから予定削除
// =========================

app.delete("/schedules/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const index = schedules.findIndex(
            schedule => Number(schedule.id) === id
        );

        if (index === -1) {
            return res.status(404).json({
                error: "予定が見つかりません"
            });
        }

        const deleted = await deleteScheduleFromDatabase(id);

        if (!deleted) {
            return res.status(404).json({
                error: "データベース上に予定が見つかりません"
            });
        }

        removeScheduleFromMemory(id);

        res.json({
            message: "予定を削除しました",
            event: deleted
        });
    } catch (error) {
        logError("予定削除", error);

        res.status(500).json({
            error: "予定の削除に失敗しました"
        });
    }
});

// =========================
// Discord Bot
// =========================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
    console.log(
        `[Discord] ログイン成功！ ${client.user.tag}`
    );
});

client.on("error", error => {
    logError("Discordクライアント", error);
});

client.on("shardError", error => {
    logError("Discord接続エラー", error);
});

client.on("warn", message => {
    console.warn("[Discord警告]", message);
});


 // =========================
// Discordコマンド
// =========================

client.on("interactionCreate", async interaction => {

    // =========================
    // マダミス作品名の候補表示
    // =========================

    if (interaction.isAutocomplete()) {

        // add-mdms以外の候補表示は処理しない
        if (interaction.commandName !== "add-mdms") {
            return;
        }

        try {
            // 入力中の作品名
            const focusedValue = String(
                interaction.options.getFocused()
            ).toLowerCase();

            // Supabaseから作品一覧を取得
            const works = await supabaseRequest(
                "performance_works?select=id,name&order=id.asc"
            );

            // 入力文字に一致する作品を候補にする
            const filteredWorks = works
                .filter(work =>
                    String(work.name || "")
                        .toLowerCase()
                        .includes(focusedValue)
                )
                .slice(0, 25)
                .map(work => ({
                    name: String(work.name).slice(0, 100),
                    value: String(work.id)
                }));

            await interaction.respond(filteredWorks);

        } catch (error) {
            logError("マダミス作品候補の取得", error);

            await interaction.respond([]).catch(() => {});
        }

        return;
    }

    // =========================
    // チャットコマンド以外は処理しない
    // =========================

    if (!interaction.isChatInputCommand()) {
        return;
    }

    // この下に、共通の返信設定と既存コマンド処理を続ける


    
   
    // =========================
    // コマンド処理・共通設定
    // =========================

    try {
        // コマンドへの返信を非公開にする
        const originalReply = interaction.reply.bind(interaction);

        interaction.reply = options => {
            if (typeof options === "string") {
                return originalReply({
                    content: options,
                    ephemeral: true
                });
            }

            return originalReply({
                ...options,
                ephemeral: true
            });
        };

        // =========================
        // マダミス公演を追加
        // =========================

        if (interaction.commandName === "add-mdms") {
            const dateInput =
                interaction.options.getString("date");

            const timeInput =
                interaction.options.getString("time");

            const workId =
                interaction.options.getString("work");

            const performanceType =
                interaction.options.getString("performance_type");

            const personInput =
                interaction.options.getString("person") || "";

            const note =
                interaction.options.getString("note") || "";

            // 日付を確認
            const parsedDate = parseDateInput(dateInput);

            if (!parsedDate) {
                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で入力してね。"
                );
                return;
            }

            // 時間を確認
            const parsedTime = parseTimeInput(timeInput);

            if (!parsedTime) {
                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );
                return;
            }

            // 公演種別を確認
            if (!["normal", "sale"].includes(performanceType)) {
                await interaction.reply(
                    "公演の種類を選び直してね。"
                );
                return;
            }

            // 登録済み作品を取得
            const works = await supabaseRequest(
                "performance_works?select=id,name&order=id.asc"
            );

            const selectedWork = works.find(
                work => String(work.id) === String(workId)
            );

            if (!selectedWork) {
                await interaction.reply(
                    "作品が見つからなかったよ。サイトで作品登録を確認してね。"
                );
                return;
            }

            // 参加者名を空白で分割
            const personNames = personInput
                .trim()
                .split(/\s+/)
                .filter(Boolean);

            if (personNames.length === 0) {
                await interaction.reply(
                    "参加者を1人以上入力してね。"
                );
                return;
            }

            // 公演予定を作成
            const schedule = {
                id: createNewId(),
                date: parsedDate,
                time: parsedTime.time,
                timeType: parsedTime.timeType,
                title: selectedWork.name,
                person: personNames,
                note,
                announcement: true,
                announcementMinutes: 30,
                event_type: "performance",
                performance_type: performanceType,
                work_id: Number(selectedWork.id),
                work_title: selectedWork.name
            };

            // Supabaseに保存
            const rows = await insertSchedules([schedule]);
            const saved = rows && rows[0];

            if (!saved) {
                throw new Error(
                    "Supabaseから公演予定の保存結果が返されませんでした。"
                );
            }

            // Bot側の予定データも更新
            replaceScheduleInMemory(saved);

            // 登録結果を返信
            await interaction.reply(
                `公演予定を登録したよ！\n\n` +
                `🎭 作品：${selectedWork.name}\n` +
                `📅 日付：${parsedDate}\n` +
                `⏰ 時間：${getDisplayTime(saved.time, saved.timeType)}\n` +
                `🏷️ 種類：${performanceType === "sale" ? "セール公演" : "通常公演"}\n` +
                `👤 参加者：${personNames.join("、")}\n` +
                `📌 備考：${note || "なし"}`
            );

            return;
        }


        // -------------------------
        // 予定追加
        // -------------------------

        if (interaction.commandName === "add-schedule") {
            const dateInput =
                interaction.options.getString("date");
            const timeInput =
                interaction.options.getString("time");
            const personInput =
                interaction.options.getString("person");
            const title =
                interaction.options.getString("title");
            const note =
                interaction.options.getString("note") || "";

            const date = parseDateInput(dateInput);

            if (!date) {
                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で正しく入力してね。"
                );
                return;
            }

            const parsedTime = parseTimeInput(timeInput);

            if (!parsedTime) {
                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );
                return;
            }

            const people = personInput
                .trim()
                .split(/\s+/)
                .filter(name => name !== "");

            if (people.length === 0) {
                await interaction.reply(
                    "参加者を1人以上入力してね。"
                );
                return;
            }

            const newSchedule = {
                id: createNewId(),
                date,
                time: parsedTime.time,
                timeType: parsedTime.timeType,
                title,
                person: people,
                note,
                announcement: true,
                announcementMinutes: 30
            };

            const rows = await insertSchedules([newSchedule]);
            const saved = rows && rows[0];

            if (!saved) {
                throw new Error(
                    "Supabaseから保存結果が返されませんでした。"
                );
            }

            replaceScheduleInMemory(saved);

            await interaction.reply(
                `予定を保存したよ！\n\n` +
                `📅 日付：${date}\n` +
                `⏰ 時間：${getDisplayTime(saved.time, saved.timeType)}\n` +
                `👤 人：${people.join("、")}\n` +
                `📝 内容：${title}\n` +
                `📌 備考：${note || "なし"}`
            );

            return;
        }

        // -------------------------
        // 個人予定をまとめて追加
        // -------------------------

        if (
            interaction.commandName === "add-personal-schedule"
        ) {
            const dateInput =
                interaction.options.getString("date");
            const timeInput =
                interaction.options.getString("time");
            const personInput =
                interaction.options.getString("person");
            const note =
                interaction.options.getString("note") || "";

            const dateInputs = dateInput
                .trim()
                .split(/[,\s]+/)
                .filter(value => value !== "");

            if (dateInputs.length === 0) {
                await interaction.reply(
                    "日付を1つ以上入力してね。"
                );
                return;
            }

            const dates = dateInputs.map(parseDateInput);

            if (dates.some(date => !date)) {
                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で入力してね。"
                );
                return;
            }

            const firstMonth = dates[0].substring(0, 7);

            if (
                !dates.every(
                    date => date.substring(0, 7) === firstMonth
                )
            ) {
                await interaction.reply(
                    "個人予定は同じ月の日付をまとめて入力してね。"
                );
                return;
            }

            const parsedTime = parseTimeInput(timeInput);

            if (!parsedTime) {
                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );
                return;
            }

            const person = personInput.trim();

            if (person === "") {
                await interaction.reply(
                    "個人予定にする人の名前を入力してね。"
                );
                return;
            }

            const newSchedules = dates.map(date => ({
                id: createNewId(),
                date,
                time: parsedTime.time,
                timeType: parsedTime.timeType,
                title: "個人予定",
                person: [person],
                note,
                announcement: true,
                announcementMinutes: 30
            }));

            const rows = await insertSchedules(newSchedules);

            if (!rows || rows.length !== newSchedules.length) {
                throw new Error(
                    "個人予定の保存件数が一致しません。"
                );
            }

            schedules.push(
                ...rows.map(normalizeSchedule)
            );

            let message =
                "📅 個人予定をまとめて登録したよ！\n\n";

            rows.forEach(schedule => {
                message +=
                    `📅 ${schedule.date} ` +
                    `⏰ ${getDisplayTime(schedule.time, schedule.timeType)}\n`;
            });

            message +=
                `👤 ${person}\n` +
                `📝 個人予定\n` +
                `📌 備考：${note || "なし"}`;

            await interaction.reply(message);
            return;
        }

        // -------------------------
        // 予定削除
        // -------------------------

        if (interaction.commandName === "delete-schedule") {
            const dateInput =
                interaction.options.getString("date");
            const timeInput =
                interaction.options.getString("time");
            const title =
                interaction.options.getString("title");

            const date = parseDateInput(dateInput);

            if (!date) {
                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で正しく入力してね。"
                );
                return;
            }

            const parsedTime = parseTimeInput(timeInput);

            if (!parsedTime) {
                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );
                return;
            }

            const matchedSchedules = schedules.filter(schedule =>
                schedule.date === date &&
                schedule.time === parsedTime.time &&
                (schedule.timeType || "time") === parsedTime.timeType &&
                schedule.title === title
            );

            if (matchedSchedules.length === 0) {
                await interaction.reply(
                    "その条件に一致する予定が見つからなかったよ。"
                );
                return;
            }

            if (matchedSchedules.length > 1) {
                await interaction.reply(
                    "同じ日付・時間・内容の予定が複数あるよ。もう少し区別できる情報が必要だよ。"
                );
                return;
            }

            const schedule = matchedSchedules[0];

            const deleted =
                await deleteScheduleFromDatabase(schedule.id);

            if (!deleted) {
                await interaction.reply(
                    "データベース上に予定が見つからず、削除できなかったよ。"
                );
                return;
            }

            removeScheduleFromMemory(schedule.id);

            await interaction.reply(
                `予定を削除したよ！\n\n` +
                `📅 ${schedule.date}\n` +
                `⏰ ${getDisplayTime(schedule.time, schedule.timeType)}\n` +
                `👤 ${schedule.person.join("、")}\n` +
                `📝 ${schedule.title}`
            );

            return;
        }

        // -------------------------
        // 予定の参加者を編集
        // -------------------------

        if (interaction.commandName === "edit-person") {
            const dateInput =
                interaction.options.getString("date");
            const timeInput =
                interaction.options.getString("time");
            const title =
                interaction.options.getString("title");
            const action =
                interaction.options.getString("action");
            const personInput =
                interaction.options.getString("person");

            const date = parseDateInput(dateInput);

            if (!date) {
                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で正しく入力してね。"
                );
                return;
            }

            const parsedTime = parseTimeInput(timeInput);

            if (!parsedTime) {
                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );
                return;
            }

            const matchedSchedules = schedules.filter(schedule =>
                schedule.date === date &&
                schedule.time === parsedTime.time &&
                (schedule.timeType || "time") === parsedTime.timeType &&
                schedule.title === title
            );

            if (matchedSchedules.length === 0) {
                await interaction.reply(
                    "その条件に一致する予定が見つからなかったよ。"
                );
                return;
            }

            if (matchedSchedules.length > 1) {
                await interaction.reply(
                    "同じ日付・時間・内容の予定が複数あるよ。今は区別できないよ。"
                );
                return;
            }

            const schedule = matchedSchedules[0];

            const people = personInput
                .trim()
                .split(/\s+/)
                .filter(name => name !== "");

            const updated = {
                ...schedule,
                person: Array.isArray(schedule.person)
                    ? [...schedule.person]
                    : []
            };

            if (action === "add") {
                for (const person of people) {
                    if (!updated.person.includes(person)) {
                        updated.person.push(person);
                    }
                }
            } else if (action === "remove") {
                updated.person = updated.person.filter(
                    existingPerson => !people.includes(existingPerson)
                );
            } else {
                await interaction.reply(
                    "追加または削除を選んでね。"
                );
                return;
            }

            const saved =
                await updateScheduleInDatabase(updated);

            if (!saved) {
                await interaction.reply(
                    "データベース上に予定が見つからず、変更できなかったよ。"
                );
                return;
            }

            replaceScheduleInMemory(saved);

            const actionText =
                action === "add" ? "追加" : "削除";

            await interaction.reply(
                `予定の参加者を${actionText}したよ！\n\n` +
                `📅 ${saved.date}\n` +
                `⏰ ${getDisplayTime(saved.time, saved.timeType)}\n` +
                `👤 ${saved.person.length > 0 ? saved.person.join("、") : "なし"}\n` +
                `📝 ${saved.title}`
            );

            return;
        }
    } catch (error) {
        logError("Discordコマンド", error);

        const message =
            "データの保存・更新に失敗したよ。少し待ってからもう一度試してね。";

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: message,
                ephemeral: true
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: message,
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// =========================
// 起動
// =========================

async function start() {
    console.log("[起動] 起動処理を開始します。");

    // 1. Supabaseから予定を読み込む
    try {
        console.log(
            "[起動] Supabaseから予定を読み込みます。"
        );

        await loadSchedules();

        console.log(
            "[起動] 予定データの読み込みが完了しました。"
        );
    } catch (error) {
        logError("予定データ読み込み", error);
        process.exitCode = 1;
        return;
    }

    // 2. Webサーバーを起動
    const PORT = process.env.PORT || 3001;

    const server = app.listen(PORT, () => {
        console.log(
            `[Web] 予定表サーバー起動！ Port: ${PORT}`
        );
    });

    server.on("error", error => {
        logError("Webサーバー", error);
    });

    // 3. Discord Botにログイン
    // コマンド登録や独自の診断リクエストは行わない
    const token = process.env.DISCORD_TOKEN;

    if (!token || !token.trim()) {
        console.error(
            "[Discord] DISCORD_TOKEN が未設定です。"
        );

        console.log(
            "[Web] Webサーバーは引き続き起動しています。"
        );

        return;
    }

    console.log("[Discord] ログイン処理を開始します。");

    try {
        await client.login(token);

        console.log(
            "[Discord] ログイン処理が完了しました。"
        );
    } catch (error) {
        logError("Discordログイン", error);

        console.error(
            "[Discord] ログインに失敗しました。"
        );

        console.log(
            "[Web] Webサーバーは引き続き起動しています。"
        );
    }
}

start().catch(error => {
    logError("起動処理", error);
    process.exitCode = 1;
});
