// Lista + formulario genérico conectado a Firestore
function iniciarLista(cfg){
  firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth(), db = firebase.firestore();
  const form = document.getElementById('formulario');
  const lista = document.getElementById('lista');
  const msg = document.getElementById('msg');

  form.innerHTML = cfg.campos.map(c => c.tipo === 'check'
    ? `<label class="chk"><input type="checkbox" id="f_${c.id}"> ${c.etiqueta}</label>`
    : `<div class="campo"><label>${c.etiqueta}</label><input type="text" id="f_${c.id}" placeholder="${c.ph || ''}"></div>`
  ).join('') + '<button id="btnGuardar" class="btn">➕ Guardar</button>';

  function aviso(t, ok){ msg.textContent = t; msg.className = 'msg ' + (ok ? 'ok' : 'err'); }

  document.getElementById('btnGuardar').addEventListener('click', async () => {
    const datos = {};
    cfg.campos.forEach(c => {
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
        const el = document.getElementById('f_' + c.id);
        c.tipo === 'check' ? el.checked = false : el.value = '';
      });
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
      s.textContent = [x.whatsapp, x.eco ? 'ECO' : '', x.em ? 'EM' : ''].filter(Boolean).join(' · ');
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
