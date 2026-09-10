// SND Villa - Cinematic Scroll & Scrub Engine

function getOy() {
  if (typeof window === "undefined") return 11000;
  if (window.innerWidth <= 600) return 2000;
  if (window.innerWidth <= 900) return 2400;
  return 11000;
}

let Oy = getOy();

function updateOy() {
  Oy = getOy();
}
window.addEventListener("resize", updateOy, { passive: true });
window.addEventListener("orientationchange", () => {
  setTimeout(updateOy, 150);
}, { passive: true });
updateOy();

const captionsData = [
  {
    from: 0,
    to: 0.14,
    align: "center",
    eyebrow: "SND · VILLA",
    title: "At the edge of the sea",
    sub: "A cliffside residence where the land runs out and the view begins."
  },
  {
    from: 0.16,
    to: 0.29,
    align: "left",
    eyebrow: "01 — THE COAST",
    title: "Where the cliff meets blue",
    sub: "Carved into the rock, open to the horizon."
  },
  {
    from: 0.31,
    to: 0.44,
    align: "right",
    eyebrow: "02 — THE POOL",
    title: "Swim to the horizon",
    sub: "An infinity edge that meets the Mediterranean."
  },
  {
    from: 0.47,
    to: 0.59,
    align: "left",
    eyebrow: "03 — INSIDE",
    title: "The sea, framed in glass",
    sub: "Living spaces that dissolve into the view."
  },
  {
    from: 0.62,
    to: 0.75,
    align: "right",
    eyebrow: "04 — THE SUITE",
    title: "Wake above the water",
    sub: "A master suite that opens to the sea."
  },
  {
    from: 0.78,
    to: 1.0,
    align: "center",
    eyebrow: "05 — THE TERRACE",
    title: "Golden hour, daily",
    sub: "An evening at the edge of the world.",
    cta: "Arrange a Viewing"
  }
];

const clamp = (val, min = 0, max = 1) => Math.max(min, Math.min(max, val));
const mapRange = (p, min, max) => clamp((p - min) / (max - min));

