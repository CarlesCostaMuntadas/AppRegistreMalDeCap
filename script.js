// ==========================================
// CONFIGURACIÓ DE L'APLICACIÓ
// ==========================================
const CLIENT_ID = "297457545292-bhvfq7mauqevmm22d8rd34pk9fjeg7oq.apps.googleusercontent.com";
const URL_APPLICACIO = "https://script.google.com/macros/s/AKfycbytoJOD-aciPSmj1Fi3RqM9VObvr3WBfC1RBtzteA-6AfcQ8sqhLXG2yzo-lkJkPd1w/exec";

let tokenClient;
let gapiIniciat = false;
let gsiIniciat = false;

document.addEventListener("DOMContentLoaded", () => {
    establirDatesActuals();
    inicialitzarEsdeveniments();
    
    // Si ja s'havia iniciat sessió abans, amaguem el login directament
    if (localStorage.getItem("usuari_loguejat") === "true") {
        document.getElementById("login-container").style.display = "none";
        document.getElementById("app-container").classList.remove("hidden");
    }
});

function establirDatesActuals() {
    const ara = new Date();
    // Format YYYY-MM-DDThh:mm
    const offset = ara.getTimezoneOffset();
    const dataLocal = new Date(ara.getTime() - (offset*60*1000)).toISOString().slice(0,16);
    
    const inputEsdeveniment = document.getElementById("dataEsdeveniment");
    const inputMalDeCap = document.getElementById("dataMalDeCap");
    
    if (inputEsdeveniment) inputEsdeveniment.value = dataLocal;
    if (inputMalDeCap) inputMalDeCap.value = dataLocal;
}

// ==========================================
// NAVEGACIÓ ENTRE PANELLS
// ==========================================
window.mostrarPanell = function(panell) {
    const formEsdeveniment = document.getElementById("formEsdeveniment");
    const formMalDeCap = document.getElementById("formMalDeCap");
    const btnNavEsdeveniment = document.getElementById("btnNavEsdeveniment");
    const btnNavMalDeCap = document.getElementById("btnNavMalDeCap");

    if (panell === 'esdeveniment') {
        formEsdeveniment.classList.remove("hidden");
        formMalDeCap.classList.add("hidden");
        btnNavEsdeveniment.classList.add("active");
        btnNavMalDeCap.classList.remove("active");
    } else {
        formMalDeCap.classList.remove("hidden");
        formEsdeveniment.classList.add("hidden");
        btnNavMalDeCap.classList.add("active");
        btnNavEsdeveniment.classList.remove("active");
    }
};

// ==========================================
// AUTENTICACIÓ AMB GOOGLE
// ==========================================
function inicialitzarEsdeveniments() {
    const btnLogin = document.getElementById("btnLogin");
    if (btnLogin) {
        btnLogin.addEventListener("click", () => {
            if (tokenClient) {
                tokenClient.requestAccessToken({ prompt: '' });
            } else {
                alert("El servei de Google encara s'està carregant. Torna-ho a provar en un segon.");
            }
        });
    }

    const formEsdeveniment = document.getElementById("formEsdeveniment");
    if (formEsdeveniment) {
        formEsdeveniment.addEventListener("submit", (e) => gestionarEnviament(e, 'esdeveniment'));
    }

    const formMalDeCap = document.getElementById("formMalDeCap");
    if (formMalDeCap) {
        formMalDeCap.addEventListener("submit", (e) => gestionarEnviament(e, 'malDeCap'));
    }
}

// Funcions globals per a Google Identity Services
window.gapiLoaded = function() {
    gapi.load('client', () => { gapiIniciat = true; });
};

window.gisLoaded = function() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
            if (response.error !== undefined) {
                console.error("Error d'autorització:", response);
                return;
            }
            localStorage.setItem("usuari_loguejat", "true");
            
            document.getElementById("login-container").style.display = "none";
            document.getElementById("app-container").classList.remove("hidden");
            carregarEsdevenimentsAutocompletar();
        }
    });
    gsiIniciat = true;
};

// ==========================================
// COMUNICACIÓ AMB GOOGLE APPS SCRIPT
// ==========================================
function carregarEsdevenimentsAutocompletar() {
    fetch(`${URL_APPLICACIO}?accio=obtenir`, { method: 'GET' })
        .then(response => response.text())
        .then(data => {
            console.log("Dades carregades correctament.");
        })
        .catch(error => {
            console.warn("Avís en carregar dades:", error);
        });
}

function gestionarEnviament(e, tipusFormulari) {
    e.preventDefault();

    let dadesRegistre = {};

    if (tipusFormulari === 'esdeveniment') {
        dadesRegistre = {
            tipusRegistre: "Esdeveniment",
            data: document.getElementById("dataEsdeveniment").value,
            valor: document.getElementById("inputEsdeveniment").value,
            observacions: document.getElementById("obsEsdeveniment").value,
            timestamp: new Date().toISOString()
        };
    } else {
        dadesRegistre = {
            tipusRegistre: "MalDeCap",
            data: document.getElementById("dataMalDeCap").value,
            valor: document.getElementById("inputTipus").value,
            intensitat: document.getElementById("selectIntensitat").value,
            medicacio: document.getElementById("checkMedicacio").checked ? "Sí" : "No",
            observacions: document.getElementById("obsMalDeCap").value,
            timestamp: new Date().toISOString()
        };
    }

    fetch(URL_APPLICACIO, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(dadesRegistre)
    })
    .then(() => {
        alert("Registre desat correctament al teu Google Sheet!");
        if (tipusFormulari === 'esdeveniment') {
            document.getElementById("formEsdeveniment").reset();
        } else {
            document.getElementById("formMalDeCap").reset();
        }
        establirDatesActuals();
    })
    .catch(error => {
        console.error("Error al desar:", error);
        alert("S'ha produït un error en intentar desar les dades.");
    });
}