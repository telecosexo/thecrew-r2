

/**
 * =============================================================================
 * CONSTANTES GLOBAIS E DADOS
 * =============================================================================
 */
const CONFIG = {
    WEBHOOKS: {
        ACOES: "https://discord.com/api/webhooks/1496241058194133075/wbaI07JmuEBc-XkKO2vBp2DwG-Hmw8uKucZNCR_83J9CITDsypTxw0plzozoEkntKuos",
        VENDAS: "https://discord.com/api/webhooks/1496239305797140582/PVz0WCMlUBLmdI20DfVWQD3USrklnMVk1eol1Na_Dx7ubltyXlp6QuIdLAfd-Iy5uNzx",
        LOGS_VENDAS: "https://discord.com/api/webhooks/1496254478205063432/rw6jLuXLwlqvHnkDLv9UeB9pSU2-eITSVSjV_8zwV03Gk8mf-8sM-QMUGnigAUbinOf4"
    },
    MAT_NAMES: ["Anfetamina", "Comprimidos", "Reagente", "Ziplock"],
    MAT_WEIGHTS: [0.28, 0.28, 0.28, 0.01]
};

const CATALOG = {
    'Meta': { name: "Meta", category: "Droga", price: { min: 100, max: 130 }, weight: 0.15, cost: 0, recipe: [4, 4, 4], baseYield: 4, metaPerZiplock: 5, ziplockNeeded: 5, buffer: 2 }
};

/**
 * =============================================================================
 * APLICAÇÃO PRINCIPAL
 * =============================================================================
 */
