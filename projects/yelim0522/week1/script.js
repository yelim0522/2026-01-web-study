// 일정을 저장할 객체 (형식: { "2026-01-15": ["회의", "워크숍"] })
const schedules = {};
let currentDate = new Date();

// DOM 요소 선택
const addBtn = document.getElementById("add-btn");
const addModal = document.getElementById("add-modal");
const saveBtn = document.getElementById("save-schedule");
const cancelBtn = document.getElementById("cancel-schedule");
const newDateInput = document.getElementById("new-date");
const newTitleInput = document.getElementById("new-title");

const monthYearTxt = document.getElementById("month-year");
const daysContainer = document.getElementById("calendar-days");
const prevBtn = document.getElementById("prev-month");
const nextBtn = document.getElementById("next-month");

const schedulePanel = document.getElementById("schedule-panel");
const selectedDateTitle = document.getElementById("selected-date-title");
const scheduleList = document.getElementById("schedule-list");
const closePanelBtn = document.getElementById("close-panel");

const editModal = document.getElementById("edit-modal");
const editTitleInput = document.getElementById("edit-title");
const saveEditBtn = document.getElementById("save-edit-schedule");
const cancelEditBtn = document.getElementById("cancel-edit-schedule");
let editingDate = null;
let editingIndex = null;

// 캘린더 그리기 함수
function renderCalendar() {
  daysContainer.innerHTML = "";
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYearTxt.textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 1일 이전의 빈 칸 채우기
  for (let i = 0; i < firstDay; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.style.visibility = "hidden";
    daysContainer.appendChild(emptyDiv);
  }

  // 날짜 및 일정 표시
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDiv = document.createElement("div");
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

    const dateNum = document.createElement("div");
    dateNum.className = "date-num";
    dateNum.textContent = i;

    // 일요일, 토요일 색상 지정
    const dayOfWeek = new Date(year, month, i).getDay();
    if (dayOfWeek === 0) dateNum.classList.add("sun");
    if (dayOfWeek === 6) dateNum.classList.add("sat");

    dayDiv.appendChild(dateNum);

    // 해당 날짜에 일정이 있다면 캘린더 칸 안에 배지로 표시
    if (schedules[dateStr]) {
      const daySchedules = schedules[dateStr];
      const maxSchedules = 5;
      const displaySchedules = daySchedules.slice(0, maxSchedules);

      displaySchedules.forEach((sched) => {
        const badge = document.createElement("div");
        badge.className = "schedule-badge";
        badge.textContent = sched;
        dayDiv.appendChild(badge);
      });

      if (daySchedules.length > maxSchedules) {
        const moreText = document.createElement("div");
        moreText.className = "more-text";
        moreText.textContent = "더보기";
        dayDiv.appendChild(moreText);
      }
    }

    // 날짜 클릭 시 일정 탭 열기
    dayDiv.addEventListener("click", () => openSchedulePanel(dateStr));
    daysContainer.appendChild(dayDiv);
  }
}

// 일정 목록 탭 열기 함수
function openSchedulePanel(dateStr) {
  schedulePanel.classList.remove("hidden");
  selectedDateTitle.textContent = `${dateStr} 일정`;
  scheduleList.innerHTML = "";

  const daySchedules = schedules[dateStr] || [];
  if (daySchedules.length === 0) {
    scheduleList.innerHTML = "<li>등록된 일정이 없습니다.</li>";
  } else {
    daySchedules.forEach((sched, index) => {
      const li = document.createElement("li");

      const textSpan = document.createElement("span");
      textSpan.className = "schedule-text";
      textSpan.textContent = sched;

      const btnDiv = document.createElement("div");
      btnDiv.className = "action-btns";

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "수정";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        openEditModal(dateStr, index, sched);
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "삭제";
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteSchedule(dateStr, index);
      };

      btnDiv.appendChild(editBtn);
      btnDiv.appendChild(deleteBtn);

      li.appendChild(textSpan);
      li.appendChild(btnDiv);
      scheduleList.appendChild(li);
    });
  }
}

function deleteSchedule(dateStr, index) {
  if (confirm("정말 이 일정을 삭제하시겠습니까?")) {
    schedules[dateStr].splice(index, 1);
    if (schedules[dateStr].length === 0) {
      delete schedules[dateStr];
    }
    openSchedulePanel(dateStr);
    renderCalendar();
  }
}

function openEditModal(dateStr, index, currentTitle) {
  editingDate = dateStr;
  editingIndex = index;
  editTitleInput.value = currentTitle;
  editModal.classList.remove("hidden");
}

// 이벤트 리스너 설정
prevBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});
nextBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});
closePanelBtn.addEventListener("click", () =>
  schedulePanel.classList.add("hidden"),
);
cancelBtn.addEventListener("click", () => addModal.classList.add("hidden"));

addBtn.addEventListener("click", () => {
  newDateInput.value = "";
  newTitleInput.value = "";
  addModal.classList.remove("hidden");
});

saveBtn.addEventListener("click", () => {
  const dateStr = newDateInput.value;
  const title = newTitleInput.value.trim();

  if (!dateStr || !title) return alert("날짜와 내용을 모두 입력해주세요.");

  if (!schedules[dateStr]) schedules[dateStr] = [];
  schedules[dateStr].push(title);
  addModal.classList.add("hidden");
  renderCalendar();
  if (
    !schedulePanel.classList.contains("hidden") &&
    selectedDateTitle.textContent.startsWith(dateStr)
  )
    openSchedulePanel(dateStr);
});

saveEditBtn.addEventListener("click", () => {
  const newTitle = editTitleInput.value.trim();
  if (!newTitle) return alert("내용을 입력해주세요.");

  schedules[editingDate][editingIndex] = newTitle;
  editModal.classList.add("hidden");
  openSchedulePanel(editingDate);
  renderCalendar();
});
cancelEditBtn.addEventListener("click", () =>
  editModal.classList.add("hidden"),
);

// 초기 캘린더 렌더링
renderCalendar();