function calcCaptionOpacity(progress, cap) {
  if (progress < cap.from - 0.03 || progress > cap.to + 0.03) return 0;
  const range = cap.to - cap.from;
  const fadeIn = cap.from <= 0.001 ? 1 : mapRange(progress, cap.from, cap.from + range * 0.24);
  const fadeOut = cap.to >= 0.999 ? 1 : 1 - mapRange(progress, cap.to - range * 0.24, cap.to);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("top");
  const video = document.getElementById("hero-video");
  const progressBar = document.getElementById("progress-bar");
  const headerNav = document.getElementById("header-nav");
  const capElements = document.querySelectorAll(".cap");
  const hintBtn = document.getElementById("hero-hint-btn");

  let targetProgress = 0;
  let smoothedTime = 0;
  let videoArmed = false;
  let isSeeking = false;
  let lastSeekTime = 0;
  let queuedSeekTime = null;
  let seekSafetyTimeout = null;

  // Rate-limited non-blocking seek engine
  function performSeek(time) {
    if (!video || !video.duration) return;
    const now = performance.now();
    const isMobile = window.innerWidth <= 900;
    // Minimum interval: 90ms on mobile (~11 seeks/sec), 35ms on desktop (~28 seeks/sec)
    const minInterval = isMobile ? 90 : 35;

    if (isSeeking || (now - lastSeekTime < minInterval)) {
      queuedSeekTime = time;
      return;
    }

    if (Math.abs(video.currentTime - time) < 0.035) {
      return;
    }

    isSeeking = true;
    lastSeekTime = now;
    queuedSeekTime = null;

    clearTimeout(seekSafetyTimeout);
    seekSafetyTimeout = setTimeout(() => {
      isSeeking = false;
      if (queuedSeekTime !== null) {
        const next = queuedSeekTime;
        queuedSeekTime = null;
        performSeek(next);
      }
    }, isMobile ? 110 : 70);

    try {
      video.currentTime = time;
    } catch (e) {
      isSeeking = false;
    }
  }

  video?.addEventListener("seeked", () => {
    isSeeking = false;
    clearTimeout(seekSafetyTimeout);
    if (queuedSeekTime !== null) {
      const next = queuedSeekTime;
      queuedSeekTime = null;
      if (window.innerWidth <= 900) {
        setTimeout(() => performSeek(next), 20);
      } else {
        performSeek(next);
      }
    }
  });

  video?.addEventListener("seeking", () => {
    isSeeking = true;
  });

  // Ensure video is actively playing and primed for continuous playback
  const startVideoPlayback = () => {
    if (!video) return;
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");

    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  };

  startVideoPlayback();
  video?.addEventListener("loadeddata", startVideoPlayback);
  ["pointerdown", "touchstart", "click", "scroll"].forEach(ev => {
    window.addEventListener(ev, startVideoPlayback, { passive: true, once: true });
  });

  // Calculate scroll position (Zero layout reflow: use window.scrollY directly)
  let scrollStopTimer = null;

  const updateScroll = () => {
    const scrollY = window.pageYOffset || window.scrollY || 0;
    targetProgress = clamp(scrollY / Oy, 0, 1);

    // Navbar background on scroll past hero
    if (scrollY > 60) {
      headerNav?.classList.add("scrolled");
    } else {
      headerNav?.classList.remove("scrolled");
    }

    // High-precision settle on scroll stop for mobile chapter sync
    clearTimeout(scrollStopTimer);
    scrollStopTimer = setTimeout(() => {
      if (video?.duration) {
        const isMobile = window.innerWidth <= 900;
        const targetTime = targetProgress * video.duration;
        if (isMobile) {
          if (Math.abs(video.currentTime - targetTime) > 1.0) {
            try {
              video.currentTime = targetTime;
              video.play().catch(() => {});
            } catch (e) {}
          }
        } else {
          performSeek(targetTime);
        }
      }
    }, 80);
  };

  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", () => {
    updateOy();
    updateScroll();
  }, { passive: true });
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      updateOy();
      updateScroll();
    }, 150);
  }, { passive: true });
  updateScroll();

  // Hint button tap to arrive
  hintBtn?.addEventListener("click", () => {
    const tower = document.getElementById("tower");
    if (tower) {
      tower.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // Animation Loop (requestAnimationFrame with Lerp and Viewport Culling)
  function renderLoop() {
    const scrollY = window.pageYOffset || window.scrollY || 0;
    const isHeroVisible = scrollY <= Oy + window.innerHeight;

    if (isHeroVisible && video?.duration) {
      const duration = video.duration;
      const targetTime = targetProgress * duration;
      const isMobile = window.innerWidth <= 900;

      // Make sure video is playing while inside hero
      if (video.paused) {
        video.play().catch(() => {});
      }

      if (isMobile) {
        // Mobile: smooth chapter-seeking (never locks touch scroll)
        if (Math.abs(video.currentTime - targetTime) > 1.8 && !isSeeking) {
          performSeek(targetTime);
        }
      } else {
        // Desktop: fine-grained frame scrubbing
        const lerp = 0.22;
        smoothedTime += (targetTime - smoothedTime) * lerp;
        if (Math.abs(targetTime - smoothedTime) < 0.002) {
          smoothedTime = targetTime;
        }
        performSeek(smoothedTime);
      }

      // Update Captions
      capElements.forEach((el, idx) => {
        const capData = captionsData[idx];
        if (!capData) return;
        const opacity = calcCaptionOpacity(targetProgress, capData);
        el.style.opacity = opacity;
        el.style.transform = `translateY(${(1 - opacity) * 18}px)`;
        el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      });

      // Update Progress Bar
      if (progressBar) {
        progressBar.style.transform = `scaleX(${targetProgress})`;
      }
    } else if (video && !video.paused && scrollY > Oy + 300) {
      // Pause video when scrolled completely past hero to preserve battery
      video.pause();
    }

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  // Initialize Lenis Smooth Scroll or fallback for mobile
  initSmoothScroll();

  // Initialize Modal and Interactive Handlers
  initModal();
  initMobileMenu();
});

// Smooth Scroll Setup (Lenis on desktop + native smooth scroll on touch mobile)
function initSmoothScroll() {
  let lenis = null;
  const isFinePointer =
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (isFinePointer) {
    import("https://cdn.jsdelivr.net/npm/lenis@1.1.18/+esm")
      .then(({ default: Lenis }) => {
        lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.5,
        });

        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        bindAnchorClicks(lenis);
      })
      .catch((err) => {
        console.warn("Lenis fallback to native:", err);
        bindAnchorClicks(null);
      });
  } else {
    bindAnchorClicks(null);
  }
}

