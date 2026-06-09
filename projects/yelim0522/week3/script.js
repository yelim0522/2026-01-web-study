// 0. Supabase 초기화
// TODO: Supabase 프로젝트 설정(Settings > API)에서 URL과 anon key(eyJ...)를 정확히 복사해 넣어주세요.
const SUPABASE_URL = "https://hlxjdgymzujrsvuswwop.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhseGpkZ3ltenVqcnN2dXN3d29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzkxODcsImV4cCI6MjA5MzcxNTE4N30.4wBUZOu0pMF0jt4LQf-hnDWxeI_KAX9BmAQGTkPJBDM";

let supabaseClient = null;
try {
  // URL이 설정되어 있고 라이브러리가 로드되었을 때만 초기화
  if (window.supabase && SUPABASE_URL.startsWith("https")) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase 초기화 시도 중...");
  } else {
    console.warn("Supabase URL이 설정되지 않았습니다. 로컬 모드로 작동합니다.");
  }
} catch (e) {
  console.error("Supabase 클라이언트 초기화 중 오류 발생:", e);
}

// DOM 요소 선택
const timetable = document.getElementById("timetable");
if (!timetable) {
  console.error("시간표 요소를 찾을 수 없습니다. HTML 구조를 확인해주세요.");
}

const addBtn = document.getElementById("add-btn");
const addModal = document.getElementById("add-modal");
const cancelBtn = document.getElementById("cancel-btn");
const saveBtn = document.getElementById("save-btn");

// 1. 뼈대 잡기: 시간표 그리드 생성
function renderTimetableGrid() {
  if (!timetable) return;
  timetable.innerHTML = ""; // 기존 그리드 초기화
  const days = ["일", "월", "화", "수", "목", "금", "토"];

  // 좌측 상단 빈 칸
  const emptyCorner = document.createElement("div");
  emptyCorner.className = "grid-header";
  timetable.appendChild(emptyCorner);

  // 요일 헤더 생성 (가로축)
  days.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "grid-header";
    dayHeader.textContent = day;
    // 일요일은 빨간색, 토요일은 파란색
    if (day === "일") dayHeader.style.color = "#a0522d"; /* 차분한 테라코타 */
    if (day === "토") dayHeader.style.color = "#5a7a91"; /* 차분한 스틸 블루 */
    timetable.appendChild(dayHeader);
  });

  // 24시간 세로축 및 빈 칸 생성
  for (let hour = 0; hour < 24; hour++) {
    // 시간 라벨 (예: 9:00)
    const timeLabel = document.createElement("div");
    timeLabel.className = "time-label";
    timeLabel.textContent = `${hour}:00`;
    timetable.appendChild(timeLabel);

    // 해당 시간대의 7일치 빈 칸 생성
    for (let day = 0; day < 7; day++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      timetable.appendChild(cell);
    }
  }
}

// 2. DOM 요소 및 상태 관리
const shareBtn = document.getElementById("share-btn");
const shareModal = document.getElementById("share-modal");
const closeShareBtn = document.getElementById("close-share-btn");
const copyBtn = document.getElementById("copy-btn");
const importBtn = document.getElementById("import-btn");
const exportData = document.getElementById("export-data");
const importData = document.getElementById("import-data");
const dbLoadBtn = document.getElementById("db-load-btn");
const userNicknameInput = document.getElementById("user-nickname");

let schedules = [];
try {
  const saved = localStorage.getItem("ourtime_schedules");
  schedules = saved ? JSON.parse(saved) : [];
  if (!Array.isArray(schedules)) schedules = [];
} catch (e) {
  console.error("로컬 데이터를 불러오는 중 오류가 발생했습니다. 초기화합니다.");
  schedules = [];
}

let sharedSchedules = []; // 친구 일정 임시 저장용
let editingIndex = null; // 수정 중인 일정의 인덱스 저장
let userNickname = localStorage.getItem("ourtime_nickname") || "";

