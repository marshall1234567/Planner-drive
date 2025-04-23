/**
 * DataStore Module
 * Handles persistent storage for the Planner Drive application
 */
const DataStore = {
    // Storage keys
    PLANNERS_KEY: 'plannerDrive_planners',
    CURRENT_PLANNER_KEY: 'plannerDrive_currentPlanner',
    SETTINGS_KEY: 'plannerDrive_settings',
    BACKUP_KEY: 'plannerDrive_backup',
    
    // Save planners to localStorage
    savePlanners: function(planners) {
        try {
            localStorage.setItem(this.PLANNERS_KEY, JSON.stringify(planners));
            return true;
        } catch (error) {
            console.error('Error saving planners:', error);
            return false;
        }
    },
    
    // Load planners from localStorage
    loadPlanners: function() {
        try {
            const data = localStorage.getItem(this.PLANNERS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading planners:', error);
            return [];
        }
    },
    
    // Save current planner ID
    saveCurrentPlanner: function(plannerId) {
        try {
            localStorage.setItem(this.CURRENT_PLANNER_KEY, plannerId);
            return true;
        } catch (error) {
            console.error('Error saving current planner:', error);
            return false;
        }
    },
    
    // Load current planner ID
    loadCurrentPlanner: function() {
        try {
            return localStorage.getItem(this.CURRENT_PLANNER_KEY);
        } catch (error) {
            console.error('Error loading current planner:', error);
            return null;
        }
    },
    
    // Save application settings
    saveSettings: function(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },
    
    // Load application settings
    loadSettings: function() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading settings:', error);
            return {};
        }
    },
    
    // Create a backup of all data
    createBackup: function() {
        try {
            const backup = {
                planners: this.loadPlanners(),
                currentPlanner: this.loadCurrentPlanner(),
                settings: this.loadSettings(),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    },
    
    // Restore from backup
    restoreFromBackup: function() {
        try {
            const backupData = localStorage.getItem(this.BACKUP_KEY);
            if (!backupData) {
                console.error('No backup found');
                return false;
            }
            
            const backup = JSON.parse(backupData);
            
            // Restore planners
            if (backup.planners) {
                this.savePlanners(backup.planners);
            }
            
            // Restore current planner
            if (backup.currentPlanner) {
                this.saveCurrentPlanner(backup.currentPlanner);
            }
            
            // Restore settings
            if (backup.settings) {
                this.saveSettings(backup.settings);
            }
            
            return true;
        } catch (error) {
            console.error('Error restoring from backup:', error);
            return false;
        }
    },
    
    // Export all data as JSON
    exportData: function() {
        try {
            const data = {
                planners: this.loadPlanners(),
                currentPlanner: this.loadCurrentPlanner(),
                settings: this.loadSettings(),
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'planner-drive-export-' + new Date().toISOString().slice(0, 10) + '.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            return false;
        }
    },
    
    // Import data from JSON
    importData: function(jsonData) {
        try {
            // Create backup before import
            this.createBackup();
            
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            if (!data.planners || !Array.isArray(data.planners)) {
                console.error('Invalid data format: planners array missing');
                return false;
            }
            
            // Import planners
            this.savePlanners(data.planners);
            
            // Import current planner if valid
            if (data.currentPlanner && data.planners.some(p => p.id === data.currentPlanner)) {
                this.saveCurrentPlanner(data.currentPlanner);
            } else if (data.planners.length > 0) {
                // Default to first planner if current is invalid
                this.saveCurrentPlanner(data.planners[0].id);
            }
            
            // Import settings if present
            if (data.settings && typeof data.settings === 'object') {
                this.saveSettings(data.settings);
            }
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    },
    
    // Clear all data (factory reset)
    clearAllData: function() {
        try {
            // Create backup before clearing
            this.createBackup();
            
            localStorage.removeItem(this.PLANNERS_KEY);
            localStorage.removeItem(this.CURRENT_PLANNER_KEY);
            localStorage.removeItem(this.SETTINGS_KEY);
            
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }
};
