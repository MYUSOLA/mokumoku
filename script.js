// ============================================================
// もくもく予定表
// JavaScript 全体
// ============================================================


// ============================================================
// 基本設定
// ============================================================

const API_BASE_URL = "https://mokumoku.onrender.com";


// ============================================================
// DOM取得
// ============================================================

// --- 予定追加 ---
const addEventButton =
    document.getElementById("addEventButton");

const addPersonalScheduleButton =
    document.getElementById("addPersonalScheduleButton");

// --- 空き状況 ---
const availabilityViewButton =
    document.getElementById("availabilityViewButton");

const availabilityView =
    document.getElementById("availabilityView");

const availabilityTable =
    document.getElementById("availabilityTable");

const availabilityPeopleFilter =
    document.getElementById("availabilityPeopleFilter");

const peopleCheckboxes =
    document.getElementById("peopleCheckboxes");

// --- 人物 ---
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

// --- 予定入力 ---
const eventTimeType =
    document.getElementById("eventTimeType");

const eventTimeLabel =
    document.getElementById("eventTimeLabel");

const addEventModal =
    document.getElementById("addEventModal");

const closeAddEventModal =
    document.getElementById("closeAddEventModal");

// --- カレンダー ---
const calendar =
    document.getElementById("calendar");

const currentMonth =
    document.getElementById("currentMonth");

const prevMonthButton =
    document.getElementById("prevMonthButton");

const nextMonthButton =
    document.getElementById("nextMonthButton");

const calendarViewButton =
    document.getElementById("calendarViewButton");

const listViewButton =
    document.getElementById("listViewButton");

const listView =
    document.getElementById("listView");

// --- 予定詳細 ---
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

// --- 個人予定 ---
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
    document.getElementById("selectAllPersonalScheduleDates");

const clearAllPersonalScheduleDates =
    document.getElementById("clearAllPersonalScheduleDates");


// ============================================================
// 人物データ
// ============================================================

const PEOPLE_STORAGE_KEY = "mySchedulePeople";

const DEFAULT_PEOPLE = [
    {
        id: "person1",
        name: "A"
    },
    {
        id: "person2",
        name: "B"
    },
    {
        id: "person3",
        name: "C"
    },
    {
        id: "person4",
        name: "D"
    },
    {
        id: "person5",
        name: "E"
    }
];


function savePeople(people) {
    localStorage.setItem(
        PEOPLE_STORAGE_KEY,
        JSON.stringify(people)
    );
}


function getPeople() {
    const saved =
        localStorage.getItem(PEOPLE_STORAGE_KEY);

    if (!saved) {
        savePeople(DEFAULT_PEOPLE);
        return [...DEFAULT_PEOPLE];
    }

    try {
        const people = JSON.parse(saved);

        if (!Array.isArray(people)) {
            savePeople(DEFAULT_PEOPLE);
            return [...DEFAULT_PEOPLE];
        }

        return people;

    } catch (error) {
        console.error(
            "人物データの読み込みに失敗しました:",
            error
        );

        savePeople(DEFAULT_PEOPLE);

        return [...DEFAULT_PEOPLE];
    }
}


function getPersonName(personId) {
    const people = getPeople();

    const person = people.find(
        p => p.id === personId
    );

    return person ? person.name : personId;
}


function getPersonIdByName(name) {
    const people = getPeople();

    const person = people.find(
        p => p.name === name
    );

    return person ? person.id : name;
}


// ============================================================
// サーバーから人物名を同期
// ============================================================

function syncPeopleFromServer(schedules) {

    const people = getPeople();

    let changed = false;

    schedules.forEach(schedule => {

        const names = Array.isArray(schedule.person)
            ? schedule.person
            : [];

        names.forEach(name => {

            if (!name) {
                return;
            }

            const exists = people.some(
                person => person.name === name
            );

            if (!exists) {

                people.push({
                    id:
                        "person_" +
                        Date.now() +
                        "_" +
                        Math.random()
                            .toString(36)
                            .slice(2),

                    name
                });

                changed = true;
            }
        });
    });

    if (changed) {
        savePeople(people);
    }
}


// ============================================================
// 予定データ
// ============================================================

let events = [];

let selectedEvent = null;

let isEditing = false;


// ============================================================
// ★ 現在表示している月
// ============================================================

// ここだけが「現在の月」を管理する場所。
// カレンダー・一覧・空き状況すべてがこれを使う。

