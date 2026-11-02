// ==========================================
// CONFIGURACIÓ DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://rtfhnxjgygwpvtosqjbt.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_QtYdLnDhZqJ6nJgYWX5I8g_nug6i59_";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    gestionarEstatSessio(session);

    const formLogin = document.getElementById("formLogin");
    const btnSignUpSubmit = document.getElementById("btnSignUpSubmit");

    // Login
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                mostrarMissatge("Error d'accés: " + error.message, "error");
            } else {
                mostrarMissatge("Sessió iniciada correctament!", "success");
                formLogin.reset();
                gestionarEstatSessio(data.session);
                carregarOpcionsDatalists(); // Carregar llistes un cop dins
                carregarUltimsRegistres();  // Carregar taula recent
            }
        });
    }

    // Registre
    if (btnSignUpSubmit) {
        btnSignUpSubmit.addEventListener("click", async () => {
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;

            if (!email || !password) {
                mostrarMissatge("Omple el correu i la contrasenya.", "error");
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({ 
                email, 
                password,
                options: { emailRedirectTo: window.location.href }
            });

            if (error) {
                mostrarMissatge("Error en crear compte: " + error.message, "error");
            } else {
                mostrarMissatge("Compte creat! Revisa el teu correu per confirmar-lo.", "success");
                formLogin.reset();
            }
        });
    }

    // Tancar sessió
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            gestionarEstatSessio(null);
            mostrarMissatge("Sessió tancada.", "success");
        });
    }

    // Baixar CSV
    const btnDownloadCsv = document.getElementById("btnDownloadCsv");
    if (btnDownloadCsv) {
        btnDownloadCsv.addEventListener("click", descarregarCsvPropis);
    }

    establirDatesActuals();
    inicialitzarEsdeveniments();

    // Si ja hi havia una sessió activa en carregar la pàgina, carreguem les llistes i la taula
    if (session) {
        carregarOpcionsDatalists();
        carregarUltimsRegistres();
    }
});

// ==========================================
// CARREGAR OPCIONS DINÀMIQUES ALS DATALISTS
// ==========================================
async function carregarOpcionsDatalists() {
    try {
        const { data, error } = await supabaseClient
            .from('registres')
            .select('tipus_registre, valor');

        if (error) throw error;

        const esdevenimentsBase = ["Cafè", "Patata", "Ioga"];
        const malDeCapBase = [
            "Tensional", 
            "Cervicàlgia (espleni)", 
            "Pressió cranial", 
            "Palpitant", 
            "Migranya amb aura", 
            "Migranya sense aura"
        ];

        const esdevenimentsDB = data ? data.filter(r => r.tipus_registre === 'esdeveniment' && r.valor).map(r => r.valor) : [];
        const malDeCapDB = data ? data.filter(r => r.tipus_registre === 'maldecap' && r.valor).map(r => r.valor) : [];

        const esdevenimentsUnics = [...new Set([...esdevenimentsBase, ...esdevenimentsDB])].sort((a, b) => a.localeCompare(b, 'ca', {sensitivity: 'accent'}));
        const malDeCapUnics = [...new Set([...malDeCapBase, ...malDeCapDB])].sort((a, b) => a.localeCompare(b, 'ca', {sensitivity: 'accent'}));

        const dlEsdeveniments = document.getElementById("llistaEsdeveniments");
        if (dlEsdeveniments) {
            dlEsdeveniments.innerHTML = "";
            esdevenimentsUnics.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                dlEsdeveniments.appendChild(opt);
            });
        }

        const dlMalDeCap = document.getElementById("llistaTipusMalDeCap");
        if (dlMalDeCap) {
            dlMalDeCap.innerHTML = "";
            malDeCapUnics.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                dlMalDeCap.appendChild(opt);
            });
        }

    } catch (err) {
        console.error("Error carregant les llistes dinàmiques:", err);
    }
}

// ==========================================
// CARREGAR ÚLTIMS REGISTRES A LA TAULA
// ==========================================
async function carregarUltimsRegistres() {
    const tbody = document.getElementById("taulaUltimsRegistresBody");
    if (!tbody) return;

    const limitSelect = document.getElementById("selectLimitRegistres");
    const limit = limitSelect ? parseInt(limitSelect.value) : 10;

    try {
        const { data, error } = await supabaseClient
            .from('registres')
            .select('*')
            .order('data_hora', { ascending: false })
            .limit(limit);

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-light); padding: 12px;">Encara no hi ha registres.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        data.forEach(r => {
            const tr = document.createElement("tr");

            let dataFormatejada = r.data_hora;
            try {
                const d = new Date(r.data_hora);
                dataFormatejada = d.toLocaleString('ca-ES', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                });
            } catch (e) {}

            let tipusBadge = '';
            let detallText = r.valor || '-';

            if (r.tipus_registre === 'esdeveniment') {
                tipusBadge = `<span class="badge-tag badge-esdeveniment">Aliment/Activitat</span>`;
            } else {
                tipusBadge = `<span class="badge-tag badge-maldecap">Mal de cap</span>`;
                detallText = `<strong>${r.valor}</strong> (${r.intensitat}${r.medicacio ? ', amb medicació' : ''})`;
            }

            tr.innerHTML = `
                <td style="white-space: nowrap; color: var(--text-light); font-size: 0.8rem;">${dataFormatejada}</td>
                <td>${tipusBadge}</td>
                <td>${detallText}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error en carregar l'historial recent:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #dc2626; padding: 12px;">Error al carregar les dades.</td></tr>`;
    }
}

