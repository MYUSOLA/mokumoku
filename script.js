// =========================
// 基本設定
// =========================

const API_BASE_URL = "http://localhost:3001";


// =========================
// DOM取得
// =========================

const addEventButton =
    document.getElementById("addEventButton");

const addPersonalScheduleButton =
    document.getElementById("addPersonalScheduleButton");

const availabilityViewButton =
    document.getElementById("availabilityViewButton");

const availabilityView =
    document.getElementById("availabilityView");

const availabilityTable =
    document.getElementById("availabilityTable");

const availabilityPeopleFilter =
    document.getElementById("availabilityPeopleFilter");

const peopleCheckboxes =
    document.querySelector(".people-checkboxes");

const personFilter =
    document.getElementById("personFilter");

const addPersonButton =
    document.getElementById("addPersonButton");

const managePeopleButton =
    document.getElementById("managePeopleButton");

const peopleModal =
    document.getElementById("peopleModal");

const closePeopleModal =
    document.getElementById("closePeopleModal");

const peopleManagementList =
    document.getElementById("peopleManagementList");

const eventTimeType =
    document.getElementById("eventTimeType");

const eventTimeLabel =
    document.getElementById("eventTimeLabel");

const addEventModal =
    document.getElementById("addEventModal");

const closeAddEventModal =
    document.getElementById("closeAddEventModal");

const calendar =
    document.getElementById("calendar");

const currentMonth =
    document.getElementById("currentMonth");

const prevMonthButton =
    document.getElementById("prevMonth");

const nextMonthButton =
    document.getElementById("nextMonth");

const calendarViewButton =
    document.getElementById("calendarViewButton");

const listViewButton =
    document.getElementById("listViewButton");

const listView =
    document.getElementById("listView");

const eventModal =
    document.getElementById("eventModal");

const closeModal =
    document.getElementById("closeModal");

const modalTitle =
    document.getElementById("modalTitle");

const modalDate =
    document.getElementById("modalDate");

const modalTime =
    document.getElementById("modalTime");

const modalPeople =
    document.getElementById("modalPeople");

const modalNotice =
    document.getElementById("modalNotice");

const saveEventButton =
    document.getElementById("saveEventButton");

const editEventButton =
    document.getElementById("editEventButton");

const deleteEventButton =
    document.getElementById("deleteEventButton");


// =========================
// 個人予定用DOM
// =========================

const personalScheduleModal =
    document.getElementById("personalScheduleModal");

const closePersonalScheduleModal =
    document.getElementById("closePersonalScheduleModal");

const personalSchedulePerson =
    document.getElementById("personalSchedulePerson");

const personalScheduleTimeType =
    document.getElementById("personalScheduleTimeType");

const personalScheduleTimeLabel =
    document.getElementById("personalScheduleTimeLabel");

const personalScheduleTime =
    document.getElementById("personalScheduleTime");

const personalScheduleDates =
    document.getElementById("personalScheduleDates");

const savePersonalScheduleButton =
    document.getElementById("savePersonalScheduleButton");

    const selectAllPersonalScheduleDates =
    document.getElementById(
        "selectAllPersonalScheduleDates"
    );

const clearAllPersonalScheduleDates =
    document.getElementById(
        "clearAllPersonalScheduleDates"
    );

    selectAllPersonalScheduleDates.addEventListener(
    "click",
    () => {

        const checkboxes =
            document.querySelectorAll(
                ".personal-schedule-date-checkbox"
            );

        checkboxes.forEach(
            checkbox => {
                checkbox.checked = true;
            }
        );
    }
);

clearAllPersonalScheduleDates.addEventListener(
    "click",
    () => {

        const checkboxes =
            document.querySelectorAll(
                ".personal-schedule-date-checkbox"
            );

        checkboxes.forEach(
            checkbox => {
                checkbox.checked = false;
            }
        );
    }
);

// =========================
// 人物データ
// =========================

let people = JSON.parse(
    localStorage.getItem("mySchedulePeople")
) || [
    { id: "alice", name: "Aさん" },
    { id: "bob", name: "Bさん" },
    { id: "charlie", name: "Cさん" },
    { id: "david", name: "Dさん" },
    { id: "eve", name: "Eさん" }
];


// =========================
// 予定データ
// =========================

let events = [];

let selectedEvent = null;
let isEditing = false;


// =========================
// 現在の年月
// =========================

