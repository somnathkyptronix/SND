// SND Villa - Cinematic Motion Scroll & Scrub Engine

function getOy() {
  if (typeof window === "undefined") return 11000;
  if (window.innerWidth <= 600) return 4000;
  if (window.innerWidth <= 900) return 4600;
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

const clamp = (val, min = 0, max = 1) => Math.max(min, Math.min(max, val));

document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("top");
  const video = document.getElementById("hero-video");
  const bgLayers = document.querySelectorAll(".hero-bg-layer");
  const progressBar = document.getElementById("progress-bar");
  const headerNav = document.getElementById("header-nav");
  const capElements = document.querySelectorAll(".cap");
  const hintBtn = document.getElementById("hero-hint-btn");

  let targetProgress = 0;
  let smoothedProgress = 0;
  let videoArmed = false;
  let isSeeking = false;
  let seekTimeout = null;

  if (video) {
    video.addEventListener("seeking", () => {
      isSeeking = true;
      clearTimeout(seekTimeout);
      seekTimeout = setTimeout(() => { isSeeking = false; }, 70);
    });
    video.addEventListener("seeked", () => {
      isSeeking = false;
      clearTimeout(seekTimeout);
    });
  }

  // Desktop video warming
  const armVideo = () => {
    if (videoArmed || !video) return;
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          video.pause();
          videoArmed = true;
        })
        .catch(() => {
          videoArmed = true;
        });
    } else {
      try {
        video.pause();
      } catch (e) {}
      videoArmed = true;
    }
  };

  video?.addEventListener("loadedmetadata", armVideo);
  video?.addEventListener("loadeddata", armVideo);
  ["pointerdown", "touchstart", "touchmove", "wheel", "keydown", "scroll"].forEach(ev => {
    window.addEventListener(ev, armVideo, { passive: true, once: true });
  });

  // Zero-layout-reflow scroll listener
  const updateScroll = () => {
    const scrollY = window.pageYOffset || window.scrollY || 0;
    targetProgress = clamp(scrollY / Oy, 0, 1);

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

  // High-Performance Dual-Engine: Silky Motion Images on Mobile, Scrub on Desktop
  function renderLoop() {
    const scrollY = window.pageYOffset || window.scrollY || 0;
    const isHeroVisible = scrollY <= Oy + window.innerHeight;

    if (isHeroVisible) {
      const isMobile = window.innerWidth <= 900;
      targetProgress = clamp(scrollY / Oy, 0, 1);

      // Liquid smooth momentum LERP for physical, buttery responsiveness
      const lerpRate = isMobile ? 0.12 : 0.16;
      smoothedProgress += (targetProgress - smoothedProgress) * lerpRate;
      if (Math.abs(targetProgress - smoothedProgress) < 0.0003) {
        smoothedProgress = targetProgress;
      }

      if (isMobile && bgLayers.length > 0) {
        // Continuous float index spanning 0.0 to 5.0 across the 6 luxury chapters
        const floatIndex = clamp(smoothedProgress * 5, 0, 5);
        const baseIndex = Math.min(4, Math.floor(floatIndex));
        const t = floatIndex - baseIndex; // 0.0 -> 1.0 transition between chapter k and k+1

        // Smoothstep cubic easing: zero harsh acceleration, organic dissolve
        const easeT = t * t * (3 - 2 * t);

        bgLayers.forEach((layer, idx) => {
          let opacity = 0;

          if (idx === baseIndex) {
            // Active base layer remains 100% solid, guaranteeing zero black flash or dimming
            opacity = 1;
          } else if (idx === baseIndex + 1) {
            // Incoming layer dissolves smoothly over the solid base layer
            opacity = easeT;
          } else {
            opacity = 0;
          }

          layer.style.opacity = opacity.toFixed(4);

          // Subtle cinematic Ken Burns drift & scale tied directly to scroll progression
          if (opacity > 0.001) {
            const localOffset = floatIndex - idx;
            const scale = 1.05 + (localOffset * 0.024);
            const panY = localOffset * -10;
            layer.style.transform = `translate3d(0, ${panY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
            layer.style.visibility = "visible";
          } else {
            layer.style.visibility = "hidden";
          }
        });
      } else if (video?.duration) {
        // Desktop Engine: Frame-accurate video motion scrubbing with lerp
        const duration = video.duration;
        const targetTime = smoothedProgress * duration;
        const diff = Math.abs(video.currentTime - targetTime);
        if (diff > 0.028 && !isSeeking) {
          try {
            isSeeking = true;
            video.currentTime = targetTime;
          } catch (err) {
            isSeeking = false;
          }
        }
      }

      // Synchronize Captions with exact chapter alignment
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

      // Synchronize Progress Bar
      if (progressBar) {
        progressBar.style.transform = `scaleX(${smoothedProgress.toFixed(4)})`;
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
