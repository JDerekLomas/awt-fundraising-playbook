// Ancient Wisdom Trust Fundraising Playbook - Main JavaScript

// Initialize local storage for prospects
const STORAGE_KEY = 'awt_prospects';

// Get prospects from local storage
function getProspects() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Save prospects to local storage
function saveProspects(prospects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prospects));
}

// Add a new prospect
function addProspect(prospect) {
    const prospects = getProspects();
    prospect.id = Date.now();
    prospect.stage = 'identified';
    prospect.lastContact = null;
    prospect.createdAt = new Date().toISOString();
    prospects.push(prospect);
    saveProspects(prospects);
    return prospect;
}

// Update prospect
function updateProspect(id, updates) {
    const prospects = getProspects();
    const index = prospects.findIndex(p => p.id === id);
    if (index !== -1) {
        prospects[index] = { ...prospects[index], ...updates };
        saveProspects(prospects);
    }
}

// Delete prospect
function deleteProspect(id) {
    const prospects = getProspects();
    const filtered = prospects.filter(p => p.id !== id);
    saveProspects(filtered);
}

// Render prospects table
function renderProspects(filter = {}) {
    const tbody = document.getElementById('prospects-body');
    if (!tbody) return;

    const prospects = getProspects();
    let filtered = prospects;

    // Apply filters
    if (filter.category) {
        filtered = filtered.filter(p => p.category === filter.category);
    }
    if (filter.stage) {
        filtered = filtered.filter(p => p.stage === filter.stage);
    }
    if (filter.search) {
        const search = filter.search.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(search) ||
            (p.contact_name && p.contact_name.toLowerCase().includes(search))
        );
    }

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td>
                <strong>${p.name}</strong>
                ${p.contact_name ? `<br><span class="text-muted">${p.contact_name}</span>` : ''}
            </td>
            <td><span class="badge badge-info">${p.category}</span></td>
            <td class="contact-info">
                ${p.email ? `<a href="mailto:${p.email}">${p.email}</a>` : ''}
                ${p.phone ? `<br>${p.phone}` : ''}
            </td>
            <td>${p.capacity || '-'}</td>
            <td><span class="badge ${getStageClass(p.stage)}">${p.stage}</span></td>
            <td>${p.lastContact ? formatDate(p.lastContact) : '-'}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="editProspect(${p.id})">Edit</button>
                <button class="btn btn-small" onclick="deleteProspectConfirm(${p.id})" style="color: var(--danger);">Delete</button>
            </td>
        </tr>
    `).join('');

    // Update stats
    updateStats();
}

// Get badge class for stage
function getStageClass(stage) {
    const classes = {
        'identified': 'badge-info',
        'qualified': 'badge-warning',
        'cultivated': 'badge-warning',
        'solicited': 'badge-success',
        'pledged': 'badge-success'
    };
    return classes[stage] || 'badge-info';
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Update dashboard stats
function updateStats() {
    const prospects = getProspects();

    // Total prospects
    const totalEl = document.getElementById('total-prospects');
    if (totalEl) totalEl.textContent = prospects.length;

    // Pipeline stages
    const stages = ['identified', 'qualified', 'cultivated', 'solicited', 'pledged'];
    stages.forEach(stage => {
        const el = document.getElementById(`stage-${stage}`);
        if (el) {
            el.textContent = prospects.filter(p => p.stage === stage).length;
        }
    });
}

// Filter prospects by tab
function filterProspects(tab) {
    const categoryMap = {
        'all': null,
        'individuals': 'individual',
        'foundations': 'foundation',
        'corporate': 'corporate'
    };
    renderProspects({ category: categoryMap[tab] });
}

// Delete prospect with confirmation
function deleteProspectConfirm(id) {
    if (confirm('Are you sure you want to delete this prospect?')) {
        deleteProspect(id);
        renderProspects();
    }
}

// Edit prospect (opens modal with pre-filled data)
function editProspect(id) {
    const prospects = getProspects();
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;

    // For now, just show an alert - could be expanded to a modal
    const newStage = prompt('Update stage (identified/qualified/cultivated/solicited/pledged):', prospect.stage);
    if (newStage && ['identified', 'qualified', 'cultivated', 'solicited', 'pledged'].includes(newStage)) {
        updateProspect(id, { stage: newStage, lastContact: new Date().toISOString() });
        renderProspects();
    }
}

// Handle add prospect form
function initAddProspectForm() {
    const form = document.getElementById('add-prospect-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const prospect = {
            name: formData.get('name'),
            category: formData.get('category'),
            contact_name: formData.get('contact_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            capacity: formData.get('capacity'),
            connection: formData.get('connection'),
            notes: formData.get('notes')
        };
        addProspect(prospect);
        form.reset();
        document.getElementById('add-prospect-modal').classList.remove('active');
        renderProspects();
    });
}

// Search prospects
function initSearch() {
    const searchInput = document.getElementById('prospect-search');
    const categoryFilter = document.getElementById('filter-category');
    const stageFilter = document.getElementById('filter-stage');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderProspects({
                search: searchInput.value,
                category: categoryFilter?.value || null,
                stage: stageFilter?.value || null
            });
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            renderProspects({
                search: searchInput?.value || '',
                category: categoryFilter.value || null,
                stage: stageFilter?.value || null
            });
        });
    }

    if (stageFilter) {
        stageFilter.addEventListener('change', () => {
            renderProspects({
                search: searchInput?.value || '',
                category: categoryFilter?.value || null,
                stage: stageFilter.value || null
            });
        });
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Could show a toast notification here
        console.log('Copied to clipboard');
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    renderProspects();
    initAddProspectForm();
    initSearch();
    updateStats();
});

// Make functions globally available
window.filterProspects = filterProspects;
window.deleteProspectConfirm = deleteProspectConfirm;
window.editProspect = editProspect;
window.copyToClipboard = copyToClipboard;