const today = new Date();

let year = today.getFullYear();
let month = today.getMonth();


// =========================
// 人物データ保存
// =========================

function savePeople() {

    localStorage.setItem(
        "mySchedulePeople",
        JSON.stringify(people)
    );
}


// =========================
// 人物名を取得
// =========================

function getPersonName(personId) {

    const person =
        people.find(
            person =>
                person.id === personId
        );

    if (person) {
        return person.name;
    }

    return personId;
}


// =========================
// 人物名からIDを取得
// =========================

function getPersonIdByName(personName) {

    const person =
        people.find(
            person =>
                person.name === personName
        );

    if (person) {
        return person.id;
    }

    return personName;
}


// =========================
// 表示用の時間
// =========================

function getDisplayTime(event) {

    if (
        event.timeType === "time" ||
        !event.timeType
    ) {

        return event.time || "";
    }

    const timeTypeNames = {
        morning: "🌅 朝",
        afternoon: "☀️ 昼",
        evening: "🌆 夕方",
        night: "🌙 夜",
        allday: "📅 一日中"
    };

    return (
        timeTypeNames[event.timeType] ||
        ""
    );
}


// =========================
// 現在の画面を更新
// =========================

function refreshCurrentView() {

    if (
        availabilityView.style.display !==
        "none"
    ) {

        renderAvailability();

    } else if (
        !calendar.classList.contains("hidden")
    ) {

        showCalendar();

    } else {

        showList();
    }
}


// =========================
// 人物フィルター更新
// =========================

function updatePersonFilter() {

    const currentValue =
        personFilter.value;

    personFilter.innerHTML = "";

    const allOption =
        document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "全員";

    personFilter.appendChild(
        allOption
    );

    people.forEach(person => {

        const option =
            document.createElement("option");

        option.value =
            person.id;

        option.textContent =
            person.name;

        personFilter.appendChild(
            option
        );
    });

    if (
        people.some(
            person =>
                person.id === currentValue
        )
    ) {

        personFilter.value =
            currentValue;

    } else {

        personFilter.value =
            "all";
    }
}


// =========================
// 予定追加画面の参加者更新
// =========================

function updatePeopleCheckboxes() {

    peopleCheckboxes.innerHTML = "";

    people.forEach(person => {

        const label =
            document.createElement("label");

        label.innerHTML = `
            <input
                type="checkbox"
                value="${person.id}"
            >
            ${person.name}
        `;

        peopleCheckboxes.appendChild(
            label
        );
    });
}


// =========================
// 個人予定の人物選択を更新
// =========================

function updatePersonalSchedulePeople() {

    personalSchedulePerson.innerHTML = "";

    people.forEach(person => {

        const option =
            document.createElement("option");

        option.value =
            person.id;

        option.textContent =
            person.name;

        personalSchedulePerson.appendChild(
            option
        );
    });
}


// =========================
// 個人予定の日付一覧を作る
// =========================

function updatePersonalScheduleDates() {

    personalScheduleDates.innerHTML = "";

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    const weekDays = [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土"
    ];

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const dateObject =
            new Date(
                year,
                month,
                day
            );

        const weekDay =
            weekDays[dateObject.getDay()];

        const label =
            document.createElement("label");

        label.style.display =
            "block";

        label.style.marginBottom =
            "6px";

        label.innerHTML = `
            <input
                type="checkbox"
                value="${date}"
                class="personal-schedule-date-checkbox"
            >
            ${month + 1}/${day}（${weekDay}）
        `;

        personalScheduleDates.appendChild(
            label
        );
    }
}


// =========================
// サーバー側の人を
// カレンダー側へ取り込む
// =========================

function syncPeopleFromServer(serverSchedules) {

    serverSchedules.forEach(
        schedule => {

            const personNames =
                Array.isArray(schedule.person)
                    ? schedule.person
                    : [];

            personNames.forEach(
                personName => {

                    const exists =
                        people.some(
                            person =>
                                person.name ===
                                personName
                        );

                    if (!exists) {

                        people.push({
                            id:
                                "person_" +
                                Date.now() +
                                "_" +
                                Math.random()
                                    .toString(36)
                                    .substring(2, 8),

                            name:
                                personName
                        });
                    }
                }
            );
        }
    );

    savePeople();

    updatePersonFilter();
    updatePeopleCheckboxes();
}


// =========================
// 人を追加
// =========================