// ==========================================
// SISTEMA DE MISSATGES (TOAST)
// ==========================================
function mostrarMissatge(text, tipus) {
    const toast = document.getElementById("toast-message");
    if (!toast) return;

    toast.textContent = text;
    toast.className = `toast ${tipus}`;

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 4000);
}

// ==========================================
// GESTIÓ DE LA SESSIÓ
// ==========================================
function gestionarEstatSessio(session) {
    const loginContainer = document.getElementById("login-container");
    const appContainer = document.getElementById("app-container");

    if (session) {
        if (loginContainer) loginContainer.style.display = "none";
        if (appContainer) appContainer.classList.remove("hidden");
    } else {
        if (loginContainer) loginContainer.style.display = "block";
        if (appContainer) appContainer.classList.add("hidden");
    }
}

function establirDatesActuals() {
    const ara = new Date();
    const offset = ara.getTimezoneOffset();
    const dataLocal = new Date(ara.getTime() - (offset*60*1000)).toISOString().slice(0,16);
    
    const inputEsdeveniment = document.getElementById("dataEsdeveniment");
    const inputMalDeCap = document.getElementById("dataMalDeCap");
    
    if (inputEsdeveniment) inputEsdeveniment.value = dataLocal;
    if (inputMalDeCap) inputMalDeCap.value = dataLocal;
}

window.mostrarPanell = function(panell) {
    const formEsdeveniment = document.getElementById("formEsdeveniment");
    const formMalDeCap = document.getElementById("formMalDeCap");
    const btnNavEsdeveniment = document.getElementById("btnNavEsdeveniment");
    const btnNavMalDeCap = document.getElementById("btnNavMalDeCap");
    const cardHistorial = document.getElementById("cardHistorialRecent");

    if (panell === 'esdeveniment') {
        formEsdeveniment.classList.remove("hidden");
        formMalDeCap.classList.add("hidden");
        btnNavEsdeveniment.classList.add("active");
        btnNavMalDeCap.classList.remove("active");
        if (cardHistorial) cardHistorial.classList.remove("hidden");
    } else {
        formMalDeCap.classList.remove("hidden");
        formEsdeveniment.classList.add("hidden");
        btnNavMalDeCap.classList.add("active");
        btnNavEsdeveniment.classList.remove("active");
        if (cardHistorial) cardHistorial.classList.add("hidden");
    }
};

function inicialitzarEsdeveniments() {
    const formEsdeveniment = document.getElementById("formEsdeveniment");
    if (formEsdeveniment) {
        formEsdeveniment.addEventListener("submit", (e) => gestionarEnviament(e, 'esdeveniment'));
    }

    const formMalDeCap = document.getElementById("formMalDeCap");
    if (formMalDeCap) {
        formMalDeCap.addEventListener("submit", (e) => gestionarEnviament(e, 'maldecap'));
    }
}

async function gestionarEnviament(e, tipusFormulari) {
    e.preventDefault();

    let dadesRegistre = {};

    if (tipusFormulari === 'esdeveniment') {
        dadesRegistre = {
            data_hora: new Date(document.getElementById("dataEsdeveniment").value).toISOString(),
            tipus_registre: "esdeveniment",
            valor: document.getElementById("inputEsdeveniment").value.trim(),
            intensitat: null,
            medicacio: null,
            observacions: document.getElementById("obsEsdeveniment").value
        };
    } else {
        dadesRegistre = {
            data_hora: new Date(document.getElementById("dataMalDeCap").value).toISOString(),
            tipus_registre: "maldecap",
            valor: document.getElementById("inputTipus").value.trim(),
            intensitat: document.getElementById("selectIntensitat").value,
            medicacio: document.getElementById("checkMedicacio").checked ? true : false,
            observacions: document.getElementById("obsMalDeCap").value
        };
    }

    try {
        const { error } = await supabaseClient
            .from('registres')
            .insert([dadesRegistre]);

        if (error) throw error;

        mostrarMissatge("Registre desat correctament!", "success");
        
        if (tipusFormulari === 'esdeveniment') {
            document.getElementById("formEsdeveniment").reset();
        } else {
            document.getElementById("formMalDeCap").reset();
        }
        establirDatesActuals();

        carregarOpcionsDatalists();
        carregarUltimsRegistres();

    } catch (error) {
        console.error("Error al desar:", error);
        mostrarMissatge("Error en desar: " + error.message, "error");
    }
}

async function descarregarCsvPropis() {
    try {
        const { data, error } = await supabaseClient
            .from('registres')
            .select('*');

        if (error) throw error;
        if (!data || data.length === 0) {
            mostrarMissatge("No hi ha dades per descarregar.", "error");
            return;
        }

        const capçaleres = Object.keys(data[0]);
        let csvContent = capçaleres.join(",") + "\n";

        data.forEach(fila => {
            const valors = capçaleres.map(camp => {
                let val = fila[camp] !== null ? fila[camp] : "";
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvContent += valors.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'registres_salut_propi.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        mostrarMissatge("Dades descarregades correctament en CSV!", "success");

    } catch (error) {
        console.error("Error al baixar dades:", error);
        mostrarMissatge("Error al descarregar les dades.", "error");
    }
}