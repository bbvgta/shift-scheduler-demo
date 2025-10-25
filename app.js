document.addEventListener("DOMContentLoaded", () => {
  // ====== INITIAL DATA ======
  let schedule = JSON.parse(localStorage.getItem("schedule")) || [
    { date: "2025-10-25", user: "User1", status: "Confirmed" },
    { date: "2025-10-25", user: "User2", status: "Confirmed" }
  ];

  let moodData = JSON.parse(localStorage.getItem("moodData")) || {
    User1: [],
    User2: []
  };

  const tableBody = document.querySelector("#schedule-table tbody");
  const adminLogs = document.querySelector("#adminLogs");

  // ====== RENDER TABLE ======
  function renderSchedule() {
    tableBody.innerHTML = "";
    schedule.forEach((shift, index) => {
      const row = document.createElement("tr");
      let actionButtons = "";

      if (shift.status === "Confirmed") {
        actionButtons = `<button onclick="cancelShift(${index})">Cancel</button>`;
      } else if (shift.status === "Cancelled") {
        actionButtons = `<button onclick="reverseCancel(${index})">Undo</button>`;
      }

      row.innerHTML = `
        <td>${shift.date}</td>
        <td>${shift.user}</td>
        <td>${shift.status}</td>
        <td>${actionButtons}</td>
      `;
      tableBody.appendChild(row);
    });
    saveData();
  }

  // ====== CANCEL SHIFT ======
  window.cancelShift = function(index) {
    const cancelledUser = schedule[index].user;
    schedule[index].status = "Cancelled";

    const coveringUser = cancelledUser === "User1" ? "User2" : "User1";
    schedule.push({
      date: schedule[index].date,
      user: coveringUser,
      status: "Covering"
    });

    logAdmin(`${coveringUser} is now covering ${cancelledUser}'s shift.`);
    renderSchedule();
  };

  // ====== REVERSE CANCEL ======
  window.reverseCancel = function(index) {
    const cancelledUser = schedule[index].user;
    schedule[index].status = "Confirmed";

    // Remove any covering shift for this date
    schedule = schedule.filter((shift, i) =>
      !(i !== index && shift.date === schedule[index].date && shift.status === "Covering")
    );

    logAdmin(`↩️ ${cancelledUser}'s cancellation was reversed. Coverage removed.`);
    renderSchedule();
  };

  // ====== MOOD SUBMISSION ======
  document.getElementById("submitMood").addEventListener("click", () => {
    const user = document.getElementById("userSelect").value;
    const mood = parseInt(document.getElementById("moodSelect").value);
    moodData[user].push(mood);
    saveData();
    checkMoodRules(user);
    renderMoodTrends();
  });

  // ====== MOOD RULES ======
  function checkMoodRules(user) {
    const moods = moodData[user];
    const len = moods.length;

    if (len >= 5 && moods.slice(-5).every(m => m === 3)) {
      logAdmin(`✅ ${user} has been happy (3) for 5 shifts — offer a break day.`);
    } else if (len >= 3 && moods.slice(-3).every(m => m === 2)) {
      logAdmin(`⚙️ ${user} has been neutral (2) for 3 shifts — schedule 1-on-1.`);
    } else if (len >= 2 && moods.slice(-2).every(m => m === 1)) {
      logAdmin(`🚨 ${user} has been unhappy (1) twice — urgent admin check-in.`);
    } else {
      logAdmin(`🗒️ ${user}'s mood (${moods[len - 1]}) recorded.`);
    }
    saveData();
  }

  // ====== MOOD TREND DISPLAY ======
  function renderMoodTrends() {
    const trendContainer = document.getElementById("moodTrends");
    if (!trendContainer) return;

    trendContainer.innerHTML = "<h3>Mood Trends</h3>";
    Object.keys(moodData).forEach(user => {
      const div = document.createElement("div");
      const recent = moodData[user].slice(-5);
      const emojis = recent.length
        ? recent.map(m => ["😞","😐","😊"][m - 1]).join(" ")
        : "—";
      div.id = `${user}Trend`;
      div.textContent = `${user}: ${emojis}`;
      trendContainer.appendChild(div);
    });
  }

  // ====== LOG ADMIN ACTIONS ======
  function logAdmin(message) {
    const li = document.createElement("li");
    li.textContent = new Date().toLocaleTimeString() + " — " + message;
    adminLogs.prepend(li);
  }

  // ====== SAVE TO LOCALSTORAGE ======
  function saveData() {
    localStorage.setItem("schedule", JSON.stringify(schedule));
    localStorage.setItem("moodData", JSON.stringify(moodData));
  }

  // ====== SIMULATE WEEK ======
  const simulateWeekBtn = document.getElementById("simulateWeek");
  if (simulateWeekBtn) {
    simulateWeekBtn.addEventListener("click", () => {
      const user = document.getElementById("userSelect").value;
      for (let i = 0; i < 5; i++) {
        const randomMood = Math.ceil(Math.random() * 3);
        moodData[user].push(randomMood);
        checkMoodRules(user);
      }
      saveData();
      logAdmin(`📅 Simulated a week for ${user}.`);
      renderMoodTrends();
    });
  }

  // ====== ADD NEW USER ======
  const addUserBtn = document.getElementById("addUserBtn");
  if (addUserBtn) {
    addUserBtn.addEventListener("click", () => {
      const name = document.getElementById("newUserName").value.trim();
      if (!name) return alert("Enter a valid name.");

      if (moodData[name]) {
        alert("User already exists!");
        return;
      }

      moodData[name] = [];
      schedule.push({
        date: new Date().toISOString().split('T')[0],
        user: name,
        status: "Confirmed"
      });

      const select = document.getElementById("userSelect");
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);

      logAdmin(`🆕 Added new user: ${name}`);
      saveData();
      renderSchedule();
      renderMoodTrends();
    });
  }

  // ====== RESET APP TO WEEK 1 ======
  const resetBtn = document.getElementById("resetApp");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to reset everything? This cannot be undone.")) return;

      localStorage.clear();

      schedule = [
        { date: "2025-10-25", user: "User1", status: "Confirmed" },
        { date: "2025-10-25", user: "User2", status: "Confirmed" }
      ];

      moodData = {
        User1: [],
        User2: []
      };

      adminLogs.innerHTML = "";
      document.getElementById("userSelect").innerHTML = `
        <option value="User1">User 1</option>
        <option value="User2">User 2</option>
      `;

      logAdmin("🔄 App reset — back to Week 1 defaults.");
      saveData();
      renderSchedule();
      renderMoodTrends();
    });
  }

  // ====== INIT ======
  renderSchedule();
  renderMoodTrends();
});
