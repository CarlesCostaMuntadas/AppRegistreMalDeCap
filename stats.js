const SUPABASE_URL = "https://rtfhnxjgygwpvtosqjbt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QtYdLnDhZqJ6nJgYWX5I8g_nug6i59_";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dadesGlobals = [];

document.addEventListener("DOMContentLoaded", async () => {
    aplicarFiltresTempsPredefinits();
    await carregarDadesInicials();
    
    document.addEventListener("click", (e) => {
        if (!e.target.closest('.dropdown-filter-container')) {
            document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
        }
    });
});

async function carregarDadesInicials() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = "index.html";
            return;
        }

        const { data: registres, error } = await supabaseClient
            .from('registres')
            .select('*')
            .eq('user_id', session.user.id)
            .order('data_hora', { ascending: true });

        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';

        if (error) throw error;

        if (!registres || registres.length === 0) {
            if (loadingEl) {
                loadingEl.innerHTML = "Encara no hi ha dades registrades.";
                loadingEl.style.display = 'block';
            }
            return;
        }

        dadesGlobals = registres;
        inicialitzarFiltreTipus(registres);
        document.getElementById('stats-content').classList.remove('hidden');
        actualitzarEstadistiques();

    } catch (err) {
        console.error("Error:", err);
        document.getElementById('loading').innerHTML = "Error al carregar les estadístiques.";
    }
}

