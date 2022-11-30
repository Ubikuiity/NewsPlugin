import { addIcon, Notice, Plugin } from 'obsidian';
import { fileCreator } from "filecreator";
import { newsCleaner } from "newsCleaner";
import { newSyncIc } from "icons";
import { SettingsMenu, Settings, DEFAULT_SETTINGS } from 'settingsClass';

export default class NewsPlugin extends Plugin {
	settings: Settings;
	pageCreator: fileCreator;
	fileCleaner: newsCleaner;

	// Executed when Plugin starts (Obsidian opens)
	async onload() {
		// Handle settings of plugin
		await this.loadSettings();

		//Create the news page creator class, this is a custom class
		this.pageCreator = new fileCreator(this);

		// Create the file cleaner
		this.fileCleaner = new newsCleaner(this);

		// This calls the menu where the user can change the parameters
		this.addSettingTab(new SettingsMenu(this.app, this));

		// Add custom ribbon to library
		addIcon('NewSynchro', newSyncIc);

		// This part creates the ribbon Icon to synchro the News file
		const ribbonNewsSyncIcon = this.addRibbonIcon('NewSynchro', 'News Synchro', (evt: MouseEvent) => {
			this.pageCreator.synchroAll();
			new Notice(`reloading news page, please don't spam this button`);
		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
