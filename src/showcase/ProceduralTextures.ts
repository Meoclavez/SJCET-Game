import * as THREE from 'three';

export class ProceduralTextures {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Detailed stone brick masonry with chiseled edges, mortar lines, and varied slate hues.
   */
  public static getStoneMasonryTexture(): THREE.CanvasTexture {
    const key = 'stone_masonry';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Dark charcoal mortar foundation
    ctx.fillStyle = '#22272f';
    ctx.fillRect(0, 0, width, height);

    // Mortar grit / speckles
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }

    const rows = 8;
    const rowH = height / rows;
    const mortar = 4;
    const stoneHues = [
      '#586574', '#647282', '#4c5765', '#53606f', '#606e7e', '#454f5c', '#6d7b8c', '#505d6c'
    ];

    for (let r = 0; r < rows; r++) {
      const y = r * rowH + mortar / 2;
      const h = rowH - mortar;
      const isShifted = r % 2 === 1;
      const brickW = width / 4;
      const xStart = isShifted ? -brickW / 2 : 0;

      for (let bx = xStart - brickW; bx < width + brickW; bx += brickW) {
        const x = bx + mortar / 2;
        const w = brickW - mortar;
        const color = stoneHues[Math.floor(Math.random() * stoneHues.length)];
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        // Chiseled surface noise
        for (let n = 0; n < 70; n++) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
          ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 3, 2);
        }

        // Top & Left beveled chisel highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + h - 1);
        ctx.lineTo(x + 1, y + 1);
        ctx.lineTo(x + w - 1, y + 1);
        ctx.stroke();

