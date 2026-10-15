
const {
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

// =========================
// Discordアプリ設定
// =========================

const CLIENT_ID = "1551324022711656598";

// =========================
// スラッシュコマンド定義
// =========================

const commands = [
    // -------------------------
    // 予定追加
    // -------------------------

    new SlashCommandBuilder()
        .setName("add-schedule")
        .setDescription("予定を追加します")
        .addStringOption(option =>
            option
                .setName("date")
                .setDescription("日付（MMDD または YYYYMMDD）")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("time")
                .setDescription(
                    "時間（14・1430・朝・昼・夕方・夜・一日中）"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("person")
                .setDescription(
                    "予定する人（複数人は空白区切り）"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("予定の内容")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("note")
                .setDescription("備考（任意）")
                .setRequired(false)
        )
        .toJSON(),

    // -------------------------
    // 予定削除
    // -------------------------

    new SlashCommandBuilder()
        .setName("delete-schedule")
        .setDescription("予定を削除します")
        .addStringOption(option =>
            option
                .setName("date")
                .setDescription("日付（MMDD または YYYYMMDD）")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("time")
                .setDescription(
                    "時間（14・1430・朝・昼・夕方・夜・一日中）"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("予定の内容")
                .setRequired(true)
        )
        .toJSON(),

    // -------------------------
    // 参加者の追加・削除
    // -------------------------

    new SlashCommandBuilder()
        .setName("edit-person")
        .setDescription("予定の参加者を追加・削除します")
        .addStringOption(option =>
            option
                .setName("date")
                .setDescription("日付（MMDD または YYYYMMDD）")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("time")
                .setDescription(
                    "時間（14・1430・朝・昼・夕方・夜・一日中）"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("予定の内容")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("action")
                .setDescription("追加するか削除するか")
                .setRequired(true)
                .addChoices(
                    { name: "追加", value: "add" },
                    { name: "削除", value: "remove" }
                )
        )
        .addStringOption(option =>
            option
                .setName("person")
                .setDescription(
                    "追加・削除する人（複数人は空白区切り）"
                )
                .setRequired(true)
        )
        .toJSON(),

    // -------------------------
    // 個人予定の一括追加
    // -------------------------

    new SlashCommandBuilder()
        .setName("add-personal-schedule")
        .setDescription(
            "個人予定を同じ月内の複数日にまとめて追加します"
        )
        .addStringOption(option =>
            option
                .setName("date")
                .setDescription(
                    "日付（例：0925 0927 0929）※同じ月"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("time")
                .setDescription(
                    "時間（14・1430・朝・昼・夕方・夜・一日中）"
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("person")
                .setDescription("個人予定の人")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("note")
                .setDescription("備考（任意・各日に共通）")
                .setRequired(false)
        )
        .toJSON()
];

// =========================
// コマンド登録
// =========================

async function registerCommands() {
    const token = process.env.DISCORD_TOKEN;

    if (!token || !token.trim()) {
        throw new Error(
            "DISCORD_TOKEN が設定されていません。"
        );
    }

    const rest = new REST({
        version: "10"
    }).setToken(token);

    console.log(
        "[Commands] Discordスラッシュコマンド登録を開始します。"
    );

    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        {
            body: commands
        }
    );

    console.log(
        `[Commands] スラッシュコマンド登録成功！ (${commands.length}件)`
    );
}

// =========================
// 外部からの呼び出し
// =========================

module.exports = {
    registerCommands
};

// =========================
// 単独実行時だけ登録する
// =========================

if (require.main === module) {
    registerCommands()
        .then(() => {
            console.log(
                "[Commands] 登録処理が正常に終了しました。"
            );
        })
        .catch(error => {
            console.error(
                "[Commands] スラッシュコマンド登録失敗:",
                error
            );

            process.exitCode = 1;
        });
}
