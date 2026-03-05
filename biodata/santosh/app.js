function renderPage(data) {
  const app = document.getElementById('app');
  document.title = `${data.subtitle} - ${data.name}`;

  let html = `
    <div class="header">
      <h1>${data.name}</h1>
      <div class="subtitle">${data.subtitle}</div>
    </div>

    <div class="photo-section">
      <div class="caption">${data.profilePhoto.caption}</div>
      <div class="photo-frame">
        <img src="${data.profilePhoto.src}" alt="${data.profilePhoto.alt}">
      </div>
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
      <a href="${data.note.phoneLink}">${data.note.phone}</a>.
    </div>

    <div class="divider"></div>`;

  for (const photo of data.photos) {
    html += `
    <div class="photo-section">
      <div class="caption">${photo.caption}</div>
      <div class="photo-frame">
        <img src="${photo.src}" alt="${photo.alt}">
      </div>
    </div>`;
  }

  app.innerHTML = html;
}

renderPage(DATA);
