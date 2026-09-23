const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");


// =========================
// 予定データ
// =========================

const dataPath =
    path.join(__dirname, "schedules.json");

let schedules =
    JSON.parse(
        fs.readFileSync(dataPath, "utf8")
    );


// schedules.jsonが配列ではなかった場合
if (!Array.isArray(schedules)) {
    schedules = [];
}


// =========================
// 保存
// =========================

function saveSchedules() {

    fs.writeFileSync(
        dataPath,
        JSON.stringify(
            schedules,
            null,
            2
        ),
        "utf8"
    );
}


// =========================
// 日付変換
// MMDD
// YYYYMMDD
// =========================

function parseDateInput(input) {

    const value =
        String(input).trim();

    let year;
    let month;
    let day;


    if (
        /^\d{4}$/.test(value)
    ) {

        year =
            new Date().getFullYear();

        month =
            Number(
                value.substring(0, 2)
            );

        day =
            Number(
                value.substring(2, 4)
            );

    } else if (
        /^\d{8}$/.test(value)
    ) {

        year =
            Number(
                value.substring(0, 4)
            );

        month =
            Number(
                value.substring(4, 6)
            );

        day =
            Number(
                value.substring(6, 8)
            );

    } else {

        return null;
    }


    const checkDate =
        new Date(
            year,
            month - 1,
            day
        );


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
// HH
// HHMM
// 朝
// 昼
// 夕方
// 夜
// 一日中
// =========================

function parseTimeInput(input) {

    const value =
        String(input).trim();


    const timeTypeMap = {

        "朝": {
            time: "",
            timeType: "morning"
        },

        "昼": {
            time: "",
            timeType: "afternoon"
        },

        "夕方": {
            time: "",
            timeType: "evening"
        },

        "夜": {
            time: "",
            timeType: "night"
        },

        "一日中": {
            time: "",
            timeType: "allday"
        }
    };


    // -------------------------
    // 時間帯
    // -------------------------

    if (
        timeTypeMap[value]
    ) {

        return timeTypeMap[value];
    }


    // -------------------------
    // 数字の時間
    // -------------------------

    let hour;
    let minute;


    if (
        /^\d{1,2}$/.test(value)
    ) {

        hour =
            Number(value);

        minute =
            0;

    } else if (
        /^\d{4}$/.test(value)
    ) {

        hour =
            Number(
                value.substring(0, 2)
            );

        minute =
            Number(
                value.substring(2, 4)
            );

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

        timeType:
            "time"
    };
}


// =========================
// 表示用の時間
// =========================

function getDisplayTime(
    time,
    timeType
) {

    if (
        timeType === "morning"
    ) {
        return "🌅 朝";
    }

    if (
        timeType === "afternoon"
    ) {
        return "☀️ 昼";
    }

    if (
        timeType === "evening"
    ) {
        return "🌆 夕方";
    }

    if (
        timeType === "night"
    ) {
        return "🌙 夜";
    }

    if (
        timeType === "allday"
    ) {
        return "📅 一日中";
    }

    return (
        time ||
        "時間未指定"
    );
}


// =========================
// Webサーバー
// =========================

const app =
    express();

app.use(
    cors()
);

app.use(
    express.json()
);


// =========================
// カレンダー表示
// =========================
//
// index.html / JS / CSS などを
// Back4appから直接表示できるようにする
//

app.use(
    express.static(__dirname)
);


// =========================
// 予定一覧
// =========================

app.get(
    "/schedules",
    (req, res) => {

        res.json(
            schedules
        );
    }
);


// =========================
// 予定追加
// カレンダーから使用
// =========================

app.post(
    "/schedules",
    (req, res) => {

        const body =
            req.body || {};


        const person =
            Array.isArray(body.person)
                ? body.person
                    .map(
                        name =>
                            String(name).trim()
                    )
                    .filter(
                        name =>
                            name !== ""
                    )
                : [];


        if (
            !body.date ||
            !body.title ||
            person.length === 0
        ) {

            return res.status(400).json({

                error:
                    "日付・予定名・参加者が必要です"

            });
        }


        let newId =
            Date.now();


        while (
            schedules.some(
                schedule =>
                    schedule.id === newId
            )
        ) {

            newId++;
        }


        const timeType =
            body.timeType ||
            "time";


        const time =
            timeType === "time"
                ? String(
                    body.time || ""
                )
                : "";


        const newSchedule = {

            id:
                newId,

            date:
                String(body.date),

            time:
                time,

            timeType:
                timeType,

            title:
                String(body.title),

            person:
                person,

            announcement:
                body.announcement !== false,

            announcementMinutes:
                Number.isFinite(
                    Number(
                        body.announcementMinutes
                    )
                )
                    ? Number(
                        body.announcementMinutes
                    )
                    : 30
        };


        schedules.push(
            newSchedule
        );

        saveSchedules();


        res.status(201).json({

            message:
                "予定を追加しました",

            event:
                newSchedule

        });
    }
);


// =========================
// 予定編集
// =========================

app.put(
    "/schedules/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        const index =
            schedules.findIndex(
                schedule =>
                    schedule.id === id
            );


        if (
            index === -1
        ) {

            return res.status(404).json({

                error:
                    "予定が見つかりません"

            });
        }


        const body =
            req.body || {};


        const current =
            schedules[index];


        const updated =
            {
                ...current
            };


        if (
            body.date !== undefined
        ) {

            updated.date =
                String(
                    body.date
                );
        }


        if (
            body.time !== undefined
        ) {

            updated.time =
                String(
                    body.time
                );
        }


        if (
            body.timeType !== undefined
        ) {

            updated.timeType =
                body.timeType;
        }


        // 時間帯指定なら時刻は空にする
        if (
            updated.timeType !== "time"
        ) {

            updated.time = "";
        }


        if (
            body.title !== undefined
        ) {

            updated.title =
                String(
                    body.title
                );
        }


        if (
            Array.isArray(
                body.person
            )
        ) {

            updated.person =
                body.person
                    .map(
                        name =>
                            String(name).trim()
                    )
                    .filter(
                        name =>
                            name !== ""
                    );
        }


        if (
            body.announcement !== undefined
        ) {

            updated.announcement =
                body.announcement !== false;
        }


        if (
            body.announcementMinutes !== undefined
        ) {

            const minutes =
                Number(
                    body.announcementMinutes
                );


            if (
                Number.isFinite(minutes)
            ) {

                updated.announcementMinutes =
                    minutes;
            }
        }


        // IDは変更しない
        updated.id =
            current.id;


        schedules[index] =
            updated;


        saveSchedules();


        res.json({

            message:
                "予定を編集しました",

            event:
                updated

        });
    }
);