// 모달 열기/닫기 처리
addBtn.addEventListener("click", () => {
  editingIndex = null;
  document.getElementById("modal-title").textContent = "새 일정 추가";
  if (userNicknameInput) userNicknameInput.value = userNickname;
  clearInputs();
  addModal.classList.remove("hidden");
});
cancelBtn.addEventListener("click", () => {
  addModal.classList.add("hidden");
});
shareBtn.addEventListener("click", () => {
  exportData.value = JSON.stringify(schedules);
  shareModal.classList.remove("hidden");
});
closeShareBtn.addEventListener("click", () => {
  shareModal.classList.add("hidden");
});

// 데이터 내보내기 (복사)
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(exportData.value).then(() => {
    alert("내 일정 데이터가 복사되었습니다! 친구에게 전달하세요.");
  });
});

// 친구 데이터 불러오기 (겹쳐보기)
importBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(importData.value);
    if (!Array.isArray(parsed)) throw new Error("Invalid Format");
    sharedSchedules = parsed;
    alert("친구 일정을 성공적으로 불러왔습니다!");
    renderSchedules();
    shareModal.classList.add("hidden");
  } catch (e) {
    alert(
      "잘못된 데이터 형식입니다. 복사한 JSON 텍스트를 정확히 붙여넣어주세요.",
    );
  }
});

// Supabase에서 닉네임으로 데이터 가져오기
if (dbLoadBtn) {
  dbLoadBtn.addEventListener("click", async () => {
    if (!supabaseClient) return alert("Supabase 설정이 완료되지 않았습니다.");
    const friendNickname = document.getElementById("friend-nickname").value;
    if (!friendNickname) return alert("친구 닉네임을 입력해주세요!");

    try {
      const { data, error } = await supabaseClient
        .from("schedules_db")
        .select("schedule_data")
        .eq("nickname", friendNickname)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        sharedSchedules = data[0].schedule_data;
        alert(`${friendNickname}님의 일정을 불러왔습니다!`);
        renderSchedules();
        shareModal.classList.add("hidden");
      } else {
        alert("해당 닉네임의 일정을 찾을 수 없습니다.");
      }
    } catch (e) {
      console.error("Supabase 로드 에러:", e);
      alert("데이터를 불러오는 중 오류가 발생했습니다.");
    }
  });
}

// --- [추가] 서버와 데이터 동기화 함수 ---
async function syncSchedulesToSupabase() {
  if (!supabaseClient || !userNickname) return;
  try {
    const { error } = await supabaseClient
      .from("schedules_db")
      .insert([{ nickname: userNickname, schedule_data: schedules }]);
    if (error) throw error;
    console.log("서버 동기화 성공!");
  } catch (e) {
    console.error("서버 동기화 실패:", e);
  }
}

