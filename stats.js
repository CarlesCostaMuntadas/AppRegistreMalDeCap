const SUPABASE_URL = "https://rtfhnxjgygwpvtosqjbt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QtYdLnDhZqJ6nJgYWX5I8g_nug6i59_";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dadesGlobals = [];

document.addEventListener("DOMContentLoaded", async () => {
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
    let dataInici = null;

    if (opcio === 'personalitzat') {
        grupInici.style.display = 'flex';
        grupFi.style.display = 'flex';
        return;
    } else {
        grupInici.style.display = 'none';
        grupFi.style.display = 'none';
    }

    if (opcio === '3mesos') {
        dataInici = new Date();
        dataInici.setMonth(avui.getMonth() - 3);
    } else if (opcio === '6mesos') {
        dataInici = new Date();
        dataInici.setMonth(avui.getMonth() - 6);
    } else if (opcio === '1any') {
        dataInici = new Date();
        dataInici.setFullYear(avui.getFullYear() - 1);
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

    calcularPeriodeSenseMedicacio(malsDeCap);
    calcularDiesActualsSenseMedicacio();
    calcularMitjanaMedicacioPerMes(malsDeCap, minDateFiltre, maxDateFiltre);

    // 1. Formatget per a tipologies
    const comptadorTipologia = {};
    malsDeCap.forEach(r => {
        comptadorTipologia[r.valor] = (comptadorTipologia[r.valor] || 0) + 1;
    });
    renderitzarGraficFormatget('chart-tipologia', comptadorTipologia, 'episodis', 'totalCardTipologia');

    // 2. Formatget per a intensitats (amb colors personalitzats)
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
        div.style.border = '1px solid var(--border)';

        div.innerHTML = `<strong style="color:var(--text); font-size:1rem; display:block; margin-bottom:10px;">Tipus: ${tipus} <span style="font-weight:normal; color:var(--text-light); font-size:0.85rem;">(${malsTipus.length} episodis)</span></strong>`;
        
        const subContainer = document.createElement('div');
        subContainer.id = `sub-chart-${tipus.replace(/[^a-zA-Z0-9]/g, '-')}`;
        div.appendChild(subContainer);
        
        containerCorrelacions.appendChild(div);

        renderitzarGraficBarres(subContainer.id, comptadorAliments, 'vegades');
    });
}

function calcularPeriodeSenseMedicacio(malsDeCap) {
    const element = document.getElementById('txtMaxDiesSenseMed');
    if (!malsDeCap || malsDeCap.length === 0) {
        element.textContent = "0 dies";
        return;
    }

    const ordenats = [...malsDeCap].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    let maxDies = 0;
    let ultimCopMedicacio = null;

    ordenats.forEach(r => {
        const dataEpisodi = new Date(r.data_hora);
        if (r.medicacio) {
            if (ultimCopMedicacio) {
                const diffDies = Math.floor((dataEpisodi - ultimCopMedicacio) / (1000 * 60 * 60 * 24));
                if (diffDies > maxDies) maxDies = diffDies;
            }
            ultimCopMedicacio = dataEpisodi;
        }
    });

    element.textContent = maxDies > 0 ? `${maxDies} dies` : "Cap període registrat";
}

function calcularDiesActualsSenseMedicacio() {
    const element = document.getElementById('txtDiesActualsSenseMed');
    if (!element) return;

    const malsDeCap = dadesGlobals.filter(r => r.tipus_registre === 'maldecap');
    if (malsDeCap.length === 0) {
        element.textContent = "0 dies";
        return;
    }

    const ordenats = [...malsDeCap].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    let darrerCopMedicacio = null;

    ordenats.forEach(r => {
        if (r.medicacio) {
            darrerCopMedicacio = new Date(r.data_hora);
        }
    });

    if (!darrerCopMedicacio) {
        element.textContent = "Sense medicació";
        return;
    }

    const avui = new Date();
    const diffDies = Math.floor((avui - darrerCopMedicacio) / (1000 * 60 * 60 * 24));
    element.textContent = `${Math.max(diffDies, 0)} dies`;
}

function calcularMitjanaMedicacioPerMes(malsDeCap, dataInici, dataFi) {
    const element = document.getElementById('txtMitjanaMedicacio');
    if (!element) return;

    const totalMedicacions = malsDeCap.filter(r => r.medicacio).length;
    
    const diffTempsMS = Math.abs(dataFi - dataInici);
    const totalDies = Math.max(diffTempsMS / (1000 * 60 * 60 * 24), 1);
    
    const totalMesos = Math.max(totalDies / 30.4375, 1);

    const mitjanaMes = totalMedicacions / totalMesos;
    element.textContent = `${mitjanaMes.toFixed(1)} / mes`;
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