const now = new Date();

let year = now.getFullYear();
let month = now.getMonth();


// ============================================================
// ★ 現在の画面
// ============================================================

let currentView = "calendar";


// ============================================================
// ★ 月表示を更新
// ============================================================

function updateMonthDisplay() {

    if (!currentMonth) {
        return;
    }

    currentMonth.textContent =
        `${year}年${month + 1}月`;
}


// ============================================================
// ★ 月を移動
// ============================================================

function changeMonth(diff) {

    month += diff;

    if (month < 0) {
        month = 11;
        year--;
    }

    if (month > 11) {
        month = 0;
        year++;
    }

    // 月表示を先に更新
    updateMonthDisplay();

    // 現在いる画面を再描画
    refreshCurrentView();

    // 個人予定の日付一覧も更新
    updatePersonalScheduleDates();
}


// ============================================================
// 日付関連
// ============================================================

function padNumber(number) {
    return String(number).padStart(2, "0");
}


function getMonthPrefix() {

    return (
        `${year}-${padNumber(month + 1)}-`
    );
}


function isEventInCurrentMonth(event) {

    if (!event || !event.date) {
        return false;
    }

    return event.date.startsWith(
        getMonthPrefix()
    );
}


// ============================================================
// 表示用時刻
// ============================================================

function getDisplayTime(event) {

    if (!event) {
        return "";
    }

    if (event.timeType === "morning") {
        return "朝";
    }

    if (event.timeType === "afternoon") {
        return "昼";
    }

    if (event.timeType === "evening") {
        return "夜";
    }

    if (event.timeType === "night") {
        return "深夜";
    }

    if (event.timeType === "allday") {
        return "終日";
    }

    if (event.time) {
        return event.time;
    }

    return "";
}


// ============================================================
// 現在の画面を再描画
// ============================================================

function refreshCurrentView() {

    // ★ どの画面でも月表示を更新
    updateMonthDisplay();

    if (currentView === "calendar") {

        showCalendar();

        return;
    }

    if (currentView === "list") {

        showList();

        return;
    }

    if (currentView === "availability") {

        renderAvailability();

        return;
    }
}


// ============================================================
// 人物フィルター
// ============================================================

function updatePersonFilter() {

    if (!personFilter) {
        return;
    }

    const people = getPeople();

    const currentValue =
        personFilter.value || "all";

    personFilter.innerHTML = "";

    const allOption =
        document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "全員";

    personFilter.appendChild(allOption);

    people.forEach(person => {

        const option =
            document.createElement("option");

        option.value = person.id;
        option.textContent = person.name;

        personFilter.appendChild(option);
    });

    const stillExists =
        Array.from(personFilter.options)
            .some(option =>
                option.value === currentValue
            );

    if (stillExists) {
        personFilter.value = currentValue;
    } else {
        personFilter.value = "all";
    }
}


// ============================================================
// 空き状況用人物チェックボックス
// ============================================================

function updatePeopleCheckboxes() {

    if (!peopleCheckboxes) {
        return;
    }

    const people = getPeople();

    const checkedIds =
        Array.from(
            peopleCheckboxes.querySelectorAll(
                "input[type='checkbox']:checked"
            )
        ).map(input => input.value);

    peopleCheckboxes.innerHTML = "";

    people.forEach(person => {

        const label =
            document.createElement("label");

        label.style.marginRight = "10px";

        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.value = person.id;

        checkbox.checked =
            checkedIds.length === 0 ||
            checkedIds.includes(person.id);

        checkbox.addEventListener(
            "change",
            renderAvailability
        );

        label.appendChild(checkbox);

        label.appendChild(
            document.createTextNode(
                " " + person.name
            )
        );

        peopleCheckboxes.appendChild(label);
    });
}


// ============================================================
// 個人予定の人物選択
// ============================================================

function updatePersonalSchedulePeople() {

    if (!personalSchedulePerson) {
        return;
    }

    const people = getPeople();

    const currentValue =
        personalSchedulePerson.value;

    personalSchedulePerson.innerHTML = "";

    people.forEach(person => {

        const option =
            document.createElement("option");

        option.value = person.id;
        option.textContent = person.name;

        personalSchedulePerson.appendChild(option);
    });

    if (
        currentValue &&
        people.some(p => p.id === currentValue)
    ) {
        personalSchedulePerson.value =
            currentValue;
    }
}


