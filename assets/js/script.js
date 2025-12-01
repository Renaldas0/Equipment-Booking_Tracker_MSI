        // --- GLOBAL STATE ---
        let userId; 
        let userName = "Local User"; // Default user name for logs/bookings
        let currentBookingDate = new Date();
        
        // Data is stored in these global arrays after loading from localStorage
        let allEquipment = [];
        let allBookings = [];
        let allLogs = [];
        
        const LOCAL_STORAGE_KEY = 'local_asset_data_v1';
        
        // --- TAILWIND STYLES (Simplified for clarity) ---
        const tableHeaderStyles = "p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider";
        const tableCellStyles = "p-4 border-b border-slate-200 text-sm";
        const formLabelStyles = "block text-sm font-medium text-slate-700 mb-1";
        const formInputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
        const btnPrimaryStyles = "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200";
        const btnSecondaryStyles = "bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded-lg border border-slate-300 shadow-sm transition duration-200";
        const btnDangerStyles = "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200";
        const navLinkStyles = "flex items-center py-3 px-6 md:px-6 text-sm font-medium border-l-4 transition duration-200";
        const activeNavStyles = "bg-indigo-50 text-indigo-600 border-indigo-400";
        const inactiveNavStyles = "text-slate-600 hover:bg-slate-100 hover:text-slate-800 border-transparent";
        
        // --- AUTH/USER ID REPLACEMENT ---

        /**
         * Gets or creates a persistent local user ID.
         */
        function getLocalUserId() {
            let id = localStorage.getItem('local_user_id');
            if (!id) {
                // Generate a simple unique ID
                id = 'user-' + Math.random().toString(36).substring(2, 10);
                localStorage.setItem('local_user_id', id);
            }
            userId = id;
            document.getElementById('userIdDisplay').textContent = userId;
        }

        // --- PERSISTENCE LAYER (Local Storage) ---

        /**
         * Loads all data from localStorage into global arrays.
         */
        function loadData() {
            const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedData) {
                const data = JSON.parse(storedData);
                allEquipment = data.equipment || [];
                allBookings = data.bookings || [];
                allLogs = data.logs || [];
            } else {
                allEquipment = [];
                allBookings = [];
                allLogs = [];
            }
        }

        /**
         * Saves all global arrays back to localStorage.
         */
        function saveData() {
            const dataToStore = {
                equipment: allEquipment,
                bookings: allBookings,
                logs: allLogs
            };
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
            } catch (e) {
                console.error("Error saving to localStorage:", e);
                showToast("Error saving data locally. Storage may be full.", true);
            }
        }
        
        /**
         * Re-renders all UI components after a data change.
         */
        function reloadDataAndRender() {
            loadData();
            
            // Sort data immediately after loading
            allEquipment.sort((a, b) => a.name.localeCompare(b.name));
            allBookings.sort((a, b) => a.startTime - b.startTime);
            allLogs.sort((a, b) => b.timestamp - a.timestamp); // Newest first
            
            renderEquipmentTable();
            renderLogsTable();
            renderBookingSchedule();
            renderDashboardStats();
        }

        // --- HELPER FUNCTIONS ---
        
        /**
         * Applies Tailwind classes to elements.
         */
        function applyTailwindStyles() {
            document.querySelectorAll('.table-header').forEach(el => el.className = tableHeaderStyles);
            document.querySelectorAll('.form-label').forEach(el => el.className = formLabelStyles);
            document.querySelectorAll('.form-input').forEach(el => el.className = formInputStyles);
            document.querySelectorAll('.btn-primary').forEach(el => el.className = btnPrimaryStyles);
            document.querySelectorAll('.btn-secondary').forEach(el => el.className = btnSecondaryStyles);
            document.querySelectorAll('.btn-danger').forEach(el => el.className = btnDangerStyles);
            document.querySelectorAll('.nav-link').forEach(el => {
                const baseStyles = navLinkStyles.split(' ');
                el.classList.add(...baseStyles);
                if (!el.classList.contains('active-nav')) {
                    const inactive = inactiveNavStyles.split(' ');
                    el.classList.add(...inactive);
                }
            });
        }

        /**
         * Formats a Unix timestamp (ms) to a readable string
         * @param {number} ts - The Unix timestamp in milliseconds
         * @returns {string} Formatted date/time
         */
        function formatTimestamp(ts) {
            if (!ts) return "N/A";
            const date = new Date(ts);
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        }
        
        /**
         * Formats a date for the booking display
         * @param {Date} date - The date
         * @returns {string} Formatted date
         */
        function formatDateForBooking(date) {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        }
        
        /**
         * Formats a date for an input[type=date]
         * @param {Date} date - The date
         * @returns {string} 'YYYY-MM-DD'
         */
        function formatDateForInput(date) {
            return date.toISOString().split('T')[0];
        }
        
        /**
         * Formats a time for an input[type=time]
         * @param {Date} date - The date
         * @returns {string} 'HH:MM'
         */
        function formatTimeForInput(date) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        /**
         * Shows a toast notification
         * @param {string} message - The message to display
         * @param {boolean} [isError=false] - If true, shows red error style
         */
        function showToast(message, isError = false) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            
            toastMessage.textContent = message;
            toast.classList.toggle('bg-red-600', isError);
            toast.classList.toggle('bg-slate-900', !isError);
            
            toast.classList.remove('translate-x-full');
            
            setTimeout(() => {
                toast.classList.add('translate-x-full');
            }, 3000);
        }

        /**
         * Opens a modal
         * @param {string} modalId - The ID of the modal to open
         */
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
            document.getElementById('modalBackdrop').classList.add('active');
        }

        /**
         * Closes all active modals
         */
        function closeModal() {
            document.querySelectorAll('.modal.active').forEach(modal => modal.classList.remove('active'));
            document.getElementById('modalBackdrop').classList.remove('active');
        }

        /**
         * Creates a new log entry
         * @param {string} activityType - Description of the activity
         */
        function createLogEntry(activityType) {
            allLogs.unshift({ // Add to the start of the array
                id: 'log-' + Date.now(),
                timestamp: Date.now(),
                userId: userId,
                activityType: activityType,
                ipAddress: "N/A (Local)"
            });
            saveData();
            renderLogsTable();
            renderDashboardStats();
        }
        
        // --- PAGE NAVIGATION ---
        function setupNavigation() {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const pageId = e.currentTarget.dataset.page;
                    
                    // Update content
                    document.querySelectorAll('.page-content').forEach(page => {
                        page.classList.toggle('active', page.id === `page-${pageId}`);
                    });
                    
                    // Update nav link styles
                    document.querySelectorAll('.nav-link').forEach(nav => {
                        nav.classList.remove(...activeNavStyles.split(' '));
                        nav.classList.add(...inactiveNavStyles.split(' '));
                        nav.classList.toggle('active-nav', nav.dataset.page === pageId);
                    });
                    
                    // Apply active styles to the clicked link
                    e.currentTarget.classList.add(...activeNavStyles.split(' '));
                    e.currentTarget.classList.remove(...inactiveNavStyles.split(' '));
                    
                    // Update URL hash
                    window.location.hash = pageId;
                });
            });

            // Check for initial hash
            const initialPage = window.location.hash.substring(1) || 'dashboard';
            const initialLink = document.querySelector(`.nav-link[data-page="${initialPage}"]`);
            if (initialLink) {
                initialLink.click();
            }
        }
        
        // --- RENDER FUNCTIONS ---
        
        /**
         * Renders the equipment table
         */
        function renderEquipmentTable() {
            const tbody = document.getElementById('equipmentTableBody');
            if (allEquipment.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center p-6 text-slate-500">No equipment found. Add some!</td></tr>`;
                return;
            }
            
            tbody.innerHTML = allEquipment.map(item => `
                <tr class="hover:bg-slate-50">
                    <td class="${tableCellStyles}">${item.name}</td>
                    <td class="${tableCellStyles} font-mono text-xs">${item.serialNumber}</td>
                    <td class="${tableCellStyles}">${item.type}</td>
                    <td class="${tableCellStyles}">
                        <span class="px-3 py-1 rounded-full text-xs font-medium
                            ${item.status === 'Available' ? 'bg-green-100 text-green-800' :
                            (item.status === 'Assigned' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}
                        ">
                            ${item.status}
                        </span>
                    </td>
                    <td class="${tableCellStyles}">${item.status === 'Assigned' ? item.assigneeName : 'N/A'}</td>
                    <td class="${tableCellStyles}">${item.status === 'Assigned' ? formatTimestamp(item.lastCheckedOut) : 'N/A'}</td>
                    <td class="${tableCellStyles} space-x-2 whitespace-nowrap">
                        ${item.status === 'Available' ? 
                            `<button class="btn-assign btn-primary !py-1 !px-3 !text-sm" data-id="${item.id}" data-name="${item.name}">Assign</button>` :
                            `<button class="btn-return btn-secondary !py-1 !px-3 !text-sm" data-id="${item.id}">Return</button>`
                        }
                        <button class="btn-edit btn-secondary !py-1 !px-3 !text-sm" data-id="${item.id}">Edit</button>
                    </td>
                </tr>
            `).join('');

            // Re-attach event listeners for new buttons
            attachEquipmentTableListeners();
        }
        
        /**
         * Renders the user logs table
         */
        function renderLogsTable() {
            const tbody = document.getElementById('logsTableBody');
            if (allLogs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center p-6 text-slate-500">No user logs found.</td></tr>`;
                return;
            }
            
            tbody.innerHTML = allLogs.map(log => `
                <tr class="hover:bg-slate-50">
                    <td class="${tableCellStyles}">${formatTimestamp(log.timestamp)}</td>
                    <td class="${tableCellStyles} font-mono text-xs">${log.userId}</td>
                    <td class="${tableCellStyles}">${log.activityType}</td>
                    <td class="${tableCellStyles} font-mono text-xs">${log.ipAddress}</td>
                </tr>
            `).join('');
        }
        
        /**
         * Renders the dashboard stats
         */
        function renderDashboardStats() {
            const radios = allEquipment.filter(e => e.type === 'Radio');
            const availableRadios = radios.filter(r => r.status === 'Available').length;
            document.getElementById('stat-radios').textContent = `${availableRadios} / ${radios.length}`;
            
            const assignedItems = allEquipment.filter(e => e.status === 'Assigned').length;
            document.getElementById('stat-assigned').textContent = assignedItems;
            
            // Computer statuses
            const now = new Date();
            updateComputerStatus('Computer-1', 'stat-computer-1', 'stat-computer-1-next', now);
            updateComputerStatus('Computer-2', 'stat-computer-2', 'stat-computer-2-next', now);

            // Recent activity
            const activityList = document.getElementById('recent-activity-list');
            
            if (allLogs.length === 0) {
                activityList.innerHTML = `<li class="text-center text-slate-500 py-4">No recent activity.</li>`;
                return;
            }
            
            activityList.innerHTML = allLogs.slice(0, 5).map(log => `
                <li class="flex items-center space-x-4">
                    <div class="p-2 bg-slate-100 rounded-full">
                        <span class="text-lg">
                            ${log.activityType.includes('Assign') ? '📤' : 
                             (log.activityType.includes('Return') ? '📥' : 
                             (log.activityType.includes('Book') ? '💻' : '➡️'))}
                        </span>
                    </div>
                    <div>
                        <p class="text-sm font-medium">${log.activityType}</p>
                        <p class="text-xs text-slate-500">${formatTimestamp(log.timestamp)} by ${log.userId.substring(0, 8)}...</p>
                    </div>
                </li>
            `).join('');
        }
        
        /**
         * Updates the status for a single computer on the dashboard
         */
        function updateComputerStatus(resourceId, statusElId, nextElId, now) {
            const statusEl = document.getElementById(statusElId);
            const nextEl = document.getElementById(nextElId);

            const bookingsForResource = allBookings
                .filter(b => b.resourceId === resourceId)
                .map(b => ({ ...b, startTime: new Date(b.startTime), endTime: new Date(b.endTime) }));

            const nowMs = now.getTime();
            const currentBooking = bookingsForResource.find(b => nowMs >= b.startTime.getTime() && nowMs < b.endTime.getTime());
            
            if (currentBooking) {
                statusEl.textContent = "Booked";
                statusEl.className = "text-xl font-semibold mt-2 text-red-600";
                nextEl.textContent = `Until ${formatTimestamp(currentBooking.endTime.getTime())} by ${currentBooking.bookerName}`;
            } else {
                statusEl.textContent = "Available";
                statusEl.className = "text-xl font-semibold mt-2 text-green-600";
                
                const nextBooking = bookingsForResource
                    .filter(b => b.startTime.getTime() > nowMs)
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
                    
                if (nextBooking) {
                    nextEl.textContent = `Next: ${formatTimestamp(nextBooking.startTime.getTime())} by ${nextBooking.bookerName}`;
                } else {
                    nextEl.textContent = "No upcoming bookings";
                }
            }
        }
        
        /**
         * Renders the booking schedule for the selected day
         */
        function renderBookingSchedule() {
            document.getElementById('bookingDateDisplay').textContent = formatDateForBooking(currentBookingDate);
            
            const scheduleContainer1 = document.getElementById('computer-1-schedule');
            const scheduleContainer2 = document.getElementById('computer-2-schedule');
            
            scheduleContainer1.innerHTML = '';
            scheduleContainer2.innerHTML = '';
            
            const dayStart = new Date(currentBookingDate);
            dayStart.setHours(8, 0, 0, 0); // 8:00 AM
            
            const dayEnd = new Date(currentBookingDate);
            dayEnd.setHours(18, 0, 0, 0); // 6:00 PM (18:00)

            // Get bookings for the selected day
            const startOfDayMs = dayStart.getTime();
            const endOfDayMs = dayEnd.getTime();
            
            const dayBookings = allBookings.filter(b => {
                return b.startTime >= startOfDayMs && b.startTime < endOfDayMs;
            });
            
            const bookings1 = dayBookings.filter(b => b.resourceId === 'Computer-1');
            const bookings2 = dayBookings.filter(b => b.resourceId === 'Computer-2');

            for (let hour = 8; hour < 18; hour++) {
                scheduleContainer1.appendChild(createTimeSlot('Computer-1', hour, bookings1));
                scheduleContainer2.appendChild(createTimeSlot('Computer-2', hour, bookings2));
            }
        }

        /**
         * Creates a single time slot element
         */
        function createTimeSlot(resourceId, hour, bookings) {
            const slot = document.createElement('div');
            const timeStart = new Date(currentBookingDate);
            timeStart.setHours(hour, 0, 0, 0);
            
            const timeLabel = timeStart.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            
            // Check for booking in this slot
            const booking = bookings.find(b => new Date(b.startTime).getHours() === hour);
            
            if (booking) {
                slot.className = "p-3 bg-red-100 border border-red-200 rounded-lg text-red-800";
                slot.innerHTML = `
                    <p class="font-semibold">${timeLabel}</p>
                    <p class="text-sm">Booked by: ${booking.bookerName}</p>
                    <button class="btn-delete-booking text-xs text-red-600 hover:underline" data-id="${booking.id}">Delete</button>
                `;
            } else {
                slot.className = "p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 flex justify-between items-center";
                slot.innerHTML = `
                    <p class="font-semibold">${timeLabel}</p>
                    <button class="btn-book-slot hover:bg-green-100 rounded-lg btn-primary !py-1 !px-3 !text-sm" data-resource="${resourceId}" data-time="${hour}">Book</button>
                `;
            }
            return slot;
        }

        // --- EVENT HANDLERS ---
        
        /**
         * Attaches listeners for the Equipment table (assign, return, edit)
         */
        function attachEquipmentTableListeners() {
            document.querySelectorAll('.btn-assign').forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.currentTarget.dataset.id;
                    const name = e.currentTarget.dataset.name;
                    document.getElementById('assignEquipmentId').value = id;
                    document.getElementById('assignItemName').textContent = name;
                    document.getElementById('assigneeName').value = userName; // Pre-fill with local name
                    openModal('assignModal');
                };
            });
            
            document.querySelectorAll('.btn-return').forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (confirm("Are you sure you want to return this item?")) {
                        const itemIndex = allEquipment.findIndex(i => i.id === id);
                        if (itemIndex > -1) {
                            const item = allEquipment[itemIndex];
                            item.status = "Available";
                            item.assigneeName = null;
                            item.assigneeId = null;
                            item.lastCheckedOut = null;
                            
                            saveData();
                            createLogEntry(`Returned item: ${item.name} (SN: ${item.serialNumber})`);
                            showToast("Item returned successfully.");
                            reloadDataAndRender();
                        }
                    }
                };
            });
            
            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.currentTarget.dataset.id;
                    const item = allEquipment.find(i => i.id === id);
                    if (item) {
                        document.getElementById('equipmentModalTitle').textContent = "Edit Equipment";
                        document.getElementById('equipmentId').value = item.id;
                        document.getElementById('equipmentName').value = item.name;
                        document.getElementById('equipmentSerial').value = item.serialNumber;
                        document.getElementById('equipmentType').value = item.type;
                        document.getElementById('deleteEquipmentBtn').classList.remove('hidden');
                        openModal('equipmentModal');
                    }
                };
            });
        }
        
        /**
         * Attaches listeners for the Booking schedule (book slot, delete booking)
         */
        function attachBookingScheduleListeners() {
            // Book new slot
            document.querySelectorAll('.btn-book-slot').forEach(btn => {
                btn.onclick = (e) => {
                    const resource = e.target.dataset.resource;
                    const hour = parseInt(e.target.dataset.time, 10);
                    
                    const startTime = new Date(currentBookingDate);
                    startTime.setHours(hour, 0, 0, 0);
                    
                    const endTime = new Date(currentBookingDate);
                    endTime.setHours(hour + 1, 0, 0, 0);

                    document.getElementById('bookingResource').value = resource;
                    document.getElementById('bookingDate').value = formatDateForInput(startTime);
                    document.getElementById('bookingStartTime').value = formatTimeForInput(startTime);
                    document.getElementById('bookingEndTime').value = formatTimeForInput(endTime);
                    
                    openModal('bookingModal');
                };
            });
            
            // Delete existing booking
            document.querySelectorAll('.btn-delete-booking').forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.target.dataset.id;
                    const booking = allBookings.find(b => b.id === id);
                    
                    // Allow deletion if the user ID matches the booker ID
                    if (booking.bookerId === userId) {
                        if (confirm("Are you sure you want to delete this booking?")) {
                            deleteBooking(id, booking);
                        }
                    } else {
                        showToast("You can only delete your own bookings.", true);
                    }
                };
            });
        }
        
        function deleteBooking(id, booking) {
            const index = allBookings.findIndex(b => b.id === id);
            if (index > -1) {
                allBookings.splice(index, 1);
                
                saveData();
                createLogEntry(`Deleted booking for ${booking.resourceName} at ${formatTimestamp(booking.startTime)}`);
                showToast("Booking deleted successfully.");
                reloadDataAndRender();
            }
        }

        /**
         * Attaches all other global event listeners
         */
        function setupEventListeners() {
            // Modal close buttons
            document.getElementById('closeEquipmentModalBtn').onclick = closeModal;
            document.getElementById('cancelEquipmentModalBtn').onclick = closeModal;
            document.getElementById('closeAssignModalBtn').onclick = closeModal;
            document.getElementById('cancelAssignModalBtn').onclick = closeModal;
            document.getElementById('closeBookingModalBtn').onclick = closeModal;
            document.getElementById('cancelBookingModalBtn').onclick = closeModal;
            document.getElementById('modalBackdrop').onclick = closeModal;
            
            // Open Modals
            document.getElementById('openAddEquipmentModalBtn').onclick = () => {
                document.getElementById('equipmentModalTitle').textContent = "Add New Equipment";
                document.getElementById('equipmentForm').reset();
                document.getElementById('equipmentId').value = '';
                document.getElementById('deleteEquipmentBtn').classList.add('hidden');
                openModal('equipmentModal');
            };
            
            document.getElementById('openBookingModalBtn').onclick = () => {
                document.getElementById('bookingForm').reset();
                document.getElementById('bookingDate').value = formatDateForInput(currentBookingDate);
                openModal('bookingModal');
            };
            
            // Equipment Form (Add/Edit)
            document.getElementById('equipmentForm').onsubmit = (e) => {
                e.preventDefault();
                const id = document.getElementById('equipmentId').value;
                const data = {
                    name: document.getElementById('equipmentName').value,
                    serialNumber: document.getElementById('equipmentSerial').value,
                    type: document.getElementById('equipmentType').value,
                };
                
                if (id) {
                    // Edit existing
                    const itemIndex = allEquipment.findIndex(i => i.id === id);
                    if (itemIndex > -1) {
                        Object.assign(allEquipment[itemIndex], data);
                        saveData();
                        createLogEntry(`Updated item: ${data.name} (SN: ${data.serialNumber})`);
                        showToast("Equipment updated successfully.");
                    }
                } else {
                    // Create new
                    data.id = 'equip-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
                    data.status = "Available"; 
                    allEquipment.push(data);
                    saveData();
                    createLogEntry(`Added item: ${data.name} (SN: ${data.serialNumber})`);
                    showToast("Equipment added successfully.");
                }
                closeModal();
                reloadDataAndRender();
            };
            
            // Delete Equipment
            document.getElementById('deleteEquipmentBtn').onclick = () => {
                const id = document.getElementById('equipmentId').value;
                const item = allEquipment.find(i => i.id === id);
                if (confirm(`Are you sure you want to delete ${item.name}? This action cannot be undone.`)) {
                    const itemIndex = allEquipment.findIndex(i => i.id === id);
                    if (itemIndex > -1) {
                        allEquipment.splice(itemIndex, 1);
                        saveData();
                        createLogEntry(`Deleted item: ${item.name} (SN: ${item.serialNumber})`);
                        showToast("Equipment deleted successfully.");
                        closeModal();
                        reloadDataAndRender();
                    }
                }
            };
            
            // Assign Form
            document.getElementById('assignForm').onsubmit = (e) => {
                e.preventDefault();
                const id = document.getElementById('assignEquipmentId').value;
                const name = document.getElementById('assigneeName').value;
                
                const itemIndex = allEquipment.findIndex(i => i.id === id);
                
                if (itemIndex > -1) {
                    const item = allEquipment[itemIndex];
                    item.status = "Assigned";
                    item.assigneeName = name;
                    item.assigneeId = userId;
                    item.lastCheckedOut = Date.now();
                    
                    saveData();
                    createLogEntry(`Assigned item: ${item.name} to ${name}`);
                    showToast("Item assigned successfully.");
                    closeModal();
                    reloadDataAndRender();
                }
            };
            
            // Booking Form
            document.getElementById('bookingForm').onsubmit = (e) => {
                e.preventDefault();
                const resourceId = document.getElementById('bookingResource').value;
                const date = document.getElementById('bookingDate').value;
                const startTimeStr = document.getElementById('bookingStartTime').value;
                const endTimeStr = document.getElementById('bookingEndTime').value;
                
                const [startHour, startMin] = startTimeStr.split(':').map(Number);
                const [endHour, endMin] = endTimeStr.split(':').map(Number);
                
                const startDate = new Date(date);
                startDate.setHours(startHour, startMin, 0, 0);
                
                const endDate = new Date(date);
                endDate.setHours(endHour, endMin, 0, 0);
                
                if (endDate.getTime() <= startDate.getTime()) {
                    showToast("End time must be after start time.", true);
                    return;
                }
                
                const startMs = startDate.getTime();
                const endMs = endDate.getTime();
                
                // Check for conflicts
                const conflict = allBookings.find(b =>
                    b.resourceId === resourceId &&
                    (
                        (b.startTime <= startMs && b.endTime > startMs) || 
                        (b.startTime < endMs && b.endTime >= endMs) ||     
                        (b.startTime >= startMs && b.endTime <= endMs)    
                    )
                );
                
                if (conflict) {
                    showToast("This time slot is already booked or conflicts with an existing booking.", true);
                    return;
                }
                
                // Create booking
                allBookings.push({
                    id: 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                    resourceId: resourceId,
                    resourceName: resourceId === 'Computer-1' ? "Workstation Alpha" : "Workstation Beta",
                    startTime: startMs,
                    endTime: endMs,
                    bookerName: userName,
                    bookerId: userId
                });
                
                saveData();
                createLogEntry(`Booked ${resourceId} from ${formatTimestamp(startDate)} to ${formatTimestamp(endDate)}`);
                showToast("Resource booked successfully.");
                closeModal();
                reloadDataAndRender();
            };
            
            // Booking date navigation
            document.getElementById('prevDayBtn').onclick = () => {
                currentBookingDate.setDate(currentBookingDate.getDate() - 1);
                reloadDataAndRender();
            };
            document.getElementById('nextDayBtn').onclick = () => {
                currentBookingDate.setDate(currentBookingDate.getDate() + 1);
                reloadDataAndRender();
            };
        }

        // --- APP START ---
        document.addEventListener('DOMContentLoaded', () => {
            applyTailwindStyles();
            getLocalUserId();
            setupNavigation();
            setupEventListeners();
            reloadDataAndRender(); 
        });