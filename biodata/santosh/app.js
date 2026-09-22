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
      html += `<span class="info-value-wrap">`;
      html += item.highlight ? `<span class="highlight">${item.value}</span>` : item.value;
      if (item.subtext) {
        html += ` <span class="info-subtext">${item.subtext}</span>`;
      }
      if (item.breakdown) {
        html += ` <button type="button" class="info-popover-btn" id="networthInfoBtn" aria-label="View Net Worth details" title="View details" aria-haspopup="dialog" aria-expanded="false"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>`;
      }
      html += `</span>`;
    }

    if (item.proofs && Array.isArray(item.proofs)) {
      html += `<div class="proof-links">` +
        item.proofs.map(p => `<button type="button" class="proof-badge" data-display-title="${p.label}" data-log-label="${p.logLabel || p.label}" data-proof-image="${p.image}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>View ${p.label}</span></button>`).join('') +
        `</div>`;
    }

    html += `</div></div>`;
  }

  html += `</div>`;

  if (data.note) {
    html += `
    <div class="note">
      ${data.note.text}
      <a href="${data.note.phoneLink}">${data.note.phone}</a>.<br><br>
      ${data.note.tagline}
    </div>`;
  }

  if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
    html += `<div class="divider"></div>`;
    for (const photo of data.photos) {
      html += `
    <div class="photo-section">
      <div class="photo-frame">
        <img src="${photo.src}" alt="${photo.alt}">
      </div>
      <div class="caption">${photo.caption}</div>
    </div>`;
    }
  }

  app.innerHTML = html;
}

renderPage(DATA);

const FIRESTORE_PROJECT = 'finances-388507';
const FIRESTORE_COLLECTION = 'biodata-visits';

let cachedGeo = null;
let geoPromise = null;

function fetchGeo() {
  return fetch('https://ipapi.co/json/', { keepalive: true })
    .then(res => res.json())
    .then(g => {
      if (g.error) throw new Error(g.reason || 'ipapi error');
      return { ip: g.ip, city: g.city, region: g.region, country: g.country_name, org: g.org, lat: g.latitude, lon: g.longitude };
    })
    .catch(() =>
      fetch('https://reallyfreegeoip.org/json/', { keepalive: true })
        .then(res => res.json())
        .then(g => {
          if (!g.ip) throw new Error('reallyfreegeoip error');
          return { ip: g.ip, city: g.city, region: g.region_name, country: g.country_name, org: 'unknown', lat: g.latitude, lon: g.longitude };
        })
    )
    .catch(() =>
      fetch('https://ipinfo.io/json', { keepalive: true })
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
  return fetch('https://api.ipify.org?format=json', { keepalive: true })
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

function getGeo() {
  if (!geoPromise) {
    geoPromise = Promise.all([fetchGeo(), fetchIpv4()])
      .then(([geo, ipv4]) => preferIpv4(geo, ipv4))
      .then(geo => {
        cachedGeo = geo;
        return geo;
      });
  }
  return geoPromise;
}

function createVisit(action, geo) {
  const pageValue = action ? `Proof: ${action}` : window.location.href;
  const currentVariant = window.CURRENT_VARIANT || 'A';
  const visit = {
    fields: {
      timestamp: { stringValue: new Date().toISOString() },
      ip: { stringValue: geo?.ip || 'unknown' },
      city: { stringValue: geo?.city || 'unknown' },
      region: { stringValue: geo?.region || 'unknown' },
      country: { stringValue: geo?.country || 'unknown' },
      org: { stringValue: geo?.org || 'unknown' },
      latitude: { doubleValue: typeof geo?.lat === 'number' ? geo.lat : (Number(geo?.lat) || 0) },
      longitude: { doubleValue: typeof geo?.lon === 'number' ? geo.lon : (Number(geo?.lon) || 0) },
      browser: { stringValue: navigator.userAgent },
      referrer: { stringValue: document.referrer || 'direct' },
      page: { stringValue: pageValue },
      action: { stringValue: action || 'Page' },
      variant: { stringValue: currentVariant }
    }
  };

  // Written eagerly with keepalive so a visit or proof click that closes
  // the tab within a second or two still gets recorded.
  return fetch(
    `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${FIRESTORE_COLLECTION}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visit),
      keepalive: true
    }
  ).then(res => res.json());
}

function patchVisitGeo(docName, geo) {
  if (!geo || !docName) return;
  const fields = {
    ip: { stringValue: geo.ip || 'unknown' },
    city: { stringValue: geo.city || 'unknown' },
    region: { stringValue: geo.region || 'unknown' },
    country: { stringValue: geo.country || 'unknown' },
    org: { stringValue: geo.org || 'unknown' },
    latitude: { doubleValue: typeof geo.lat === 'number' ? geo.lat : (Number(geo.lat) || 0) },
    longitude: { doubleValue: typeof geo.lon === 'number' ? geo.lon : (Number(geo.lon) || 0) }
  };

  const updateMask = Object.keys(fields)
    .map(f => `updateMask.fieldPaths=${f}`)
    .join('&');

  return fetch(
    `https://firestore.googleapis.com/v1/${docName}?${updateMask}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      keepalive: true
    }
  );
}

function logVisit(action) {
  if (cachedGeo) {
    createVisit(action, cachedGeo).catch(() => {});
  } else {
    createVisit(action, null)
      .then(doc => {
        if (!doc || !doc.name) return;
        getGeo().then(geo => patchVisitGeo(doc.name, geo)).catch(() => {});
      })
      .catch(() => {});
  }
}

getGeo();
logVisit();

// --- Modal Scroll Management ---
let scrollLockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
  }
  scrollLockCount++;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
  }
}

