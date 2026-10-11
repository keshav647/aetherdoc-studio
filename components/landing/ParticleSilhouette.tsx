'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  nx: number;
  ny: number;
  nz: number;
  isHead?: boolean;
  edgeDistPx?: number; // Exact pixel distance inward from the 2D silhouette boundary
  rNorm?: number;
  shoulderTopBoost?: number;
  chinBottomAttenuation?: number;
  isBust?: boolean;
  isAura?: boolean;
  isStar?: boolean;
  brightness?: number;
  size?: number;
  twinkleSpeed?: number;
  twinkleOffset?: number;
}

export function ParticleSilhouette() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const mouse = { rawX: window.innerWidth / 2, rawY: window.innerHeight / 2, active: false };
    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    let particles: Particle[] = [];
    let bustOriginY = 0;
    let crownScreenY = 0;
    let headCenterScreenY = 0;
    let headHeightPx = 0;

    const initParticles = () => {
      particles = [];
      const renderW = window.innerWidth;
      const renderH = window.innerHeight;

      // =======================================================================
      // EXACT PIXEL ALIGNMENT WITH CORTEXA VIDEO & UI LAYOUT:
      // - Crown Y: 13.5% of viewport height
      // - Chin Y: 64.5% of viewport height (Total Head Height = 51% of viewport height)
      // - Neck column: 60%H (behind jaw) down to 77.5%H (level with "The layer between raw data...")
      // - Shoulders: flare smoothly from 76.5%H to 100%H (passing cleanly below "every source"
      //   and terminating right beside "Explore the platform ->" at 1.82 * A)
      // =======================================================================
      const crownY = renderH * 0.135;
      const chinY = renderH * 0.645;
      const headH = chinY - crownY;
      const B = headH * 0.5;
      const A = B * 0.76;
      const headCenterY = crownY + B;

      bustOriginY = headCenterY;
      crownScreenY = crownY;
      headCenterScreenY = headCenterY;
      headHeightPx = headH;

      // Smooth C^infinity anatomical width profile for human cranium, temples, cheekbones, jaw & chin
      // u = -1 (crown) to +1 (chin)
      const getHeadHalfWidthFromU = (u: number) => {
        if (u <= -1 || u >= 1) return 0;
        const baseCircle = Math.sqrt(Math.max(0, 1.0 - u * u));
        const squircle = Math.pow(baseCircle, 0.87);
        const modX = 1.01 - 0.065 * u - 0.125 * u * u - 0.055 * u * u * u;
        return A * squircle * modX;
      };

      const getHeadHalfWidthAtY = (yScreen: number) => {
        const u = (yScreen - headCenterY) / B;
        return getHeadHalfWidthFromU(u);
      };

      const getHeadSilhouette = (angle: number) => {
        const u = Math.cos(angle); // -1 at crown, +1 at chin
        const side = Math.sin(angle) >= 0 ? 1 : -1;
        const sinAbs = Math.abs(Math.sin(angle));
        const squircle = Math.pow(sinAbs, 0.87);
        const modX = 1.01 - 0.065 * u - 0.125 * u * u - 0.055 * u * u * u;
        const cx = side * A * squircle * modX;
        const cy = u * B;
        return { cx, cy };
      };

      const rNeckBase = A * 0.485;
      const maxShoulderHalfWidth = A * 1.88;

      // -----------------------------------------------------------------------
      // 1. HEAD CONCENTRIC Z-SLICE RINGS (Matches Screen Recording 00:01 - 00:03)
      //    Uses golden-angle phase offset per ring so zero radial spoke lines appear,
      //    and exact pixel distance from outer head contour so the head rim matches
      //    the sleek ~7px white rim of the neck and shoulders!
      // -----------------------------------------------------------------------
      const Rz = A * 0.88;
      const numHeadRings = 76;

      for (let r = 1; r <= numHeadRings; r++) {
        const t = r / numHeadRings;
        const theta = Math.pow(t, 0.94) * (Math.PI * 0.5);
        const scale = Math.sin(theta);
        const pz = Rz * Math.cos(theta);

        const perimeter = 2 * Math.PI * scale * Math.sqrt((A * A + B * B) * 0.5);
        const pointsOnRing = Math.max(12, Math.floor(perimeter / 4.2));
        // Golden-ratio phase offset prevents radial spoke alignment across rings
        const ringPhase = r * 2.39996323;

        for (let i = 0; i < pointsOnRing; i++) {
          const angle = ringPhase + (i / pointsOnRing) * Math.PI * 2;
          const { cx, cy } = getHeadSilhouette(angle);

          const jitter = scale > 0.90 ? (Math.random() - 0.5) * 1.4 : 0;
          const px = scale * cx + jitter;
          const py = scale * cy + jitter * 0.7;

          // Exact pixel distance inward from the outer head boundary along this radial ray
          const fullRadius = Math.hypot(cx, cy);
          const edgeDistPx = Math.max(0, (1.0 - scale) * fullRadius);

          // Soften the bottom chin contour where it overlaps the shadowed throat (instead of open space)
          const yScreen = headCenterY + py;
          let chinBottomAttenuation = 1.0;
          if (yScreen > chinY - headH * 0.11 && Math.abs(px) < rNeckBase * 0.96) {
            const tChin = Math.min(1.0, (yScreen - (chinY - headH * 0.11)) / (headH * 0.11));
            chinBottomAttenuation = 1.0 - 0.38 * tChin;
          }

          const nx = scale * (cx / A);
          const ny = scale * (cy / B);
          const nz = Math.cos(theta);
          const len = Math.hypot(nx, ny, nz) || 1;

          particles.push({
            x: px,
            y: py,
            z: pz,
            baseX: px,
            baseY: py,
            baseZ: pz,
            nx: nx / len,
            ny: ny / len,
            nz: nz / len,
            isHead: true,
            rNorm: scale,
            edgeDistPx,
            chinBottomAttenuation,
          });
        }
      }

      // -----------------------------------------------------------------------
      // 2. ANATOMICAL NECK, TRAPEZIUS, CLAVICLE & DELTOID BUST
      // -----------------------------------------------------------------------
      const bustStartY = chinY - headH * 0.15;
      const bustEndY = renderH * 1.03;
      const bustH = bustEndY - bustStartY;

      const getBustProfileAtY = (yScreen: number) => {
        if (yScreen < chinY) {
          return { rx: rNeckBase, rz: rNeckBase * 0.86, slopeDerivative: 0 };
        }
        // v = 0 at chin (64.5%H) to 1 at bustEndY (103%H)
        const v = Math.min(1, Math.max(0, (yScreen - chinY) / (bustEndY - chinY)));

        // Anatomical neck column with subtle graceful waist at mid-neck (v ~ 0.12)
        const neckWaist = rNeckBase * (1.0 - 0.045 * Math.sin(Math.min(1, v / 0.26) * Math.PI));

        // Trapezius & collarbone flare begins smoothly at v = 0.16 (~70.5%H) and sweeps to v = 0.88 (~98%H)
        const tShoulder = Math.max(0, Math.min(1, (v - 0.16) / 0.72));
        const shoulderBlend =
          tShoulder * tShoulder * tShoulder * (tShoulder * (tShoulder * 6 - 15) + 10);
        const shoulderDerivative =
          30 * tShoulder * tShoulder * (1 - tShoulder) * (1 - tShoulder);

        // Deltoid cap rounding over at the very bottom (v = 0.84 to 1.0)
        const tDeltoid = Math.max(0, Math.min(1, (v - 0.84) / 0.16));
        const deltoidCap = Math.sin(tDeltoid * Math.PI * 0.5) * (A * 0.08);

        const rx = neckWaist + (maxShoulderHalfWidth - neckWaist) * shoulderBlend + deltoidCap;
        const rz = (rNeckBase * 0.88 + v * (A * 0.78)) * 0.82;
        return { rx, rz, slopeDerivative: shoulderDerivative };
      };

      const numBustRings = 160;
      for (let b = 0; b < numBustRings; b++) {
        const tb = b / (numBustRings - 1);
        const yScreen = bustStartY + tb * bustH;
        const y3D = yScreen - bustOriginY;

        const { rx, rz, slopeDerivative } = getBustProfileAtY(yScreen);
        const headW = yScreen < chinY ? getHeadHalfWidthAtY(yScreen) : 0;

        const shoulderTopBoost = Math.min(1.0, slopeDerivative * 0.42);

        const perimeter = 2 * Math.PI * Math.sqrt((rx * rx + rz * rz) * 0.5);
        const pointsOnRing = Math.max(24, Math.floor(perimeter / 3.8));

        for (let i = 0; i < pointsOnRing; i++) {
          const baseAngle = (i / pointsOnRing) * Math.PI * 2;
          const jitteredAngle =
            baseAngle + (Math.random() - 0.5) * ((Math.PI * 2) / pointsOnRing) * 0.92;
          const cosA = Math.cos(jitteredAngle);
          const sinA = Math.sin(jitteredAngle);

          if (sinA < -0.15) continue;

          const jitterX = (Math.random() - 0.5) * 2.0;
          const jitterY = (Math.random() - 0.5) * 2.8;
          const px = rx * cosA + jitterX;
          const pz = rz * sinA - (yScreen < chinY ? A * 0.08 : 0);

          // Strict occlusion culling behind the 2D head/jaw silhouette
          if (yScreen < chinY && Math.abs(px) <= headW * 0.985) {
            continue;
          }

          const edgeDistPx = Math.max(0, rx - Math.abs(rx * cosA));

          const slopeNy = -0.35 * shoulderTopBoost;
          const nx = cosA;
          const nz = sinA;
          const len = Math.hypot(nx, slopeNy, nz) || 1;

          particles.push({
            x: px,
            y: y3D + jitterY,
            z: pz,
            baseX: px,
            baseY: y3D + jitterY,
            baseZ: pz,
            nx: nx / len,
            ny: slopeNy / len,
            nz: nz / len,
            isBust: true,
            edgeDistPx,
            shoulderTopBoost,
          });
        }
      }

      // -----------------------------------------------------------------------
      // 3. LUMINOUS AURA STARDUST PLUME (Hugging outer head, neck & shoulder rim)
      // -----------------------------------------------------------------------
      const auraCount = 1950;
      for (let a = 0; a < auraCount; a++) {
        const randZone = Math.random();
        let ax = 0;
        let ay = 0;
        let az = 0;

        if (randZone < 0.52) {
          const angle = Math.random() * Math.PI * 2;
          const { cx, cy } = getHeadSilhouette(angle);
          const isInner = Math.random() < 0.25;
          const dist = isInner
            ? -Math.pow(Math.random(), 1.5) * 16
            : 2 + Math.pow(Math.random(), 1.65) * 88;
          const radialLen = Math.hypot(cx, cy) || 1;
          ax = cx + (cx / radialLen) * dist;
          ay = cy + (cy / radialLen) * dist;
          az = (Math.random() - 0.5) * 90;
        } else {
          const yScreen =
            bustStartY + headH * 0.05 + Math.random() * (bustEndY - bustStartY - headH * 0.05);
          ay = yScreen - bustOriginY;
          const { rx } = getBustProfileAtY(yScreen);
          const headW = yScreen < chinY ? getHeadHalfWidthAtY(yScreen) : 0;
          if (rx <= headW) continue;

          const side = Math.random() > 0.5 ? 1 : -1;
          const isInner = Math.random() < 0.28;
          const dist = isInner
            ? -Math.pow(Math.random(), 1.4) * Math.min(42, rx * 0.42)
            : 2 + Math.pow(Math.random(), 1.6) * 92;
          ax = side * (rx + dist);
          ay += (Math.random() - 0.5) * 12;
          az = (Math.random() - 0.5) * 110;
        }

        particles.push({
          x: ax,
          y: ay,
          z: az,
          baseX: ax,
          baseY: ay,
          baseZ: az,
          nx: 0,
          ny: 0,
          nz: 0,
          isAura: true,
          brightness: 0.25 + Math.random() * 0.75,
          size: Math.random() < 0.16 ? 1.45 : 0.95,
          twinkleSpeed: 0.02 + Math.random() * 0.04,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }

      // -----------------------------------------------------------------------
      // 4. INTERIOR CONSTELLATION NODES (Global background stars are rendered by CosmicStarfield)
      // -----------------------------------------------------------------------
      for (let s = 0; s < 220; s++) {
        const starX = (Math.random() - 0.5) * A * 2.8;
        const starY = (Math.random() - 0.45) * renderH * 0.72;
        const starZ = 40 + Math.random() * 140;

        particles.push({
          x: starX,
          y: starY,
          z: starZ,
          baseX: starX,
          baseY: starY,
          baseZ: starZ,
          nx: 0,
          ny: 0,
          nz: 0,
          isStar: true,
          brightness: 0.35 + Math.random() * 0.6,
          size: Math.random() < 0.18 ? 1.7 : Math.random() < 0.5 ? 1.2 : 0.85,
          twinkleSpeed: 0.015 + Math.random() * 0.035,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    let cachedW = window.innerWidth;
    let cachedH = window.innerHeight;
    let isHeroVisible = true;

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = canvas.parentElement?.clientWidth || window.innerWidth;
      const h = canvas.parentElement?.clientHeight || window.innerHeight;
      cachedW = w;
      cachedH = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHeroVisible) return;
      mouse.active = true;
      mouse.rawX = e.clientX;
      mouse.rawY = e.clientY + (window.scrollY || 0);
      const normX = (e.clientX - cachedW / 2) / (cachedW / 2);
      const normY = (mouse.rawY - cachedH / 2) / (cachedH / 2);
      targetRotY = normX * 0.03;
      targetRotX = -normY * 0.02;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      targetRotX = 0;
      targetRotY = 0;
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          isHeroVisible = entries[0].isIntersecting;
        }
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    handleResize();

    let time = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      if (!isHeroVisible || document.hidden) return;

      time += 0.02;

      rotX += (targetRotX - rotX) * 0.06;
      rotY += (targetRotY - rotY) * 0.06;

      const renderW = cachedW;
      const renderH = cachedH;
      const centerX = renderW / 2;

      ctx.clearRect(0, 0, renderW, renderH);

      // --- PASS 0: CINEMATIC DEEP-SPACE NEBULA & SILHOUETTE HALO ---
      const nebulaGrad = ctx.createRadialGradient(
        centerX,
        headCenterScreenY + headHeightPx * 0.3,
        30,
        centerX,
        headCenterScreenY + headHeightPx * 0.3,
        headHeightPx * 1.65
      );
      nebulaGrad.addColorStop(0, 'rgba(14, 116, 185, 0.22)');
      nebulaGrad.addColorStop(0.36, 'rgba(12, 74, 134, 0.12)');
      nebulaGrad.addColorStop(0.7, 'rgba(7, 34, 72, 0.04)');
      nebulaGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, renderW, renderH);

      // Soft rim glow behind neck & upper shoulders
      const shoulderGlowGrad = ctx.createRadialGradient(
        centerX,
        crownScreenY + headHeightPx * 1.25,
        20,
        centerX,
        crownScreenY + headHeightPx * 1.25,
        headHeightPx * 0.95
      );
      shoulderGlowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
      shoulderGlowGrad.addColorStop(0.55, 'rgba(14, 116, 185, 0.05)');
      shoulderGlowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = shoulderGlowGrad;
      ctx.fillRect(0, 0, renderW, renderH);

      // Interactive cursor ambient bloom when hovering near silhouette
      if (mouse.active) {
        const cursorDistFromCenter = Math.hypot(
          mouse.rawX - centerX,
          mouse.rawY - (headCenterScreenY + headHeightPx * 0.25)
        );
        if (cursorDistFromCenter < headHeightPx * 1.4) {
          const spotGrad = ctx.createRadialGradient(
            mouse.rawX,
            mouse.rawY,
            4,
            mouse.rawX,
            mouse.rawY,
            185
          );
          spotGrad.addColorStop(0, 'rgba(186, 230, 253, 0.22)');
          spotGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.10)');
          spotGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
          ctx.fillStyle = spotGrad;
          ctx.fillRect(0, 0, renderW, renderH);
        }
      }

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const cursorCanvasX = mouse.rawX;
      const cursorCanvasY = mouse.rawY;

      const starDimPoints: { x: number; y: number; sz: number }[] = [];
      const starBrightPoints: { x: number; y: number; r: number }[] = [];
      const auraSoftPoints: { x: number; y: number }[] = [];
      const auraMidPoints: { x: number; y: number; r: number }[] = [];
      const auraBrightPoints: { x: number; y: number; r: number }[] = [];

      // 6 Smooth Shading Tiers (Unified across Head, Neck & Shoulders)
      const tier1DeepInterior: { x: number; y: number }[] = [];
      const tier2SoftInterior: { x: number; y: number }[] = [];
      const tier3InnerCyan: { x: number; y: number }[] = [];
      const tier4MidCyan: { x: number; y: number; r: number }[] = [];
      const tier5BrightCyan: { x: number; y: number; r: number }[] = [];
      const rimBloomPoints: { x: number; y: number; r: number }[] = [];
      const tier6ElectricWhiteRim: { x: number; y: number; r: number }[] = [];

      const fov = 950;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (p.isStar) {
          const twinkle =
            0.45 + 0.55 * Math.sin(time * (p.twinkleSpeed || 0.02) + (p.twinkleOffset || 0));
          const starX = centerX + p.baseX + Math.sin(time * 0.14 + p.baseY * 0.01) * 1.8;
          const starY = renderH * 0.5 + p.baseY + Math.cos(time * 0.14 + p.baseX * 0.01) * 1.8;
          if (starY > renderH * 0.78) continue;
          const b = (p.brightness || 0.5) * twinkle;
          const sz = p.size || 1.0;
          if (b > 0.55 && sz > 1.3) {
            starBrightPoints.push({ x: starX, y: starY, r: sz * 0.75 });
          } else {
            starDimPoints.push({ x: starX, y: starY, sz });
          }
          continue;
        }

        const x1 = p.baseX * cosY + p.baseZ * sinY;
        const z1 = -p.baseX * sinY + p.baseZ * cosY;

        const y1 = p.baseY * cosX - z1 * sinX;
        const z2 = p.baseY * sinX + z1 * cosX;

        const perspective = fov / (fov + z2);
        const projX = centerX + x1 * perspective;
        const projY = bustOriginY + y1 * perspective;

        // Smooth bottom vertical fade so the lower shoulders & aura dissolve organically
        // into the global starfield with zero hard horizontal cut at the bottom of the Hero
        let bottomFade = 1.0;
        const fadeStart = renderH * 0.70;
        const fadeEnd = renderH * 0.96;
        if (projY > fadeStart) {
          const tFade = Math.min(1.0, Math.max(0.0, (projY - fadeStart) / (fadeEnd - fadeStart)));
          bottomFade = 1.0 - tFade * tFade * (3.0 - 2.0 * tFade);
        }
        if (bottomFade <= 0.01) continue;

        if (p.isAura) {
          const auraTwinkle =
            0.45 + 0.55 * Math.sin(time * (p.twinkleSpeed || 0.03) + (p.twinkleOffset || 0));
          const b = (p.brightness || 0.5) * auraTwinkle * bottomFade;
          if (b > 0.68) {
            auraBrightPoints.push({ x: projX, y: projY, r: (p.size || 1.1) * perspective });
          } else if (b > 0.42) {
            auraMidPoints.push({ x: projX, y: projY, r: 0.9 * perspective });
          } else if (b > 0.12) {
            auraSoftPoints.push({ x: projX, y: projY });
          }
          continue;
        }

        // Interactive cursor spotlight (frames 00:01 - 00:03 of screen recording)
        let spotlight = 0;
        if (mouse.active) {
          const dx = projX - cursorCanvasX;
          const dy = projY - cursorCanvasY;
          const dist = Math.hypot(dx, dy);
          if (dist < 185) {
            const factor = 1.0 - dist / 185;
            spotlight = factor * factor * (3.0 - 2.0 * factor);
          }
        }

        let rimGlow = 0;

        if (p.isHead && p.edgeDistPx !== undefined) {
          // UNIFIED PIXEL-WIDTH RIM FALLOFF ON HEAD (matches neck & shoulder rim thickness!)
          // - Outer 0 to 8px: crisp electric-white grazing rim
          // - 8px to 48px: smooth cyan 3D contour gradient
          // - >48px: deep cosmic face interior with delicate concentric rings
          const d = p.edgeDistPx;
          const falloffWidth = 52;
          if (d < falloffWidth) {
            const tEdge = 1.0 - d / falloffWidth;
            rimGlow = Math.pow(tEdge, 2.55) * (p.chinBottomAttenuation ?? 1.0);
          }
        } else if (p.isBust && p.edgeDistPx !== undefined) {
          const d = p.edgeDistPx;
          const topBoost = p.shoulderTopBoost || 0;
          const falloffWidth = 56 + topBoost * 22;
          if (d < falloffWidth) {
            const tEdge = 1.0 - d / falloffWidth;
            rimGlow = Math.pow(tEdge, 2.25);
          }

          // Subtle chin shadow on the upper central throat right below the chin
          const throatY = p.baseY - headHeightPx * 0.5;
          if (throatY < headHeightPx * 0.14 && Math.abs(p.baseX) < headHeightPx * 0.13) {
            rimGlow *= 0.42;
          }
        }

        const lum = Math.min(1.0, (rimGlow + spotlight * 0.92) * bottomFade);

        if (lum > 0.74) {
          tier6ElectricWhiteRim.push({ x: projX, y: projY, r: 1.25 * perspective });
          if (lum > 0.84) {
            rimBloomPoints.push({ x: projX, y: projY, r: 2.8 * perspective });
          }
        } else if (lum > 0.48) {
          tier5BrightCyan.push({ x: projX, y: projY, r: 1.05 * perspective });
          rimBloomPoints.push({ x: projX, y: projY, r: 2.1 * perspective });
        } else if (lum > 0.26) {
          tier4MidCyan.push({ x: projX, y: projY, r: 0.92 * perspective });
        } else if (lum > 0.12) {
          tier3InnerCyan.push({ x: projX, y: projY });
        } else if (lum > 0.04) {
          tier2SoftInterior.push({ x: projX, y: projY });
        } else if (bottomFade > 0.25) {
          tier1DeepInterior.push({ x: projX, y: projY });
        }
      }

      // --- PASS 1: Deep Interior Concentric Contour Dots ---
      ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
      for (let j = 0; j < tier1DeepInterior.length; j++) {
        const p = tier1DeepInterior[j];
        ctx.fillRect(p.x - 0.5, p.y - 0.5, 1.0, 1.0);
      }

      ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
      for (let j = 0; j < tier2SoftInterior.length; j++) {
        const p = tier2SoftInterior[j];
        ctx.fillRect(p.x - 0.55, p.y - 0.55, 1.1, 1.1);
      }

      ctx.fillStyle = 'rgba(38, 178, 245, 0.28)';
      for (let j = 0; j < tier3InnerCyan.length; j++) {
        const p = tier3InnerCyan[j];
        ctx.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2);
      }

      // --- PASS 2: Aura Stardust Plume ---
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      for (let j = 0; j < auraSoftPoints.length; j++) {
        const p = auraSoftPoints[j];
        ctx.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2);
      }

      ctx.fillStyle = 'rgba(125, 211, 252, 0.52)';
      ctx.beginPath();
      for (let j = 0; j < auraMidPoints.length; j++) {
        const p = auraMidPoints[j];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- PASS 3: Mid-Cyan & Bright-Cyan Contour Transitions ---
      ctx.fillStyle = 'rgba(56, 189, 248, 0.46)';
      ctx.beginPath();
      for (let j = 0; j < tier4MidCyan.length; j++) {
        const p = tier4MidCyan[j];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = 'rgba(125, 211, 252, 0.74)';
      ctx.beginPath();
      for (let j = 0; j < tier5BrightCyan.length; j++) {
        const p = tier5BrightCyan[j];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- PASS 4: Soft Volumetric Rim Bloom Halo ---
      ctx.fillStyle = 'rgba(56, 189, 248, 0.20)';
      ctx.beginPath();
      for (let j = 0; j < rimBloomPoints.length; j++) {
        const p = rimBloomPoints[j];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- PASS 5: Brilliant Electric White-Cyan Outer Grazing Rim ---
      ctx.fillStyle = 'rgba(240, 249, 255, 0.95)';
      ctx.beginPath();
      for (let j = 0; j < tier6ElectricWhiteRim.length; j++) {
        const p = tier6ElectricWhiteRim[j];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- PASS 6: Twinkling Cosmic Stars & Bright Stardust Nodes ---
      ctx.fillStyle = 'rgba(215, 238, 255, 0.52)';
      for (let j = 0; j < starDimPoints.length; j++) {
        const s = starDimPoints[j];
        ctx.fillRect(s.x - s.sz * 0.5, s.y - s.sz * 0.5, s.sz, s.sz);
      }

      ctx.fillStyle = 'rgba(240, 249, 255, 0.88)';
      ctx.beginPath();
      for (let j = 0; j < starBrightPoints.length; j++) {
        const s = starBrightPoints[j];
        ctx.moveTo(s.x + s.r, s.y);
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      }
      for (let j = 0; j < auraBrightPoints.length; j++) {
        const p = auraBrightPoints[j];
        ctx.moveTo(p.x + p.r, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- PASS 7: Mathematical Destination-Out Feathering at Bottom Edge ---
      // Guarantees zero horizontal seam where HeroSection transitions to ProductShowcase
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const bottomEraseGrad = ctx.createLinearGradient(0, renderH * 0.68, 0, renderH);
      bottomEraseGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      bottomEraseGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.38)');
      bottomEraseGrad.addColorStop(0.82, 'rgba(0, 0, 0, 0.85)');
      bottomEraseGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = bottomEraseGrad;
      ctx.fillRect(0, renderH * 0.68, renderW, renderH * 0.32);
      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      io.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none"
    />
  );
}
