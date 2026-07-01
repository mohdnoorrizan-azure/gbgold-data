// GBGold Recruitment Analysis Dashboard - App Logic

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let recruitmentData = []; // Combined recruitment records
    let filteredData = [];    // Filtered data after applying search, date, and month filters
    
    // Table Sorting State
    let currentSortColumn = 'referrals';
    let currentSortAscending = false;
    
    // Table Pagination State
    let currentPage = 1;
    const rowsPerPage = 20;

    // Chart Instances
    let chartRecruitmentTrend = null;
    let chartTopRecruiters = null;
    let chartSegmentDistribution = null;

    // --- DOM Elements ---
    const dropZoneRecruitment = document.getElementById('drop-zone-recruitment');
    const fileRecruitmentInput = document.getElementById('file-recruitment');
    const recruitmentFileInfo = document.getElementById('recruitment-file-info');
    
    const btnProcess = document.getElementById('btn-process');
    const btnLoadDemo = document.getElementById('btn-load-demo');
    const btnSaveServer = document.getElementById('btn-save-server');
    const btnReset = document.getElementById('btn-reset');
    
    const uploadSection = document.getElementById('upload-section');
    const dashboardView = document.getElementById('dashboard-view');
    
    // Filters
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterMonth = document.getElementById('filter-month');
    const tableFilterMonth = document.getElementById('table-filter-month');
    const tableSearch = document.getElementById('table-search');
    
    // KPIs
    const kpiTotalReferrals = document.getElementById('kpi-total-referrals');
    const kpiTotalRecruiters = document.getElementById('kpi-total-recruiters');
    const kpiAvgReferrals = document.getElementById('kpi-avg-referrals');
    const kpiTopRecruiterName = document.getElementById('kpi-top-recruiter-name');
    const kpiTopRecruiterCode = document.getElementById('kpi-top-recruiter-code');
    const kpiTopRecruiterCount = document.getElementById('kpi-top-recruiter-count');
    
    // Table & Export
    const tableBody = document.getElementById('table-body');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationControls = document.getElementById('pagination-controls');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnExportXlsx = document.getElementById('btn-export-xlsx');

    // Temp array for uploaded files
    let uploadedRawRows = [];

    // --- Autoload Data from Server ---
    loadDataFromServer();

    // --- Drag and Drop Setup ---
    setupDragAndDrop(dropZoneRecruitment, fileRecruitmentInput, handleFilesSelect);

    function setupDragAndDrop(dropZone, fileInput, callback) {
        dropZone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                callback(e.target.files);
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                callback(files);
            }
        }, false);
    }

    // --- File Handlers ---
    function handleFilesSelect(files) {
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;
        
        recruitmentFileInfo.textContent = `${filesArray.length} fail terpilih...`;
        dropZoneRecruitment.classList.add('has-file');
        
        const promises = filesArray.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                if (file.name.endsWith('.csv')) {
                    reader.onload = function(e) {
                        const text = e.target.result;
                        Papa.parse(text, {
                            header: true,
                            skipEmptyLines: true,
                            complete: function(results) {
                                resolve(results.data);
                            },
                            error: function(err) {
                                reject(new Error(`Ralat membaca ${file.name}: ${err.message}`));
                            }
                        });
                    };
                    reader.onerror = () => reject(new Error(`Ralat membaca ${file.name}`));
                    reader.readAsText(file);
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    reader.onload = function(e) {
                        const data = new Uint8Array(e.target.result);
                        try {
                            const workbook = XLSX.read(data, { type: 'array' });
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                            resolve(jsonData);
                        } catch (err) {
                            reject(new Error(`Ralat membaca ${file.name}: ${err.message}`));
                        }
                    };
                    reader.onerror = () => reject(new Error(`Ralat membaca ${file.name}`));
                    reader.readAsArrayBuffer(file);
                } else {
                    reject(new Error(`Format fail ${file.name} tidak disokong.`));
                }
            });
        });
        
        Promise.all(promises)
            .then(allDataSets => {
                // Combine all datasets
                const combinedRows = [].concat(...allDataSets);
                uploadedRawRows = cleanRecruitmentData(combinedRows);
                
                if (uploadedRawRows.length > 0) {
                    btnProcess.removeAttribute('disabled');
                    const totalSize = filesArray.reduce((acc, f) => acc + f.size, 0);
                    recruitmentFileInfo.textContent = `${filesArray.length} fail (${formatBytes(totalSize)}) - Sedia diproses`;
                } else {
                    throw new Error("Tiada data rekrutmen sah yang dijumpai dalam fail yang dimuat naik.");
                }
            })
            .catch(err => {
                alert(err.message);
                recruitmentFileInfo.textContent = 'Sila pilih atau tarik satu atau lebih fail ke sini';
                dropZoneRecruitment.classList.remove('has-file');
                uploadedRawRows = [];
                btnProcess.setAttribute('disabled', 'true');
            });
    }

    // --- Clean Recruitment Data ---
    function cleanRecruitmentData(data) {
        return data.map(row => {
            const codeKey = findKey(row, 'customercode') || findKey(row, 'code');
            const nameKey = findKey(row, 'customername') || findKey(row, 'name');
            const fromKey = findKey(row, 'from');
            const toKey = findKey(row, 'to');
            const referralsKey = findKey(row, 'referrals') || findKey(row, 'referral');

            const rawCode = String(row[codeKey] || "").trim();
            const rawName = String(row[nameKey] || "").trim();
            const rawFrom = row[fromKey];
            const rawTo = row[toKey];
            const rawReferrals = row[referralsKey];

            // Filter out non-customer codes (e.g. Header text or blank entries)
            if (!rawCode || !rawCode.startsWith('GB')) return null;

            const parsedFrom = parseDate(rawFrom);
            const parsedTo = parseDate(rawTo);
            const referralsCount = parseInt(cleanNumString(rawReferrals)) || 0;

            if (!parsedFrom || !parsedTo) return null;

            return {
                code: rawCode,
                name: rawName,
                from: parsedFrom,
                to: parsedTo,
                referrals: referralsCount
            };
        }).filter(row => row !== null);
    }

    function findKey(row, term) {
        const keys = Object.keys(row);
        const match = keys.find(k => k.toLowerCase().replace(/[\s_.-]+/g, '').includes(term.toLowerCase()));
        return match || null;
    }

    function cleanNumString(val) {
        if (val === undefined || val === null) return "0";
        return String(val).replace(/[^0-9.-]/g, '');
    }

    function parseDate(dateVal) {
        if (!dateVal) return null;
        
        // If it's Excel serial date
        if (typeof dateVal === 'number' || (!isNaN(dateVal) && !isNaN(parseFloat(dateVal)) && String(dateVal).length <= 6)) {
            const excelDate = parseFloat(dateVal);
            const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            return jsDate.toISOString().split('T')[0];
        }
        
        const dateStr = String(dateVal).trim();
        
        // Match DD-MM-YYYY or DD/MM/YYYY
        const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${year}-${month}-${day}`;
        }
        
        // Match YYYY-MM-DD
        const ymdMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
        if (ymdMatch) {
            const year = ymdMatch[1];
            const month = ymdMatch[2].padStart(2, '0');
            const day = ymdMatch[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Try parsing directly
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
            return new Date(parsed).toISOString().split('T')[0];
        }
        
        return null;
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    // --- Merge uploaded rows with existing data ---
    function mergeRecruitmentRows(existing, newRows) {
        const merged = [...existing];
        newRows.forEach(newRow => {
            // Find duplicate by code, from, and to dates
            const index = merged.findIndex(r => r.code === newRow.code && r.from === newRow.from && r.to === newRow.to);
            if (index !== -1) {
                merged[index] = newRow; // Overwrite
            } else {
                merged.push(newRow); // Append
            }
        });
        return merged;
    }

    // --- Process Action ---
    btnProcess.addEventListener('click', () => {
        if (uploadedRawRows.length === 0) return;
        
        recruitmentData = mergeRecruitmentRows(recruitmentData, uploadedRawRows);
        uploadedRawRows = [];
        
        // Reset file inputs
        fileRecruitmentInput.value = '';
        recruitmentFileInfo.textContent = 'Sila pilih atau tarik satu atau lebih fail ke sini';
        dropZoneRecruitment.classList.remove('has-file');
        btnProcess.setAttribute('disabled', 'true');
        
        initDashboard();
        
        // Auto save to server
        saveDataToServer(false);
    });

    // --- Initialize Dashboard View ---
    function initDashboard() {
        if (recruitmentData.length === 0) {
            uploadSection.style.display = 'block';
            dashboardView.style.display = 'none';
            btnSaveServer.style.display = 'none';
            btnReset.style.display = 'none';
            return;
        }

        uploadSection.style.display = 'none';
        dashboardView.style.display = 'block';
        btnSaveServer.style.display = 'inline-flex';
        btnReset.style.display = 'inline-flex';

        // Extract dates min/max for filters
        let minDate = recruitmentData[0].from;
        let maxDate = recruitmentData[0].to;
        recruitmentData.forEach(r => {
            if (r.from < minDate) minDate = r.from;
            if (r.to > maxDate) maxDate = r.to;
        });

        filterStartDate.value = minDate;
        filterEndDate.value = maxDate;
        filterMonth.value = 'all';
        tableFilterMonth.value = 'all';
        tableSearch.value = '';
        currentPage = 1;

        applyFilters();
    }

    // --- Filter Application ---
    function applyFilters() {
        const start = filterStartDate.value;
        const end = filterEndDate.value;
        const monthVal = filterMonth.value;

        filteredData = recruitmentData.filter(row => {
            // Date bounds check
            const dateFromInRange = (!start || row.from >= start);
            const dateToInRange = (!end || row.to <= end);
            
            // Month matching check (e.g. Month = "06" matching Jun)
            let monthMatch = true;
            if (monthVal !== 'all') {
                const rowMonth = row.from.split('-')[1]; // YYYY-MM-DD
                monthMatch = (rowMonth === monthVal);
            }

            return dateFromInRange && dateToInRange && monthMatch;
        });

        // Sync main toolbar filters with table toolbar month filter
        tableFilterMonth.value = monthVal;

        updateKPIs();
        renderCharts();
        renderTable();
    }

    // --- Update KPI Cards ---
    function updateKPIs() {
        if (filteredData.length === 0) {
            kpiTotalReferrals.textContent = '0';
            kpiTotalRecruiters.textContent = '0';
            kpiAvgReferrals.textContent = '0.0';
            kpiTopRecruiterName.textContent = 'Tiada';
            kpiTopRecruiterCode.textContent = '-';
            kpiTopRecruiterCount.textContent = '0';
            return;
        }

        // Sum referrals & Group by recruiter to find unique recruiters
        let totalReferrals = 0;
        const recruiterMap = new Map();

        filteredData.forEach(row => {
            totalReferrals += row.referrals;
            if (recruiterMap.has(row.code)) {
                const record = recruiterMap.get(row.code);
                record.referrals += row.referrals;
            } else {
                recruiterMap.set(row.code, {
                    code: row.code,
                    name: row.name,
                    referrals: row.referrals
                });
            }
        });

        const recruitersList = Array.from(recruiterMap.values());
        const totalRecruiters = recruitersList.length;
        const avgReferrals = totalRecruiters > 0 ? (totalReferrals / totalRecruiters).toFixed(1) : '0.0';

        // Find Top Recruiter
        let topRecruiter = { name: 'Tiada', code: '-', referrals: 0 };
        recruitersList.forEach(rec => {
            if (rec.referrals > topRecruiter.referrals) {
                topRecruiter = rec;
            }
        });

        // Update DOM
        kpiTotalReferrals.textContent = totalReferrals.toLocaleString();
        kpiTotalRecruiters.textContent = totalRecruiters.toLocaleString();
        kpiAvgReferrals.textContent = avgReferrals;
        
        kpiTopRecruiterName.textContent = topRecruiter.name;
        kpiTopRecruiterCode.textContent = topRecruiter.code;
        kpiTopRecruiterCount.textContent = topRecruiter.referrals;
    }

    // --- Render Analytics Charts ---
    function renderCharts() {
        const tooltipConfig = {
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            titleColor: '#d97706',
            titleFont: { size: 13, weight: 'bold' },
            bodyColor: '#0f172a',
            borderColor: 'rgba(15, 23, 42, 0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8
        };

        // Aggregation 1: Monthly Referral Totals
        const monthNames = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
        const monthlyReferralsMap = new Map();
        
        // Initialize all months of 2026 for trend
        for(let i = 1; i <= 12; i++) {
            monthlyReferralsMap.set(String(i).padStart(2, '0'), 0);
        }

        filteredData.forEach(row => {
            const m = row.from.split('-')[1]; // MM
            if (monthlyReferralsMap.has(m)) {
                monthlyReferralsMap.set(m, monthlyReferralsMap.get(m) + row.referrals);
            }
        });

        const trendLabels = monthNames;
        const trendData = Array.from(monthlyReferralsMap.values());

        // Aggregation 2: Top 10 Recruiters
        const recruiterMap = new Map();
        filteredData.forEach(row => {
            if (recruiterMap.has(row.code)) {
                recruiterMap.get(row.code).referrals += row.referrals;
            } else {
                recruiterMap.set(row.code, {
                    code: row.code,
                    name: row.name,
                    referrals: row.referrals
                });
            }
        });
        const sortedRecruiters = Array.from(recruiterMap.values()).sort((a,b) => b.referrals - a.referrals);
        const top10Recruiters = sortedRecruiters.slice(0, 10);

        // Aggregation 3: Recruiter Distribution Segment (1, 2-5, 6-20, >20)
        let casualCount = 0;    // 1
        let mediumCount = 0;    // 2-5
        let proCount = 0;       // 6-20
        let superCount = 0;     // >20

        recruiterMap.forEach(rec => {
            if (rec.referrals === 1) casualCount++;
            else if (rec.referrals <= 5) mediumCount++;
            else if (rec.referrals <= 20) proCount++;
            else superCount++;
        });

        // --- Chart 1: Monthly Recruitment Trend ---
        const ctxTrend = document.getElementById('chart-recruitment-trend').getContext('2d');
        if (chartRecruitmentTrend) chartRecruitmentTrend.destroy();
        chartRecruitmentTrend = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Bilangan Rujukan',
                    data: trendData,
                    backgroundColor: 'rgba(143, 29, 56, 0.85)',
                    hoverBackgroundColor: '#8F1D38',
                    borderColor: '#8F1D38',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(15, 23, 42, 0.04)' },
                        ticks: { color: '#64748b', font: { family: 'Open Sans' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { family: 'Open Sans' } }
                    }
                }
            }
        });

        // --- Chart 2: Top 10 Recruiters Leaderboard ---
        const ctxTop = document.getElementById('chart-top-recruiters').getContext('2d');
        if (chartTopRecruiters) chartTopRecruiters.destroy();
        chartTopRecruiters = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: top10Recruiters.map(r => r.name.length > 15 ? r.name.substring(0, 15) + '..' : r.name),
                datasets: [{
                    label: 'Jumlah Rujukan',
                    data: top10Recruiters.map(r => r.referrals),
                    backgroundColor: 'rgba(184, 150, 13, 0.85)',
                    hoverBackgroundColor: '#B8960D',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        ...tooltipConfig,
                        callbacks: {
                            title: (context) => {
                                const index = context[0].dataIndex;
                                return `${top10Recruiters[index].name} (${top10Recruiters[index].code})`;
                            }
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(15, 23, 42, 0.04)' },
                        ticks: { color: '#64748b', font: { family: 'Open Sans' } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { family: 'Open Sans', size: 11 } }
                    }
                }
            }
        });

        // --- Chart 3: Segment Profile ---
        const ctxSeg = document.getElementById('chart-segment-distribution').getContext('2d');
        if (chartSegmentDistribution) chartSegmentDistribution.destroy();
        chartSegmentDistribution = new Chart(ctxSeg, {
            type: 'doughnut',
            data: {
                labels: ['Casual (1)', 'Sederhana (2-5)', 'Pro (6-20)', 'Super Perekrut (>20)'],
                datasets: [{
                    data: [casualCount, mediumCount, proCount, superCount],
                    backgroundColor: [
                        '#94a3b8', // Casual
                        '#0284c7', // Medium
                        '#7c3aed', // Pro
                        '#B8960D'  // Super
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { family: 'Open Sans', size: 11 },
                            padding: 12
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // --- Render Table Records ---
    function renderTable() {
        const query = tableSearch.value.toLowerCase().trim();
        const monthVal = tableFilterMonth.value;

        // Perform table query filtering (Month + Search query)
        let tableData = filteredData.filter(row => {
            const codeMatch = row.code.toLowerCase().includes(query);
            const nameMatch = row.name.toLowerCase().includes(query);
            
            let monthMatch = true;
            if (monthVal !== 'all') {
                const rowMonth = row.from.split('-')[1];
                monthMatch = (rowMonth === monthVal);
            }
            return (codeMatch || nameMatch) && monthMatch;
        });

        // Sort data
        tableData.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];
            
            // Custom rankings column sorting
            if (currentSortColumn === 'rank') {
                valA = a.referrals;
                valB = b.referrals;
            }

            if (typeof valA === 'string') {
                return currentSortAscending 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            } else {
                return currentSortAscending 
                    ? valA - valB 
                    : valB - valA;
            }
        });

        // Paginate
        const totalRows = tableData.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
        const paginatedData = tableData.slice(startIndex, endIndex);

        // Generate Rows
        tableBody.innerHTML = '';
        if (paginatedData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 30px; color: var(--text-muted);">Tiada data ditemui padanan tapisan ini</td></tr>`;
            paginationInfo.textContent = `Menunjukkan 0 hingga 0 daripada 0 entri`;
            paginationControls.innerHTML = '';
            return;
        }

        paginatedData.forEach((row, i) => {
            const displayIndex = startIndex + i + 1;
            const dateStr = `${formatDisplayDate(row.from)} hingga ${formatDisplayDate(row.to)}`;
            
            // Highlight super referrers
            const isSuper = row.referrals >= 20;
            const rowClass = isSuper ? 'style="font-weight: 600; background-color: rgba(184, 150, 13, 0.03);"' : '';

            tableBody.innerHTML += `
                <tr ${rowClass}>
                    <td class="text-center">${displayIndex}</td>
                    <td><code style="color: var(--crimson); font-weight: bold;">${row.code}</code></td>
                    <td>${row.name}</td>
                    <td class="text-center" style="font-size: 13px; color: var(--text-muted);">${dateStr}</td>
                    <td class="text-center" style="font-weight: bold; color: ${isSuper ? 'var(--gold-dark)' : 'inherit'}">${row.referrals}</td>
                </tr>
            `;
        });

        paginationInfo.textContent = `Menunjukkan ${startIndex + 1} hingga ${endIndex} daripada ${totalRows} entri`;
        
        // Generate Pagination Buttons
        renderPaginationButtons(totalPages);
    }

    function renderPaginationButtons(totalPages) {
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        // Prev Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-outline btn-sm';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            currentPage--;
            renderTable();
        });
        paginationControls.appendChild(prevBtn);

        // Page Numbers (Show max 5 pages around current)
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            paginationControls.appendChild(pageBtn);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-outline btn-sm';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            currentPage++;
            renderTable();
        });
        paginationControls.appendChild(nextBtn);
    }

    function formatDisplayDate(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // --- Table Sorting Interaction ---
    document.querySelectorAll('#recruitment-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortCol = th.getAttribute('data-sort');
            
            if (currentSortColumn === sortCol) {
                currentSortAscending = !currentSortAscending;
            } else {
                currentSortColumn = sortCol;
                currentSortAscending = true;
            }

            // Update Sort Icons in headers
            document.querySelectorAll('#recruitment-table th.sortable i').forEach(icon => {
                icon.className = 'fa-solid fa-sort';
            });
            
            const icon = th.querySelector('i');
            icon.className = currentSortAscending ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';

            renderTable();
        });
    });

    // --- Filters Event Listeners ---
    filterStartDate.addEventListener('change', applyFilters);
    filterEndDate.addEventListener('change', applyFilters);
    filterMonth.addEventListener('change', (e) => {
        filterMonth.value = e.target.value;
        applyFilters();
    });
    tableFilterMonth.addEventListener('change', (e) => {
        filterMonth.value = e.target.value;
        applyFilters();
    });
    tableSearch.addEventListener('input', () => {
        currentPage = 1;
        renderTable();
    });

    // --- Save Data to Server ---
    btnSaveServer.addEventListener('click', () => {
        saveDataToServer(true);
    });

    function saveDataToServer(showAlert) {
        if (recruitmentData.length === 0) return;
        
        btnSaveServer.setAttribute('disabled', 'true');
        btnSaveServer.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        
        fetch('save_recruitment_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: 'gbgold2026',
                data: recruitmentData
            })
        })
        .then(response => response.json())
        .then(res => {
            btnSaveServer.removeAttribute('disabled');
            btnSaveServer.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Server';
            if (res.success) {
                if (showAlert) alert('Berjaya menyimpan data rekrutmen ke server.');
            } else {
                alert('Ralat menyimpan data: ' + res.message);
            }
        })
        .catch(err => {
            btnSaveServer.removeAttribute('disabled');
            btnSaveServer.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Server';
            alert('Ralat rangkaian: ' + err.message);
        });
    }

    // --- Load Data from Server ---
    function loadDataFromServer() {
        fetch('recruitment_data.json?v=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error('Data file not found');
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                recruitmentData = data;
                initDashboard();
            }
        })
        .catch(err => {
            console.log('No existing server data loaded:', err.message);
            initDashboard(); // fallback to upload screen
        });
    }

    // --- Reset Dashboard ---
    btnReset.addEventListener('click', () => {
        if (confirm('Adakah anda pasti untuk mengosongkan semua data rekrutmen sedia ada? Halaman akan dimuat semula.')) {
            // Send empty array to server to clear
            fetch('save_recruitment_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'gbgold2026',
                    data: []
                })
            })
            .then(() => {
                recruitmentData = [];
                location.reload();
            })
            .catch(err => {
                alert('Ralat mengosongkan data: ' + err.message);
            });
        }
    });

    // --- Export CSV Logic ---
    btnExportCsv.addEventListener('click', () => {
        if (filteredData.length === 0) return;

        let csvContent = "No.,Kod Pelanggan,Nama Pelanggan,Tarikh Mula,Tarikh Tamat,Rujukan\n";
        filteredData.forEach((row, index) => {
            const cleanName = row.name.replace(/"/g, '""');
            csvContent += `${index+1},${row.code},"${cleanName}",${row.from},${row.to},${row.referrals}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Laporan_Rekrutmen_GBGold_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- Export Excel Logic ---
    btnExportXlsx.addEventListener('click', () => {
        if (filteredData.length === 0) return;

        const tableData = filteredData.map((row, index) => ({
            "No.": index + 1,
            "Kod Pelanggan": row.code,
            "Nama Pelanggan": row.name,
            "Tarikh Mula": row.from,
            "Tarikh Tamat": row.to,
            "Jumlah Rujukan": row.referrals
        }));

        const worksheet = XLSX.utils.json_to_sheet(tableData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rekrutmen");
        
        // Auto sizing columns
        const max_len = tableData.reduce((w, r) => Math.max(w, r["Nama Pelanggan"].length), 15);
        worksheet["!cols"] = [ {wch: 6}, {wch: 15}, {wch: max_len + 3}, {wch: 12}, {wch: 12}, {wch: 15} ];

        XLSX.writeFile(workbook, `Laporan_Rekrutmen_GBGold_${new Date().toISOString().split('T')[0]}.xlsx`);
    });

    // --- Load Demo Data ---
    btnLoadDemo.addEventListener('click', () => {
        const demoRecruits = getDemoRecruitmentData();
        recruitmentData = demoRecruits;
        initDashboard();
        saveDataToServer(false);
    });

    // --- Generating Demo Data ---
    function getDemoRecruitmentData() {
        const months = ["01", "02", "03", "04", "05", "06"];
        const year = "2026";
        const demoData = [];

        // Main template names from screenshot
        const recruiters = [
            { code: "GB00000001", name: "GB GOLD HQ" },
            { code: "GB00000005", name: "SU RAIHAN MOHAMED" },
            { code: "GB00000006", name: "NASRUL HANIS BIN ABD HALIM" },
            { code: "GB00000011", name: "MUHAMMAD ALIF BIN MOHD SATAR" },
            { code: "GB00000013", name: "NORAZLINA NAJMUDIN" },
            { code: "GB00000015", name: "SAFRI BIN SOFYART" },
            { code: "GB00000363", name: "SUHAIZAH BINTI ABDUL WAHAB" },
            { code: "GB00000367", name: "HALIL BIN ISMAIL" },
            { code: "GB00000400", name: "MUHAMMAD DANISH ARRAZIN BIN MOHD RAZIP" },
            { code: "GB00000545", name: "SHUHAIRAZI BIN JANUDIN @ SHAMSUDIN" },
            { code: "GB00000559", name: "MOHD NORFAHIZ BIN MOHD PATHAN" },
            { code: "GB00000630", name: "AHMED AKMAL BIN ABDULL WAHID" },
            { code: "GB00000770", name: "MUHAMMAD BADDRUN BIN MOHD SALLEH" },
            { code: "GB00000778", name: "ASMA AMANI BINTI RAMON ZAHEDIN" },
            { code: "GB00000779", name: "NORFADZRINA BINTI KAMARUDDIN" },
            { code: "GB00000861", name: "ABDUL HAQIM BIN ABDUL RAHIM" },
            { code: "GB00000889", name: "NURUL AIN BINTI ABD AZIZ" },
            { code: "GB00001008", name: "HAWINA BINTI MORSHIDI" },
            { code: "GB00001456", name: "ABD RAHIM BIN HAJI MAHMOOD" },
            { code: "GB00001566", name: "KHATIJAH KAMARUDIN" },
            { code: "GB00001716", name: "SYAHMILFARIS BIN JAAFAR" },
            { code: "GB00001747", name: "ZURIANA BINTI MOHD JAMAL" },
            { code: "GB00002274", name: "MOHAMAD SHAHREL BIN MOHD YUDIN" },
            { code: "GB00002312", name: "MOHD AMIRON BIN ROSLI" },
            { code: "GB00002346", name: "JOHARI BIN YAZID" },
            { code: "GB00002391", name: "MOHD NORHAZIM BIN MOHD NORIN" },
            { code: "GB00002419", name: "AHMAD FAUZAN BIN AHMAD ANUAR" },
            { code: "GB00002622", name: "YAATI BINTI NOR" }
        ];

        // Specific values for June 2026 matching user's screenshot exactly
        const juneReferrals = {
            "GB00000001": 5, "GB00000005": 3, "GB00000006": 20, "GB00000011": 3,
            "GB00000013": 23, "GB00000015": 53, "GB00000363": 1, "GB00000367": 3,
            "GB00000400": 1, "GB00000545": 18, "GB00000559": 1, "GB00000630": 1,
            "GB00000770": 1, "GB00000778": 1, "GB00000779": 2, "GB00000861": 1,
            "GB00000889": 5, "GB00001008": 1, "GB00001456": 2, "GB00001566": 1,
            "GB00001716": 1, "GB00001747": 2, "GB00002274": 2, "GB00002312": 5,
            "GB00002346": 1, "GB00002391": 1, "GB00002419": 1, "GB00002622": 45
        };

        months.forEach(m => {
            const isJune = (m === "06");
            const daysInMonth = new Date(year, parseInt(m), 0).getDate();
            const fromDate = `${year}-${m}-01`;
            const toDate = `${year}-${m}-${daysInMonth}`;

            recruiters.forEach(rec => {
                let referrals = 0;
                
                if (isJune) {
                    // Match user screenshot exactly for June
                    referrals = juneReferrals[rec.code] !== undefined ? juneReferrals[rec.code] : 0;
                } else {
                    // Generate nice simulated historical data for Jan - May
                    const seed = parseInt(rec.code.replace("GB", "")) || 1;
                    const rand = Math.sin(seed * parseInt(m)) * 10;
                    
                    if (rec.code === "GB00000015") {
                        referrals = Math.floor(25 + rand * 10); // Super recruiter
                    } else if (rec.code === "GB00002622") {
                        referrals = Math.floor(20 + rand * 8);
                    } else if (rec.code === "GB00000013") {
                        referrals = Math.floor(15 + rand * 6);
                    } else if (rec.code === "GB00000006") {
                        referrals = Math.floor(10 + rand * 4);
                    } else if (rec.code === "GB00000545") {
                        referrals = Math.floor(8 + rand * 3);
                    } else {
                        // Regular recruiters bring 0 to 4 people
                        referrals = Math.max(0, Math.floor((rand + 5) / 3));
                    }
                }

                if (referrals > 0) {
                    demoData.push({
                        code: rec.code,
                        name: rec.name,
                        from: fromDate,
                        to: toDate,
                        referrals: referrals
                    });
                }
            });
        });

        return demoData;
    }
});