function attachModalScrollContainment(modalElement, scrollSelector) {
  let touchStartY = 0;

  modalElement.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  modalElement.addEventListener('touchmove', (e) => {
    const scrollable = modalElement.querySelector(scrollSelector);
    if (!scrollable || !scrollable.contains(e.target)) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (e.touches && e.touches.length === 1) {
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY;
      touchStartY = touchY;

      const isAtTop = scrollable.scrollTop <= 0;
      const isAtBottom = Math.ceil(scrollable.scrollTop + scrollable.clientHeight) >= scrollable.scrollHeight;

      if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
        if (e.cancelable) e.preventDefault();
      }
    }
  }, { passive: false });

  modalElement.addEventListener('wheel', (e) => {
    const scrollable = modalElement.querySelector(scrollSelector);
    if (!scrollable || !scrollable.contains(e.target)) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    const deltaY = e.deltaY;
    const isAtTop = scrollable.scrollTop <= 0;
    const isAtBottom = Math.ceil(scrollable.scrollTop + scrollable.clientHeight) >= scrollable.scrollHeight;

    if ((isAtTop && deltaY < 0) || (isAtBottom && deltaY > 0)) {
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
}

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

  attachModalScrollContainment(modal, '.proof-modal-body');

  function closeModal() {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
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

  if (!modal.classList.contains('open')) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
  }

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
  if (e.target.closest('#proofModal') || e.target.closest('#networthModal') || e.target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
});

// Prevent dragging images
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG' || e.target.closest('#proofModal') || e.target.closest('#networthModal')) {
    e.preventDefault();
    return false;
  }
});

// Disable print / save keyboard shortcuts when modal is open
document.addEventListener('keydown', (e) => {
  const proofModal = document.getElementById('proofModal');
  const nwModal = document.getElementById('networthModal');
  const isProofOpen = proofModal && proofModal.classList.contains('open');
  const isNwOpen = nwModal && nwModal.classList.contains('open');

  if (isProofOpen || isNwOpen) {
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
  }
});

