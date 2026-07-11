(() => {
  const uglyCityEraKey = "ugly_city";

  document.querySelectorAll("[data-era-repair-select]").forEach((select) => {
    const form = select.closest("form");
    const milestoneField = form?.querySelector("[data-milestone-repair-field]");
    if (!milestoneField) return;

    const syncMilestoneVisibility = () => {
      milestoneField.hidden = select.value !== uglyCityEraKey;
    };

    select.addEventListener("change", syncMilestoneVisibility);
    syncMilestoneVisibility();
  });

  document.querySelectorAll("[data-review-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const detail = button.closest(".admin-review-detail");
      const panelName = button.getAttribute("data-review-toggle");
      const panel = detail?.querySelector(`[data-review-panel="${panelName}"]`);
      if (!panel) return;

      const shouldOpen = panel.classList.contains("is-hidden");
      detail.querySelectorAll("[data-review-panel]").forEach((candidate) => {
        candidate.classList.add("is-hidden");
      });
      if (shouldOpen) panel.classList.remove("is-hidden");
    });
  });

  const gifButton = document.querySelector("[data-gif-button]");
  const gifStatus = document.querySelector("[data-gif-status]");
  if (!gifButton || !gifStatus) return;

  const gifSources = Array.from(document.querySelectorAll("[data-gif-source]"))
    .slice(0, 50)
    .map((element) => element.getAttribute("data-gif-source"))
    .filter(Boolean);

  gifButton.disabled = gifSources.length === 0;
  if (!gifSources.length) {
    gifStatus.textContent = "No approved creations are available for a GIF yet.";
    return;
  }

  gifButton.addEventListener("click", async () => {
    const previousLabel = gifButton.textContent;
    gifButton.disabled = true;
    gifButton.textContent = "Building...";
    gifStatus.textContent = "Building GIF from random approved creations.";

    try {
      const selectedUrls = shuffle(gifSources).slice(0, Math.min(10, gifSources.length));
      const gif = await buildAnimatedGif(selectedUrls, {
        width: 512,
        height: 512,
        delayCs: 250,
      });
      const objectUrl = URL.createObjectURL(gif);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `squig-survival-${new Date().toISOString().slice(0, 10)}.gif`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      gifStatus.textContent = `Downloaded GIF with ${selectedUrls.length} random creation${selectedUrls.length === 1 ? "" : "s"}.`;
    } catch (error) {
      gifStatus.textContent = error?.message || "Could not build the GIF.";
    } finally {
      gifButton.disabled = false;
      gifButton.textContent = previousLabel;
    }
  });

  function shuffle(values) {
    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  async function buildAnimatedGif(urls, options) {
    const canvas = document.createElement("canvas");
    canvas.width = options.width;
    canvas.height = options.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const frames = [];

    for (const url of urls) {
      const image = await loadImage(url);
      drawContainedImage(context, image, options.width, options.height);
      let imageData;
      try {
        imageData = context.getImageData(0, 0, options.width, options.height);
      } catch (error) {
        throw new Error("This browser could not read one of the images for GIF export. Open the image locally or use same-origin uploads.");
      }
      frames.push(imageDataToPaletteIndexes(imageData));
    }

    return new Blob([encodeGif(frames, options.width, options.height, options.delayCs)], {
      type: "image/gif",
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load one of the selected images for the GIF."));
      image.src = url;
    });
  }

  function drawContainedImage(context, image, width, height) {
    context.fillStyle = "#fff8e8";
    context.fillRect(0, 0, width, height);

    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const scale = Math.min(width / imageWidth, height / imageHeight);
    const drawWidth = Math.max(1, Math.round(imageWidth * scale));
    const drawHeight = Math.max(1, Math.round(imageHeight * scale));
    const drawX = Math.round((width - drawWidth) / 2);
    const drawY = Math.round((height - drawHeight) / 2);
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function imageDataToPaletteIndexes(imageData) {
    const { data, width, height } = imageData;
    const indexes = new Uint8Array(width * height);
    for (let dataIndex = 0, pixelIndex = 0; dataIndex < data.length; dataIndex += 4, pixelIndex += 1) {
      if (data[dataIndex + 3] < 128) {
        indexes[pixelIndex] = 255;
        continue;
      }
      indexes[pixelIndex] = ((data[dataIndex] >> 5) << 5) | ((data[dataIndex + 1] >> 5) << 2) | (data[dataIndex + 2] >> 6);
    }
    return indexes;
  }

  function encodeGif(frames, width, height, delayCs) {
    const bytes = [];
    writeAscii(bytes, "GIF89a");
    writeWord(bytes, width);
    writeWord(bytes, height);
    bytes.push(0xf7, 255, 0);
    writeGlobalPalette(bytes);
    writeAscii(bytes, "\x21\xff\x0bNETSCAPE2.0\x03\x01\x00\x00\x00");

    frames.forEach((frame) => {
      writeAscii(bytes, "\x21\xf9\x04");
      bytes.push(0x04);
      writeWord(bytes, delayCs);
      bytes.push(0, 0);
      bytes.push(0x2c);
      writeWord(bytes, 0);
      writeWord(bytes, 0);
      writeWord(bytes, width);
      writeWord(bytes, height);
      bytes.push(0);
      bytes.push(8);
      writeSubBlocks(bytes, encodeLiteralLzw(frame));
    });

    bytes.push(0x3b);
    return new Uint8Array(bytes);
  }

  function writeGlobalPalette(bytes) {
    for (let red = 0; red < 8; red += 1) {
      for (let green = 0; green < 8; green += 1) {
        for (let blue = 0; blue < 4; blue += 1) {
          bytes.push(
            Math.round((red * 255) / 7),
            Math.round((green * 255) / 7),
            Math.round((blue * 255) / 3)
          );
        }
      }
    }
  }

  function encodeLiteralLzw(indexes) {
    const clearCode = 256;
    const endCode = 257;
    const codeSize = 9;
    const output = [];
    let bitBuffer = 0;
    let bitCount = 0;
    let sinceClear = 0;

    const writeCode = (code) => {
      bitBuffer |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        output.push(bitBuffer & 0xff);
        bitBuffer >>= 8;
        bitCount -= 8;
      }
    };

    writeCode(clearCode);
    indexes.forEach((index) => {
      if (sinceClear >= 240) {
        writeCode(clearCode);
        sinceClear = 0;
      }
      writeCode(index);
      sinceClear += 1;
    });
    writeCode(endCode);
    if (bitCount > 0) output.push(bitBuffer & 0xff);
    return output;
  }

  function writeSubBlocks(bytes, data) {
    for (let index = 0; index < data.length; index += 255) {
      const chunk = data.slice(index, index + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0);
  }

  function writeWord(bytes, value) {
    bytes.push(value & 0xff, (value >> 8) & 0xff);
  }

  function writeAscii(bytes, value) {
    for (let index = 0; index < value.length; index += 1) {
      bytes.push(value.charCodeAt(index) & 0xff);
    }
  }
})();
