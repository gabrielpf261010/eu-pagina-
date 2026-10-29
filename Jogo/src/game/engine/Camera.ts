/** Câmera com acompanhamento suave, limitada às bordas do mapa. */
export class Camera {
  x = 0;
  y = 0;

  private target(
    px: number,
    py: number,
    viewW: number,
    viewH: number,
    mapW: number,
    mapH: number,
  ): { x: number; y: number } {
    const fit = (p: number, view: number, map: number) => {
      if (map <= view) return (map - view) / 2; // mapa menor que a tela: centraliza
      return Math.max(0, Math.min(map - view, p - view / 2));
    };
    return { x: fit(px, viewW, mapW), y: fit(py, viewH, mapH) };
  }

  snap(px: number, py: number, viewW: number, viewH: number, mapW: number, mapH: number) {
    const t = this.target(px, py, viewW, viewH, mapW, mapH);
    this.x = t.x;
    this.y = t.y;
  }

  follow(px: number, py: number, viewW: number, viewH: number, mapW: number, mapH: number, dt: number) {
    const t = this.target(px, py, viewW, viewH, mapW, mapH);
    const k = 1 - Math.exp(-dt * 7);
    this.x += (t.x - this.x) * k;
    this.y += (t.y - this.y) * k;
  }
}