addPersonButton.addEventListener(
    "click",
    () => {

        const name =
            prompt(
                "追加する人の名前を入力してください"
            );

        if (!name) {
            return;
        }

        const trimmedName =
            name.trim();

        if (trimmedName === "") {

            alert(
                "名前を入力してください。"
            );

            return;
        }

        const alreadyExists =
            people.some(
                person =>
                    person.name ===
                    trimmedName
            );

        if (alreadyExists) {

            alert(
                "その名前はすでに登録されています。"
            );

            return;
        }

        const newPerson = {
            id:
                "person_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .substring(2, 8),

            name:
                trimmedName
        };

        people.push(
            newPerson
        );

        savePeople();

        updatePersonFilter();
        updatePeopleCheckboxes();
        updatePersonalSchedulePeople();

        alert(
            `${trimmedName}さんを追加しました！`
        );
    }
);


// =========================
// 人物管理画面
// =========================

function showPeopleManagement() {

    peopleManagementList.innerHTML = "";

    people.forEach(person => {

        const personRow =
            document.createElement("div");

        personRow.style.marginBottom =
            "10px";


        const personName =
            document.createElement("span");

        personName.textContent =
            person.name;

        personName.style.marginRight =
            "10px";


        // 名前変更
        const editButton =
            document.createElement("button");

        editButton.textContent =
            "✏️ 名前変更";

        editButton.addEventListener(
            "click",
            () => {

                const newName =
                    prompt(
                        `「${person.name}」の新しい名前を入力してください`,
                        person.name
                    );

                if (newName === null) {
                    return;
                }

                const trimmedName =
                    newName.trim();

                if (trimmedName === "") {

                    alert(
                        "名前を入力してください。"
                    );

                    return;
                }

                const duplicate =
                    people.some(
                        otherPerson =>
                            otherPerson.id !== person.id &&
                            otherPerson.name ===
                                trimmedName
                    );

                if (duplicate) {

                    alert(
                        "その名前はすでに登録されています。"
                    );

                    return;
                }

                person.name =
                    trimmedName;

                savePeople();

                updatePersonFilter();
                updatePeopleCheckboxes();
                updatePersonalSchedulePeople();

                showPeopleManagement();
                refreshCurrentView();
            }
        );


        // 削除
        const deleteButton =
            document.createElement("button");

        deleteButton.textContent =
            "🗑️ 削除";

        deleteButton.style.marginLeft =
            "5px";

        deleteButton.addEventListener(
            "click",
            () => {

                const confirmed =
                    confirm(
                        `「${person.name}」をメンバーから削除しますか？`
                    );

                if (!confirmed) {
                    return;
                }

                people =
                    people.filter(
                        p =>
                            p.id !== person.id
                    );

                savePeople();

                updatePersonFilter();
                updatePeopleCheckboxes();
                updatePersonalSchedulePeople();

                showPeopleManagement();
                refreshCurrentView();
            }
        );


        personRow.appendChild(
            personName
        );

        personRow.appendChild(
            editButton
        );

        personRow.appendChild(
            deleteButton
        );

        peopleManagementList.appendChild(
            personRow
        );
    });
}


// =========================
// 人物管理を開く
// =========================

managePeopleButton.addEventListener(
    "click",
    () => {

        showPeopleManagement();

        peopleModal.classList.remove(
            "hidden"
        );
    }
);


// =========================
// 人物管理を閉じる
// =========================

closePeopleModal.addEventListener(
    "click",
    () => {

        peopleModal.classList.add(
            "hidden"
        );
    }
);


// =========================
// 通常予定の時間タイプ
// =========================

eventTimeType.addEventListener(
    "change",
    () => {

        if (
            eventTimeType.value === "time"
        ) {

            eventTimeLabel.style.display =
                "block";

        } else {

            eventTimeLabel.style.display =
                "none";
        }
    }
);


// =========================
// 個人予定の時間タイプ
// =========================

personalScheduleTimeType.addEventListener(
    "change",
    () => {

        if (
            personalScheduleTimeType.value === "time"
        ) {

            personalScheduleTimeLabel.style.display =
                "block";

        } else {

            personalScheduleTimeLabel.style.display =
                "none";
        }
    }
);


// =========================
// 個人予定追加画面を開く
// =========================

