// SND Villa - Cinematic Motion Scroll & Scrub Engine

function getOy() {
  if (typeof window === "undefined") return 11000;
  if (window.innerWidth <= 1024) return 0; // Mobile & tablet: 100svh hero flows naturally
  return 11000; // Desktop: Full 11000px cinematic scrub stage
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

const clamp = (val, min = 0, max = 1) => Math.max(min, Math.min(max, val));

document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("top");
  const video = document.getElementById("hero-video");
  const progressBar = document.getElementById("progress-bar");
  const headerNav = document.getElementById("header-nav");
  const capElements = document.querySelectorAll(".cap");
  const hintBtn = document.getElementById("hero-hint-btn");

  let targetProgress = 0;
  let smoothedProgress = 0;
  let isSeeking = false;
  let pendingSeekTime = null;
  let seekTimeout = null;

  // Desktop Video Scrub Engine
  function performSeek(time) {
    if (!video || !video.duration) return;

    const diff = Math.abs(video.currentTime - time);
    if (diff < 0.02) return;

    if (isSeeking) {
      pendingSeekTime = time;
      return;
    }

    isSeeking = true;
    try {
      video.currentTime = time;
    } catch (err) {
      isSeeking = false;
    }

    clearTimeout(seekTimeout);
    seekTimeout = setTimeout(() => {
      isSeeking = false;
      if (pendingSeekTime !== null) {
        const next = pendingSeekTime;
        pendingSeekTime = null;
        performSeek(next);
      }
    }, 45);
  }

  if (video) {
    video.addEventListener("seeked", () => {
      isSeeking = false;
      clearTimeout(seekTimeout);
      if (pendingSeekTime !== null) {
        const next = pendingSeekTime;
        pendingSeekTime = null;
        performSeek(next);
      }
    });

    video.addEventListener("seeking", () => {
      isSeeking = true;
    });
  }

  // Mobile / Desktop Video Initialization
  const setupVideo = () => {
    if (!video) return;
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const isMobileOrTablet = window.innerWidth <= 1024;
    if (isMobileOrTablet) {
      // Mobile: Continuous smooth native video playback
      video.loop = true;
      video.setAttribute("loop", "");
      video.play().catch(() => {});
    } else {
      // Desktop: Prepare for frame-accurate scroll scrubbing
      video.loop = false;
      video.removeAttribute("loop");
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            video.pause();
            if (video.duration) {
              performSeek(smoothedProgress * video.duration);
            }
          })
          .catch(() => {});
      }
    }
  };

  video?.addEventListener("loadedmetadata", setupVideo);
  video?.addEventListener("loadeddata", setupVideo);
  ["pointerdown", "touchstart", "touchmove", "wheel", "keydown", "scroll"].forEach(ev => {
    window.addEventListener(ev, setupVideo, { passive: true, once: true });
  });
  setupVideo();

  // Scroll listener
  const updateScroll = () => {
    const scrollY = window.pageYOffset || window.scrollY || 0;
    const isMobileOrTablet = window.innerWidth <= 1024;

    if (isMobileOrTablet) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      targetProgress = docHeight > 0 ? clamp(scrollY / docHeight, 0, 1) : 0;
    } else {
      targetProgress = Oy > 0 ? clamp(scrollY / Oy, 0, 1) : 0;
    }

    if (scrollY > 60) {
      headerNav?.classList.add("scrolled");
    } else {
      headerNav?.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", () => {
    updateOy();
    updateScroll();
    setupVideo();
  }, { passive: true });
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      updateOy();
      updateScroll();
      setupVideo();
    }, 150);
  }, { passive: true });
  updateScroll();

  // Hint button tap to arrive at The Villa
  hintBtn?.addEventListener("click", () => {
    const tower = document.getElementById("tower");
    if (tower) {
      tower.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // Animation Loop: Scrubbing on Desktop, Clean Autoplay on Mobile
  function renderLoop() {
    const scrollY = window.pageYOffset || window.scrollY || 0;
    const isMobileOrTablet = window.innerWidth <= 1024;

    if (isMobileOrTablet) {
      // Mobile: Ensure video is playing fluidly in loop
      if (video && video.paused && !video.ended) {
        video.play().catch(() => {});
      }

      // Progress bar tracks page scroll
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? clamp(scrollY / docHeight, 0, 1) : 0;
      if (progressBar) {
        progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
      }
    } else {
      // Desktop: Frame-Accurate Video Scrub Engine
      const isHeroVisible = scrollY <= Oy + window.innerHeight;

      if (isHeroVisible) {
        targetProgress = clamp(scrollY / Oy, 0, 1);

        // Smooth desktop momentum
        smoothedProgress += (targetProgress - smoothedProgress) * 0.15;
        if (Math.abs(targetProgress - smoothedProgress) < 0.0002) {
          smoothedProgress = targetProgress;
        }

        if (video?.duration) {
          const targetTime = smoothedProgress * video.duration;
          performSeek(targetTime);
        }

        // Synchronize Desktop Captions
        const captionFloat = clamp(smoothedProgress * 5, 0, 5);
        capElements.forEach((el, idx) => {
          const dist = Math.abs(captionFloat - idx);
          let opacity = 0;
          if (dist < 0.55) {
            const raw = 1 - (dist / 0.55);
            opacity = raw * raw * (3 - 2 * raw);
          }
          el.style.opacity = opacity.toFixed(4);
          el.style.transform = `translate3d(0, ${((1 - opacity) * 20).toFixed(1)}px, 0)`;
          el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
        });

        // Synchronize Desktop Progress Bar
        if (progressBar) {
          progressBar.style.transform = `scaleX(${smoothedProgress.toFixed(4)})`;
        }
      }
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
