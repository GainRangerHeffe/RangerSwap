// RangerSwap Token Manager (admin.html)
// Standalone editor for CHAINS/TOKEN_LISTS -- lets you upload a token icon (resized and
// stored inline as a base64 PNG, no separate image file needed), then export a fresh
// tokens-data.js to drop into the project. Everything here only touches this browser
// tab's memory + localStorage until you click Export.

const STORAGE_KEY = 'rangerswap_admin_state';

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

// tokens-data.js (loaded via <script> before this file) provides these globals.
let state = {
    CHAINS: deepClone(CHAINS),
    TOKEN_LISTS: deepClone(TOKEN_LISTS),
    RANGER_FEE_RECIPIENT: typeof RANGER_FEE_RECIPIENT !== 'undefined' ? RANGER_FEE_RECIPIENT : '0x...',
    RANGER_FEE_BPS: typeof RANGER_FEE_BPS !== 'undefined' ? RANGER_FEE_BPS : 25,
    ZEROX_API_KEY: typeof ZEROX_API_KEY !== 'undefined' ? ZEROX_API_KEY : ''
};
const originalState = deepClone(state); // what tokens-data.js had when this page opened

let editing = null; // { chainId, address, previousLogo } while editing an existing token
let selectedCategory = 'top';
let pendingLogoDataUrl = null;

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) state = JSON.parse(raw);
    } catch (error) {
        console.error('Failed to load saved admin session, starting from tokens-data.js instead:', error);
    }
}

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function populateChainSelects() {
    const options = Object.keys(state.CHAINS)
        .map(id => `<option value="${id}">${escapeHtml(state.CHAINS[id].name)}</option>`)
        .join('');
    document.getElementById('tokenChain').innerHTML = options;
    document.getElementById('listChainFilter').innerHTML = options;
}