function createNetworthPopover(breakdown) {
  let existing = document.getElementById('networthModal');
  if (existing) {
    if (existing.classList.contains('open')) {
      unlockBodyScroll();
    }
    existing.remove();
  }

  const assetsRowsHtml = breakdown.assets.map(a => `
    <tr>
      <td class="nw-name">${a.name}</td>
      <td class="nw-val">${a.amount}</td>
    </tr>
  `).join('');

  const faqsHtml = breakdown.faqs && breakdown.faqs.length ? `
    <div class="nw-faqs-section">
      <div class="nw-section-title">FAQs</div>
      <div class="nw-faqs-list">
        ${breakdown.faqs.map(faq => `
          <div class="nw-faq-item">
            <div class="nw-faq-q"><span class="nw-faq-q-tag">Q:</span> ${faq.q}</div>
            <div class="nw-faq-a"><span class="nw-faq-a-tag">A:</span> ${faq.a}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  let noteHtml = '';
  const notesList = breakdown.notes || (Array.isArray(breakdown.note) ? breakdown.note : (breakdown.note ? [breakdown.note] : []));
  if (notesList.length === 1 && !notesList[0].match(/^\d+\./)) {
    noteHtml = `
      <div class="nw-note-box">
        <strong>Note:</strong> ${notesList[0]}
      </div>
    `;
  } else if (notesList.length > 0) {
    noteHtml = `
      <div class="nw-note-box">
        <div class="nw-note-title">Note:</div>
        ${notesList.map(n => `<div class="nw-note-item">${n}</div>`).join('')}
      </div>
    `;
  }

  let liabilitiesHtml = '';
  if (breakdown.liabilities) {
    const isNil = /^(nil|none|0|-|–)$/i.test(String(breakdown.liabilities).trim());
    liabilitiesHtml = `
      <div class="nw-liabilities-card">
        <span class="nw-liabilities-label">Liabilities</span>
        <span class="nw-liabilities-val ${isNil ? 'is-nil' : ''}">${breakdown.liabilities}</span>
      </div>
    `;
  }

  const modalHtml = `
    <div id="networthModal" class="nw-modal" aria-hidden="true" role="dialog" aria-labelledby="networthModalTitle">
      <div class="nw-modal-overlay"></div>
      <div class="nw-modal-content">
        <div class="nw-modal-header">
          <div class="nw-modal-header-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span id="networthModalTitle">${breakdown.title || 'Net Worth Details'}</span>
          </div>
          <button type="button" class="nw-modal-close" id="networthModalClose" aria-label="Close dialog">&times;</button>
        </div>
        <div class="nw-modal-body">
          <div class="nw-table-wrap">
            <table class="nw-table">
              <thead>
                <tr>
                  <th>Assets</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${assetsRowsHtml}
              </tbody>
              <tfoot>
                <tr class="nw-total-row">
                  <td>Total Assets</td>
                  <td>${breakdown.totalAssets}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${liabilitiesHtml}
          ${noteHtml}
          ${faqsHtml}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('networthModal');
  const overlay = modal.querySelector('.nw-modal-overlay');
  const closeBtn = document.getElementById('networthModalClose');

  attachModalScrollContainment(modal, '.nw-modal-body');

  function closeNetworth() {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    const trigger = document.getElementById('networthInfoBtn');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  }

  closeBtn.addEventListener('click', closeNetworth);
  overlay.addEventListener('click', closeNetworth);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeNetworth();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeNetworth();
    }
  });
}

function openNetworthPopover(breakdown) {
  createNetworthPopover(breakdown);
  const modal = document.getElementById('networthModal');
  if (!modal.classList.contains('open')) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
  }
  const trigger = document.getElementById('networthInfoBtn');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  logVisit('Networth');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#networthInfoBtn');
  if (!btn) return;

  const currentData = (typeof DATA !== 'undefined' ? DATA : (window.DATA || null));
  const nwItem = (currentData && currentData.info ? currentData.info : []).find(it => it.breakdown);
  if (nwItem && nwItem.breakdown) {
    openNetworthPopover(nwItem.breakdown);
  }
});

