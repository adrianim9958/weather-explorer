const YR_URL = "https://www.yr.no/nb/værvarsel/daglig-tabell";

// --- 지도 초기화 ---
const map = L.map("map", {zoomControl: true});
const tiles = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap 기여자",
    }
).addTo(map);
map.setView([37.5665, 126.978], 11); // 서울 중심으로 초기화

let marker;

// --- 요소 참조 ---
const $q = document.getElementById("q");
const $go = document.getElementById("go");
const $demo = document.getElementById("demo");
const $res = document.getElementById("result");
const $lat = document.getElementById("lat");
const $lon = document.getElementById("lon");
const $disp = document.getElementById("disp");
const $err = document.getElementById("error");
const $clear = document.getElementById("clear");

// --- 유틸: 복사 버튼 ---
function bindCopyButtons() {
    document.querySelectorAll(".copy").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const target = document.querySelector(
                btn.getAttribute("data-copy-target")
            );
            if (!target) return;
            try {
                await navigator.clipboard.writeText(target.textContent);
                btn.classList.remove("err");
                btn.classList.add("ok");
                btn.textContent = "복사됨";
                setTimeout(() => {
                    btn.classList.remove("ok");
                    btn.textContent = "복사";
                }, 900);
            } catch (e) {
                btn.classList.remove("ok");
                btn.classList.add("err");
                btn.textContent = "실패";
                setTimeout(() => {
                    btn.classList.remove("err");
                    btn.textContent = "복사";
                }, 900);
            }
        });
    });
}

bindCopyButtons();

// --- 검색 함수 ---
async function geocode(query) {
    if (!query || !query.trim()) return;
    setLoading(true);
    hideError();
    try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query.trim());
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("limit", "1");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("accept-language", "ko");

        const res = await fetch(url, {
            headers: {
                // 가능한 한 식별 가능한 UA를 제공(일부 환경에선 무시될 수 있음)
                Accept: "application/json",
            },
        });
        if (!res.ok) throw new Error("검색에 실패했습니다. 상태: " + res.status);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("결과가 없습니다. 주소를 더 구체적으로 입력해 보세요.");
        }
        //console.log("data: " + JSON.stringify(data))
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        showResult(lat, lon, item.display_name);
    } catch (e) {
        showError(e.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
        setLoading(false);
    }
}

function showResult(lat, lon, displayName) {
    // UI 값 반영
    $lat.textContent = String(lat);
    $lon.textContent = String(lon);
    $disp.textContent = displayName || "—";
    $res.hidden = false;

    // 기존 마커 제거 후 새 마커 추가
    if (marker) marker.remove();
    marker = L.marker([lat, lon]).addTo(map);

    // 마커 클릭 시: YR 날씨 페이지(소수점 3자리 반올림) 새 탭에서 열기
    marker.on("click", () => {
        const lat3 = Number(lat).toFixed(3);
        const lon3 = Number(lon).toFixed(3);
        const url = `${YR_URL}/${lat3},${lon3}`;
        window.open(url, "_blank", "noopener");
    });

    // 팝업에도 바로가기 링크 제공
    const lat3 = Number(lat).toFixed(3);
    const lon3 = Number(lon).toFixed(3);
    const yrUrl = `${YR_URL}/${lat3},${lon3}`;

    marker
        .bindPopup(
            `<b>좌표</b><br>lat: ${lat}<br>lon: ${lon}<br>` +
            `<a href="${yrUrl}" target="_blank" rel="noopener">YR 날씨 열기</a>`
        )
        .openPopup();

    // 지도 이동
    map.setView([lat, lon], 16);
}

function showError(msg) {
    $err.textContent = "⚠️ " + msg;
    $err.hidden = false;
}

function hideError() {
    $err.hidden = true;
}

function setLoading(b) {
    $go.disabled = b;
    $go.textContent = b ? "검색 중…" : "좌표 조회";
}

// --- 이벤트 바인딩 ---
$go.addEventListener("click", () => geocode($q.value));
$q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") geocode($q.value);
});
$demo.addEventListener("click", () => {
    $q.value = "제주특별자치도 제주시 첨단로 242";
    geocode($q.value);
});

// --- 입력값이 있을 때만 X버튼 표시 ---
$q.addEventListener("input", () => {
    if ($q.value.trim().length > 0) {
        $clear.hidden = false;
    } else {
        $clear.hidden = true;
    }
});

