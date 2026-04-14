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
      html += item.value;
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

function logVisit() {
  fetch('https://ipapi.co/json/')
    .then(res => res.json())
    .then(geo => {
      const visit = {
        fields: {
          timestamp: { stringValue: new Date().toISOString() },
          ip: { stringValue: geo.ip || 'unknown' },
          city: { stringValue: geo.city || 'unknown' },
          region: { stringValue: geo.region || 'unknown' },
          country: { stringValue: geo.country_name || 'unknown' },
          org: { stringValue: geo.org || 'unknown' },
          latitude: { doubleValue: geo.latitude || 0 },
          longitude: { doubleValue: geo.longitude || 0 },
          browser: { stringValue: navigator.userAgent },
          referrer: { stringValue: document.referrer || 'direct' },
          page: { stringValue: window.location.href }
        }
      };

      return fetch(
        `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${FIRESTORE_COLLECTION}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(visit) }
      );
    })
    .catch(() => {});
}

logVisit();
