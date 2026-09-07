const documents = [
  {
    id: "overview",
    number: "01",
    title: "사건 개요",
    label: "사건 자료",
    type: "SOURCE",
    pages: 4,
    imagePath: "assets/pages/overview/page-{page}.jpg",
    pdf: "documents/case-overview.pdf"
  },
  {
    id: "student",
    number: "02",
    title: "김동우 씨 소장",
    label: "로스쿨생 작성",
    type: "DRAFT A",
    pages: 3,
    imagePath: "assets/pages/student/page-{page}.jpg",
    pdf: "documents/kim-dongwoo-complaint.pdf"
  },
  {
    id: "ai",
    number: "03",
    title: "AI 소장",
    label: "AI 작성",
    type: "DRAFT B",
    pages: 3,
    imagePath: "assets/pages/ai/page-{page}.jpg",
    pdf: "documents/ai-complaint.pdf"
  }
];

documents.forEach((document) => {
  document.text = window.PDF_TEXT?.[document.id] ?? [];
});

const state = {
  documentIndex: 0,
  page: 1,
  zoom: 1,
  direction: 1
};

const elements = {
  deck: document.querySelector("#documentDeck"),
  title: document.querySelector("#documentTitle"),
  kicker: document.querySelector("#documentKicker"),
  current: document.querySelector("#pageCurrent"),
  total: document.querySelector("#pageTotal"),
  image: document.querySelector("#pageImage"),
  paper: document.querySelector("#paperWrap"),
  loader: document.querySelector("#paperLoader"),
  prev: document.querySelector("#prevPage"),
  next: document.querySelector("#nextPage"),
  download: document.querySelector("#downloadButton"),
  infoPanel: document.querySelector("#infoPanel"),
  panelKicker: document.querySelector("#panelKicker"),
  panelTitle: document.querySelector("#panelTitle"),
  panelContent: document.querySelector("#panelContent"),
  search: document.querySelector("#searchInput"),
  searchCount: document.querySelector("#searchCount")
};

const escapeHtml = (value) =>
  value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  })[char]);

function renderDeck() {
  elements.deck.innerHTML = documents.map((doc, index) => `
    <button
      class="document-card ${index === state.documentIndex ? "is-active" : ""}"
      type="button"
      role="tab"
      aria-selected="${index === state.documentIndex}"
      data-document="${index}"
    >
      <span class="document-card__number">${doc.number}</span>
      <span class="document-card__copy">
        <strong>${doc.title}</strong>
        <small>${doc.label}</small>
      </span>
      <span class="document-card__pages">${String(doc.pages).padStart(2, "0")}P</span>
    </button>
  `).join("");

  elements.deck.querySelectorAll("[data-document]").forEach((button) => {
    button.addEventListener("click", () => selectDocument(Number(button.dataset.document)));
  });
}

function pageImageUrl(doc, page) {
  return doc.imagePath.replace("{page}", page);
}

function renderDocument() {
  const doc = documents[state.documentIndex];
  elements.title.textContent = doc.title;
  elements.kicker.textContent = `FILE ${doc.number} · ${doc.type}`;
  elements.current.textContent = String(state.page).padStart(2, "0");
  elements.total.textContent = String(doc.pages).padStart(2, "0");
  elements.prev.disabled = state.page === 1;
  elements.next.disabled = state.page === doc.pages;
  elements.download.href = doc.pdf;
  elements.download.setAttribute("download", doc.pdf.split("/").pop());
  elements.image.alt = `${doc.title} ${state.page}페이지`;
  elements.image.classList.remove("page-enter-left", "page-enter-right");
  void elements.image.offsetWidth;
  elements.image.classList.add(state.direction > 0 ? "page-enter-right" : "page-enter-left");
  elements.image.classList.add("is-loading");
  elements.loader.classList.add("is-visible");
  elements.image.src = pageImageUrl(doc, state.page);
  document.title = `${doc.title} — 소장 아카이브`;
  history.replaceState(null, "", `#${doc.id}-p${state.page}`);
  preloadAdjacent(doc);
}

