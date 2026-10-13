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

  /* A manageable archive: show 18 submissions at a time.
     Filter controls remain functional without this progressive enhancement. */
  const galleryGrid = document.querySelector(".profile-submission-grid");
  const galleryCount = document.querySelector("[data-gallery-count]");
  if (galleryGrid && galleryItems.length) {
    const pageSize = 18;
    let page = 1;
    let activeStatus = "all";
    const moreButton = document.createElement("button");
    moreButton.type = "button";
    moreButton.className = "button secondary gallery-more";
    moreButton.textContent = "See more creations ↓";
    galleryGrid.after(moreButton);

    const updateGallery = (animate = false) => {
      const matching = galleryItems.filter(
        (item) => activeStatus === "all" || item.dataset.galleryStatus === activeStatus
      );
      const visible = Math.min(matching.length, page * pageSize);
      galleryItems.forEach((item) => {
        const index = matching.indexOf(item);
        const show = index !== -1 && index < visible;
        item.hidden = !show;
        if (show && animate && index >= visible - pageSize && index < visible) {
          item.classList.remove("gallery-pop");
          item.style.setProperty("--gallery-delay", String(Math.min(5, index % pageSize) * 28) + "ms");
          item.classList.add("gallery-pop");
        }
      });
      moreButton.hidden = matching.length <= visible;
      const label = activeStatus === "all" ? "creations" :
        activeStatus === "pending" ? "creations in review" : activeStatus + " creations";
      if (galleryCount) galleryCount.textContent = "Showing " + visible + " of " + matching.length + " " + label;
      if (emptyFiltered) emptyFiltered.hidden = matching.length !== 0;
    };

    galleryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeStatus = button.dataset.galleryFilter;
        page = 1;
        updateGallery();
      });
    });
    moreButton.addEventListener("click", () => {
      page += 1;
      updateGallery(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    });
    updateGallery();
  }

  /* Community artwork showcase: gentle automatic changes with a pause button.
     Thumbnails remain conventional image links without JavaScript. */
  const reel = document.querySelector("[data-feature-gallery]");
  const thumbnailLinks = reel ? Array.from(reel.querySelectorAll("[data-feature-pick]")) : [];
  const mainImage = reel?.querySelector("[data-feature-image]");
  const mainLink = reel?.querySelector("[data-feature-link]");
  const mainCaption = reel?.querySelector("[data-feature-caption]");
  const counter = reel?.querySelector("[data-feature-counter]");
  const next = reel?.querySelector("[data-feature-next]");
  const previous = reel?.querySelector("[data-feature-prev]");
  const pause = reel?.querySelector("[data-feature-pause]");
  const reducedMotion = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reel && thumbnailLinks.length > 1 && mainImage && mainLink) {
    document.documentElement.classList.add("studio-enhanced");
    let index = 0;
    let paused = reducedMotion;
    let interval = null;
    const show = (nextIndex) => {
      index = (nextIndex + thumbnailLinks.length) % thumbnailLinks.length;
      const selected = thumbnailLinks[index];
      const url = selected.dataset.featureSrc;
      const label = selected.dataset.featureTitle || "Squig Survival artwork";
      if (!url || !/^https?:\/\//i.test(url)) return;
      mainImage.src = url;
      mainImage.alt = label + " — approved creator artwork";
      mainLink.href = url;
      if (mainCaption) mainCaption.textContent = label;
      if (counter) counter.textContent =
        String(index + 1).padStart(2, "0") + " / " + String(thumbnailLinks.length).padStart(2, "0");
      thumbnailLinks.forEach((thumb, i) => thumb.setAttribute("aria-current", String(i === index)));
      if (!reducedMotion) {
        mainImage.classList.remove("is-swap-in");
        // Force the small animation to restart only on explicit image change.
        void mainImage.offsetWidth;
        mainImage.classList.add("is-swap-in");
      }
    };
    const stop = () => {
      if (interval !== null) { window.clearInterval(interval); interval = null; }
    };
    const start = () => {
      stop();
      if (paused || document.hidden) return;
      interval = window.setInterval(() => show(index + 1), 7500);
    };
    const togglePause = () => {
      paused = !paused;
      if (pause) {
        pause.setAttribute("aria-pressed", String(paused));
        pause.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
        pause.title = paused ? "Play slideshow" : "Pause slideshow";
        pause.textContent = paused ? "▶" : "Ⅱ";
      }
      start();
    };
    thumbnailLinks.forEach((thumb, i) => thumb.addEventListener("click", (event) => {
      event.preventDefault();
      show(i);
      start();
    }));
    next?.addEventListener("click", () => { show(index + 1); start(); });
    previous?.addEventListener("click", () => { show(index - 1); start(); });
    pause?.addEventListener("click", togglePause);
    if (reducedMotion && pause) {
      pause.setAttribute("aria-pressed", "true");
      pause.setAttribute("aria-label", "Play slideshow");
      pause.textContent = "▶";
    }
    reel.addEventListener("pointerenter", stop);
    reel.addEventListener("pointerleave", start);
    reel.addEventListener("focusin", stop);
    reel.addEventListener("focusout", (event) => {
      if (!reel.contains(event.relatedTarget)) start();
    });
    document.addEventListener("visibilitychange", start);
    start();
  }

  /* In-page artwork viewer, with native Escape, close and backdrop support.
     If dialogs are unavailable, original image links open normally. */
  const imageLinks = Array.from(document.querySelectorAll("[data-artwork-view]"));
  if (imageLinks.length && typeof HTMLDialogElement !== "undefined") {
    const viewer = document.createElement("dialog");
    viewer.className = "studio-image-viewer";
    viewer.setAttribute("aria-label", "Creator artwork viewer");
    const image = document.createElement("img");
    image.alt = "Selected Squig Survival creator artwork";
    const close = document.createElement("button");
    close.className = "studio-image-viewer__close";
    close.type = "button";
    close.textContent = "Close ×";
    close.setAttribute("aria-label", "Close artwork viewer");
    const controls = document.createElement("div");
    controls.className = "studio-image-viewer__controls";
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = "← Previous";
    const forward = document.createElement("button");
    forward.type = "button";
    forward.textContent = "Next →";
    const info = document.createElement("span");
    info.className = "studio-image-viewer__count";
    controls.append(back, info, forward);
    viewer.append(close, image, controls);
    document.body.append(viewer);
    let current = 0;
    let visibleImageLinks = [];
    const isVisible = (link) => {
      const card = link.closest("[data-gallery-status]");
      return !card || !card.hidden;
    };
    const showImage = (i) => {
      if (!visibleImageLinks.length) return;
      current = (i + visibleImageLinks.length) % visibleImageLinks.length;
      const selected = visibleImageLinks[current];
      image.src = selected.href;
      image.alt = selected.querySelector("img")?.alt || "Squig Survival creator artwork";
      info.textContent = (current + 1) + " of " + visibleImageLinks.length;
    };
    imageLinks.forEach((link) => link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      visibleImageLinks = imageLinks.filter(isVisible);
      showImage(Math.max(0, visibleImageLinks.indexOf(link)));
      viewer.showModal();
    }));
    const step = (delta) => showImage(current + delta);
    back.addEventListener("click", () => step(-1));
    forward.addEventListener("click", () => step(1));
    close.addEventListener("click", () => viewer.close());
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer) viewer.close();
    });
    viewer.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    });
  }

  /* On-scroll reveals are optional and never delay basic content. */
  const revealTargets = document.querySelectorAll("[data-reveal]");
  if (revealTargets.length && !reducedMotion && typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver((entries, self) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("reveal-pending");
        entry.target.classList.add("reveal-visible");
        self.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealTargets.forEach((element) => {
      // Don't hide initial viewport content while waiting for the callback.
      if (element.getBoundingClientRect().top > window.innerHeight * .7) {
        element.classList.add("reveal-pending");
        observer.observe(element);
      }
    });
  }
})();
