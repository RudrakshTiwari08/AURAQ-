/**
 * BRAND — Landing Page Interactive Parallax Engine
 * Orchestrates GSAP ScrollTrigger timelines, kinetic typography splits,
 * dynamic CSS phone simulation, and tilted glass dashboard transitions.
 */

(function () {
  'use strict';

  // Check user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  // Initialize top scroll progress bar tracking
  function initProgressBar() {
    const bar = document.querySelector('.scroll-progress-bar');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      bar.style.width = scrolled + '%';
    }, { passive: true });
  }

  // Update navigation styling when scrolled beyond threshold
  function initNavbarScroll() {
    const nav = document.querySelector('.landing-nav');
    if (!nav) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // Number counting utility for owner view metrics
  function animateCounter(element, targetValue, duration = 1.6) {
    if (!element) return;
    const startValue = 0;
    const startTime = performance.now();

    function updateNumber(now) {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quartic
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(startValue + (targetValue - startValue) * ease);
      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = targetValue.toLocaleString();
      }
    }
    requestAnimationFrame(updateNumber);
  }

  // Initialize GSAP Parallax Timelines
  function initParallaxStory() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded. Running fallback mode.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // If reduced motion is requested or on small mobile, gracefully activate elements statically
    if (prefersReducedMotion || isMobile) {
      // Show Telegram messages immediately
      document.querySelectorAll('.tg-msg').forEach(el => el.classList.add('visible'));
      // Show steps
      document.querySelectorAll('.how-step-card').forEach(el => el.classList.add('active'));
      // Flatten dashboard preview
      const dash = document.querySelector('.dashboard-tilted-glass');
      if (dash) {
        dash.style.transform = 'none';
        dash.style.opacity = '1';
      }
      // Animate counters once when scrolled into view
      ScrollTrigger.create({
        trigger: '.owner-view-section',
        start: 'top 80%',
        once: true,
        onEnter: () => {
          document.querySelectorAll('.counter-value').forEach(el => {
            const target = parseInt(el.getAttribute('data-target'), 10) || 0;
            animateCounter(el, target);
          });
        }
      });
      return;
    }

    /* -------------------------------------------------------------
       SCENE 1: HERO PARALLAX & HEADLINE DRIFT
       ------------------------------------------------------------- */
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2
      }
    });

    // Split and drift apart headline lines
    heroTl.to('.hero-headline-line1', {
      x: -65,
      y: -30,
      opacity: 0.85,
      ease: 'none'
    }, 0);

    heroTl.to('.hero-headline-line2', {
      x: 65,
      y: 40,
      opacity: 0.85,
      ease: 'none'
    }, 0);

    // Parallax depth layers moving at differential speeds
    heroTl.to('.hero-orb-1', { y: 180, ease: 'none' }, 0);
    heroTl.to('.hero-orb-2', { y: 280, ease: 'none' }, 0);
    heroTl.to('.hero-grid', { y: 120, ease: 'none' }, 0);
    heroTl.to('.hero-bubble-1', { y: -160, x: -30, opacity: 0.2, ease: 'none' }, 0);
    heroTl.to('.hero-bubble-2', { y: -240, x: -40, opacity: 0.1, ease: 'none' }, 0);
    heroTl.to('.hero-bubble-3', { y: -200, x: 30, opacity: 0.15, ease: 'none' }, 0);
    heroTl.to('.hero-bubble-4', { y: -280, x: 40, opacity: 0.1, ease: 'none' }, 0);

    /* -------------------------------------------------------------
       SCENE 2: THE PROBLEM (PINNED SCENE)
       ------------------------------------------------------------- */
    const problemTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.problem-pin-wrapper',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1
      }
    });

    // Unanswered customer messages pile up and turn grey
    problemTl.to('#problem-msg-1', { opacity: 0.45, filter: 'grayscale(1)', y: -10, duration: 1 });
    problemTl.fromTo('#problem-msg-2', { opacity: 0, y: 30 }, { opacity: 0.45, filter: 'grayscale(1)', y: 0, duration: 1 }, '-=0.3');
    problemTl.fromTo('#problem-msg-3', { opacity: 0, y: 30 }, { opacity: 0.45, filter: 'grayscale(1)', y: 0, duration: 1 }, '-=0.3');

    // Scene shifts to Brand AI response
    problemTl.to('.problem-scene-sticky', {
      backgroundColor: '#160309',
      duration: 0.8
    });

    // Brand answers vividly in red/ember
    problemTl.fromTo('#problem-msg-4', { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 1.2 });
    problemTl.fromTo('#problem-msg-5', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 });
    problemTl.fromTo('#problem-msg-6', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 });

    /* -------------------------------------------------------------
       SCENE 3: HOW IT WORKS (PINNED STEPS & PHONE TYPING)
       ------------------------------------------------------------- */
    const howTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.how-it-works-wrapper',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1
      }
    });

    // Step 1 active by default
    // Scroll progress swaps to Step 2
    howTl.to('#how-step-1', { opacity: 0, y: -20, duration: 1 }, 1);
    howTl.to('#how-step-2', { opacity: 1, y: 0, duration: 1 }, 1.3);

    // Inside phone: customer asks & bot replies
    howTl.to('#tg-msg-1', { opacity: 1, y: 0, duration: 0.8 }, 0.5);
    howTl.to('#tg-msg-2', { opacity: 1, y: 0, duration: 0.8 }, 1.2);

    // Scroll progress swaps to Step 3
    howTl.to('#how-step-2', { opacity: 0, y: -20, duration: 1 }, 2.5);
    howTl.to('#how-step-3', { opacity: 1, y: 0, duration: 1 }, 2.8);

    // Inside phone: customer confirms & bot holds for owner
    howTl.to('#tg-msg-3', { opacity: 1, y: 0, duration: 0.8 }, 2.4);
    howTl.to('#tg-msg-4', { opacity: 1, y: 0, duration: 0.8 }, 3.0);
    howTl.to('#tg-msg-5', { opacity: 1, y: 0, duration: 0.8 }, 3.4);

    /* -------------------------------------------------------------
       SCENE 4: THE OWNER'S VIEW (TILTED GLASS DASHBOARD)
       ------------------------------------------------------------- */
    gsap.fromTo('.dashboard-tilted-glass',
      {
        transform: 'perspective(1200px) rotateX(22deg) rotateY(-8deg) scale(0.9)',
        opacity: 0.65
      },
      {
        transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)',
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.owner-view-section',
          start: 'top 75%',
          end: 'top 25%',
          scrub: 1.2
        }
      }
    );

    // Counter animations on entry
    ScrollTrigger.create({
      trigger: '.owner-counters-grid',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        document.querySelectorAll('.counter-value').forEach(el => {
          const target = parseInt(el.getAttribute('data-target'), 10) || 0;
          animateCounter(el, target, 2.0);
        });
      }
    });

    /* -------------------------------------------------------------
       SCENE 5: BUILT FOR SMALL SHOPS (HORIZONTAL TRACK)
       ------------------------------------------------------------- */
    const track = document.querySelector('.small-shops-track');
    if (track) {
      const getScrollAmount = () => -(track.scrollWidth - window.innerWidth + 180);

      gsap.to(track, {
        x: getScrollAmount,
        ease: 'none',
        scrollTrigger: {
          trigger: '.small-shops-wrapper',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          invalidateOnRefresh: true
        }
      });
    }

    /* -------------------------------------------------------------
       SCENE 6: FINAL CTA SOFT PARALLAX
       ------------------------------------------------------------- */
    gsap.fromTo('.final-cta-container',
      { y: 60, opacity: 0.8 },
      {
        y: 0,
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.final-cta-section',
          start: 'top 80%',
          end: 'top 40%',
          scrub: 1
        }
      }
    );
  }

  // Document ready execution
  document.addEventListener('DOMContentLoaded', () => {
    initProgressBar();
    initNavbarScroll();
    initParallaxStory();
  });
})();