function inicialitzarFiltreTipus(registres) {
    const tipusUnics = [...new Set(registres.filter(r => r.tipus_registre === 'maldecap').map(r => r.valor))].sort();
    const container = document.getElementById('containerCheckboxesTipus');
    container.innerHTML = '';

    if (tipusUnics.length === 0) {
        container.innerHTML = '<span style="font-size:0.8rem; color:var(--text-light);">Sense tipus</span>';
        return;
    }

    tipusUnics.forEach(tipus => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="chkTipus" value="${tipus}" checked onchange="actualitzarEstadistiques()"> ${tipus}`;
        container.appendChild(label);
    });
}

function toggleDropdown(id) {
    const el = document.getElementById(id);
    document.querySelectorAll('.dropdown-content').forEach(d => {
        if (d.id !== id) d.classList.add('hidden');
    });
    el.classList.toggle('hidden');
}

function marcarTotsCheckbox(masterCheckbox, className) {
    const checkboxes = document.querySelectorAll(`.${className}`);
    checkboxes.forEach(chk => {
        chk.checked = masterCheckbox.checked;
    });
    actualitzarEstadistiques();
}

function aplicarFiltresTempsPredefinits() {
    const opcio = document.getElementById('selectPeridiode').value;
    const grupInici = document.getElementById('grupDataInici');
    const grupFi = document.getElementById('grupDataFi');
    
    const avui = new Date();
    let dataInici = new Date();

    if (opcio === 'personalitzat') {
        grupInici.style.display = 'flex';
        grupFi.style.display = 'flex';
        
        const inputInici = document.getElementById('dataInici');
        const inputFi = document.getElementById('dataFi');
        
        if (!inputInici.value || !inputFi.value) {
            const tresMesosEnrere = new Date();
            tresMesosEnrere.setMonth(avui.getMonth() - 3);
            
            inputInici.value = tresMesosEnrere.toISOString().split('T')[0];
            inputFi.value = avui.toISOString().split('T')[0];
        }
        
        actualitzarEstadistiques();
        return;
    } else {
        grupInici.style.display = 'none';
        grupFi.style.display = 'none';
    }

    if (opcio === '1mes') {
        dataInici.setDate(avui.getDate() - 30);
    } else if (opcio === '3mesos') {
        dataInici.setMonth(avui.getMonth() - 3);
    } else if (opcio === '6mesos') {
        dataInici.setMonth(avui.getMonth() - 6);
    } else if (opcio === '1any') {
        dataInici.setFullYear(avui.getFullYear() - 1);
    } else if (opcio === 'tots') {
        dataInici = null;
    }

    if (dataInici) {
        document.getElementById('dataInici').value = dataInici.toISOString().split('T')[0];
        document.getElementById('dataFi').value = avui.toISOString().split('T')[0];
    } else {
        document.getElementById('dataInici').value = '';
        document.getElementById('dataFi').value = '';
    }

    actualitzarEstadistiques();
}

function actualitzarEstadistiques() {
    if (!dadesGlobals || dadesGlobals.length === 0) return;

    const opcioPeriode = document.getElementById('selectPeridiode').value;
    const filtreMedicacio = document.getElementById('selectMedicacio').value;
    const horesPrèvies = parseFloat(document.getElementById('inputHoresPrebies').value) || 8;
    
    const intensitatsSeleccionades = Array.from(document.querySelectorAll('.chkIntensitat:checked')).map(cb => cb.value);
    const totalIntensitats = document.querySelectorAll('.chkIntensitat').length;
    const txtInt = document.getElementById('txtIntensitatSel');
    if (intensitatsSeleccionades.length === totalIntensitats) txtInt.textContent = "Totes les intensitats";
    else if (intensitatsSeleccionades.length === 0) txtInt.textContent = "Cap intensitat";
    else txtInt.textContent = `${intensitatsSeleccionades.length} seleccionades`;

    const tipusSeleccionats = Array.from(document.querySelectorAll('.chkTipus:checked')).map(cb => cb.value);
    const totalTipus = document.querySelectorAll('.chkTipus').length;
    const txtTipus = document.getElementById('txtTipusSel');
    if (tipusSeleccionats.length === totalTipus) txtTipus.textContent = "Tots els tipus";
    else if (tipusSeleccionats.length === 0) txtTipus.textContent = "Cap tipus";
    else txtTipus.textContent = `${tipusSeleccionats.length} seleccionats`;

    document.getElementById('subtitolCorrelacio').textContent = `Aliments o esdeveniments registrats durant les darreres ${horesPrèvies} hores prèvies a cada tipus d'episodi:`;

    let dataIniciVal = document.getElementById('dataInici').value;
    let dataFiVal = document.getElementById('dataFi').value;

    let minDateFiltre = dataIniciVal ? new Date(dataIniciVal) : null;
    let maxDateFiltre = dataFiVal ? new Date(dataFiVal) : new Date();

    const registresFiltrats = dadesGlobals.filter(r => {
        const dataR = new Date(r.data_hora);

        if (opcioPeriode !== 'tots') {
            if (dataIniciVal && dataR < new Date(dataIniciVal)) return false;
            if (dataFiVal) {
                const fiDate = new Date(dataFiVal);
                fiDate.setHours(23, 59, 59, 999);
                if (dataR > fiDate) return false;
            }
        }

        if (r.tipus_registre === 'maldecap') {
            if (filtreMedicacio !== 'tots') {
                if (filtreMedicacio === 'amb' && !r.medicacio) return false;
                if (filtreMedicacio === 'sense' && r.medicacio) return false;
            }
            if (!intensitatsSeleccionades.includes(r.intensitat)) return false;
            if (!tipusSeleccionats.includes(r.valor)) return false;
        }

        return true;
    });

    const malsDeCap = registresFiltrats.filter(r => r.tipus_registre === 'maldecap');

    if (!minDateFiltre && malsDeCap.length > 0) {
        minDateFiltre = new Date(Math.min(...malsDeCap.map(m => new Date(m.data_hora))));
    } else if (!minDateFiltre) {
        minDateFiltre = new Date();
        minDateFiltre.setMonth(minDateFiltre.getMonth() - 1);
    }

    // Càlcul de les targetes destacades adaptades
    actualitzarTargetesDestacadesDinamiques(filtreMedicacio, malsDeCap, minDateFiltre, maxDateFiltre);

    // 1. Formatget per a tipologies
    const comptadorTipologia = {};
    malsDeCap.forEach(r => {
        comptadorTipologia[r.valor] = (comptadorTipologia[r.valor] || 0) + 1;
    });
    renderitzarGraficFormatget('chart-tipologia', comptadorTipologia, 'episodis', 'totalCardTipologia');

    // 2. Formatget per a intensitats
    const comptadorIntensitat = {};
    malsDeCap.forEach(r => {
        if (r.intensitat) {
            comptadorIntensitat[r.intensitat] = (comptadorIntensitat[r.intensitat] || 0) + 1;
        }
    });
    const colorsIntensitat = {
        'Lleuger': '#34d399',
        'Moderat': '#fbbf24',
        'Sever': '#f87171'
    };
    renderitzarGraficFormatget('chart-intensitat', comptadorIntensitat, 'episodis', 'totalCardIntensitat', colorsIntensitat);

    // Evolució temporal
    renderitzarGraficEvolucioContinua('vchart-mesos', malsDeCap, 'mes', minDateFiltre, maxDateFiltre, 'totalMesos');
    renderitzarGraficEvolucioContinua('vchart-setmanes', malsDeCap, 'setmana', minDateFiltre, maxDateFiltre, 'totalSetmanes');
    renderitzarGraficEvolucioContinua('vchart-dies', malsDeCap, 'dia', minDateFiltre, maxDateFiltre, 'totalDies');

    // Dies de la setmana
    const diesSetmana = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
    const comptadorDies = {};
    malsDeCap.forEach(r => {
        const dia = diesSetmana[new Date(r.data_hora).getDay()];
        comptadorDies[dia] = (comptadorDies[dia] || 0) + 1;
    });
    renderitzarGraficBarres('chart-dies', comptadorDies, 'episodis', 'totalCardDies');

    // Franges horàries
    const comptadorHores = { 'Matí (06h - 12h)': 0, 'Migdia (12h - 17h)': 0, 'Tarda (17h - 21h)': 0, 'Nit (21h - 06h)': 0 };
    malsDeCap.forEach(r => {
        const hora = new Date(r.data_hora).getHours();
        if (hora >= 6 && hora < 12) comptadorHores['Matí (06h - 12h)']++;
        else if (hora >= 12 && hora < 17) comptadorHores['Migdia (12h - 17h)']++;
        else if (hora >= 17 && hora < 21) comptadorHores['Tarda (17h - 21h)']++;
        else comptadorHores['Nit (21h - 06h)']++;
    });
    renderitzarGraficBarres('chart-hores', comptadorHores, 'episodis', 'totalCardHores');

    // Mesos acumulats
    const nomsMesos = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
    const comptadorMesos = {};
    malsDeCap.forEach(r => {
        const mes = nomsMesos[new Date(r.data_hora).getMonth()];
        comptadorMesos[mes] = (comptadorMesos[mes] || 0) + 1;
    });
    renderitzarGraficBarres('chart-mesos', comptadorMesos, 'episodis', 'totalCardMesos');

    // Correlacions per tipus
    const containerCorrelacions = document.getElementById('list-correlacions-per-tipus');
    containerCorrelacions.innerHTML = '';
    const tipusUnicsActius = [...new Set(malsDeCap.map(m => m.valor))];

    if (tipusUnicsActius.length === 0) {
        containerCorrelacions.innerHTML = '<em style="font-size:0.9rem; color:var(--text-light);">Sense episodis de mal de cap en aquest període</em>';
        return;
    }

    tipusUnicsActius.forEach(tipus => {
        const malsTipus = malsDeCap.filter(m => m.valor === tipus);
        const comptadorAliments = {};

        malsTipus.forEach(mal => {
            const tMal = new Date(mal.data_hora).getTime();
            dadesGlobals.filter(r => r.tipus_registre === 'esdeveniment').forEach(esd => {
                const tEsd = new Date(esd.data_hora).getTime();
                const hores = (tMal - tEsd) / (1000 * 60 * 60);
                if (hores >= 0 && hores <= horesPrèvies) {
                    comptadorAliments[esd.valor] = (comptadorAliments[esd.valor] || 0) + 1;
                }
            });
        });

        const div = document.createElement('div');
        div.style.background = 'var(--bg)';
        div.style.padding = '14px';
        div.style.borderRadius = '8px';
        div.style.border = '1.5px solid var(--border)';

        div.innerHTML = `<strong style="color:var(--text); font-size:1rem; display:block; margin-bottom:10px;">Tipus: ${tipus} <span style="font-weight:normal; color:var(--text-light); font-size:0.85rem;">(${malsTipus.length} episodis)</span></strong>`;
        
        const subContainer = document.createElement('div');
        subContainer.id = `sub-chart-${tipus.replace(/[^a-zA-Z0-9]/g, '-')}`;
        div.appendChild(subContainer);
        
        containerCorrelacions.appendChild(div);

        renderitzarGraficBarres(subContainer.id, comptadorAliments, 'vegades');
    });
}

function actualitzarTargetesDestacadesDinamiques(filtreMedicacio, malsDeCapFiltrats, dataInici, dataFi) {
    const elTitolActuals = document.getElementById('titolDiesActuals');
    const elValActuals = document.getElementById('txtDiesActuals');
    
    const elTitolMax = document.getElementById('titolMaxDies');
    const elValMax = document.getElementById('txtMaxDies');
    
    const elTitolMitjana = document.getElementById('titolMitjana');
    const elValMitjana = document.getElementById('txtMitjana');

    const iconaCalendari = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#9333ea;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`;
    const iconaRellotge = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const iconaPíndola = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--success);"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`;

    // Textos de títols segons el filtre
    if (filtreMedicacio === 'amb') {
        elTitolActuals.innerHTML = `${iconaCalendari} Quants dies porto sense medicar-me?`;
        elTitolMax.innerHTML = `${iconaRellotge} Quin és el període més llarg sense medicar-me?`;
        elTitolMitjana.innerHTML = `${iconaPíndola} Quina és la mitjana de medicació / mes?`;
    } else if (filtreMedicacio === 'sense') {
        elTitolActuals.innerHTML = `${iconaCalendari} Quants dies porto sense episodis no medicats?`;
        elTitolMax.innerHTML = `${iconaRellotge} Quin és el període més llarg sense episodis no medicats?`;
        elTitolMitjana.innerHTML = `${iconaPíndola} Quina és la mitjana d'episodis sense medicació / mes?`;
    } else {
        elTitolActuals.innerHTML = `${iconaCalendari} Quants dies porto sense mal de cap?`;
        elTitolMax.innerHTML = `${iconaRellotge} Quin és el període més llarg sense mal de cap?`;
        elTitolMitjana.innerHTML = `${iconaPíndola} Quina és la mitjana d'episodis de mal de cap / mes?`;
    }

    // 1. Dies actuals (des del darrer registre global corresponent fins a avui)
    let registresBaseActuals = dadesGlobals.filter(r => r.tipus_registre === 'maldecap');
    if (filtreMedicacio === 'amb') {
        registresBaseActuals = registresBaseActuals.filter(r => r.medicacio);
    } else if (filtreMedicacio === 'sense') {
        registresBaseActuals = registresBaseActuals.filter(r => !r.medicacio);
    }

    if (registresBaseActuals.length === 0) {
        elValActuals.textContent = "Sense registres";
    } else {
        const ordenats = [...registresBaseActuals].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
        const darrerRegistre = new Date(ordenats[ordenats.length - 1].data_hora);
        darrerRegistre.setHours(0, 0, 0, 0);
        
        const avui = new Date();
        avui.setHours(0, 0, 0, 0);
        
        const diffDies = Math.round((avui - darrerRegistre) / (1000 * 60 * 60 * 24));
        elValActuals.textContent = `${Math.max(diffDies, 0)} dies`;
    }

    // 2. Període més llarg de dies nets (consecutius) dins del període temporal seleccionat
    const maxDiesNets = calcularPeriodeMaximDiesNets(malsDeCapFiltrats, dataInici, dataFi);
    elValMax.textContent = `${maxDiesNets} dies`;

    // 3. Mitjana mensual (en funció del període temporal seleccionat)
    const totalRegistresMes = malsDeCapFiltrats.length;
    const diffTempsMS = Math.abs(dataFi - dataInici);
    const totalDies = Math.max(diffTempsMS / (1000 * 60 * 60 * 24), 1);
    const totalMesos = Math.max(totalDies / 30.4375, 1);
    const mitjanaMes = totalRegistresMes / totalMesos;
    
    elValMitjana.textContent = `${mitjanaMes.toFixed(1)} / mes`;
}

