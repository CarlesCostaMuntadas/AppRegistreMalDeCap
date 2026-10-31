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

    // Si ja hi havia una sessió activa en carregar la pàgina, carreguem les llistes
    if (session) {
        carregarOpcionsDatalists();
    }
});

// ==========================================
// CARREGAR OPCIONS DINÀMIQUES ALS DATALISTS
// ==========================================
async function carregarOpcionsDatalists() {
    try {
        // Obtenim tots els registres de l'usuari actual
        const { data, error } = await supabaseClient
            .from('registres')
            .select('tipus_registre, valor');

        if (error) throw error;

        // Base predefinida per a Esdeveniments (Aliments o activitats)
        const esdevenimentsBase = ["Cafè", "Patata", "Ioga"];
        // Base predefinida per a Tipus de Mal de Cap
        const malDeCapBase = [
            "Tensional", 
            "Cervicàlgia (espleni)", 
            "Pressió cranial", 
            "Palpitant", 
            "Migranya amb aura", 
            "Migranya sense aura"
        ];

        // Extreure i filtrar de la base de dades
        const esdevenimentsDB = data ? data.filter(r => r.tipus_registre === 'esdeveniment' && r.valor).map(r => r.valor) : [];
        const malDeCapDB = data ? data.filter(r => r.tipus_registre === 'maldecap' && r.valor).map(r => r.valor) : [];

        // Combinar, eliminar duplicats (fent servir Set) i ordenar alfabèticament (ignorant majúscules/minúscules)
        const esdevenimentsUnics = [...new Set([...esdevenimentsBase, ...esdevenimentsDB])].sort((a, b) => a.localeCompare(b, 'ca', {sensitivity: 'accent'}));
        const malDeCapUnics = [...new Set([...malDeCapBase, ...malDeCapDB])].sort((a, b) => a.localeCompare(b, 'ca', {sensitivity: 'accent'}));

        // Actualitzar el DOM del datalist d'esdeveniments
        const dlEsdeveniments = document.getElementById("llistaEsdeveniments");
        if (dlEsdeveniments) {
            dlEsdeveniments.innerHTML = "";
            esdevenimentsUnics.forEach(item => {
                const opt = document.createElement("option");
                opt.value = item;
                dlEsdeveniments.appendChild(opt);
            });
        }

        // Actualitzar el DOM del datalist de tipus de mal de cap
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
            data_hora: document.getElementById("dataEsdeveniment").value,
            tipus_registre: "esdeveniment",
            valor: document.getElementById("inputEsdeveniment").value.trim(),
            intensitat: null,
            medicacio: null,
            observacions: document.getElementById("obsEsdeveniment").value
        };
    } else {
        dadesRegistre = {
            data_hora: document.getElementById("dataMalDeCap").value,
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

        // Actualitzem les llistes de manera dinàmica perquè el nou terme aparegui immediatament
        carregarOpcionsDatalists();

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