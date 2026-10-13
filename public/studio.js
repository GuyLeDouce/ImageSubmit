"use strict";

/* Progressive enhancements only: all forms retain their original action and encoding. */
(() => {
  const milestoneSelect = document.querySelector("[data-milestone-select]");
  const milestoneNote = document.getElementById("milestone-concept-note");
  if (milestoneSelect && milestoneNote) {
    const updateMilestone = () => {
      const option = milestoneSelect.options[milestoneSelect.selectedIndex];
      milestoneNote.textContent = option?.dataset.concept || milestoneNote.dataset.defaultText || "";
    };
    milestoneSelect.addEventListener("change", updateMilestone);
    updateMilestone();
  }

  document.querySelectorAll("[data-copy-death-race-prompt]").forEach((button) => {
    button.addEventListener("click", async () => {
      const prompt = button.closest(".prompt-card")?.querySelector("textarea");
      if (!prompt) return;
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(prompt.value);
        button.textContent = "Copied ✓";
        window.setTimeout(() => { button.textContent = "Copy full prompt"; }, 2000);
      } catch {
        prompt.focus();
        prompt.select();
        button.textContent = "Select and copy prompt";
      }
    });
  });

  const uploadInput = document.querySelector("[data-upload-input]");
  const dropZone = document.querySelector("[data-upload-zone]");
  const preview = document.querySelector("[data-upload-preview]");
  if (uploadInput && dropZone && preview) {
    let objectUrls = [];
    const clearUrls = () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls = [];
    };
    const renderPreviews = () => {
      clearUrls();
      preview.replaceChildren();
      const files = Array.from(uploadInput.files || []);
      preview.hidden = files.length === 0;
      if (!files.length) return;

      const count = document.createElement("p");
      count.className = "upload-preview__count";
      count.textContent = files.length === 1 ? "1 image ready to submit" : files.length + " images ready to submit";
      preview.appendChild(count);

      if (files.length > 10) {
        const warning = document.createElement("p");
        warning.className = "field-note";
        warning.textContent = "Please choose 10 images or fewer for each submission.";
        preview.appendChild(warning);
      }

      const grid = document.createElement("div");
      grid.className = "upload-preview__grid";
      files.forEach((file) => {
        const tile = document.createElement("div");
        tile.className = "upload-preview__item";
        if (file.type.startsWith("image/") && typeof URL.createObjectURL === "function") {
          const img = document.createElement("img");
          const url = URL.createObjectURL(file);
          objectUrls.push(url);
          img.src = url;
          img.alt = "Preview of " + file.name;
          img.className = "upload-preview__image";
          tile.appendChild(img);
        }
        const meta = document.createElement("div");
        meta.className = "upload-preview__meta";
        const name = document.createElement("strong");
        name.textContent = file.name;
        name.title = file.name;
        const size = document.createElement("small");
        size.textContent = (file.size / 1048576).toFixed(1) + " MB";
        meta.append(name, size);
        tile.appendChild(meta);
        grid.appendChild(tile);
      });
      preview.appendChild(grid);
    };
    uploadInput.addEventListener("change", renderPreviews);
    let dragDepth = 0;
    dropZone.addEventListener("dragenter", (event) => {
      event.preventDefault();
      dragDepth += 1;
      dropZone.classList.add("is-dragging");
    });
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    });
    dropZone.addEventListener("dragleave", (event) => {
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) dropZone.classList.remove("is-dragging");
    });
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dragDepth = 0;
      dropZone.classList.remove("is-dragging");
      const files = event.dataTransfer?.files;
      if (!files?.length || typeof DataTransfer === "undefined") return;
      try {
        const transfer = new DataTransfer();
        Array.from(files).forEach((file) => transfer.items.add(file));
        uploadInput.files = transfer.files;
        uploadInput.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {
        uploadInput.focus();
      }
    });
    window.addEventListener("pagehide", clearUrls);
  }

  const galleryButtons = Array.from(document.querySelectorAll("[data-gallery-filter]"));
  const galleryItems = Array.from(document.querySelectorAll("[data-gallery-status]"));
  const emptyFiltered = document.querySelector("[data-gallery-empty]");
  if (galleryButtons.length && galleryItems.length) {
    galleryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const status = button.dataset.galleryFilter;
        galleryButtons.forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
        let visible = 0;
        galleryItems.forEach((item) => {
          const show = status === "all" || item.dataset.galleryStatus === status;
          item.hidden = !show;
          if (show) visible += 1;
        });
        if (emptyFiltered) emptyFiltered.hidden = visible !== 0;
      });
    });
  }
})();
