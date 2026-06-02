const $ = window.$id;
const normalizePhone = window.normalizePhone;
const formatPrice = window.formatPrice;
const minutesToText = window.minutesToText;
const computeEndTime = window.computeEndTime;
const showToast = window.showToast;
const showLoading = window.showLoading;
const fetchJson = window.fetchJson;


//biến lưu dữ liệu
let services = [];
let stylists = [];

async function loadCatalog() {
    //kiểm tra route tồn tại
    if (!window.Barbery?.routes?.services || !window.Barbery?.routes?.stylists) {
        throw new Error("Missing Barbery routes");
    }
    //gọi 2 API cùng lúc
    const [serviceResult, stylistResult] = await Promise.all([
        fetchJson(window.Barbery.routes.services),
        fetchJson(window.Barbery.routes.stylists),
    ]);

    //tách kết quả
    const { res: serviceRes, json: serviceJson } = serviceResult;
    const { res: stylistRes, json: stylistJson } = stylistResult;


    //kiểm tra lỗi
    if (!serviceRes.ok || !serviceJson?.ok) {
        throw new Error(serviceJson?.message || "Không lấy được dịch vụ");
    }
    if (!stylistRes.ok || !stylistJson?.ok) {
        throw new Error(stylistJson?.message || "Không lấy được thợ cắt");
    }

    //lấy mảng dữ liệu
    const sList = Array.isArray(serviceJson.data) ? serviceJson.data : [];
    const stList = Array.isArray(stylistJson.data) ? stylistJson.data : [];

    //chuẩn hóa dữ liệu
    services = sList.map((x) => ({
        id: x.id,
        name: x.name,
        price: Number(x.price || 0),
        duration_min: Number(x.duration_min || 30),
        icon: x.icon || "⭐",
    }));

    //lấy chữ đầu làm ảnh
    function getInitials(name) {
        //kiểm tra nếu tên nếu rỗng
        name = (name || "").trim();
        if (!name) return "B";

        const parts = name.split(/\s+/);  //tách tên theo khoảng trắng
        const first = parts[0]?.[0] || ""; //lấy chữ đầu của từ đầu tiên
        const last = parts.length > 1 ? parts[parts.length - 1][0] : ""; //lấy chữ cái đầu của từ sau

        return (first + last).toUpperCase();//ghép và viết hoa
    }

    stylists = stList.map((x) => ({
        id: x.id,
        name: x.name,
        role: x.role || "Stylist",
        exp: Number(x.exp || 0),
        rating: Number(x.rating || 0), //điểm đánh giá
        //chuyên môn
        specialty: x.specialty
            ? String(x.specialty).split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        status: x.status || "available", //trạng thái
        avatar_url: x.avatar_url ? String(x.avatar_url) : null,
        initials: getInitials(x.name),  //chữ viết tắt từ tên
    }));
}

//khung giờ đặt lịch
const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

//trạng thái đặt lịch
let currentStep = 1; //xem đang đặt lịch ở bước nào
let bookingData = { services: [], stylist: null, date: null, time: null };  //lưu lựa chọn
let availableTimes = new Set();  //lưu giờ trống

//tổng thời gian dịch vụ
function computeTotalDuration(selectedServices) {
    return (selectedServices || []).reduce((sum, s) => {
        return sum + Number(s.duration_min || 0);
    }, 0);
}
//danh sách ngày đặt lịch
function getNext12Days() {
    const days = [];
    for (let i = 1; i < 13; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        days.push(d.toISOString().split("T")[0]); // YYYY-MM-DD
    }
    return days;
}
//ktra điều kiện lấy giờ trống
function canLoadSlots() {
    return !!(bookingData.stylist && bookingData.date && bookingData.services?.length);
}

//lấy giờ trống
async function fetchAvailableSlots() {
    //kiểm tra điều kiện
    if (!canLoadSlots()) {
        availableTimes = new Set();
        return;
    }

    //tính tổng tgian dịch vụ
    const totalMin = computeTotalDuration(bookingData.services);
    //tạo Url
    const url =
        `${window.Barbery.routes.availableSlots}` +
        `?stylist_id=${bookingData.stylist.id}` +
        `&date=${bookingData.date}` +
        `&duration=${totalMin}`;
    //gọi APT
    try {
        const { res, json } = await fetchJson(url);

        //nếu lỗi
        if (!res.ok || !json?.ok) {
            availableTimes = new Set();
            console.warn("availableSlots not ok", res.status, json);
            return;
        }

        //lấy danh sách giờ trống
        const slots = Array.isArray(json.data) ? json.data : (json.data?.slots || []);
        //lưu giờ trống
        availableTimes = new Set(slots);
        //nếu lỗi thì xóa giờ trống
    } catch (e) {
        availableTimes = new Set();
        console.warn("availableSlots fetch error", e);
    }
}
//sửa lịch thì thay đổi và load lại giờ trống
async function refreshSlotsAndRender() {
    bookingData.time = null;

    if (!canLoadSlots()) {
        availableTimes = new Set();
        renderTimeSlots();
        validateStep3();
        updateSummary();
        return;
    }

    showLoading(true);
    await fetchAvailableSlots();
    showLoading(false);

    renderTimeSlots();
    validateStep3();
    updateSummary();
}

