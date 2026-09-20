(function () {
  const STAGE_W = 1440;
  const VISIBLE_H = 680;

  const layout = () => {
    const section = document.querySelector('section.hero-section');
    const clip = document.querySelector('.hero-scale-clip');
    const stage = document.querySelector('.hero-stage');
    if (!section || !clip || !stage) return;

    const vw = window.innerWidth;
    if (vw < 900) {
      section.removeAttribute('style');
      clip.removeAttribute('style');
      stage.removeAttribute('style');
      return;
    }
    const scale = Math.min(1, vw / STAGE_W);
    const layoutH = VISIBLE_H * scale;

    section.style.setProperty('height', layoutH + 'px', 'important');
    section.style.setProperty('min-height', '0', 'important');
    section.style.setProperty('padding', '0', 'important');
    section.style.setProperty('background-image', 'none', 'important');
    section.style.setProperty('background', '#ffffff', 'important');
    section.style.setProperty('overflow', 'hidden', 'important');

    clip.style.cssText = 'position:relative!important;width:100%!important;height:' + layoutH + 'px!important;overflow:hidden!important;';

    if (vw >= STAGE_W) {
      stage.style.cssText = 'position:absolute!important;top:0!important;left:50%!important;margin-left:-720px!important;width:1440px!important;height:828px!important;transform:none!important;display:block!important;';
    } else {
      stage.style.cssText = 'position:absolute!important;top:0!important;left:0!important;margin:0!important;width:1440px!important;height:828px!important;transform:scale(' + scale + ')!important;transform-origin:top left!important;display:block!important;';
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', layout);
  else layout();
  window.addEventListener('resize', layout, { passive: true });
})();
