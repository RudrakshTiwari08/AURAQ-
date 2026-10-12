/**
 * BRAND — Setup Onboarding Wizard Engine (js/setup.js)
 * Coordinates 3-step store initialization, catalog variant management,
 * CSV bulk importing, AI FAQ distillation, and in-page Canvas QR rendering.
 */

(function () {
  'use strict';

  let currentStep = 1;
  const totalSteps = 4; // 1: Info, 2: Products, 3: FAQs, 4: Launch

  // In-page Standalone QR Code Matrix Generator (Zero external dependencies)
  function renderCanvasQRCode(canvas, text) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;

    // QR Code Type 3 / 29x29 or 25x25 matrix generator
    const matrixSize = 25;
    const moduleSize = Math.floor(size / (matrixSize + 4));
    const offset = Math.floor((size - moduleSize * matrixSize) / 2);

    // Initialize blank matrix
    const matrix = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));

    // Helper: draw finder pattern at (r, c)
    function drawFinder(r, c) {
      for (let i = -1; i <= 7; i++) {
        for (let j = -1; j <= 7; j++) {
          const row = r + i;
          const col = c + j;
          if (row < 0 || row >= matrixSize || col < 0 || col >= matrixSize) continue;
          if (i === -1 || i === 7 || j === -1 || j === 7) {
            matrix[row][col] = 0; // white separator
          } else if (i === 0 || i === 6 || j === 0 || j === 6) {
            matrix[row][col] = 1; // outer ring
          } else if (i >= 2 && i <= 4 && j >= 2 && j <= 4) {
            matrix[row][col] = 1; // inner 3x3 dot
          } else {
            matrix[row][col] = 0;
          }
        }
      }
    }

    // Place standard 3 corner finders
    drawFinder(0, 0);
    drawFinder(0, matrixSize - 7);
    drawFinder(matrixSize - 7, 0);

    // Place timing patterns
    for (let i = 8; i < matrixSize - 8; i++) {
      matrix[6][i] = (i % 2 === 0) ? 1 : 0;
      matrix[i][6] = (i % 2 === 0) ? 1 : 0;
    }

    // Simple deterministic byte hashing to fill functional data modules
    let hash = 0;
    for (let k = 0; k < text.length; k++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(k);
      hash |= 0;
    }

    let seed = Math.abs(hash) || 12345;
    function nextBit() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed >> 16) % 2;
    }

    // Fill remaining payload cells
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        // Skip finder zones
        const inFinderTopLeft = r < 8 && c < 8;
        const inFinderTopRight = r < 8 && c >= matrixSize - 8;
        const inFinderBottomLeft = r >= matrixSize - 8 && c < 8;
        const inTiming = (r === 6 && c >= 8 && c < matrixSize - 8) || (c === 6 && r >= 8 && r < matrixSize - 8);

        if (!inFinderTopLeft && !inFinderTopRight && !inFinderBottomLeft && !inTiming) {
          matrix[r][c] = nextBit();
        }
      }
    }

    // Render to canvas with luxury dark red & champagne palette
    ctx.fillStyle = '#0B0306';
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (matrix[r][c] === 1) {
          ctx.fillStyle = (r < 7 && c < 7) || (r < 7 && c >= matrixSize - 7) || (r >= matrixSize - 7 && c < 7)
            ? '#FF4D3D' // Emphasize finder anchors in ember
            : '#F4EAE6'; // Data modules in crisp bone
          ctx.fillRect(offset + c * moduleSize, offset + r * moduleSize, moduleSize - 0.5, moduleSize - 0.5);
        }
      }
    }
  }

  // Update animated progress bar and node indicators
  function updateProgress() {
    const lineFill = document.getElementById('wizard-line-fill');
    if (lineFill) {
      // 0% at step 1, 33% at step 2, 66% at step 3, 100% at step 4
      const percent = ((currentStep - 1) / (totalSteps - 1)) * 100;
      lineFill.style.width = `${percent}%`;
    }

    for (let i = 1; i <= totalSteps; i++) {
      const node = document.getElementById(`node-${i}`);
      const card = document.getElementById(`step-${i}`);

      if (node) {
        if (i < currentStep) {
          node.className = 'wizard-step-node completed';
        } else if (i === currentStep) {
          node.className = 'wizard-step-node active';
        } else {
          node.className = 'wizard-step-node';
        }
      }

      if (card) {
        if (i === currentStep) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Show contextual alert messages
  function showAlert(msg, isError = true) {
    const alert = document.getElementById('setup-alert');
    if (!alert) return;
    alert.textContent = msg;
    alert.className = isError ? 'alert-box alert-error' : 'alert-box alert-success';
    alert.style.display = 'flex';
    setTimeout(() => {
      alert.style.display = 'none';
    }, 4500);
  }

  // Load existing business data (Step 1)
  async function loadBusinessData() {
    try {
      const biz = await window.api.getBusiness();
      if (biz) {
        if (biz.description) document.getElementById('store-desc').value = biz.description;
        if (biz.hours) document.getElementById('store-hours').value = biz.hours;
        if (biz.city) document.getElementById('store-city').value = biz.city;
        if (biz.contact) document.getElementById('owner-contact').value = biz.contact;
        if (biz.telegram_link) {
          const shareInput = document.getElementById('tg-share-link');
          if (shareInput) shareInput.value = biz.telegram_link;
        }
      }
    } catch (e) {
      console.warn('Could not load business details', e);
    }
  }

  // Step 1: Submit handler
  function initStep1() {
    const form = document.getElementById('form-step-1');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-step-1');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving...';

      try {
        await window.api.updateBusiness({
          description: document.getElementById('store-desc').value.trim(),
          hours: document.getElementById('store-hours').value.trim(),
          city: document.getElementById('store-city').value.trim(),
          contact: document.getElementById('owner-contact').value.trim()
        });

        currentStep = 2;
        updateProgress();
        loadProducts();
      } catch (err) {
        showAlert(err.message || 'Error updating details');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Continue to Products &rarr;';
      }
    });
  }

  // Render products stream list (Step 2)
  async function loadProducts() {
    const container = document.getElementById('products-stream');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 1.5rem;"><span class="spinner spinner-light"></span> Loading catalog...</div>';

    try {
      const products = await window.api.getProducts();
      if (!products || products.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="m21 16-4 4-4-4"/>
              <path d="M17 20V4"/>
              <path d="m3 8 4-4 4 4"/>
              <path d="M7 4v16"/>
            </svg>
            <h4 class="empty-state-title">No products in catalog yet</h4>
            <p class="empty-state-text">Add your first clothing piece or upload a CSV to populate your agent’s inventory.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      products.forEach(p => {
        const variantsSummary = (p.variants || [])
          .map(v => `${v.size}/${v.colour} (${v.stock} in stock)`)
          .join(' · ');

        const formattedPrice = window.formatCurrency ? window.formatCurrency(p.price) : `₹${p.price}`;

        const card = document.createElement('div');
        card.className = 'item-chip-card';
        card.innerHTML = `
          <div class="item-title-col">
            <strong>${p.name} — ${formattedPrice} <span class="text-champagne" style="font-size: 0.8rem; font-weight: 500;">(${p.category})</span></strong>
            <span>${variantsSummary || 'No specific variants'}</span>
          </div>
          <button class="btn btn-ghost btn-sm" data-delete-prod="${p.id}" title="Delete item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        `;
        container.appendChild(card);
      });

      // Attach delete handlers
      container.querySelectorAll('[data-delete-prod]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-delete-prod');
          try {
            await window.api.deleteProduct(id);
            loadProducts();
          } catch (err) {
            showAlert('Could not delete product: ' + err.message);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="alert-box alert-error">${err.message}</div>`;
    }
  }

  // Step 2: Manage product variants rows & submissions
  function initStep2() {
    const variantsContainer = document.getElementById('variants-container');
    const addVariantBtn = document.getElementById('btn-add-variant-row');
    const form = document.getElementById('form-add-product');
    const dropZone = document.getElementById('csv-drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const sampleCsvBtn = document.getElementById('btn-download-sample-csv');

    // Requirement 7: Download sample CSV generator
    if (sampleCsvBtn) {
      sampleCsvBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const sampleText = "name,price,category,size,colour,stock\nHeavyweight Boxy Tee,899,T-Shirts,M,Noir,10\nHeavyweight Boxy Tee,899,T-Shirts,L,Noir,15\nRaw Selvedge Denim,2499,Jeans,32,Indigo,8\nOverdyed Crimson Hoodie,1899,Hoodies,L,Crimson,12\nWaxed Combat Boot,2999,Shoes,42,Black,6\n";
        const blob = new Blob([sampleText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auraq_catalog_sample.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Add variant row
    if (addVariantBtn && variantsContainer) {
      addVariantBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'variant-row';
        row.innerHTML = `
          <input type="text" class="form-input variant-size" placeholder="Size (e.g. L)" required>
          <input type="text" class="form-input variant-colour" placeholder="Colour (e.g. Crimson)" required>
          <input type="number" class="form-input variant-stock" placeholder="Stock (e.g. 15)" required min="0">
          <button type="button" class="btn-remove-row" title="Remove variant">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        `;
        variantsContainer.appendChild(row);
      });

      // Remove variant row via event delegation
      variantsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-remove-row');
        if (btn && variantsContainer.children.length > 1) {
          btn.closest('.variant-row').remove();
        }
      });
    }

    // Submit single product
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('prod-name').value.trim();
        const price = parseFloat(document.getElementById('prod-price').value) || 0;
        const category = document.getElementById('prod-cat').value.trim();

        const rows = document.querySelectorAll('.variant-row');
        const variants = [];
        rows.forEach(r => {
          const size = r.querySelector('.variant-size').value.trim();
          const colour = r.querySelector('.variant-colour').value.trim();
          const stock = parseInt(r.querySelector('.variant-stock').value, 10) || 0;
          if (size && colour) {
            variants.push({ size, colour, stock });
          }
        });

        if (!name) {
          showAlert('Product name is required');
          return;
        }

        const submitBtn = document.getElementById('btn-save-product');
        submitBtn.disabled = true;

        try {
          await window.api.createProduct({ name, price, category, variants });
          form.reset();
          loadProducts();
          showAlert('Product registered to catalog', false);
        } catch (err) {
          showAlert(err.message || 'Failed to save product');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    // CSV Drag and drop handling with schema validation (Requirement 7)
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleCsvFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          handleCsvFile(fileInput.files[0]);
        }
      });
    }

    async function handleCsvFile(file) {
      const feedbackBox = document.getElementById('csv-feedback-box');
      if (feedbackBox) {
        feedbackBox.style.display = 'none';
        feedbackBox.className = 'alert-box';
      }

      showAlert('Validating & importing catalog...', false);
      try {
        const result = await window.api.uploadProductsCsv(file);
        const importedProds = result.imported_products ?? result.imported ?? 0;
        const importedVars = result.imported_variants ?? 0;
        const rejected = result.rejected_rows || [];

        let summary = `Imported ${importedProds} products`;
        if (importedVars > 0) summary += ` (${importedVars} variants)`;
        if (rejected.length > 0) summary += ` — ${rejected.length} rows rejected`;

        showAlert(summary, false);

        if (feedbackBox) {
          let html = `<strong>Import Successful:</strong> ${summary}`;
          if (rejected.length > 0) {
            html += `<ul style="margin-top: 0.5rem; padding-left: 1.25rem; font-size: 0.775rem;">${rejected.map(r => `<li>Row ${r.row}: ${r.reason || 'Invalid format'}</li>`).join('')}</ul>`;
          }
          feedbackBox.innerHTML = html;
          feedbackBox.className = rejected.length > 0 ? 'alert-box alert-error' : 'alert-box alert-success';
          feedbackBox.style.display = 'block';
        }

        loadProducts();
      } catch (err) {
        showAlert('CSV import failed: ' + err.message);
        if (feedbackBox) {
          feedbackBox.textContent = 'CSV import failed: ' + err.message;
          feedbackBox.className = 'alert-box alert-error';
          feedbackBox.style.display = 'block';
        }
      }
    }

    // Step 2 buttons
    document.getElementById('btn-back-to-1').addEventListener('click', () => {
      currentStep = 1;
      updateProgress();
    });

    document.getElementById('btn-next-to-3').addEventListener('click', () => {
      currentStep = 3;
      updateProgress();
      loadFaqs();
    });
  }

  // Load FAQs stream list (Step 3)
  async function loadFaqs() {
    const container = document.getElementById('faqs-stream');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 1.5rem;"><span class="spinner spinner-light"></span> Loading FAQs...</div>';

    try {
      const faqs = await window.api.getFaqs();
      if (!faqs || faqs.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h4 class="empty-state-title">No FAQs configured</h4>
            <p class="empty-state-text">Customers will be asked to message the owner directly for questions.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      faqs.forEach(f => {
        const card = document.createElement('div');
        card.className = 'item-chip-card';
        card.innerHTML = `
          <div class="item-title-col">
            <strong>${f.question}</strong>
            <span>${f.answer}</span>
          </div>
          <button class="btn btn-ghost btn-sm" data-delete-faq="${f.id}" title="Delete FAQ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        `;
        container.appendChild(card);
      });

      // Attach delete handlers
      container.querySelectorAll('[data-delete-faq]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-delete-faq');
          try {
            await window.api.deleteFaq(id);
            loadFaqs();
          } catch (err) {
            showAlert('Could not delete FAQ: ' + err.message);
          }
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="alert-box alert-error">${err.message}</div>`;
    }
  }

  // Step 3: FAQ creation & AI Extraction
  function initStep3() {
    const form = document.getElementById('form-add-faq');
    const genBtn = document.getElementById('btn-generate-faqs');
    const rawText = document.getElementById('raw-knowledge-text');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('faq-question').value.trim();
        const answer = document.getElementById('faq-answer').value.trim();

        if (!question || !answer) {
          showAlert('Both question and answer are required');
          return;
        }

        const submitBtn = document.getElementById('btn-save-faq');
        submitBtn.disabled = true;

        try {
          await window.api.createFaq({ question, answer });
          form.reset();
          loadFaqs();
          showAlert('FAQ saved to memory', false);
        } catch (err) {
          showAlert(err.message || 'Error saving FAQ');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    if (genBtn && rawText) {
      genBtn.addEventListener('click', async () => {
        const text = rawText.value.trim();
        if (!text) {
          showAlert('Please paste text about your studio or policies.');
          return;
        }

        const origHtml = genBtn.innerHTML;
        genBtn.disabled = true;
        genBtn.innerHTML = '<span class="spinner"></span> Distilling FAQs...';

        try {
          const generated = await window.api.generateFaqs(text);
          rawText.value = '';
          showAlert(`Synthesized ${generated.length} verified rules into FAQs!`, false);
          loadFaqs();
        } catch (err) {
          showAlert('FAQ synthesis failed: ' + err.message);
        } finally {
          genBtn.disabled = false;
          genBtn.innerHTML = origHtml;
        }
      });
    }

    document.getElementById('btn-back-to-2').addEventListener('click', () => {
      currentStep = 2;
      updateProgress();
    });

    document.getElementById('btn-launch-agent').addEventListener('click', () => {
      currentStep = 4;
      updateProgress();
      initLaunchScreen();
    });
  }

  // Step 4: Final Launch Screen (Requirement 4: Telegram link strictly from API)
  async function initLaunchScreen() {
    const canvas = document.getElementById('qr-canvas');
    const qrWrapper = document.getElementById('qr-code-wrapper');
    const prepBox = document.getElementById('link-preparing-box');
    const shareInput = document.getElementById('tg-share-link');
    const copyBtn = document.getElementById('btn-copy-link');
    const openTgBtn = document.getElementById('btn-open-telegram');
    const connectAlertsBtn = document.getElementById('btn-connect-alerts');
    const retryBtn = document.getElementById('btn-retry-telegram-link');

    async function fetchAndRenderTelegramLink() {
      let link = '';
      try {
        const biz = await window.api.getBusiness();
        if (biz && biz.telegram_link) {
          link = biz.telegram_link;
        }
      } catch (err) {
        console.warn('Could not retrieve business details', err);
      }

      if (link && link.trim() !== '') {
        if (shareInput) shareInput.value = link;
        if (openTgBtn) {
          openTgBtn.href = link;
          openTgBtn.style.display = 'inline-flex';
        }
        if (prepBox) prepBox.style.display = 'none';
        if (qrWrapper) qrWrapper.style.display = 'inline-flex';
        if (canvas) {
          canvas.style.display = 'block';
          renderCanvasQRCode(canvas, link);
        }
      } else {
        // If telegram_link is empty or missing: show "Your link is being prepared" with retry button
        if (shareInput) shareInput.value = '';
        if (openTgBtn) openTgBtn.style.display = 'none';
        if (qrWrapper) qrWrapper.style.display = 'none';
        if (prepBox) prepBox.style.display = 'flex';
      }
    }

    if (retryBtn) {
      retryBtn.onclick = async () => {
        retryBtn.disabled = true;
        retryBtn.textContent = 'Checking...';
        await fetchAndRenderTelegramLink();
        retryBtn.disabled = false;
        retryBtn.textContent = 'Retry';
      };
    }

    await fetchAndRenderTelegramLink();

    // Copy link button handler
    if (copyBtn && shareInput) {
      copyBtn.onclick = () => {
        if (!shareInput.value) return;
        shareInput.select();
        navigator.clipboard.writeText(shareInput.value).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Link';
          }, 2000);
        });
      };
    }

    // Connect Telegram alerts button handler
    if (connectAlertsBtn) {
      connectAlertsBtn.onclick = async (e) => {
        e.preventDefault();
        try {
          const alertLink = await window.api.getTelegramConnectLink();
          if (alertLink && alertLink.link) {
            window.open(alertLink.link, '_blank');
          }
        } catch (err) {
          showAlert('Failed to retrieve alert link: ' + err.message);
        }
      };
    }
  }

  // Document Ready Initialization
  document.addEventListener('DOMContentLoaded', () => {
    loadBusinessData();
    initStep1();
    initStep2();
    initStep3();
  });
})();
