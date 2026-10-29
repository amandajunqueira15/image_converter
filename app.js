// Main Application Logic - Conversion & Compression
document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const controlsBar = document.getElementById('controlsBar');
    const fileListContainer = document.getElementById('fileListContainer');
    const fileGrid = document.getElementById('fileGrid');
    const fileCount = document.getElementById('fileCount');
    const formatSelect = document.getElementById('formatSelect');
    const compressMode = document.getElementById('compressMode');
    const qualityGroup = document.getElementById('qualityGroup');
    const qualityRange = document.getElementById('qualityRange');
    const qualityVal = document.getElementById('qualityVal');
    const clearBtn = document.getElementById('clearBtn');
    const convertAllBtn = document.getElementById('convertAllBtn');
    const downloadZipBtn = document.getElementById('downloadZipBtn');

    let filesList = [];

    // Compress mode toggle
    compressMode.addEventListener('change', (e) => {
        qualityGroup.style.display = e.target.value === 'custom' ? 'flex' : 'none';
    });

    // Quality slider update
    qualityRange.addEventListener('input', (e) => {
        qualityVal.textContent = `${e.target.value}%`;
    });

    // Drag and Drop handlers
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
        fileInput.value = '';
    });

    clearBtn.addEventListener('click', () => {
        filesList = [];
        renderFiles();
    });

    convertAllBtn.addEventListener('click', async () => {
        for (let item of filesList) {
            if (item.status !== 'done') {
                await processImage(item);
            }
        }
        updateZipButtonVisibility();
    });

    downloadZipBtn.addEventListener('click', async () => {
        const zip = new JSZip();
        let count = 0;

        filesList.forEach((item) => {
            if (item.convertedBlob) {
                const targetExt = formatSelect.value.split('/')[1];
                const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
                zip.file(`${baseName}_min.${targetExt}`, item.convertedBlob);
                count++;
            }
        });

        if (count > 0) {
            const content = await zip.generateAsync({ type: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = 'imagens_comprimidas.zip';
            a.click();
        }
    });

    function handleFiles(files) {
        const validFiles = files.filter(f => f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.heic') || f.name.toLowerCase().endsWith('.heif'));
        
        validFiles.forEach(file => {
            const id = Math.random().toString(36).substring(2, 9);
            filesList.push({
                id,
                file,
                status: 'pending',
                previewUrl: null,
                convertedBlob: null,
                convertedUrl: null,
                savings: null
            });
        });

        renderFiles();
        generatePreviews();
    }

    function renderFiles() {
        if (filesList.length === 0) {
            controlsBar.style.display = 'none';
            fileListContainer.style.display = 'none';
            downloadZipBtn.style.display = 'none';
            return;
        }

        controlsBar.style.display = 'flex';
        fileListContainer.style.display = 'flex';
        fileCount.textContent = filesList.length;
        fileGrid.innerHTML = '';

        filesList.forEach(item => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.id = `card-${item.id}`;

            const originalSize = (item.file.size / 1024).toFixed(1) + ' KB';
            const convertedSize = item.convertedBlob ? (item.convertedBlob.size / 1024).toFixed(1) + ' KB' : null;

            card.innerHTML = `
                <div class="preview-wrapper">
                    ${item.previewUrl 
                        ? `<img src="${item.previewUrl}" alt="Preview">` 
                        : `<i class="fa-solid fa-image" style="font-size:3rem; color:var(--text-muted)"></i>`}
                </div>
                <div class="file-info">
                    <div class="file-name" title="${item.file.name}">${item.file.name}</div>
                    <div class="file-meta">
                        <span>${convertedSize ? `${originalSize} → ${convertedSize}` : originalSize}</span>
                        <span class="badge badge-${item.status}">${getStatusText(item.status)}</span>
                    </div>
                    ${item.savings !== null ? `<div class="savings-tag"><i class="fa-solid fa-arrow-down"></i> ${item.savings}% reduzido</div>` : ''}
                </div>
                <div class="file-card-actions">
                    ${item.status === 'done' 
                        ? `<button class="btn btn-success btn-sm download-single-btn" data-id="${item.id}"><i class="fa-solid fa-download"></i> Baixar</button>`
                        : `<button class="btn btn-primary btn-sm convert-single-btn" data-id="${item.id}"><i class="fa-solid fa-bolt"></i> Processar</button>`
                    }
                    <button class="btn btn-secondary btn-sm remove-btn" data-id="${item.id}"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `;

            fileGrid.appendChild(card);
        });

        document.querySelectorAll('.convert-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const item = filesList.find(f => f.id === id);
                if (item) processImage(item);
            });
        });

        document.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const item = filesList.find(f => f.id === id);
                if (item && item.convertedUrl) {
                    const targetExt = formatSelect.value.split('/')[1];
                    const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
                    const a = document.createElement('a');
                    a.href = item.convertedUrl;
                    a.download = `${baseName}_min.${targetExt}`;
                    a.click();
                }
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                filesList = filesList.filter(f => f.id !== id);
                renderFiles();
            });
        });

        updateZipButtonVisibility();
    }

    function getStatusText(status) {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'converting': return 'Comprimindo...';
            case 'done': return 'Pronto';
            case 'error': return 'Erro';
            default: return status;
        }
    }

    async function generatePreviews() {
        for (let item of filesList) {
            if (item.previewUrl) continue;

            const isHeic = item.file.name.toLowerCase().endsWith('.heic') || item.file.name.toLowerCase().endsWith('.heif');
            if (isHeic && typeof heic2any !== 'undefined') {
                try {
                    const blob = await heic2any({ blob: item.file, toType: 'image/jpeg', quality: 0.3 });
                    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
                    item.previewUrl = URL.createObjectURL(resultBlob);
                } catch (err) {
                    console.error('HEIC preview failed', err);
                }
            } else if (!isHeic) {
                item.previewUrl = URL.createObjectURL(item.file);
            }
            renderFiles();
        }
    }

    // // Smart compression logic (TinyPNG style)
    // async function processImage(item) {
    //     item.status = 'converting';
    //     renderFiles();

    //     try {
    //         const targetType = formatSelect.value;
    //         const mode = compressMode.value;
    //         let quality = mode === 'smart' ? 0.75 : parseFloat(qualityRange.value) / 100;
    //         const isHeic = item.file.name.toLowerCase().endsWith('.heic') || item.file.name.toLowerCase().endsWith('.heif');

    //         let sourceBlob = item.file;
    //         if (isHeic && typeof heic2any !== 'undefined') {
    //             const res = await heic2any({ blob: item.file, toType: 'image/png' });
    //             sourceBlob = Array.isArray(res) ? res[0] : res;
    //         }

    //         const img = new Image();
    //         const url = URL.createObjectURL(sourceBlob);
            
    //         await new Promise((resolve, reject) => {
    //             img.onload = resolve;
    //             img.onerror = reject;
    //             img.src = url;
    //         });

    //         // Resizing for smart compression if dimensions are oversized (TinyPNG optimization strategy)
    //         let width = img.width;
    //         let height = img.height;
    //         const maxDimension = 2400;

    //         if (mode === 'smart' && (width > maxDimension || height > maxDimension)) {
    //             if (width > height) {
    //                 height = Math.round((height * maxDimension) / width);
    //                 width = maxDimension;
    //             } else {
    //                 width = Math.round((width * maxDimension) / height);
    //                 height = maxDimension;
    //             }
    //         }

    //         const canvas = document.createElement('canvas');
    //         canvas.width = width;
    //         canvas.height = height;
    //         const ctx = canvas.getContext('2d');
    //         ctx.drawImage(img, 0, 0, width, height);

    //         const convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, targetType, quality));
            
    //         // Calculate size reduction percentage
    //         const savingsPercent = Math.round(((item.file.size - convertedBlob.size) / item.file.size) * 100);

    //         item.convertedBlob = convertedBlob;
    //         item.convertedUrl = URL.createObjectURL(convertedBlob);
    //         item.savings = savingsPercent > 0 ? savingsPercent : 0;
    //         item.status = 'done';
    //     } catch (err) {
    //         console.error('Processing failed', err);
    //         item.status = 'error';
    //     }

    //     renderFiles();
    // }

    // Função de processamento com compressão real estilo TinyPNG
    async function processImage(item) {
        item.status = 'converting';
        renderFiles();

        try {
            let targetType = formatSelect.value;
            const mode = compressMode.value;
            let quality = mode === 'smart' ? 0.70 : parseFloat(qualityRange.value) / 100;
            
            const isHeic = item.file.name.toLowerCase().endsWith('.heic') || item.file.name.toLowerCase().endsWith('.heif');

            let sourceBlob = item.file;
            if (isHeic && typeof heic2any !== 'undefined') {
                const res = await heic2any({ blob: item.file, toType: 'image/png' });
                sourceBlob = Array.isArray(res) ? res[0] : res;
            }

            const img = new Image();
            const url = URL.createObjectURL(sourceBlob);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });

            let width = img.width;
            let height = img.height;

            // No modo inteligente, limita resolução para HD/FullHD se for gigante
            if (mode === 'smart') {
                const maxDimension = 1920; // Limite realista para web estilo TinyPNG
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Se for PNG e o usuário quiser comprimir no modo inteligente, 
            // convertemos para WebP/JPEG ou preenchemos o fundo para otimizar tamanho
            if (targetType === 'image/png' && mode === 'smart') {
                // PNGs nativos no browser não aceitam parâmetro de qualidade no Canvas.
                // Para comprimir PNG de verdade sem libs pesadas C/C++, convertemos a saída para WebP
                targetType = 'image/webp'; 
            }

            if (targetType === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
            }

            ctx.drawImage(img, 0, 0, width, height);

            let convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, targetType, quality));

            // Se por algum motivo o arquivo gerado ficou maior que o original, aplica compressão extra
            if (convertedBlob.size >= item.file.size && mode === 'smart') {
                convertedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.60));
            }

            // Cálculo exato de economia
            const savingsPercent = Math.round(((item.file.size - convertedBlob.size) / item.file.size) * 100);

            item.convertedBlob = convertedBlob;
            item.convertedUrl = URL.createObjectURL(convertedBlob);
            item.savings = savingsPercent > 0 ? savingsPercent : 0;
            item.status = 'done';
        } catch (err) {
            console.error('Processing failed', err);
            item.status = 'error';
        }

        renderFiles();
    }

    function updateZipButtonVisibility() {
        const hasDoneFiles = filesList.some(f => f.status === 'done');
        downloadZipBtn.style.display = hasDoneFiles ? 'inline-flex' : 'none';
    }
});