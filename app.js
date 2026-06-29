// GBGold Sales Analysis Dashboard - App Logic

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let gbsData = null;      // Parsed GBS Purchase data
    let retailData = null;   // Parsed Retail Sales data
    let combinedData = [];   // Merged data sorted by date
    let filteredData = [];   // Merged data after applying filters
    
    // Table Sorting State
    let currentSortColumn = 'date';
    let currentSortAscending = true;
    
    // Table Pagination State
    let currentPage = 1;
    const rowsPerPage = 31;

    // Chart Instances
    let chartSalesTrend = null;
    let chartWeightCompare = null;
    let chartWeightMonthly = null;
    let chartPriceTrend = null;
    let chartPriceMonthly = null;
    let chartContribution = null;
    let chartMonthlySales = null;

    // --- DOM Elements ---
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
    
    // Filters
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterMonth = document.getElementById('filter-month');
    const tableFilterMonth = document.getElementById('table-filter-month');
    const tableSearch = document.getElementById('table-search');
    
    // KPIs
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
    
    // Table & Export
    const tableBody = document.getElementById('table-body');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationControls = document.getElementById('pagination-controls');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnExportXlsx = document.getElementById('btn-export-xlsx');

    // --- Drag and Drop Setup ---
    setupDragAndDrop(dropZoneGbs, fileGbsInput, (files) => handleFilesSelect(files, 'gbs'));
    setupDragAndDrop(dropZoneRetail, fileRetailInput, (files) => handleFilesSelect(files, 'retail'));

    function setupDragAndDrop(dropZone, fileInput, callback) {
        // Click to open file dialog
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

        // Drag events
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
    function handleFilesSelect(files, type) {
        const fileInfoSpan = type === 'gbs' ? gbsFileInfo : retailFileInfo;
        const dropZone = type === 'gbs' ? dropZoneGbs : dropZoneRetail;
        
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;
        
        fileInfoSpan.textContent = `${filesArray.length} fail terpilih...`;
        dropZone.classList.add('has-file');
        
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
                processParsedData(combinedRows, type);
                
                // Update file info text
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

    function processParsedData(data, type) {
        if (type === 'gbs') {
            gbsData = cleanGbsData(data);
            console.log("GBS Data Processed:", gbsData);
        } else {
            retailData = cleanRetailData(data);
            console.log("Retail Data Processed:", retailData);
        }
        
        // Enable process button if both are uploaded
        if (gbsData && gbsData.length > 0 && retailData && retailData.length > 0) {
            btnProcess.removeAttribute('disabled');
        }
    }

    // --- Data Cleaning Utilities ---
    function cleanGbsData(data) {
        const rawRows = data.map(row => {
            // Find key names dynamically (case-insensitive & whitespace tolerant)
            const dateKey = findKey(row, 'date');
            const txKey = findKey(row, 'transaction');
            const weightKey = findKey(row, 'weight');
            const salesKey = findKey(row, 'sales');
            const idsKey = findKey(row, 'id');
            
            const rawDate = row[dateKey];
            const parsedDate = parseDate(rawDate);
            
            if (!parsedDate) return null; // Skip invalid rows
            
            return {
                date: parsedDate,
                transactions: parseInt(cleanNumString(row[txKey])) || 0,
                weight: parseFloat(cleanNumString(row[weightKey])) || 0,
                sales: parseFloat(cleanNumString(row[salesKey])) || 0,
                ids: String(row[idsKey] || "").trim()
            };
        }).filter(row => row !== null);

        // Group by date and sum values
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
            
            const rawDate = row[dateKey];
            const parsedDate = parseDate(rawDate);
            
            if (!parsedDate) return null; // Skip invalid rows
            
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

        // Group by date and sum values
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

    function findKey(row, term) {
        const keys = Object.keys(row);
        // Find key containing the term (case insensitive)
        const match = keys.find(k => k.toLowerCase().replace(/\s+/g, '').includes(term.toLowerCase()));
        return match || keys[0];
    }

    function cleanNumString(val) {
        if (val === undefined || val === null) return "0";
        // Remove currency symbols, commas, spaces
        return String(val).replace(/[RM$,\s]/gi, '');
    }

    // Parses Excel date codes or string dates into YYYY-MM-DD
    function parseDate(dateVal) {
        if (!dateVal) return null;
        
        // If it's an Excel numeric date representation
        if (typeof dateVal === 'number' || (!isNaN(dateVal) && !isNaN(parseFloat(dateVal)) && String(dateVal).length <= 6)) {
            const excelDate = parseFloat(dateVal);
            const jsDate = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
            return jsDate.toISOString().split('T')[0];
        }
        
        const dateStr = String(dateVal).trim();
        
        // Match DD/MM/YYYY or DD-MM-YYYY
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

    // --- Data Merging (Full Outer Join) ---
    function mergeDatasets() {
        const dateMap = new Map();
        
        // Add all GBS data
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
        
        // Add or update with Retail data
        retailData.forEach(retRow => {
            if (dateMap.has(retRow.date)) {
                const existing = dateMap.get(retRow.date);
                existing.ret_tx = retRow.orders;
                existing.ret_wt = retRow.weight;
                existing.ret_prem = retRow.premium;
                existing.ret_ship = retRow.shipment;
                existing.ret_sales = retRow.sales;
                existing.ret_ids = retRow.ids;
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
        
        // Convert map to array, calculate combined fields, and sort by date
        combinedData = Array.from(dateMap.values()).map(row => {
            const total_sales = row.gbs_sales + row.ret_sales;
            const total_wt = row.gbs_wt + row.ret_wt;
            
            return {
                ...row,
                total_sales: total_sales,
                total_wt: total_wt,
                gbs_avg: row.gbs_wt > 0 ? row.gbs_sales / row.gbs_wt : 0,
                ret_avg: row.ret_wt > 0 ? row.ret_sales / row.ret_wt : 0,
                total_avg: total_wt > 0 ? total_sales / total_wt : 0
            };
        });
        
        // Sort chronologically
        combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // --- Action Button Handlers ---
    btnProcess.addEventListener('click', () => {
        if (!gbsData || !retailData) return;
        
        mergeDatasets();
        initializeDashboard();
    });

    btnReset.addEventListener('click', () => {
        gbsData = null;
        retailData = null;
        combinedData = [];
        filteredData = [];
        
        // Reset file inputs
        fileGbsInput.value = "";
        fileRetailInput.value = "";
        gbsFileInfo.textContent = 'Sila pilih atau tarik fail ke sini';
        retailFileInfo.textContent = 'Sila pilih atau tarik fail ke sini';
        
        dropZoneGbs.classList.remove('has-file');
        dropZoneRetail.classList.remove('has-file');
        btnProcess.setAttribute('disabled', 'true');
        
        // Hide dashboard
        dashboardView.style.display = 'none';
        uploadSection.style.display = 'block';
        btnReset.style.display = 'none';
        btnSaveServer.style.display = 'none';
    });

    btnLoadDemo.addEventListener('click', () => {
        generateDemoData();
        mergeDatasets();
        initializeDashboard();
    });

    // --- Dashboard Initialization ---
    function initializeDashboard() {
        // Hide upload section, show dashboard
        uploadSection.style.display = 'none';
        dashboardView.style.display = 'flex';
        btnReset.style.display = 'inline-flex';
        btnSaveServer.style.display = 'inline-flex';
        
        // Set date filter defaults (2026)
        const dates = combinedData.map(d => d.date);
        if (dates.length > 0) {
            filterStartDate.value = dates[0];
            filterEndDate.value = dates[dates.length - 1];
        } else {
            filterStartDate.value = "2026-01-01";
            filterEndDate.value = "2026-12-31";
        }
        filterMonth.value = "all";
        tableFilterMonth.value = "all";
        tableSearch.value = "";
        
        // Setup filter listeners
        [filterStartDate, filterEndDate].forEach(el => {
            el.addEventListener('change', applyFiltersAndRefresh);
        });
        
        [filterMonth, tableFilterMonth].forEach(el => {
            el.addEventListener('change', (e) => {
                // Synchronize month dropdowns
                if (e.target === filterMonth) {
                    tableFilterMonth.value = filterMonth.value;
                } else if (e.target === tableFilterMonth) {
                    filterMonth.value = tableFilterMonth.value;
                }
                applyFiltersAndRefresh();
            });
        });
        
        tableSearch.addEventListener('input', applyFiltersAndRefresh);
        
        applyFiltersAndRefresh();
    }

    // --- Filtering and Refreshing ---
    function applyFiltersAndRefresh() {
        const start = filterStartDate.value;
        const end = filterEndDate.value;
        const month = filterMonth.value;
        const search = tableSearch.value.toLowerCase().trim();
        
        filteredData = combinedData.filter(row => {
            // Date Range filter
            if (start && row.date < start) return false;
            if (end && row.date > end) return false;
            
            // Month filter
            if (month !== 'all') {
                const rowMonth = row.date.split('-')[1];
                if (rowMonth !== month) return false;
            }
            
            // Search filter (matches date string)
            if (search) {
                const formattedDate = formatDateMalay(row.date).toLowerCase();
                if (!row.date.includes(search) && !formattedDate.includes(search)) return false;
            }
            
            return true;
        });
        
        // Recalculate KPIs
        calculateKPIs();
        
        // Update Leaderboards
        updateLeaderboards();
        
        // Render charts
        renderCharts();
        
        // Render Table
        currentPage = 1;
        renderTable();
    }

    // --- KPI Calculations ---
    function calculateKPIs() {
        let totalSalesVal = 0;
        let gbsSalesVal = 0;
        let retSalesVal = 0;
        
        let totalWeightVal = 0;
        let gbsWeightVal = 0;
        let retWeightVal = 0;
        
        let gbsTxVal = 0;
        let retTxVal = 0;
        
        let totalPremVal = 0;
        let totalShipVal = 0;

        filteredData.forEach(row => {
            gbsSalesVal += row.gbs_sales;
            retSalesVal += row.ret_sales;
            totalSalesVal += row.total_sales;
            
            gbsWeightVal += row.gbs_wt;
            retWeightVal += row.ret_wt;
            totalWeightVal += row.total_wt;
            
            gbsTxVal += row.gbs_tx;
            retTxVal += row.ret_tx;
            
            totalPremVal += row.ret_prem;
            totalShipVal += row.ret_ship;
        });

        const avgPriceVal = totalWeightVal > 0 ? totalSalesVal / totalWeightVal : 0;
        const gbsAvgPriceVal = gbsWeightVal > 0 ? gbsSalesVal / gbsWeightVal : 0;
        const retAvgPriceVal = retWeightVal > 0 ? retSalesVal / retWeightVal : 0;

        // Animate count up / set values
        kpiTotalSales.textContent = formatCurrency(totalSalesVal);
        kpiSubGbsSales.textContent = formatCurrency(gbsSalesVal);
        kpiSubRetailSales.textContent = formatCurrency(retSalesVal);
        
        kpiTotalWeight.textContent = formatWeight(totalWeightVal);
        kpiSubGbsWeight.textContent = formatWeight(gbsWeightVal);
        kpiSubRetailWeight.textContent = formatWeight(retWeightVal);
        
        kpiAvgPrice.textContent = `${formatCurrency(avgPriceVal)}/g`;
        kpiSubGbsPrice.textContent = `${formatCurrency(gbsAvgPriceVal)}/g`;
        kpiSubRetailPrice.textContent = `${formatCurrency(retAvgPriceVal)}/g`;
        
        kpiTotalTx.textContent = formatNumber(gbsTxVal + retTxVal, 0);
        kpiSubGbsTx.textContent = formatNumber(gbsTxVal, 0);
        kpiSubRetailTx.textContent = formatNumber(retTxVal, 0);
    }

    // --- Leaderboard Ranking ---
    function updateLeaderboards() {
        const salesList = document.getElementById('sales-leaderboard-list');
        const weightList = document.getElementById('weight-leaderboard-list');
        
        salesList.innerHTML = "";
        weightList.innerHTML = "";
        
        // Group data by month
        const monthlyData = {};
        filteredData.forEach(row => {
            const m = row.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[m]) {
                monthlyData[m] = { month: m, sales: 0, weight: 0 };
            }
            monthlyData[m].sales += row.total_sales;
            monthlyData[m].weight += row.total_wt;
        });
        
        const monthlyArray = Object.values(monthlyData);
        if (monthlyArray.length === 0) {
            salesList.innerHTML = "<p class='text-muted text-center' style='padding: 20px;'>Tiada data jualan.</p>";
            weightList.innerHTML = "<p class='text-muted text-center' style='padding: 20px;'>Tiada data berat.</p>";
            return;
        }
        
        // Sort for Sales
        const salesSorted = [...monthlyArray].sort((a, b) => b.sales - a.sales);
        const maxSales = salesSorted[0].sales;
        
        // Sort for Weight
        const weightSorted = [...monthlyArray].sort((a, b) => b.weight - a.weight);
        const maxWeight = weightSorted[0].weight;
        
        // Render Sales Leaderboard
        salesSorted.forEach((item, index) => {
            const rank = index + 1;
            const pctOfMax = maxSales > 0 ? (item.sales / maxSales) * 100 : 0;
            const monthName = getMonthNameMalay(item.month.split('-')[1]) + ' ' + item.month.split('-')[0];
            
            let medal = "";
            if (rank === 1) medal = "🥇 ";
            else if (rank === 2) medal = "🥈 ";
            else if (rank === 3) medal = "🥉 ";
            
            const itemDiv = document.createElement('div');
            itemDiv.className = `leaderboard-item leaderboard-rank-${rank <= 3 ? rank : 'other'}`;
            itemDiv.innerHTML = `
                <div class="leaderboard-item-header">
                    <div class="leaderboard-rank-month">
                        <span class="leaderboard-rank-badge">${rank}</span>
                        <span>${medal}${monthName}</span>
                    </div>
                    <span class="leaderboard-value">${formatCurrency(item.sales)}</span>
                </div>
                <div class="leaderboard-progress-bar-container">
                    <div class="leaderboard-progress-bar" style="width: ${pctOfMax}%"></div>
                </div>
            `;
            salesList.appendChild(itemDiv);
        });
        
        // Render Weight Leaderboard
        weightSorted.forEach((item, index) => {
            const rank = index + 1;
            const pctOfMax = maxWeight > 0 ? (item.weight / maxWeight) * 100 : 0;
            const monthName = getMonthNameMalay(item.month.split('-')[1]) + ' ' + item.month.split('-')[0];
            
            let medal = "";
            if (rank === 1) medal = "🥇 ";
            else if (rank === 2) medal = "🥈 ";
            else if (rank === 3) medal = "🥉 ";
            
            const itemDiv = document.createElement('div');
            itemDiv.className = `leaderboard-item leaderboard-rank-${rank <= 3 ? rank : 'other'}`;
            itemDiv.innerHTML = `
                <div class="leaderboard-item-header">
                    <div class="leaderboard-rank-month">
                        <span class="leaderboard-rank-badge">${rank}</span>
                        <span>${medal}${monthName}</span>
                    </div>
                    <span class="leaderboard-value">${formatWeight(item.weight)}</span>
                </div>
                <div class="leaderboard-progress-bar-container">
                    <div class="leaderboard-progress-bar" style="width: ${pctOfMax}%"></div>
                </div>
            `;
            weightList.appendChild(itemDiv);
        });
    }

    // --- Chart.js Rendering ---
    function renderCharts() {
        // Destroy existing charts to prevent memory leaks/overlap
        // Destroy existing charts to prevent memory leaks/overlap
        if (chartSalesTrend) chartSalesTrend.destroy();
        if (chartWeightCompare) chartWeightCompare.destroy();
        if (chartWeightMonthly) chartWeightMonthly.destroy();
        if (chartPriceTrend) chartPriceTrend.destroy();
        if (chartPriceMonthly) chartPriceMonthly.destroy();
        if (chartContribution) chartContribution.destroy();
        if (chartMonthlySales) chartMonthlySales.destroy();

        const labels = filteredData.map(row => formatDateShort(row.date));
        
        // Chart.js Global Config for Premium Light Aesthetic
        Chart.defaults.color = '#6b5e5e';
        Chart.defaults.font.family = "'Open Sans', sans-serif";
        
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

        // 1. Sales Trend Chart
        const ctxSales = document.getElementById('chart-sales-trend').getContext('2d');
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
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        ticks: { callback: value => 'RM ' + formatCompact(value) }
                    }
                }
            }
        });

        // 2. Weight Comparison Chart
        const ctxWeight = document.getElementById('chart-weight-compare').getContext('2d');
        chartWeightCompare = new Chart(ctxWeight, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'GBS Purchase (g)',
                        data: filteredData.map(row => row.gbs_wt),
                        backgroundColor: 'rgba(143, 29, 56, 0.85)',
                        borderColor: '#8F1D38',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Retail Sales (g)',
                        data: filteredData.map(row => row.ret_wt),
                        backgroundColor: 'rgba(184, 150, 13, 0.85)',
                        borderColor: '#B8960D',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        ticks: { callback: value => formatWeight(value) }
                    }
                }
            }
        });

        // 2B. Weight Comparison Monthly Chart
        // Group data by month for weights
        const monthlyDataWeight = {};
        filteredData.forEach(row => {
            const m = row.date.substring(0, 7); // YYYY-MM
            if (!monthlyDataWeight[m]) {
                monthlyDataWeight[m] = { month: m, gbs_wt: 0, ret_wt: 0 };
            }
            monthlyDataWeight[m].gbs_wt += row.gbs_wt;
            monthlyDataWeight[m].ret_wt += row.ret_wt;
        });

        const weightMonthLabels = Object.keys(monthlyDataWeight).sort().map(m => {
            const parts = m.split('-');
            return getMonthNameMalay(parts[1]) + ' ' + parts[0];
        });

        const monthlyGbsWt = Object.keys(monthlyDataWeight).sort().map(m => monthlyDataWeight[m].gbs_wt);
        const monthlyRetWt = Object.keys(monthlyDataWeight).sort().map(m => monthlyDataWeight[m].ret_wt);

        const ctxWeightMonthly = document.getElementById('chart-weight-monthly').getContext('2d');
        chartWeightMonthly = new Chart(ctxWeightMonthly, {
            type: 'bar',
            data: {
                labels: weightMonthLabels,
                datasets: [
                    {
                        label: 'GBS Purchase (g)',
                        data: monthlyGbsWt,
                        backgroundColor: 'rgba(143, 29, 56, 0.85)',
                        borderColor: '#8F1D38',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Retail Sales (g)',
                        data: monthlyRetWt,
                        backgroundColor: 'rgba(184, 150, 13, 0.85)',
                        borderColor: '#B8960D',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        ...tooltipConfig,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label.split(' ')[0]}: ${formatWeight(context.raw)}`;
                            }
                        }
                    },
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    x: { 
                        stacked: false,
                        grid: { display: false } 
                    },
                    y: { 
                        stacked: false,
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        ticks: { callback: value => formatWeight(value) }
                    }
                }
            }
        });

        // 3. Price per Gram Trend Chart
        const ctxPrice = document.getElementById('chart-price-trend').getContext('2d');
        chartPriceTrend = new Chart(ctxPrice, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'GBS Purata (RM/g)',
                        data: filteredData.map(row => row.gbs_avg > 0 ? row.gbs_avg : null),
                        borderColor: '#8F1D38',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        spanGaps: true,
                        borderWidth: 2,
                        pointRadius: labels.length > 31 ? 0 : 2
                    },
                    {
                        label: 'Retail Purata (RM/g)',
                        data: filteredData.map(row => row.ret_avg > 0 ? row.ret_avg : null),
                        borderColor: '#B8960D',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        spanGaps: true,
                        borderWidth: 2,
                        pointRadius: labels.length > 31 ? 0 : 2
                    },
                    {
                        label: 'Jumlah Purata (RM/g)',
                        data: filteredData.map(row => row.total_avg > 0 ? row.total_avg : null),
                        borderColor: '#d97706',
                        borderDash: [5, 5],
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        spanGaps: true,
                        borderWidth: 1.5,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        ticks: { callback: value => 'RM ' + value }
                    }
                }
            }
        });

        // 3B. Price per Gram Monthly Trend Chart
        // Group data by month for prices
        const monthlyDataPrice = {};
        filteredData.forEach(row => {
            const m = row.date.substring(0, 7); // YYYY-MM
            if (!monthlyDataPrice[m]) {
                monthlyDataPrice[m] = { month: m, gbs_sales: 0, gbs_wt: 0, ret_sales: 0, ret_wt: 0 };
            }
            monthlyDataPrice[m].gbs_sales += row.gbs_sales;
            monthlyDataPrice[m].gbs_wt += row.gbs_wt;
            monthlyDataPrice[m].ret_sales += row.ret_sales;
            monthlyDataPrice[m].ret_wt += row.ret_wt;
        });

        const priceMonthLabels = Object.keys(monthlyDataPrice).sort().map(m => {
            const parts = m.split('-');
            return getMonthNameMalay(parts[1]) + ' ' + parts[0];
        });

        const monthlyGbsAvg = [];
        const monthlyRetAvg = [];
        const monthlyTotalAvg = [];

        Object.keys(monthlyDataPrice).sort().forEach(m => {
            const data = monthlyDataPrice[m];
            const gbsAvg = data.gbs_wt > 0 ? data.gbs_sales / data.gbs_wt : null;
            const retAvg = data.ret_wt > 0 ? data.ret_sales / data.ret_wt : null;
            
            const totalSales = data.gbs_sales + data.ret_sales;
            const totalWt = data.gbs_wt + data.ret_wt;
            const totalAvg = totalWt > 0 ? totalSales / totalWt : null;
            
            monthlyGbsAvg.push(gbsAvg);
            monthlyRetAvg.push(retAvg);
            monthlyTotalAvg.push(totalAvg);
        });

        const ctxPriceMonthly = document.getElementById('chart-price-monthly').getContext('2d');
        chartPriceMonthly = new Chart(ctxPriceMonthly, {
            type: 'line',
            data: {
                labels: priceMonthLabels,
                datasets: [
                    {
                        label: 'GBS Purata Bulanan (RM/g)',
                        data: monthlyGbsAvg,
                        borderColor: '#8F1D38',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        spanGaps: true,
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Retail Purata Bulanan (RM/g)',
                        data: monthlyRetAvg,
                        borderColor: '#B8960D',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        spanGaps: true,
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Jumlah Purata Bulanan (RM/g)',
                        data: monthlyTotalAvg,
                        borderColor: '#d97706',
                        borderDash: [5, 5],
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        spanGaps: true,
                        borderWidth: 1.5,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        ...tooltipConfig,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label.split(' ')[0]} Purata: ${formatCurrency(context.raw)}/g`;
                            }
                        }
                    },
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { 
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        ticks: { callback: value => 'RM ' + value }
                    }
                }
            }
        });

        // 4. Monthly Sales Contribution (%) - 100% Stacked Bar Chart
        const monthlyDataContrib = {};
        filteredData.forEach(row => {
            const m = row.date.substring(0, 7); // YYYY-MM
            if (!monthlyDataContrib[m]) {
                monthlyDataContrib[m] = { gbs: 0, retail: 0 };
            }
            monthlyDataContrib[m].gbs += row.gbs_sales;
            monthlyDataContrib[m].retail += row.ret_sales;
        });

        const contribMonthLabels = Object.keys(monthlyDataContrib).sort().map(m => {
            const parts = m.split('-');
            return getMonthNameMalay(parts[1]) + ' ' + parts[0];
        });

        const contribGbsPcts = [];
        const contribRetPcts = [];
        const contribGbsVals = [];
        const contribRetVals = [];

        Object.keys(monthlyDataContrib).sort().forEach(m => {
            const gbsVal = monthlyDataContrib[m].gbs;
            const retVal = monthlyDataContrib[m].retail;
            const total = gbsVal + retVal;
            
            contribGbsVals.push(gbsVal);
            contribRetVals.push(retVal);
            
            if (total > 0) {
                contribGbsPcts.push(parseFloat(((gbsVal / total) * 100).toFixed(2)));
                contribRetPcts.push(parseFloat(((retVal / total) * 100).toFixed(2)));
            } else {
                contribGbsPcts.push(0);
                contribRetPcts.push(0);
            }
        });
        
        const ctxContrib = document.getElementById('chart-contribution').getContext('2d');
        chartContribution = new Chart(ctxContrib, {
            type: 'bar',
            data: {
                labels: contribMonthLabels,
                datasets: [
                    {
                        label: 'GBS Purchase (%)',
                        data: contribGbsPcts,
                        backgroundColor: 'rgba(143, 29, 56, 0.85)',
                        borderRadius: 4
                    },
                    {
                        label: 'Retail Sales (%)',
                        data: contribRetPcts,
                        backgroundColor: 'rgba(184, 150, 13, 0.85)',
                        borderRadius: 4
                    }
                ]
            },
            plugins: [{
                id: 'percentageLabels',
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    ctx.save();
                    ctx.font = 'bold 11px \'Open Sans\', sans-serif';
                    ctx.fillStyle = '#2A2A2A';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';

                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((bar, index) => {
                            const val = dataset.data[index];
                            if (val > 0) {
                                ctx.fillText(val.toFixed(1) + '%', bar.x, bar.y - 5);
                            }
                        });
                    });
                    ctx.restore();
                }
            }],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        stacked: false,
                        grid: { display: false } 
                    },
                    y: { 
                        stacked: false,
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        ticks: { callback: value => value + '%' }
                    }
                },
                plugins: {
                    tooltip: {
                        ...tooltipConfig,
                        callbacks: {
                            label: function(context) {
                                const datasetIndex = context.datasetIndex;
                                const index = context.dataIndex;
                                const pct = context.raw;
                                if (datasetIndex === 0) {
                                    return ` GBS Purchase: ${pct}% (${formatCurrency(contribGbsVals[index])})`;
                                } else {
                                    return ` Retail Sales: ${pct}% (${formatCurrency(contribRetVals[index])})`;
                                }
                            }
                        }
                    },
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                }
            }
        });

        // 5. Monthly Breakdown Stacked Bar Chart
        // Group data by month
        const monthlyData = {};
        filteredData.forEach(row => {
            const m = row.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[m]) {
                monthlyData[m] = { gbs: 0, retail: 0 };
            }
            monthlyData[m].gbs += row.gbs_sales;
            monthlyData[m].retail += row.ret_sales;
        });

        const monthLabels = Object.keys(monthlyData).sort().map(m => {
            const parts = m.split('-');
            return getMonthNameMalay(parts[1]) + ' ' + parts[0];
        });

        const monthGbsVals = Object.keys(monthlyData).sort().map(m => monthlyData[m].gbs);
        const monthRetVals = Object.keys(monthlyData).sort().map(m => monthlyData[m].retail);

        const ctxMonthly = document.getElementById('chart-monthly-sales').getContext('2d');
        chartMonthlySales = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [
                    {
                        label: 'GBS Purchase',
                        data: monthGbsVals,
                        backgroundColor: 'rgba(143, 29, 56, 0.85)',
                        borderRadius: 4
                    },
                    {
                        label: 'Retail Sales',
                        data: monthRetVals,
                        backgroundColor: 'rgba(184, 150, 13, 0.85)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { 
                        stacked: false,
                        grid: { display: false } 
                    },
                    y: { 
                        stacked: false,
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        ticks: { callback: value => 'RM ' + formatCompact(value) }
                    }
                },
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { position: 'top', labels: { boxWidth: 12 } }
                }
            }
        });
    }

    // --- Table Sorting & Rendering ---
    function sortData(column) {
        if (currentSortColumn === column) {
            currentSortAscending = !currentSortAscending;
        } else {
            currentSortColumn = column;
            currentSortAscending = true;
        }

        filteredData.sort((a, b) => {
            let valA, valB;
            
            switch(column) {
                case 'date':
                    valA = new Date(a.date);
                    valB = new Date(b.date);
                    break;
                case 'gbs_tx':
                    valA = a.gbs_tx; valB = b.gbs_tx; break;
                case 'gbs_wt':
                    valA = a.gbs_wt; valB = b.gbs_wt; break;
                case 'gbs_sales':
                    valA = a.gbs_sales; valB = b.gbs_sales; break;
                case 'ret_tx':
                    valA = a.ret_tx; valB = b.ret_tx; break;
                case 'ret_wt':
                    valA = a.ret_wt; valB = b.ret_wt; break;
                case 'ret_prem':
                    valA = a.ret_prem; valB = b.ret_prem; break;
                case 'ret_sales':
                    valA = a.ret_sales; valB = b.ret_sales; break;
                case 'total_wt':
                    valA = a.total_wt; valB = b.total_wt; break;
                case 'total_sales':
                    valA = a.total_sales; valB = b.total_sales; break;
                default:
                    valA = a.date; valB = b.date;
            }

            if (valA < valB) return currentSortAscending ? -1 : 1;
            if (valA > valB) return currentSortAscending ? 1 : -1;
            return 0;
        });

        renderTable();
    }

    // Attach Table Header Sort Event Listeners
    document.querySelectorAll('.data-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortCol = th.getAttribute('data-sort');
            sortData(sortCol);
            
            // Update UI sort indicators
            document.querySelectorAll('.data-table th i').forEach(icon => {
                icon.className = 'fa-solid fa-sort';
            });
            const activeIcon = th.querySelector('i');
            if (currentSortAscending) {
                activeIcon.className = 'fa-solid fa-sort-up text-gold';
            } else {
                activeIcon.className = 'fa-solid fa-sort-down text-gold';
            }
        });
    });

    function renderTable() {
        tableBody.innerHTML = "";
        
        const totalRows = filteredData.length;
        if (totalRows === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center" style="padding: 40px; color: var(--text-muted);">
                        <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                        Tiada data dijumpai bagi penapis semasa.
                    </td>
                </tr>
            `;
            paginationInfo.textContent = "Menunjukkan 0 hingga 0 daripada 0 entri";
            paginationControls.innerHTML = "";
            return;
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
        const pageData = filteredData.slice(startIndex, endIndex);

        pageData.forEach(row => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td class="cell-date text-center">${formatDateMalay(row.date)}</td>
                
                <td class="cell-gbs text-center">${row.gbs_tx || '-'}</td>
                <td class="cell-gbs text-right">${row.gbs_wt > 0 ? formatNumber(row.gbs_wt, 4) : '-'}</td>
                <td class="cell-gbs text-right">${row.gbs_sales > 0 ? formatCurrency(row.gbs_sales) : '-'}</td>
                <td class="cell-gbs text-right text-muted">${row.gbs_avg > 0 ? formatCurrency(row.gbs_avg) + '/g' : '-'}</td>
                
                <td class="cell-retail text-center">${row.ret_tx || '-'}</td>
                <td class="cell-retail text-right">${row.ret_wt > 0 ? formatNumber(row.ret_wt, 4) : '-'}</td>
                <td class="cell-retail text-right text-muted">${row.ret_prem > 0 ? formatCurrency(row.ret_prem) : '-'}</td>
                <td class="cell-retail text-right">${row.ret_sales > 0 ? formatCurrency(row.ret_sales) : '-'}</td>
                <td class="cell-retail text-right text-muted">${row.ret_avg > 0 ? formatCurrency(row.ret_avg) + '/g' : '-'}</td>
                
                <td class="cell-combined text-right">${row.total_wt > 0 ? formatNumber(row.total_wt, 4) : '-'}</td>
                <td class="cell-combined text-right">${row.total_sales > 0 ? formatCurrency(row.total_sales) : '-'}</td>
                <td class="cell-combined text-right">${row.total_avg > 0 ? formatCurrency(row.total_avg) + '/g' : '-'}</td>
            `;
            
            tableBody.appendChild(tr);
        });

        // Update pagination details
        paginationInfo.textContent = `Menunjukkan ${startIndex + 1} hingga ${endIndex} daripada ${totalRows} entri`;
        
        renderPaginationControls(totalRows);
    }

    function renderPaginationControls(totalRows) {
        paginationControls.innerHTML = "";
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        
        if (totalPages <= 1) return;

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
        paginationControls.appendChild(prevBtn);

        // Page Number Buttons (Max 5 displayed)
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            paginationControls.appendChild(pageBtn);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
        paginationControls.appendChild(nextBtn);
    }

    // --- Export Functions ---
    btnExportCsv.addEventListener('click', () => {
        if (filteredData.length === 0) return;
        
        let csvContent = "Tarikh,GBS Transaksi,GBS Berat (g),GBS Jualan (RM),GBS Purata (RM/g),Retail Pesanan,Retail Berat (g),Retail Premium (RM),Retail Jualan (RM),Retail Purata (RM/g),Jumlah Berat (g),Jumlah Jualan (RM),Jumlah Purata (RM/g)\n";
        
        filteredData.forEach(row => {
            csvContent += `${row.date},${row.gbs_tx},${row.gbs_wt},${row.gbs_sales},${row.gbs_avg.toFixed(4)},${row.ret_tx},${row.ret_wt},${row.ret_prem},${row.ret_sales},${row.ret_avg.toFixed(4)},${row.total_wt},${row.total_sales},${row.total_avg.toFixed(4)}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `gbgold_combined_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    btnExportXlsx.addEventListener('click', () => {
        if (filteredData.length === 0) return;
        
        // Prepare data for Excel
        const excelRows = filteredData.map(row => ({
            "Tarikh": formatDateMalay(row.date),
            "GBS Transaksi": row.gbs_tx,
            "GBS Berat (g)": row.gbs_wt,
            "GBS Jualan (RM)": row.gbs_sales,
            "GBS Purata (RM/g)": row.gbs_avg,
            "Retail Pesanan": row.ret_tx,
            "Retail Berat (g)": row.ret_wt,
            "Retail Premium (RM)": row.ret_prem,
            "Retail Jualan (RM)": row.ret_sales,
            "Retail Purata (RM/g)": row.ret_avg,
            "Combined Berat (g)": row.total_wt,
            "Combined Jualan (RM)": row.total_sales,
            "Combined Purata (RM/g)": row.total_avg
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Gabungan 2026");
        
        // Add styling properties (column widths)
        const wscols = [
            { wch: 15 }, // Tarikh
            { wch: 15 }, // GBS Tx
            { wch: 15 }, // GBS Weight
            { wch: 15 }, // GBS Sales
            { wch: 18 }, // GBS Avg
            { wch: 15 }, // Retail Orders
            { wch: 15 }, // Retail Weight
            { wch: 18 }, // Retail Premium
            { wch: 15 }, // Retail Sales
            { wch: 18 }, // Retail Avg
            { wch: 18 }, // Combined Weight
            { wch: 18 }, // Combined Sales
            { wch: 20 }  // Combined Avg
        ];
        worksheet['!cols'] = wscols;
        
        XLSX.writeFile(workbook, `gbgold_combined_sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    });

    // --- Helper Formatting Functions ---
    function formatCurrency(val) {
        return 'RM ' + val.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatNumber(val, decimals = 2) {
        return val.toLocaleString('ms-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function formatWeight(grams) {
        if (grams >= 1000) {
            const kg = grams / 1000;
            // 3 decimal places for kg (e.g., 5.124 kg) is very close to the actual grams
            return kg.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' kg';
        }
        return grams.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g';
    }

    function formatCompact(val) {
        return val.toLocaleString('ms-MY', { notation: 'compact', compactDisplay: 'short' });
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDateMalay(dateStr) {
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function formatDateShort(dateStr) {
        const parts = dateStr.split('-');
        // Return DD/MM
        return `${parts[2]}/${parts[1]}`;
    }

    function getMonthNameMalay(monthNum) {
        const months = {
            '01': 'Januari', '02': 'Februari', '03': 'Mac', '04': 'April',
            '05': 'Mei', '06': 'Jun', '07': 'Julai', '08': 'Ogos',
            '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Disember'
        };
        return months[monthNum] || monthNum;
    }

    // --- Demo Data Generator ---
    function generateDemoData() {
        const start = new Date("2026-01-01");
        const end = new Date("2026-05-31");
        
        gbsData = [];
        retailData = [];
        
        let current = new Date(start);
        let idCounter = 111386;
        let orderCounter = 7923;
        
        // Base gold price fluctuating around RM 380 - RM 420 per gram
        let baseGoldPrice = 390;
        
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            const isWeekend = current.getDay() === 0 || current.getDay() === 6;
            
            // Fluctuating gold price day-by-day
            baseGoldPrice += (Math.random() - 0.5) * 4;
            baseGoldPrice = Math.max(360, Math.min(440, baseGoldPrice));
            
            // 1. Generate GBS Purchase Data
            // Weekends have lower transactions usually, or sometimes spikes
            const gbsTx = Math.round(isWeekend ? (30 + Math.random() * 80) : (50 + Math.random() * 150));
            const gbsWeight = gbsTx * (0.5 + Math.random() * 1.5); // avg 1-2g per tx
            const gbsSales = gbsWeight * (baseGoldPrice + (Math.random() - 0.5) * 5);
            
            const gbsIdsList = [];
            for (let i = 0; i < 5 && i < gbsTx; i++) {
                gbsIdsList.push(`CPO-00${idCounter + i}`);
            }
            idCounter += gbsTx;
            if (gbsTx > 5) gbsIdsList.push('...');
            
            gbsData.push({
                date: dateStr,
                transactions: gbsTx,
                weight: gbsWeight,
                sales: gbsSales,
                ids: gbsIdsList.join(', ')
            });
            
            // 2. Generate Retail Daily Sales Data
            // Less frequency, higher variance in orders
            const retTx = Math.round(isWeekend ? (2 + Math.random() * 8) : (4 + Math.random() * 14));
            const retWeight = retTx * (2 + Math.random() * 8); // avg 2-10g per order (higher weights in retail)
            const retPremium = retTx * (15 + Math.round(Math.random() * 40)); // RM 15-55 premium per order
            const retShipment = retTx * (Math.random() > 0.3 ? 10 : 0); // RM 10 shipment fee sometimes
            // Retail sales include base price + premium + shipping
            const retSales = (retWeight * (baseGoldPrice + 15)) + retPremium + retShipment;
            
            const retIdsList = [];
            for (let i = 0; i < 3 && i < retTx; i++) {
                retIdsList.push(`#0000${orderCounter + i}`);
            }
            orderCounter += retTx;
            if (retTx > 3) retIdsList.push('...');
            
            retailData.push({
                date: dateStr,
                orders: retTx,
                weight: retWeight,
                premium: retPremium,
                shipment: retShipment,
                sales: retSales,
                ids: retIdsList.join(', ')
            });
            
            // Advance 1 day
            current.setDate(current.getDate() + 1);
        }
    }

    // --- Save to Server Event ---
    btnSaveServer.addEventListener('click', () => {
        if (combinedData.length === 0) {
            alert("Tiada data untuk disimpan!");
            return;
        }

        const key = prompt("Sila masukkan Kata Laluan Keselamatan untuk menyimpan data ke server:");
        if (key === null) return; // User cancelled
        if (!key) {
            alert("Kata laluan keselamatan diperlukan!");
            return;
        }

        // Change button state to loading
        const originalText = btnSaveServer.innerHTML;
        btnSaveServer.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btnSaveServer.setAttribute('disabled', 'true');

        fetch('save_data.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key, data: combinedData })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                alert("Berjaya! " + res.message);
            } else {
                alert("Gagal: " + res.message);
            }
        })
        .catch(err => {
            alert("Ralat sambungan ke server: " + err.message);
        })
        .finally(() => {
            btnSaveServer.innerHTML = originalText;
            btnSaveServer.removeAttribute('disabled');
        });
    });

    // --- Autoload Data from Server ---
    function autoloadData() {
        fetch('data.json', { cache: 'no-store' }) // Avoid cached empty data
            .then(res => {
                if (res.ok) {
                    return res.json();
                }
                throw new Error("Fail data.json tidak dijumpai.");
            })
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    combinedData = data;
                    initializeDashboard();
                    console.log("Data berjaya diautoload dari server.");
                }
            })
            .catch(err => {
                console.log("Tiada data autoload tersedia:", err.message);
            });
    }

    // Run autoload on page load
    autoloadData();
});
