/* admin.js - Admin Dashboard Management Logic */

let productModal = null;
let categoryModal = null;

// Global lists cache
let cachedCategoriesList = [];

document.addEventListener('DOMContentLoaded', () => {
    // Explicit Guard
    if (!isLoggedIn() || !isAdmin()) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize Modals
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));

    // Load lists
    refreshDashboard();

    // Setup Forms & Event bindings
    setupForms();
    setupUploadDropzone();
});

async function refreshDashboard() {
    await Promise.all([
        loadCategoriesTable(),
        loadProductsTable()
    ]);
}

// 1. Categories Management
async function loadCategoriesTable() {
    const tableBody = document.getElementById('admin-categories-table-body');
    const metricText = document.getElementById('metric-total-categories');

    if (!tableBody) return;

    try {
        const categories = await apiRequest('/api/categories', 'GET');
        cachedCategoriesList = categories || [];

        // Update metric
        if (metricText) metricText.innerText = cachedCategoriesList.length;

        // Update Category Dropdown on Product Modal
        populateCategoryDropdown(cachedCategoriesList);

        if (cachedCategoriesList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">No categories configured yet.</td>
                </tr>
            `;
            return;
        }
        const currentUser = getLoggedInUser();
        const currentUserId = currentUser ? currentUser.id : null;
        let html = '';
        cachedCategoriesList.forEach(cat => {
                  const isOwner = !cat.createdByAdminId || cat.createdByAdminId === currentUserId;
            const actionButtons = isOwner ? `
                <button class="btn btn-sm btn-outline-info me-2" onclick="editCategory(${cat.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${cat.id})"><i class="bi bi-trash"></i></button>
            ` : `
                <span class="badge bg-dark border border-secondary text-muted">Shared</span>
            `;
            html += `
                <tr>
                    <td>#CAT-${cat.id}</td>
                    <td class="fw-semibold text-white">${cat.name}</td>
                    <td><span class="badge bg-secondary">${cat.slug}</span></td>
                    <td class="text-muted small text-truncate" style="max-width: 250px;">${cat.description || 'N/A'}</td>
                    <td class="text-end">
                        ${actionButtons}
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Error loading categories matrix.</td></tr>';
    }
}

// 2. Products Management
async function loadProductsTable() {
    const tableBody = document.getElementById('admin-products-table-body');
    const metricText = document.getElementById('metric-total-products');

    if (!tableBody) return;

    try {
         const products = await apiRequest('/api/products/mine', 'GET');
        const count = products ? products.length : 0;
        
        if (metricText) metricText.innerText = count;

        if (count === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">No products in vault. Register products to list them.</td>
                </tr>
            `;
            return;
        }

        let html = '';
        products.forEach(prod => {
            const imgUrl = getProductImageUrl(prod.imageUrl);

            html += `
                <tr>
                    <td>#NC-${prod.id}</td>
                    <td><img src="${imgUrl}" class="rounded" style="width: 40px; height: 40px; object-fit: cover;" alt="${prod.name}"></td>
                    <td class="fw-semibold text-white">${prod.name}</td>
                    <td><span class="badge bg-dark border border-secondary">${prod.categoryName || 'General'}</span></td>
                    <td class="text-gradient-gold fw-semibold">Rs. ${prod.price.toFixed(2)}</td>
                    <td>
                        <span class="badge ${prod.stock > 0 ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'}">
                            ${prod.stock} units
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-info me-2" onclick="editProduct(${prod.id})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${prod.id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

    } catch (e) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Error loading product matrix.</td></tr>';
    }
}

// 3. Modals and Forms Operations
function openProductModal() {
    // Clear form
    document.getElementById('product-form').reset();
    document.getElementById('product-id-field').value = '';
    document.getElementById('product-image-url').value = '';
    document.getElementById('dropzone-status-text').innerText = 'Click or drag image file here';
    document.getElementById('productModalLabel').innerText = 'Register Product';

    // Default Category Selection
    const select = document.getElementById('product-category');
    if (select && select.options.length > 0) {
        select.selectedIndex = 0;
    }

    productModal.show();
}

function openCategoryModal() {
    // Clear form
    document.getElementById('category-form').reset();
    document.getElementById('category-id-field').value = '';
    document.getElementById('categoryModalLabel').innerText = 'Register Category';

    categoryModal.show();
}

function populateCategoryDropdown(categories) {
    const select = document.getElementById('product-category');
    if (!select) return;

    let html = '';
    categories.forEach(cat => {
        html += `<option value="${cat.id}">${cat.name}</option>`;
    });
    select.innerHTML = html;
}

// Bind form submission listeners
function setupForms() {
    // Product Form Submit
    document.getElementById('product-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('product-id-field').value;
        const name = document.getElementById('product-name').value.trim();
        const categoryId = parseInt(document.getElementById('product-category').value);
        const price = parseFloat(document.getElementById('product-price').value);
        const stock = parseInt(document.getElementById('product-stock').value);
        const description = document.getElementById('product-description').value.trim();
        const imageUrl = document.getElementById('product-image-url').value; // retrieved filename from upload

        const submitBtn = document.getElementById('product-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            const body = {
                name,
                description,
                price,
                stock,
                imageUrl,
                categoryId
            };

            if (id) {
                // Update
                await apiRequest(`/api/products/${id}`, 'PUT', body);
                showToast('Product updated successfully', 'success');
            } else {
                // Create
                await apiRequest('/api/products', 'POST', body);
                showToast('Product registered successfully', 'success');
            }

            productModal.hide();
            refreshDashboard();

        } catch (error) {
            showToast('Failed to save product details.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Save Product';
        }
    });

    // Category Form Submit
    document.getElementById('category-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('category-id-field').value;
        const name = document.getElementById('category-name').value.trim();
        const slug = document.getElementById('category-slug').value.trim();
        const description = document.getElementById('category-description').value.trim();

        const submitBtn = document.getElementById('category-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            const body = {
                name,
                slug,
                description
            };

            if (id) {
                // Update
                await apiRequest(`/api/categories/${id}`, 'PUT', body);
                showToast('Category updated successfully', 'success');
            } else {
                // Create
                await apiRequest('/api/categories', 'POST', body);
                showToast('Category registered successfully', 'success');
            }

            categoryModal.hide();
            refreshDashboard();

        } catch (error) {
            showToast('Failed to save category details.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Save Category';
        }
    });
}

