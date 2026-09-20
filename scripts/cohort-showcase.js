const fallbackProjects = [
  {
    title: 'Mitochondrial Transfer into Granulocytes',
    person: 'Giulia Sironi',
    field: 'Immunology',
    location: 'Milan, Italy',
    grant: '$1,200 vital · $2,800 optimal',
    summary: 'Testing whether donated mitochondria can extend the useful life of short-lived immune first responders and reduce excess inflammation.',
    image: '/images/cohort-1/granulocytes.webp',
    image_alt: 'Microscope image of granulocytes',
  },
  {
    title: 'Open-Access Albumin-Binding Domains for Nanobody Half-Life Extension',
    person: 'Nathaniel Braffman',
    field: 'Protein engineering',
    location: 'USA',
    grant: '$2,925',
    summary: 'Designing patent-free protein tags that let tiny antibody drugs stay in the bloodstream for days rather than hours.',
    image: '/images/cohort-1/nathaniel-braffman.png',
    image_alt: 'Illustration of an albumin-binding domain joined to a therapeutic minibinder',
  },
  {
    title: 'Valonia ventricosa Genome Sequencing',
    person: 'Chris Gaby & team',
    field: 'Microbial genomics',
    location: 'Durham, North Carolina',
    grant: '$2,991.50',
    summary: 'Sequencing the first genome of a grape-sized single cell and creating public infrastructure for giant-cell biology.',
    image: '/images/cohort-1/valonia.jpeg',
    image_alt: 'Microscope image of Valonia ventricosa cells',
  },
  {
    title: 'mRNA-Based Reprogramming of Macrophage Inflammation in Diabetic Wounds',
    person: 'Khalia Primer',
    field: 'Regenerative medicine',
    location: 'Melbourne, Australia',
    grant: '$3,000',
    summary: 'Finding molecular switches that restore the productive immune response diabetic wounds need in order to heal.',
    image: '/images/cohort-1/khalia-primer-gel.jpeg',
    image_alt: 'Gel electrophoresis experiment photograph',
  },
  {
    title: 'Banana Pith Cellulose Nanofibers for Sustainable Cosmetics',
    person: 'Kishore Ramesh Kumar & Gayathri Menon',
    field: 'Biomaterials',
    location: 'Coimbatore, India',
    grant: '$2,800',
    summary: 'Turning banana-harvest waste into a cleaner, microplastics-free cosmetic ingredient using an enzyme-led process.',
    image: '/images/cohort-1/neonaar.jpeg',
    image_alt: 'Close photograph of the translucent texture of a cellulose material',
  },
  {
    title: 'Carroucell: Automated Carousel Staining Battery',
    person: 'Lucía Nerea Perez, Anika Sasaki & Julieta Hernandez',
    field: 'Biomedical hardware',
    location: 'Argentina',
    grant: '$1,000',
    summary: 'Building an open, roughly $100 robot that makes tissue staining reproducible for labs that cannot buy commercial automation.',
    image: '/images/cohort-1/carroucell.jpeg',
    image_alt: 'Top view of the Carroucell tissue-staining hardware',
  },
  {
    title: 'Open-Synth — Decentralized Enzymatic DNA Synthesis Platform',
    person: 'David Jaime Castillo-Cornejo',
    field: 'Synthetic biology',
    location: 'Mexico City, Mexico',
    grant: '$3,000',
    summary: 'Building an open enzyme-and-droplet DNA printer that replaces toxic, centralized synthesis with bench-scale infrastructure.',
    image: '/images/cohort-1/glyxon.jpeg',
    image_alt: 'Open Cartridge DNA-synthesis hardware on a laboratory bench',
  },
];

let projects = fallbackProjects;
const root = document.querySelector('[data-cohort-showcase]');

const startShowcase = () => {
  if (!root) return;
  const allGrid = root.querySelector('[data-cohort-grid]');

  const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const safeExternalUrl = (value) => {
    if (typeof value !== 'string') return '';

    try {
      const url = new URL(value.trim());
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const card = (project, index) => {
    const externalUrl = safeExternalUrl(project.external_url);
    const image = typeof project.image === 'string' ? project.image : '';
    const imageAlt = typeof project.image_alt === 'string' && project.image_alt ? project.image_alt : project.title;
    const visual = image
      ? `<img class="cohort-project-image cohort-project-image--${index}" src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt)}" loading="lazy">`
      : '';

    return `
    <article class="impact-card cohort-impact-card" data-cohort-project="${index}">
      <div class="cohort-visual">${visual}<span class="cohort-visual-label">${escapeHtml(project.field)}</span></div>
      <div class="content-wrap">
        <h3 class="h3-32px cohort-card-title">${escapeHtml(project.title)}</h3>
        <p class="cohort-card-meta cohort-card-meta--prominent">${escapeHtml(project.person)} · ${escapeHtml(project.location)}</p>
        <div class="card-rtf w-richtext cohort-card-summary"><p>${escapeHtml(project.summary)}</p></div>
        ${externalUrl ? `<a class="cohort-card-button" href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer">Read more</a>` : ''}
      </div>
    </article>`;
  };

  allGrid.innerHTML = projects.map((project, index) => `<div role="listitem" class="w-dyn-item">${card(project, index)}</div>`).join('');
};

if (root) {
  fetch('content/projects.json', { headers: { Accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Project data unavailable'))))
    .then((data) => {
      if (Array.isArray(data.projects) && data.projects.length) projects = data.projects;
      startShowcase();
    })
    .catch(() => startShowcase());
}

const designControls = document.querySelector('[data-design-controls]');

if (designControls && new URLSearchParams(window.location.search).has('design')) {
  designControls.hidden = false;
  const status = designControls.querySelector('[data-design-status]');
  const controls = [...designControls.querySelectorAll('[data-design-control]')];

  const applyControl = (control) => {
    const property = control.dataset.designControl;
    const value = `${control.value}${control.dataset.unit || ''}`;
    document.documentElement.style.setProperty(property, value);
    designControls.querySelector(`[data-design-output="${property}"]`).value = value;
  };

  controls.forEach((control) => {
    applyControl(control);
    control.addEventListener('input', () => applyControl(control));
  });

  designControls.querySelector('[data-design-copy]').addEventListener('click', async () => {
    const values = controls.map((control) => `  ${control.dataset.designControl}: ${control.value}${control.dataset.unit || ''};`).join('\n');
    const css = `:root {\n${values}\n}`;
    try {
      await navigator.clipboard.writeText(css);
      status.textContent = 'CSS values copied.';
    } catch {
      status.textContent = css;
    }
  });
}