// Universal Anchor Link Smooth Scrolling (works on Mobile and Desktop)
function bindAnchorClicks(lenisInstance) {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href && href !== "#" && href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();

          // Close mobile menu if open
          const drawer = document.getElementById("mobile-drawer");
          const backdrop = document.getElementById("mobile-drawer-backdrop");
          const toggle = document.getElementById("mobile-toggle");
          drawer?.classList.remove("active");
          backdrop?.classList.remove("active");
          toggle?.classList.remove("active");
          toggle?.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";

          if (lenisInstance) {
            lenisInstance.scrollTo(target, { offset: 0, duration: 1.2 });
          } else {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    });
  });
}

// Modal Dialog Management
function initModal() {
  const modal = document.getElementById("viewing-modal");
  const modalClose = document.getElementById("modal-close");
  const form = document.getElementById("viewing-form");
  const successBox = document.getElementById("modal-success");
  const hiddenResidenceInput = document.getElementById("residence-choice");
  const refCodeSpan = document.getElementById("booking-ref");

  // Custom Select Elements
  const customSelect = document.getElementById("custom-residence-select");
  const selectTrigger = document.getElementById("select-trigger");
  const selectLabel = document.getElementById("selected-residence-label");
  const selectItems = document.querySelectorAll(".custom-select-item");

  function selectResidence(val, label) {
    if (hiddenResidenceInput) hiddenResidenceInput.value = val;
    if (selectLabel) selectLabel.textContent = label || val;
    selectItems.forEach((item) => {
      const isMatch = item.getAttribute("data-value") === val;
      item.classList.toggle("selected", isMatch);
      item.setAttribute("aria-selected", isMatch ? "true" : "false");
    });
    if (customSelect) customSelect.classList.remove("open");
    if (selectTrigger) selectTrigger.setAttribute("aria-expanded", "false");
  }

  // Toggle Dropdown
  selectTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = customSelect.classList.toggle("open");
    selectTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  // Select Item Click
  selectItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = item.getAttribute("data-value");
      const label = item.getAttribute("data-label") || val;
      selectResidence(val, label);
    });
  });

  // Close custom dropdown on outside click
  document.addEventListener("click", (e) => {
    if (!customSelect?.contains(e.target)) {
      customSelect?.classList.remove("open");
      selectTrigger?.setAttribute("aria-expanded", "false");
    }
  });

  function openModal(residenceName = "The Sea Villa") {
    if (!modal) return;
    const matchingItem = Array.from(selectItems).find(
      (item) => item.getAttribute("data-value") === residenceName
    );
    const label = matchingItem ? matchingItem.getAttribute("data-label") : residenceName;
    selectResidence(residenceName, label);

    if (form) form.style.display = "flex";
    if (successBox) successBox.classList.remove("active");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("active");
    customSelect?.classList.remove("open");
    selectTrigger?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  // Bind all triggers
  document.querySelectorAll('[data-action="enquire"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const residence = btn.getAttribute("data-residence") || "The Sea Villa";
      openModal(residence);
    });
  });

  modalClose?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("active")) {
      closeModal();
    }
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const refCode = "SND-" + Math.floor(100000 + Math.random() * 900000);
    if (refCodeSpan) refCodeSpan.textContent = refCode;
    form.style.display = "none";
    successBox?.classList.add("active");
  });
}

// Mobile Menu Drawer with Backdrop and Animation
function initMobileMenu() {
  const toggle = document.getElementById("mobile-toggle");
  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("mobile-drawer-backdrop");
  const closeBtn = document.getElementById("mobile-drawer-close");

  function openDrawer() {
    drawer?.classList.add("active");
    backdrop?.classList.add("active");
    toggle?.classList.add("active");
    toggle?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer?.classList.remove("active");
    backdrop?.classList.remove("active");
    toggle?.classList.remove("active");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (drawer?.classList.contains("active")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeDrawer();
  });

  backdrop?.addEventListener("click", closeDrawer);

  drawer?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeDrawer();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("active")) {
      closeDrawer();
    }
  });
}
