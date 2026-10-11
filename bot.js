const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const cors = require("cors");

// =========================
// Supabase設定
// =========================

const SUPABASE_URL = (process.env.SUPABASE_URL || "")
    .replace(/\/+$/, "");

const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error(
        "SUPABASE_URL と SUPABASE_SECRET_KEY を設定してください。"
    );
}

// =========================
// 予定データ
// =========================

let schedules = [];

// Supabase REST API
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
        throw new Error(
            `Supabase ${response.status}: ${text}`
        );
    }

    return text ? JSON.parse(text) : null;
}

// データベースから予定を読み込む
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
        person: Array.isArray(row.person)
            ? row.person
            : [],
        announcement: row.announcement !== false,
        announcementMinutes:
            Number(row.announcementMinutes ?? 30)
    }));

    console.log(
        `Supabaseから予定を${schedules.length}件読み込みました。`
    );
}

// 予定を新規保存
async function insertSchedules(items) {
    if (items.length === 0) return [];

    return await supabaseRequest(
        "schedules?on_conflict=id",
        {
            method: "POST",
            headers: {
                Prefer:
                    "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify(items)
        }
    );
}

// 予定を1件更新
async function updateScheduleInDatabase(schedule) {
    const rows = await supabaseRequest(
        `schedules?id=eq.${encodeURIComponent(schedule.id)}&select=*`,
        {
            method: "PATCH",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify(schedule)
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
            : []
    };
}

// 予定を1件削除
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


let lastGeneratedId = 0;

// 一意なIDを作る
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


// データベース保存に失敗した場合のログ
function logError(context, error) {
    console.error(`[${context}]`, error);
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
// 予定追加
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
            announcement: body.announcement !== false,
            announcementMinutes:
                Number.isFinite(Number(body.announcementMinutes))
                    ? Number(body.announcementMinutes)
                    : 30
        };

        const rows = await insertSchedules([newSchedule]);
        const saved = rows[0];

        schedules.push({
            ...saved,
            id: Number(saved.id),
            person: Array.isArray(saved.person) ? saved.person : []
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
// 予定編集
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

        schedules[index] = saved;

        res.json({
            message: "予定を編集しました",
            event: saved
        });
    } catch (error) {
        logError("予定編集", error);

        res.status(500).json({
            error: "予定の保存に失敗しました"
        });
    }
});

// =========================
// 予定削除
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

        schedules.splice(index, 1);

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
    console.log(`Bot起動成功！ ${client.user.tag}`);
});

// =========================
// Discordコマンド
// =========================

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        
        // Discordコマンドの返信を本人だけに表示する
        const originalReply = interaction.reply.bind(interaction);

        interaction.reply = (options) => {
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


        
        // -------------------------
        // 予定追加
        // -------------------------

        if (interaction.commandName === "add-schedule") {
            const dateInput = interaction.options.getString("date");
            const timeInput = interaction.options.getString("time");
            const personInput = interaction.options.getString("person");
            const title = interaction.options.getString("title");

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
                await interaction.reply("参加者を1人以上入力してね。");
                return;
            }

            const newSchedule = {
                id: createNewId(),
                date,
                time: parsedTime.time,
                timeType: parsedTime.timeType,
                title,
                person: people,
                announcement: true,
                announcementMinutes: 30
            };

            const rows = await insertSchedules([newSchedule]);
            const saved = rows[0];

            schedules.push({
                ...saved,
                id: Number(saved.id),
                person: Array.isArray(saved.person) ? saved.person : []
            });

            await interaction.reply(
                `予定を保存したよ！\n\n` +
                `📅 日付：${date}\n` +
                `⏰ 時間：${getDisplayTime(saved.time, saved.timeType)}\n` +
                `👤 人：${people.join("、")}\n` +
                `📝 内容：${title}`
            );

            return;
        }

        // -------------------------
        // 個人予定をまとめて追加
        // -------------------------

        if (interaction.commandName === "add-personal-schedule") {
            const dateInput = interaction.options.getString("date");
            const timeInput = interaction.options.getString("time");
            const personInput = interaction.options.getString("person");

            const dateInputs = dateInput
                .trim()
                .split(/[,\s]+/)
                .filter(value => value !== "");

            if (dateInputs.length === 0) {
                await interaction.reply("日付を1つ以上入力してね。");
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

            if (!dates.every(date => date.substring(0, 7) === firstMonth)) {
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
                announcement: true,
                announcementMinutes: 30
            }));

            // 複数件をまとめて保存
            const rows = await insertSchedules(newSchedules);

            schedules.push(
                ...rows.map(row => ({
                    ...row,
                    id: Number(row.id),
                    person: Array.isArray(row.person) ? row.person : []
                }))
            );

            let message = "📅 個人予定をまとめて登録したよ！\n\n";

            rows.forEach(schedule => {
                message +=
                    `📅 ${schedule.date} ` +
                    `⏰ ${getDisplayTime(schedule.time, schedule.timeType)}\n`;
            });

            message += `👤 ${person}\n📝 個人予定`;

            await interaction.reply(message);
            return;
        }

        

        // -------------------------
        // 予定削除
        // -------------------------

        if (interaction.commandName === "delete-schedule") {
            const dateInput = interaction.options.getString("date");
            const timeInput = interaction.options.getString("time");
            const title = interaction.options.getString("title");

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
            const deleted = await deleteScheduleFromDatabase(schedule.id);

            if (!deleted) {
                await interaction.reply(
                    "データベース上に予定が見つからず、削除できなかったよ。"
                );
                return;
            }

            const index = schedules.findIndex(
                item => Number(item.id) === Number(schedule.id)
            );

            if (index !== -1) schedules.splice(index, 1);

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
            const dateInput = interaction.options.getString("date");
            const timeInput = interaction.options.getString("time");
            const title = interaction.options.getString("title");
            const action = interaction.options.getString("action");
            const personInput = interaction.options.getString("person");

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
                await interaction.reply("追加または削除を選んでね。");
                return;
            }

            const saved = await updateScheduleInDatabase(updated);

            if (!saved) {
                await interaction.reply(
                    "データベース上に予定が見つからず、変更できなかったよ。"
                );
                return;
            }

            const index = schedules.findIndex(
                item => Number(item.id) === Number(schedule.id)
            );

            if (index !== -1) schedules[index] = saved;

            const actionText = action === "add" ? "追加" : "削除";

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
// 起動処理
// データ読み込み完了後に起動
// =========================

async function start() {
    try {
        await loadSchedules();

        const PORT = process.env.PORT || 3001;

        app.listen(PORT, () => {
            console.log(`予定表サーバー起動！ Port: ${PORT}`);
        });

        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        logError("起動処理", error);
        process.exit(1);
    }
}

start();