addPersonalScheduleButton.addEventListener(
    "click",
    () => {

        updatePersonalSchedulePeople();

        updatePersonalScheduleDates();

        personalScheduleTimeType.value =
            "time";

        personalScheduleTime.value =
            "";

        personalScheduleTimeLabel.style.display =
            "block";

        personalScheduleModal.classList.remove(
            "hidden"
        );
    }
);


// =========================
// 個人予定追加画面を閉じる
// =========================

closePersonalScheduleModal.addEventListener(
    "click",
    () => {

        personalScheduleModal.classList.add(
            "hidden"
        );
    }
);


// =========================
// 個人予定をまとめて保存
// =========================

savePersonalScheduleButton.addEventListener(
    "click",
    async () => {

        const personId =
            personalSchedulePerson.value;

        const timeType =
            personalScheduleTimeType.value;

        const time =
            personalScheduleTime.value;

        const checkedDates =
            Array.from(
                document.querySelectorAll(
                    ".personal-schedule-date-checkbox:checked"
                )
            ).map(
                checkbox =>
                    checkbox.value
            );


        // 人のチェック
        if (!personId) {

            alert(
                "人を選択してください！"
            );

            return;
        }


        // 日付のチェック
        if (
            checkedDates.length === 0
        ) {

            alert(
                "日付を1つ以上選択してください！"
            );

            return;
        }


        // 時刻指定の場合
        if (
            timeType === "time" &&
            !time
        ) {

            alert(
                "時刻を指定する場合は時間を入力してください！"
            );

            return;
        }


        const personName =
            getPersonName(personId);


        savePersonalScheduleButton.disabled =
            true;


        try {

            for (
                const date of checkedDates
            ) {

                const requestBody = {

                    date:
                        date,

                    time:
                        timeType === "time"
                            ? time
                            : "",

                    timeType:
                        timeType,

                    title:
                        "個人予定",

                    person:
                        [personName]
                };


                const response =
                    await fetch(
                        `${API_BASE_URL}/schedules`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    requestBody
                                )
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `${date} の保存に失敗しました`
                    );
                }
            }


            personalScheduleModal.classList.add(
                "hidden"
            );


            await loadEventsFromServer();


            alert(
                `${checkedDates.length}件の個人予定を登録しました！`
            );


        } catch (error) {

            console.error(
                "個人予定の保存に失敗しました：",
                error
            );

            alert(
                "個人予定の登録中にエラーが発生しました。"
            );

        } finally {

            savePersonalScheduleButton.disabled =
                false;
        }
    }
);


// =========================
// 予定詳細を表示
// =========================

function openEventModal(event) {

    selectedEvent = event;

    modalTitle.textContent =
        event.title;

    modalDate.textContent =
        `📅 ${event.date}`;

    if (
        event.timeType === "time" ||
        !event.timeType
    ) {

        modalTime.textContent =
            `🕐 ${event.time || ""}〜`;

    } else {

        modalTime.textContent =
            getDisplayTime(event);
    }


    modalPeople.innerHTML = "";

    event.people.forEach(
        personId => {

            const personElement =
                document.createElement("li");

            personElement.textContent =
                getPersonName(personId);

            modalPeople.appendChild(
                personElement
            );
        }
    );


    eventModal.classList.remove(
        "hidden"
    );
}


// =========================
// カレンダー表示
// =========================

