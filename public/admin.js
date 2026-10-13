"use strict";

// Keep the review controls lightweight. GIF creation and its image proxy
// were removed: they used large image buffers and blocked the browser.
(() => {
  function syncMilestones(eraSelect) {
    const form = eraSelect.closest("form");
    const field = form?.querySelector("[data-milestone-repair-field]");
    const select = field?.querySelector("select");
    if (!field || !select) return;

    let available = 0;
    for (const option of select.options) {
      if (!option.value) continue;
      const matches = option.dataset.era === eraSelect.value;
      option.hidden = !matches;
      option.disabled = !matches;
      if (matches) available += 1;
      if (!matches && option.selected) select.value = "";
    }
    field.hidden = available === 0;
    select.required = available > 0 && field.hasAttribute("data-required-milestone");
  }

  document.querySelectorAll("[data-era-repair-select]").forEach((select) => {
    select.addEventListener("change", () => syncMilestones(select));
    syncMilestones(select);
  });

  // Event delegation means one listener rather than several per submission.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-review-toggle]");
    if (!button) return;
    const detail = button.closest(".admin-review-detail");
    const name = button.dataset.reviewToggle;
    const panel = detail?.querySelector(`[data-review-panel="${name}"]`);
    if (!panel) return;
    const open = panel.classList.contains("is-hidden");
    detail.querySelectorAll("[data-review-panel]").forEach((item) => {
      item.classList.add("is-hidden");
    });
    if (open) panel.classList.remove("is-hidden");
  });
})();