// --- X버튼 클릭 시 입력값 초기화 ---
$clear.addEventListener("click", () => {
    $q.value = "";
    $clear.hidden = true;
    $q.focus();
});


// 지도 클릭 시 좌표를 팝업으로 안내
map.on("click", (e) => {
    const {lat, lng} = e.latlng;
    const lat3 = lat.toFixed(3);
    const lon3 = lng.toFixed(3);
    const yrUrl = `${YR_URL}/${lat3},${lon3}`;

    L.popup()
        .setLatLng(e.latlng)
        .setContent(
            `
      <b>좌표</b><br>
      lat: ${lat.toFixed(6)}, lon: ${lng.toFixed(6)}<br>
      <a href="${yrUrl}" target="_blank" rel="noopener">YR 날씨 열기</a>
    `
        )
        .openOn(map);
});

function renderRows(rows, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = rows
        .map((r) => {
            const h = r["높이"]
                ? String(r["높이"]).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " m"
                : "";
            return `<tr>
                <td>${r["이름"] || ""}</td>
                <td>${r["주소"] || ""}</td>
                <td style="text-align:right">${h}</td>
              </tr>`;
        })
        .join("");
}

renderRows(BLACKYAK_DATA, "blackyak-tbody");
renderRows(NATIONAL_DATA, "national-tbody");

// --- 공통: 모든 테이블에서 선택 상태 초기화 ---
function clearAllRowSelections() {
    document.querySelectorAll("tbody tr.selected").forEach((row) => {
        row.classList.remove("selected");
    });
}

// 테이블 행 클릭 → 입력창에 "주소+이름" 채우기
function bindTableClick(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;

        $clear.hidden = false;

        // 1) 두 테이블 모두의 기존 선택 해제
        clearAllRowSelections();

        // 2) 현재 행만 선택 표시
        tr.classList.add("selected");

        // 3) 입력창에 "주소+이름" 채우기 (주소에 , 있으면 첫 구간만)
        const name = tr.cells[0]?.textContent.trim() || "";
        let addr = tr.cells[1]?.textContent.trim() || "";

        // 주소에 콤마(,)가 있으면 첫 구간만 사용
        if (addr.includes(",")) {
            addr = addr.split(",")[0].trim();
        }
        const combined = `${name}`;

        // 입력창에 "주소+이름" 형태로 채우기
        $q.value = combined;
        $q.focus();

        // 시작/끝 좌표 계산
        const startRect = tr.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;

        const inputRect = $q.getBoundingClientRect();
        const endX = inputRect.left + inputRect.width / 2;
        const endY = inputRect.top + inputRect.height / 2;

        // flyText 생성
        const flyText = document.createElement("div");
        flyText.className = "fly-text";
        flyText.textContent = combined;
        document.body.appendChild(flyText);

        // 시작점
        flyText.style.transform = `translate(${startX}px, ${startY}px) scale(1)`;
        flyText.style.opacity = "1";

        // 1단계: 80% 지점까지 이동 (불투명 유지)
        requestAnimationFrame(() => {
            flyText.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
            const midX = startX + (endX - startX) * 0.8;
            const midY = startY + (endY - startY) * 0.8;
            flyText.style.transform = `translate(${midX}px, ${midY}px) scale(0.6)`;
        });

        // 2단계: 남은 20% 이동 + 서서히 투명화
        setTimeout(() => {
            flyText.style.transition =
                "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out";
            flyText.style.transform = `translate(${endX}px, ${endY}px) scale(0.2)`;
            flyText.style.opacity = "0";
        }, 600);

        // 마무리 제거
        setTimeout(() => flyText.remove(), 950);
    });
}

// 두 테이블에 바인딩
bindTableClick("blackyak-tbody");
bindTableClick("national-tbody");

// --- 테이블 접고 펴기 토글 ---
function bindTableToggle() {
    document.querySelectorAll(".table-card header").forEach((header) => {
        const tableWrap = header.nextElementSibling;
        if (!tableWrap) return;

        header.style.cursor = "pointer";

        header.addEventListener("click", () => {
            const isCollapsed = tableWrap.classList.toggle("collapsed");

            // 아이콘이나 시각 효과용 클래스 추가 (선택사항)
            header.classList.toggle("collapsed", isCollapsed);
        });
    });
}

bindTableToggle();
