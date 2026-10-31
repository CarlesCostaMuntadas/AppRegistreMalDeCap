// CONFIGURACIÓ
const CLIENT_ID = "297457545292-bhvfq7mauqevmm22d8rd34pk9fjeg7oq.apps.googleusercontent.com";
const URL_APPLICACIO = "https://script.google.com/macros/s/AKfycbytoJOD-aciPSmj1Fi3RqM9VObvr3WBfC1RBtzteA-6AfcQ8sqhLXG2yzo-lkJkPd1w/exec";

let tokenDeAcces = null;

window.onload = function () {
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: gestionarLogin
    });

    google.accounts.id.renderButton(
        document.getElementById("buttonDiv"),
        { theme: "outline", size: "large", width: 250, text: "signin_with", locale: "ca" }
    );
};

function gestionarLogin(response) {
    tokenDeAcces = response.credential;
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("appContent").classList.remove("hidden");

    posarDataActual();
    carregarEsdevenimentsAutocompletar();
}

function posarDataActual() {
    const ara = new Date();
    ara.setMinutes(ara.getMinutes() - ara.getTimezoneOffset());
    const text = ara.toISOString().slice(0, 16);
    document.getElementById("dataEsdeveniment").value = text;
    document.getElementById("dataMalDeCap").value = text;
}

function mostrarPanell(tipus) {
    const btnEsdeveniment = document.getElementById("btnNavEsdeveniment");
    const btnMalDeCap = document.getElementById("btnNavMalDeCap");
    const fEsdeveniment = document.getElementById("formEsdeveniment");
    const fMalDeCap = document.getElementById("formMalDeCap");

    if (tipus === "esdeveniment") {
        btnEsdeveniment.classList.add("active");
        btnMalDeCap.classList.remove("active");
        fEsdeveniment.classList.remove("hidden");
        fMalDeCap.classList.add("hidden");
    } else {
        btnMalDeCap.classList.add("active");
        btnEsdeveniment.classList.remove("active");
        fMalDeCap.classList.remove("hidden");
        fEsdeveniment.classList.add("hidden");
    }
    posarDataActual();
}

async function carregarEsdevenimentsAutocompletar() {
    try {
        const res = await fetch(URL_APPLICACIO + "?action=getEsdeveniments");
        const data = await res.json();
        const datalist = document.getElementById("llistaEsdeveniments");
        datalist.innerHTML = "";
        const esdeveniments = data.esdeveniments || data.aliments;
        if (esdeveniments) {
            esdeveniments.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                datalist.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error carregant esdeveniments", e);
    }
}

async function enviarEsdeveniment(boto) {
    const dataHora = document.getElementById("dataEsdeveniment").value.replace("T", " ");
    const esdeveniment = document.getElementById("inputEsdeveniment").value.trim();
    const observacions = document.getElementById("obsEsdeveniment").value.trim();

    if (!esdeveniment) { alert("Escriu un esdeveniment"); return; }

    boto.disabled = true;
    boto.innerText = "Desant...";

    try {
        await fetch(URL_APPLICACIO, {
            method: "POST",
			mode: 'no-cors',
            body: JSON.stringify({ tipusRegistre: "esdeveniment", dataHora, esdeveniment, observacions })
        });
        alert("Desat correctament al teu Google Sheet!");
        document.getElementById("inputEsdeveniment").value = "";
        document.getElementById("obsEsdeveniment").value = "";
        carregarEsdevenimentsAutocompletar();
    } catch (e) {
        alert("Error al desar");
    } finally {
        boto.disabled = false;
        boto.innerText = "Desar esdeveniment";
    }
}

async function enviarMalDeCap(boto) {
    const dataHora = document.getElementById("dataMalDeCap").value.replace("T", " ");
    const tipus = document.getElementById("inputTipus").value.trim();
    const intensitat = document.getElementById("selectIntensitat").value;
    const medicacio = document.getElementById("checkMedicacio").checked ? "Sí" : "No";
    const observacions = document.getElementById("obsMalDeCap").value.trim();

    if (!tipus) { alert("Escriu o tria el tipus de mal de cap"); return; }

    boto.disabled = true;
    boto.innerText = "Desant...";

    try {
        await fetch(URL_APPLICACIO, {
            method: "POST",
			mode: 'no-cors',
            body: JSON.stringify({ tipusRegistre: "malDeCap", dataHora, tipus, intensitat, medicacio, observacions })
        });
        alert("Desat correctament al teu Google Sheet!");
        document.getElementById("inputTipus").value = "";
        document.getElementById("checkMedicacio").checked = false;
        document.getElementById("obsMalDeCap").value = "";
    } catch (e) {
        alert("Error al desar");
    } finally {
        boto.disabled = false;
        boto.innerText = "Desar mal de cap";
    }
}
