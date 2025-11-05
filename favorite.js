// favorite.js
(() => {

    const LS_KEY = 'FAVORITES_V1';    // localStorage key
    const MAX_FAV = 10;

    // 외부에서 현재 선택 좌표/이름을 업데이트할 수 있도록 노출
    const state = {
        current: null, // { name, lat, lon, url? }
    };

    // ====== 유틸 ======
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const loadFavs = () => {
        try {
            return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        } catch {
            return [];
        }
    };

    const saveFavs = (arr) => {
        localStorage.setItem(LS_KEY, JSON.stringify(arr));
    };

    const addFav = (item) => {
        if (!item || !item.name) return {ok: false, reason: 'empty'};
        const list = loadFavs();

        // 이미 존재하는 항목은 갱신 (중복 방지)
        const key = (o) => `${o.name}|${o.lat}|${o.lon}`;
        const exists = list.find((o) => key(o) === key(item));

        // ① 이미 있는 항목이면 갱신 허용
        if (exists) {
            const updated = list.map((o) =>
                key(o) === key(item) ? {...item, ts: Date.now()} : o
            );
            saveFavs(updated);
            return {ok: true, size: updated.length, updated: true};
        }

        // ② 새로운 항목인데 이미 10개라면 저장하지 않고 경고
        if (list.length >= MAX_FAV) {
            alert(`즐겨찾기는 최대 ${MAX_FAV}개까지만 저장할 수 있습니다.`);
            return {ok: false, reason: 'limit'};
        }

        // ③ 새 항목 추가
        list.unshift({...item, ts: Date.now()}); // 최신이 위로 오게
        saveFavs(list);
        alert("즐겨찾기에 추가되었습니다.");

        return {ok: true, size: list.length, added: true};
    };

    const removeFav = (idx) => {
        const list = loadFavs();
        if (idx < 0 || idx >= list.length) return;
        list.splice(idx, 1);
        saveFavs(list);
    };

    const coordStr = (o) => {
        const lat = Number(o.lat).toFixed(3);
        const lon = Number(o.lon).toFixed(3);
        return `${lat}, ${lon}`;
    };

    // ====== UI: 헤더 버튼 + 드롭다운 ======
    const headerBtnEl = document.getElementById('header-fav-btn');
    const wrap = document.getElementById('header-fav-wrapper');
    let favPanelEl = null;


    const onFavClearAll = () => {
        if (!confirm("즐겨찾기를 모두 삭제할까요?")) return;
        localStorage.removeItem(LS_KEY);
        renderFavList();
        alert("즐겨찾기를 모두 삭제했습니다.");
    };

    const ensureHeaderButton = () => {
        // 패널
        favPanelEl = document.createElement('div');
        favPanelEl.className = 'fav-panel';
        favPanelEl.style.display = 'none';
        favPanelEl.innerHTML = `
              <header>
                    <div class="fav-header-wrapper">
                        <div>즐겨찾기</div>
                        <button type="button" data-act="clear">전체삭제</button>
                    </div>
              </header>
              <ul class="fav-list"></ul>
        `;
        wrap.appendChild(favPanelEl);

        favPanelEl.querySelector('[data-act="clear"]')
            .addEventListener('click', onFavClearAll);

        headerBtnEl.addEventListener('click', () => {
            if (favPanelEl.style.display === 'none') {
                renderFavList();
                favPanelEl.style.display = 'block';
            } else {
                favPanelEl.style.display = 'none';
            }
        });

        // 패널 외부 클릭 닫기
        document.addEventListener('click', (e) => {
            if (!favPanelEl || favPanelEl.style.display === 'none') return;
            if (wrap.contains(e.target)) return; // 내부 클릭은 유지
            favPanelEl.style.display = 'none';
        });
    };

    const renderFavList = () => {
        if (!favPanelEl) return;
        const ul = $('.fav-list', favPanelEl);
        ul.innerHTML = '';
        const list = loadFavs();

        if (!list.length) {
            ul.innerHTML = `<li class="fav-item"><div class="fav-name">저장된 즐겨찾기가 없습니다.</div></li>`;
            return;
        }

        list.forEach((o, idx) => {
            const li = document.createElement('li');
            li.className = 'fav-item';
            li.innerHTML = `
        <div class="fav-name">
          ${escapeHtml(o.name)}<div class="fav-meta">${coordStr(o)}</div>
        </div>
        <div class="fav-actions">
          <button type="button" data-act="go" data-idx="${idx}">이동</button>
          <button type="button" data-act="share" data-idx="${idx}">공유</button>
          <button type="button" data-act="del" data-idx="${idx}">삭제</button>
        </div>
      `;
            ul.appendChild(li);
        });

        // 액션 바인딩
        ul.addEventListener('click', onFavAction, {once: true});
    };

    const onFavAction = (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const idx = Number(btn.dataset.idx);
        const list = loadFavs();
        const o = list[idx];
        if (!o) return;

        if (act === 'del') {
            if (!confirm("즐겨찾기를 삭제할까요?")) return;
            removeFav(idx);
            renderFavList();
            return;
        }
        if (act === 'go') {
            const input = document.getElementById('q');
            if (input) {
                input.value = o.name || '';
                // 만약 버튼 전환(+ / ✕)이 있다면 업데이트 트리거
                input.dispatchEvent(new Event('input', {bubbles: true}));
            }

            // 닫기
            favPanelEl.style.display = 'none';
            return;
        }
        if (act === 'share') {
            const yrUrl = o.url || `https://www.yr.no/en/details/table/2-${Number(o.lat).toFixed(3)},${Number(o.lon).toFixed(3)}`;
            if (window.shareToKakao) {
                window.shareToKakao(o.lat, o.lon, yrUrl, o.name || '');
            } else {
                alert('공유 기능이 준비되지 않았습니다.');
            }
            favPanelEl.style.display = 'none';
            return;
        }
    };


    const escapeHtml = (s) => String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // ====== 외부에서 현재 선택 갱신할 수 있는 API 노출 ======
    // 예) 지도 클릭 핸들러에서: window.FAVORITE.setCurrent({ name, lat, lon, url })
    window.FAVORITE = {
        setCurrent(payload) {
            if (!payload) return;
            const {name, lat, lon, url} = payload;
            state.current = {name, lat, lon, url};
        },
        add(item) {
            return addFav(item);
        },
        list() {
            return loadFavs();
        },
        remove(index) {
            return removeFav(index);
        }
    };

    // ====== 초기화 ======
    window.addEventListener('DOMContentLoaded', () => {
        ensureHeaderButton();
    });
})();
