// Data Persistence Module
const DataStore = {
    // Storage keys
    KEYS: {
        PLANNERS: 'plannerDrive_planners',
        CURRENT_PLANNER: 'plannerDrive_currentPlanner',
        SETTINGS: 'plannerDrive_settings',
        LAST_BACKUP: 'plannerDrive_lastBackup'
    },
    
    // Initialize data store
    init: function() {
        // Create default data if none exists
        if (!this.getPlanners().length) {
            this.savePlanners([]);
        }
        
        if (!this.getSettings()) {
            this.saveSettings({
                autoSave: true,
                autoBackup: false,
                backupInterval: 24, // hours
                theme: 'dark'
            });
        }
        
        // Set up auto-backup if enabled
        const settings = this.getSettings();
        if (settings.autoBackup) {
            this.scheduleBackup();
        }
        
        console.log('DataStore initialized');
        return this;
    },
    
    // Get all planners
    getPlanners: function() {
        const data = localStorage.getItem(this.KEYS.PLANNERS);
        return data ? JSON.parse(data) : [];
    },
    
    // Save all planners
    savePlanners: function(planners) {
        localStorage.setItem(this.KEYS.PLANNERS, JSON.stringify(planners));
        return planners;
    },
    
    // Get current planner
    getCurrentPlanner: function() {
        const id = localStorage.getItem(this.KEYS.CURRENT_PLANNER);
        if (!id) return null;
        
        const planners = this.getPlanners();
        return planners.find(p => p.id === id) || null;
    },
    
    // Save current planner ID
    saveCurrentPlanner: function(plannerId) {
        localStorage.setItem(this.KEYS.CURRENT_PLANNER, plannerId);
        return plannerId;
    },
    
    // Get settings
    getSettings: function() {
        const data = localStorage.getItem(this.KEYS.SETTINGS);
        return data ? JSON.parse(data) : null;
    },
    
    // Save settings
    saveSettings: function(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
        return settings;
    },
    
    // Create a backup of all data
    createBackup: function() {
        const backup = {
            planners: this.getPlanners(),
            settings: this.getSettings(),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem(this.KEYS.LAST_BACKUP, JSON.stringify(backup));
        console.log('Backup created:', backup.timestamp);
        return backup;
    },
    
    // Restore from backup
    restoreFromBackup: function(backup) {
        if (!backup) {
            const backupData = localStorage.getItem(this.KEYS.LAST_BACKUP);
            if (!backupData) {
                console.error('No backup found');
                return false;
            }
            backup = JSON.parse(backupData);
        }
        
        this.savePlanners(backup.planners);
        this.saveSettings(backup.settings);
        console.log('Restored from backup:', backup.timestamp);
        return true;
    },
    
    // Export all data as JSON
    exportData: function() {
        const data = {
            planners: this.getPlanners(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'planner_drive_export_' + new Date().toISOString().slice(0, 10) + '.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        console.log('Data exported');
        return data;
    },
    
    // Import data from JSON
    importData: function(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            // Validate data structure
            if (!data.planners || !Array.isArray(data.planners)) {
                throw new Error('Invalid data format: planners array missing');
            }
            
            // Create backup before import
            this.createBackup();
            
            // Import data
            this.savePlanners(data.planners);
            if (data.settings) {
                this.saveSettings(data.settings);
            }
            
            console.log('Data imported successfully');
            return true;
        } catch (error) {
            console.error('Import failed:', error.message);
            return false;
        }
    },
    
    // Schedule automatic backup
    scheduleBackup: function() {
        const settings = this.getSettings();
        if (!settings.autoBackup) return;
        
        const lastBackupData = localStorage.getItem(this.KEYS.LAST_BACKUP);
        let lastBackupTime = 0;
        
        if (lastBackupData) {
            const backup = JSON.parse(lastBackupData);
            lastBackupTime = new Date(backup.timestamp).getTime();
        }
        
        const now = new Date().getTime();
        const hoursSinceLastBackup = (now - lastBackupTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastBackup >= settings.backupInterval) {
            this.createBackup();
        }
        
        // Schedule next check
        setTimeout(() => this.scheduleBackup(), 60 * 60 * 1000); // Check every hour
    },
    
    // Clear all data (dangerous!)
    clearAllData: function() {
        if (confirm('WARNING: This will delete all your data. This action cannot be undone. Continue?')) {
            // Create one last backup
            this.createBackup();
            
            // Clear data
            localStorage.removeItem(this.KEYS.PLANNERS);
            localStorage.removeItem(this.KEYS.CURRENT_PLANNER);
            localStorage.removeItem(this.KEYS.SETTINGS);
            
            console.log('All data cleared');
            return true;
        }
        return false;
    }
};

// Main Application Logic
const PlannerDriveApp = {
    // Global variables
    planners: [],
    currentPlanner: null,
    mode: 'text',
    textContent: [],
    nodes: [],
    selectedNode: null,
    offsetX: 0,
    offsetY: 0,
    cursorX: 20,
    cursorY: 20,
    isWriting: false,
    isConnecting: false,
    sourceNodeId: null,
    fontSize: '16',
    isBold: false,
    textColor: '#ffffff',
    priorityChart: null,
    completionChart: null,
    p5Canvas: null,
    
    // Initialize the application
    init: function() {
        // Initialize data store
        DataStore.init();
        
        // Load data
        this.loadData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize p5.js canvas
        this.initCanvas();
        
        console.log('PlannerDriveApp initialized');
    },
    
    // Load data from persistent storage
    loadData: function() {
        // Load planners
        this.planners = DataStore.getPlanners();
        this.updatePlannerList();
        
        // Load current planner if exists
        const currentPlanner = DataStore.getCurrentPlanner();
        if (currentPlanner) {
            this.openPlanner(currentPlanner.id);
        }
        
        console.log('Data loaded:', {
            planners: this.planners.length,
            currentPlanner: this.currentPlanner ? this.currentPlanner.id : null
        });
    },
    
    // Save current state to persistent storage
    saveData: function() {
        // Update current planner in the planners array
        if (this.currentPlanner) {
            const index = this.planners.findIndex(p => p.id === this.currentPlanner.id);
            if (index !== -1) {
                this.planners[index] = this.currentPlanner;
            }
        }
        
        // Save planners
        DataStore.savePlanners(this.planners);
        
        // Save current planner ID
        if (this.currentPlanner) {
            DataStore.saveCurrentPlanner(this.currentPlanner.id);
        }
        
        console.log('Data saved');
    },
    
    // Set up event listeners for UI elements
    setupEventListeners: function() {
        // Toggle space buttons
        document.getElementById('plannerDriveBtn').addEventListener('click', () => this.toggleSpace('planner'));
        document.getElementById('strategicDriveBtn').addEventListener('click', () => this.toggleSpace('strategic'));
        
        // Planner management
        document.getElementById('createPlannerBtn').addEventListener('click', () => this.createPlanner());
        
        // Mode switching
        document.getElementById('textModeBtn').addEventListener('click', () => this.setMode('text'));
        document.getElementById('visualModeBtn').addEventListener('click', () => this.setMode('visual'));
        
        // Text mode controls
        document.getElementById('textInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isWriting) {
                this.addTextAtCursor();
            }
        });
        
        // Visual mode controls
        document.getElementById('addNodeBtn').addEventListener('click', () => this.addNode());
        document.getElementById('connectNodesBtn').addEventListener('click', () => this.toggleConnectingMode());
        document.getElementById('renameNodeBtn').addEventListener('click', () => this.renameNode());
        document.getElementById('deleteNodeBtn').addEventListener('click', () => this.deleteNode());
        document.getElementById('clearAllNodesBtn').addEventListener('click', () => this.clearAllNodes());
        
        // Strategic drive controls
        document.getElementById('applyPriorityBtn')?.addEventListener('click', () => this.applyPriority());
        document.getElementById('toggleCompletionBtn')?.addEventListener('click', () => this.toggleCompletion());
        
        console.log('Event listeners set up');
    },
    
    // Add data export/import UI elements
    addDataManagementControls: function() {
        // Create data management container
        const container = document.createElement('div');
        container.className = 'data-management';
        container.innerHTML = `
            <h3>Data Management</h3>
            <div class="data-controls">
                <button id="exportDataBtn" class="btn btn-secondary">Export Data</button>
                <button id="importDataBtn" class="btn btn-secondary">Import Data</button>
                <button id="createBackupBtn" class="btn btn-secondary">Create Backup</button>
                <button id="restoreBackupBtn" class="btn btn-secondary">Restore Backup</button>
            </div>
        `;
        
        // Add to strategic drive section
        const strategicDrive = document.getElementById('strategicDrive');
        strategicDrive.appendChild(container);
        
        // Add event listeners
        document.getElementById('exportDataBtn').addEventListener('click', () => DataStore.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const success = DataStore.importData(event.target.result);
                        if (success) {
                            this.loadData();
                            alert('Data imported successfully!');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });
        document.getElementById('createBackupBtn').addEventListener('click', () => {
            DataStore.createBackup();
            alert('Backup created!');
        });
        document.getElementById('restoreBackupBtn').addEventListener('click', () => {
            if (confirm('Restore from the latest backup? This will overwrite your current data.')) {
                const success = DataStore.restoreFromBackup();
                if (success) {
                    this.loadData();
                    alert('Backup restored!');
                }
            }
        });
    },
    
    // Initialize p5.js canvas
    initCanvas: function() {
        const sketch = (p) => {
            p.setup = () => {
                const canvas = p.createCanvas(800, 400);
                canvas.parent('canvasContainer');
            };
            
            p.draw = () => {
                p.background(30);
                
                if (this.mode === 'text') {
                    // Text Mode: Render text with formatting
                    this.textContent.forEach(line => {
                        p.fill(line.color || '#ffffff');
                        p.textSize(line.fontSize || 16);
                        p.textStyle(line.bold ? p.BOLD : p.NORMAL);
                        p.textAlign(p.LEFT);
                        p.text(line.text, line.x, line.y);
                    });
                    
                    // Draw cursor in text mode when writing
                    if (this.isWriting) {
                        p.stroke(this.textColor);
                        p.strokeWeight(2);
                        p.line(this.cursorX, this.cursorY, this.cursorX, this.cursorY + parseInt(this.fontSize));
                        
                        // Preview text at cursor position
                        if (document.getElementById('textInput').value) {
                            p.fill(this.textColor);
                            p.textSize(parseInt(this.fontSize));
                            p.textStyle(this.isBold ? p.BOLD : p.NORMAL);
                            p.text(document.getElementById('textInput').value, this.cursorX, this.cursorY);
                        }
                    }
                } else {
                    // Visual Mode: Render nodes and connections
                    // Draw connections first
                    this.nodes.forEach(node => {
                        if (node.connections && node.connections.length > 0) {
                            node.connections.forEach(connectedId => {
                                const connectedNode = this.nodes.find(n => n.id === connectedId);
                                if (connectedNode) {
                                    p.stroke(0, 123, 255);
                                    p.strokeWeight(2);
                                    p.line(node.x, node.y, connectedNode.x, connectedNode.y);
                                }
                            });
                        }
                    });
                    
                    // Draw connection in progress if connecting nodes
                    if (this.isConnecting && this.sourceNodeId) {
                        const sourceNode = this.nodes.find(n => n.id === this.sourceNodeId);
                        if (sourceNode) {
                            p.stroke(255, 255, 255, 150);
                            p.strokeWeight(2);
                            p.line(sourceNode.x, sourceNode.y, p.mouseX, p.mouseY);
                        }
                    }
                    
                    // Then draw nodes
                    this.nodes.forEach(node => {
                        // Set color based on priority
                        let nodeColor;
                        if (node.priority === 1) {
                            nodeColor = p.color(255, 0, 0); // Red for high priority
                        } else if (node.priority === 2) {
                            nodeColor = p.color(255, 255, 0); // Yellow for medium priority
                        } else {
                            nodeColor = p.color(0, 255, 0); // Green for low priority
                        }
                        
                        // Draw node glow
                        p.drawingContext.shadowBlur = 15;
                        p.drawingContext.shadowColor = p.color(nodeColor.levels[0], nodeColor.levels[1], nodeColor.levels[2], 150);
                        
                        // Draw node
                        p.fill(nodeColor);
                        p.noStroke();
                        p.ellipse(node.x, node.y, 40, 40);
                        
                        // Reset shadow for text
                        p.drawingContext.shadowBlur = 0;
                        
                        // Node text
                        p.fill(255);
                        p.textAlign(p.CENTER, p.CENTER);
                        p.textSize(12);
                        p.text(node.name.substring(0, 10), node.x, node.y);
                        
                        // Priority indicator
                        if (node.priority) {
                            p.fill(255);
                            p.textSize(10);
                            p.text(node.priority, node.x + 15, node.y - 15);
                        }
                        
                        // Completion indicator
                        if (node.completed) {
                            p.stroke(255);
                            p.strokeWeight(2);
                            p.noFill();
                            p.ellipse(node.x, node.y, 50, 50);
                        }
                        
                        // Highlight source node when connecting
                        if (this.isConnecting && this.sourceNodeId === node.id) {
                            p.noFill();
                            p.stroke(255);
                            p.strokeWeight(2);
                            p.ellipse(node.x, node.y, 50, 50);
                        }
                    });
                }
            };
            
            p.mousePressed = () => {
                if (this.mode === 'text') {
                    // In text mode, set cursor position where clicked
                    if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                        this.cursorX = p.mouseX;
                        this.cursorY = p.mouseY;
                        this.isWriting = true;
                        document.getElementById('textInput').focus();
                    }
                } else if (this.mode === 'visual') {
                    // In visual mode, handle node selection or connection
                    if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                        if (this.isConnecting) {
                            // If already connecting, try to complete the connection
                            for (let node of this.nodes) {
                                const d = p.dist(p.mouseX, p.mouseY, node.x, node.y);
                                if (d < 20 && node.id !== this.sourceNodeId) {
                                    // Connect source node to this node
                                    const updatedNodes = this.nodes.map(n => {
                                        if (n.id === this.sourceNodeId) {
                                            // Create connections array if it doesn't exist
                                            const connections = n.connections || [];
                                            // Add connection if it doesn't already exist
                                            if (!connections.includes(node.id)) {
                                                return { ...n, connections: [...connections, node.id] };
                                            }
                                        }
                                        return n;
                                    });
                                    this.nodes = updatedNodes;
                                    this.isConnecting = false;
                                    this.sourceNodeId = null;
                                    document.getElementById('connectionInstructions').style.display = 'none';
                                    this.saveData();
                                    return;
                                }
                            }
                            // If clicked outside any node, cancel connection
                            this.isConnecting = false;
                            this.sourceNodeId = null;
                            document.getElementById('connectionInstructions').style.display = 'none';
                            document.getElementById('connectNodesBtn').classList.remove('btn-primary');
                            document.getElementById('connectNodesBtn').classList.add('btn-secondary');
                        } else {
                            // Normal node selection
                            for (let node of this.nodes) {
                                const d = p.dist(p.mouseX, p.mouseY, node.x, node.y);
                                if (d < 20) {
                                    this.selectedNode = node;
                                    this.offsetX = p.mouseX - node.x;
                                    this.offsetY = p.mouseY - node.y;
                                    break;
                                }
                            }
                        }
                    }
                }
            };
            
            p.mouseDragged = () => {
                if (this.mode === 'text') {
                    // Optional: Allow dragging cursor in text mode
                    if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                        this.cursorX = p.mouseX;
                        this.cursorY = p.mouseY;
                    }
                } else if (this.selectedNode && this.mode === 'visual' && !this.isConnecting) {
                    // Move selected node in visual mode
                    if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                        const updatedNodes = this.nodes.map(node => {
                            if (node.id === this.selectedNode.id) {
                                return {
                                    ...node,
                                    x: p.mouseX - this.offsetX,
                                    y: p.mouseY - this.offsetY
                                };
                            }
                            return node;
                        });
                        this.nodes = updatedNodes;
                        this.selectedNode = updatedNodes.find(n => n.id === this.selectedNode.id);
                    }
                }
            };
            
            p.mouseReleased = () => {
                if (this.selectedNode) {
                    this.selectedNode = null;
                    this.saveData();
                }
            };
            
            p.doubleClicked = () => {
                if (this.mode === 'visual') {
                    for (let node of this.nodes) {
                        const d = p.dist(p.mouseX, p.mouseY, node.x, node.y);
                        if (d < 20) {
                            const newName = prompt('Rename node:', node.name);
                            if (newName && newName.trim()) {
                                const updatedNodes = this.nodes.map(n => {
                                    if (n.id === node.id) {
                                        return { ...n, name: newName };
                                    }
                                    return n;
                                });
                                this.nodes = updatedNodes;
                                this.saveData();
                            }
                            break;
                        }
                    }
                }
            };
        };
        
        this.p5Canvas = new p5(sketch);
        console.log('Canvas initialized');
    },
    
    // Create a new planner
    createPlanner: function() {
        const name = document.getElementById('plannerName').value.trim();
        if (name) {
            const id = Math.random().toString(36).substr(2, 9);
            const newPlanner = {
                id,
                name,
                textContent: [],
                nodes: [],
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            
            this.planners.push(newPlanner);
            this.updatePlannerList();
            this.saveData();
            document.getElementById('plannerName').value = '';
            
            // Automatically open the new planner
            this.openPlanner(id);
            
            console.log('Planner created:', newPlanner);
        }
    },
    
    // Open a planner
    openPlanner: function(id) {
        this.currentPlanner = this.planners.find(p => p.id === id);
        if (this.currentPlanner) {
            this.textContent = this.currentPlanner.textContent || [];
            this.nodes = this.currentPlanner.nodes || [];
            
            // Update UI
            document.getElementById('canvasSection').style.display = 'block';
            document.getElementById('canvasTitle').textContent = `Canvas: ${this.currentPlanner.name}`;
            this.mode = 'text';
            this.updateMode();
            
            // Update last modified timestamp
            this.currentPlanner.lastModified = new Date().toISOString();
            this.saveData();
            
            console.log('Planner opened:', this.currentPlanner);
        }
    },
    
    // Update the planner list in the UI
    updatePlannerList: function() {
        const list = document.getElementById('plannerList');
        list.innerHTML = '';
        
        this.planners.forEach(planner => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span onclick="PlannerDriveApp.openPlanner('${planner.id}')">${planner.name}</span>
                <div>
                    <button class="btn btn-secondary" onclick="PlannerDriveApp.renamePlanner('${planner.id}')">Rename</button>
                    <button class="btn btn-secondary" onclick="PlannerDriveApp.deletePlanner('${planner.id}')">Delete</button>
                </div>
            `;
            list.appendChild(li);
        });
    },
    
    // Rename a planner
    renamePlanner: function(id) {
        const planner = this.planners.find(p => p.id === id);
        if (planner) {
            const newName = prompt('New name:', planner.name);
            if (newName && newName.trim()) {
                planner.name = newName;
                planner.lastModified = new Date().toISOString();
                
                this.updatePlannerList();
                this.saveData();
                
                // Update UI if this is the current planner
                if (this.currentPlanner && this.currentPlanner.id === id) {
                    document.getElementById('canvasTitle').textContent = `Canvas: ${newName}`;
                }
                
                console.log('Planner renamed:', planner);
            }
        }
    },
    
    // Delete a planner
    deletePlanner: function(id) {
        if (confirm('Are you sure you want to delete this planner?')) {
            // Create backup before deletion
            DataStore.createBackup();
            
            this.planners = this.planners.filter(p => p.id !== id);
            
            // Clear current planner if it's the one being deleted
            if (this.currentPlanner && this.currentPlanner.id === id) {
                this.currentPlanner = null;
                this.textContent = [];
                this.nodes = [];
                document.getElementById('canvasSection').style.display = 'none';
            }
            
            this.updatePlannerList();
            this.saveData();
            
            console.log('Planner deleted:', id);
        }
    },
    
    // Toggle between Planner Drive and Strategic Drive
    toggleSpace: function(space) {
        if (space === 'planner') {
            document.getElementById('plannerDrive').style.display = 'block';
            document.getElementById('strategicDrive').style.display = 'none';
            document.getElementById('plannerDriveBtn').classList.add('btn-primary');
            document.getElementById('plannerDriveBtn').classList.remove('btn-secondary');
            document.getElementById('strategicDriveBtn').classList.add('btn-secondary');
            document.getElementById('strategicDriveBtn').classList.remove('btn-primary');
        } else {
            document.getElementById('plannerDrive').style.display = 'none';
            document.getElementById('strategicDrive').style.display = 'block';
            document.getElementById('strategicDriveBtn').classList.add('btn-primary');
            document.getElementById('strategicDriveBtn').classList.remove('btn-secondary');
            document.getElementById('plannerDriveBtn').classList.add('btn-secondary');
            document.getElementById('plannerDriveBtn').classList.remove('btn-primary');
            
            // Update Strategic Drive content
            if (this.currentPlanner) {
                document.getElementById('noPlannerMessage').style.display = 'none';
                document.getElementById('strategicContent').style.display = 'block';
                document.getElementById('currentPlannerTitle').textContent = `Current Planner: ${this.currentPlanner.name}`;
                document.getElementById('totalNodesInfo').textContent = `Total Nodes: ${this.nodes.length}`;
                this.updateNodeTable();
                this.updateAnalytics();
            } else {
                document.getElementById('noPlannerMessage').style.display = 'block';
                document.getElementById('strategicContent').style.display = 'none';
            }
        }
    },
    
    // Set the mode (text or visual)
    setMode: function(newMode) {
        this.mode = newMode;
        this.updateMode();
    },
    
    // Update UI based on current mode
    updateMode: function() {
        const textModeBtn = document.getElementById('textModeBtn');
        const visualModeBtn = document.getElementById('visualModeBtn');
        const textToolbar = document.getElementById('textToolbar');
        const visualToolbar = document.getElementById('visualToolbar');
        
        if (this.mode === 'text') {
            textModeBtn.classList.add('btn-primary');
            textModeBtn.classList.remove('btn-secondary');
            visualModeBtn.classList.add('btn-secondary');
            visualModeBtn.classList.remove('btn-primary');
            textToolbar.style.display = 'flex';
            visualToolbar.style.display = 'none';
        } else {
            visualModeBtn.classList.add('btn-primary');
            visualModeBtn.classList.remove('btn-secondary');
            textModeBtn.classList.add('btn-secondary');
            textModeBtn.classList.remove('btn-primary');
            visualToolbar.style.display = 'flex';
            textToolbar.style.display = 'none';
        }
    },
    
    // Add text at cursor position
    addTextAtCursor: function() {
        const textInput = document.getElementById('textInput').value.trim();
        if (textInput && this.currentPlanner) {
            const fontSize = parseInt(document.getElementById('fontSizeSelect').value);
            const isBold = document.getElementById('boldCheckbox').checked;
            const color = document.getElementById('colorPicker').value;
            
            const newLine = {
                text: textInput,
                x: this.cursorX,
                y: this.cursorY,
                fontSize,
                bold: isBold,
                color,
                createdAt: new Date().toISOString()
            };
            
            this.textContent.push(newLine);
            this.currentPlanner.textContent = this.textContent;
            this.currentPlanner.lastModified = new Date().toISOString();
            
            document.getElementById('textInput').value = '';
            
            // Move cursor to next line
            this.cursorY += fontSize + 10;
            
            this.saveData();
            console.log('Text added:', newLine);
        }
    },
    
    // Add a new node
    addNode: function() {
        if (this.currentPlanner) {
            const name = prompt('Node name:');
            if (name && name.trim()) {
                const parentId = prompt('Parent node ID (leave blank for none):');
                const id = Math.random().toString(36).substr(2, 9);
                
                // Calculate position (center or relative to parent)
                const x = parentId ? 
                    this.nodes.find(n => n.id === parentId)?.x + Math.random() * 100 - 50 || 400 : 
                    400;
                const y = parentId ? 
                    this.nodes.find(n => n.id === parentId)?.y + Math.random() * 100 - 50 || 200 : 
                    200;
                
                const newNode = {
                    id,
                    name,
                    parentId: parentId || null,
                    x,
                    y,
                    priority: 3,
                    completed: false,
                    connections: [],
                    createdAt: new Date().toISOString()
                };
                
                this.nodes.push(newNode);
                this.currentPlanner.nodes = this.nodes;
                this.currentPlanner.lastModified = new Date().toISOString();
                this.saveData();
                
                console.log('Node added:', newNode);
            }
        }
    },
    
    // Toggle connecting mode
    toggleConnectingMode: function() {
        if (this.isConnecting) {
            // Cancel connecting mode
            this.isConnecting = false;
            this.sourceNodeId = null;
            document.getElementById('connectionInstructions').style.display = 'none';
            document.getElementById('connectNodesBtn').classList.remove('btn-primary');
            document.getElementById('connectNodesBtn').classList.add('btn-secondary');
        } else {
            // Start connecting mode
            const id = prompt('Enter source node ID to connect from:');
            if (id) {
                const node = this.nodes.find(n => n.id === id);
                if (node) {
                    this.isConnecting = true;
                    this.sourceNodeId = id;
                    document.getElementById('connectionInstructions').style.display = 'block';
                    document.getElementById('sourceNodeLabel').textContent = id;
                    document.getElementById('connectNodesBtn').classList.add('btn-primary');
                    document.getElementById('connectNodesBtn').classList.remove('btn-secondary');
                } else {
                    alert('Node not found');
                }
            }
        }
    },
    
    // Rename a node
    renameNode: function() {
        if (this.currentPlanner) {
            const id = prompt('Node ID to rename:');
            if (id) {
                const node = this.nodes.find(n => n.id === id);
                if (node) {
                    const newName = prompt('New name:', node.name);
                    if (newName && newName.trim()) {
                        node.name = newName;
                        this.currentPlanner.lastModified = new Date().toISOString();
                        this.saveData();
                        console.log('Node renamed:', node);
                    }
                } else {
                    alert('Node not found');
                }
            }
        }
    },
    
    // Delete a node
    deleteNode: function() {
        if (this.currentPlanner) {
            const id = prompt('Node ID to delete:');
            if (id) {
                const nodeIndex = this.nodes.findIndex(n => n.id === id);
                if (nodeIndex !== -1) {
                    this.nodes.splice(nodeIndex, 1);
                    
                    // Update connections
                    this.nodes.forEach(node => {
                        if (node.connections && node.connections.includes(id)) {
                            node.connections = node.connections.filter(connId => connId !== id);
                        }
                    });
                    
                    this.currentPlanner.nodes = this.nodes;
                    this.currentPlanner.lastModified = new Date().toISOString();
                    this.saveData();
                    console.log('Node deleted:', id);
                } else {
                    alert('Node not found');
                }
            }
        }
    },
    
    // Clear all nodes
    clearAllNodes: function() {
        if (this.currentPlanner && this.nodes.length > 0) {
            if (confirm('Are you sure you want to clear all nodes? This action cannot be undone.')) {
                // Create backup before clearing
                DataStore.createBackup();
                
                this.nodes = [];
                this.currentPlanner.nodes = [];
                this.currentPlanner.lastModified = new Date().toISOString();
                this.saveData();
                console.log('All nodes cleared');
            }
        }
    },
    
    // Update node table in Strategic Drive
    updateNodeTable: function() {
        const tableBody = document.getElementById('nodeTableBody');
        tableBody.innerHTML = '';
        
        if (this.currentPlanner && this.nodes) {
            this.nodes.forEach(node => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${node.id}</td>
                    <td>${node.name}</td>
                    <td>${node.priority === 1 ? 'High' : node.priority === 2 ? 'Medium' : 'Low'}</td>
                    <td>${node.completed ? 'Completed' : 'Incomplete'}</td>
                `;
                tr.onclick = () => document.getElementById('nodeIdInput').value = node.id;
                tableBody.appendChild(tr);
            });
        }
    },
    
    // Apply priority to a node
    applyPriority: function() {
        if (!this.currentPlanner) return;
        
        const nodeId = document.getElementById('nodeIdInput').value;
        const priority = parseInt(document.getElementById('prioritySelect').value);
        
        if (nodeId) {
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                node.priority = priority;
                this.currentPlanner.lastModified = new Date().toISOString();
                this.saveData();
                this.updateNodeTable();
                this.updateAnalytics();
                console.log('Priority applied:', { nodeId, priority });
            } else {
                alert('Node not found');
            }
        }
    },
    
    // Toggle node completion status
    toggleCompletion: function() {
        if (!this.currentPlanner) return;
        
        const nodeId = document.getElementById('nodeIdInput').value;
        
        if (nodeId) {
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                node.completed = !node.completed;
                this.currentPlanner.lastModified = new Date().toISOString();
                this.saveData();
                this.updateNodeTable();
                this.updateAnalytics();
                console.log('Completion toggled:', { nodeId, completed: node.completed });
            } else {
                alert('Node not found');
            }
        }
    },
    
    // Update analytics charts
    updateAnalytics: function() {
        if (!this.currentPlanner || !this.nodes) return;

        // Count priorities
        const priorityCounts = { 1: 0, 2: 0, 3: 0 };
        this.nodes.forEach(node => {
            priorityCounts[node.priority] = (priorityCounts[node.priority] || 0) + 1;
        });

        // Priority Chart
        const priorityCtx = document.getElementById('priorityChart').getContext('2d');
        if (this.priorityChart) this.priorityChart.destroy();
        this.priorityChart = new Chart(priorityCtx, {
            type: 'bar',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    label: 'Node Priorities',
                    data: [priorityCounts[1], priorityCounts[2], priorityCounts[3]],
                    backgroundColor: ['#ff0000', '#ffff00', '#00ff00']
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });

        // Count completion status
        const completed = this.nodes.filter(n => n.completed).length;
        const incomplete = this.nodes.length - completed;

        // Completion Chart
        const completionCtx = document.getElementById('completionChart').getContext('2d');
        if (this.completionChart) this.completionChart.destroy();
        this.completionChart = new Chart(completionCtx, {
            type: 'pie',
            data: {
                labels: ['Completed', 'Incomplete'],
                datasets: [{
                    data: [completed, incomplete],
                    backgroundColor: ['#00DDEB', '#007BFF']
                }]
            },
            options: { responsive: true }
        });
        
        console.log('Analytics updated');
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    PlannerDriveApp.init();
    
    // Add data management controls to Strategic Drive
    PlannerDriveApp.addDataManagementControls();
    
    console.log('Application ready');
});
