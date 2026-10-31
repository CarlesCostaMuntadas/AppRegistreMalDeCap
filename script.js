// ==========================================
// CONFIGURACIÓ DE L'APLICACIÓ
// ==========================================
const CLIENT_ID = "297457545292-bhvfq7mauqevmm22d8rd34pk9fjeg7oq.apps.googleusercontent.com";
const URL_APPLICACIO = "https://script.google.com/macros/s/AKfycbytoJOD-aciPSmj1Fi3RqM9VObvr3WBfC1RBtzteA-6AfcQ8sqhLXG2yzo-lkJkPd1w/exec";

let tokenClient;
let gapiIniciat = false;
let gsiIniciat = false;

document.addEventListener("DOMContentLoaded", () => {
    inicialitzarEsdeveniments();
});

// ==========================================
// AUTENTICACIÓ AMB GOOGLE
// ==========================================
function inicialitzarEsdeveniments() {
    const btnLogin = document.getElementById("btnLogin");
    if (btnLogin) {
        btnLogin.addEventListener("click", () => {
            if (tokenClient) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            }
        });
    }

    const formulari = document.getElementById("formulariRegistre");
    if (formulari) {
        formulari.addEventListener("submit", gestionarEnviament);
    }
}

// Aquesta funció es crida automàticament quan carreguen les llibreries de Google
function gapiLoaded() {
    gapi.load('client', iniciarGapiClient);
}

async function iniciarGapiClient() {
    gapiIniciat = true;
    comprovarIniciacio();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
            if (response.error !== undefined) {
                console.error("Error d'autorització:", response);
                return;
            }
            document.getElementById("login-container").style.display = "none";
            document.getElementById("app-container").style.display = "block";
            carregarEsdevenimentsAutocompletar();
        }
    });
    gsiIniciat = true;
    comprovarIniciacio();
}

function comprovarIniciacio() {
    if (gapiIniciat && gsiIniciat) {
        console.log("Serveis de Google carregats correctament.");
    }
}

// ==========================================
// COMUNICACIÓ AMB GOOGLE APPS SCRIPT
// ==========================================

function carregarEsdevenimentsAutocompletar() {
    // Petició GET per carregar dades si cal
    fetch(`${URL_APPLICACIO}?accio=obtenir`)
        .then(response => response.text())
        .then(data => {
            console.log("Dades carregades correctament.");
        })
        .catch(error => {
            console.warn("Avís en carregar dades (pot ser ignorat si és la primera execució):", error);
        });
}

function gestionarEnviament(e) {
    e.preventDefault();

    const tipus = document.getElementById("tipusEsdeveniment").value;
    const descripcio = document.getElementById("descripcio").value;
    const data = document.getElementById("dataEsdeveniment").value;

    const dadesRegistre = {
        tipus: tipus,
        descripcio: descripcio,
        data: data,
        timestamp: new Date().toISOString()
    };

    // Utilitzem mode: 'no-cors' per evitar el bloqueig de CORS per part del navegador
    fetch(URL_APPLICACIO, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(dadesRegistre)
    })
    .then(() => {
        alert("Esdeveniment desat correctament al teu Google Sheet!");
        document.getElementById("formulariRegistre").reset();
    })
    .catch(error => {
        console.error("Error al desar:", error);
        alert("S'ha produït un error en intentar desar les dades.");
    });
}