function showCalendar() {

    calendar.innerHTML = "";

    const weekDays = [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土"
    ];

    weekDays.forEach(day => {

        const element =
            document.createElement("div");

        element.className =
            "day-name";

        element.textContent =
            day;

        calendar.appendChild(
            element
        );
    });


    const firstDay =
        new Date(
            year,
            month,
            1
        );

    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );

    const startDay =
        firstDay.getDay();

    const daysInMonth =
        lastDay.getDate();


    for (
        let i = 0;
        i < startDay;
        i++
    ) {

        const emptyDay =
            document.createElement("div");

        emptyDay.className =
            "day";

        calendar.appendChild(
            emptyDay
        );
    }


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dayElement =
            document.createElement("div");

        dayElement.className =
            "day";


        const numberElement =
            document.createElement("div");

        numberElement.className =
            "day-number";

        numberElement.textContent =
            day;

        dayElement.appendChild(
            numberElement
        );


        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


        const selectedPerson =
            personFilter.value;


        const todayEvents =
            events.filter(
                event => {

                    const dateMatches =
                        event.date ===
                        dateString;

                    const personMatches =
                        selectedPerson === "all" ||
                        event.people.includes(
                            selectedPerson
                        );

                    return (
                        dateMatches &&
                        personMatches
                    );
                }
            );


        // =========================
        // 個人予定をまとめる
        // =========================

        const personalEvents = [];
        const normalEvents = [];

        todayEvents.forEach(
            event => {

                if (
                    event.title ===
                    "個人予定"
                ) {

                    personalEvents.push(
                        event
                    );

                } else {

                    normalEvents.push(
                        event
                    );
                }
            }
        );


        // =========================
        // 通常予定を表示
        // =========================

        normalEvents.forEach(
            event => {

                const eventElement =
                    document.createElement("div");

                eventElement.className =
                    "event";

                eventElement.textContent =
                    `${getDisplayTime(event)} ${event.title}`;

                eventElement.addEventListener(
                    "click",
                    () => {

                        openEventModal(
                            event
                        );
                    }
                );

                dayElement.appendChild(
                    eventElement
                );
            }
        );


        // =========================
        // 個人予定を
        // 同じ時間ごとにまとめる
        // =========================

        const personalGroups = {};

        personalEvents.forEach(
            event => {

                const groupKey =
                    `${event.timeType || "time"}_${event.time || ""}`;

                if (
                    !personalGroups[groupKey]
                ) {

                    personalGroups[groupKey] = [];
                }

                personalGroups[groupKey].push(
                    event
                );
            }
        );


        Object.values(
            personalGroups
        ).forEach(
            group => {

                const eventElement =
                    document.createElement("div");

                eventElement.className =
                    "event personal-schedule-event";


                // 人をまとめる
                const personNames = [];

                group.forEach(
                    event => {

                        event.people.forEach(
                            personId => {

                                const personName =
                                    getPersonName(
                                        personId
                                    );

                                if (
                                    !personNames.includes(
                                        personName
                                    )
                                ) {

                                    personNames.push(
                                        personName
                                    );
                                }
                            }
                        );
                    }
                );


                eventElement.textContent =
                    `${getDisplayTime(group[0])} 個人予定 ${personNames.join("・")}`;


                // クリックしたときは
                // その個人予定の一覧を開く
                eventElement.addEventListener(
                    "click",
                    () => {

                        openEventModal(
                            group[0]
                        );
                    }
                );


                dayElement.appendChild(
                    eventElement
                );
            }
        );


        calendar.appendChild(
            dayElement
        );
    }


    currentMonth.textContent =
        `${year}年${month + 1}月`;
}


// =========================
// 前の月
// =========================

prevMonthButton.addEventListener(
    "click",
    () => {

        month--;

        if (month < 0) {

            month = 11;
            year--;
        }

        refreshCurrentView();
    }
);


// =========================
// 次の月
// =========================

nextMonthButton.addEventListener(
    "click",
    () => {

        month++;

        if (month > 11) {

            month = 0;
            year++;
        }

        refreshCurrentView();
    }
);


// =========================
// 人物フィルター
// =========================

personFilter.addEventListener(
    "change",
    () => {

        refreshCurrentView();
    }
);


// =========================
// 一覧表示
// =========================

function showList() {

    listView.innerHTML = "";

    const selectedPerson =
        personFilter.value;

    const filteredEvents =
        events
            .filter(
                event => {

                    return (
                        selectedPerson === "all" ||
                        event.people.includes(
                            selectedPerson
                        )
                    );
                }
            )
            .sort(
                (a, b) => {

                    const dateCompare =
                        a.date.localeCompare(
                            b.date
                        );

                    if (
                        dateCompare !== 0
                    ) {
                        return dateCompare;
                    }

                    return (
                        (a.time || "")
                            .localeCompare(
                                b.time || ""
                            )
                    );
                }
            );


    filteredEvents.forEach(
        event => {

            const eventElement =
                document.createElement("div");

            eventElement.className =
                "list-event";


            const dateElement =
                document.createElement("div");

            dateElement.className =
                "list-event-date";

            dateElement.textContent =
                `📅 ${event.date} ${getDisplayTime(event)}`;


            const titleElement =
                document.createElement("div");

            titleElement.className =
                "list-event-title";

            titleElement.textContent =
                event.title;


            const peopleElement =
                document.createElement("div");

            peopleElement.className =
                "list-event-people";

            peopleElement.textContent =
                "参加者：" +
                event.people
                    .map(
                        personId =>
                            getPersonName(
                                personId
                            )
                    )
                    .join("、");


            eventElement.appendChild(
                dateElement
            );

            eventElement.appendChild(
                titleElement
            );

            eventElement.appendChild(
                peopleElement
            );


            eventElement.addEventListener(
                "click",
                () => {

                    openEventModal(
                        event
                    );
                }
            );


            listView.appendChild(
                eventElement
            );
        }
    );
}


