// GBGold Integrated Sales & Recruitment Dashboard - App Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // --- 1. SPA TAB SWITCHER NAVIGATION ---
    // ==========================================
    const btnNavSales = document.getElementById('btn-nav-sales');
    const btnNavRecruitment = document.getElementById('btn-nav-recruitment');
    const salesContainer = document.getElementById('sales-dashboard-container');
    const recruitmentContainer = document.getElementById('recruitment-dashboard-container');

    btnNavSales.addEventListener('click', (e) => {
        e.preventDefault();
        btnNavSales.classList.add('active');
        btnNavRecruitment.classList.remove('active');
        salesContainer.style.display = 'block';
        recruitmentContainer.style.display = 'none';
        
        // Trigger Chart.js resizes to handle hidden container drawing quirks
        triggerSalesChartResizes();
    });

    btnNavRecruitment.addEventListener('click', (e) => {
        e.preventDefault();
        btnNavRecruitment.classList.add('active');
        btnNavSales.classList.remove('active');
        salesContainer.style.display = 'none';
        recruitmentContainer.style.display = 'block';
        
        // Trigger Recruitment Chart resizes
        triggerRecruitmentChartResizes();
    });

    function triggerSalesChartResizes() {
        if (chartSalesTrend) chartSalesTrend.resize();
        if (chartWeightCompare) chartWeightCompare.resize();
        if (chartWeightMonthly) chartWeightMonthly.resize();
        if (chartPriceTrend) chartPriceTrend.resize();
        if (chartPriceMonthly) chartPriceMonthly.resize();
        if (chartContribution) chartContribution.resize();
        if (chartMonthlySales) chartMonthlySales.resize();
    }

    function triggerRecruitmentChartResizes() {
        if (chartRecruitmentTrend) chartRecruitmentTrend.resize();
        if (chartRecruitmentTopRecruiters) chartRecruitmentTopRecruiters.resize();
        if (chartRecruitmentSegmentDistribution) chartRecruitmentSegmentDistribution.resize();
    }

    // ==========================================
    // --- 2. STATE MANAGEMENT ---
    // ==========================================
    // --- Sales Dashboard State ---
    let gbsData = null;      
    let retailData = null;   
    let combinedData = [];   
    let filteredData = [];   
    
    let currentSortColumn = 'date';
    let currentSortAscending = true;
    let currentPage = 1;
    const rowsPerPage = 31;

    let chartSalesTrend = null;
    let chartWeightCompare = null;
    let chartWeightMonthly = null;
    let chartPriceTrend = null;
    let chartPriceMonthly = null;
    let chartContribution = null;
    let chartMonthlySales = null;

    // --- Recruitment Dashboard State ---
    let recruitmentData = []; 
    let filteredRecruitmentData = []; 
    
    let currentRecruitmentSortColumn = 'referrals';
    let currentRecruitmentSortAscending = false;
    let currentRecruitmentPage = 1;
    const recruitmentRowsPerPage = 20;

    let chartRecruitmentTrend = null;
    let chartRecruitmentTopRecruiters = null;
    let chartRecruitmentSegmentDistribution = null;

    // ==========================================
    // --- 3. DOM ELEMENTS ---
    // ==========================================
    // --- Sales DOM Elements ---
    const dropZoneGbs = document.getElementById('drop-zone-gbs');
    const dropZoneRetail = document.getElementById('drop-zone-retail');
    const fileGbsInput = document.getElementById('file-gbs');
    const fileRetailInput = document.getElementById('file-retail');
    const gbsFileInfo = document.getElementById('gbs-file-info');
    const retailFileInfo = document.getElementById('retail-file-info');
    
    const btnProcess = document.getElementById('btn-process');
    const btnLoadDemo = document.getElementById('btn-load-demo');
    const btnSaveServer = document.getElementById('btn-save-server');
    const btnReset = document.getElementById('btn-reset');
    
    const uploadSection = document.getElementById('upload-section');
    const dashboardView = document.getElementById('dashboard-view');
    
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterMonth = document.getElementById('filter-month');
    const tableFilterMonth = document.getElementById('table-filter-month');
    const tableSearch = document.getElementById('table-search');
    
    const kpiTotalSales = document.getElementById('kpi-total-sales');
    const kpiSubGbsSales = document.getElementById('kpi-sub-gbs-sales');
    const kpiSubRetailSales = document.getElementById('kpi-sub-retail-sales');
    const kpiTotalWeight = document.getElementById('kpi-total-weight');
    const kpiSubGbsWeight = document.getElementById('kpi-sub-gbs-weight');
    const kpiSubRetailWeight = document.getElementById('kpi-sub-retail-weight');
    const kpiAvgPrice = document.getElementById('kpi-avg-price');
    const kpiSubGbsPrice = document.getElementById('kpi-sub-gbs-price');
    const kpiSubRetailPrice = document.getElementById('kpi-sub-retail-price');
    const kpiTotalTx = document.getElementById('kpi-total-tx');
    const kpiSubGbsTx = document.getElementById('kpi-sub-gbs-tx');
    const kpiSubRetailTx = document.getElementById('kpi-sub-retail-tx');
    
    const tableBody = document.getElementById('table-body');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationControls = document.getElementById('pagination-controls');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnExportXlsx = document.getElementById('btn-export-xlsx');

    // --- Recruitment DOM Elements ---
    const dropZoneRecruitment = document.getElementById('drop-zone-recruitment');
    const fileRecruitmentInput = document.getElementById('file-recruitment');
    const recruitmentFileInfo = document.getElementById('recruitment-file-info');
    
    const btnRecruitmentProcess = document.getElementById('btn-recruitment-process');
    const btnRecruitmentLoadDemo = document.getElementById('btn-recruitment-load-demo');
    const btnRecruitmentSaveServer = document.getElementById('btn-recruitment-save-server');
    const btnRecruitmentReset = document.getElementById('btn-recruitment-reset');
    
    const recruitmentUploadSection = document.getElementById('recruitment-upload-section');
    const recruitmentDashboardView = document.getElementById('recruitment-dashboard-view');
    
    const filterRecruitmentStartDate = document.getElementById('filter-recruitment-start-date');
    const filterRecruitmentEndDate = document.getElementById('filter-recruitment-end-date');
    const filterRecruitmentMonth = document.getElementById('filter-recruitment-month');
    const tableRecruitmentFilterMonth = document.getElementById('table-recruitment-filter-month');
    const tableRecruitmentSearch = document.getElementById('table-recruitment-search');
    
    const kpiTotalReferrals = document.getElementById('kpi-total-referrals');
    const kpiTotalRecruiters = document.getElementById('kpi-total-recruiters');
    const kpiAvgReferrals = document.getElementById('kpi-recruitment-avg-referrals');
    const kpiTopRecruiterName = document.getElementById('kpi-recruitment-top-recruiter-name');
    const kpiTopRecruiterCode = document.getElementById('kpi-recruitment-top-recruiter-code');
    const kpiTopRecruiterCount = document.getElementById('kpi-recruitment-top-recruiter-count');
    
    const tableRecruitmentBody = document.getElementById('table-recruitment-body');
    const paginationRecruitmentInfo = document.getElementById('pagination-recruitment-info');
    const paginationRecruitmentControls = document.getElementById('pagination-recruitment-controls');
    const btnRecruitmentExportCsv = document.getElementById('btn-recruitment-export-csv');
    const btnRecruitmentExportXlsx = document.getElementById('btn-recruitment-export-xlsx');

    let uploadedRawRecruitmentRows = [];

    // ==========================================
    // --- 4. STARTUP AUTOMATION (LOAD SERVER DATA) ---
    // ==========================================
    loadSalesDataFromServer();
    loadRecruitmentDataFromServer();

    // ==========================================
    // --- 5. DRAG & DROP & PARSING LOGIC ---
    // ==========================================
    setupDragAndDrop(dropZoneGbs, fileGbsInput, (files) => handleFilesSelect(files, 'gbs'));
    setupDragAndDrop(dropZoneRetail, fileRetailInput, (files) => handleFilesSelect(files, 'retail'));
    setupDragAndDrop(dropZoneRecruitment, fileRecruitmentInput, handleRecruitmentFilesSelect);

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

    // --- Files Selection Processors (CSV / XLSX Parser) ---
    function handleFilesSelect(files, type) {
        const fileInfoSpan = type === 'gbs' ? gbsFileInfo : retailFileInfo;
        const dropZone = type === 'gbs' ? dropZoneGbs : dropZoneRetail;
        
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;
        
        fileInfoSpan.textContent = `${filesArray.length} fail terpilih...`;
        dropZone.classList.add('has-file');
        
        const promises = filesArray.map(file => parseSingleFile(file));
        
        Promise.all(promises)
            .then(allDataSets => {
                const combinedRows = [].concat(...allDataSets);
                processParsedSalesData(combinedRows, type);
                
                const totalSize = filesArray.reduce((acc, f) => acc + f.size, 0);
                fileInfoSpan.textContent = `${filesArray.length} fail (${formatBytes(totalSize)})`;
            })
            .catch(err => {
                alert(err.message);
                fileInfoSpan.textContent = 'Sila pilih atau tarik satu atau lebih fail ke sini';
                dropZone.classList.remove('has-file');
                if (type === 'gbs') gbsData = null;
                else retailData = null;
                btnProcess.setAttribute('disabled', 'true');
            });
    }

    function handleRecruitmentFilesSelect(files) {
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;
        
        recruitmentFileInfo.textContent = `${filesArray.length} fail terpilih...`;
        dropZoneRecruitment.classList.add('has-file');
        
        const promises = filesArray.map(file => parseSingleFile(file));
        
        Promise.all(promises)
            .then(allDataSets => {
                const combinedRows = [].concat(...allDataSets);
                uploadedRawRecruitmentRows = cleanRecruitmentData(combinedRows);
                
                if (uploadedRawRecruitmentRows.length > 0) {
                    btnRecruitmentProcess.removeAttribute('disabled');
                    const totalSize = filesArray.reduce((acc, f) => acc + f.size, 0);
                    recruitmentFileInfo.textContent = `${filesArray.length} fail (${formatBytes(totalSize)}) - Sedia diproses`;
                } else {
                    throw new Error("Tiada data rekrutmen sah yang dijumpai dalam fail.");
                }
            })
            .catch(err => {
                alert(err.message);
                recruitmentFileInfo.textContent = 'Sila pilih atau tarik satu atau lebih fail ke sini';
                dropZoneRecruitment.classList.remove('has-file');
                uploadedRawRecruitmentRows = [];
                btnRecruitmentProcess.setAttribute('disabled', 'true');
            });
    }

    function parseSingleFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            if (file.name.endsWith('.csv')) {
                reader.onload = function(e) {
                    Papa.parse(e.target.result, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => resolve(results.data),
                        error: (err) => reject(new Error(`Ralat membaca ${file.name}: ${err.message}`))
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
    }

    // ==========================================
    // --- 6. DATA CLEANING & SUMMING LOGIC ---
    // ==========================================
    // --- Sales Data Cleaners ---
    function processParsedSalesData(data, type) {
        if (type === 'gbs') {
            gbsData = cleanGbsData(data);
        } else {
            retailData = cleanRetailData(data);
        }
        
        if (gbsData && gbsData.length > 0 && retailData && retailData.length > 0) {
            btnProcess.removeAttribute('disabled');
        }
    }

    function cleanGbsData(data) {
        const rawRows = data.map(row => {
            const dateKey = findKey(row, 'date');
            const txKey = findKey(row, 'transaction');
            const weightKey = findKey(row, 'weight');
            const salesKey = findKey(row, 'sales');
            const idsKey = findKey(row, 'id');
            
            const parsedDate = parseDate(row[dateKey]);
            if (!parsedDate) return null;
            
            return {
                date: parsedDate,
                transactions: parseInt(cleanNumString(row[txKey])) || 0,
                weight: parseFloat(cleanNumString(row[weightKey])) || 0,
                sales: parseFloat(cleanNumString(row[salesKey])) || 0,
                ids: String(row[idsKey] || "").trim()
            };
        }).filter(row => row !== null);

        const dateMap = new Map();
        rawRows.forEach(row => {
            if (dateMap.has(row.date)) {
                const existing = dateMap.get(row.date);
                existing.transactions += row.transactions;
                existing.weight += row.weight;
                existing.sales += row.sales;
                if (row.ids) {
                    existing.ids = existing.ids ? `${existing.ids}, ${row.ids}` : row.ids;
                }
            } else {
                dateMap.set(row.date, { ...row });
            }
        });

        return Array.from(dateMap.values());
    }

    function cleanRetailData(data) {
        const rawRows = data.map(row => {
            const dateKey = findKey(row, 'date');
            const ordersKey = findKey(row, 'order');
            const weightKey = findKey(row, 'weight');
            const premiumKey = findKey(row, 'premium');
            const shipmentKey = findKey(row, 'shipment');
            const salesKey = findKey(row, 'sales');
            const idsKey = findKey(row, 'id');
            
            const parsedDate = parseDate(row[dateKey]);
            if (!parsedDate) return null;
            
            return {
                date: parsedDate,
                orders: parseInt(cleanNumString(row[ordersKey])) || 0,
                weight: parseFloat(cleanNumString(row[weightKey])) || 0,
                premium: parseFloat(cleanNumString(row[premiumKey])) || 0,
                shipment: parseFloat(cleanNumString(row[shipmentKey])) || 0,
                sales: parseFloat(cleanNumString(row[salesKey])) || 0,
                ids: String(row[idsKey] || "").trim()
            };
        }).filter(row => row !== null);

        const dateMap = new Map();
        rawRows.forEach(row => {
            if (dateMap.has(row.date)) {
                const existing = dateMap.get(row.date);
                existing.orders += row.orders;
                existing.weight += row.weight;
                existing.premium += row.premium;
                existing.shipment += row.shipment;
                existing.sales += row.sales;
                if (row.ids) {
                    existing.ids = existing.ids ? `${existing.ids}, ${row.ids}` : row.ids;
                }
            } else {
                dateMap.set(row.date, { ...row });
            }
        });

        return Array.from(dateMap.values());
    }

    // --- Recruitment Data Cleaners ---
    function cleanRecruitmentData(data) {
        return data.map(row => {
            const codeKey = findKey(row, 'customercode') || findKey(row, 'code');
            const nameKey = findKey(row, 'customername') || findKey(row, 'name');
            const fromKey = findKey(row, 'from');
            const toKey = findKey(row, 'to');
            const referralsKey = findKey(row, 'referrals') || findKey(row, 'referral');

            const rawCode = String(row[codeKey] || "").trim();
            const rawName = String(row[nameKey] || "").trim();
            const referralsCount = parseInt(cleanNumString(row[referralsKey])) || 0;

            if (!rawCode || !rawCode.startsWith('GB')) return null;

            const parsedFrom = parseDate(row[fromKey]);
            const parsedTo = parseDate(row[toKey]);

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
        if (typeof dateVal === 'number' || (!isNaN(dateVal) && !isNaN(parseFloat(dateVal)) && String(dateVal).length <= 6)) {
            const excelDate = parseFloat(dateVal);
            const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            return jsDate.toISOString().split('T')[0];
        }
        
        const dateStr = String(dateVal).trim();
        const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${year}-${month}-${day}`;
        }
        
        const ymdMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
        if (ymdMatch) {
            const year = ymdMatch[1];
            const month = ymdMatch[2].padStart(2, '0');
            const day = ymdMatch[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
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

    // ==========================================
    // --- 7. DATA MERGES & ALIGNMENTS ---
    // ==========================================
    // --- Sales Merge (Full Outer Join) ---
    function mergeSalesDatasets() {
        const dateMap = new Map();
        
        gbsData.forEach(gbsRow => {
            dateMap.set(gbsRow.date, {
                date: gbsRow.date,
                gbs_tx: gbsRow.transactions,
                gbs_wt: gbsRow.weight,
                gbs_sales: gbsRow.sales,
                gbs_ids: gbsRow.ids,
                ret_tx: 0,
                ret_wt: 0,
                ret_prem: 0,
                ret_ship: 0,
                ret_sales: 0,
                ret_ids: ""
            });
        });
        
        retailData.forEach(retRow => {
            if (dateMap.has(retRow.date)) {
                const row = dateMap.get(retRow.date);
                row.ret_tx = retRow.orders;
                row.ret_wt = retRow.weight;
                row.ret_prem = retRow.premium;
                row.ret_ship = retRow.shipment;
                row.ret_sales = retRow.sales;
                row.ret_ids = retRow.ids;
            } else {
                dateMap.set(retRow.date, {
                    date: retRow.date,
                    gbs_tx: 0,
                    gbs_wt: 0,
                    gbs_sales: 0,
                    gbs_ids: "",
                    ret_tx: retRow.orders,
                    ret_wt: retRow.weight,
                    ret_prem: retRow.premium,
                    ret_ship: retRow.shipment,
                    ret_sales: retRow.sales,
                    ret_ids: retRow.ids
                });
            }
        });
        
        combinedData = Array.from(dateMap.values()).map(row => {
            const total_wt = row.gbs_wt + row.ret_wt;
            const total_sales = row.gbs_sales + row.ret_sales;
            return {
                ...row,
                total_wt: total_wt,
                total_sales: total_sales
            };
        });
        
        combinedData.sort((a, b) => a.date.localeCompare(b.date));
    }

    // --- Recruitment Merge ---
    function mergeRecruitmentRows(existing, newRows) {
        const merged = [...existing];
        newRows.forEach(newRow => {
            const index = merged.findIndex(r => r.code === newRow.code && r.from === newRow.from && r.to === newRow.to);
            if (index !== -1) {
                merged[index] = newRow; 
            } else {
                merged.push(newRow); 
            }
        });
        return merged;
    }

    // ==========================================
    // --- 8. PROCESS ACTIONS ---
    // ==========================================
    // --- Process Sales Data ---
    btnProcess.addEventListener('click', () => {
        if (!gbsData || !retailData) return;
        
        mergeSalesDatasets();
        
        fileGbsInput.value = '';
        fileRetailInput.value = '';
        gbsFileInfo.textContent = 'Sila pilih atau tarik satu atau lebih fail ke sini';
        retailFileInfo.textContent = 'Sila pilih atau tarik satu atau lebih fail ke sini';
        dropZoneGbs.classList.remove('has-file');
        dropZoneRetail.classList.remove('has-file');
        btnProcess.setAttribute('disabled', 'true');
        
        initSalesDashboard();
        saveSalesDataToServer(false);
    });

    // --- Process Recruitment Data ---
    btnRecruitmentProcess.addEventListener('click', () => {
        if (uploadedRawRecruitmentRows.length === 0) return;
        
        recruitmentData = mergeRecruitmentRows(recruitmentData, uploadedRawRecruitmentRows);
        uploadedRawRecruitmentRows = [];
        
        fileRecruitmentInput.value = '';
        recruitmentFileInfo.textContent = 'Sila pilih atau tarik satu atau lebih fail ke sini';
        dropZoneRecruitment.classList.remove('has-file');
        btnRecruitmentProcess.setAttribute('disabled', 'true');
        
        initRecruitmentDashboard();
        saveRecruitmentDataToServer(false);
    });

    // ==========================================
    // --- 9. SALES DASHBOARD DISPLAY LOGIC ---
    // ==========================================
    function initSalesDashboard() {
        if (combinedData.length === 0) {
            uploadSection.style.display = 'block';
            dashboardView.style.display = 'none';
            btnSaveServer.style.display = 'none';
            btnReset.style.display = 'none';
            document.getElementById('btn-toggle-upload').style.display = 'none';
            return;
        }

        uploadSection.style.display = 'none';
        dashboardView.style.display = 'block';
        btnSaveServer.style.display = 'inline-flex';
        btnReset.style.display = 'inline-flex';
        document.getElementById('btn-toggle-upload').style.display = 'inline-flex';
        document.getElementById('btn-toggle-upload').innerHTML = '<i class="fa-solid fa-file-import"></i> Import Fail';

        let minDate = combinedData[0].date;
        let maxDate = combinedData[combinedData.length - 1].date;

        filterStartDate.value = minDate;
        filterEndDate.value = maxDate;
        filterMonth.value = 'all';
        tableFilterMonth.value = 'all';
        tableSearch.value = '';
        currentPage = 1;

        applySalesFilters();
    }

    function applySalesFilters() {
        const start = filterStartDate.value;
        const end = filterEndDate.value;
        const monthVal = filterMonth.value;

        filteredData = combinedData.filter(row => {
            const dateInRange = (!start || row.date >= start) && (!end || row.date <= end);
            
            let monthMatch = true;
            if (monthVal !== 'all') {
                const rowMonth = row.date.split('-')[1];
                monthMatch = (rowMonth === monthVal);
            }
            return dateInRange && monthMatch;
        });

        tableFilterMonth.value = monthVal;

        updateSalesKPIs();
        renderSalesLeaderboards();
        renderSalesCharts();
        renderSalesTable();
    }

    function updateSalesKPIs() {
        if (filteredData.length === 0) {
            kpiTotalSales.textContent = 'RM 0.00';
            kpiSubGbsSales.textContent = 'RM 0';
            kpiSubRetailSales.textContent = 'RM 0';
            kpiTotalWeight.textContent = '0.00 g';
            kpiSubGbsWeight.textContent = '0 g';
            kpiSubRetailWeight.textContent = '0 g';
            kpiAvgPrice.textContent = 'RM 0.00/g';
            kpiSubGbsPrice.textContent = 'RM 0/g';
            kpiSubRetailPrice.textContent = 'RM 0/g';
            kpiTotalTx.textContent = '0';
            kpiSubGbsTx.textContent = '0';
            kpiSubRetailTx.textContent = '0';
            return;
        }

        let totalGbsSales = 0, totalRetailSales = 0;
        let totalGbsWeight = 0, totalRetailWeight = 0;
        let totalGbsTx = 0, totalRetailTx = 0;

        filteredData.forEach(row => {
            totalGbsSales += row.gbs_sales;
            totalRetailSales += row.ret_sales;
            totalGbsWeight += row.gbs_wt;
            totalRetailWeight += row.ret_wt;
            totalGbsTx += row.gbs_tx;
            totalRetailTx += row.ret_tx;
        });

        const totalSales = totalGbsSales + totalRetailSales;
        const totalWeight = totalGbsWeight + totalRetailWeight;
        const totalTx = totalGbsTx + totalRetailTx;

        const avgPrice = totalWeight > 0 ? totalSales / totalWeight : 0;
        const avgGbsPrice = totalGbsWeight > 0 ? totalGbsSales / totalGbsWeight : 0;
        const avgRetailPrice = totalRetailWeight > 0 ? totalRetailSales / totalRetailWeight : 0;

        kpiTotalSales.textContent = `RM ${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        kpiSubGbsSales.textContent = `RM ${Math.round(totalGbsSales).toLocaleString()}`;
        kpiSubRetailSales.textContent = `RM ${Math.round(totalRetailSales).toLocaleString()}`;

        kpiTotalWeight.textContent = `${totalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
        kpiSubGbsWeight.textContent = `${Math.round(totalGbsWeight).toLocaleString()} g`;
        kpiSubRetailWeight.textContent = `${Math.round(totalRetailWeight).toLocaleString()} g`;

        kpiAvgPrice.textContent = `RM ${avgPrice.toFixed(2)}/g`;
        kpiSubGbsPrice.textContent = `RM ${avgGbsPrice.toFixed(2)}/g`;
        kpiSubRetailPrice.textContent = `RM ${avgRetailPrice.toFixed(2)}/g`;

        kpiTotalTx.textContent = totalTx.toLocaleString();
        kpiSubGbsTx.textContent = totalGbsTx.toLocaleString();
        kpiSubRetailTx.textContent = totalRetailTx.toLocaleString();
    }

    function renderSalesLeaderboards() {
        const monthlyBreakdown = groupSalesByMonth(filteredData);
        
        const sortedBySales = [...monthlyBreakdown].sort((a,b) => b.sales - a.sales);
        const sortedByWeight = [...monthlyBreakdown].sort((a,b) => b.weight - a.weight);

        const salesList = document.getElementById('sales-leaderboard-list');
        const weightList = document.getElementById('weight-leaderboard-list');

        salesList.innerHTML = '';
        weightList.innerHTML = '';

        if (monthlyBreakdown.length === 0) {
            salesList.innerHTML = '<p class="text-center" style="padding: 20px; color: var(--text-muted);">Tiada data bulanan</p>';
            weightList.innerHTML = '<p class="text-center" style="padding: 20px; color: var(--text-muted);">Tiada data bulanan</p>';
            return;
        }

        const maxSalesVal = sortedBySales[0].sales || 1;
        sortedBySales.forEach((m, index) => {
            const pct = (m.sales / maxSalesVal) * 100;
            const rankClass = index < 3 ? `leaderboard-rank-${index + 1}` : 'leaderboard-rank-other';
            salesList.innerHTML += `
                <div class="leaderboard-item ${rankClass}">
                    <div class="leaderboard-rank-badge">${index + 1}</div>
                    <div class="leaderboard-item-details">
                        <div class="leaderboard-name">${m.monthName} 2026</div>
                        <div class="leaderboard-progress-bar-container">
                            <div class="leaderboard-progress-bar" style="width: ${pct}%"></div>
                        </div>
                    </div>
                    <div class="leaderboard-value">RM ${Math.round(m.sales).toLocaleString()}</div>
                </div>
            `;
        });

        const maxWeightVal = sortedByWeight[0].weight || 1;
        sortedByWeight.forEach((m, index) => {
            const pct = (m.weight / maxWeightVal) * 100;
            const rankClass = index < 3 ? `leaderboard-rank-${index + 1}` : 'leaderboard-rank-other';
            weightList.innerHTML += `
                <div class="leaderboard-item ${rankClass}">
                    <div class="leaderboard-rank-badge">${index + 1}</div>
                    <div class="leaderboard-item-details">
                        <div class="leaderboard-name">${m.monthName} 2026</div>
                        <div class="leaderboard-progress-bar-container">
                            <div class="leaderboard-progress-bar" style="width: ${pct}%"></div>
                        </div>
                    </div>
                    <div class="leaderboard-value">${Math.round(m.weight).toLocaleString()} g</div>
                </div>
            `;
        });
    }

    function groupSalesByMonth(data) {
        const monthNames = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
        const groups = {};

        data.forEach(row => {
            const m = row.date.split('-')[1]; // MM
            if (!groups[m]) {
                groups[m] = {
                    monthKey: m,
                    monthName: monthNames[parseInt(m)-1],
                    sales: 0,
                    weight: 0
                };
            }
            groups[m].sales += row.total_sales;
            groups[m].weight += row.total_wt;
        });

        return Object.values(groups).sort((a,b) => a.monthKey.localeCompare(b.monthKey));
    }

    function renderSalesCharts() {
        const labels = filteredData.map(row => formatDisplayDate(row.date));
        
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

        // 1. Sales Trend
        const ctxSales = document.getElementById('chart-sales-trend').getContext('2d');
        if (chartSalesTrend) chartSalesTrend.destroy();
        chartSalesTrend = new Chart(ctxSales, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Jumlah Combined',
                        data: filteredData.map(row => row.total_sales),
                        borderColor: '#d97706',
                        backgroundColor: 'rgba(217, 119, 6, 0.05)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 3,
                        pointRadius: labels.length > 31 ? 0 : 3,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'GBS Purchase',
                        data: filteredData.map(row => row.gbs_sales),
                        borderColor: '#8F1D38',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: labels.length > 31 ? 0 : 2,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Retail Sales',
                        data: filteredData.map(row => row.ret_sales),
                        borderColor: '#B8960D',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: labels.length > 31 ? 0 : 2,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' } }
                },
                scales: {
                    y: { grid: { color: 'rgba(15, 23, 42, 0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 2. Weight Compare (Daily)
        const ctxWeight = document.getElementById('chart-weight-compare').getContext('2d');
        if (chartWeightCompare) chartWeightCompare.destroy();
        chartWeightCompare = new Chart(ctxWeight, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'GBS Weight (g)',
                        data: filteredData.map(row => row.gbs_wt),
                        backgroundColor: 'rgba(143, 29, 56, 0.85)',
                        borderRadius: 4
                    },
                    {
                        label: 'Retail Weight (g)',
                        data: filteredData.map(row => row.ret_wt),
                        backgroundColor: 'rgba(184, 150, 13, 0.85)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: tooltipConfig },
                scales: {
                    y: { stacked: true, grid: { color: 'rgba(15, 23, 42, 0.04)' } },
                    x: { stacked: true, grid: { display: false } }
                }
            }
        });

        // 3. Weight Compare Monthly
        const monthlyBreakdown = groupSalesByMonth(filteredData);
        const monthlyLabels = monthlyBreakdown.map(m => m.monthName);
        const gbsMonthlyWts = [];
        const retailMonthlyWts = [];
        
        monthlyBreakdown.forEach(m => {
            let gbsSum = 0, retailSum = 0;
            filteredData.forEach(row => {
                const rMonth = row.date.split('-')[1];
                if (rMonth === m.monthKey) {
                    gbsSum += row.gbs_wt;
                    retailSum += row.ret_wt;
                }
            });
            gbsMonthlyWts.push(gbsSum);
            retailMonthlyWts.push(retailSum);
        });

        const ctxWeightMonthly = document.getElementById('chart-weight-monthly').getContext('2d');
        if (chartWeightMonthly) chartWeightMonthly.destroy();
        chartWeightMonthly = new Chart(ctxWeightMonthly, {
            type: 'bar',
            data: {
                labels: monthlyLabels,
                datasets: [
                    { label: 'GBS Weight (g)', data: gbsMonthlyWts, backgroundColor: '#8F1D38', borderRadius: 6 },
                    { label: 'Retail Weight (g)', data: retailMonthlyWts, backgroundColor: '#B8960D', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: tooltipConfig },
                scales: {
                    y: { grid: { color: 'rgba(15, 23, 42, 0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 4. Price Daily
        const ctxPrice = document.getElementById('chart-price-trend').getContext('2d');
        if (chartPriceTrend) chartPriceTrend.destroy();
        chartPriceTrend = new Chart(ctxPrice, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Harga Emas Purata Se-Gram (RM/g)',
                    data: filteredData.map(row => row.total_wt > 0 ? row.total_sales / row.total_wt : 0),
                    borderColor: '#16a34a',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: labels.length > 31 ? 0 : 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: tooltipConfig },
                scales: {
                    y: { grid: { color: 'rgba(15, 23, 42, 0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 5. Price Monthly
        const avgMonthlyPrices = monthlyBreakdown.map(m => {
            let mSales = 0, mWeight = 0;
            filteredData.forEach(row => {
                const rMonth = row.date.split('-')[1];
                if (rMonth === m.monthKey) {
                    mSales += row.total_sales;
                    mWeight += row.total_wt;
                }
            });
            return mWeight > 0 ? mSales / mWeight : 0;
        });

        const ctxPriceMonthly = document.getElementById('chart-price-monthly').getContext('2d');
        if (chartPriceMonthly) chartPriceMonthly.destroy();
        chartPriceMonthly = new Chart(ctxPriceMonthly, {
            type: 'line',
            data: {
                labels: monthlyLabels,
                datasets: [{
                    label: 'Harga Emas Purata Se-Gram Bulanan (RM/g)',
                    data: avgMonthlyPrices,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.05)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: tooltipConfig },
                scales: {
                    y: { grid: { color: 'rgba(15, 23, 42, 0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 6. Channel Contribution
        let totalGbs = 0, totalRetail = 0;
        filteredData.forEach(row => {
            totalGbs += row.gbs_sales;
            totalRetail += row.ret_sales;
        });
        
        const ctxContrib = document.getElementById('chart-contribution').getContext('2d');
        if (chartContribution) chartContribution.destroy();
        chartContribution = new Chart(ctxContrib, {
            type: 'doughnut',
            data: {
                labels: ['GBS Purchases', 'Retail Sales'],
                datasets: [{
                    data: [totalGbs, totalRetail],
                    backgroundColor: ['#8F1D38', '#B8960D'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: tooltipConfig },
                cutout: '60%'
            }
        });

        // 7. Monthly Sales Summary Stack
        const gbsMonthlySales = [];
        const retailMonthlySales = [];
        monthlyBreakdown.forEach(m => {
            let gbsSum = 0, retailSum = 0;
            filteredData.forEach(row => {
                const rMonth = row.date.split('-')[1];
                if (rMonth === m.monthKey) {
                    gbsSum += row.gbs_sales;
                    retailSum += row.ret_sales;
                }
            });
            gbsMonthlySales.push(gbsSum);
            retailMonthlySales.push(retailSum);
        });

        const ctxMonthly = document.getElementById('chart-monthly-sales').getContext('2d');
        if (chartMonthlySales) chartMonthlySales.destroy();
        chartMonthlySales = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: monthlyLabels,
                datasets: [
                    { label: 'GBS Purchases (RM)', data: gbsMonthlySales, backgroundColor: '#8F1D38', borderRadius: 6 },
                    { label: 'Retail Sales (RM)', data: retailMonthlySales, backgroundColor: '#B8960D', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { tooltip: tooltipConfig },
                scales: {
                    y: { grid: { color: 'rgba(15, 23, 42, 0.04)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderSalesTable() {
        const query = tableSearch.value.toLowerCase().trim();
        const monthVal = tableFilterMonth.value;

        let tableData = filteredData.filter(row => {
            const dateMatch = formatDisplayDate(row.date).includes(query);
            let monthMatch = true;
            if (monthVal !== 'all') {
                const rowMonth = row.date.split('-')[1];
                monthMatch = (rowMonth === monthVal);
            }
            return dateMatch && monthMatch;
        });

        tableData.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];
            
            if (currentSortColumn === 'date') {
                return currentSortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return currentSortAscending ? valA - valB : valB - valA;
        });

        const totalRows = tableData.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
        const paginatedData = tableData.slice(startIndex, endIndex);

        tableBody.innerHTML = '';
        if (paginatedData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="13" class="text-center" style="padding: 30px; color: var(--text-muted);">Tiada data jualan ditemui</td></tr>`;
            paginationInfo.textContent = `Menunjukkan 0 hingga 0 daripada 0 entri`;
            paginationControls.innerHTML = '';
            return;
        }

        paginatedData.forEach(row => {
            const gbsAvg = row.gbs_wt > 0 ? row.gbs_sales / row.gbs_wt : 0;
            const retAvg = row.ret_wt > 0 ? row.ret_sales / row.ret_wt : 0;
            const totAvg = row.total_wt > 0 ? row.total_sales / row.total_wt : 0;

            tableBody.innerHTML += `
                <tr>
                    <td class="text-center font-weight-bold">${formatDisplayDate(row.date)}</td>
                    <td class="text-center">${row.gbs_tx.toLocaleString()}</td>
                    <td class="text-right">${row.gbs_wt.toFixed(2)}</td>
                    <td class="text-right">RM ${Math.round(row.gbs_sales).toLocaleString()}</td>
                    <td class="text-right font-muted">RM ${gbsAvg.toFixed(2)}</td>
                    
                    <td class="text-center">${row.ret_tx.toLocaleString()}</td>
                    <td class="text-right">${row.ret_wt.toFixed(2)}</td>
                    <td class="text-right">RM ${Math.round(row.ret_prem).toLocaleString()}</td>
                    <td class="text-right">RM ${Math.round(row.ret_sales).toLocaleString()}</td>
                    <td class="text-right font-muted">RM ${retAvg.toFixed(2)}</td>
                    
                    <td class="text-right font-weight-bold" style="background: rgba(184, 150, 13, 0.02);">${row.total_wt.toFixed(2)}</td>
                    <td class="text-right font-weight-bold" style="background: rgba(184, 150, 13, 0.02);">RM ${Math.round(row.total_sales).toLocaleString()}</td>
                    <td class="text-right font-weight-bold font-muted" style="background: rgba(184, 150, 13, 0.02);">RM ${totAvg.toFixed(2)}</td>
                </tr>
            `;
        });

        paginationInfo.textContent = `Menunjukkan ${startIndex + 1} hingga ${endIndex} daripada ${totalRows} entri`;
        renderSalesPaginationButtons(totalPages);
    }

    function renderSalesPaginationButtons(totalPages) {
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-outline btn-sm';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { currentPage--; renderSalesTable(); };
        paginationControls.appendChild(prevBtn);

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => { currentPage = i; renderSalesTable(); };
            paginationControls.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-outline btn-sm';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { currentPage++; renderSalesTable(); };
        paginationControls.appendChild(nextBtn);
    }

    // --- Sales Header Sorter Interactions ---
    document.querySelectorAll('#combined-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortCol = th.getAttribute('data-sort');
            if (currentSortColumn === sortCol) {
                currentSortAscending = !currentSortAscending;
            } else {
                currentSortColumn = sortCol;
                currentSortAscending = true;
            }
            document.querySelectorAll('#combined-table th.sortable i').forEach(icon => icon.className = 'fa-solid fa-sort');
            th.querySelector('i').className = currentSortAscending ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            renderSalesTable();
        });
    });

    // --- Sales Filters Event Listeners ---
    filterStartDate.addEventListener('change', applySalesFilters);
    filterEndDate.addEventListener('change', applySalesFilters);
    filterMonth.addEventListener('change', (e) => { filterMonth.value = e.target.value; applySalesFilters(); });
    tableFilterMonth.addEventListener('change', (e) => { filterMonth.value = e.target.value; applySalesFilters(); });
    tableSearch.addEventListener('input', () => { currentPage = 1; renderSalesTable(); });

    // --- Save/Load/Reset Sales Server ---
    btnSaveServer.addEventListener('click', () => saveSalesDataToServer(true));

    function saveSalesDataToServer(showAlert) {
        if (combinedData.length === 0) return;
        btnSaveServer.setAttribute('disabled', 'true');
        btnSaveServer.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        
        fetch('save_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'sales', key: 'gbgold2026', data: combinedData })
        })
        .then(response => response.json())
        .then(res => {
            btnSaveServer.removeAttribute('disabled');
            btnSaveServer.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Server';
            if (res.success) {
                if (showAlert) alert('Berjaya menyimpan data jualan ke server.');
            } else {
                alert('Ralat menyimpan: ' + res.message);
            }
        })
        .catch(err => {
            btnSaveServer.removeAttribute('disabled');
            btnSaveServer.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Server';
            alert('Ralat rangkaian: ' + err.message);
        });
    }

    function loadSalesDataFromServer() {
        fetch('data.json?v=' + Date.now())
        .then(response => { if (!response.ok) throw new Error(); return response.json(); })
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                combinedData = data;
                initSalesDashboard();
            }
        })
        .catch(() => initSalesDashboard());
    }

    btnReset.addEventListener('click', () => {
        if (confirm('Kosongkan semua data jualan sedia ada? Halaman akan dimuat semula.')) {
            fetch('save_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'sales', key: 'gbgold2026', data: [] })
            }).then(() => { combinedData = []; location.reload(); });
        }
    });

    // --- Export Sales CSV & Excel ---
    btnExportCsv.addEventListener('click', () => {
        if (filteredData.length === 0) return;
        let csv = "Tarikh,GBS Tx,GBS Berat(g),GBS Jualan(RM),Retail Pesanan,Retail Berat(g),Retail Premium(RM),Retail Jualan(RM),Jumlah Combined Berat(g),Jumlah Combined Jualan(RM)\n";
        filteredData.forEach(row => {
            csv += `${formatDisplayDate(row.date)},${row.gbs_tx},${row.gbs_wt.toFixed(2)},${row.gbs_sales.toFixed(2)},${row.ret_tx},${row.ret_wt.toFixed(2)},${row.ret_prem.toFixed(2)},${row.ret_sales.toFixed(2)},${row.total_wt.toFixed(2)},${row.total_sales.toFixed(2)}\n`;
        });
        triggerDownload(csv, 'csv', 'Laporan_Jualan_GBGold');
    });

    btnExportXlsx.addEventListener('click', () => {
        if (filteredData.length === 0) return;
        const excelRows = filteredData.map(row => ({
            "Tarikh": formatDisplayDate(row.date),
            "GBS Tx": row.gbs_tx,
            "GBS Berat (g)": row.gbs_wt,
            "GBS Jualan (RM)": row.gbs_sales,
            "Retail Pesanan": row.ret_tx,
            "Retail Berat (g)": row.ret_wt,
            "Retail Premium (RM)": row.ret_prem,
            "Retail Jualan (RM)": row.ret_sales,
            "Combined Berat (g)": row.total_wt,
            "Combined Jualan (RM)": row.total_sales
        }));
        const ws = XLSX.utils.json_to_sheet(excelRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jualan");
        XLSX.writeFile(wb, `Laporan_Jualan_GBGold_${new Date().toISOString().split('T')[0]}.xlsx`);
    });

    function triggerDownload(content, type, name) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${name}_${new Date().toISOString().split('T')[0]}.${type}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ==========================================
    // --- 10. RECRUITMENT DISPLAY LOGIC ---
    // ==========================================
    function initRecruitmentDashboard() {
        if (recruitmentData.length === 0) {
            recruitmentUploadSection.style.display = 'block';
            recruitmentDashboardView.style.display = 'none';
            btnRecruitmentSaveServer.style.display = 'none';
            btnRecruitmentReset.style.display = 'none';
            document.getElementById('btn-recruitment-toggle-upload').style.display = 'none';
            return;
        }

        recruitmentUploadSection.style.display = 'none';
        recruitmentDashboardView.style.display = 'block';
        btnRecruitmentSaveServer.style.display = 'inline-flex';
        btnRecruitmentReset.style.display = 'inline-flex';
        document.getElementById('btn-recruitment-toggle-upload').style.display = 'inline-flex';
        document.getElementById('btn-recruitment-toggle-upload').innerHTML = '<i class="fa-solid fa-file-import"></i> Import Fail';

        let minDate = recruitmentData[0].from;
        let maxDate = recruitmentData[0].to;
        recruitmentData.forEach(r => {
            if (r.from < minDate) minDate = r.from;
            if (r.to > maxDate) maxDate = r.to;
        });

        filterRecruitmentStartDate.value = minDate;
        filterRecruitmentEndDate.value = maxDate;
        filterRecruitmentMonth.value = 'all';
        tableRecruitmentFilterMonth.value = 'all';
        tableRecruitmentSearch.value = '';
        currentRecruitmentPage = 1;

        applyRecruitmentFilters();
    }

    function applyRecruitmentFilters() {
        const start = filterRecruitmentStartDate.value;
        const end = filterRecruitmentEndDate.value;
        const monthVal = filterRecruitmentMonth.value;

        filteredRecruitmentData = recruitmentData.filter(row => {
            const dateFromInRange = (!start || row.from >= start);
            const dateToInRange = (!end || row.to <= end);
            
            let monthMatch = true;
            if (monthVal !== 'all') {
                const rowMonth = row.from.split('-')[1];
                monthMatch = (rowMonth === monthVal);
            }
            return dateFromInRange && dateToInRange && monthMatch;
        });

        tableRecruitmentFilterMonth.value = monthVal;

        updateRecruitmentKPIs();
        renderRecruitmentCharts();
        renderRecruitmentTable();
    }

    function updateRecruitmentKPIs() {
        if (filteredRecruitmentData.length === 0) {
            kpiTotalReferrals.textContent = '0';
            kpiTotalRecruiters.textContent = '0';
            kpiAvgReferrals.textContent = '0.0';
            kpiTopRecruiterName.textContent = 'Tiada';
            kpiTopRecruiterCode.textContent = '-';
            kpiTopRecruiterCount.textContent = '0';
            return;
        }

        let totalReferrals = 0;
        const recruiterMap = new Map();

        filteredRecruitmentData.forEach(row => {
            totalReferrals += row.referrals;
            if (recruiterMap.has(row.code)) {
                recruiterMap.get(row.code).referrals += row.referrals;
            } else {
                recruiterMap.set(row.code, { code: row.code, name: row.name, referrals: row.referrals });
            }
        });

        const recruitersList = Array.from(recruiterMap.values());
        const totalRecruiters = recruitersList.length;
        const avgReferrals = totalRecruiters > 0 ? (totalReferrals / totalRecruiters).toFixed(1) : '0.0';

        let topRecruiter = { name: 'Tiada', code: '-', referrals: 0 };
        recruitersList.forEach(rec => {
            if (rec.referrals > topRecruiter.referrals) topRecruiter = rec;
        });

        kpiTotalReferrals.textContent = totalReferrals.toLocaleString();
        kpiTotalRecruiters.textContent = totalRecruiters.toLocaleString();
        kpiAvgReferrals.textContent = avgReferrals;
        kpiTopRecruiterName.textContent = topRecruiter.name;
        kpiTopRecruiterCode.textContent = topRecruiter.code;
        kpiTopRecruiterCount.textContent = topRecruiter.referrals;
    }

    function renderRecruitmentCharts() {
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

        // 1. Monthly Trend Bar
        const monthNames = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
        const monthlyMap = new Map();
        for(let i = 1; i <= 12; i++) monthlyMap.set(String(i).padStart(2, '0'), 0);
        
        filteredRecruitmentData.forEach(row => {
            const m = row.from.split('-')[1];
            if (monthlyMap.has(m)) {
                monthlyMap.set(m, monthlyMap.get(m) + row.referrals);
            }
        });

        const ctxTrend = document.getElementById('chart-recruitment-trend').getContext('2d');
        if (chartRecruitmentTrend) chartRecruitmentTrend.destroy();
        chartRecruitmentTrend = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [{
                    label: 'Bilangan Rujukan',
                    data: Array.from(monthlyMap.values()),
                    backgroundColor: 'rgba(143, 29, 56, 0.85)',
                    borderColor: '#8F1D38',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: tooltipConfig },
                scales: { y: { grid: { color: 'rgba(15, 23, 42, 0.04)' } }, x: { grid: { display: false } } }
            }
        });

        // 2. Leaderboard horizontal
        const recMap = new Map();
        filteredRecruitmentData.forEach(row => {
            if (recMap.has(row.code)) {
                recMap.get(row.code).referrals += row.referrals;
            } else {
                recMap.set(row.code, { code: row.code, name: row.name, referrals: row.referrals });
            }
        });
        const sortedRecs = Array.from(recMap.values()).sort((a,b) => b.referrals - a.referrals);
        const top10Recs = sortedRecs.slice(0, 10);

        const ctxTop = document.getElementById('chart-recruitment-top-recruiters').getContext('2d');
        if (chartRecruitmentTopRecruiters) chartRecruitmentTopRecruiters.destroy();
        chartRecruitmentTopRecruiters = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: top10Recs.map(r => r.name.length > 15 ? r.name.substring(0, 15) + '..' : r.name),
                datasets: [{
                    label: 'Jumlah Rujukan',
                    data: top10Recs.map(r => r.referrals),
                    backgroundColor: 'rgba(184, 150, 13, 0.85)',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipConfig,
                        callbacks: { title: (context) => top10Recs[context[0].dataIndex].name }
                    }
                },
                scales: { x: { grid: { color: 'rgba(15, 23, 42, 0.04)' } }, y: { grid: { display: false } } }
            }
        });

        // 3. Segment distribution doughnut
        let casual = 0, medium = 0, pro = 0, superRec = 0;
        recMap.forEach(rec => {
            if (rec.referrals === 1) casual++;
            else if (rec.referrals <= 5) medium++;
            else if (rec.referrals <= 20) pro++;
            else superRec++;
        });

        const ctxSeg = document.getElementById('chart-recruitment-segment-distribution').getContext('2d');
        if (chartRecruitmentSegmentDistribution) chartRecruitmentSegmentDistribution.destroy();
        chartRecruitmentSegmentDistribution = new Chart(ctxSeg, {
            type: 'doughnut',
            data: {
                labels: ['Casual (1)', 'Sederhana (2-5)', 'Pro (6-20)', 'Super Perekrut (>20)'],
                datasets: [{
                    data: [casual, medium, pro, superRec],
                    backgroundColor: ['#94a3b8', '#0284c7', '#7c3aed', '#B8960D'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
                },
                cutout: '60%'
            }
        });
    }

    function renderRecruitmentTable() {
        const query = tableRecruitmentSearch.value.toLowerCase().trim();
        const monthVal = tableRecruitmentFilterMonth.value;

        let tableData = filteredRecruitmentData.filter(row => {
            const codeMatch = row.code.toLowerCase().includes(query);
            const nameMatch = row.name.toLowerCase().includes(query);
            let monthMatch = true;
            if (monthVal !== 'all') {
                const rowMonth = row.from.split('-')[1];
                monthMatch = (rowMonth === monthVal);
            }
            return (codeMatch || nameMatch) && monthMatch;
        });

        tableData.sort((a, b) => {
            let valA = a[currentRecruitmentSortColumn];
            let valB = b[currentRecruitmentSortColumn];
            
            if (currentRecruitmentSortColumn === 'rank') {
                valA = a.referrals; valB = b.referrals;
            }
            if (typeof valA === 'string') {
                return currentRecruitmentSortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return currentRecruitmentSortAscending ? valA - valB : valB - valA;
        });

        const totalRows = tableData.length;
        const totalPages = Math.ceil(totalRows / recruitmentRowsPerPage) || 1;
        if (currentRecruitmentPage > totalPages) currentRecruitmentPage = totalPages;

        const start = (currentRecruitmentPage - 1) * recruitmentRowsPerPage;
        const end = Math.min(start + recruitmentRowsPerPage, totalRows);
        const paginated = tableData.slice(start, end);

        tableRecruitmentBody.innerHTML = '';
        if (paginated.length === 0) {
            tableRecruitmentBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 30px; color: var(--text-muted);">Tiada data rekrutmen ditemui</td></tr>`;
            paginationRecruitmentInfo.textContent = `Menunjukkan 0 hingga 0 daripada 0 entri`;
            paginationRecruitmentControls.innerHTML = '';
            return;
        }

        paginated.forEach((row, i) => {
            const displayIndex = start + i + 1;
            const dateStr = `${formatDisplayDate(row.from)} hingga ${formatDisplayDate(row.to)}`;
            const isSuper = row.referrals >= 20;
            const rowStyle = isSuper ? 'style="font-weight: 600; background-color: rgba(184, 150, 13, 0.03);"' : '';

            tableRecruitmentBody.innerHTML += `
                <tr ${rowStyle}>
                    <td class="text-center">${displayIndex}</td>
                    <td><code style="color: var(--crimson); font-weight: bold;">${row.code}</code></td>
                    <td>${row.name}</td>
                    <td class="text-center" style="font-size: 13px; color: var(--text-muted);">${dateStr}</td>
                    <td class="text-center" style="font-weight: bold; color: ${isSuper ? 'var(--gold-dark)' : 'inherit'}">${row.referrals}</td>
                </tr>
            `;
        });

        paginationRecruitmentInfo.textContent = `Menunjukkan ${start + 1} hingga ${end} daripada ${totalRows} entri`;
        renderRecruitmentPaginationButtons(totalPages);
    }

    function renderRecruitmentPaginationButtons(totalPages) {
        paginationRecruitmentControls.innerHTML = '';
        if (totalPages <= 1) return;

        const prev = document.createElement('button');
        prev.className = 'btn btn-outline btn-sm';
        prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prev.disabled = currentRecruitmentPage === 1;
        prev.onclick = () => { currentRecruitmentPage--; renderRecruitmentTable(); };
        paginationRecruitmentControls.appendChild(prev);

        let start = Math.max(1, currentRecruitmentPage - 2);
        let end = Math.min(totalPages, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);

        for (let i = start; i <= end; i++) {
            const btn = document.createElement('button');
            btn.className = `btn btn-sm ${i === currentRecruitmentPage ? 'btn-primary' : 'btn-outline'}`;
            btn.textContent = i;
            btn.onclick = () => { currentRecruitmentPage = i; renderRecruitmentTable(); };
            paginationRecruitmentControls.appendChild(btn);
        }

        const next = document.createElement('button');
        next.className = 'btn btn-outline btn-sm';
        next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        next.disabled = currentRecruitmentPage === totalPages;
        next.onclick = () => { currentRecruitmentPage++; renderRecruitmentTable(); };
        paginationRecruitmentControls.appendChild(next);
    }

    // --- Recruitment Sorter Headers ---
    document.querySelectorAll('#recruitment-table th.sortable-rec').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (currentRecruitmentSortColumn === col) {
                currentRecruitmentSortAscending = !currentRecruitmentSortAscending;
            } else {
                currentRecruitmentSortColumn = col;
                currentRecruitmentSortAscending = true;
            }
            document.querySelectorAll('#recruitment-table th.sortable-rec i').forEach(icon => icon.className = 'fa-solid fa-sort');
            th.querySelector('i').className = currentRecruitmentSortAscending ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            renderRecruitmentTable();
        });
    });

    // --- Recruitment Filters Event Listeners ---
    filterRecruitmentStartDate.addEventListener('change', applyRecruitmentFilters);
    filterRecruitmentEndDate.addEventListener('change', applyRecruitmentFilters);
    filterRecruitmentMonth.addEventListener('change', (e) => { filterRecruitmentMonth.value = e.target.value; applyRecruitmentFilters(); });
    tableRecruitmentFilterMonth.addEventListener('change', (e) => { filterRecruitmentMonth.value = e.target.value; applyRecruitmentFilters(); });
    tableRecruitmentSearch.addEventListener('input', () => { currentRecruitmentPage = 1; renderRecruitmentTable(); });

    // --- Recruitment Save/Load/Reset Server ---
    btnRecruitmentSaveServer.addEventListener('click', () => saveRecruitmentDataToServer(true));

    function saveRecruitmentDataToServer(showAlert) {
        if (recruitmentData.length === 0) return;
        btnRecruitmentSaveServer.setAttribute('disabled', 'true');
        btnRecruitmentSaveServer.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        
        fetch('save_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'recruitment', key: 'gbgold2026', data: recruitmentData })
        })
        .then(response => response.json())
        .then(res => {
            btnRecruitmentSaveServer.removeAttribute('disabled');
            btnRecruitmentSaveServer.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Server';
            if (res.success) {
                if (showAlert) alert('Berjaya menyimpan data rekrutmen ke server.');
            } else {
                alert('Ralat menyimpan: ' + res.message);
            }
        })
        .catch(err => {
            btnRecruitmentSaveServer.removeAttribute('disabled');
            btnRecruitmentSaveServer.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Server';
            alert('Ralat rangkaian: ' + err.message);
        });
    }

    function loadRecruitmentDataFromServer() {
        fetch('recruitment_data.json?v=' + Date.now())
        .then(response => { if (!response.ok) throw new Error(); return response.json(); })
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                recruitmentData = data;
                initRecruitmentDashboard();
            }
        })
        .catch(() => initRecruitmentDashboard());
    }

    btnRecruitmentReset.addEventListener('click', () => {
        if (confirm('Kosongkan semua data rekrutmen sedia ada? Halaman akan dimuat semula.')) {
            fetch('save_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'recruitment', key: 'gbgold2026', data: [] })
            }).then(() => { recruitmentData = []; location.reload(); });
        }
    });

    // --- Recruitment Export CSV & Excel ---
    btnRecruitmentExportCsv.addEventListener('click', () => {
        if (filteredRecruitmentData.length === 0) return;
        let csv = "No.,Kod Pelanggan,Nama Pelanggan,Tarikh Mula,Tarikh Tamat,Rujukan\n";
        filteredRecruitmentData.forEach((row, i) => {
            csv += `${i+1},${row.code},"${row.name.replace(/"/g, '""')}",${row.from},${row.to},${row.referrals}\n`;
        });
        triggerDownload(csv, 'csv', 'Laporan_Rekrutmen_GBGold');
    });

    btnRecruitmentExportXlsx.addEventListener('click', () => {
        if (filteredRecruitmentData.length === 0) return;
        const excelRows = filteredRecruitmentData.map((row, i) => ({
            "No.": i + 1,
            "Kod Pelanggan": row.code,
            "Nama Pelanggan": row.name,
            "Tarikh Mula": row.from,
            "Tarikh Tamat": row.to,
            "Jumlah Rujukan": row.referrals
        }));
        const ws = XLSX.utils.json_to_sheet(excelRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekrutmen");
        XLSX.writeFile(wb, `Laporan_Rekrutmen_GBGold_${new Date().toISOString().split('T')[0]}.xlsx`);
    });

    // --- Load Demo Recruitment Data ---
    btnRecruitmentLoadDemo.addEventListener('click', () => {
        const demoData = getDemoRecruitmentData();
        recruitmentData = demoData;
        initRecruitmentDashboard();
        saveRecruitmentDataToServer(false);
    });

    // ==========================================
    // --- 11. DEMO DATA GENERATION HELPERS ---
    // ==========================================
    // --- Sales Demo Data ---
    btnLoadDemo.addEventListener('click', () => {
        const demoGbs = [];
        const demoRetail = [];
        const year = "2026";
        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        
        months.forEach(m => {
            const daysInMonth = new Date(year, parseInt(m), 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, '0');
                const dateStr = `${year}-${m}-${dayStr}`;
                
                const seed = d + parseInt(m) * 10;
                const rand1 = Math.sin(seed) * 10;
                const rand2 = Math.cos(seed) * 8;
                
                const gbsTx = Math.floor(15 + Math.abs(rand1));
                const gbsWt = 150 + Math.abs(rand1 * 50);
                const gbsSales = gbsWt * (290 + rand2);
                
                const retTx = Math.floor(8 + Math.abs(rand2));
                const retWt = 50 + Math.abs(rand2 * 15);
                const retPrem = retTx * (45 + (seed % 10));
                const retSales = retWt * (292 + rand1) + retPrem;
                
                demoGbs.push({ date: dateStr, transactions: gbsTx, weight: gbsWt, sales: gbsSales, ids: `CPO-${seed}` });
                demoRetail.push({ date: dateStr, orders: retTx, weight: retWt, premium: retPrem, shipment: 15, sales: retSales, ids: `#${seed}` });
            }
        });
        
        gbsData = demoGbs;
        retailData = demoRetail;
        mergeSalesDatasets();
        initSalesDashboard();
        saveSalesDataToServer(false);
    });

    // --- Recruitment Demo Data (Matches Screenshot Exactly for June) ---
    function getDemoRecruitmentData() {
        const months = ["01", "02", "03", "04", "05", "06"];
        const year = "2026";
        const demoData = [];
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
                    referrals = juneReferrals[rec.code] !== undefined ? juneReferrals[rec.code] : 0;
                } else {
                    const seed = parseInt(rec.code.replace("GB", "")) || 1;
                    const rand = Math.sin(seed * parseInt(m)) * 10;
                    if (rec.code === "GB00000015") referrals = Math.floor(25 + rand * 10);
                    else if (rec.code === "GB00002622") referrals = Math.floor(20 + rand * 8);
                    else if (rec.code === "GB00000013") referrals = Math.floor(15 + rand * 6);
                    else if (rec.code === "GB00000006") referrals = Math.floor(10 + rand * 4);
                    else if (rec.code === "GB00000545") referrals = Math.floor(8 + rand * 3);
                    else referrals = Math.max(0, Math.floor((rand + 5) / 3));
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

    function formatDisplayDate(dateStr) {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // --- Toggle Upload Visibility (Sales) ---
    const btnToggleUpload = document.getElementById('btn-toggle-upload');
    btnToggleUpload.addEventListener('click', () => {
        if (uploadSection.style.display === 'none') {
            uploadSection.style.display = 'block';
            btnToggleUpload.innerHTML = '<i class="fa-solid fa-xmark"></i> Tutup Import';
        } else {
            uploadSection.style.display = 'none';
            btnToggleUpload.innerHTML = '<i class="fa-solid fa-file-import"></i> Import Fail';
        }
    });

    // --- Toggle Upload Visibility (Recruitment) ---
    const btnRecruitmentToggleUpload = document.getElementById('btn-recruitment-toggle-upload');
    btnRecruitmentToggleUpload.addEventListener('click', () => {
        if (recruitmentUploadSection.style.display === 'none') {
            recruitmentUploadSection.style.display = 'block';
            btnRecruitmentToggleUpload.innerHTML = '<i class="fa-solid fa-xmark"></i> Tutup Import';
        } else {
            recruitmentUploadSection.style.display = 'none';
            btnRecruitmentToggleUpload.innerHTML = '<i class="fa-solid fa-file-import"></i> Import Fail';
        }
    });
});
