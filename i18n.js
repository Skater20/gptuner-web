// Small, dependency-free language switcher for the landing page. Spanish is what's already in the
// HTML (works with JS disabled); this only overrides text nodes when another language is picked,
// and remembers the choice in localStorage. No frameworks, no external requests.
(function () {
  var LANGS = [
    { code: "es", label: "Español" },
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" },
    { code: "pt", label: "Português" },
  ];
  var DICT = window.GPTUNER_I18N || {};

  function apply(lang) {
    // Enforce the allowlist HERE too, not just in currentLang(): apply() must never trust its
    // caller and fall through to an unvalidated value (fail-open). Anything not in LANGS clamps
    // to the safe default instead of being written into the DOM or used as a dictionary key.
    if (!isAllowedLang(lang)) lang = "es";
    document.documentElement.lang = lang;
    // Legal pages only exist in Spanish and English today; any language other than Spanish falls
    // back to the English page (a more likely-understood second language for most visitors) rather
    // than showing Spanish legal text under a mismatched language label.
    document.querySelectorAll("[data-i18n-legal]").forEach(function (el) {
      var pair = el.getAttribute("data-i18n-legal").split("|");
      el.setAttribute("href", "/" + (lang === "es" ? pair[0] : pair[1]));
    });
    if (lang === "es") return; // the page's own markup IS the Spanish copy
    var table = DICT[lang];
    if (!table) return;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (table[key] !== undefined) el.textContent = table[key];
    });
  }

  function isAllowedLang(code) { return LANGS.some(function (l) { return l.code === code; }); }

  function currentLang() {
    try {
      var saved = localStorage.getItem("gptuner_lang");
      if (isAllowedLang(saved)) return saved;
    } catch (e) {}
    var nav = (navigator.language || "es").slice(0, 2);
    return isAllowedLang(nav) ? nav : "es";
  }

  var SVG_NS = "http://www.w3.org/2000/svg", XLINK_NS = "http://www.w3.org/1999/xlink";
  function useIcon(id) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "icon");
    var use = document.createElementNS(SVG_NS, "use");
    use.setAttributeNS(XLINK_NS, "href", "#" + id);
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  function buildSwitcher(active) {
    var root = document.getElementById("langsel");
    if (!root) return;
    var current = LANGS.find(function (l) { return l.code === active; }) || LANGS[0];
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.appendChild(useIcon("i-globe"));
    var label = document.createElement("span");
    label.id = "langsel-label";
    label.textContent = current.label;
    btn.appendChild(label);
    btn.appendChild(useIcon("i-chevron"));
    var list = document.createElement("ul");
    list.setAttribute("role", "listbox");
    LANGS.forEach(function (l) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = l.label;
      if (l.code === active) b.setAttribute("aria-current", "true");
      b.addEventListener("click", function () {
        try { localStorage.setItem("gptuner_lang", l.code); } catch (e) {}
        apply(l.code);
        document.getElementById("langsel-label").textContent = l.label;
        root.querySelectorAll("li button").forEach(function (x) { x.removeAttribute("aria-current"); });
        b.setAttribute("aria-current", "true");
        root.classList.remove("open");
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    root.appendChild(btn);
    root.appendChild(list);
    btn.addEventListener("click", function () { root.classList.toggle("open"); });
    document.addEventListener("click", function (e) { if (!root.contains(e.target)) root.classList.remove("open"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var lang = currentLang();
    buildSwitcher(lang);
    apply(lang);
  });
})();