function truncateAddress(address) {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function renderTokenList(chainId) {
    const container = document.getElementById('tokenManageList');
    const tokens = state.TOKEN_LISTS[chainId] || [];

    if (tokens.length === 0) {
        container.innerHTML = '<div class="admin-empty">No tokens for this chain yet -- add one on the left.</div>';
        return;
    }

    container.innerHTML = tokens.map(token => `
        <div class="token-manage-row">
            <div class="token-manage-thumb">
                <img src="${escapeHtml(token.logo || '')}" alt="${escapeHtml(token.symbol)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <span style="display:none;">${escapeHtml(token.fallbackLogo || '❔')}</span>
            </div>
            <div class="token-manage-info">
                <h4>${escapeHtml(token.symbol)} <span style="color:var(--text-muted); font-weight:400;">${escapeHtml(token.name)}</span></h4>
                <p title="${escapeHtml(token.address)}">${escapeHtml(truncateAddress(token.address))}</p>
            </div>
            <span class="token-manage-badge ${token.category === 'meme' ? 'meme' : 'top'}">${escapeHtml(token.category || 'top')}</span>
            <div class="token-manage-actions">
                <button type="button" class="icon-btn" data-action="edit" data-address="${escapeHtml(token.address)}" title="Edit">✎</button>
                <button type="button" class="icon-btn danger" data-action="delete" data-address="${escapeHtml(token.address)}" title="Delete">🗑</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => editToken(chainId, btn.dataset.address));
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', () => deleteToken(chainId, btn.dataset.address));
    });
}

function setCategoryUI(category) {
    selectedCategory = category;
    document.querySelectorAll('.category-toggle button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
}

function resetForm() {
    editing = null;
    pendingLogoDataUrl = null;
    document.getElementById('tokenForm').reset();
    document.getElementById('tokenDecimals').value = 18;
    setCategoryUI('top');
    document.getElementById('uploadPreview').innerHTML = '🖼️';
    document.getElementById('formTitle').textContent = 'Add Token';
    document.getElementById('saveTokenBtn').textContent = 'Add Token';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

function editToken(chainId, address) {
    const token = (state.TOKEN_LISTS[chainId] || []).find(t => t.address.toLowerCase() === address.toLowerCase());
    if (!token) return;

    editing = { chainId, address: token.address, previousLogo: token.logo };
    pendingLogoDataUrl = null;

    document.getElementById('tokenChain').value = chainId;
    document.getElementById('tokenSymbol').value = token.symbol;
    document.getElementById('tokenName').value = token.name;
    document.getElementById('tokenAddress').value = token.address;
    document.getElementById('tokenDecimals').value = token.decimals;
    document.getElementById('tokenCoingeckoId').value = token.coingeckoId || '';
    document.getElementById('tokenFallback').value = token.fallbackLogo || '';
    setCategoryUI(token.category === 'meme' ? 'meme' : 'top');

    const preview = document.getElementById('uploadPreview');
    preview.innerHTML = `<img src="${escapeHtml(token.logo || '')}" alt="${escapeHtml(token.symbol)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span style="display:none;">${escapeHtml(token.fallbackLogo || '❔')}</span>`;

    document.getElementById('formTitle').textContent = `Edit ${token.symbol}`;
    document.getElementById('saveTokenBtn').textContent = 'Save Changes';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
    document.getElementById('tokenForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteToken(chainId, address) {
    const list = state.TOKEN_LISTS[chainId] || [];
    const idx = list.findIndex(t => t.address.toLowerCase() === address.toLowerCase());
    if (idx === -1) return;
    if (!confirm(`Remove ${list[idx].symbol} from this chain's token list?`)) return;

    list.splice(idx, 1);
    persist();
    renderTokenList(chainId);

    if (editing && editing.chainId === chainId && editing.address.toLowerCase() === address.toLowerCase()) {
        resetForm();
    }
}

function saveToken() {
    const chainId = document.getElementById('tokenChain').value;
    const symbol = document.getElementById('tokenSymbol').value.trim();
    const name = document.getElementById('tokenName').value.trim();
    const address = document.getElementById('tokenAddress').value.trim();
    const decimals = parseInt(document.getElementById('tokenDecimals').value, 10);
    const coingeckoId = document.getElementById('tokenCoingeckoId').value.trim();
    const fallbackLogo = document.getElementById('tokenFallback').value.trim()
        || (selectedCategory === 'meme' ? '🐸' : '💠');

    if (!symbol || !name || !address) {
        alert('Symbol, name, and contract address are required.');
        return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        alert("That doesn't look like a valid contract address (expected 0x followed by 40 hex characters). Double-check it on the chain's block explorer.");
        return;
    }
    if (Number.isNaN(decimals) || decimals < 0 || decimals > 18) {
        alert('Decimals must be a whole number between 0 and 18.');
        return;
    }

    if (!state.TOKEN_LISTS[chainId]) state.TOKEN_LISTS[chainId] = [];

    if (editing) {
        const oldList = state.TOKEN_LISTS[editing.chainId] || [];
        const oldIdx = oldList.findIndex(t => t.address.toLowerCase() === editing.address.toLowerCase());
        if (oldIdx !== -1) oldList.splice(oldIdx, 1);
    }

    const duplicate = state.TOKEN_LISTS[chainId].some(t => t.address.toLowerCase() === address.toLowerCase());
    if (duplicate) {
        alert('A token with that address already exists on this chain.');
        return;
    }

    const token = {
        symbol,
        name,
        address,
        decimals,
        logo: pendingLogoDataUrl || (editing ? editing.previousLogo : `./images/tokens/${symbol.toLowerCase()}.png`),
        fallbackLogo,
        category: selectedCategory
    };
    if (coingeckoId) token.coingeckoId = coingeckoId;

    state.TOKEN_LISTS[chainId].push(token);
    persist();

    document.getElementById('listChainFilter').value = chainId;
    renderTokenList(chainId);
    resetForm();
}

// --- Image upload: resize to a fixed square PNG and inline it as a data URI ---
function resizeImageToDataUrl(file, size) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error('Could not read file'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('That file is not a readable image'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const scale = Math.min(size / img.width, size / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

async function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please choose an image file (PNG, JPG, SVG, etc.).');
        return;
    }
    try {
        pendingLogoDataUrl = await resizeImageToDataUrl(file, 128);
        document.getElementById('uploadPreview').innerHTML = `<img src="${pendingLogoDataUrl}" alt="preview">`;
    } catch (error) {
        console.error(error);
        alert('Could not read that image: ' + error.message);
    }
}

// --- Export / Import ---
function buildTokensDataFile() {
    return `// Shared chain + token configuration for RangerSwap.
// Regenerated by admin.html on ${new Date().toISOString()}.
// NOTE: hand-written comments/TODOs from the original tokens-data.js are not preserved
// by this export -- double-check CHAINS placeholders (router/factory addresses, RPC
// URLs, fee recipient, API keys) are still what you expect before shipping this file.

const RANGER_FEE_RECIPIENT = ${JSON.stringify(state.RANGER_FEE_RECIPIENT)};
const RANGER_FEE_BPS = ${JSON.stringify(state.RANGER_FEE_BPS)};
const ZEROX_API_KEY = ${JSON.stringify(state.ZEROX_API_KEY)};

const CHAINS = ${JSON.stringify(state.CHAINS, null, 4)};

const TOKEN_LISTS = ${JSON.stringify(state.TOKEN_LISTS, null, 4)};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHAINS, TOKEN_LISTS };
}
`;
}

function exportTokensDataFile() {
    const blob = new Blob([buildTokensDataFile()], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tokens-data.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Loading a previously-exported (or hand-edited) tokens-data.js: it's just a script
// defining a few consts, so we evaluate the text the user selected and pull them out.
// This runs entirely client-side against a file the user themselves picked.
function parseTokensDataFile(text) {
    const fn = new Function(`${text}
return {
    CHAINS: typeof CHAINS !== 'undefined' ? CHAINS : undefined,
    TOKEN_LISTS: typeof TOKEN_LISTS !== 'undefined' ? TOKEN_LISTS : undefined,
    RANGER_FEE_RECIPIENT: typeof RANGER_FEE_RECIPIENT !== 'undefined' ? RANGER_FEE_RECIPIENT : undefined,
    RANGER_FEE_BPS: typeof RANGER_FEE_BPS !== 'undefined' ? RANGER_FEE_BPS : undefined,
    ZEROX_API_KEY: typeof ZEROX_API_KEY !== 'undefined' ? ZEROX_API_KEY : undefined
};`);
    return fn();
}

async function loadTokensDataFile(file) {
    const text = await file.text();
    const parsed = parseTokensDataFile(text);
    if (!parsed.CHAINS || !parsed.TOKEN_LISTS) {
        throw new Error('That file has no CHAINS/TOKEN_LISTS in it -- is it really a tokens-data.js export?');
    }
    state = {
        CHAINS: parsed.CHAINS,
        TOKEN_LISTS: parsed.TOKEN_LISTS,
        RANGER_FEE_RECIPIENT: parsed.RANGER_FEE_RECIPIENT !== undefined ? parsed.RANGER_FEE_RECIPIENT : state.RANGER_FEE_RECIPIENT,
        RANGER_FEE_BPS: parsed.RANGER_FEE_BPS !== undefined ? parsed.RANGER_FEE_BPS : state.RANGER_FEE_BPS,
        ZEROX_API_KEY: parsed.ZEROX_API_KEY !== undefined ? parsed.ZEROX_API_KEY : state.ZEROX_API_KEY
    };
    persist();
    populateChainSelects();
    resetForm();
    renderTokenList(document.getElementById('listChainFilter').value);
}

document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    populateChainSelects();
    resetForm();
    renderTokenList(document.getElementById('listChainFilter').value);

    document.getElementById('tokenForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveToken();
    });
    document.getElementById('cancelEditBtn').addEventListener('click', resetForm);
    document.getElementById('listChainFilter').addEventListener('change', (e) => renderTokenList(e.target.value));

    document.querySelectorAll('.category-toggle button').forEach(btn => {
        btn.addEventListener('click', () => setCategoryUI(btn.dataset.category));
    });

    const uploadDrop = document.getElementById('uploadDrop');
    const tokenImageInput = document.getElementById('tokenImage');
    uploadDrop.addEventListener('click', () => tokenImageInput.click());
    uploadDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadDrop.classList.add('drag-over');
    });
    uploadDrop.addEventListener('dragleave', () => uploadDrop.classList.remove('drag-over'));
    uploadDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadDrop.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });
    tokenImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
    });

    document.getElementById('exportBtn').addEventListener('click', exportTokensDataFile);

    const loadFileInput = document.getElementById('loadFileInput');
    document.getElementById('loadFileBtn').addEventListener('click', () => loadFileInput.click());
    loadFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            await loadTokensDataFile(file);
            alert(`Loaded ${file.name}`);
        } catch (error) {
            console.error(error);
            alert('Could not load that file: ' + error.message);
        }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        if (!confirm("Discard everything changed in this session and reload the tokens-data.js this page was opened with?")) return;
        state = deepClone(originalState);
        localStorage.removeItem(STORAGE_KEY);
        populateChainSelects();
        resetForm();
        renderTokenList(document.getElementById('listChainFilter').value);
    });
});
