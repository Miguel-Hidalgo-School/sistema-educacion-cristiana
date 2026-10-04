// PROTEGE TODAS LAS PÁGINAS — Si no iniciaste sesión, te manda al login
firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();

auth.onAuthStateChanged(usuario => {
  if (!usuario) {
    window.location.href = 'login.html';
  }
});

// Cerrar sesión — disponible desde cualquier página
function cerrarSesion(){
  firebase.auth().signOut().then(() => {
    window.location.href = 'login.html';
  });
}
