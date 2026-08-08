function renderPage(data) {
  const app = document.getElementById('app');
  document.title = `${data.subtitle} - ${data.name}`;

  // let html = `
  //   <div class="header">
  //     <h1>${data.name}</h1>
  //     <div class="subtitle">${data.subtitle}</div>
  //   </div>
  let html = `
    <div class="photo-section">
      <div class="photo-frame">
        <img src="${data.profilePhoto.src}" alt="${data.profilePhoto.alt}">
      </div>
      <div class="caption">${data.profilePhoto.caption}</div>
    </div>

    <div class="info-card">`;

  for (const item of data.info) {
    html += `<div class="info-row">
        <div class="info-label">${item.label}</div>
        <div class="info-value">`;

    if (Array.isArray(item.value)) {
      html += item.value
        .map(v => `<div class="family-item">${v}</div>`)
        .join('');
    } else {
      html += item.highlight ? `<span class="highlight">${item.value}</span>` : item.value;
    }

    if (item.proofs && Array.isArray(item.proofs)) {
      html += `<div class="proof-links">` +
        item.proofs.map(p => `<button type="button" class="proof-badge" data-display-title="${p.label}" data-log-label="${p.logLabel || p.label}" data-proof-image="${p.image}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${p.label}</span></button>`).join('') +
        `</div>`;
    }

    html += `</div></div>`;
  }

  html += `</div>

    <div class="note">
      ${data.note.text}
      <a href="${data.note.phoneLink}">${data.note.phone}</a>.<br><br>
      ${data.note.tagline}
    </div>

    <div class="divider"></div>`;

  for (const photo of data.photos) {
    html += `
    <div class="photo-section">
      <div class="photo-frame">
        <img src="${photo.src}" alt="${photo.alt}">
      </div>
      <div class="caption">${photo.caption}</div>
    </div>`;
  }

  app.innerHTML = html;
}

renderPage(DATA);

const FIRESTORE_PROJECT = 'finances-388507';
const FIRESTORE_COLLECTION = 'biodata-visits';

function saveVisit(geo, action) {
  const pageValue = action ? `Proof: ${action}` : window.location.href;
  const visit = {
    fields: {
      timestamp: { stringValue: new Date().toISOString() },
      ip: { stringValue: geo.ip || 'unknown' },
      city: { stringValue: geo.city || 'unknown' },
      region: { stringValue: geo.region || 'unknown' },
      country: { stringValue: geo.country || 'unknown' },
      org: { stringValue: geo.org || 'unknown' },
      latitude: { doubleValue: geo.lat || 0 },
      longitude: { doubleValue: geo.lon || 0 },
      browser: { stringValue: navigator.userAgent },
      referrer: { stringValue: document.referrer || 'direct' },
      page: { stringValue: pageValue },
      action: { stringValue: action || 'Page' }
    }
  };

  return fetch(
    `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${FIRESTORE_COLLECTION}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visit),
      keepalive: true
    }
  );
}

function fetchGeo() {
  return fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(g => {
      if (g.error) throw new Error(g.reason || 'ipapi error');
      return { ip: g.ip, city: g.city, region: g.region, country: g.country_name, org: g.org, lat: g.latitude, lon: g.longitude };
    })
    .catch(() =>
      fetch('https://reallyfreegeoip.org/json/')
        .then(res => res.json())
        .then(g => {
          if (!g.ip) throw new Error('reallyfreegeoip error');
          return { ip: g.ip, city: g.city, region: g.region_name, country: g.country_name, org: 'unknown', lat: g.latitude, lon: g.longitude };
        })
    )
    .catch(() =>
      fetch('https://ipinfo.io/json')
        .then(res => res.json())
        .then(g => {
          if (!g.ip) throw new Error('ipinfo error');
          const [lat, lon] = (g.loc || '').split(',').map(Number);
          return { ip: g.ip, city: g.city, region: g.region, country: g.country, org: g.org, lat: lat || 0, lon: lon || 0 };
        })
    )
    .catch(() => ({ ip: 'unknown', city: 'unknown', region: 'unknown', country: 'unknown', org: 'unknown', lat: 0, lon: 0 }));
}

function fetchIpv4() {
  return fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(d => d.ip || null)
    .catch(() => null);
}

function preferIpv4(geo, ipv4) {
  if (!ipv4 || typeof ipv4 !== 'string') return geo;
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ipv4.trim())) return geo;
  if (!geo.ip || geo.ip === 'unknown') return { ...geo, ip: ipv4 };
  if (geo.ip.includes(':')) return { ...geo, ip: ipv4 };
  return geo;
}

let geoPromise = null;

function getGeo() {
  if (!geoPromise) {
    geoPromise = Promise.all([fetchGeo(), fetchIpv4()]).then(([geo, ipv4]) => preferIpv4(geo, ipv4));
  }
  return geoPromise;
}

function logVisit(action) {
  getGeo().then(geo => saveVisit(geo, action)).catch(() => {});
}

logVisit();

function createProofModal() {
  if (document.getElementById('proofModal')) return;

  const modalHtml = `
    <div id="proofModal" class="proof-modal" aria-hidden="true" role="dialog">
      <div class="proof-modal-content">
        <div class="proof-modal-header">
          <span class="proof-modal-title" id="proofModalTitle">Income Proof</span>
          <button type="button" class="proof-modal-close" id="proofModalClose" aria-label="Close">&times;</button>
        </div>
        <div class="proof-modal-body">
          <div class="proof-image-container">
            <img id="proofModalImg" src="" alt="Income Proof">
            <div class="proof-protection-overlay"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('proofModal');
  const closeBtn = document.getElementById('proofModalClose');

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('proof-modal-body')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });
}

function openProofModal(displayTitle, logLabel, imageSrc) {
  createProofModal();
  const modal = document.getElementById('proofModal');
  const title = document.getElementById('proofModalTitle');
  const img = document.getElementById('proofModalImg');

  title.textContent = displayTitle;
  img.src = imageSrc;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  logVisit(logLabel);
}

document.addEventListener('click', (e) => {
  const button = e.target.closest('.proof-badge');
  if (!button) return;

  const displayTitle = button.dataset.displayTitle || button.textContent.trim();
  const logLabel = button.dataset.logLabel || displayTitle;
  const imageSrc = button.dataset.proofImage;

  if (imageSrc) {
    openProofModal(displayTitle, logLabel, imageSrc);
  }
});

// Prevent right-click on modal and images
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('#proofModal') || e.target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
});

// Prevent dragging images
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG' || e.target.closest('#proofModal')) {
    e.preventDefault();
    return false;
  }
});

// Disable print / save keyboard shortcuts when modal is open
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('proofModal');
  if (modal && modal.classList.contains('open')) {
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
  }
});