//điều khiển các bước đặt lịch
window.nextStep = async function () {
    if (currentStep >= 4) return; //ko cho vượt quá bước 4

    $(`booking-step-${currentStep}`)?.classList.add("hidden"); //ẩn bước hiện tại
    currentStep++;  //tắng số bước
    $(`booking-step-${currentStep}`)?.classList.remove("hidden"); //hiện bước mới

    updateStepIndicators();  //cập nhật bước
    updateSummary();        //cập nhật lịch

    if (currentStep === 3) {
        renderDates();
        renderTimeSlots();
        //đủ điều kiện thì lấy giờ trống
        if (canLoadSlots()) {
            showLoading(true);
            await fetchAvailableSlots();
            showLoading(false);
            renderTimeSlots();
        }

        validateStep3();
    }
};
//quay lại bước cũ
window.prevStep = async function () {
    if (currentStep <= 1) return;

    $(`booking-step-${currentStep}`)?.classList.add("hidden");//ẩn bước hiện tại
    currentStep--;
    $(`booking-step-${currentStep}`)?.classList.remove("hidden"); //hiện bước mới

    updateStepIndicators();
    updateSummary();

    if (currentStep === 3) { //gọi lại API giờ trống
        renderDates();
        if (canLoadSlots()) {
            showLoading(true);
            await fetchAvailableSlots();
            showLoading(false);
        }
        renderTimeSlots();
        validateStep3();
    }
};
//cập nhật trạng thái cac bước đặt lịch
function updateStepIndicators() {
    for (let i = 1; i <= 4; i++) {
        const el = $(`step-${i}-indicator`); //xét theo id

        if (!el) continue; //ko tìm được thì bỏ qua

        el.classList.remove("step-active", "step-completed");
        el.classList.add("bg-gray-700", "text-gray-400");  //thêm trạng thái mặc định

        //kiểm tra
        if (i < currentStep) {
            el.classList.add("step-completed");
            el.innerHTML = "✓";
        } else if (i === currentStep) {
            el.classList.add("step-active");
            el.innerHTML = String(i);
        } else {
            el.innerHTML = String(i);
        }
    }
}
//khi đặt lịch thành công và bấm đặt lịch mới
window.resetBooking = function () {

    //quay về bước 1 và xóa data
    currentStep = 1;
    bookingData = {
        services: [],
        stylist: null,
        date: null,
        time: null,
    };

    //set lại danh sách giờ
    availableTimes = new Set();

    //ẩn các bước
    document.querySelectorAll(".booking-step").forEach((s) => {
        s.classList.add("hidden");
    });

    $("booking-step-1")?.classList.remove("hidden");
    $("booking-success")?.classList.add("hidden");

    //xóa thông tin khách
    ["customer-name", "customer-phone", "customer-email", "customer-notes"].forEach((id) => {
        const input = $(id);
        if (input) input.value = "";
    });

    //chưa chọn dịch vụ lên 3 nút tiếp tục bị khóa
    const btnStep1 = $("btn-step1-next");
    if (btnStep1) btnStep1.disabled = true;

    const btnStep2 = $("btn-step2-next");
    if (btnStep2) btnStep2.disabled = true;

    const btnStep3 = $("btn-step3-next");
    if (btnStep3) btnStep3.disabled = true;

    renderServices();
    renderStylists();
    renderTimeSlots();
    updateStepIndicators();
    updateSummary();
};

//Hiện danh sách ra booking
function renderServices() {
    const c = $("service-list");
    if (!c) return;

    //lấy danh sách dịch vụ đang được chọn
    const selectedSet = new Set((bookingData.services || []).map((x) => String(x.id)));

    c.innerHTML = services.map((s) => {
        const isSelected = selectedSet.has(String(s.id));
        return `
      <div class="service-card bg-dark rounded-xl p-4 border cursor-pointer
        ${isSelected ? "border-gold ring-2 ring-gold/30" : "border-gray-800"}"
        onclick="toggleService('${s.id}')">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gray-700/40 rounded-xl flex items-center justify-center text-2xl">${s.icon}</div>
          <div class="flex-1">
            <h3 class="font-semibold text-white">${s.name}</h3>
            <p class="text-sm text-gray-500">~${s.duration_min} phút</p>
          </div>
          <p class="font-bold text-gold">${formatPrice(s.price)}</p>
        </div>
      </div>
    `;
    }).join("");
}