function selectDocument(index) {
  if (index < 0 || index >= documents.length) return;
  state.direction = index >= state.documentIndex ? 1 : -1;
  state.documentIndex = index;
  state.page = 1;
  state.zoom = 1;
  applyZoom();
  renderDeck();
  renderDocument();
  elements.deck.querySelector(".is-active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function changePage(delta) {
  const doc = documents[state.documentIndex];
  const target = Math.max(1, Math.min(doc.pages, state.page + delta));
  if (target === state.page) return;
  state.direction = delta;
  state.page = target;
  elements.paper.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  renderDocument();
}

function preloadAdjacent(doc) {
  [state.page - 1, state.page + 1]
    .filter((page) => page >= 1 && page <= doc.pages)
    .forEach((page) => {
      const image = new Image();
      image.src = pageImageUrl(doc, page);
    });
}

function applyZoom() {
  document.documentElement.style.setProperty("--zoom", state.zoom);
}

function setZoom(next) {
  state.zoom = Math.max(0.8, Math.min(2, next));
  applyZoom();
}

function renderText(query = "") {
  const doc = documents[state.documentIndex];
  const cleanQuery = query.trim();
  let matches = 0;
  const pages = doc.text.map((text, index) => {
    let output = escapeHtml(text);
    if (cleanQuery) {
      const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      output = output.replace(new RegExp(escapedQuery, "gi"), (match) => {
        matches += 1;
        return `<mark>${match}</mark>`;
      });
    }
    return `<section class="text-page"><span class="text-page__label">PAGE ${String(index + 1).padStart(2, "0")}</span><p>${output}</p></section>`;
  }).join("");
  elements.panelContent.innerHTML = pages;
  elements.searchCount.textContent = cleanQuery ? `${matches}건` : "";
}

function openTextPanel() {
  const doc = documents[state.documentIndex];
  elements.panelKicker.textContent = `FILE ${doc.number} · TEXT`;
  elements.panelTitle.textContent = doc.title;
  elements.search.value = "";
  renderText();
  if (!elements.infoPanel.open) elements.infoPanel.showModal();
  elements.panelContent.scrollTop = 0;
  document.querySelector("[data-mode='text']").classList.add("is-active");
}

function closeInfoPanel() {
  elements.infoPanel.close();
  document.querySelector("[data-mode='text']").classList.remove("is-active");
}

elements.image.addEventListener("load", () => {
  elements.image.classList.remove("is-loading");
  elements.loader.classList.remove("is-visible");
});

elements.image.addEventListener("error", () => {
  elements.loader.textContent = "페이지를 불러오지 못했습니다.";
  elements.loader.classList.add("is-visible");
});

elements.prev.addEventListener("click", () => changePage(-1));
elements.next.addEventListener("click", () => changePage(1));
document.querySelector("#zoomOut").addEventListener("click", () => setZoom(state.zoom - 0.2));
document.querySelector("#zoomIn").addEventListener("click", () => setZoom(state.zoom + 0.2));
document.querySelector("#fitPage").addEventListener("click", () => {
  state.zoom = 1;
  applyZoom();
  elements.paper.scrollTo({ top: 0, left: 0, behavior: "smooth" });
});
document.querySelector("[data-mode='text']").addEventListener("click", openTextPanel);
document.querySelector("#closePanel").addEventListener("click", closeInfoPanel);
elements.infoPanel.addEventListener("click", (event) => {
  if (event.target === elements.infoPanel) closeInfoPanel();
});
elements.search.addEventListener("input", () => renderText(elements.search.value));
document.querySelector("#brandHome").addEventListener("click", (event) => {
  event.preventDefault();
  selectDocument(0);
});

document.addEventListener("keydown", (event) => {
  if (elements.infoPanel.open) return;
  if (event.key === "ArrowLeft") changePage(-1);
  if (event.key === "ArrowRight") changePage(1);
  if (["1", "2", "3"].includes(event.key)) selectDocument(Number(event.key) - 1);
});

let touchStartX = 0;
elements.paper.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].screenX;
}, { passive: true });
elements.paper.addEventListener("touchend", (event) => {
  if (state.zoom > 1) return;
  const distance = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(distance) > 55) changePage(distance > 0 ? -1 : 1);
}, { passive: true });

function restoreFromHash() {
  const match = location.hash.match(/^#([a-z]+)-p(\d+)$/);
  if (!match) return;
  const index = documents.findIndex((doc) => doc.id === match[1]);
  if (index === -1) return;
  state.documentIndex = index;
  state.page = Math.min(documents[index].pages, Math.max(1, Number(match[2])));
}

restoreFromHash();
renderDeck();
renderDocument();