// Funció auxiliar ultra-precisa basada en la diferència exacta entre dates i registres
function calcularPeriodeMaximDiesNets(malsDeCapFiltrats, dataInici, dataFi) {
    if (!dataInici || !dataFi) return 0;

    // Ordenem cronològicament els episodis filtrats
    const ordenats = [...malsDeCapFiltrats].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    
    let maxDiesNets = 0;
    
    // Si no hi ha cap episodi en aquest període, tot el rang temporal és una única gran ratxa neta
    const limitInici = new Date(dataInici.getTime());
    limitInici.setHours(0, 0, 0, 0);

    const avui = new Date();
    avui.setHours(0, 0, 0, 0);
    const limitFi = dataFi > avui ? avui : new Date(dataFi.getTime());
    limitFi.setHours(0, 0, 0, 0);

    if (ordenats.length === 0) {
        const diffTotal = Math.round((limitFi - limitInici) / (1000 * 60 * 60 * 24));
        return Math.max(diffTotal, 0);
    }

    // 1. Comprovem el període des de l'inici del filtre fins al primer episodi
    const primerEpisodi = new Date(ordenats[0].data_hora);
    primerEpisodi.setHours(0, 0, 0, 0);
    if (primerEpisodi > limitInici) {
        const diffInici = Math.round((primerEpisodi - limitInici) / (1000 * 60 * 60 * 24));
        if (diffInici > maxDiesNets) maxDiesNets = diffInici;
    }

    // 2. Comprovem els intervals nets entre episodis consecutius dins del període
    for (let i = 0; i < ordenats.length - 1; i++) {
        const d1 = new Date(ordenats[i].data_hora);
        d1.setHours(0, 0, 0, 0);
        const d2 = new Date(ordenats[i + 1].data_hora);
        d2.setHours(0, 0, 0, 0);

        // Els dies nets entre dos episodis és la diferència menys 1 (perquè el dia de l'episodi no compta com a net)
        const diffInterval = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) - 1;
        if (diffInterval > maxDiesNets) {
            maxDiesNets = diffInterval;
        }
    }

    // 3. Comprovem des de l'últim episodi fins avui (o fins al final del límit del filtre)
    const darrerEpisodi = new Date(ordenats[ordenats.length - 1].data_hora);
    darrerEpisodi.setHours(0, 0, 0, 0);
    if (limitFi > darrerEpisodi) {
        const diffFinal = Math.round((limitFi - darrerEpisodi) / (1000 * 60 * 60 * 24));
        if (diffFinal > maxDiesNets) {
            maxDiesNets = diffFinal;
        }
    }

    return Math.max(maxDiesNets, 0);
}