window.toggleService = async function (id) {
    if (!Array.isArray(bookingData.services)) bookingData.services = [];

    const sv = services.find((s) => String(s.id) === String(id));
    if (!sv) return;

    const idx = bookingData.services.findIndex((x) => String(x.id) === String(id));
    if (idx >= 0) bookingData.services.splice(idx, 1);
    else bookingData.services.push(sv);

    renderServices();
    const btn = $("btn-step1-next");
    if (btn) btn.disabled = bookingData.services.length === 0;

    if (currentStep === 3) {
        await refreshSlotsAndRender();
        return;
    }

    updateSummary();
};

// =========================================================
// RENDER STYLISTS
// =========================================================
function renderStylists() {
    const c = $("stylist-list");
    if (!c) return;

    c.innerHTML = stylists.map((s) => {
        const isSelected = bookingData.stylist && String(bookingData.stylist.id) === String(s.id);

        return `
      <div class="stylist-card bg-dark rounded-xl p-4 border cursor-pointer
        ${isSelected ? "border-gold ring-2 ring-gold/30" : "border-gray-800"}"
        onclick="selectStylist('${s.id}')">
        <div class="flex gap-4 items-center">

          <!-- AVATAR -->
          <div class="w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            ${s.avatar_url
                ? `<img src="${s.avatar_url}" alt="${s.name || ""}"
                     class="w-full h-full object-cover"
                     onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">`
                : ``
            }
            <span class="${s.avatar_url ? "hidden" : ""} text-black font-bold">
              ${s.initials || "B"}
            </span>
          </div>

          <div>
            <h3 class="text-white font-semibold">${s.name}</h3>
            <p class="text-sm text-gray-500">${s.exp} năm • ⭐ ${s.rating}</p>
            <p class="text-xs text-gray-400">${(s.specialty || []).join(", ")}</p>
          </div>
        </div>
      </div>
    `;
    }).join("");
}


window.selectStylist = async function (id) {
    const clicked = stylists.find((s) => String(s.id) === String(id));
    if (!clicked) return;

    if (bookingData.stylist && String(bookingData.stylist.id) === String(id)) {
        bookingData.stylist = null;
        availableTimes = new Set();
        bookingData.time = null;

        renderStylists();
        const btn = $("btn-step2-next");
        if (btn) btn.disabled = true;

        if (currentStep === 3) {
            renderTimeSlots();
            validateStep3();
        }

        updateSummary();
        return;
    }

    bookingData.stylist = clicked;
    bookingData.time = null;

    renderStylists();
    const btn = $("btn-step2-next");
    if (btn) btn.disabled = false;

    if (currentStep === 3) {
        await refreshSlotsAndRender();
        return;
    }

    updateSummary();
};
// =========================================================
// DATE & TIME (Step 3)
// =========================================================
function renderDates() {
    const c = $("date-list");
    if (!c) return;

    const days = getNext12Days();
    c.innerHTML = days.map((d) => {
        const dt = new Date(d);
        return `
      <button class="date-btn ${bookingData.date === d ? "selected" : ""}" onclick="selectDate('${d}')">
        <p>${dt.getDate()}/${dt.getMonth() + 1}</p>
      </button>`;
    }).join("");
}

window.selectDate = async function (date) {
    bookingData.date = date;
    renderDates();

    if (currentStep === 3) {
        await refreshSlotsAndRender();
        return;
    }

    updateSummary();
};

function renderTimeSlots() {
    const c = $("time-list");
    if (!c) return;

    if (!canLoadSlots()) {
        c.innerHTML = `
            <div class="col-span-4 sm:col-span-6 text-gray-500 text-sm">
                Vui lòng chọn dịch vụ, thợ cắt và ngày để xem giờ trống.
            </div>`;
        return;
    }

    // Dùng toàn bộ danh sách giờ chuẩn để render
    const allSlots = [...timeSlots];

    const hasAnyAvailable = allSlots.some(t => availableTimes.has(t));

    if (!hasAnyAvailable) {
        c.innerHTML = `
            <div class="col-span-4 sm:col-span-6 text-gray-500 text-sm">
                Không còn khung giờ phù hợp cho tổng thời gian đã chọn.
            </div>`;
        return;
    }

    c.innerHTML = allSlots.map((t) => {
        const isAvailable = availableTimes.has(t);
        const isSelected = bookingData.time === t;

        return `
            <button
                type="button"
                class="time-slot ${isSelected ? "selected" : ""} ${!isAvailable ? "disabled-slot" : ""}"
                ${isAvailable ? `onclick="selectTime('${t}')"` : "disabled"}
            >
                ${t}
            </button>
        `;
    }).join("");
}

window.selectTime = function (t) {
    if (!availableTimes.has(t)) return;

    bookingData.time = t;
    renderTimeSlots();
    validateStep3();
    updateSummary();
};

function validateStep3() {
    const btn = $("btn-step3-next");
    if (btn) btn.disabled = !(bookingData.date && bookingData.time);
}
// =========================================================
// SUMMARY (Step 4)
// =========================================================
function updateSummary() {
    const svs = bookingData.services || [];
    const names = svs.length ? svs.map((x) => x.name).join(", ") : "-";
    const total = svs.reduce((sum, x) => sum + Number(x.price || 0), 0);

    const totalMin = computeTotalDuration(svs);
    const durationText = svs.length ? minutesToText(totalMin) : "-";
    const endTimeText =
        bookingData.date && bookingData.time && svs.length
            ? computeEndTime(bookingData.date, bookingData.time, totalMin)
            : "-";

    if ($("summary-service")) $("summary-service").textContent = names;
    if ($("summary-total")) $("summary-total").textContent = svs.length ? formatPrice(total) : "-";

    if ($("summary-stylist")) $("summary-stylist").textContent = bookingData.stylist?.name || "-";
    if ($("summary-date")) $("summary-date").textContent = bookingData.date || "-";
    if ($("summary-time")) $("summary-time").textContent = bookingData.time || "-";

    if ($("summary-duration")) $("summary-duration").textContent = durationText;
    if ($("summary-endtime")) $("summary-endtime").textContent = endTimeText;
}
window.updateSummary = updateSummary;

// =========================================================
// SUBMIT BOOKING
// =========================================================
window.submitBooking = async function () {
    console.log("=== SUBMIT BOOKING START ===");

    // Lấy dữ liệu từ form
    const name = $("customer-name").value.trim();
    const phone = normalizePhone($("customer-phone").value.trim());
    const email = $("customer-email").value.trim();
    const notes = $("customer-notes").value.trim();

    console.log("Form data:", { name, phone, email, notes });

    // Validate phía client
    if (!name || !phone || !email) {
        console.warn("❌ Thiếu thông tin khách");
        showToast("Vui lòng nhập họ tên, số điện thoại và email", "error");
        return;
    }
    if (!/^0\d{8,10}$/.test(phone)) {
        showToast("Số điện thoại không hợp lệ", "error");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Email không hợp lệ", "error");
        return;
    }
    // Kiểm tra bookingData
    console.log("Booking data:", bookingData);

    if (!bookingData.services?.length || !bookingData.stylist || !bookingData.date || !bookingData.time) {
        console.warn("❌ Thiếu thông tin booking");
        showToast("Thiếu thông tin đặt lịch", "error");
        return;
    }

    showLoading(true);

    try {
        console.log("🚀 Gửi request đến:", window.Barbery.routes.createBooking);

        const res = await fetch(window.Barbery.routes.createBooking, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content || "",
                "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({
                customer_name: name,
                customer_phone: phone,
                customer_email: email,
                service_ids: bookingData.services.map((s) => s.id),
                stylist_id: bookingData.stylist.id,
                booking_date: bookingData.date,
                booking_time: bookingData.time,
                notes: notes || null,
            }),
        });

        console.log("📥 Response status:", res.status);

        // đọc text trước để debug
        const text = await res.text();
        console.log("📦 Raw response:", text);

        let json = {};
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error("❌ Không parse được JSON:", e);
        }

        showLoading(false);

        if (!res.ok) {
            console.error("❌ Server trả lỗi:", json);
            showToast(json.message || "Lỗi đặt lịch", "error");
            return;
        }

        console.log("✅ Booking success:", json);

        document.querySelectorAll(".booking-step").forEach((s) => s.classList.add("hidden"));
        $("booking-success")?.classList.remove("hidden");

        const codeEl = $("booking-code-display");
        if (codeEl) {
            codeEl.textContent = json.data?.booking_code || "N/A";
        }

        showToast("Đặt lịch thành công!");
    } catch (error) {
        showLoading(false);

        console.error("🔥 FETCH ERROR:", error);

        if (error instanceof TypeError) {
            console.error("👉 Có thể do sai URL hoặc server chưa chạy");
        }

        showToast("Có lỗi xảy ra, vui lòng thử lại", "error");
    }

    console.log("=== SUBMIT BOOKING END ===");
};

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (!$("service-list")) return;

        showLoading(true);

        await loadCatalog();

        renderServices();
        renderStylists();
        updateStepIndicators();
        renderTimeSlots();
        updateSummary();

        showLoading(false);
    } catch (e) {
        console.error(e);
        showLoading(false);
        showToast(e?.message || "Lỗi tải dữ liệu", "error");
    }
});