// ============================================================
// 個人予定の日付一覧
// ============================================================

function updatePersonalScheduleDates() {

    if (!personalScheduleDates) {
        return;
    }

    personalScheduleDates.innerHTML = "";

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
            `${year}-${padNumber(month + 1)}-${padNumber(day)}`;

        const label =
            document.createElement("label");

        label.style.display = "block";

        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.value = date;

        label.appendChild(checkbox);

        label.appendChild(
            document.createTextNode(
                ` ${month + 1}/${day}`
            )
        );

        personalScheduleDates.appendChild(
            label
        );
    }
}


// ============================================================
// 個人予定の日付全選択
// ============================================================

if (selectAllPersonalScheduleDates) {

    selectAllPersonalScheduleDates.addEventListener(
        "click",
        () => {

            const checkboxes =
                personalScheduleDates.querySelectorAll(
                    "input[type='checkbox']"
                );

            checkboxes.forEach(
                checkbox => {
                    checkbox.checked = true;
                }
            );
        }
    );
}


if (clearAllPersonalScheduleDates) {

    clearAllPersonalScheduleDates.addEventListener(
        "click",
        () => {

            const checkboxes =
                personalScheduleDates.querySelectorAll(
                    "input[type='checkbox']"
                );

            checkboxes.forEach(
                checkbox => {
                    checkbox.checked = false;
                }
            );
        }
    );
}


// ============================================================
// 人物追加
// ============================================================

if (addPersonButton) {

    addPersonButton.addEventListener(
        "click",
        () => {

            const name =
                prompt("追加する名前を入力してください");

            if (!name) {
                return;
            }

            const people = getPeople();

            const exists =
                people.some(
                    person => person.name === name
                );

            if (exists) {
                alert("その名前はすでに存在します。");
                return;
            }

            people.push({
                id:
                    "person_" +
                    Date.now(),

                name
            });

            savePeople(people);

            updatePersonFilter();
            updatePeopleCheckboxes();
            updatePersonalSchedulePeople();

            if (peopleModal &&
                peopleModal.style.display !== "none") {

                showPeopleManagement();
            }
        }
    );
}


// ============================================================
// 人物管理
// ============================================================

function showPeopleManagement() {

    if (!peopleManagementList) {
        return;
    }

    const people = getPeople();

    peopleManagementList.innerHTML = "";

    people.forEach(person => {

        const row =
            document.createElement("div");

        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";
        row.style.marginBottom = "8px";

        const name =
            document.createElement("span");

        name.textContent = person.name;

        const deleteButton =
            document.createElement("button");

        deleteButton.textContent = "削除";

        deleteButton.addEventListener(
            "click",
            () => {

                if (
                    !confirm(
                        `${person.name} を削除しますか？`
                    )
                ) {
                    return;
                }

                const newPeople =
                    getPeople().filter(
                        p => p.id !== person.id
                    );

                savePeople(newPeople);

                updatePersonFilter();
                updatePeopleCheckboxes();
                updatePersonalSchedulePeople();

                showPeopleManagement();
            }
        );

        row.appendChild(name);
        row.appendChild(deleteButton);

        peopleManagementList.appendChild(row);
    });
}


if (managePeopleButton) {

    managePeopleButton.addEventListener(
        "click",
        () => {

            showPeopleManagement();

            if (peopleModal) {
                peopleModal.style.display = "block";
            }
        }
    );
}


if (closePeopleModal) {

    closePeopleModal.addEventListener(
        "click",
        () => {

            if (peopleModal) {
                peopleModal.style.display = "none";
            }
        }
    );
}


// ============================================================
// 時刻タイプ変更
// ============================================================

function updateEventTimeInput() {

    if (
        !eventTimeType ||
        !eventTimeLabel
    ) {
        return;
    }

    if (eventTimeType.value === "time") {

        eventTimeLabel.style.display =
            "block";

    } else {

        eventTimeLabel.style.display =
            "none";
    }
}


if (eventTimeType) {

    eventTimeType.addEventListener(
        "change",
        updateEventTimeInput
    );
}


// ============================================================
// 個人予定の時刻タイプ変更
// ============================================================