// =========================
// カレンダー表示ボタン
// =========================

calendarViewButton.addEventListener(
    "click",
    () => {

        calendar.classList.remove(
            "hidden"
        );

        listView.classList.add(
            "hidden"
        );

        availabilityView.style.display =
            "none";

        showCalendar();
    }
);


// =========================
// 一覧表示ボタン
// =========================

listViewButton.addEventListener(
    "click",
    () => {

        calendar.classList.add(
            "hidden"
        );

        listView.classList.remove(
            "hidden"
        );

        availabilityView.style.display =
            "none";

        showList();
    }
);


// =========================
// 空き状況用
// 時間を「朝・昼・夜」に変換
// =========================

function getAvailabilityTimeType(event) {

    // 一日中
    if (
        event.timeType === "allday"
    ) {

        return [
            "昼×",
            "夜×"
        ];
    }


    // 朝
    // 朝は空き状況に表示しない
    if (
        event.timeType === "morning"
    ) {

        return [];
    }


    // 昼
    if (
        event.timeType === "afternoon"
    ) {

        return [
            "昼×"
        ];
    }


    // 夕方・夜
    if (
        event.timeType === "evening" ||
        event.timeType === "night"
    ) {

        return [
            "夜×"
        ];
    }


    // 通常の時刻指定
    if (
        event.timeType === "time" ||
        !event.timeType
    ) {

        if (!event.time) {
            return [];
        }


        const hour =
            parseInt(
                event.time.split(":")[0],
                10
            );


        // 00:00〜10:59
        // 朝扱いなので表示しない
        if (hour < 11) {
            return [];
        }


        // 11:00〜18:59
        // 昼
        if (hour < 19) {

            return [
                "昼×"
            ];
        }


        // 19:00〜23:59
        // 夜
        return [
            "夜×"
        ];
    }


    return [];
}


// =========================
// 空き状況の人物フィルター
// =========================

function renderAvailabilityPeopleFilter() {

    const oldCheckedIds =
        Array.from(
            availabilityPeopleFilter.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        ).map(
            checkbox =>
                checkbox.value
        );

    const hasOldCheckboxes =
        availabilityPeopleFilter.querySelector(
            'input[type="checkbox"]'
        );

    availabilityPeopleFilter.innerHTML = "";

    const title =
        document.createElement("strong");

    title.textContent =
        "表示する人：";

    availabilityPeopleFilter.appendChild(
        title
    );


    people.forEach(
        person => {

            const label =
                document.createElement("label");

            label.style.marginRight =
                "12px";


            const checkbox =
                document.createElement(
                    "input"
                );

            checkbox.type =
                "checkbox";

            checkbox.value =
                person.id;

            checkbox.checked =
                !hasOldCheckboxes ||
                oldCheckedIds.includes(
                    person.id
                );


            checkbox.addEventListener(
                "change",
                () => {

                    renderAvailability();
                }
            );


            label.appendChild(
                checkbox
            );

            label.appendChild(
                document.createTextNode(
                    " " + person.name
                )
            );

            availabilityPeopleFilter.appendChild(
                label
            );
        }
    );
}


// =========================
// 空き状況を表示
// =========================

