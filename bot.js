const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const cors = require("cors");
const { registerCommands } = require("./deploy-commands");

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
        announcementMinutes: Number(row.announcementMinutes ?? 30)
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
        person: Array.isArray(rows[0].person) ? rows[0].person : [],
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

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
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
            time: timeType === "time" ? String(body.time || "") : "",
            timeType,
            title: String(body.title),
            person,
            note: String(body.note || ""),
            announcement: body.announcement !== false,
            announcementMinutes:
                Number.isFinite(Number(body.announcementMinutes))
                    ? Number(body.announcementMinutes)
                    : 30
        };

        const rows = await insertSchedules([newSchedule]);
        const saved = rows[0];

        if (!saved) {
            throw new Error("Supabaseから保存結果が返りませんでした。");
        }

        schedules.push({
            ...saved,
            id: Number(saved.id),
            person: Array.isArray(saved.person) ? saved.person : [],
            note: saved.note || ""
        });

        res.status(201).json({
            message: "予定を追加しました",
            event: saved
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

        updated.id = current.id;

        const saved = await updateScheduleInDatabase(updated);

        if (!saved) {
            return res.status(404).json({
                error: "データベース上に予定が見つかりません"
            });
        }

        schedules[index] = {
            ...saved,
            id: Number(saved.id),
            person: Array.isArray(saved.person) ? saved.person : [],
            note: saved.note || ""
        };

        res.json({
            message: "予定を編集しました",
            event: schedules[index]
        });
    } catch (error) {
        logError("予定編集", error);

        res.status(500).json({
            error: "予定の保存に
