import { useEffect, useState } from 'react';

/** Detecta se o aparelho tem tela touch como entrada principal (não depende da largura da tela). */
function detectTouch(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const anyCoarse = window.matchMedia('(any-pointer: coarse)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const points = navigator.maxTouchPoints > 0;
  return coarse || (anyCoarse && !fine) || (points && !fine);
}

/**
 * true em celulares/tablets. Em notebooks com tela touch (ponteiro principal "fine"),
 * os controles só aparecem depois do primeiro toque real na tela.
 */
export function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(detectTouch);

  useEffect(() => {
    const onTouch = () => setTouch(true);
    window.addEventListener('touchstart', onTouch, { passive: true, once: true });
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = () => setTouch((t) => t || detectTouch());
    mq.addEventListener?.('change', onChange);
    return () => {
      window.removeEventListener('touchstart', onTouch);
      mq.removeEventListener?.('change', onChange);
    };
  }, []);

  return touch;
}

/** Tamanho atual da janela (reage a rotação e redimensionamento). */
export function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [size, setSize] = useState(read);

  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return size;
}