// 3. 내 일정 저장 로직 (LocalStorage)
saveBtn.addEventListener("click", async () => {
  const title = document.getElementById("schedule-title").value;
  const nickname = userNicknameInput ? userNicknameInput.value.trim() : "";
  const day = parseInt(document.getElementById("schedule-day").value);

  const startAMPM = document.getElementById("start-ampm").value;
  const startHour = document.getElementById("start-hour").value;
  const startMin = document.getElementById("start-min").value;

  const endAMPM = document.getElementById("end-ampm").value;
  const endHour = document.getElementById("end-hour").value;
  const endMin = document.getElementById("end-min").value;

  if (!title || !startHour || !startMin || !endHour || !endMin) {
    return alert("모든 일정 정보를 입력해주세요!");
  }
  if (!nickname) {
    return alert("서버 저장을 위해 닉네임을 입력해주세요!");
  }

  // 12시간제(오전/오후)를 24시간제(HH:mm) 포맷으로 변환하는 함수
  const formatTime = (ampm, h, m) => {
    let hour = parseInt(h, 10) || 0;
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, "0")}:${m.padStart(2, "0")}`;
  };

  const start = formatTime(startAMPM, startHour, startMin);
  const end = formatTime(endAMPM, endHour, endMin);

  if (start >= end) return alert("종료 시간은 시작 시간보다 늦어야 합니다.");

  const newSchedule = { title, day, start, end };

  if (editingIndex !== null) {
    schedules[editingIndex] = newSchedule;
  } else {
    schedules.push(newSchedule);
  }

  localStorage.setItem("ourtime_schedules", JSON.stringify(schedules));
  localStorage.setItem("ourtime_nickname", nickname);
  userNickname = nickname;

  // 서버 동기화 호출
  await syncSchedulesToSupabase();

  clearInputs();
  addModal.classList.add("hidden");
  renderSchedules();
  loadMyLatestSchedule(); // 저장 후 최신 데이터 확인 (필요 시)
});

function clearInputs() {
  document.getElementById("schedule-title").value = "";
  document.getElementById("start-hour").value = "";
  document.getElementById("start-min").value = "";
  document.getElementById("end-hour").value = "";
  document.getElementById("end-min").value = "";
}

function openEditModal(index) {
  editingIndex = index;
  const sc = schedules[index];
  document.getElementById("modal-title").textContent = "일정 수정";
  document.getElementById("schedule-title").value = sc.title;
  document.getElementById("schedule-day").value = sc.day;

  const setTimeFields = (timeStr, ampmId, hId, mId) => {
    let [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    document.getElementById(ampmId).value = ampm;
    document.getElementById(hId).value = h;
    document.getElementById(mId).value = m.toString().padStart(2, "0");
  };

  setTimeFields(sc.start, "start-ampm", "start-hour", "start-min");
  setTimeFields(sc.end, "end-ampm", "end-hour", "end-min");
  addModal.classList.remove("hidden");
}

// [수정] 삭제 시에도 서버에 반영하도록 비동기 처리
async function deleteSchedule(index) {
  if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
    schedules.splice(index, 1);
    localStorage.setItem("ourtime_schedules", JSON.stringify(schedules));
    renderSchedules();
    // 삭제된 상태를 서버에 전송
    await syncSchedulesToSupabase();
  }
}

// 4. 화면에 일정 사각형 그리기
function renderSchedules() {
  document
    .querySelectorAll(".schedule-block")
    .forEach((block) => block.remove());
  schedules.forEach((sc, idx) => drawBlock(sc, false, idx));
  sharedSchedules.forEach((sc) => drawBlock(sc, true));
}

function drawBlock(schedule, isShared, index) {
  const [startHour, startMin] = schedule.start.split(":").map(Number);
  const [endHour, endMin] = schedule.end.split(":").map(Number);
  const duration = endHour + endMin / 60 - (startHour + startMin / 60);

  const block = document.createElement("div");
  block.className = `schedule-block ${isShared ? "shared-block" : ""}`;

  const titleSpan = document.createElement("span");
  titleSpan.textContent = schedule.title;
  block.appendChild(titleSpan);

  if (!isShared) {
    const btnContainer = document.createElement("div");
    btnContainer.style.position = "absolute";
    btnContainer.style.top = "2px";
    btnContainer.style.right = "2px";
    btnContainer.style.display = "flex";
    btnContainer.style.gap = "2px";
    btnContainer.className = "block-actions"; // CSS 제어를 위한 클래스 추가

    const editBtn = document.createElement("button");
    editBtn.textContent = "✎";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openEditModal(index);
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "×";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteSchedule(index);
    };

    btnContainer.appendChild(editBtn);
    btnContainer.appendChild(delBtn);
    block.appendChild(btnContainer);
  }

  block.style.top = `${60 + (startHour + startMin / 60) * 50}px`;
  block.style.height = `${duration * 50}px`;
  block.style.left = `calc(60px + ((100% - 60px) / 7) * ${schedule.day} + 2px)`;
  block.style.width = `calc((100% - 60px) / 7 - 4px)`;

  timetable.appendChild(block);
}

// 페이지 로드 시 내 최신 일정 Supabase에서 가져오기
async function loadMyLatestSchedule() {
  if (!supabaseClient || !userNickname || userNickname === "") return;
  try {
    const { data, error } = await supabaseClient
      .from("schedules_db")
      .select("schedule_data")
      .eq("nickname", userNickname)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0) {
      schedules = data[0].schedule_data;
      localStorage.setItem("ourtime_schedules", JSON.stringify(schedules));
      renderSchedules();
    }
  } catch (e) {
    console.error("초기 로드 실패:", e);
  }
}

// 초기화 실행 순서 보장
window.addEventListener("DOMContentLoaded", () => {
  console.log("페이지 로드 완료. UI 초기화 시작.");
  renderTimetableGrid();
  renderSchedules();

  if (supabaseClient) {
    loadMyLatestSchedule();
  }
});