function renderAvailability() {

    renderAvailabilityPeopleFilter();

    availabilityTable.innerHTML = "";


    const checkedPeopleIds =
        Array.from(
            availabilityPeopleFilter.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        ).map(
            checkbox =>
                checkbox.value
        );


    const table =
        document.createElement("table");

    table.className =
        "availability-table";


    const headerRow =
        document.createElement("tr");


    const dateHeader =
        document.createElement("th");

    dateHeader.textContent =
        "日付";

    headerRow.appendChild(
        dateHeader
    );


    people.forEach(
        person => {

            if (
                !checkedPeopleIds.includes(
                    person.id
                )
            ) {
                return;
            }

            const th =
                document.createElement("th");

            th.textContent =
                person.name;

            headerRow.appendChild(
                th
            );
        }
    );


    table.appendChild(
        headerRow
    );


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


        const row =
            document.createElement("tr");


        const dateCell =
            document.createElement("td");

        dateCell.textContent =
            `${month + 1}/${day}`;

        row.appendChild(
            dateCell
        );


        people.forEach(
            person => {

                if (
                    !checkedPeopleIds.includes(
                        person.id
                    )
                ) {
                    return;
                }


                const cell =
                    document.createElement("td");

                const unavailableTimes =
                    [];


                events.forEach(
                    event => {

                        if (
                            event.date !== date
                        ) {
                            return;
                        }

                        if (
                            !event.people.includes(
                                person.id
                            )
                        ) {
                            return;
                        }


                        const times =
                            getAvailabilityTimeType(
                                event
                            );


                        times.forEach(
                            time => {

                                if (
                                    !unavailableTimes.includes(
                                        time
                                    )
                                ) {

                                    unavailableTimes.push(
                                        time
                                    );
                                }
                            }
                        );
                    }
                );


                cell.textContent =
                    unavailableTimes.join(" ");

                row.appendChild(
                    cell
                );
            }
        );


        table.appendChild(
            row
        );
    }


    availabilityTable.appendChild(
        table
    );
}


// =========================
// 空き状況ボタン
// =========================

availabilityViewButton.addEventListener(
    "click",
    () => {

        calendar.classList.add(
            "hidden"
        );

        listView.classList.add(
            "hidden"
        );

        availabilityView.style.display =
            "block";

        renderAvailability();
    }
);


// =========================
// 詳細画面を閉じる
// =========================

closeModal.addEventListener(
    "click",
    () => {

        eventModal.classList.add(
            "hidden"
        );

        selectedEvent = null;
    }
);


// =========================
// 新規予定追加
// =========================

addEventButton.addEventListener(
    "click",
    () => {

        isEditing = false;
        selectedEvent = null;


        document.getElementById(
            "eventDate"
        ).value = "";

        document.getElementById(
            "eventTime"
        ).value = "";

        document.getElementById(
            "eventTitle"
        ).value = "";


        eventTimeType.value =
            "time";

        eventTimeLabel.style.display =
            "block";


        const checkboxes =
            document.querySelectorAll(
                ".people-checkboxes input[type='checkbox']"
            );


        checkboxes.forEach(
            checkbox => {

                checkbox.checked =
                    false;
            }
        );


        addEventModal.classList.remove(
            "hidden"
        );
    }
);


// =========================
// 予定入力画面を閉じる
// =========================

closeAddEventModal.addEventListener(
    "click",
    () => {

        addEventModal.classList.add(
            "hidden"
        );
    }
);


// =========================
// 編集ボタン
// =========================

editEventButton.addEventListener(
    "click",
    () => {

        if (!selectedEvent) {
            return;
        }


        isEditing = true;


        eventModal.classList.add(
            "hidden"
        );


        document.getElementById(
            "eventDate"
        ).value =
            selectedEvent.date;


        eventTimeType.value =
            selectedEvent.timeType ||
            "time";


        document.getElementById(
            "eventTime"
        ).value =
            selectedEvent.time || "";


        if (
            eventTimeType.value === "time"
        ) {

            eventTimeLabel.style.display =
                "block";

        } else {

            eventTimeLabel.style.display =
                "none";
        }


        document.getElementById(
            "eventTitle"
        ).value =
            selectedEvent.title;


        const checkboxes =
            document.querySelectorAll(
                ".people-checkboxes input[type='checkbox']"
            );


        checkboxes.forEach(
            checkbox => {

                checkbox.checked =
                    selectedEvent.people.includes(
                        checkbox.value
                    );
            }
        );


        addEventModal.classList.remove(
            "hidden"
        );
    }
);


// =========================
// 予定保存
// =========================

