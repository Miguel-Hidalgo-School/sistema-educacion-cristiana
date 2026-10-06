// Lista + formulario genérico conectado a Firestore
function iniciarLista(cfg){
  firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth(), db = firebase.firestore();
  const form = document.getElementById('formulario');
  const lista = document.getElementById('lista');
  const msg = document.getElementById('msg');

  // Campos tipo 'diplomados': lista dinámica desde Firestore (catalogo), visible solo
  // cuando el campo checkbox indicado en "dependeDe" está marcado.
  const camposDiplomados = cfg.campos.filter(c => c.tipo === 'diplomados');
  let catalogoDiplomados = [];

  function htmlCampo(c){
    if (c.tipo === 'check') return `<label class="chk"><input type="checkbox" id="f_${c.id}"> ${c.etiqueta}</label>`;
    if (c.tipo === 'diplomados') return `<div class="campo campoDiplomados" id="bloque_${c.id}" style="display:none;">
        <label>${c.etiqueta}</label>
        <div id="f_${c.id}" class="listaDiplomados"><p class="sub">Cargando diplomados…</p></div>
      </div>`;
    return `<div class="campo"><label>${c.etiqueta}</label><input type="text" id="f_${c.id}" placeholder="${c.ph || ''}"></div>`;
  }

  form.innerHTML = cfg.campos.map(htmlCampo).join('') + '<button id="btnGuardar" class="btn">➕ Guardar</button>';

  // Muestra/oculta el bloque de diplomados según el checkbox del que depende (p.ej. "em").
  camposDiplomados.forEach(c => {
    const dep = document.getElementById('f_' + c.dependeDe);
    const bloque = document.getElementById('bloque_' + c.id);
    if (!dep || !bloque) return;
    const actualizar = () => { bloque.style.display = dep.checked ? 'block' : 'none'; };
    dep.addEventListener('change', actualizar);
    actualizar();
  });

  function pintarOpcionesDiplomados(){
    camposDiplomados.forEach(c => {
      const cont = document.getElementById('f_' + c.id);
      if (!cont) return;
      if (!catalogoDiplomados.length) { cont.innerHTML = '<p class="sub">Aún no hay diplomados en el catálogo.</p>'; return; }
      cont.innerHTML = catalogoDiplomados.map(d =>
        `<label class="chk" style="display:block;margin:0 0 8px;"><input type="checkbox" value="${d.id}" data-nombre="${d.nombre}"> ${d.nombre}</label>`
      ).join('');
    });
  }

  if (camposDiplomados.length) {
    db.collection('catalogo').where('tipo', '==', 'diplomado').orderBy('nombre').get()
      .then(snap => { catalogoDiplomados = snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre })); pintarOpcionesDiplomados(); })
      .catch(() => { camposDiplomados.forEach(c => { const cont = document.getElementById('f_' + c.id); if (cont) cont.innerHTML = '<p class="sub">No se pudo cargar el catálogo de diplomados.</p>'; }); });
  }

  function aviso(t, ok){ msg.textContent = t; msg.className = 'msg ' + (ok ? 'ok' : 'err'); }

  document.getElementById('btnGuardar').addEventListener('click', async () => {
    const datos = {};
    cfg.campos.forEach(c => {
      if (c.tipo === 'diplomados') {
        const cont = document.getElementById('f_' + c.id);
        const marcados = cont ? Array.from(cont.querySelectorAll('input[type=checkbox]:checked')) : [];
        datos[c.id] = marcados.map(el => ({ id: el.value, nombre: el.dataset.nombre }));
        return;
      }
      const el = document.getElementById('f_' + c.id);
      datos[c.id] = c.tipo === 'check' ? el.checked : el.value.trim();
    });
    if (!datos.nombreCompleto) return aviso('Escribe el nombre completo', false);
    try {
      await db.collection(cfg.coleccion).add({
        ...datos,
        creadoPor: auth.currentUser.email,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });
      cfg.campos.forEach(c => {
        if (c.tipo === 'diplomados') {
          const cont = document.getElementById('f_' + c.id);
          if (cont) cont.querySelectorAll('input[type=checkbox]').forEach(el => el.checked = false);
          return;
        }
        const el = document.getElementById('f_' + c.id);
        c.tipo === 'check' ? el.checked = false : el.value = '';
      });
      camposDiplomados.forEach(c => { const b = document.getElementById('bloque_' + c.id); if (b) b.style.display = 'none'; });
      aviso('✅ Guardado', true);
    } catch (e) {
      aviso(e.code === 'permission-denied'
        ? 'Sin permiso: tu usuario debe ser Administrador o Subadministrador (revisa las reglas y tu documento en "usuarios")'
        : 'Error: ' + e.message, false);
    }
  });

  function pintar(snap){
    lista.innerHTML = '';
    if (snap.empty){ lista.innerHTML = '<p class="vacio">Aún no hay registros</p>'; return; }
    snap.forEach(d => {
      const x = d.data();
      const fila = document.createElement('div');
      fila.className = 'fila';
      const info = document.createElement('div');
      const n = document.createElement('strong'); n.textContent = x.nombreCompleto;
      const s = document.createElement('div'); s.className = 'sub';
      const diplomadosTxt = Array.isArray(x.diplomados) && x.diplomados.length
        ? x.diplomados.map(d2 => d2.nombre).join(', ') : '';
      s.textContent = [x.whatsapp, x.eco ? 'ECO' : '', x.em ? 'EMI' : '', diplomadosTxt].filter(Boolean).join(' · ');
      info.append(n, s);
      const b = document.createElement('button'); b.className = 'borrar'; b.textContent = '🗑️';
      b.onclick = async () => {
        if (!confirm('¿Borrar a ' + x.nombreCompleto + '?')) return;
        try { await d.ref.delete(); } catch (e) { aviso('No se pudo borrar: ' + e.message, false); }
      };
      fila.append(info, b);
      lista.appendChild(fila);
    });
  }

  auth.onAuthStateChanged(u => {
    if (!u) { window.location.href = 'index.html'; return; }
    db.collection(cfg.coleccion).orderBy('nombreCompleto').onSnapshot(pintar,
      e => { lista.innerHTML = ''; aviso('No se pueden leer los datos: ' + e.message, false); });
  });
}
