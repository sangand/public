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
      html += `<span class="proof-links">` +
        item.proofs.map(p => `<a href="${p.url}" target="_blank" rel="noopener" class="proof-badge" data-log-label="${p.logLabel || p.label}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${p.label}</span></a>`).join('') +
        `</span>`;
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
      page: { stringValue: window.location.href },
      action: { stringValue: action || 'Page' }
    }
  };

  return fetch(
    `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${FIRESTORE_COLLECTION}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visit) }
  );
}

function fetchGeo() {
  return fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(g => ({ ip: g.ip, city: g.city, region: g.region, country: g.country_name, org: g.org, lat: g.latitude, lon: g.longitude }))
    .catch(() =>
      fetch('https://reallyfreegeoip.org/json/')
        .then(res => res.json())
        .then(g => ({ ip: g.ip, city: g.city, region: g.region_name, country: g.country_name, org: 'unknown', lat: g.latitude, lon: g.longitude }))
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

document.querySelectorAll('.proof-badge').forEach(link => {
  link.addEventListener('click', () => logVisit(link.dataset.logLabel));
});
