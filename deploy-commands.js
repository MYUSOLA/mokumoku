const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [

    // =========================
    // 予定追加
    // =========================

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
                .setDescription("時間（14・1430・朝・昼・夕方・夜・一日中）")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("person")
                .setDescription("予定する人（複数人は空白で区切って入力）")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("予定の内容")
                .setRequired(true)
        )

        .toJSON(),


    // =========================
    // 予定削除
    // =========================

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
                .setDescription("時間（14・1430・朝・昼・夕方・夜・一日中）")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("title")
                .setDescription("予定の内容")
                .setRequired(true)
        )

        .toJSON(),


    // =========================
    // 参加者編集
    // =========================

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
                .setDescription("時間（14・1430・朝・昼・夕方・夜・一日中）")
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
                    {
                        name: "追加",
                        value: "add"
                    },
                    {
                        name: "削除",
                        value: "remove"
                    }
                )
        )

        .addStringOption(option =>
            option
                .setName("person")
                .setDescription("追加・削除する人（複数人は空白で区切る）")
                .setRequired(true)
        )

        .toJSON(),


    // =========================
    // 個人予定をまとめて追加
    // =========================

    new SlashCommandBuilder()
        .setName("add-personal-schedule")
        .setDescription("個人予定を同じ月内の複数日にまとめて追加します")

        .addStringOption(option =>
            option
                .setName("date")
                .setDescription("日付（例：0925 0927 0929）※同じ月")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("time")
                .setDescription("時間（14・1430・朝・昼・夕方・夜・一日中）")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("person")
                .setDescription("個人予定の人")
                .setRequired(true)
        )

        .toJSON(),


    // =========================
    // 予定一覧
    // =========================

    new SlashCommandBuilder()
        .setName("list-schedule")
        .setDescription("予定を一覧表示します")

        .toJSON()
];


const rest =
    new REST({
        version: "10"
    }).setToken(
        process.env.DISCORD_TOKEN
    );


const CLIENT_ID =
    "1551324022711656598";


(async () => {

    try {

        console.log(
            "コマンド登録中..."
        );


        await rest.put(

            Routes.applicationCommands(
                CLIENT_ID
            ),

            {
                body: commands
            }

        );


        console.log(
            "コマンド登録成功！"
        );


    } catch (error) {

        console.error(
            error
        );
    }

})();
