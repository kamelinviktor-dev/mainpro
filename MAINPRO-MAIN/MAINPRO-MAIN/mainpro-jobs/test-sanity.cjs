/**
 * Node sanity: run `node test-sanity.cjs` in mainpro-jobs/ (дублирует фрагменты логики).
 */
const assert = require("assert");

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightSearchMatchHtml(raw, q) {
  if (q == null || String(q).trim() === "") {
    return escapeHtml(raw);
  }
  const s = String(raw == null ? "" : raw);
  const qLower = String(q).toLowerCase();
  if (qLower.length === 0) {
    return escapeHtml(s);
  }
  const sLower = s.toLowerCase();
  let out = "";
  let from = 0;
  let idx;
  for (;;) {
    idx = sLower.indexOf(qLower, from);
    if (idx < 0) {
      out += escapeHtml(s.slice(from));
      break;
    }
    out += escapeHtml(s.slice(from, idx));
    out += '<mark class="search-hit">';
    out += escapeHtml(s.slice(idx, idx + qLower.length));
    out += "</mark>";
    from = idx + qLower.length;
  }
  return out;
}

assert.strictEqual(escapeHtml("<a>"), "&lt;a&gt;");
assert.strictEqual(highlightSearchMatchHtml("foo", ""), "foo");
assert.ok(highlightSearchMatchHtml("Room 5 leak", "room").indexOf("search-hit") >= 0);
assert.ok(highlightSearchMatchHtml("a<b", "a").indexOf("&lt;") >= 0);
console.log("mainpro-jobs test-sanity: ok");