saveEventButton.addEventListener(
    "click",
    async () => {

        const wasEditing =
            isEditing &&
            !!selectedEvent;


        const date =
            document.getElementById(
                "eventDate"
            ).value;


        const time =
            document.getElementById(
                "eventTime"
            ).value;


        const title =
            document.getElementById(
                "eventTitle"
            ).value.trim();


        const checkedPeople =
            document.querySelectorAll(
                ".people-checkboxes input[type='checkbox']:checked"
            );


        const checkedPersonIds =
            Array.from(
                checkedPeople
            ).map(
                checkbox =>
                    checkbox.value
            );


        const timeType =
            eventTimeType.value;


        // 入力チェック
        if (
            !date ||
            !title ||
            checkedPersonIds.length === 0
        ) {

            alert(
                "日付・予定名・参加者をすべて入力してください！"
            );

            return;
        }


        if (
            timeType === "time" &&
            !time
        ) {

            alert(
                "時刻を指定する場合は時間を入力してください！"
            );

            return;
        }


        const personNames =
            checkedPersonIds.map(
                personId =>
                    getPersonName(personId)
            );


        const requestBody = {

            date:
                date,

            time:
                timeType === "time"
                    ? time
                    : "",

            timeType:
                timeType,

            title:
                title,

            person:
                personNames
        };


        try {

            let response;


            if (wasEditing) {

                response =
                    await fetch(
                        `${API_BASE_URL}/schedules/${selectedEvent.id}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    requestBody
                                )
                        }
                    );

            } else {

                response =
                    await fetch(
                        `${API_BASE_URL}/schedules`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    requestBody
                                )
                        }
                    );
            }


            if (!response.ok) {

                throw new Error(
                    "予定の保存に失敗しました"
                );
            }


            const result =
                await response.json();


            console.log(
                "サーバーへ予定を保存しました：",
                result
            );


            addEventModal.classList.add(
                "hidden"
            );


            isEditing = false;
            selectedEvent = null;


            await loadEventsFromServer();


            alert(
                wasEditing
                    ? "予定を編集しました！"
                    : "予定を保存しました！"
            );


        } catch (error) {

            console.error(
                "予定の保存に失敗しました：",
                error
            );

            alert(
                "予定をサーバーに保存できませんでした。"
            );
        }
    }
);


// =========================
// 予定削除
// =========================

deleteEventButton.addEventListener(
    "click",
    async () => {

        if (!selectedEvent) {
            return;
        }


        const confirmed =
            confirm(
                "この予定を削除しますか？"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/schedules/${selectedEvent.id}`,
                    {
                        method: "DELETE"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "予定の削除に失敗しました"
                );
            }


            const result =
                await response.json();


            console.log(
                "サーバーから予定を削除しました：",
                result
            );


            selectedEvent = null;


            eventModal.classList.add(
                "hidden"
            );


            await loadEventsFromServer();


            alert(
                "予定を削除しました！"
            );


        } catch (error) {

            console.error(
                "予定の削除に失敗しました：",
                error
            );

            alert(
                "予定をサーバーから削除できませんでした。"
            );
        }
    }
);


// =========================
// サーバーから予定を読み込む
// =========================

async function loadEventsFromServer() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/schedules`
            );


        if (!response.ok) {

            throw new Error(
                "予定データの取得に失敗しました"
            );
        }


        const serverSchedules =
            await response.json();


        if (
            !Array.isArray(serverSchedules)
        ) {

            throw new Error(
                "予定データの形式が正しくありません"
            );
        }


        // サーバー側の人を
        // カレンダー側へ反映
        syncPeopleFromServer(
            serverSchedules
        );


        // サーバーの予定
        // ↓
        // カレンダーの予定へ変換
        events =
            serverSchedules.map(
                schedule => {

                    const personNames =
                        Array.isArray(schedule.person)
                            ? schedule.person
                            : [];


                    return {

                        id:
                            schedule.id,

                        date:
                            schedule.date,

                        time:
                            schedule.time ||
                            "",

                        timeType:
                            schedule.timeType ||
                            "time",

                        title:
                            schedule.title,

                        people:
                            personNames.map(
                                getPersonIdByName
                            ),

                        announcement:
                            schedule.announcement !==
                            false,

                        announcementMinutes:
                            schedule.announcementMinutes ||
                            30
                    };
                }
            );


        refreshCurrentView();


        console.log(
            "サーバーから予定を読み込みました：",
            events
        );


    } catch (error) {

        console.error(
            "予定の読み込みに失敗しました：",
            error
        );

        alert(
            "サーバーから予定を読み込めませんでした。"
        );

        refreshCurrentView();
    }
}


// =========================
// 初期表示
// =========================

availabilityView.style.display =
    "none";

updatePersonFilter();
updatePeopleCheckboxes();
updatePersonalSchedulePeople();

loadEventsFromServer();