const app = {
    state: {
        participants: new Set(),
        cart: [],
        selectedItemId: null,
        globalPriceType: 'max',
        tutorialActive: false,
        tutorialStepIndex: 0,
        isAdmin: false
    },
    dom: {},

    init() {
        this.cacheDOM();
        this.setDefaults();
        this.renderCatalog();
    },

    cacheDOM() {
        const ids = [
            'acao-tipo', 'acao-data', 'acao-hora', 'novo-participante', 'lista-participantes',
            'venda-vendedor', 'venda-faccao', 'venda-data', 'venda-hora', 'venda-preco', 'venda-qtd',
            'sales-catalog', 'price-controls', 'select-msg', 'cart-items', 'cart-summary-area',
            'cart-production-area', 'mats-list-display', 'sales-production-details',
            'total-mat-weight-display', 'total-prod-weight-display',
            'toast-container',
            'tutorial-box', 'tut-title', 'tut-text', 'tut-progress', 'btn-tut-prev',
            'stat-total-vendas', 'stat-faturamento', 'stat-total-itens', 'stats-top-itens', 'stat-total-bruto',
            'filtro-inicio', 'filtro-fim'
        ];
        ids.forEach(id => this.dom[id] = document.getElementById(id));
    },

    setDefaults() {
        const now = new Date();
        const dateStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' 
        }).format(now);
        
        const timeStr = new Intl.DateTimeFormat('pt-BR', { 
            timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false
        }).format(now);

        ['acao', 'venda'].forEach(prefix => {
            const d = document.getElementById(`${prefix}-data`);
            const t = document.getElementById(`${prefix}-hora`);
            if (d) d.value = dateStr;
            if (t) t.value = timeStr;
        });

        const firstDayStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' 
        }).format(new Date(now.getFullYear(), now.getMonth(), 1));

        if (this.dom['filtro-inicio']) this.dom['filtro-inicio'].value = firstDayStr;
        if (this.dom['filtro-fim']) this.dom['filtro-fim'].value = dateStr;
    },

    switchTab(tabId, event) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        if (event) event.currentTarget.classList.add('active');
        
    },

    toggleAdmin() {
        if (this.state.isAdmin) return;
        this.state.isAdmin = true;
        this.showToast("🔓 Modo Admin Ativado!");
    },

    copyAdText(el) {
        navigator.clipboard.writeText(el.innerText).then(() => this.showToast("Copiado!"));
    },

    showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerText = msg;
        this.dom['toast-container'].appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },

    formatDate(d) {
        if (!d) return '';
        const [y, m, d2] = d.split('-');
        return `${d2}/${m}/${y}`;
    },

    renderCatalog() {
        const grouped = {};
        const categories = ["Droga"];
        
        if (!grouped["Droga"]) grouped["Droga"] = [];
        Object.entries(CATALOG).forEach(([id, item]) => {
            grouped["Droga"].push({ ...item, id });
        });

        let htmlBuffer = '';
        categories.forEach(cat => {
            if (grouped[cat]) {
                htmlBuffer += `<div class="catalog-category-title collapsed" onclick="app.toggleCategory(this)">${cat}</div><div class="grid-list-small hidden">`;
                grouped[cat].forEach(item => {
                    htmlBuffer += `
                    <div class="catalog-item" data-id="${item.id}" onclick="app.selectItem('${item.id}')">
                        <div class="cat-name">${item.name}</div>
                        <div class="cat-prices">
                            <span class="price-tag min">R$ ${item.price.min / 1000}k</span>
                            <span class="price-separator">|</span>
                            <span class="price-tag max">R$ ${item.price.max / 1000}k</span>
                        </div>
                    </div>`;
                });
                htmlBuffer += `</div>`;
            }
        });
        
        const el = this.dom['sales-catalog'];
        if (el) el.innerHTML = htmlBuffer;
    },

    toggleCategory(el) {
        el.classList.toggle('collapsed');
        const content = el.nextElementSibling;
        if (content) content.classList.toggle('hidden');
    },

    selectItem(id) {
        this.state.selectedItemId = id;
        document.querySelectorAll('.catalog-item').forEach(el => el.classList.remove('selected'));
        const el = document.querySelector(`.catalog-item[data-id="${id}"]`);
        if (el) el.classList.add('selected');
        
        this.dom['price-controls'].classList.remove('hidden-controls');
        this.dom['select-msg'].style.display = 'none';
        this.dom['venda-preco'].value = CATALOG[id].price[this.state.globalPriceType];
        this.dom['venda-qtd'].value = 1;
    },

    updateGlobalPriceType(type) {
        this.state.globalPriceType = type;
        const typeName = type === 'min' ? 'Parceria' : 'Pista';
        
        if (this.state.selectedItemId) {
            this.dom['venda-preco'].value = CATALOG[this.state.selectedItemId].price[type];
        }
        
        if (this.state.cart.length > 0) {
            this.state.cart.forEach(item => {
                item.price = CATALOG[item.id].price[type];
                item.total = item.price * item.qtd;
            });
            this.renderCart();
            if (!this.dom['cart-production-area'].classList.contains('hidden')) {
                this.calculateCartProduction();
            }
            this.showToast(`Preços atualizados para ${typeName}`);
        }
    },

    validateInput(el) {
        let val = parseInt(el.value);
        if (isNaN(val) || val < 1) el.value = 1;
    },

    adjustSalesQtd(n) {
        const el = this.dom['venda-qtd'];
        let val = parseInt(el.value) || 1;
        val += n;
        if (val < 1) val = 1;
        el.value = val;
    },

    addToCart() {
        const id = this.state.selectedItemId;
        if (!id) return this.showToast('Selecione uma arma', 'error');
        
        const price = parseFloat(this.dom['venda-preco'].value) || 0;
        const qtd = parseInt(this.dom['venda-qtd'].value) || 1;
        
        if (price === 0) return this.showToast('Preço inválido', 'error');
        
        const item = CATALOG[id];
        this.state.cart.push({
            id: id,
            name: item.name,
            price: price,
            qtd: qtd,
            total: price * qtd,
            weight: item.weight,
            cost: item.cost,
            recipe: item.recipe
        });
        
        this.renderCart();
        this.showToast('Item adicionado!');
        this.dom['cart-production-area'].classList.add('hidden');
    },

    adjustCartQtd(idx, n) {
        const item = this.state.cart[idx];
        if (item.qtd + n < 1) return;
        item.qtd += n;
        item.total = item.price * item.qtd;
        this.renderCart();
        if (!this.dom['cart-production-area'].classList.contains('hidden')) {
            this.calculateCartProduction();
        }
    },

    removeFromCart(idx) {
        this.state.cart.splice(idx, 1);
        this.renderCart();
        this.dom['cart-production-area'].classList.add('hidden');
    },

    clearCart() {
        this.state.cart = [];
        this.renderCart();
        this.dom['cart-production-area'].classList.add('hidden');
    },

    renderCart() {
        const container = this.dom['cart-items'];
        if (this.state.cart.length === 0) {
            container.innerHTML = '<p class="empty-msg">Carrinho vazio</p>';
            this.dom['cart-summary-area'].innerHTML = '';
            return;
        }

        let html = '', grandTotal = 0, totalProdCost = 0;
        this.state.cart.forEach((item, idx) => {
            grandTotal += item.total;
            totalProdCost += (item.cost * item.qtd);
            html += `
            <div class="cart-item">
                <div class="cart-item-title">${item.name} <span class="badge-count-small">x${item.qtd}</span></div>
                <div class="cart-controls-row">
                    <div class="qty-selector-sm">
                        <button class="btn-qty-sm" onclick="app.adjustCartQtd(${idx}, -1)">-</button>
                        <span class="qty-display-sm">${item.qtd}</span>
                        <button class="btn-qty-sm" onclick="app.adjustCartQtd(${idx}, 1)">+</button>
                    </div>
                    <div class="cart-item-price">R$ ${item.total.toLocaleString('pt-BR')}</div>
                </div>
                <div class="btn-remove-item" onclick="app.removeFromCart(${idx})">&times;</div>
            </div>`;
        });

        container.innerHTML = html;
        
        // --- NOVA MATEMÁTICA: ABATE O CUSTO PRIMEIRO E DIVIDE O LUCRO ---
        const lucroLiquido = grandTotal - totalProdCost;
        const valorVendedor = lucroLiquido * 0.40; // 40% para o vendedor
        const faccaoNet = lucroLiquido * 0.60;     // 60% para a facção

        this.dom['cart-summary-area'].innerHTML = `
        <div class="cart-summary-box">
            <div class="summary-total">💸 Total: R$ ${grandTotal.toLocaleString('pt-BR')}</div>
            <div class="summary-seller">💰 Vendedor (40% do Lucro): R$ ${valorVendedor.toLocaleString('pt-BR')}</div>
            <div class="summary-faction">🔥 Facção (60% do Lucro): R$ ${faccaoNet.toLocaleString('pt-BR')}</div>
        </div>`;
    },

    calculateCartProduction() {
        if (this.state.cart.length === 0) return this.showToast('Carrinho vazio!', 'error');
        
        let totals = [0, 0, 0], totalMatWeight = 0, totalProdWeight = 0, detailsHTML = "";
        const FIXO = { materialsPerBatch: 4, crystalsPerBatch: 4, crystalsPerProcess: 5, ziplockPerProcess: 5, metaPerProcess: 10, buffer: 2 };

        this.state.cart.forEach(item => {
            const sellQtd = item.qtd;
            const matPerBatch = item.recipe[0];
            
            const processes = Math.ceil(sellQtd / FIXO.metaPerProcess);
            const crystals = processes * FIXO.crystalsPerProcess + FIXO.buffer;
            const matBatches = Math.ceil(crystals / FIXO.crystalsPerBatch);
            
            const mat0 = matBatches * matPerBatch;
            const mat1 = matBatches * matPerBatch;
            const mat2 = matBatches * matPerBatch;
            const ziplocks = processes * FIXO.ziplockPerProcess;
            
            totals[0] += mat0;
            totals[1] += mat1;
            totals[2] += mat2;
            totals[3] = (totals[3] || 0) + ziplocks;
            
            totalMatWeight += (mat0 + mat1 + mat2) * CONFIG.MAT_WEIGHTS[0] + ziplocks * CONFIG.MAT_WEIGHTS[3];
            totalProdWeight += sellQtd * item.weight;
            
            const crystalsProduced = matBatches * FIXO.crystalsPerBatch;
            const metaProduced = crystalsProduced / FIXO.crystalsPerProcess * FIXO.metaPerProcess;
            
            let itemMatsHTML = '';
            if (mat0) itemMatsHTML += `<div class="mat-item-tiny"><span>${CONFIG.MAT_NAMES[0]}:</span> <b>${mat0}</b></div>`;
            if (mat1) itemMatsHTML += `<div class="mat-item-tiny"><span>${CONFIG.MAT_NAMES[1]}:</span> <b>${mat1}</b></div>`;
            if (mat2) itemMatsHTML += `<div class="mat-item-tiny"><span>${CONFIG.MAT_NAMES[2]}:</span> <b>${mat2}</b></div>`;
            itemMatsHTML += `<div class="mat-item-tiny"><span>Ziplock:</span> <b>${ziplocks}</b></div>`;
            itemMatsHTML += `<div class="mat-item-tiny"><span>Cristais:</span> <b>${crystalsProduced}</b></div>`;
            itemMatsHTML += `<div class="mat-item-tiny"><span>Meta:</span> <b>${Math.floor(metaProduced)}</b></div>`;
            
            detailsHTML += `
            <div class="detail-card-small">
                <div class="detail-header-small"><span class="detail-name">${item.name}</span><span class="badge-count-small">x${sellQtd} venda</span></div>
                <div class="mats-grid-small">${itemMatsHTML}</div>
            </div>`;
        });

        let matsHtml = '';
        totals.forEach((t, i) => {
            if (t > 0) matsHtml += `<div class="mat-tag-pill"><span>${CONFIG.MAT_NAMES[i]}:</span> <b>${t}</b></div>`;
        });

        this.dom['mats-list-display'].innerHTML = matsHtml;
        this.dom['sales-production-details'].innerHTML = detailsHTML;
        this.dom['total-mat-weight-display'].innerText = totalMatWeight.toFixed(2).replace('.', ',') + ' kg';
        this.dom['total-prod-weight-display'].innerText = totalProdWeight.toFixed(2).replace('.', ',') + ' kg';

        const area = this.dom['cart-production-area'];
        area.classList.remove('hidden');
        area.scrollIntoView({ behavior: 'smooth' });
    },

    closeProduction() {
        this.dom['cart-production-area'].classList.add('hidden');
    },

    addParticipant() {
        const val = this.dom['novo-participante'].value.trim();
        if (!val) return;
        if (this.state.participants.has(val)) return;
        this.state.participants.add(val);
        this.renderParticipants();
        this.dom['novo-participante'].value = "";
    },
    removeParticipant(val) {
        this.state.participants.delete(val);
        this.renderParticipants();
    },
    renderParticipants() {
        let html = '';
        this.state.participants.forEach(p => html += `<div class="chip">${p} <span onclick="app.removeParticipant('${p}')">&times;</span></div>`);
        this.dom['lista-participantes'].innerHTML = html;
    },
    handleEnterParticipant(e) {
        if (e.key === 'Enter') this.addParticipant();
    },

    async sendWebhook(url, payload, msg, cb) {
        try {
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (msg) this.showToast(msg);
            if (cb) cb();
        } catch (e) {
            console.error(e);
            this.showToast("Erro de conexão", "error");
        }
    },

    sendActionWebhook() {
        const tipo = this.dom['acao-tipo'].value;
        if (!tipo) return this.showToast("Selecione o local", "error");

        const resultado = document.querySelector('input[name="resultado"]:checked')?.value;
        if (!resultado) return this.showToast("Selecione o resultado", "error");

        const dataF = this.formatDate(this.dom['acao-data'].value);
        const hora = this.dom['acao-hora'].value;
        const parts = Array.from(this.state.participants).join('\n> • ');
        const color = resultado === 'Vitória' ? 3066993 : 15158332;

        const embedMainAcao = {
            username: "IceHelper",
            embeds: [{
                title: `⚔️ Registro de Ação: ${tipo}`,
                color: color,
                fields: [
                    { name: "Resultado", value: `**${resultado.toUpperCase()}**`, inline: true },
                    { name: "Motivo", value: "Ação Blipada", inline: true },
                    { name: "Data/Hora", value: `${dataF} às ${hora}`, inline: false },
                    { name: "Participantes", value: parts ? `> • ${parts}` : "> Ninguém registrado" }
                ]
            }]
        };

        // 1. Envio Principal
        this.sendWebhook(CONFIG.WEBHOOKS.ACOES, embedMainAcao, "Ação registrada!", () => {
            this.state.participants.clear();
            this.renderParticipants();
        });

        // 2. Envio Log Resumido
        if (CONFIG.WEBHOOKS.LOGS_ACOES) {
            const embedLogAcao = {
                username: "Ice Log",
                embeds: [{
                    color: color,
                    description: `**Ação:** ${tipo}\n**Data:** ${dataF}\n**Hora:** ${hora}\n**Motivo:** Ação Blipada\n**Resultado:** ${resultado}`
                }]
            };
            this.sendWebhook(CONFIG.WEBHOOKS.LOGS_ACOES, embedLogAcao);
        }
    },

    async sendSaleWebhook() {
        if (this.state.cart.length === 0) return this.showToast('Carrinho vazio!', 'error');
        
        const dataInput = this.dom['venda-data'].value;
        const horaInput = this.dom['venda-hora'].value;
        
        const totalVenda = this.state.cart.reduce((a, b) => a + b.total, 0);
        const custoTotal = this.state.cart.reduce((acc, item) => acc + (item.cost * item.qtd), 0);
        
        const lucroLiquidoTotal = totalVenda - custoTotal;
        const valorVendedor = lucroLiquidoTotal * 0.40;
        const lucroFaccao = lucroLiquidoTotal * 0.60;

        const vendaData = {
            vendedor: this.dom['venda-vendedor'].value,
            faccao: this.dom['venda-faccao'].value,
            itens: this.state.cart,
            data: new Date(`${dataInput}T${horaInput}`),
            total: totalVenda,
            lucroFaccao: lucroFaccao,
            custoProducao: custoTotal
        };

        this.showToast("Venda registrada!");
        this.clearCart();

        // --- LAYOUT DO DISCORD ---
        const itensFormatados = vendaData.itens.map(i => `• ${i.name} — ${i.qtd}x — R$ ${i.total.toLocaleString('pt-BR')}`).join('\n');

        const embedVenda = {
            username: "IceHelper",
            embeds: [{
                title: "📄 Venda Registrada",
                color: 5644438,
                fields: [
                    { name: "💼 Vendedor", value: vendaData.vendedor, inline: true },
                    { name: "🏛️ Facção Compradora", value: vendaData.faccao, inline: true },
                    { name: "📦 Itens", value: itensFormatados, inline: false },
                    { name: "💸 Total Venda", value: `R$ ${vendaData.total.toLocaleString('pt-BR')}`, inline: true },
                    { name: "🔨 Custo Produção", value: `R$ ${vendaData.custoProducao.toLocaleString('pt-BR')}`, inline: true },
                    { name: "💰 Vendedor (40% Lucro)", value: `R$ ${valorVendedor.toLocaleString('pt-BR')}`, inline: true },
                    { name: "🔥 Facção (Liq.)", value: `**R$ ${vendaData.lucroFaccao.toLocaleString('pt-BR')}**`, inline: false }
                ],
                footer: { text: `Data: ${this.formatDate(dataInput)} às ${horaInput}` }
            }]
        };

        // 1. Envio Principal
        this.sendWebhook(CONFIG.WEBHOOKS.VENDAS, embedVenda);
        
        // 2. Envio Log Resumido
        if (CONFIG.WEBHOOKS.LOGS_VENDAS) {
            const itensList = vendaData.itens.map(i => `• ${i.name} (${i.qtd}x)`).join('\n');
            const dataFormatada = this.formatDate(dataInput);
            
            const embedLogVenda = {
                username: "Ice Log",
                embeds: [{
                    color: 5644438,
                    description: `**Comprador:** ${vendaData.faccao}\n**Produtos:**\n${itensList}\n**Data:** ${dataFormatada}\n**Horário:** ${horaInput}`
                }]
            };
            this.sendWebhook(CONFIG.WEBHOOKS.LOGS_VENDAS, embedLogVenda);
        }
    }, 

    

    getTutorialSteps() {
        return [
            { tab: 'vendas', elementId: 'area-vendedor-info', title: "1. Identificação", text: "Comece preenchendo o seu nome e a facção do cliente." },
            { tab: 'vendas', elementId: 'area-tabela-preco', title: "2. Tabela de Preços", text: "Escolha entre preço de <b>Parceria</b> ou <b>Pista</b>. O sistema atualiza os valores automaticamente." },
            { tab: 'vendas', elementId: 'sales-catalog', title: "3. Catálogo", text: "Clique nos itens para selecionar. Defina a quantidade e adicione ao carrinho." },
            { tab: 'vendas', elementId: 'area-carrinho', title: "4. Carrinho & Envio", text: "Revise os itens e clique em <b>Finalizar</b> para enviar o log para o Discord." },
            { tab: 'vendas', elementId: 'area-producao', title: "5. Calculadora de Produção", text: "Descubra exatamente quantos materiais (cobre, alumínio, etc.) você precisa para fabricar o pedido." },
            { tab: 'acoes', elementId: 'acoes', title: "6. Registro de Ações", text: "Registre vitórias ou derrotas em PvP e ações da facção." },
            { tab: 'vendas', elementId: 'btn-admin-secret', title: "7. Modo Admin", text: "Clique em <b>Sistema Online</b> para revelar a aba secreta de <b>Estatísticas</b>." }
        ];
    },

    startTutorial() {
        this.state.tutorialActive = true;
        this.state.tutorialStepIndex = 0;
        this.dom['tutorial-box'].classList.remove('hidden');
        this.renderTutorialStep();
    },

    endTutorial() {
        this.state.tutorialActive = false;
        this.dom['tutorial-box'].classList.add('hidden');
        this.cleanHighlights();
    },

    cleanHighlights() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        document.querySelectorAll('.tutorial-active-parent').forEach(el => el.classList.remove('tutorial-active-parent'));
    },

    prevTutorialStep() {
        if (this.state.tutorialStepIndex > 0) {
            this.cleanHighlights();
            this.state.tutorialStepIndex--;
            this.renderTutorialStep();
        }
    },

    nextTutorialStep() {
        const s = this.getTutorialSteps();
        this.cleanHighlights();
        this.state.tutorialStepIndex++;
        if (this.state.tutorialStepIndex >= s.length) {
            this.endTutorial();
            this.showToast("Fim!");
        } else {
            this.renderTutorialStep();
        }
    },

    renderTutorialStep() {
        const s = this.getTutorialSteps();
        const step = s[this.state.tutorialStepIndex];

        this.switchTab(step.tab);

        this.dom['tut-title'].innerText = step.title;
        this.dom['tut-text'].innerHTML = step.text;
        this.dom['tut-progress'].innerText = `${this.state.tutorialStepIndex + 1}/${s.length}`;
        this.dom['btn-tut-prev'].disabled = (this.state.tutorialStepIndex === 0);

        setTimeout(() => {
            const el = document.getElementById(step.elementId);
            if (el) {
                el.classList.add('tutorial-highlight');
                const p = el.closest('.card');
                if (p) p.classList.add('tutorial-active-parent');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 400);
    },

    };

document.addEventListener('DOMContentLoaded', () => app.init());