function updatePersonalScheduleTimeInput() {

    if (
        !personalScheduleTimeType ||
        !personalScheduleTimeLabel
    ) {
        return;
    }

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


if (personalScheduleTimeType) {

    personalScheduleTimeType.addEventListener(
        "change",
        updatePersonalScheduleTimeInput
    );
}


// ============================================================
// 個人予定モーダルを開く
// ============================================================

if (addPersonalScheduleButton) {

    addPersonalScheduleButton.addEventListener(
        "click",
        () => {

            updatePersonalSchedulePeople();

            updatePersonalScheduleDates();

            if (personalScheduleModal) {
                personalScheduleModal.style.display =
                    "block";
            }
        }
    );
}


// ============================================================
// 個人予定モーダルを閉じる
// ============================================================

if (closePersonalScheduleModal) {

    closePersonalScheduleModal.addEventListener(
        "click",
        () => {

            if (personalScheduleModal) {
                personalScheduleModal.style.display =
                    "none";
            }
        }
    );
}


// ============================================================
// 個人予定保存
// ============================================================

if (savePersonalScheduleButton) {

    savePersonalScheduleButton.addEventListener(
        "click",
        async () => {

            const personId =
                personalSchedulePerson.value;

            const personName =
                getPersonName(personId);

            const timeType =
                personalScheduleTimeType.value;

            const time =
                timeType === "time"
                    ? personalScheduleTime.value
                    : "";

            const selectedDates =
                Array.from(
                    personalScheduleDates.querySelectorAll(
                        "input[type='checkbox']:checked"
                    )
                ).map(
                    checkbox => checkbox.value
                );

            if (selectedDates.length === 0) {

                alert(
                    "日付を1つ以上選択してください。"
                );

                return;
            }

            try {

                for (const date of selectedDates) {

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
                                    JSON.stringify({
                                        date,
                                        time,
                                        timeType,
                                        title: "個人予定",
                                        person: [
                                            personName
                                        ]
                                    })
                            }
                        );

                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}`
                        );
                    }
                }

                await loadEventsFromServer();

                if (personalScheduleModal) {
                    personalScheduleModal.style.display =
                        "none";
                }

            } catch (error) {

                console.error(
                    "個人予定の保存に失敗しました:",
                    error
                );

                alert(
                    "個人予定の保存に失敗しました。"
                );
            }
        }
    );
}


// ============================================================
// カレンダー描画
// ============================================================

function showCalendar() {

    if (!calendar) {
        return;
    }

    // ★ 月表示は必ずここでも更新
    updateMonthDisplay();

    calendar.innerHTML = "";

    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    // 空白
    for (
        let i = 0;
        i < firstDay;
        i++
    ) {

        const emptyCell =
            document.createElement("div");

        emptyCell.className =
            "calendar-day empty";

        calendar.appendChild(
            emptyCell
        );
    }

    // 日付
    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dateString =
            `${year}-${padNumber(month + 1)}-${padNumber(day)}`;

        const dayCell =
            document.createElement("div");

        dayCell.className =
            "calendar-day";

        const dateHeader =
            document.createElement("div");

        dateHeader.className =
            "calendar-date";

        dateHeader.textContent =
            day;

        dayCell.appendChild(
            dateHeader
        );

        // ----------------------------------------------------
        // その日の予定
        // ----------------------------------------------------

        const todayEvents =
            events.filter(event => {

                const dateMatches =
                    event.date === dateString;

                const personMatches =
                    selectedPerson === "all" ||
                    event.people.includes(
                        selectedPerson
                    );

                return (
                    dateMatches &&
                    personMatches
                );
            });

        // ----------------------------------------------------
        // 個人予定と通常予定
        // ----------------------------------------------------

        const personalEvents =
            todayEvents.filter(
                event =>
                    event.title === "個人予定"
            );

        const normalEvents =
            todayEvents.filter(
                event =>
                    event.title !== "個人予定"
            );

        // ----------------------------------------------------
        // 通常予定
        // ----------------------------------------------------

        normalEvents.forEach(
            event => {

                const eventElement =
                    document.createElement("div");

                eventElement.className =
                    "calendar-event";

                const peopleText =
                    event.people
                        .map(getPersonName)
                        .join("・");

                const timeText =
                    getDisplayTime(event);

                eventElement.textContent =
                    timeText
                        ? `${timeText} ${event.title}`
                        : event.title;

                if (peopleText) {

                    const peopleElement =
                        document.createElement("span");

                    peopleElement.textContent =
                        ` ${peopleText}`;

                    eventElement.appendChild(
                        peopleElement
                    );
                }

                eventElement.addEventListener(
                    "click",
                    () => {
                        openEventModal(event);
                    }
                );

                dayCell.appendChild(
                    eventElement
                );
            }
        );

        // ----------------------------------------------------
        // 個人予定
        // ----------------------------------------------------

        if (personalEvents.length > 0) {

            const grouped = {};

            personalEvents.forEach(
                event => {

                    const key =
                        `${event.timeType}_${event.time || ""}`;

                    if (!grouped[key]) {
                        grouped[key] = [];
                    }

                    grouped[key].push(event);
                }
            );

            Object.values(grouped).forEach(
                group => {

                    const peopleNames =
                        group
                            .flatMap(
                                event =>
                                    event.people
                            )
                            .map(
                                getPersonName
                            )
                            .filter(
                                (name, index, array) =>
                                    array.indexOf(name) === index
                            );

                    const eventElement =
                        document.createElement("div");

                    eventElement.className =
                        "calendar-event personal-event";

                    const timeText =
                        getDisplayTime(group[0]);

                    eventElement.textContent =
                        timeText
                            ? `${timeText} 個人予定 ${peopleNames.join("・")}`
                            : `個人予定 ${peopleNames.join("・")}`;

                    dayCell.appendChild(
                        eventElement
                    );
                }
            );
        }

        calendar.appendChild(
            dayCell
        );
    }
}


// ============================================================
// 一覧表示
// ============================================================

function showList() {

    if (!listView) {
        return;
    }

    // ★ 一覧でも必ず現在月を表示
    updateMonthDisplay();

    listView.innerHTML = "";

    // ★ 現在表示中の月だけに絞る
    const monthPrefix =
        getMonthPrefix();

    const filteredEvents =
        events
            .filter(event => {

                const monthMatches =
                    event.date &&
                    event.date.startsWith(
                        monthPrefix
                    );

                const personMatches =
                    selectedPerson === "all" ||
                    event.people.includes(
                        selectedPerson
                    );

                return (
                    monthMatches &&
                    personMatches
                );
            })
            .sort(
                (a, b) => {

                    const dateA =
                        `${a.date}_${a.time || ""}`;

                    const dateB =
                        `${b.date}_${b.time || ""}`;

                    return dateA.localeCompare(
                        dateB
                    );
                }
            );

    if (filteredEvents.length === 0) {

        const empty =
            document.createElement("div");

        empty.textContent =
            "この月の予定はありません。";

        listView.appendChild(
            empty
        );

        return;
    }

    filteredEvents.forEach(
        event => {

            const item =
                document.createElement("div");

            item.className =
                "list-event";

            const peopleText =
                event.people
                    .map(getPersonName)
                    .join("・");

            const timeText =
                getDisplayTime(event);

            const dateParts =
                event.date.split("-");

            const dateText =
                `${Number(dateParts[1])}/${Number(dateParts[2])}`;

            item.textContent =
                `${dateText}　`;

            if (timeText) {

                item.textContent +=
                    `${timeText}　`;
            }

            item.textContent +=
                event.title;

            if (peopleText) {

                item.textContent +=
                    `　${peopleText}`;
            }

            item.addEventListener(
                "click",
                () => {
                    openEventModal(event);
                }
            );

            listView.appendChild(
                item
            );
        }
    );
}


// ============================================================
// 空き状況
// ============================================================

function getAvailabilityTimeType(event) {

    if (!event) {
        return [];
    }

    if (event.timeType === "allday") {
        return [
            "昼×",
            "夜×"
        ];
    }

    if (event.timeType === "morning") {
        return [];
    }

    if (event.timeType === "afternoon") {
        return [
            "昼×"
        ];
    }

    if (
        event.timeType === "evening" ||
        event.timeType === "night"
    ) {
        return [
            "夜×"
        ];
    }

    if (event.timeType === "time") {

        if (!event.time) {
            return [];
        }

        const hour =
            Number(
                event.time.split(":")[0]
            );

        if (hour < 11) {
            return [];
        }

        if (hour <= 18) {
            return [
                "昼×"
            ];
        }

        return [
            "夜×"
        ];
    }

    return [];
}


// ============================================================
// 空き状況 人物フィルター
// ============================================================

function renderAvailabilityPeopleFilter() {

    if (!availabilityPeopleFilter) {
        return;
    }

    const people =
        getPeople();

    const oldChecked =
        Array.from(
            availabilityPeopleFilter.querySelectorAll(
                "input[type='checkbox']:checked"
            )
        ).map(
            input => input.value
        );

    availabilityPeopleFilter.innerHTML = "";

    people.forEach(
        person => {

            const label =
                document.createElement("label");

            label.style.marginRight =
                "10px";

            const checkbox =
                document.createElement("input");

            checkbox.type =
                "checkbox";

            checkbox.value =
                person.id;

            checkbox.checked =
                oldChecked.length === 0 ||
                oldChecked.includes(
                    person.id
                );

            checkbox.addEventListener(
                "change",
                renderAvailability
            );

            label.appendChild(
                checkbox
            );

            label.appendChild(
                document.createTextNode(
                    ` ${person.name}`
                )
            );

            availabilityPeopleFilter.appendChild(
                label
            );
        }
    );
}


// ============================================================
// 空き状況描画
// ============================================================

function renderAvailability() {

    if (!availabilityTable) {
        return;
    }

    // ★ 空き状況でも月表示を更新
    updateMonthDisplay();

    renderAvailabilityPeopleFilter();

    availabilityTable.innerHTML = "";

    const people =
        getPeople();

    const checkedPeople =
        Array.from(
            availabilityPeopleFilter
                ? availabilityPeopleFilter.querySelectorAll(
                    "input[type='checkbox']:checked"
                )
                : []
        ).map(
            checkbox => checkbox.value
        );

    const targetPeople =
        checkedPeople.length > 0
            ? people.filter(
                person =>
                    checkedPeople.includes(
                        person.id
                    )
            )
            : people;

    // --------------------------------------------------------
    // ヘッダー
    // --------------------------------------------------------

    const headerRow =
        document.createElement("tr");

    const dateHeader =
        document.createElement("th");

    dateHeader.textContent =
        "日付";

    headerRow.appendChild(
        dateHeader
    );

    targetPeople.forEach(
        person => {

            const th =
                document.createElement("th");

            th.textContent =
                person.name;

            headerRow.appendChild(
                th
            );
        }
    );

    availabilityTable.appendChild(
        headerRow
    );

    // --------------------------------------------------------
    // 現在の月の日付
    // --------------------------------------------------------

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

        const dateString =
            `${year}-${padNumber(month + 1)}-${padNumber(day)}`;

        const row =
            document.createElement("tr");

        const dateCell =
            document.createElement("td");

        dateCell.textContent =
            `${month + 1}/${day}`;

        row.appendChild(
            dateCell
        );

        targetPeople.forEach(
            person => {

                const cell =
                    document.createElement("td");

                const personEvents =
                    events.filter(
                        event => {

                            return (
                                event.date ===
                                    dateString &&
                                event.people.includes(
                                    person.id
                                )
                            );
                        }
                    );

                const unavailable =
                    new Set();

                personEvents.forEach(
                    event => {

                        const types =
                            getAvailabilityTimeType(
                                event
                            );

                        types.forEach(
                            type => {
                                unavailable.add(
                                    type
                                );
                            }
                        );
                    }
                );

                const daytime =
                    document.createElement("span");

                daytime.textContent =
                    unavailable.has("昼×")
                        ? "×"
                        : "○";

                const separator =
                    document.createTextNode(
                        " / "
                    );

                const nighttime =
                    document.createElement("span");

                nighttime.textContent =
                    unavailable.has("夜×")
                        ? "×"
                        : "○";

                cell.appendChild(
                    daytime
                );

                cell.appendChild(
                    separator
                );

                cell.appendChild(
                    nighttime
                );

                row.appendChild(
                    cell
                );
            }
        );

        availabilityTable.appendChild(
            row
        );
    }
}


// ============================================================
// 画面切り替え
// ============================================================

if (calendarViewButton) {

    calendarViewButton.addEventListener(
        "click",
        () => {

            currentView =
                "calendar";

            if (calendar) {
                calendar.style.display =
                    "";
            }

            if (listView) {
                listView.style.display =
                    "none";
            }

            if (availabilityView) {
                availabilityView.style.display =
                    "none";
            }

            refreshCurrentView();
        }
    );
}


if (listViewButton) {

    listViewButton.addEventListener(
        "click",
        () => {

            currentView =
                "list";

            if (calendar) {
                calendar.style.display =
                    "none";
            }

            if (listView) {
                listView.style.display =
                    "";
            }

            if (availabilityView) {
                availabilityView.style.display =
                    "none";
            }

            refreshCurrentView();
        }
    );
}


if (availabilityViewButton) {

    availabilityViewButton.addEventListener(
        "click",
        () => {

            currentView =
                "availability";

            if (calendar) {
                calendar.style.display =
                    "none";
            }

            if (listView) {
                listView.style.display =
                    "none";
            }

            if (availabilityView) {
                availabilityView.style.display =
                    "";
            }

            refreshCurrentView();
        }
    );
}


// ============================================================
// ★ 月移動ボタン
// ============================================================

if (prevMonthButton) {

    prevMonthButton.addEventListener(
        "click",
        () => {
            changeMonth(-1);
        }
    );
}


if (nextMonthButton) {

    nextMonthButton.addEventListener(
        "click",
        () => {
            changeMonth(1);
        }
    );
}


// ============================================================
// 予定追加モーダル
// ============================================================

if (addEventButton) {

    addEventButton.addEventListener(
        "click",
        () => {

            isEditing = false;
            selectedEvent = null;

            if (addEventModal) {
                addEventModal.style.display =
                    "block";
            }

            if (eventTimeType) {
                eventTimeType.value =
                    "time";
            }

            updateEventTimeInput();
        }
    );
}


if (closeAddEventModal) {

    closeAddEventModal.addEventListener(
        "click",
        () => {

            if (addEventModal) {
                addEventModal.style.display =
                    "none";
            }
        }
    );
}


// ============================================================
// 予定詳細モーダル
// ============================================================

function openEventModal(event) {

    selectedEvent = event;
    isEditing = false;

    if (modalTitle) {
        modalTitle.textContent =
            event.title || "";
    }

    if (modalDate) {
        modalDate.textContent =
            event.date || "";
    }

    if (modalTime) {
        modalTime.textContent =
            getDisplayTime(event)
                ? `${getDisplayTime(event)}`
                : "";
    }

    if (modalPeople) {

        modalPeople.textContent =
            event.people
                .map(getPersonName)
                .join("・");
    }

    if (modalNotice) {

        modalNotice.textContent =
            event.announcement === false
                ? "通知なし"
                : "通知あり";
    }

    if (editEventButton) {
        editEventButton.style.display =
            "";
    }

    if (deleteEventButton) {
        deleteEventButton.style.display =
            "";
    }

    if (eventModal) {
        eventModal.style.display =
            "block";
    }
}


// ============================================================
// 詳細モーダルを閉じる
// ============================================================

if (closeModal) {

    closeModal.addEventListener(
        "click",
        () => {

            if (eventModal) {
                eventModal.style.display =
                    "none";
            }
        }
    );
}


// ============================================================
// 編集
// ============================================================

if (editEventButton) {

    editEventButton.addEventListener(
        "click",
        () => {

            if (!selectedEvent) {
                return;
            }

            isEditing = true;

            if (eventModal) {
                eventModal.style.display =
                    "none";
            }

            if (addEventModal) {
                addEventModal.style.display =
                    "block";
            }

            const titleInput =
                document.getElementById(
                    "eventTitle"
                );

            const dateInput =
                document.getElementById(
                    "eventDate"
                );

            const timeInput =
                document.getElementById(
                    "eventTime"
                );

            const peopleContainer =
                document.getElementById(
                    "eventPeople"
                );

            if (titleInput) {
                titleInput.value =
                    selectedEvent.title || "";
            }

            if (dateInput) {
                dateInput.value =
                    selectedEvent.date || "";
            }

            if (eventTimeType) {
                eventTimeType.value =
                    selectedEvent.timeType || "time";
            }

            if (timeInput) {
                timeInput.value =
                    selectedEvent.time || "";
            }

            if (peopleContainer) {

                const checkboxes =
                    peopleContainer.querySelectorAll(
                        "input[type='checkbox']"
                    );

                checkboxes.forEach(
                    checkbox => {

                        checkbox.checked =
                            selectedEvent.people.includes(
                                checkbox.value
                            );
                    }
                );
            }

            updateEventTimeInput();
        }
    );
}


// ============================================================
// 予定保存
// ============================================================

if (saveEventButton) {

    saveEventButton.addEventListener(
        "click",
        async () => {

            const titleInput =
                document.getElementById(
                    "eventTitle"
                );

            const dateInput =
                document.getElementById(
                    "eventDate"
                );

            const timeInput =
                document.getElementById(
                    "eventTime"
                );

            const peopleContainer =
                document.getElementById(
                    "eventPeople"
                );

            const title =
                titleInput
                    ? titleInput.value.trim()
                    : "";

            const date =
                dateInput
                    ? dateInput.value
                    : "";

            const timeType =
                eventTimeType
                    ? eventTimeType.value
                    : "time";

            const time =
                timeType === "time" &&
                timeInput
                    ? timeInput.value
                    : "";

            const selectedPeople =
                peopleContainer
                    ? Array.from(
                        peopleContainer.querySelectorAll(
                            "input[type='checkbox']:checked"
                        )
                    ).map(
                        checkbox =>
                            getPersonName(
                                checkbox.value
                            )
                    )
                    : [];

            if (!title) {

                alert(
                    "タイトルを入力してください。"
                );

                return;
            }

            if (!date) {

                alert(
                    "日付を入力してください。"
                );

                return;
            }

            try {

                const body = {
                    date,
                    time,
                    timeType,
                    title,
                    person: selectedPeople
                };

                let response;

                if (
                    isEditing &&
                    selectedEvent
                ) {

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
                                    JSON.stringify(body)
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
                                    JSON.stringify(body)
                            }
                        );
                }

                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }

                await loadEventsFromServer();

                if (addEventModal) {
                    addEventModal.style.display =
                        "none";
                }

                isEditing = false;
                selectedEvent = null;

            } catch (error) {

                console.error(
                    "予定保存に失敗しました:",
                    error
                );

                alert(
                    "予定の保存に失敗しました。"
                );
            }
        }
    );
}


// ============================================================
// 予定削除
// ============================================================

if (deleteEventButton) {

    deleteEventButton.addEventListener(
        "click",
        async () => {

            if (!selectedEvent) {
                return;
            }

            if (
                !confirm(
                    "この予定を削除しますか？"
                )
            ) {
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
                        `HTTP ${response.status}`
                    );
                }

                await loadEventsFromServer();

                selectedEvent = null;

                if (eventModal) {
                    eventModal.style.display =
                        "none";
                }

            } catch (error) {

                console.error(
                    "予定削除に失敗しました:",
                    error
                );

                alert(
                    "予定の削除に失敗しました。"
                );
            }
        }
    );
}


// ============================================================
// 人物フィルター変更
// ============================================================

if (personFilter) {

    personFilter.addEventListener(
        "change",
        () => {

            refreshCurrentView();
        }
    );
}


// ============================================================
// イベントデータをサーバーから取得
// ============================================================

async function loadEventsFromServer() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/schedules`
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const schedules =
            await response.json();

        // 人物名をローカルに同期
        syncPeopleFromServer(
            schedules
        );

        events =
            schedules.map(
                schedule => {

                    const personNames =
                        Array.isArray(
                            schedule.person
                        )
                            ? schedule.person
                            : [];

                    return {

                        id:
                            schedule.id,

                        date:
                            schedule.date,

                        time:
                            schedule.time || "",

                        timeType:
                            schedule.timeType ||
                            "time",

                        title:
                            schedule.title || "",

                        people:
                            personNames.map(
                                getPersonIdByName
                            ),

                        announcement:
                            schedule.announcement !== false,

                        announcementMinutes:
                            schedule.announcementMinutes ||
                            30
                    };
                }
            );

        updatePersonFilter();
        updatePeopleCheckboxes();
        updatePersonalSchedulePeople();

        // ★ 現在の画面を再描画
        refreshCurrentView();

    } catch (error) {

        console.error(
            "予定の読み込みに失敗しました:",
            error
        );
    }
}


// ============================================================
// 初期化
// ============================================================

// 初期画面
currentView = "calendar";

// 月表示
updateMonthDisplay();

// 人物
updatePersonFilter();
updatePeopleCheckboxes();
updatePersonalSchedulePeople();

// 個人予定の日付
updatePersonalScheduleDates();

// 空き状況を非表示
if (availabilityView) {
    availabilityView.style.display =
        "none";
}

// 一覧を非表示
if (listView) {
    listView.style.display =
        "none";
}

// カレンダー表示
if (calendar) {
    calendar.style.display =
        "";
}

// 時刻入力状態
updateEventTimeInput();
updatePersonalScheduleTimeInput();

// 予定取得
loadEventsFromServer();