// =========================
// 予定削除
// =========================

app.delete(
    "/schedules/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        const index =
            schedules.findIndex(
                schedule =>
                    schedule.id === id
            );


        if (
            index === -1
        ) {

            return res.status(404).json({

                error:
                    "予定が見つかりません"

            });
        }


        const deletedSchedule =
            schedules[index];


        schedules.splice(
            index,
            1
        );


        saveSchedules();


        res.json({

            message:
                "予定を削除しました",

            event:
                deletedSchedule

        });
    }
);


// =========================
// Webサーバー起動
// =========================

const PORT =
    process.env.PORT || 3001;

app.listen(
    PORT,
    () => {

        console.log(
            `予定表サーバー起動！ Port: ${PORT}`
        );
    }
);


// =========================
// Discord Bot
// =========================

const client =
    new Client({

        intents: [
            GatewayIntentBits.Guilds
        ]

    });


// =========================
// Bot起動
// =========================

client.once(
    "clientReady",
    () => {

        console.log(
            `Bot起動成功！ ${client.user.tag}`
        );
    }
);


// =========================
// Discordコマンド
// =========================

client.on(
    "interactionCreate",
    async interaction => {

        if (
            !interaction.isChatInputCommand()
        ) {

            return;
        }


        // =========================
        // 予定追加
        // =========================

        if (
            interaction.commandName ===
            "add-schedule"
        ) {

            const dateInput =
                interaction.options.getString(
                    "date"
                );

            const timeInput =
                interaction.options.getString(
                    "time"
                );

            const personInput =
                interaction.options.getString(
                    "person"
                );

            const title =
                interaction.options.getString(
                    "title"
                );


            const date =
                parseDateInput(
                    dateInput
                );


            if (!date) {

                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で正しく入力してね。"
                );

                return;
            }


            const parsedTime =
                parseTimeInput(
                    timeInput
                );


            if (!parsedTime) {

                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );

                return;
            }


            const people =
                personInput
                    .trim()
                    .split(/\s+/)
                    .filter(
                        name =>
                            name !== ""
                    );


            if (
                people.length === 0
            ) {

                await interaction.reply(
                    "参加者を1人以上入力してね。"
                );

                return;
            }


            let newId =
                Date.now();


            while (
                schedules.some(
                    schedule =>
                        schedule.id === newId
                )
            ) {

                newId++;
            }


            const newSchedule = {

                id:
                    newId,

                date:
                    date,

                time:
                    parsedTime.time,

                timeType:
                    parsedTime.timeType,

                title:
                    title,

                person:
                    people,

                announcement:
                    true,

                announcementMinutes:
                    30
            };


            schedules.push(
                newSchedule
            );


            saveSchedules();


            await interaction.reply(

                `予定を保存したよ！\n\n` +

                `📅 日付：${date}\n` +

                `⏰ 時間：${getDisplayTime(
                    parsedTime.time,
                    parsedTime.timeType
                )}\n` +

                `👤 人：${people.join("、")}\n` +

                `📝 内容：${title}`

            );


            return;
        }


        // =========================
        // 個人予定をまとめて追加
        // =========================

        if (
            interaction.commandName ===
            "add-personal-schedule"
        ) {

            const dateInput =
                interaction.options.getString(
                    "date"
                );

            const timeInput =
                interaction.options.getString(
                    "time"
                );

            const personInput =
                interaction.options.getString(
                    "person"
                );


            // =========================
            // 日付を分割
            // 空白・カンマ区切りに対応
            // =========================

            const dateInputs =
                dateInput
                    .trim()
                    .split(/[,\s]+/)
                    .filter(
                        value =>
                            value !== ""
                    );


            if (
                dateInputs.length === 0
            ) {

                await interaction.reply(
                    "日付を1つ以上入力してね。"
                );

                return;
            }


            // =========================
            // 日付を変換
            // =========================

            const dates =
                dateInputs.map(
                    input =>
                        parseDateInput(input)
                );


            if (
                dates.some(
                    date =>
                        !date
                )
            ) {

                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で入力してね。"
                );

                return;
            }


            // =========================
            // 同じ月か確認
            // =========================

            const firstMonth =
                dates[0].substring(
                    0,
                    7
                );


            const sameMonth =
                dates.every(
                    date =>
                        date.substring(
                            0,
                            7
                        ) === firstMonth
                );


            if (!sameMonth) {

                await interaction.reply(
                    "個人予定は同じ月の日付をまとめて入力してね。"
                );

                return;
            }


            // =========================
            // 時間を変換
            // =========================

            const parsedTime =
                parseTimeInput(
                    timeInput
                );


            if (!parsedTime) {

                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );

                return;
            }


            // =========================
            // 人
            // =========================

            const person =
                personInput.trim();


            if (
                person === ""
            ) {

                await interaction.reply(
                    "個人予定にする人の名前を入力してね。"
                );

                return;
            }


            // =========================
            // 複数日分の予定を作成
            // =========================

            const newSchedules = [];


            for (
                const date of dates
            ) {

                let newId =
                    Date.now();


                while (
                    schedules.some(
                        schedule =>
                            schedule.id === newId
                    ) ||
                    newSchedules.some(
                        schedule =>
                            schedule.id === newId
                    )
                ) {

                    newId++;
                }


                newSchedules.push({

                    id:
                        newId,

                    date:
                        date,

                    time:
                        parsedTime.time,

                    timeType:
                        parsedTime.timeType,

                    title:
                        "個人予定",

                    person:
                        [person],

                    announcement:
                        true,

                    announcementMinutes:
                        30
                });
            }


            // =========================
            // 保存
            // =========================

            schedules.push(
                ...newSchedules
            );


            saveSchedules();


            // =========================
            // 結果を表示
            // =========================

            let message =
                "📅 個人予定をまとめて登録したよ！\n\n";


            newSchedules.forEach(
                schedule => {

                    message +=
                        `📅 ${schedule.date} ` +
                        `⏰ ${getDisplayTime(
                            schedule.time,
                            schedule.timeType
                        )}\n`;

                }
            );


            message +=
                `👤 ${person}\n` +
                `📝 個人予定`;


            await interaction.reply(
                message
            );


            return;
        }


        // =========================
        // 予定一覧
        // =========================

        if (
            interaction.commandName ===
            "list-schedule"
        ) {

            if (
                schedules.length === 0
            ) {

                await interaction.reply(
                    "登録されている予定はないよ！"
                );

                return;
            }


            let message =
                "📅 登録されている予定\n\n";


            schedules.forEach(
                (schedule, index) => {

                    message +=

                        `【${index + 1}】\n` +

                        `📅 ${schedule.date}\n` +

                        `⏰ ${getDisplayTime(
                            schedule.time,
                            schedule.timeType
                        )}\n` +

                        `👤 ${
                            Array.isArray(
                                schedule.person
                            )
                                ? schedule.person.join("、")
                                : "なし"
                        }\n` +

                        `📝 ${schedule.title}\n` +

                        `🆔 ID：${schedule.id}\n\n`;
                }
            );


            await interaction.reply(
                message
            );


            return;
        }


        // =========================
        // 予定削除
        // ID不要
        // =========================

        if (
            interaction.commandName ===
            "delete-schedule"
        ) {

            const dateInput =
                interaction.options.getString(
                    "date"
                );

            const timeInput =
                interaction.options.getString(
                    "time"
                );

            const title =
                interaction.options.getString(
                    "title"
                );


            const date =
                parseDateInput(
                    dateInput
                );


            if (!date) {

                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で正しく入力してね。"
                );

                return;
            }


            const parsedTime =
                parseTimeInput(
                    timeInput
                );


            if (!parsedTime) {

                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );

                return;
            }


            const matchedSchedules =
                schedules.filter(
                    schedule =>

                        schedule.date ===
                            date &&

                        schedule.time ===
                            parsedTime.time &&

                        (
                            schedule.timeType ||
                            "time"
                        ) ===
                            parsedTime.timeType &&

                        schedule.title ===
                            title
                );


            if (
                matchedSchedules.length === 0
            ) {

                await interaction.reply(
                    "その条件に一致する予定が見つからなかったよ。"
                );

                return;
            }


            if (
                matchedSchedules.length > 1
            ) {

                await interaction.reply(
                    "同じ日付・時間・内容の予定が複数あるよ。もう少し区別できる情報が必要だよ。"
                );

                return;
            }


            const schedule =
                matchedSchedules[0];


            const index =
                schedules.findIndex(
                    item =>
                        item.id ===
                        schedule.id
                );


            schedules.splice(
                index,
                1
            );


            saveSchedules();


            await interaction.reply(

                `予定を削除したよ！\n\n` +

                `📅 ${schedule.date}\n` +

                `⏰ ${getDisplayTime(
                    schedule.time,
                    schedule.timeType
                )}\n` +

                `👤 ${schedule.person.join("、")}\n` +

                `📝 ${schedule.title}`

            );


            return;
        }


        // =========================
        // 予定の人を編集
        // =========================

        if (
            interaction.commandName ===
            "edit-person"
        ) {

            const dateInput =
                interaction.options.getString(
                    "date"
                );

            const timeInput =
                interaction.options.getString(
                    "time"
                );

            const title =
                interaction.options.getString(
                    "title"
                );

            const action =
                interaction.options.getString(
                    "action"
                );

            const personInput =
                interaction.options.getString(
                    "person"
                );


            const date =
                parseDateInput(
                    dateInput
                );


            if (!date) {

                await interaction.reply(
                    "日付は「0925」または「20260925」の形式で正しく入力してね。"
                );

                return;
            }


            const parsedTime =
                parseTimeInput(
                    timeInput
                );


            if (!parsedTime) {

                await interaction.reply(
                    "時間は「14」「1430」「朝」「昼」「夕方」「夜」「一日中」の形式で入力してね。"
                );

                return;
            }


            const matchedSchedules =
                schedules.filter(
                    schedule =>

                        schedule.date ===
                            date &&

                        schedule.time ===
                            parsedTime.time &&

                        (
                            schedule.timeType ||
                            "time"
                        ) ===
                            parsedTime.timeType &&

                        schedule.title ===
                            title
                );


            if (
                matchedSchedules.length === 0
            ) {

                await interaction.reply(
                    "その条件に一致する予定が見つからなかったよ。"
                );

                return;
            }


            if (
                matchedSchedules.length > 1
            ) {

                await interaction.reply(
                    "同じ日付・時間・内容の予定が複数あるよ。今は区別できないよ。"
                );

                return;
            }


            const schedule =
                matchedSchedules[0];


            const people =
                personInput
                    .trim()
                    .split(/\s+/)
                    .filter(
                        name =>
                            name !== ""
                    );


            if (
                action === "add"
            ) {

                for (
                    const person of people
                ) {

                    if (
                        !schedule.person.includes(
                            person
                        )
                    ) {

                        schedule.person.push(
                            person
                        );
                    }
                }

            } else if (
                action === "remove"
            ) {

                schedule.person =
                    schedule.person.filter(
                        existingPerson =>
                            !people.includes(
                                existingPerson
                            )
                    );

            } else {

                await interaction.reply(
                    "追加または削除を選んでね。"
                );

                return;
            }


            saveSchedules();


            const actionText =
                action === "add"
                    ? "追加"
                    : "削除";


            await interaction.reply(

                `予定の参加者を${actionText}したよ！\n\n` +

                `📅 ${schedule.date}\n` +

                `⏰ ${getDisplayTime(
                    schedule.time,
                    schedule.timeType
                )}\n` +

                `👤 ${
                    schedule.person.length > 0
                        ? schedule.person.join("、")
                        : "なし"
                }\n` +

                `📝 ${schedule.title}`

            );


            return;
        }
    }
);


// =========================
// Botログイン
// =========================

client.login(
    process.env.DISCORD_TOKEN
);