        // Bottom & Right deep shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + h - 1);
        ctx.lineTo(x + w - 1, y + h - 1);
        ctx.lineTo(x + w - 1, y + 1);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Dark medieval timber wood planks with wood grain, knots, and iron forged studs.
   */
  public static getWoodPlankTexture(): THREE.CanvasTexture {
    const key = 'wood_planks';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Dark rustic wood base
    ctx.fillStyle = '#221208';
    ctx.fillRect(0, 0, width, height);

    const plankCount = 6;
    const plankW = width / plankCount;
    const seam = 4;
    const woodTones = [
      '#3d2315', '#482a19', '#351e12', '#422717', '#4b2d1c', '#331a0e'
    ];

    for (let i = 0; i < plankCount; i++) {
      const x = i * plankW + seam / 2;
      const w = plankW - seam;
      ctx.fillStyle = woodTones[i % woodTones.length];
      ctx.fillRect(x, 0, w, height);

      // Grain curves
      for (let g = 0; g < 16; g++) {
        const gx = x + (w / 16) * g + (Math.random() - 0.5) * 3;
        ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        const wave = (Math.random() - 0.5) * 14;
        ctx.bezierCurveTo(gx + wave, height * 0.33, gx - wave, height * 0.66, gx, height);
        ctx.stroke();
      }

      // Knots
      if (i % 2 === 0) {
        const ky = height * (0.2 + 0.6 * (i / plankCount));
        const kx = x + w * 0.5;
        ctx.fillStyle = 'rgba(15, 8, 4, 0.5)';
        ctx.beginPath();
        ctx.ellipse(kx, ky, 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Plank bevels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(x, 0, 2, height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(x + w - 2, 0, 2, height);

      // Iron forged nail studs
      for (const sy of [24, height - 24]) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x + w * 0.5, sy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(x + w * 0.5 - 1, sy - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Seams
    for (let i = 1; i < plankCount; i++) {
      ctx.fillStyle = '#100704';
      ctx.fillRect(i * plankW - seam / 2, 0, seam, height);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Gothic stained-glass window with glowing golden/amber internal illumination and lead caming.
   */
  public static getStainedGlassTexture(): THREE.CanvasTexture {
    const key = 'stained_glass';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const width = 256;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Warm radial interior candlelight glow
    const radial = ctx.createRadialGradient(width / 2, height * 0.55, 12, width / 2, height * 0.55, width * 0.65);
    radial.addColorStop(0, '#fffbeb');
    radial.addColorStop(0.25, '#fde047');
    radial.addColorStop(0.55, '#f59e0b');
    radial.addColorStop(0.85, '#d97706');
    radial.addColorStop(1, '#451a03');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Diamond leaded lattice
    const paneW = 24;
    const paneH = 34;
    const paneTones = ['#fef08a', '#fbbf24', '#f59e0b', '#f97316', '#38bdf8', '#f43f5e'];

    for (let y = -paneH; y < height + paneH; y += paneH) {
      for (let x = -paneW; x < width + paneW; x += paneW) {
        ctx.fillStyle = paneTones[Math.floor(Math.random() * paneTones.length)];
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(x, y - paneH / 2);
        ctx.lineTo(x + paneW / 2, y);
        ctx.lineTo(x, y + paneH / 2);
        ctx.lineTo(x - paneW / 2, y);
        ctx.closePath();
        ctx.fill();

        // Lead caming wire
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1.0;
        ctx.stroke();
      }
    }

    // Heavy lead mullions and outer frame
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(width / 2 - 3.5, 0, 7, height);
    ctx.fillRect(0, height * 0.5 - 3, width, 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Ornate scalloped slate roof shingles with depth shadows and highlighted edges.
   */
  public static getSlateRoofTexture(isCopper = false): THREE.CanvasTexture {
    const key = isCopper ? 'roof_copper' : 'roof_slate';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const baseColor = isCopper ? '#0d4642' : '#1a222d';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    const rows = 12;
    const rowH = height / rows;
    const shingleW = 42;

    const shades = isCopper
      ? ['#0f766e', '#115e59', '#134e4a', '#0d9488', '#14b8a6', '#047857']
      : ['#283548', '#334155', '#1e293b', '#3b4b60', '#253041', '#475569'];

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const isShifted = r % 2 === 1;
      const xStart = isShifted ? -shingleW / 2 : 0;

      for (let x = xStart - shingleW; x < width + shingleW; x += shingleW) {
        ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + shingleW, y);
        ctx.lineTo(x + shingleW, y + rowH * 0.7);
        ctx.arc(x + shingleW / 2, y + rowH * 0.7, shingleW / 2, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();

        // Top overlap drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(x, y, shingleW, 4);

        // Highlight rim on bottom curve
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + shingleW / 2, y + rowH * 0.7, shingleW / 2, 0, Math.PI, false);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Cobblestone ground path with rounded river stones and dark damp mossy crevices.
   */
  public static getCobblestoneTexture(): THREE.CanvasTexture {
    const key = 'cobblestone';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Dark damp earth & moss base
    ctx.fillStyle = '#1c221e';
    ctx.fillRect(0, 0, width, height);

    const stoneCols = [
      '#57534e', '#44403c', '#64748b', '#52525b', '#475569', '#3f3f46', '#3b4339', '#5a6256'
    ];

    const grid = 30;
    for (let y = 0; y < height; y += grid) {
      for (let x = 0; x < width; x += grid) {
        const cx = x + grid / 2 + (Math.random() - 0.5) * 8;
        const cy = y + grid / 2 + (Math.random() - 0.5) * 8;
        const rx = grid * 0.42 + (Math.random() - 0.5) * 6;
        const ry = grid * 0.42 + (Math.random() - 0.5) * 6;
        const angle = Math.random() * Math.PI;

        const grad = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 2, cx, cy, rx);
        const col = stoneCols[Math.floor(Math.random() * stoneCols.length)];
        grad.addColorStop(0, '#9ca3af');
        grad.addColorStop(0.4, col);
        grad.addColorStop(1, '#18181b');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Warm antique Tudor wattle-and-daub / plaster wall texture.
   */
  public static getTudorPlasterTexture(): THREE.CanvasTexture {
    const key = 'tudor_plaster';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const width = 256;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f4ede1';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(120,100,80,0.08)';
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Arcane magical runes and celestial astrolabe glyphs for the observatory.
   */
  public static getArcaneRuneTexture(): THREE.CanvasTexture {
    const key = 'arcane_rune';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const width = 512;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f5ff';

    // Outer concentric celestial rings
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 230, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 215, 0, Math.PI * 2);
    ctx.stroke();

    // Degree tick marks
    for (let a = 0; a < 360; a += 10) {
      const rad = (a * Math.PI) / 180;
      const len = a % 30 === 0 ? 15 : 8;
      const r1 = 215;
      const r2 = 215 - len;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
      ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
      ctx.stroke();
    }

    // Intersecting sacred geometry triangles
    ctx.strokeStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const rot = (i * Math.PI) / 3;
      ctx.beginPath();
      for (let p = 0; p < 3; p++) {
        const ang = rot + (p * 2 * Math.PI) / 3;
        const px = cx + Math.cos(ang) * 150;
        const py = cy + Math.sin(ang) * 150;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Inner glowing ring
    ctx.strokeStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.stroke();

    // Central sun glyph
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Radial soft particle sprite for glowing aether embers and fireflies.
   */
  public static getParticleSpriteTexture(colorType: 'gold' | 'cyan' = 'gold'): THREE.CanvasTexture {
    const key = `particle_${colorType}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    if (colorType === 'gold') {
      grad.addColorStop(0.25, 'rgba(254, 240, 138, 0.9)');
      grad.addColorStop(0.55, 'rgba(245, 158, 11, 0.4)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    } else {
      grad.addColorStop(0.25, 'rgba(186, 230, 253, 0.9)');
      grad.addColorStop(0.55, 'rgba(6, 182, 212, 0.4)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    this.cache.set(key, tex);
    return tex;
  }

  public static getStoneMasonryTextureCloned(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const tex = this.getStoneMasonryTexture().clone();
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
  }

  public static getWoodPlankTextureCloned(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const tex = this.getWoodPlankTexture().clone();
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
  }

  public static getSlateRoofTextureCloned(isCopper = false, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const tex = this.getSlateRoofTexture(isCopper).clone();
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
  }

  public static getCobblestoneTextureCloned(repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const tex = this.getCobblestoneTexture().clone();
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    return tex;
  }

  public static disposeAll() {
    this.cache.forEach(tex => tex.dispose());
    this.cache.clear();
  }
}

