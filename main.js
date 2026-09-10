// SND Villa - Cinematic Scroll & Scrub Engine

let Oy = typeof window !== "undefined" && window.innerWidth <= 900 ? 5500 : 11000;

function updateOy() {
  Oy = window.innerWidth <= 900 ? 5500 : 11000;
}
window.addEventListener("resize", updateOy);
updateOy();

const captionsData = [
  {
    from: 0,
    to: 0.12,
    align: "center",
    eyebrow: "SND · VILLA",
    title: "At the edge of the sea",
    sub: "A cliffside residence where the land runs out and the view begins."
  },
  {
    from: 0.15,
    to: 0.27,
    align: "left",
    eyebrow: "01 — THE COAST",
    title: "Where the cliff meets blue",
    sub: "Carved into the rock, open to the horizon."
  },
  {
    from: 0.3,
    to: 0.43,
    align: "right",
    eyebrow: "02 — THE POOL",
    title: "Swim to the horizon",
    sub: "An infinity edge that meets the Mediterranean."
  },
  {
    from: 0.46,
    to: 0.58,
    align: "left",
    eyebrow: "03 — INSIDE",
    title: "The sea, framed in glass",
    sub: "Living spaces that dissolve into the view."
  },
  {
    from: 0.61,
    to: 0.74,
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
  if (progress < cap.from - 0.02 || progress > cap.to + 0.02) return 0;
  const range = cap.to - cap.from;
  const fadeIn = cap.from <= 0.001 ? 1 : mapRange(progress, cap.from, cap.from + range * 0.22);
  const fadeOut = cap.to >= 0.999 ? 1 : 1 - mapRange(progress, cap.to - range * 0.22, cap.to);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

document.addEventListener("DOMContentLoaded", () => {
  const hero = document.getElementById("top");
  const video = document.getElementById("hero-video");
  const progressBar = document.getElementById("progress-bar");
  const headerNav = document.getElementById("header-nav");
  const capElements = document.querySelectorAll(".cap");

  let targetProgress = 0;
  let smoothedTime = 0;
  let videoArmed = false;
  let isVideoSeeking = false;

  // Unlock video playback for smooth scrubbing on both mobile and desktop
  const armVideo = () => {
    if (videoArmed || !video) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && playPromise.then) {
      playPromise
        .then(() => {
          video.pause();
          videoArmed = true;
        })
        .catch(() => {});
    } else {
      try {
        video.pause();
      } catch (e) {}
      videoArmed = true;
    }
  };

  video.addEventListener("loadeddata", armVideo);
  ["pointerdown", "touchstart", "touchmove", "wheel", "keydown", "scroll"].forEach(ev => {
    window.addEventListener(ev, armVideo, { passive: true });
  });

  // Calculate scroll position
  const updateScroll = () => {
    if (!hero) return;
    const heroRect = hero.getBoundingClientRect();
    targetProgress = clamp(-heroRect.top / Oy, 0, 1);

    // Navbar background on scroll past hero
    if (window.scrollY > 100) {
      headerNav?.classList.add("scrolled");
    } else {
      headerNav?.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", () => {
    updateOy();
    updateScroll();
  });
  updateScroll();

  // Animation Loop (requestAnimationFrame with Lerp)
  function renderLoop() {
    const duration = video?.duration || 0;
    if (duration > 0 && videoArmed) {
      const targetTime = targetProgress * duration;
      smoothedTime += (targetTime - smoothedTime) * 0.15;

      if (Math.abs(targetTime - smoothedTime) > 0.002 && !isVideoSeeking) {
        try {
          video.currentTime = smoothedTime;
        } catch (err) {}
      }
    }

    // Update Captions
    capElements.forEach((el, idx) => {
      const capData = captionsData[idx];
      if (!capData) return;
      const opacity = calcCaptionOpacity(targetProgress, capData);
      el.style.opacity = opacity;
      el.style.transform = `translateY(${(1 - opacity) * 26}px)`;
      el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
    });

    // Update Progress Bar
    if (progressBar) {
      progressBar.style.transform = `scaleX(${targetProgress})`;
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
  const isFinePointer = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
          const drawer = document.getElementById("mobile-drawer");
          if (drawer) drawer.classList.remove("active");

          if (lenisInstance) {
            lenisInstance.scrollTo(target, { offset: 0, duration: 1.4 });
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

// Mobile Menu Drawer
function initMobileMenu() {
  const toggle = document.getElementById("mobile-toggle");
  const drawer = document.getElementById("mobile-drawer");

  toggle?.addEventListener("click", () => {
    drawer?.classList.toggle("active");
  });

  drawer?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      drawer.classList.remove("active");
    });
  });
}