// Edit Category prefill
async function editCategory(id) {
    try {
        const cat = await apiRequest(`/api/categories/${id}`, 'GET');

        document.getElementById('category-id-field').value = cat.id;
        document.getElementById('category-name').value = cat.name;
        document.getElementById('category-slug').value = cat.slug;
        document.getElementById('category-description').value = cat.description || '';

        document.getElementById('categoryModalLabel').innerText = 'Modify Category Details';
        categoryModal.show();

    } catch (e) {
        showToast('Error retrieving category details.', 'error');
    }
}

// Edit Product prefill
async function editProduct(id) {
    try {
        const prod = await apiRequest(`/api/products/${id}`, 'GET');

        document.getElementById('product-id-field').value = prod.id;
        document.getElementById('product-name').value = prod.name;
        document.getElementById('product-price').value = prod.price;
        document.getElementById('product-stock').value = prod.stock;
        document.getElementById('product-description').value = prod.description || '';
        document.getElementById('product-image-url').value = prod.imageUrl || '';

        // Find matching Category ID from cached list
        const matchCat = cachedCategoriesList.find(c => c.name === prod.categoryName);
        if (matchCat) {
            document.getElementById('product-category').value = matchCat.id;
        }

        document.getElementById('dropzone-status-text').innerText = prod.imageUrl
            ? `Asset: ${prod.imageUrl}`
            : 'Click or drag image file here';

        document.getElementById('productModalLabel').innerText = 'Modify Product Details';
        productModal.show();

    } catch (e) {
        showToast('Error retrieving product details.', 'error');
    }
}

// Deletions
async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? All products using it might lose their tag.')) return;

    try {
        await apiRequest(`/api/categories/${id}`, 'DELETE');
        showToast('Category deleted successfully', 'success');
        refreshDashboard();
    } catch (e) {
        showToast('Failed to delete category.', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to retire this product from vault?')) return;

    try {
        await apiRequest(`/api/products/${id}`, 'DELETE');
        showToast('Product retired successfully', 'success');
        refreshDashboard();
    } catch (e) {
        showToast('Failed to delete product.', 'error');
    }
}

// 4. File uploads dropzone configuration
function setupUploadDropzone() {
    const dropzone = document.getElementById('product-image-dropzone');
    const fileInput = document.getElementById('product-image-file');
    const statusText = document.getElementById('dropzone-status-text');
    const hiddenUrlInput = document.getElementById('product-image-url');

    if (!dropzone || !fileInput) return;

    // Click trigger
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // File change handler
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        statusText.innerHTML = `<span class="spinner-border spinner-border-sm me-2 text-primary"></span>Uploading: ${file.name}`;

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Send request (using raw isFormData setting)
            const uploadedFilename = await apiRequest('/api/upload', 'POST', formData, true);

            // Returned response is the raw filename string
            hiddenUrlInput.value = uploadedFilename;
            statusText.innerHTML = `<i class="bi bi-check-circle text-success me-2"></i>Uploaded: ${uploadedFilename}`;
            showToast('Image uploaded successfully!', 'success');

        } catch (error) {
            statusText.innerText = 'Upload failed. Try again.';
            showToast('Failed to upload image file.', 'error');
        }
    });

    // Drag & Drop visual support
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-purple)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            // Trigger change manual event dispatch
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    });
}

// Bind to window scope for inline HTML event handlers
window.editCategory = editCategory;
window.editProduct = editProduct;
window.deleteCategory = deleteCategory;
window.deleteProduct = deleteProduct;
window.openProductModal = openProductModal;
window.openCategoryModal = openCategoryModal;