function renderitzarGraficFormatget(containerId, dades, etiqueta, totalElementId, mapaColorsPersonalitzat = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const ordenats = Object.entries(dades).sort((a, b) => b[1] - a[1]);
    let sumaTotal = 0;
    ordenats.forEach(([_, val]) => sumaTotal += val);

    if (totalElementId) {
        const badge = document.getElementById(totalElementId);
        if (badge) badge.textContent = `Total: ${sumaTotal}`;
    }

    if (ordenats.length === 0 || sumaTotal === 0) {
        container.innerHTML = '<em style="font-size:0.9rem; color:var(--text-light); padding: 20px;">Sense dades disponibles</em>';
        return;
    }

    const paletteDefault = ['#2563eb', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399'];

    let svgHtml = `<svg width="140" height="140" viewBox="0 0 42 42" style="transform: rotate(-90deg);">`;
    let acumulat = 0;

    ordenats.forEach(([clau, valor], index) => {
        const percentatge = (valor / sumaTotal) * 100;
        const color = (mapaColorsPersonalitzat && mapaColorsPersonalitzat[clau]) 
            ? mapaColorsPersonalitzat[clau] 
            : paletteDefault[index % paletteDefault.length];
        
        svgHtml += `
            <circle cx="21" cy="21" r="15.9155" fill="transparent" 
                stroke="${color}" stroke-width="5" 
                stroke-dasharray="${percentatge} ${100 - percentatge}" 
                stroke-dashoffset="-${acumulat}">
            </circle>
        `;
        acumulat += percentatge;
    });

    svgHtml += `</svg>`;

    let llegendaHtml = `<div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">`;
    ordenats.forEach(([clau, valor], index) => {
        const color = (mapaColorsPersonalitzat && mapaColorsPersonalitzat[clau]) 
            ? mapaColorsPersonalitzat[clau] 
            : paletteDefault[index % paletteDefault.length];
        const percentatge = ((valor / sumaTotal) * 100).toFixed(1);
        llegendaHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="display: flex; align-items: center; gap: 6px; color: var(--text);">
                    <span style="width: 10px; height: 10px; background: ${color}; border-radius: 50%; display: inline-block;"></span>
                    ${clau}
                </span>
                <span style="color: var(--text-light); font-weight: 600;">${valor} (${percentatge}%)</span>
            </div>
        `;
    });
    llegendaHtml += `</div>`;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%;">
            ${svgHtml}
            ${llegendaHtml}
        </div>
    `;
}

function renderitzarGraficEvolucioContinua(containerId, malsDeCap, tipusAgrupacio, dataInici, dataFi, totalElementId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const mapaValors = {};
    let totalEpisodis = 0;

    malsDeCap.forEach(r => {
        const d = new Date(r.data_hora);
        let clau = '';
        if (tipusAgrupacio === 'mes') {
            clau = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else if (tipusAgrupacio === 'setmana') {
            const target = new Date(d.valueOf());
            const dayNr = (target.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr);
            target.setHours(0, 0, 0, 0);
            clau = target.toISOString().split('T')[0];
        } else if (tipusAgrupacio === 'dia') {
            clau = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        mapaValors[clau] = (mapaValors[clau] || 0) + 1;
        totalEpisodis++;
    });

    const badgeTotal = document.getElementById(totalElementId);
    if (badgeTotal) badgeTotal.textContent = `Total: ${totalEpisodis}`;

    const clausTotals = [];
    let curr = new Date(dataInici.valueOf());
    curr.setHours(0, 0, 0, 0);

    if (tipusAgrupacio === 'mes') {
        curr.setDate(1);
        while (curr <= dataFi) {
            const any = curr.getFullYear();
            const mes = String(curr.getMonth() + 1).padStart(2, '0');
            clausTotals.push(`${any}-${mes}`);
            curr.setMonth(curr.getMonth() + 1);
        }
    } else if (tipusAgrupacio === 'setmana') {
        const dayNr = (curr.getDay() + 6) % 7;
        curr.setDate(curr.getDate() - dayNr);
        while (curr <= dataFi) {
            clausTotals.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 7);
        }
    } else if (tipusAgrupacio === 'dia') {
        while (curr <= dataFi) {
            const any = curr.getFullYear();
            const mes = String(curr.getMonth() + 1).padStart(2, '0');
            const dia = String(curr.getDate()).padStart(2, '0');
            clausTotals.push(`${any}-${mes}-${dia}`);
            curr.setDate(curr.getDate() + 1);
        }
    }

    if (clausTotals.length === 0) {
        container.innerHTML = '<em style="font-size:0.9rem; color:var(--text-light); padding: 10px;">Sense dades temporals disponibles</em>';
        return;
    }

    const maxVal = Math.max(...Object.values(mapaValors), 1);
    const wrapper = document.createElement('div');
    wrapper.className = 'vertical-chart';

    clausTotals.forEach(clau => {
        const count = mapaValors[clau] || 0;
        const alturaPercent = maxVal > 0 ? (count / maxVal) * 100 : 0;
        
        let labelText = '';
        if (tipusAgrupacio === 'mes') {
            const [any, mes] = clau.split('-');
            const nomsMesos = ['Gen', 'Febr', 'Març', 'Abr', 'Maig', 'Juny', 'Jul', 'Ag', 'Set', 'Oct', 'Nov', 'Des'];
            labelText = `${nomsMesos[parseInt(mes) - 1]} ${any}`;
        } else if (tipusAgrupacio === 'setmana') {
            const dSetmana = new Date(clau);
            labelText = `Set ${String(dSetmana.getDate()).padStart(2, '0')}/${String(dSetmana.getMonth() + 1).padStart(2, '0')}`;
        } else if (tipusAgrupacio === 'dia') {
            const [any, mes, dia] = clau.split('-');
            labelText = `${dia}/${mes}`;
        }

        const col = document.createElement('div');
        col.className = 'v-bar-col';
        
        const isZero = count === 0;
        col.innerHTML = `
            <span class="v-bar-val" style="${isZero ? 'color: #94a3b8; font-weight: normal;' : ''}">${count}</span>
            <div class="v-bar ${isZero ? 'zero-bar' : ''}" style="height: ${isZero ? '2px' : Math.max(alturaPercent, 8)}%;" title="${labelText}: ${count} episodis"></div>
            <span class="v-bar-label" title="${labelText}">${labelText}</span>
        `;
        wrapper.appendChild(col);
    });

    container.appendChild(wrapper);
}

function renderitzarGraficBarres(containerId, dades, etiqueta, totalElementId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const ordenats = Object.entries(dades).sort((a, b) => b[1] - a[1]);
    
    let sumaTotal = 0;
    ordenats.forEach(([_, val]) => sumaTotal += val);

    if (totalElementId) {
        const badge = document.getElementById(totalElementId);
        if (badge) badge.textContent = `Total: ${sumaTotal}`;
    }

    if (ordenats.length === 0 || ordenats.every(i => i[1] === 0)) {
        container.innerHTML = '<em style="font-size:0.9rem; color:var(--text-light);">Sense dades disponibles</em>';
        return;
    }

    const maxVal = Math.max(...ordenats.map(i => i[1]), 1);

    const ul = document.createElement('ul');
    ul.className = 'chart-list';

    ordenats.forEach(([clau, valor]) => {
        if (valor > 0) {
            const percentatge = (valor / maxVal) * 100;
            const li = document.createElement('li');
            li.className = 'chart-item';
            li.innerHTML = `
                <div class="chart-info">
                    <span>${clau}</span>
                    <span><strong>${valor}</strong> ${etiqueta}</span>
                </div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${percentatge}%;"></div>
                </div>
            `;
            ul.appendChild(li);
        }
    });

    if (ul.children.length === 0) {
        container.innerHTML = '<em style="font-size:0.9rem; color:var(--text-light);">Sense dades disponibles</em>';
        return;
    }
    container.appendChild(ul);
}