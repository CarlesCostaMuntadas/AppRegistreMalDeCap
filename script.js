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
    
    // Si ja s'havia iniciat sessió abans, amaguem el login directament
    if (localStorage.getItem("usuari_loguejat") === "true") {
        document.getElementById("login-container").style.display = "none";
        document.getElementById("app-container").style.display = "block";
    }
});

// ==========================================
// AUTENTICACIÓ AMB GOOGLE
// ==========================================
function inicialitzarEsdeveniments() {
    const btnLogin = document.getElementById("btnLogin");
    if (btnLogin) {
        btnLogin.addEventListener("click", () => {
            if (tokenClient) {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    const formulari = document.getElementById("formulariRegistre");
    if (formulari) {
        formulari.addEventListener("submit", gestionarEnviament);
    }
}

function gapiLoaded() {
    gapi.load('client', iniciarGapiClient);
}

async function iniciarGapiClient() {
    gapiIniciat = true;
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
            // Guardem l'estat de la sessió
            localStorage.setItem("usuari_loguejat", "true");
            
            document.getElementById("login-container").style.display = "none";
            document.getElementById("app-container").style.display = "block";
            carregarEsdevenimentsAutocompletar();
        }
    });
    gsiIniciat = true;
}

// ==========================================
// COMUNICACIÓ AMB GOOGLE APPS SCRIPT
// ==========================================
function carregarEsdevenimentsAutocompletar() {
    fetch(`${URL_APPLICACIO}?accio=obtenir`)
        .then(response => response.text())
        .then(data => {
            console.log("Dades carregades correctament.");
        })
        .catch(error => {
            console.warn("Avís en carregar dades:", error);
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