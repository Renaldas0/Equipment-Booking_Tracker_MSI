// Initialize Firebase

var admin = require("firebase-admin");

var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { 
            getAuth, 
            signInAnonymously, 
            signInWithCustomToken, 
            onAuthStateChanged 
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { 
            getFirestore, 
            doc, 
            getDoc, 
            addDoc, 
            setDoc, 
            updateDoc, 
            deleteDoc, 
            onSnapshot, 
            collection, 
            query, 
            where, 
            getDocs,
            Timestamp,
            setLogLevel
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- GLOBAL STATE ---
        let db, auth;
        let userId, userName;
        let currentBookingDate = new Date();
        
        let allEquipment = [];
        let allBookings = [];
        let allLogs = [];

        // Collection Refs
        let equipmentCol, bookingsCol, logsCol;
        
        // Unsubscribe functions for snapshot listeners
        let unsubEquipment, unsubBookings, unsubLogs;
        
        // --- CONSTANTS ---
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // 2. Placeholder for Firebase Configuration
        // NOTE: YOU MUST REPLACE THE VALUES BELOW WITH YOUR OWN FIREBASE CONFIGURATION.
        // Get this config from your Firebase project console -> Project Settings.
        let firebaseConfig = {
            apiKey: "AIzaSyBq0PvSp-00mcbHhWtiCDK9SCtGDVikTL4", 
            authDomain: "msi-tracker.firebaseapp.com",
            projectId: "msi-tracker",
            storageBucket: "msi-tracker.firebasestorage.app",
            messagingSenderId: "486848526130",
            appId: "1:486848526130:web:1fced54f6baa99aa91092b"
        };
        
        // Check if the environment provided config exists (like in Canvas)
        if (typeof __firebase_config !== 'undefined' && __firebase_config !== "") {
            // Use the provided config if available
            firebaseConfig = JSON.parse(__firebase_config);
        } else if (firebaseConfig.apiKey === "AIzaSyBq0PvSp-00mcbHhWtiCDK9SCtGDVikTL4") {
             // If we are running locally and the user didn't update the keys, show an error.
             document.body.innerHTML = `
                <div class="p-10 bg-red-100 text-red-800 border-l-4 border-red-500 m-8 rounded-lg shadow-lg">
                    <h1 class="text-2xl font-bold mb-4">Authentication Error: Missing Firebase Credentials</h1>
                    <p class="mb-4">This application requires a connection to a Firebase project to save and load data. Since you are running it locally:</p>
                    <ol class="list-decimal list-inside space-y-1">
                        <li>Go to your Firebase Console and create a new project.</li>
                        <li>In your project settings, find the "Add app" section and choose "Web".</li>
                        <li>Copy the config object (e.g., <code>{ apiKey: "...", projectId: "..." }</code>).</li>
                        <li>**PASTE** that config object into the <code>firebaseConfig</code> variable inside the <code>&lt;script&gt;</code> tag of this HTML file.</li>
                    </ol>
                    <p class="mt-4">Once updated, reload the page. It will automatically sign you in anonymously.</p>
                </div>
            `;
            console.error("Firebase API Key is missing. Please update firebaseConfig.");
            return; 
        }

        // The custom token is used by the environment, but ignored for local development
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
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
         * Formats a Firestore Timestamp or Date object to a readable string
         * @param {Timestamp|Date} ts - The timestamp
         * @returns {string} Formatted date/time
         */
        function formatTimestamp(ts) {
            if (!ts) return "N/A";
            const date = ts.toDate ? ts.toDate() : ts;
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
        async function createLogEntry(activityType) {
            if (!logsCol) return;
            try {
                await addDoc(logsCol, {
                    timestamp: Timestamp.now(),
                    userId: userId,
                    activityType: activityType,
                    ipAddress: "N/A (Client-side)"
                });
            } catch (error) {
                console.error("Error creating log entry:", error);
            }
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
            const sortedLogs = [...allLogs].reverse(); // Already sorted by timestamp
            if (sortedLogs.length === 0) {
                activityList.innerHTML = `<li class="text-center text-slate-500 py-4">No recent activity.</li>`;
                return;
            }
            
            activityList.innerHTML = sortedLogs.slice(0, 5).map(log => `
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
                .map(b => ({ ...b, startTime: b.startTime.toDate(), endTime: b.endTime.toDate() }));

            const currentBooking = bookingsForResource.find(b => now >= b.startTime && now < b.endTime);
            
            if (currentBooking) {
                statusEl.textContent = "Booked";
                statusEl.className = "text-xl font-semibold mt-2 text-red-600";
                nextEl.textContent = `Until ${formatTimestamp(currentBooking.endTime)} by ${currentBooking.bookerName}`;
            } else {
                statusEl.textContent = "Available";
                statusEl.className = "text-xl font-semibold mt-2 text-green-600";
                
                const nextBooking = bookingsForResource
                    .filter(b => b.startTime > now)
                    .sort((a, b) => a.startTime - b.startTime)[0];
                    
                if (nextBooking) {
                    nextEl.textContent = `Next: ${formatTimestamp(nextBooking.startTime)} by ${nextBooking.bookerName}`;
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
            const startOfDay = Timestamp.fromDate(dayStart);
            const endOfDay = Timestamp.fromDate(dayEnd);
            
            const dayBookings = allBookings.filter(b => {
                return b.startTime >= startOfDay && b.startTime < endOfDay;
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
            
            const timeEnd = new Date(currentBookingDate);
            timeEnd.setHours(hour + 1, 0, 0, 0);
            
            const timeLabel = timeStart.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            
            // Check for booking in this slot
            const booking = bookings.find(b => b.startTime.toDate().getHours() === hour);
            
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
                    <button class="btn-book-slot btn-primary !py-1 !px-3 !text-sm" data-resource="${resourceId}" data-time="${hour}">Book</button>
                `;
            }
            return slot;
        }

        // --- FIRESTORE OPERATIONS ---
        
        /**
         * Initializes all snapshot listeners
         */
        function initSnapshotListeners() {
            // Ensure listeners are only attached once
            if (unsubEquipment) unsubEquipment();
            if (unsubBookings) unsubBookings();
            if (unsubLogs) unsubLogs();
            
            // Equipment Listener
            equipmentCol = collection(db, `/artifacts/${appId}/public/data/equipment`);
            unsubEquipment = onSnapshot(equipmentCol, (snapshot) => {
                allEquipment = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allEquipment.sort((a, b) => a.name.localeCompare(b.name));
                renderEquipmentTable();
                renderDashboardStats();
            }, (error) => console.error("Error listening to equipment:", error));
            
            // Bookings Listener
            bookingsCol = collection(db, `/artifacts/${appId}/public/data/bookings`);
            unsubBookings = onSnapshot(bookingsCol, (snapshot) => {
                allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allBookings.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
                renderBookingSchedule();
                renderDashboardStats();
            }, (error) => console.error("Error listening to bookings:", error));
            
            // Logs Listener
            logsCol = collection(db, `/artifacts/${appId}/public/data/userlogs`); 
            // NOTE: In production, this should be /private/data/userlogs and secured with rules
            const logsQuery = query(collection(db, `/artifacts/${appId}/public/data/userlogs`), where("timestamp", "<=", Timestamp.now())); // Simple query
            unsubLogs = onSnapshot(logsQuery, (snapshot) => {
                allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allLogs.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()); // Newest first
                renderLogsTable();
                renderDashboardStats();
            }, (error) => console.error("Error listening to logs:", error));
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
                    document.getElementById('assigneeName').value = userName || ''; // Pre-fill if current user name is known
                    openModal('assignModal');
                };
            });
            
            document.querySelectorAll('.btn-return').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = e.currentTarget.dataset.id;
                    if (confirm("Are you sure you want to return this item?")) {
                        const itemDoc = doc(db, `/artifacts/${appId}/public/data/equipment`, id);
                        const item = allEquipment.find(i => i.id === id);
                        try {
                            await updateDoc(itemDoc, {
                                status: "Available",
                                assigneeName: null,
                                assigneeId: null,
                                lastCheckedOut: null
                            });
                            await createLogEntry(`Returned item: ${item.name} (SN: ${item.serialNumber})`);
                            showToast("Item returned successfully.");
                        } catch (error) {
                            console.error("Error returning item:", error);
                            showToast("Error returning item.", true);
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
            document.getElementById('computer-1-schedule').addEventListener('click', handleBookingClick);
            document.getElementById('computer-2-schedule').addEventListener('click', handleBookingClick);
        }
        
        function handleBookingClick(e) {
            // Book new slot
            if (e.target.classList.contains('btn-book-slot')) {
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
            }
            
            // Delete existing booking
            if (e.target.classList.contains('btn-delete-booking')) {
                const id = e.target.dataset.id;
                const booking = allBookings.find(b => b.id === id);
                
                // Only allow booker or admin (simplified check)
                if (booking.bookerId === userId) {
                    if (confirm("Are you sure you want to delete this booking?")) {
                        deleteBooking(id, booking);
                    }
                } else {
                    showToast("You can only delete your own bookings.", true);
                }
            }
        }
        
        async function deleteBooking(id, booking) {
            const bookingDoc = doc(db, `/artifacts/${appId}/public/data/bookings`, id);
            try {
                await deleteDoc(bookingDoc);
                await createLogEntry(`Deleted booking for ${booking.resourceName} at ${formatTimestamp(booking.startTime)}`);
                showToast("Booking deleted successfully.");
            } catch (error) {
                console.error("Error deleting booking:", error);
                showToast("Error deleting booking.", true);
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
            
            // Equipment Form
            document.getElementById('equipmentForm').onsubmit = async (e) => {
                e.preventDefault();
                const id = document.getElementById('equipmentId').value;
                const data = {
                    name: document.getElementById('equipmentName').value,
                    serialNumber: document.getElementById('equipmentSerial').value,
                    type: document.getElementById('equipmentType').value,
                };
                
                try {
                    if (id) {
                        // Update
                        const itemDoc = doc(db, `/artifacts/${appId}/public/data/equipment`, id);
                        await updateDoc(itemDoc, data);
                        await createLogEntry(`Updated item: ${data.name} (SN: ${data.serialNumber})`);
                        showToast("Equipment updated successfully.");
                    } else {
                        // Create
                        data.status = "Available"; // Default status
                        await addDoc(equipmentCol, data);
                        await createLogEntry(`Added item: ${data.name} (SN: ${data.serialNumber})`);
                        showToast("Equipment added successfully.");
                    }
                    closeModal();
                } catch (error) {
                    console.error("Error saving equipment:", error);
                    showToast("Error saving equipment.", true);
                }
            };
            
            // Delete Equipment
            document.getElementById('deleteEquipmentBtn').onclick = async () => {
                const id = document.getElementById('equipmentId').value;
                const item = allEquipment.find(i => i.id === id);
                if (confirm(`Are you sure you want to delete ${item.name}? This action cannot be undone.`)) {
                    const itemDoc = doc(db, `/artifacts/${appId}/public/data/equipment`, id);
                    try {
                        await deleteDoc(itemDoc);
                        await createLogEntry(`Deleted item: ${item.name} (SN: ${item.serialNumber})`);
                        showToast("Equipment deleted successfully.");
                        closeModal();
                    } catch (error) {
                        console.error("Error deleting equipment:", error);
                        showToast("Error deleting equipment.", true);
                    }
                }
            };
            
            // Assign Form
            document.getElementById('assignForm').onsubmit = async (e) => {
                e.preventDefault();
                const id = document.getElementById('assignEquipmentId').value;
                const name = document.getElementById('assigneeName').value;
                const item = allEquipment.find(i => i.id === id);
                
                const itemDoc = doc(db, `/artifacts/${appId}/public/data/equipment`, id);
                try {
                    await updateDoc(itemDoc, {
                        status: "Assigned",
                        assigneeName: name,
                        assigneeId: userId, // Log the ID of the user *doing* the assigning
                        lastCheckedOut: Timestamp.now()
                    });
                    await createLogEntry(`Assigned item: ${item.name} to ${name}`);
                    showToast("Item assigned successfully.");
                    closeModal();
                } catch (error) {
                    console.error("Error assigning item:", error);
                    showToast("Error assigning item.", true);
                }
            };
            
            // Booking Form
            document.getElementById('bookingForm').onsubmit = async (e) => {
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
                
                if (endDate <= startDate) {
                    showToast("End time must be after start time.", true);
                    return;
                }
                
                // Check for conflicts
                const startTs = Timestamp.fromDate(startDate);
                const endTs = Timestamp.fromDate(endDate);
                
                const conflict = allBookings.find(b =>
                    b.resourceId === resourceId &&
                    (
                        (b.startTime <= startTs && b.endTime > startTs) || // New booking starts during existing one
                        (b.startTime < endTs && b.endTime >= endTs) ||     // New booking ends during existing one
                        (b.startTime >= startTs && b.endTime <= endTs)    // New booking surrounds existing one
                    )
                );
                
                if (conflict) {
                    showToast("This time slot is already booked or conflicts with an existing booking.", true);
                    return;
                }
                
                try {
                    await addDoc(bookingsCol, {
                        resourceId: resourceId,
                        resourceName: resourceId === 'Computer-1' ? "Workstation Alpha" : "Workstation Beta",
                        startTime: startTs,
                        endTime: endTs,
                        bookerName: userName || userId.substring(0, 8),
                        bookerId: userId
                    });
                    await createLogEntry(`Booked ${resourceId} from ${formatTimestamp(startDate)} to ${formatTimestamp(endDate)}`);
                    showToast("Resource booked successfully.");
                    closeModal();
                } catch (error) {
                    console.error("Error creating booking:", error);
                    showToast("Error creating booking.", true);
                }
            };
            
            // Booking date navigation
            document.getElementById('prevDayBtn').onclick = () => {
                currentBookingDate.setDate(currentBookingDate.getDate() - 1);
                renderBookingSchedule();
            };
            document.getElementById('nextDayBtn').onclick = () => {
                currentBookingDate.setDate(currentBookingDate.getDate() + 1);
                renderBookingSchedule();
            };
            
            // Booking schedule clicks
            attachBookingScheduleListeners();
        }

        // --- INITIALIZATION ---
        async function initializeAppAndAuth() {
            // Check for explicit error message from config failure
            if (document.body.innerHTML.includes("Authentication Error: Missing Firebase Credentials")) {
                return;
            }

            try {
                const app = initializeApp(firebaseConfig);
                auth = getAuth(app);
                db = getFirestore(app);
                setLogLevel('Debug'); // Enable Firestore logging
                
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        userId = user.uid;
                        // Use a fallback name for Anonymous users
                        userName = user.displayName || user.email || (user.isAnonymous ? "Anon-" + userId.substring(0, 8) : userId.substring(0, 8));
                        document.getElementById('userIdDisplay').textContent = userId;
                        
                        // User is authenticated, safe to initialize Firestore listeners
                        initSnapshotListeners();
                        
                    } else {
                        // User is signed out. Clear sensitive data.
                        userId = null;
                        document.getElementById('userIdDisplay').textContent = "Not signed in";
                        
                        // Detach listeners and clear data
                        if (unsubEquipment) unsubEquipment();
                        if (unsubBookings) unsubBookings();
                        if (unsubLogs) unsubLogs();
                        
                        allEquipment = [];
                        allBookings = [];
                        allLogs = [];
                        
                        renderEquipmentTable();
                        renderLogsTable();
                        renderBookingSchedule();
                        renderDashboardStats();
                    }
                });
                
                // SIGN-IN FIX: Use the special token if provided (Canvas), otherwise sign in anonymously (VS Code/local)
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
                
                showToast("Signed in anonymously. You can now use the dashboard.");

            } catch (error) {
                console.error("Firebase initialization error:", error);
                document.body.innerHTML = `
                    <div class="p-10 bg-red-100 text-red-800 border-l-4 border-red-500 m-8 rounded-lg shadow-lg">
                        <h1 class="text-2xl font-bold mb-4">Firebase Initialization Error</h1>
                        <p class="mb-2">There was an error connecting to Firebase. Please ensure your <code>firebaseConfig</code> (especially <code>apiKey</code>) is correct and your Firestore security rules allow anonymous reads/writes.</p>
                        <p class="font-semibold">Error Message: ${error.message}</p>
                    </div>
                `;
            }
        }
        
        // --- APP START ---
        document.addEventListener('DOMContentLoaded', () => {
            applyTailwindStyles();
            setupNavigation();
            setupEventListeners();
            renderBookingSchedule(); // Initial render with current date
            initializeAppAndAuth();
        });